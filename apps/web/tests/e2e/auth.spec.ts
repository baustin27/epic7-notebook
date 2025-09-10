import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear local storage and cookies before each test
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/AI Chat/)
  })

  test('should show login form when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Check for login form elements
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const loginButton = page.locator('button:has-text("Sign In")')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(loginButton).toBeVisible()
  })

  test('should show signup form', async ({ page }) => {
    await page.goto('/')

    // Look for signup link or tab
    const signupLink = page.locator('a:has-text("Sign Up")').or(
      page.locator('button:has-text("Sign Up")')
    ).or(
      page.locator('[data-testid="signup-tab"]')
    )

    if (await signupLink.isVisible()) {
      await signupLink.click()

      // Check for signup form elements
      const emailInput = page.locator('input[type="email"]')
      const passwordInput = page.locator('input[type="password"]')
      const confirmPasswordInput = page.locator('input[placeholder*="confirm"]').or(
        page.locator('input[name*="confirm"]')
      )
      const signupButton = page.locator('button:has-text("Sign Up")').or(
        page.locator('button[type="submit"]')
      )

      await expect(emailInput).toBeVisible()
      await expect(passwordInput).toBeVisible()
      await expect(signupButton).toBeVisible()
    }
  })

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/')

    const loginButton = page.locator('button:has-text("Sign In")').or(
      page.locator('button[type="submit"]')
    )

    await loginButton.click()

    // Check for validation messages
    const emailError = page.locator('text=/required/i').or(
      page.locator('text=/email/i').or(
        page.locator('[data-testid*="error"]')
      )
    )

    await expect(emailError).toBeVisible()
  })

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/')

    const emailInput = page.locator('input[type="email"]')
    const loginButton = page.locator('button:has-text("Sign In")').or(
      page.locator('button[type="submit"]')
    )

    await emailInput.fill('invalid-email')
    await loginButton.click()

    // Check for email validation error
    const emailError = page.locator('text=/valid email/i').or(
      page.locator('text=/email format/i')
    )

    await expect(emailError).toBeVisible()
  })

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/')

    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const loginButton = page.locator('button:has-text("Sign In")').or(
      page.locator('button[type="submit"]')
    )

    await emailInput.fill('test@example.com')
    await passwordInput.fill('wrongpassword')
    await loginButton.click()

    // Check for error message
    const errorMessage = page.locator('text=/invalid/i').or(
      page.locator('text=/incorrect/i').or(
        page.locator('[data-testid*="error"]')
      )
    )

    await expect(errorMessage).toBeVisible()
  })

  test('should redirect to chat interface after successful login', async ({ page }) => {
    // This test would require valid test credentials
    // For now, we'll mock the successful login scenario

    await page.goto('/')

    // Mock successful authentication by setting localStorage
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

    // Reload the page to trigger auth state change
    await page.reload()

    // Check if redirected to chat or if chat interface is shown
    const chatInterface = page.locator('[data-testid="chat-area"]').or(
      page.locator('text=/New Chat/i')
    )

    await expect(chatInterface).toBeVisible()
  })

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/')

    // Look for forgot password link
    const forgotPasswordLink = page.locator('a:has-text("Forgot Password")').or(
      page.locator('button:has-text("Forgot")').or(
        page.locator('text=/forgot/i')
      )
    )

    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click()

      // Check for reset password form
      const resetEmailInput = page.locator('input[type="email"]')
      const resetButton = page.locator('button:has-text("Reset")').or(
        page.locator('button:has-text("Send")')
      )

      await expect(resetEmailInput).toBeVisible()
      await expect(resetButton).toBeVisible()

      // Test reset password submission
      await resetEmailInput.fill('test@example.com')
      await resetButton.click()

      // Check for success message
      const successMessage = page.locator('text=/check your email/i').or(
        page.locator('text=/sent/i')
      )

      await expect(successMessage).toBeVisible()
    }
  })

  test('should handle logout functionality', async ({ page }) => {
    // First, mock being logged in
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user-id', email: 'test@example.com' }
      }))
    })

    await page.goto('/')

    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout")').or(
      page.locator('button:has-text("Sign Out")').or(
        page.locator('[data-testid="logout-btn"]')
      )
    )

    if (await logoutButton.isVisible()) {
      await logoutButton.click()

      // Check if redirected to login or login form is shown
      const loginForm = page.locator('input[type="email"]').or(
        page.locator('text=/sign in/i')
      )

      await expect(loginForm).toBeVisible()
    }
  })

  test('should persist authentication state across page reloads', async ({ page }) => {
    // Set authentication state
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: { id: 'test-user-id', email: 'test@example.com' }
      }))
    })

    await page.goto('/')
    await expect(page.locator('[data-testid="chat-area"]')).toBeVisible()

    // Reload page
    await page.reload()

    // Should still be authenticated
    await expect(page.locator('[data-testid="chat-area"]')).toBeVisible()
  })

  test('should handle session expiration', async ({ page }) => {
    // Set expired token
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'expired-token',
        expires_at: Date.now() - 1000, // Expired 1 second ago
        user: { id: 'test-user-id', email: 'test@example.com' }
      }))
    })

    await page.goto('/')

    // Should redirect to login or show login form
    const loginForm = page.locator('input[type="email"]').or(
      page.locator('text=/sign in/i')
    )

    await expect(loginForm).toBeVisible()
  })
})