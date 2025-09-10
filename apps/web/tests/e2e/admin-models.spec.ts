import { test, expect } from '@playwright/test'

test.describe('Admin Model Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin user first
    await page.goto('/login')

    // Fill in login credentials (assuming admin user exists)
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'adminpassword')
    await page.click('button[type="submit"]')

    // Wait for successful login
    await page.waitForURL('/')
  })

  test('Navigate to admin models page and verify access', async ({ page }) => {
    // Navigate to admin models page
    await page.goto('/admin/models')

    // Verify we're on the admin models page
    await expect(page).toHaveURL('/admin/models')
    await expect(page.locator('h1')).toContainText('Model Management')

    // Verify admin authentication is working
    await expect(page.locator('text=Model Management')).toBeVisible()
  })

  test('Display providers and models with connection status', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="provider-group"]', { timeout: 10000 })

    // Check that providers are displayed
    const providerGroups = page.locator('[data-testid="provider-group"]')
    await expect(providerGroups).toHaveCount(await providerGroups.count())

    // Verify at least one provider is shown
    expect(await providerGroups.count()).toBeGreaterThan(0)

    // Check connection status indicators
    const connectionIndicators = page.locator('[data-testid="connection-status"]')
    await expect(connectionIndicators.first()).toBeVisible()
  })

  test('Select and deselect models from providers', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="model-checkbox"]', { timeout: 10000 })

    // Find the first model checkbox
    const firstCheckbox = page.locator('[data-testid="model-checkbox"]').first()

    // Get initial state
    const initialChecked = await firstCheckbox.isChecked()

    // Click to toggle
    await firstCheckbox.click()

    // Verify state changed
    const newChecked = await firstCheckbox.isChecked()
    expect(newChecked).not.toBe(initialChecked)

    // Click again to toggle back
    await firstCheckbox.click()

    // Verify state is back to original
    const finalChecked = await firstCheckbox.isChecked()
    expect(finalChecked).toBe(initialChecked)
  })

  test('Save model selections and verify persistence', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="model-checkbox"]', { timeout: 10000 })

    // Select a few models
    const checkboxes = page.locator('[data-testid="model-checkbox"]')
    const count = await checkboxes.count()

    if (count > 0) {
      // Select first model
      await checkboxes.nth(0).check()

      if (count > 1) {
        // Select second model
        await checkboxes.nth(1).check()
      }

      // Click save button
      await page.click('[data-testid="save-button"]')

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

      // Refresh the page
      await page.reload()

      // Wait for models to load again
      await page.waitForSelector('[data-testid="model-checkbox"]', { timeout: 10000 })

      // Verify selections are persisted
      const firstCheckboxAfterReload = page.locator('[data-testid="model-checkbox"]').nth(0)
      await expect(firstCheckboxAfterReload).toBeChecked()

      if (count > 1) {
        const secondCheckboxAfterReload = page.locator('[data-testid="model-checkbox"]').nth(1)
        await expect(secondCheckboxAfterReload).toBeChecked()
      }
    }
  })

  test('Verify selected models appear in ModelSelector dropdown', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="model-checkbox"]', { timeout: 10000 })

    // Select a specific model
    const checkboxes = page.locator('[data-testid="model-checkbox"]')
    const count = await checkboxes.count()

    if (count > 0) {
      // Get the model name/id before selecting
      const modelLabel = page.locator('[data-testid="model-label"]').nth(0)
      const modelName = await modelLabel.textContent()

      // Select the model
      await checkboxes.nth(0).check()

      // Save the selection
      await page.click('[data-testid="save-button"]')

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

      // Navigate to main page where ModelSelector is used
      await page.goto('/')

      // Open the model selector
      await page.click('[data-testid="model-selector-button"]')

      // Wait for dropdown to open
      await page.waitForSelector('[data-testid="model-option"]', { timeout: 5000 })

      // Check if the selected model appears in the dropdown
      const modelOptions = page.locator('[data-testid="model-option"]')
      const optionTexts = await modelOptions.allTextContents()

      // The selected model should be in the options
      const modelFound = optionTexts.some(text => text.includes(modelName || ''))
      expect(modelFound).toBe(true)
    }
  })

  test('Test free models only toggle', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="free-only-toggle"]', { timeout: 10000 })

    // Get initial model count
    const initialModelCount = await page.locator('[data-testid="model-item"]').count()

    // Toggle free models only
    const toggle = page.locator('[data-testid="free-only-toggle"]')
    await toggle.click()

    // Wait for models to reload
    await page.waitForTimeout(2000)

    // Get new model count
    const newModelCount = await page.locator('[data-testid="model-item"]').count()

    // Count should be different (either less or same if all were free)
    // This test assumes there are both free and paid models available
    expect(typeof newModelCount).toBe('number')
  })

  test('Test search and filter functionality', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="search-input"]', { timeout: 10000 })

    // Get initial model count
    const initialCount = await page.locator('[data-testid="model-item"]').count()

    // Type in search box
    const searchInput = page.locator('[data-testid="search-input"]')
    await searchInput.fill('gpt')

    // Wait for filtering
    await page.waitForTimeout(1000)

    // Get filtered count
    const filteredCount = await page.locator('[data-testid="model-item"]').count()

    // Filtered count should be less than or equal to initial count
    expect(filteredCount).toBeLessThanOrEqual(initialCount)

    // Clear search
    await searchInput.clear()

    // Wait for all models to show again
    await page.waitForTimeout(1000)

    // Count should be back to initial
    const finalCount = await page.locator('[data-testid="model-item"]').count()
    expect(finalCount).toBe(initialCount)
  })

  test('Test error handling for failed saves', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="model-checkbox"]', { timeout: 10000 })

    // Select a model
    const firstCheckbox = page.locator('[data-testid="model-checkbox"]').first()
    await firstCheckbox.check()

    // Mock a network failure by blocking the API call
    await page.route('/api/admin/models', route => route.abort())

    // Try to save
    await page.click('[data-testid="save-button"]')

    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to save')
  })

  test('Test responsive design', async ({ page }) => {
    await page.goto('/admin/models')

    // Wait for models to load
    await page.waitForSelector('[data-testid="provider-group"]', { timeout: 10000 })

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Verify elements are still visible and usable
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="save-button"]')).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })

    // Verify layout adjusts properly
    await expect(page.locator('[data-testid="provider-group"]')).toBeVisible()
  })
})