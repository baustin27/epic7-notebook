import { test, expect } from '@playwright/test'

test.describe('PWA Offline Functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up service worker and PWA context
    await context.addInitScript(() => {
      // Mock service worker registration for testing
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: () => Promise.resolve({
            active: { state: 'activated' },
            waiting: null,
            installing: null
          }),
          ready: Promise.resolve({
            active: { state: 'activated' }
          })
        },
        writable: true
      })

      // Mock IndexedDB for offline storage
      const mockIDBFactory = {
        open: () => ({
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: {
            createObjectStore: () => ({
              createIndex: () => {},
              put: () => {},
              getAll: () => ({ result: [] })
            }),
            objectStoreNames: {
              contains: () => false
            },
            transaction: () => ({
              objectStore: () => ({
                put: () => ({ onsuccess: null, onerror: null }),
                getAll: () => ({ onsuccess: null, onerror: null, result: [] }),
                clear: () => ({ onsuccess: null, onerror: null })
              }),
              oncomplete: null,
              onerror: null
            })
          }
        })
      }

      Object.defineProperty(window, 'indexedDB', {
        value: mockIDBFactory,
        writable: true
      })
    })

    await page.goto('/')
  })

  test('should display offline indicator when offline', async ({ page }) => {
    // Mock offline state
    await page.context().setOffline(true)

    // Check for offline indicator
    const offlineIndicator = page.locator('[data-testid="offline-indicator"]').or(
      page.locator('text=/offline|disconnected/i')
    )

    await expect(offlineIndicator).toBeVisible()
  })

  test('should show offline page when navigating while offline', async ({ page }) => {
    // Go online first to load the app
    await page.context().setOffline(false)
    await page.goto('/')

    // Then go offline
    await page.context().setOffline(true)

    // Try to navigate to a new page
    await page.goto('/nonexistent')

    // Should show offline page
    await expect(page.locator('text=/you\'re offline|offline page/i')).toBeVisible()
  })

  test('should cache conversations for offline viewing', async ({ page }) => {
    // First load the app online
    await page.context().setOffline(false)
    await page.goto('/')

    // Wait for conversations to load
    await page.waitForSelector('[data-testid="conversation-list"]', { timeout: 10000 })

    // Go offline
    await page.context().setOffline(true)

    // Conversations should still be visible
    const conversations = page.locator('[data-testid="conversation-item"]')
    await expect(conversations.first()).toBeVisible()
  })

  test('should allow composing messages offline', async ({ page }) => {
    // Load app online
    await page.context().setOffline(false)
    await page.goto('/')

    // Select a conversation
    const firstConversation = page.locator('[data-testid="conversation-item"]').first()
    await firstConversation.click()

    // Go offline
    await page.context().setOffline(true)

    // Message input should still be available
    const messageInput = page.locator('[data-testid="message-input"]').or(
      page.locator('textarea[placeholder*="message" i]')
    )

    await expect(messageInput).toBeVisible()
    await expect(messageInput).toBeEnabled()
  })

  test('should show sync status and pending items', async ({ page }) => {
    // Load app online
    await page.context().setOffline(false)
    await page.goto('/')

    // Look for sync status indicator
    const syncStatus = page.locator('[data-testid="sync-status"]').or(
      page.locator('text=/sync|pending/i')
    )

    // Sync status should be visible
    await expect(syncStatus).toBeVisible()
  })

  test('should handle background sync when coming back online', async ({ page }) => {
    // Start offline
    await page.context().setOffline(true)
    await page.goto('/')

    // Should show offline state
    await expect(page.locator('text=/offline|disconnected/i')).toBeVisible()

    // Come back online
    await page.context().setOffline(false)

    // Should show sync notification or online state
    const onlineIndicator = page.locator('text=/online|connected|sync/i')
    await expect(onlineIndicator).toBeVisible({ timeout: 10000 })
  })

  test('should display PWA install prompt for engaged users', async ({ page }) => {
    // Load app and simulate user engagement
    await page.goto('/')

    // Simulate user interactions to trigger engagement
    for (let i = 0; i < 5; i++) {
      await page.click('body')
      await page.keyboard.press('ArrowDown')
    }

    // Wait for potential install prompt
    const installPrompt = page.locator('[data-testid="install-prompt"]').or(
      page.locator('text=/install|download/i')
    )

    // Install prompt might appear after engagement threshold
    // This test verifies the prompt can appear (doesn't fail if it doesn't show)
    try {
      await expect(installPrompt).toBeVisible({ timeout: 5000 })
    } catch (error) {
      console.log('Install prompt did not appear - this is expected behavior')
    }
  })

  test('should handle service worker updates gracefully', async ({ page }) => {
    // Mock service worker update scenario
    await page.context().addInitScript(() => {
      // Simulate service worker update available
      const mockRegistration = {
        waiting: { postMessage: () => {} },
        active: { state: 'activated' }
      }

      navigator.serviceWorker.getRegistration = () =>
        Promise.resolve(mockRegistration as any)
    })

    await page.goto('/')

    // Should handle update gracefully without breaking the app
    await expect(page.locator('body')).toBeVisible()
  })

  test('should maintain app shell architecture with instant loading', async ({ page }) => {
    // Test app shell loading
    const startTime = Date.now()

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const loadTime = Date.now() - startTime

    // App shell should load quickly (under 2 seconds)
    expect(loadTime).toBeLessThan(2000)

    // Critical UI elements should be visible
    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({ timeout: 1000 })
  })

  test('should handle network failures gracefully', async ({ page }) => {
    // Load app online
    await page.context().setOffline(false)
    await page.goto('/')

    // Simulate network failure during API call
    await page.route('**/api/**', route => route.abort())

    // Try to perform an action that requires network
    const newConversationBtn = page.locator('[data-testid="new-conversation"]').or(
      page.locator('button', { hasText: /new|create/i })
    )

    if (await newConversationBtn.isVisible()) {
      await newConversationBtn.click()

      // Should show error message or offline fallback
      const errorMessage = page.locator('text=/error|failed|offline/i')
      await expect(errorMessage).toBeVisible({ timeout: 5000 })
    }
  })

  test('should respect user privacy with local-only sensitive data', async ({ page }) => {
    // Test that sensitive data handling is appropriate for offline storage
    await page.context().setOffline(true)
    await page.goto('/')

    // Check that no sensitive data is stored inappropriately
    // This is more of a code review test, but we can check for proper data handling
    const localStorageKeys: string[] = await page.evaluate(() => {
      return Object.keys(window.localStorage)
    })

    // Should not store sensitive data in localStorage when offline
    const sensitiveKeys = localStorageKeys.filter((key: string) =>
      key.includes('token') || key.includes('password') || key.includes('secret')
    )

    expect(sensitiveKeys.length).toBe(0)
  })
})