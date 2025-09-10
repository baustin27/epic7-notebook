const { chromium } = require('playwright');

async function testLogin() {
  const browser = await chromium.launch({ headless: false, slowMo: 2000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Testing login functionality...');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    // Fill in credentials
    await page.fill('input[placeholder="Enter your email"]', 'baustin2786@gmail.com');
    await page.fill('input[placeholder="Enter your password"]', '2A59cq!CC');
    console.log('✏️ Credentials filled');

    await page.screenshot({ path: 'login-filled.png' });

    // Click Sign In
    await page.click('button:has-text("Sign In")');
    console.log('🔐 Clicked Sign In button');

    // Wait for navigation/response
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'after-login.png' });

    // Check current state
    const url = page.url();
    const title = await page.textContent('body');
    console.log('📍 Current URL:', url);
    console.log('📄 Page content preview:', title.substring(0, 200));

    // Look for success indicators
    const hasChat = await page.locator('[class*="chat"], [data-testid*="chat"]').count();
    const hasWelcome = await page.getByText('Welcome').count();
    const hasLogout = await page.getByText('Logout').count();

    console.log('🔍 Found elements:');
    console.log('  - Chat elements:', hasChat);
    console.log('  - Welcome text:', hasWelcome);
    console.log('  - Logout button:', hasLogout);

    if (hasChat > 0 || hasWelcome > 0 || hasLogout > 0) {
      console.log('✅ LOGIN SUCCESS! User is logged in');
    } else {
      console.log('❓ Login status unclear, checking for errors...');
      
      // Check for error messages
      const errorText = await page.locator('[class*="error"], .text-red-500').textContent().catch(() => '');
      if (errorText) {
        console.log('❌ Error found:', errorText);
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    // Keep browser open for 10 seconds to manually inspect
    console.log('⏳ Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

testLogin();