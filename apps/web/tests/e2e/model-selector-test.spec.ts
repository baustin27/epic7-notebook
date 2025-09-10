import { test, expect } from '@playwright/test'

test.describe('Model Selector Enhanced Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication to bypass login
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      }))
    })

    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
  })

  test('should load model selector with enhanced search and filter UI', async ({ page }) => {
    // Wait for models to load
    await page.waitForTimeout(3000)

    // Find and click the model selector button
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await expect(modelSelectorButton).toBeVisible()
    await modelSelectorButton.click()

    // Verify the dropdown is open
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search models"]').or(
      page.locator('input[aria-label="Search models"]')
    )
    await expect(searchInput).toBeVisible()

    // Check for sort dropdown
    const sortSelect = page.locator('select').filter({ hasText: /Name|Provider|Price|Context/ })
    await expect(sortSelect).toBeVisible()

    // Check for filters toggle
    const filtersButton = page.locator('button').filter({ hasText: 'Filters' })
    await expect(filtersButton).toBeVisible()

    // Verify model count is displayed
    const modelCountText = page.locator('text=/[0-9]+ models?/')
    await expect(modelCountText).toBeVisible()
  })

  test('should search models by name, ID, description, and provider', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Get initial model count
    const initialCountText = await page.locator('text=/[0-9]+ of [0-9]+ models?/').textContent()
    const initialTotal = initialCountText ? parseInt(initialCountText.match(/of (\d+)/)?.[1] || '0') : 0

    // Search for "gpt" - should find GPT models
    const searchInput = page.locator('input[placeholder*="Search models"]')
    await searchInput.fill('gpt')
    await page.waitForTimeout(350) // Wait for debounce

    // Verify results are filtered
    const filteredCountText = await page.locator('text=/[0-9]+ of [0-9]+ models?/').textContent()
    const filteredCount = filteredCountText ? parseInt(filteredCountText.match(/(\d+) of/)?.[1] || '0') : 0

    expect(filteredCount).toBeLessThanOrEqual(initialTotal)
    expect(filteredCount).toBeGreaterThan(0)

    // Verify GPT models are shown
    const gptModels = page.locator('text=/gpt/i')
    await expect(gptModels.first()).toBeVisible()

    // Clear search
    await searchInput.clear()
    await page.waitForTimeout(350)

    // Verify all models are shown again
    const clearedCountText = await page.locator('text=/[0-9]+ of [0-9]+ models?/').textContent()
    const clearedCount = clearedCountText ? parseInt(clearedCountText.match(/(\d+) of/)?.[1] || '0') : 0
    expect(clearedCount).toBe(initialTotal)
  })

  test('should filter models by provider', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Open filters
    const filtersButton = page.locator('button').filter({ hasText: 'Filters' })
    await filtersButton.click()

    // Find provider checkboxes
    const providerCheckboxes = page.locator('input[type="checkbox"]').filter({ hasText: /OpenAI|Anthropic|Google/ })

    if (await providerCheckboxes.count() > 0) {
      // Check first provider
      const firstProvider = providerCheckboxes.first()
      const providerLabel = await firstProvider.locator('xpath=following-sibling::*').textContent()
      await firstProvider.check()

      await page.waitForTimeout(100)

      // Verify only models from that provider are shown
      const visibleModels = page.locator('[data-testid="model-option"]')
      const modelCount = await visibleModels.count()

      // All visible models should be from the selected provider
      for (let i = 0; i < Math.min(modelCount, 5); i++) {
        const modelText = await visibleModels.nth(i).textContent()
        if (providerLabel) {
          expect(modelText?.toLowerCase()).toContain(providerLabel.toLowerCase())
        }
      }
    }
  })

  test('should sort models by different criteria', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Test name sorting (A-Z)
    const sortSelect = page.locator('select').filter({ hasText: /Name|Provider|Price|Context/ })
    await sortSelect.selectOption({ label: 'Name A-Z' })

    await page.waitForTimeout(100)

    // Verify models are sorted alphabetically
    const modelNames = page.locator('[data-testid="model-option"] .font-medium')
    const firstModel = await modelNames.first().textContent()
    const lastModel = await modelNames.last().textContent()

    if (firstModel && lastModel) {
      expect(firstModel.toLowerCase() <= lastModel.toLowerCase()).toBe(true)
    }

    // Test name sorting (Z-A)
    await sortSelect.selectOption({ label: 'Name Z-A' })
    await page.waitForTimeout(100)

    const firstModelDesc = await modelNames.first().textContent()
    const lastModelDesc = await modelNames.last().textContent()

    if (firstModelDesc && lastModelDesc) {
      expect(firstModelDesc.toLowerCase() >= lastModelDesc.toLowerCase()).toBe(true)
    }
  })

  test('should handle pagination with "Show more" button', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Check if "Show more" button exists
    const showMoreButton = page.locator('button').filter({ hasText: 'Show more models' })

    if (await showMoreButton.isVisible()) {
      const initialVisibleModels = await page.locator('[data-testid="model-option"]').count()

      // Click show more
      await showMoreButton.click()

      // Verify more models are now visible
      const finalVisibleModels = await page.locator('[data-testid="model-option"]').count()
      expect(finalVisibleModels).toBeGreaterThan(initialVisibleModels)
    }
  })

  test('should select model and close dropdown', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Get initial selected model
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    const initialSelectedModel = await modelSelectorButton.textContent()

    // Open model selector
    await modelSelectorButton.click()

    // Select first available model
    const firstModelOption = page.locator('[data-testid="model-option"]').first()
    const modelName = await firstModelOption.locator('.font-medium').textContent()

    await firstModelOption.click()

    // Verify dropdown is closed
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).not.toBeVisible()

    // Verify selected model changed
    const newSelectedModel = await modelSelectorButton.textContent()
    expect(newSelectedModel).not.toBe(initialSelectedModel)
    if (modelName) {
      expect(newSelectedModel?.toLowerCase()).toContain(modelName.toLowerCase())
    }
  })

  test('should be able to interact with model selector and send message', async ({ page }) => {
    // Give the page time to load
    await page.waitForTimeout(3000)
    
    // Look for any dropdown or button that might open model selection
    const possibleTriggers = [
      'button:has-text("model")',
      'button:has-text("gpt")',
      '[data-testid*="model"]',
      'select',
      '[role="combobox"]',
      'button[aria-haspopup="true"]'
    ]
    
    let triggerElement = null
    for (const selector of possibleTriggers) {
      try {
        const element = page.locator(selector).first()
        if (await element.isVisible()) {
          triggerElement = element
          console.log(`Using trigger: ${selector}`)
          break
        }
      } catch (error) {
        continue
      }
    }
    
    if (triggerElement) {
      // Click to open model selector
      await triggerElement.click()
      await page.waitForTimeout(1000)
      
      // Look for model options
      const modelOptions = page.locator('text=/gpt-3\.5-turbo|gpt-4o|claude/i')
      
      if (await modelOptions.first().isVisible()) {
        console.log('Model options found, selecting one...')
        await modelOptions.first().click()
        await page.waitForTimeout(500)
      }
    }
    
    // Try to send a test message regardless of model selection
    const messageInput = page.locator('input[placeholder*="message"]').or(
      page.locator('textarea[placeholder*="message"]').or(
        page.locator('[data-testid="message-input"] input').or(
          page.locator('[data-testid="message-input"] textarea')
        )
      )
    )
    
    const sendButton = page.locator('button[type="submit"]').or(
      page.locator('button:has-text("Send")').or(
        page.locator('[data-testid="send-btn"]')
      )
    )
    
    if (await messageInput.first().isVisible()) {
      console.log('Sending test message...')
      await messageInput.first().fill('Hello! This is a test to verify AI responses are working.')
      
      if (await sendButton.first().isVisible()) {
        await sendButton.first().click()
        
        // Wait and see if we get any response
        await page.waitForTimeout(5000)
        
        // Take a screenshot to see the result
        await page.screenshot({ path: 'after-message-sent.png', fullPage: true })
        
        // Check if message was sent
        const sentMessage = page.locator('text=Hello! This is a test to verify AI responses are working.')
        await expect(sentMessage).toBeVisible()
        
        console.log('Test message sent successfully')
      }
    }
  })
})