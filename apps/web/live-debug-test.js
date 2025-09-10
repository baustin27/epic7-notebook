const { chromium } = require('playwright');

async function liveDebugTest() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs and errors
  page.on('console', msg => {
    console.log(`🖥️  Console ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error(`❌ Page error: ${error.message}`);
  });

  try {
    console.log('🚀 Live debug test starting...');
    
    await page.goto('http://localhost:3000');
    console.log('✅ Navigated to localhost:3000');
    
    // Take immediate screenshot
    await page.screenshot({ path: 'live-01-immediate.png' });
    
    // Wait for network to be idle
    await page.waitForLoadState('networkidle');
    console.log('✅ Network idle');
    
    await page.screenshot({ path: 'live-02-after-network-idle.png' });
    
    // Wait 3 seconds to see what happens
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'live-03-after-3sec.png' });
    
    // Check what elements exist
    const pageState = await page.evaluate(() => {
      return {
        title: document.title,
        hasLoadingText: document.textContent.includes('Loading'),
        hasLoginForm: document.querySelector('input[type="email"]') !== null,
        hasChatInterface: document.querySelector('[class*="chat"]') !== null,
        bodyHTML: document.body.innerHTML.substring(0, 1000),
        readyState: document.readyState
      };
    });
    
    console.log('📊 Page state:');
    console.log('  Title:', pageState.title);
    console.log('  Has loading text:', pageState.hasLoadingText);
    console.log('  Has login form:', pageState.hasLoginForm);
    console.log('  Has chat interface:', pageState.hasChatInterface);
    console.log('  Document ready state:', pageState.readyState);
    console.log('  Body HTML preview:', pageState.bodyHTML.substring(0, 200) + '...');
    
    // Wait longer to see if anything changes
    console.log('⏳ Waiting 10 more seconds to observe changes...');
    await page.waitForTimeout(10000);
    await page.screenshot({ path: 'live-04-after-13sec.png' });
    
    // Check for any React hydration issues
    const reactState = await page.evaluate(() => {
      return {
        hasReact: typeof React !== 'undefined',
        hasReactDOM: typeof ReactDOM !== 'undefined',
        rootElement: document.getElementById('__next') ? 'Found __next' : 'No __next',
        scriptTags: Array.from(document.querySelectorAll('script')).length,
        linkTags: Array.from(document.querySelectorAll('link')).length
      };
    });
    
    console.log('⚛️  React state:');
    console.log('  Has React:', reactState.hasReact);
    console.log('  Has ReactDOM:', reactState.hasReactDOM);
    console.log('  Root element:', reactState.rootElement);
    console.log('  Script tags count:', reactState.scriptTags);
    console.log('  Link tags count:', reactState.linkTags);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: 'live-error.png' });
  } finally {
    console.log('🔍 Keeping browser open for manual inspection for 30 seconds...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

liveDebugTest();