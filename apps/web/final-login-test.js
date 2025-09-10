const { chromium } = require('playwright');

async function testFinalLogin() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🚀 Testing final login after fixing Redis issues...');
    
    // Navigate and wait for proper loading
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');

    await page.screenshot({ path: 'final-test-01-home.png' });

    // Wait for the app to initialize (avoid loading screen)
    await page.waitForTimeout(5000);
    
    // Check if we see a loading screen or login form
    const hasLoadingScreen = await page.locator('text=Loading Sleek Chat').isVisible();
    const hasLoginForm = await page.locator('input[type="email"], input[placeholder*="email" i]').isVisible();
    
    if (hasLoadingScreen) {
      console.log('⚠️ Still seeing loading screen, waiting longer...');
      await page.waitForTimeout(10000);
      await page.screenshot({ path: 'final-test-02-still-loading.png' });
      
      // Check for errors in console
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
          console.log('❌ Console error:', msg.text());
        }
      });
      
      // Wait for loading to complete or timeout
      try {
        await page.waitForSelector('input[type="email"], [data-testid="chat-interface"]', { timeout: 15000 });
      } catch (e) {
        console.log('❌ Timeout waiting for app to load');
        await page.screenshot({ path: 'final-test-03-timeout.png' });
        return;
      }
    }

    // Now check what we have
    const finalState = await page.evaluate(() => {
      return {
        hasLoginForm: document.querySelector('input[type="email"]') !== null,
        hasChatInterface: document.querySelector('[class*="chat"]') !== null,
        hasLoadingText: document.textContent.includes('Loading'),
        bodyText: document.body.textContent.substring(0, 500)
      };
    });

    console.log('📊 Final state:', finalState);

    if (finalState.hasLoginForm) {
      console.log('🔐 Found login form, proceeding with login...');
      
      await page.fill('input[type="email"]', 'baustin2786@gmail.com');
      await page.fill('input[type="password"]', '2A59cq!CC');
      await page.screenshot({ path: 'final-test-04-filled-form.png' });
      
      await page.click('button:has-text("Sign In")');
      await page.waitForTimeout(8000);
      await page.screenshot({ path: 'final-test-05-after-login.png' });
      
      const postLoginUrl = page.url();
      const postLoginState = await page.locator('[class*="chat"], [data-testid*="chat"]').count();
      
      console.log('📍 Post-login URL:', postLoginUrl);
      console.log('🔍 Chat elements found:', postLoginState);
      
      if (postLoginState > 0) {
        console.log('✅ SUCCESS! Login worked and chat interface is visible');
      } else {
        console.log('❓ Login completed but chat interface not found');
      }
    } else if (finalState.hasChatInterface) {
      console.log('✅ Already logged in with chat interface visible!');
    } else {
      console.log('❌ Unknown state - no login form or chat interface');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'final-test-error.png' });
  } finally {
    console.log('⏳ Keeping browser open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

testFinalLogin();