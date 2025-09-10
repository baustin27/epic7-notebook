const { test, expect } = require('@playwright/test');

test('debug frontend authentication with console logs', async ({ page }) => {
  // Listen for console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    console.log(`Browser ${msg.type()}: ${msg.text()}`);
  });

  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`Page error: ${error.message}`);
  });

  console.log('🌐 Navigating to application...');
  await page.goto('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  console.log('🔍 Checking initial page state...');
  const hasLoginForm = await page.isVisible('text=Sign In');
  console.log('Login form visible:', hasLoginForm);

  if (hasLoginForm) {
    console.log('📝 Filling in login credentials...');
    await page.fill('input[placeholder*="email"]', 'baustin2786@gmail.com');
    await page.fill('input[placeholder*="password"]', '2A59cq!CC');
    
    console.log('🔐 Clicking Sign In button...');
    
    // Watch for network requests
    page.on('request', request => {
      console.log('Network request:', request.method(), request.url());
    });
    
    page.on('response', response => {
      console.log('Network response:', response.status(), response.url());
    });
    
    await page.click('text=Sign In');
    
    console.log('⏳ Waiting for authentication...');
    await page.waitForTimeout(5000);
    
    // Check if still on login page
    const stillHasLoginForm = await page.isVisible('text=Sign In');
    const hasLoadingState = await page.isVisible('text=Loading');
    const hasChatInterface = await page.isVisible('text=New') || 
                            await page.isVisible('button:has-text("New")') ||
                            await page.isVisible('[data-testid*="chat"]');
    
    console.log('After login attempt:');
    console.log('- Still has login form:', stillHasLoginForm);
    console.log('- Has loading state:', hasLoadingState);
    console.log('- Has chat interface:', hasChatInterface);
    console.log('- Current URL:', page.url());
    
    // Look for error messages
    const errorElements = await page.locator('.text-red-600, .text-red-400, [class*="error"]').all();
    if (errorElements.length > 0) {
      console.log('Error messages found:');
      for (const el of errorElements) {
        const text = await el.textContent();
        if (text && text.trim()) {
          console.log(`  - ${text}`);
        }
      }
    }
    
    // Check auth state in local storage or session storage
    const authData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).map(key => ({ key, value: localStorage.getItem(key) })),
        sessionStorage: Object.keys(sessionStorage).map(key => ({ key, value: sessionStorage.getItem(key) })),
        cookies: document.cookie
      };
    });
    
    console.log('Browser storage:');
    console.log('- LocalStorage keys:', authData.localStorage.map(item => item.key));
    console.log('- SessionStorage keys:', authData.sessionStorage.map(item => item.key));
    console.log('- Has cookies:', !!authData.cookies);
  }

  await page.screenshot({ path: 'debug-frontend-auth.png' });
  console.log('📸 Debug screenshot taken: debug-frontend-auth.png');

  console.log('\n📋 Console messages summary:');
  consoleMessages.forEach(msg => console.log(`  ${msg}`));
  
  console.log('✅ Debug completed');
});