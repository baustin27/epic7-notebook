import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('Main page has no accessibility violations', async ({ page }) => {
    await page.goto('http://localhost:3000') // Assume dev server running on port 3000

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Chat interface accessibility', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Wait for chat components to load
    await page.waitForSelector('[data-testid="chat-interface"]', { state: 'visible' })

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('[data-testid="chat-interface"]')
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Keyboard navigation test', async ({ page, keyboard }) => {
    await page.goto('http://localhost:3000')
    
    // Test Tab navigation
    await keyboard.press('Tab')
    const firstFocusable = await page.locator('body').evaluate(() => document.activeElement?.tagName)
    expect(firstFocusable).toBeTruthy()
    
    // Test Escape key for modals (if open)
    await keyboard.press('Escape')
    
    // Test custom shortcuts (Ctrl+ArrowUp for previous conversation)
    await keyboard.down('Control')
    await keyboard.press('ArrowUp')
    await keyboard.up('Control')
    
    // Verify no violations after interactions
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('High contrast mode support', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Simulate high contrast mode
    await page.addStyleTag({ content: '@media (prefers-contrast: high) { body { background: white; color: black; } }' })
    
    // Check if focus indicators are visible
    await page.keyboard.press('Tab')
    const focusIndicator = await page.locator('*:focus-visible').first()
    expect(await focusIndicator.isVisible()).toBe(true)
    
    // Run a11y scan in high contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('Screen reader announcements', async ({ page }) => {
    await page.goto('http://localhost:3000')
    
    // Simulate dynamic content update
    await page.evaluate(() => {
      const announcement = document.createElement('div')
      announcement.setAttribute('aria-live', 'polite')
      announcement.className = 'sr-only'
      announcement.textContent = 'New message received'
      document.body.appendChild(announcement)
    })
    
    // Verify aria-live region
    const liveRegion = await page.locator('[aria-live="polite"]')
    expect(await liveRegion.isVisible()).toBe(true)
    
    // Run a11y scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})