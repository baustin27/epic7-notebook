const { chromium } = require('playwright');

async function testFullLoginFlow() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Starting comprehensive login flow test...');
    
    // Step 1: Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('✅ Loaded home page');

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-01-home.png' });

    // Step 2: Wait for the app to fully load (check for loading state)
    await page.waitForTimeout(3000);
    
    // Look for login form elements with multiple selectors
    console.log('🔍 Looking for login form...');
    
    // Wait for either login form or already logged in state
    await page.waitForFunction(() => {
      return document.querySelector('input[type="email"]') || 
             document.querySelector('input[name="email"]') || 
             document.querySelector('input[placeholder*="email" i]') ||
             document.querySelector('[data-testid="chat-interface"]') ||
             document.textContent.includes('Welcome') ||
             document.textContent.includes('Chat');
    }, { timeout: 10000 });

    // Check if we're already logged in
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('[data-testid="chat-interface"]') !== null ||
             document.textContent.includes('Welcome') ||
             document.textContent.includes('Chat Interface');
    });

    if (isLoggedIn) {
      console.log('✅ Already logged in! Testing logged-in functionality...');
      await page.screenshot({ path: 'test-02-already-logged-in.png' });
    } else {
      console.log('🔍 Found login form, proceeding with login...');
      
      // Try multiple selector strategies for email input
      let emailInput = await page.locator('input[type="email"]').first();
      if (!(await emailInput.isVisible())) {
        emailInput = await page.locator('input[name="email"]').first();
      }
      if (!(await emailInput.isVisible())) {
        emailInput = await page.locator('input[placeholder*="email" i]').first();
      }

      // Try multiple selector strategies for password input
      let passwordInput = await page.locator('input[type="password"]').first();
      if (!(await passwordInput.isVisible())) {
        passwordInput = await page.locator('input[name="password"]').first();
      }
      if (!(await passwordInput.isVisible())) {
        passwordInput = await page.locator('input[placeholder*="password" i]').first();
      }

      if (await emailInput.isVisible() && await passwordInput.isVisible()) {
        console.log('✅ Found email and password inputs');
        
        // Fill in the credentials
        await emailInput.fill('baustin2786@gmail.com');
        await passwordInput.fill('2A59cq!CC');
        console.log('✏️ Filled login credentials');

        await page.screenshot({ path: 'test-03-filled-form.png' });

        // Look for submit button with multiple strategies
        let submitButton = await page.locator('button[type="submit"]').first();
        if (!(await submitButton.isVisible())) {
          submitButton = await page.locator('button:has-text("Login")').first();
        }
        if (!(await submitButton.isVisible())) {
          submitButton = await page.locator('button:has-text("Sign In")').first();
        }
        if (!(await submitButton.isVisible())) {
          submitButton = await page.locator('form button').first();
        }

        if (await submitButton.isVisible()) {
          console.log('🔐 Clicking login button...');
          await submitButton.click();
          
          // Wait for navigation or login to complete
          console.log('⏳ Waiting for login to complete...');
          await page.waitForTimeout(5000);
          
          await page.screenshot({ path: 'test-04-after-login.png' });
        } else {
          console.log('❌ Could not find submit button');
          await page.screenshot({ path: 'test-error-no-submit.png' });
        }
      } else {
        console.log('❌ Could not find email/password inputs');
        await page.screenshot({ path: 'test-error-no-inputs.png' });
      }
    }

    // Step 3: Test logged-in functionality
    console.log('🧪 Testing logged-in functionality...');
    
    // Check current page state
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    
    console.log('📍 Current URL:', currentUrl);
    console.log('📄 Page contains:', pageContent.substring(0, 200) + '...');
    
    // Look for chat interface elements
    const chatElements = await page.evaluate(() => {
      const elements = [];
      
      // Look for common chat interface elements
      if (document.querySelector('input[placeholder*="message" i]')) elements.push('message input');
      if (document.querySelector('button[aria-label*="send" i]')) elements.push('send button');
      if (document.querySelector('[class*="chat"]')) elements.push('chat container');
      if (document.querySelector('textarea')) elements.push('textarea');
      if (document.querySelector('[data-testid*="chat"]')) elements.push('chat testid');
      
      // Check for user info
      if (document.textContent.includes('baustin2786@gmail.com')) elements.push('user email');
      if (document.querySelector('[class*="avatar"]')) elements.push('avatar');
      if (document.querySelector('button:has-text("Logout")')) elements.push('logout button');
      
      return elements;
    });
    
    console.log('🔍 Found UI elements:', chatElements);
    
    // Try to interact with chat interface if available
    const messageInput = await page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    if (await messageInput.isVisible()) {
      console.log('💬 Testing chat functionality...');
      await messageInput.fill('Hello, this is a test message from Playwright!');
      await page.screenshot({ path: 'test-05-chat-message.png' });
      
      // Look for send button
      const sendButton = await page.locator('button[aria-label*="send" i], button:has-text("Send")').first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('✅ Sent test message');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-06-message-sent.png' });
      }
    }

    // Test navigation if available
    const navLinks = await page.locator('nav a, [role="navigation"] a').count();
    console.log(`🧭 Found ${navLinks} navigation links`);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-07-final-state.png' });
    
    // Check for any errors in console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    if (errors.length > 0) {
      console.log('⚠️ Console errors found:', errors);
    } else {
      console.log('✅ No console errors detected');
    }

    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error-final.png' });
  } finally {
    await browser.close();
    console.log('🏁 Browser closed');
  }
}

testFullLoginFlow();