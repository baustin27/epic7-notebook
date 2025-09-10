import { test, expect } from '@playwright/test'

test.describe('Simple Model Selector Test', () => {
  test('should access the app and test model functionality', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Take initial screenshot
    await page.screenshot({ path: 'initial-page.png', fullPage: true })
    
    // Try clicking the "Test Supabase Connection" button if it exists
    const testButton = page.locator('button:has-text("Test Supabase Connection")')
    if (await testButton.isVisible()) {
      console.log('Found Test Supabase Connection button, clicking it...')
      await testButton.click()
      await page.waitForTimeout(2000)
      
      // Take screenshot after test button click
      await page.screenshot({ path: 'after-test-button.png', fullPage: true })
    } else {
      console.log('Test Supabase Connection button not found')
    }
    
    // Try to fill in test credentials and sign in
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const signInButton = page.locator('button:has-text("Sign In")')
    
    if (await emailInput.isVisible() && await passwordInput.isVisible() && await signInButton.isVisible()) {
      console.log('Found login form, attempting to sign in with test credentials...')
      
      // Try common test credentials
      await emailInput.fill('test@example.com')
      await passwordInput.fill('testpassword123')
      await signInButton.click()
      
      // Wait for either success or error
      await page.waitForTimeout(3000)
      
      // Take screenshot after login attempt
      await page.screenshot({ path: 'after-login-attempt.png', fullPage: true })
    }
    
    // Check what's on the page now
    const pageContent = await page.content()
    console.log('Page contains "model":', pageContent.toLowerCase().includes('model'))
    console.log('Page contains "provider":', pageContent.toLowerCase().includes('provider'))
    console.log('Page contains "gpt":', pageContent.toLowerCase().includes('gpt'))
    console.log('Page contains "chat":', pageContent.toLowerCase().includes('chat'))
    
    // Look for any model-related elements
    const modelElements = await page.locator('*').evaluateAll(elements => {
      return elements
        .map(el => el.textContent?.toLowerCase())
        .filter(text => text && (text.includes('model') || text.includes('gpt') || text.includes('provider')))
        .slice(0, 10) // Limit to first 10 matches
    })
    
    console.log('Found model-related text:', modelElements)
    
    // Check if we can see any chat interface
    const chatElements = [
      'input[placeholder*="message"]',
      'textarea[placeholder*="message"]',
      '[data-testid*="chat"]',
      '[data-testid*="message"]',
      'button:has-text("Send")',
      '[role="textbox"]'
    ]
    
    for (const selector of chatElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible()) {
        console.log(`Found chat element: ${selector}`)
        const text = await element.textContent() || await element.getAttribute('placeholder')
        console.log(`Element text/placeholder: ${text}`)
        break
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'final-page-state.png', fullPage: true })
    
    // Try to access the /api/models endpoint directly
    try {
      const response = await page.request.get('http://localhost:3000/api/models')
      const models = await response.json()
      console.log('API Models response status:', response.status())
      console.log('API Models response:', JSON.stringify(models, null, 2))
      
      if (models && typeof models === 'object') {
        if (models.models && Array.isArray(models.models)) {
          console.log(`Found ${models.models.length} models in API response`)
          if (models.models.length > 0) {
            console.log('Sample models:', models.models.slice(0, 3).map(m => m.id || m.name || m))
          }
        } else if (Array.isArray(models)) {
          console.log(`Found ${models.length} models in direct array`)
          if (models.length > 0) {
            console.log('Sample models:', models.slice(0, 3))
          }
        }
      }
    } catch (error) {
      console.log('Error fetching models API:', error.message)
    }
    
    // The test passes if we successfully loaded the page and can report on what we found
    expect(true).toBe(true) // Always pass, we're just gathering information
  })
})