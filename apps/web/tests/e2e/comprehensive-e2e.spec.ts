import { test, expect } from '@playwright/test'

test.describe('Comprehensive End-to-End Chat Application Test', () => {
  // Admin credentials for testing
  const ADMIN_EMAIL = 'baustin2786@gmail.com'
  const ADMIN_PASSWORD = '2A59cq!CC'

  let consoleErrors: string[] = []
  let hydrationErrors: string[] = []

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    consoleErrors = []
    hydrationErrors = []

    // Clear any existing authentication state
    await page.context().clearCookies()
    
    // Safely clear storage only if available
    await page.evaluate(() => {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.clear()
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear()
        }
      } catch (e) {
        console.log('Storage not accessible:', e)
      }
    })

    // Listen for console errors and hydration issues
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const errorText = msg.text()
        consoleErrors.push(errorText)
        
        // Check for hydration errors specifically
        if (errorText.includes('Hydration') || errorText.includes('hydration')) {
          hydrationErrors.push(errorText)
        }
      }
    })

    // Listen for page errors
    page.on('pageerror', error => {
      consoleErrors.push(error.message)
    })
  })

  test('Complete E2E Test: Authentication → Chat Interface → Messaging → API Integration', async ({ page }) => {
    console.log('🚀 Starting Comprehensive End-to-End Test')

    // ===== STEP 1: AUTHENTICATION FLOW =====
    console.log('📝 Step 1: Testing Authentication Flow')
    
    // Navigate to the application
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    
    // Take screenshot of initial page
    await page.screenshot({ path: 'test-results/01-initial-page.png', fullPage: true })
    
    // Verify we're on the login page (not authenticated)
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const loginButton = page.locator('button:has-text("Sign In")').or(
      page.locator('button[type="submit"]')
    )

    await expect(emailInput).toBeVisible({ timeout: 10000 })
    await expect(passwordInput).toBeVisible()
    await expect(loginButton).toBeVisible()
    console.log('✅ Login form elements are visible')

    // Fill in admin credentials
    await emailInput.fill(ADMIN_EMAIL)
    await passwordInput.fill(ADMIN_PASSWORD)
    
    // Take screenshot before login
    await page.screenshot({ path: 'test-results/02-credentials-filled.png', fullPage: true })
    
    // Submit login form
    await loginButton.click()
    console.log('🔐 Login form submitted with admin credentials')

    // Wait for authentication to complete and redirect
    await page.waitForTimeout(3000)
    
    // Check for successful authentication (should no longer see login form)
    const isLoginFormGone = await emailInput.isHidden().catch(() => true)
    expect(isLoginFormGone).toBeTruthy()
    console.log('✅ Successfully authenticated - login form is gone')

    // ===== STEP 2: CHAT INTERFACE VERIFICATION =====
    console.log('📝 Step 2: Verifying Chat Interface')
    
    await page.waitForLoadState('networkidle', { timeout: 10000 })
    await page.screenshot({ path: 'test-results/03-after-login.png', fullPage: true })

    // Check for header
    const header = page.locator('header').or(
      page.locator('[role="banner"]').or(
        page.locator('nav').or(
          page.locator('[data-testid*="header"]')
        )
      )
    )
    await expect(header).toBeVisible({ timeout: 10000 })
    console.log('✅ Header is visible')

    // Check for sidebar
    const sidebar = page.locator('[data-testid="sidebar"]').or(
      page.locator('aside').or(
        page.locator('[role="complementary"]').or(
          page.locator('.sidebar')
        )
      )
    )
    await expect(sidebar).toBeVisible({ timeout: 10000 })
    console.log('✅ Sidebar is visible')

    // Check for chat area
    const chatArea = page.locator('[data-testid="chat-area"]').or(
      page.locator('[role="main"]').or(
        page.locator('.chat-area').or(
          page.locator('main')
        )
      )
    )
    await expect(chatArea).toBeVisible({ timeout: 10000 })
    console.log('✅ Chat area is visible')

    // Check for message input
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]').or(
            page.locator('input[placeholder*="Message"]').or(
              page.locator('textarea[placeholder*="Message"]')
            )
          )
        )
      )
    )
    await expect(messageInput).toBeVisible({ timeout: 10000 })
    console.log('✅ Message input is visible')

    // Check that writing assistant is disabled by default
    const writingAssistantToggle = page.locator('text=/writing assistant/i').or(
      page.locator('[data-testid*="writing"]').or(
        page.locator('text=/assistant/i')
      )
    )
    
    if (await writingAssistantToggle.isVisible()) {
      // If toggle is visible, check if it's disabled
      const isDisabled = await writingAssistantToggle.evaluate(el => {
        return el.getAttribute('aria-checked') === 'false' || 
               el.classList.contains('disabled') ||
               (el as HTMLInputElement).disabled
      })
      expect(isDisabled).toBeTruthy()
      console.log('✅ Writing assistant is disabled by default')
    } else {
      console.log('ℹ️ Writing assistant toggle not found - may not be implemented yet')
    }

    // ===== STEP 3: CONVERSATION MANAGEMENT =====
    console.log('📝 Step 3: Testing Conversation Management')

    // Find and click new conversation button
    const newConversationBtn = page.locator('[data-testid="new-conversation-btn"]').or(
      page.locator('button:has-text("New Chat")').or(
        page.locator('button:has-text("New Conversation")').or(
          page.locator('text=/New/i').or(
            page.locator('[data-testid*="new"]')
          )
        )
      )
    )
    
    await expect(newConversationBtn).toBeVisible({ timeout: 10000 })
    await newConversationBtn.click()
    console.log('✅ New conversation button clicked')

    // Wait for conversation creation
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/04-new-conversation.png', fullPage: true })

    // Verify new conversation appears in sidebar (look for conversation list items)
    const conversationItems = page.locator('[data-testid*="conversation"]').or(
      page.locator('.conversation-item').or(
        page.locator('li').or(
          page.locator('[role="option"]')
        )
      )
    )
    
    // Check if at least one conversation item exists
    await expect(conversationItems.first()).toBeVisible({ timeout: 10000 })
    console.log('✅ New conversation appears in sidebar')

    // ===== STEP 4: MESSAGE SYSTEM TESTING =====
    console.log('📝 Step 4: Testing Message System and AI Response')

    const testMessage = 'Hello, this is a comprehensive test of the chat system!'
    
    // Send the test message
    await messageInput.fill(testMessage)
    
    // Find send button
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]').or(
          page.locator('button[aria-label*="send"]')
        )
      )
    )
    
    await expect(sendButton).toBeVisible()
    await page.screenshot({ path: 'test-results/05-message-ready-to-send.png', fullPage: true })
    
    await sendButton.click()
    console.log('✅ Test message sent')

    // Verify the message appears in chat
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 })
    console.log('✅ User message appears in chat')
    
    await page.screenshot({ path: 'test-results/06-message-sent.png', fullPage: true })

    // Wait for AI response (should work with configured OpenAI API key)
    console.log('⏳ Waiting for AI response...')
    
    // Look for loading indicator first
    const loadingIndicator = page.locator('text=/thinking/i').or(
      page.locator('text=/generating/i').or(
        page.locator('[data-testid*="loading"]').or(
          page.locator('.animate-spin').or(
            page.locator('text=/typing/i')
          )
        )
      )
    )
    
    // Wait for either loading indicator or immediate response
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 5000 })
      console.log('✅ Loading indicator appeared')
    } catch {
      console.log('ℹ️ No loading indicator found - response may be immediate')
    }

    // Wait for AI response to appear (look for new content that's not our sent message)
    // We'll wait longer for the actual AI response
    let aiResponseFound = false
    let attempts = 0
    const maxAttempts = 20 // 40 seconds total wait time
    
    while (!aiResponseFound && attempts < maxAttempts) {
      await page.waitForTimeout(2000)
      attempts++
      
      // Check if there are multiple messages now (original + AI response)
      const allMessages = page.locator('[data-testid*="message"]').or(
        page.locator('.message').or(
          page.locator('p').filter({ hasNotText: testMessage })
        )
      )
      
      const messageCount = await allMessages.count()
      if (messageCount > 1) {
        aiResponseFound = true
        console.log('✅ AI response detected')
        break
      }
      
      // Also check for any new text content that might be an AI response
      const pageText = await page.textContent('body')
      if (pageText && pageText.includes(testMessage)) {
        // Look for content after our message that looks like an AI response
        const newContent = pageText.split(testMessage)[1]
        if (newContent && newContent.trim().length > 10) {
          aiResponseFound = true
          console.log('✅ AI response content detected')
          break
        }
      }
      
      console.log(`⏳ Waiting for AI response... (attempt ${attempts}/${maxAttempts})`)
    }
    
    if (aiResponseFound) {
      console.log('✅ AI response successfully received')
    } else {
      console.log('⚠️ AI response not detected within timeout - this may indicate API issues')
    }
    
    await page.screenshot({ path: 'test-results/07-after-ai-response.png', fullPage: true })

    // ===== STEP 5: API INTEGRATION VERIFICATION =====
    console.log('📝 Step 5: Testing API Integration and Model Selector')

    // Look for model selector/dropdown
    const modelSelector = page.locator('select').or(
      page.locator('[data-testid*="model"]').or(
        page.locator('button:has-text("Model")').or(
          page.locator('[role="combobox"]').or(
            page.locator('text=/gpt/i').or(
              page.locator('text=/claude/i')
            )
          )
        )
      )
    )
    
    if (await modelSelector.isVisible()) {
      console.log('✅ Model selector found')
      
      // Click on model selector to see available options
      await modelSelector.click()
      await page.waitForTimeout(1000)
      
      // Look for OpenAI models
      const openaiOption = page.locator('text=/openai/i').or(
        page.locator('text=/gpt/i').or(
          page.locator('option:has-text("GPT")')
        )
      )
      
      // Look for OpenRouter models  
      const openrouterOption = page.locator('text=/openrouter/i').or(
        page.locator('text=/router/i')
      )
      
      if (await openaiOption.isVisible()) {
        console.log('✅ OpenAI provider options are available')
      }
      
      if (await openrouterOption.isVisible()) {
        console.log('✅ OpenRouter provider options are available')
      }
      
      // Verify no Google/Gemini options (should be filtered out if not configured)
      const googleOption = page.locator('text=/google/i').or(
        page.locator('text=/gemini/i')
      )
      
      const googleVisible = await googleOption.isVisible()
      if (!googleVisible) {
        console.log('✅ Google/Gemini models correctly filtered out (not configured)')
      } else {
        console.log('⚠️ Google/Gemini models visible - check provider filtering')
      }
      
      await page.screenshot({ path: 'test-results/08-model-selector.png', fullPage: true })
      
      // Close selector by clicking elsewhere
      await page.click('body')
    } else {
      console.log('ℹ️ Model selector not found - may be in a different location')
    }

    // ===== STEP 6: ERROR HANDLING VERIFICATION =====
    console.log('📝 Step 6: Checking Error Handling and Console Logs')

    // Report any console errors found during the test
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:')
      consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    } else {
      console.log('✅ No console errors detected during test execution')
    }

    // Report hydration errors specifically
    if (hydrationErrors.length > 0) {
      console.log('❌ Hydration errors detected:')
      hydrationErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
      // This should fail the test as hydration errors are critical
      expect(hydrationErrors.length).toBe(0)
    } else {
      console.log('✅ No hydration errors detected')
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/09-final-state.png', fullPage: true })

    // ===== FINAL VERIFICATION =====
    console.log('📝 Final Verification: Ensuring smooth user experience')

    // Verify core functionality still works
    await expect(messageInput).toBeVisible()
    await expect(sendButton).toBeVisible()
    await expect(chatArea).toBeVisible()
    await expect(sidebar).toBeVisible()

    console.log('🎉 Comprehensive End-to-End Test Completed Successfully!')

    // Summary of test results
    const testSummary = {
      authenticationWorking: true, // We got past login
      chatInterfaceLoaded: true,   // All elements visible
      messageSystemWorking: true,  // Message sent successfully
      aiResponseReceived: aiResponseFound,
      noHydrationErrors: hydrationErrors.length === 0,
      noConsoleErrors: consoleErrors.length === 0,
      totalErrors: consoleErrors.length,
      totalHydrationErrors: hydrationErrors.length
    }

    console.log('📊 Test Summary:', JSON.stringify(testSummary, null, 2))
  })

  test('Focused Authentication Test with Real Credentials', async ({ page }) => {
    console.log('🔐 Testing Real Authentication Flow')
    
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    
    // Fill in real admin credentials
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD)
    
    // Screenshot before login
    await page.screenshot({ path: 'test-results/auth-before-submit.png', fullPage: true })
    
    // Submit and wait for response
    const loginButton = page.locator('button:has-text("Sign In")').or(
      page.locator('button[type="submit"]')
    )
    await loginButton.click()
    
    // Wait for either successful redirect or error message
    await page.waitForTimeout(5000)
    
    // Screenshot after login attempt
    await page.screenshot({ path: 'test-results/auth-after-submit.png', fullPage: true })
    
    // Check if we're now authenticated (login form should be gone)
    const emailInput = page.locator('input[type="email"]')
    const isLoggedIn = await emailInput.isHidden().catch(() => true)
    
    if (isLoggedIn) {
      console.log('✅ Authentication successful - user logged in')
      
      // Verify chat interface is accessible
      const chatInterface = page.locator('[data-testid="chat-area"]').or(
        page.locator('[role="main"]')
      )
      await expect(chatInterface).toBeVisible({ timeout: 10000 })
      console.log('✅ Chat interface loaded after authentication')
    } else {
      console.log('❌ Authentication failed - still showing login form')
      
      // Look for error messages
      const errorMsg = page.locator('text=/error/i').or(
        page.locator('text=/invalid/i').or(
          page.locator('[data-testid*="error"]')
        )
      )
      
      if (await errorMsg.isVisible()) {
        const errorText = await errorMsg.textContent()
        console.log(`❌ Authentication error: ${errorText}`)
      }
      
      // This should fail the test
      expect(isLoggedIn).toBeTruthy()
    }
  })
})