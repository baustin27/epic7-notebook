#!/usr/bin/env node

/**
 * Health Check Script for CI/CD Pipeline
 * Performs basic health checks on the application
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds

function checkEndpoint(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { timeout: TIMEOUT, ...options }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          data: data.length > 100 ? data.substring(0, 100) + '...' : data
        });
      });
    });

    req.on('error', (err) => {
      reject({
        url,
        error: err.message,
        code: err.code
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({
        url,
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    });
  });
}

async function runHealthChecks() {
  console.log('🔍 Running health checks...\n');

  const checks = [
    { name: 'Home Page', url: `${BASE_URL}/` },
    { name: 'API Health', url: `${BASE_URL}/api/health` },
    { name: 'Docs Page', url: `${BASE_URL}/docs` },
  ];

  const results = [];

  for (const check of checks) {
    try {
      console.log(`Checking ${check.name}...`);
      const result = await checkEndpoint(check.url);
      results.push({ ...check, ...result, success: result.status < 400 });

      if (result.success) {
        console.log(`✅ ${check.name}: ${result.status}`);
      } else {
        console.log(`❌ ${check.name}: ${result.status}`);
      }
    } catch (error) {
      results.push({ ...check, ...error, success: false });
      console.log(`❌ ${check.name}: ${error.error || 'Failed'}`);
    }
  }

  console.log('\n📊 Health Check Summary:');

  const successful = results.filter(r => r.success).length;
  const total = results.length;

  console.log(`✅ Successful: ${successful}/${total}`);

  if (successful < total) {
    console.log('\n❌ Failed checks:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`  - ${result.name}: ${result.error || `Status ${result.status}`}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All health checks passed!');
  }
}

// Database connectivity check (if Supabase URL is available)
async function checkDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    console.log('⚠️  Supabase URL not configured, skipping database check');
    return;
  }

  try {
    console.log('Checking database connectivity...');
    // Basic connectivity check to Supabase
    const result = await checkEndpoint(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key'
      }
    });

    if (result.status === 200 || result.status === 401) {
      console.log('✅ Database connectivity: OK');
    } else {
      console.log(`❌ Database connectivity: ${result.status}`);
      process.exit(1);
    }
  } catch (error) {
    console.log(`❌ Database connectivity: ${error.error}`);
    process.exit(1);
  }
}

async function main() {
  try {
    await runHealthChecks();
    await checkDatabase();

    console.log('\n🏥 Health check completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Health check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runHealthChecks, checkDatabase, checkEndpoint };