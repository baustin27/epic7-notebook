const { test, expect } = require('@playwright/test');

test('manual login test with detailed steps', async ({ page }) => {
  // Listen for all console messages and errors
  page.on('console', msg => {
    console.log(`🖥️  Browser ${msg.type()}: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`❌ Page error: ${error.message}`);
  });

  console.log('🌐 Navigating to application...');
  await page.goto('http://localhost:3000');
  
  // Wait for page to fully load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  console.log('📸 Taking initial screenshot...');
  await page.screenshot({ path: 'step1-initial.png' });
  
  // Check what's actually on the page
  const pageTitle = await page.title();
  console.log('Page title:', pageTitle);
  
  // Wait for and find the email input field
  console.log('🔍 Looking for email input...');
  await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 10000 });
  
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
  
  console.log('✅ Found form inputs');
  
  console.log('📝 Filling email...');
  await emailInput.fill('baustin2786@gmail.com');
  
  console.log('📝 Filling password...');
  await passwordInput.fill('2A59cq!CC');
  
  await page.screenshot({ path: 'step2-form-filled.png' });
  console.log('📸 Form filled screenshot taken');
  
  // Look for the submit button
  console.log('🔍 Looking for Sign In button...');
  const signInButton = page.locator('button[type="submit"], button:has-text("Sign In")').first();
  
  console.log('🎯 Clicking Sign In button...');
  
  // Watch for network activity
  const responsePromise = page.waitForResponse(response => 
    response.url().includes('supabase') || 
    response.url().includes('auth') ||
    response.status() !== 404
  ).catch(() => null);
  
  await signInButton.click();
  
  console.log('⏳ Waiting for response...');
  const response = await responsePromise;
  if (response) {
    console.log('📡 Network response:', response.status(), response.url());
  }
  
  // Wait for potential page change
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'step3-after-submit.png' });
  console.log('📸 After submit screenshot taken');
  
  // Check current state
  const currentUrl = page.url();
  const hasSignInForm = await page.isVisible('input[type="email"]');
  
  console.log('📊 Current state:');
  console.log('  URL:', currentUrl);
  console.log('  Still has login form:', hasSignInForm);
  
  // Look for chat interface elements
  const chatElements = await page.locator('text=/new.*conversation/i, button:has-text("New"), text=/chat/i').count();
  console.log('  Chat elements found:', chatElements);
  
  // Check for any error messages
  const errorElements = await page.locator('.text-red-600, .text-red-400, [class*="error"]').all();
  for (const el of errorElements) {
    const text = await el.textContent();
    if (text && text.trim()) {
      console.log('  Error:', text);
    }
  }
  
  // Check for loading states
  const isLoading = await page.isVisible('text=Loading');
  console.log('  Is loading:', isLoading);
  
  if (isLoading) {
    console.log('⏳ Waiting for loading to complete...');
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'step4-after-loading.png' });
  }
  
  console.log('✅ Manual login test completed');
});