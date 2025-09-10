import { test, expect } from '@playwright/test'

test.describe('Enhanced Model Selector UI', () => {
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

  test('should display models grouped by provider with icons and status', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Verify dropdown is open
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // Check for provider groups
    const providerGroups = page.locator('[role="region"]')
    await expect(providerGroups.first()).toBeVisible()

    // Verify group headers have icons, names, status dots, and counts
    const firstGroup = providerGroups.first()
    await expect(firstGroup.locator('[id*="group-"][id*="header"]')).toBeVisible()

    // Check for connection status indicators
    const statusDots = firstGroup.locator('.w-2.h-2.rounded-full')
    await expect(statusDots.first()).toBeVisible()

    // Check for model counts
    const modelCount = firstGroup.locator('text=/[0-9]+ models?/')
    await expect(modelCount).toBeVisible()
  })

  test('should expand and collapse provider groups', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Find a group with more than 5 models (should have collapse functionality)
    const providerGroups = page.locator('[role="region"]')
    const groupsWithManyModels = page.locator('[role="region"]').filter({ hasText: /[6-9]|[1-9][0-9]+ models?/ })

    if (await groupsWithManyModels.count() > 0) {
      const expandableGroup = groupsWithManyModels.first()
      const groupHeader = expandableGroup.locator('[id*="header"]')

      // Get initial state
      const initialAriaExpanded = await groupHeader.getAttribute('aria-expanded')
      const initialModelsVisible = await expandableGroup.locator('[data-testid="model-option"]').count()

      // Click to toggle
      await groupHeader.click()

      // Verify state changed
      const newAriaExpanded = await groupHeader.getAttribute('aria-expanded')
      expect(newAriaExpanded).not.toBe(initialAriaExpanded)

      if (initialAriaExpanded === 'true') {
        // Should be collapsed now
        const collapsedModels = await expandableGroup.locator('[data-testid="model-option"]').count()
        expect(collapsedModels).toBe(0)
      } else {
        // Should be expanded now
        const expandedModels = await expandableGroup.locator('[data-testid="model-option"]').count()
        expect(expandedModels).toBeGreaterThan(0)
      }
    }
  })

  test('should select model from provider group and update chat context', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Get initial selected model
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    const initialSelectedModel = await modelSelectorButton.textContent()

    // Open model selector
    await modelSelectorButton.click()

    // Find first available model option
    const firstModelOption = page.locator('[data-testid="model-option"]').first()
    await expect(firstModelOption).toBeVisible()

    // Get model details before selection
    const modelName = await firstModelOption.locator('.font-medium').textContent()
    const modelId = await firstModelOption.getAttribute('id')

    // Select the model
    await firstModelOption.click()

    // Verify dropdown is closed
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).not.toBeVisible()

    // Verify selected model changed in button
    const newSelectedModel = await modelSelectorButton.textContent()
    expect(newSelectedModel).not.toBe(initialSelectedModel)
    if (modelName) {
      expect(newSelectedModel?.toLowerCase()).toContain(modelName.toLowerCase())
    }

    // Verify selection is maintained (reopen dropdown)
    await modelSelectorButton.click()
    const selectedOption = page.locator(`[id="${modelId}"][aria-selected="true"]`)
    await expect(selectedOption).toBeVisible()
  })

  test('should navigate between groups and models with keyboard', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Focus first group header
    const firstGroupHeader = page.locator('[id*="header"]').first()
    await firstGroupHeader.focus()

    // Verify focus is on group header
    await expect(firstGroupHeader).toBeFocused()

    // Press Arrow Down to move to first model (if group is expanded)
    await page.keyboard.press('ArrowDown')
    const focusedElement = page.locator(':focus')

    // Should either be on a model option or still on group header
    const isOnModel = await focusedElement.getAttribute('data-testid') === 'model-option'
    const focusedId = await focusedElement.getAttribute('id')
    const isOnGroup = focusedId?.includes('header')

    expect(isOnModel || isOnGroup).toBe(true)
  })

  test('should display enhanced model details in tooltips', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Find first model with tooltip trigger
    const modelWithTooltip = page.locator('[data-testid="model-option"]').first()
    await expect(modelWithTooltip).toBeVisible()

    // Hover over model to trigger tooltip
    await modelWithTooltip.hover()

    // Wait for tooltip to appear (if implemented)
    await page.waitForTimeout(500)

    // Check if tooltip content is visible (this may vary based on implementation)
    const tooltipContent = page.locator('[role="tooltip"]').or(page.locator('.tooltip'))
    // Note: Tooltip visibility may depend on implementation details
    if (await tooltipContent.isVisible()) {
      await expect(tooltipContent).toContainText(/description|pricing|context|capabilities/i)
    }
  })

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Verify dropdown is visible and properly sized for mobile
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toBeVisible()

    // Check that provider groups are displayed appropriately
    const providerGroups = page.locator('[role="region"]')
    await expect(providerGroups.first()).toBeVisible()

    // Verify no horizontal overflow issues
    const dropdownBox = await dropdown.boundingBox()
    expect(dropdownBox?.width).toBeLessThanOrEqual(375)
  })

  test('should maintain accessibility standards', async ({ page }) => {
    await page.waitForTimeout(3000)

    // Open model selector
    const modelSelectorButton = page.locator('[data-testid="model-selector-button"]')
    await modelSelectorButton.click()

    // Verify ARIA attributes
    const dropdown = page.locator('[role="listbox"]')
    await expect(dropdown).toHaveAttribute('aria-labelledby', 'model-selector-button')

    // Check provider groups have proper roles
    const providerGroups = page.locator('[role="region"]')
    if (await providerGroups.count() > 0) {
      const firstGroup = providerGroups.first()
      await expect(firstGroup).toHaveAttribute('aria-labelledby')

      // Check group headers have proper attributes
      const groupHeader = firstGroup.locator('[id*="header"]')
      await expect(groupHeader).toHaveAttribute('aria-label')
    }

    // Verify keyboard navigation works
    await page.keyboard.press('Tab')
    const focusedElement = page.locator(':focus')
    const isFocusableElement = await focusedElement.isVisible()
    expect(isFocusableElement).toBe(true)
  })
})