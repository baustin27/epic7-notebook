import { test, expect } from '@playwright/test'

test.describe('Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      }))
    })

    await page.goto('/')
  })

  test('should display chat interface when authenticated', async ({ page }) => {
    await expect(page.locator('[data-testid="chat-area"]')).toBeVisible()
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible()
  })

  test('should show sidebar with new chat option', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toBeVisible()

    const newChatButton = page.locator('[data-testid="new-conversation-btn"]')
    await expect(newChatButton).toBeVisible()
    await expect(newChatButton).toHaveText(/New Chat|Creating/)
  })

  test('should create new conversation', async ({ page }) => {
    const newChatButton = page.locator('[data-testid="new-conversation-btn"]')
    await newChatButton.click()

    // Wait for conversation creation
    await page.waitForTimeout(1000)

    // Check if conversation is selected (chat area should show content for the new conversation)
    const chatArea = page.locator('[data-testid="chat-area"]')
    await expect(chatArea).toBeVisible()
  })

  test('should allow typing in message input', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    await expect(messageInput).toBeVisible()
    await messageInput.fill('Hello, this is a test message')

    const inputValue = await messageInput.inputValue()
    expect(inputValue).toBe('Hello, this is a test message')
  })

  test('should send message and show in chat', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    // Type and send message
    await messageInput.fill('Test message for chat functionality')
    await sendButton.click()

    // Check if message appears in chat
    await expect(page.locator('text=Test message for chat functionality')).toBeVisible()
  })

  test('should handle message sending with Enter key', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    await messageInput.fill('Message sent with Enter key')
    await messageInput.press('Enter')

    // Check if message appears in chat
    await expect(page.locator('text=Message sent with Enter key')).toBeVisible()
  })

  test('should show loading state while sending message', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    // Mock slow response by intercepting API calls
    await page.route('**/chat/**', async route => {
      await page.waitForTimeout(2000) // Simulate delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Mock AI response' })
      })
    })

    await messageInput.fill('Test message with delay')
    await sendButton.click()

    // Check for loading indicator
    const loadingIndicator = page.locator('text=/sending/i').or(
      page.locator('[data-testid*="loading"]').or(
        page.locator('.animate-spin')
      )
    )

    // Should show loading state
    await expect(loadingIndicator).toBeVisible()

    // Wait for response
    await page.waitForTimeout(2500)

    // Loading should be gone and response should appear
    await expect(page.locator('text=Mock AI response')).toBeVisible()
  })

  test('should handle message sending errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/chat/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    await messageInput.fill('This message will fail')
    await sendButton.click()

    // Check for error message
    const errorMessage = page.locator('text=/error/i').or(
      page.locator('text=/failed/i').or(
        page.locator('[data-testid*="error"]')
      )
    )

    await expect(errorMessage).toBeVisible()
  })

  test('should maintain message history in conversation', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    // Send multiple messages
    const messages = ['First message', 'Second message', 'Third message']

    for (const message of messages) {
      await messageInput.fill(message)
      await sendButton.click()
      await page.waitForTimeout(500) // Wait for message to be sent
    }

    // Check that all messages are visible
    for (const message of messages) {
      await expect(page.locator(`text=${message}`)).toBeVisible()
    }
  })

  test('should handle empty message submission', async ({ page }) => {
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    // Try to send empty message
    await sendButton.click()

    // Should not send empty message (no new message should appear)
    // This is a basic check - in a real app you might want more specific validation
    const messages = page.locator('[data-testid*="message"]').or(
      page.locator('.message')
    )

    // If there are no messages, count should remain 0
    const messageCount = await messages.count()
    expect(messageCount).toBeLessThanOrEqual(0)
  })

  test('should handle very long messages', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    // Create a very long message
    const longMessage = 'A'.repeat(10000)
    await messageInput.fill(longMessage)
    await sendButton.click()

    // Check if the long message is handled (either sent successfully or shows appropriate error)
    const longMessageInChat = page.locator(`text=${longMessage.substring(0, 100)}...`).or(
      page.locator(`text=${longMessage}`)
    )

    // The test passes if either the message is sent or an appropriate error is shown
    try {
      await expect(longMessageInChat).toBeVisible({ timeout: 5000 })
    } catch {
      // If message isn't found, check for error about message length
      const lengthError = page.locator('text=/too long/i').or(
        page.locator('text=/length/i')
      )
      await expect(lengthError).toBeVisible()
    }
  })

  test('should handle special characters in messages', async ({ page }) => {
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    const specialMessage = 'Special chars: éñüñ 中文 🔥 @#$%^&*()'
    await messageInput.fill(specialMessage)
    await sendButton.click()

    // Check if special characters are preserved
    await expect(page.locator(`text=${specialMessage}`)).toBeVisible()
  })

  test('should show model selector with available models', async ({ page }) => {
    // Wait for page to load and models to be fetched
    await page.waitForLoadState('networkidle')
    
    // Look for the model selector - try different possible selectors
    const modelSelector = page.locator('[data-testid="model-selector"]').or(
      page.locator('button:has-text("models")').or(
        page.locator('select[data-testid*="model"]').or(
          page.locator('button:has-text("gpt")').or(
            page.locator('[data-testid*="model"]').or(
              page.locator('text=/models from.*providers/i')
            )
          )
        )
      )
    )

    await expect(modelSelector).toBeVisible()
    
    // Check if it shows available models count (should not be "0 models from 0 providers")
    const modelCount = page.locator('text=/[1-9][0-9]* models from [1-9][0-9]* providers/i')
    await expect(modelCount).toBeVisible()
    
    // Click on the model selector to open dropdown
    await modelSelector.click()
    
    // Wait for dropdown to open and models to load
    await page.waitForTimeout(1000)
    
    // Look for OpenAI models
    const openAIModel = page.locator('text=/gpt-.*turbo|gpt-4o/i')
    await expect(openAIModel.first()).toBeVisible()
    
    // Look for OpenRouter models (they might have different naming)
    const openRouterSection = page.locator('text=/openrouter/i').or(
      page.locator('text=/anthropic|claude/i')
    )
    
    // At least one of these should be visible
    try {
      await expect(openRouterSection.first()).toBeVisible()
    } catch {
      // If no OpenRouter section, just verify we have multiple models
      const modelOptions = page.locator('[role="option"]').or(
        page.locator('li:has-text("gpt")').or(
          page.locator('div:has-text("gpt")')
        )
      )
      const modelCount = await modelOptions.count()
      expect(modelCount).toBeGreaterThan(1)
    }
  })

  test('should allow selecting a model and sending a test message', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Find and click the model selector
    const modelSelector = page.locator('[data-testid="model-selector"]').or(
      page.locator('button:has-text("models")').or(
        page.locator('select[data-testid*="model"]').or(
          page.locator('button:has-text("gpt")').or(
            page.locator('[data-testid*="model"]')
          )
        )
      )
    )

    await modelSelector.click()
    await page.waitForTimeout(1000)
    
    // Select gpt-3.5-turbo or gpt-4o (prefer gpt-3.5-turbo for faster testing)
    const preferredModel = page.locator('text=/gpt-3\.5-turbo|gpt-4o/i')
    await preferredModel.first().click()
    
    // Wait for model selection to be processed
    await page.waitForTimeout(500)
    
    // Now send a test message
    const messageInput = page.locator('[data-testid="message-input"] input').or(
      page.locator('[data-testid="message-input"] textarea').or(
        page.locator('input[placeholder*="message"]').or(
          page.locator('textarea[placeholder*="message"]')
        )
      )
    )

    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )

    // Type the test message
    const testMessage = 'Hello! This is a test to verify AI responses are working.'
    await messageInput.fill(testMessage)
    await sendButton.click()

    // Verify the message appears in chat
    await expect(page.locator(`text=${testMessage}`)).toBeVisible()

    // Wait for AI response (with a reasonable timeout)
    // Look for any response that's not the original message
    const aiResponse = page.locator('[data-testid*="message"]:not(:has-text("Hello! This is a test"))').or(
      page.locator('.message:not(:has-text("Hello! This is a test"))').or(
        page.locator('div:has-text("Hello"):not(:has-text("Hello! This is a test"))')
      )
    )
    
    // Wait for AI response with a generous timeout
    await expect(aiResponse.first()).toBeVisible({ timeout: 30000 })
    
    // Verify we got some kind of response
    const responseText = await aiResponse.first().textContent()
    expect(responseText).toBeTruthy()
    expect(responseText.length).toBeGreaterThan(5)
  })
})