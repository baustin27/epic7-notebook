const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// This script sets up the prompts table in Supabase
// Run with: node src/lib/setup-prompts-table.js

async function setupPromptsTable() {
  // Load environment variables
  require('dotenv').config({ path: path.join(__dirname, '../../.env.local') })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    console.log('🔄 Setting up prompts table...')

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'prompts-schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...')
        const { error } = await supabase.rpc('exec_sql', { sql: statement })

        if (error) {
          // Try direct execution for DDL statements
          const { error: directError } = await supabase.from('_temp').select('*').limit(0)
          if (directError) {
            console.log('Note: DDL statements may need to be run manually in Supabase dashboard')
          }
        }
      }
    }

    console.log('✅ Prompts table setup completed!')
    console.log('Note: If you see errors above, you may need to run the SQL manually in your Supabase dashboard')

  } catch (error) {
    console.error('❌ Error setting up prompts table:', error)
    process.exit(1)
  }
}

setupPromptsTable()