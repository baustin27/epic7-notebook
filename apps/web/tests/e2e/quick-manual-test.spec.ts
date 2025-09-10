import { test, expect } from '@playwright/test'

test('Manual Message Test - Send Message and Check Response', async ({ page }) => {
  console.log('🧪 Quick Manual Test: Send Message')
  
  // Login
  await page.goto('/')
  await page.locator('input[type="email"]').fill('baustin2786@gmail.com')
  await page.locator('input[type="password"]').fill('2A59cq!CC')
  await page.locator('button:has-text("Sign In"), button[type="submit"]').first().click()
  await page.waitForTimeout(3000)
  
  // Take screenshot after login
  await page.screenshot({ path: 'test-results/manual-after-login.png', fullPage: true })
  
  // Try to create a new conversation
  const newConvBtn = page.locator('text="New Conversation"')
  if (await newConvBtn.isVisible()) {
    await newConvBtn.click()
    await page.waitForTimeout(2000)
    console.log('✅ Clicked New Conversation')
  }
  
  // Try to find and type in the message input
  const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first()
  if (await messageInput.isVisible()) {
    await messageInput.fill('Test message for manual verification')
    console.log('✅ Message typed')
    
    await page.screenshot({ path: 'test-results/manual-message-typed.png', fullPage: true })
    
    // Try to send via Enter key
    try {
      await messageInput.press('Enter')
      console.log('✅ Pressed Enter')
      await page.waitForTimeout(2000)
      
      // Check if message was sent (look for the text in the chat)
      const messageSent = await page.locator('text="Test message for manual verification"').isVisible()
      if (messageSent) {
        console.log('✅ Message appears in chat')
        
        // Wait a bit to see if AI responds
        await page.waitForTimeout(5000)
        await page.screenshot({ path: 'test-results/manual-after-message.png', fullPage: true })
        
        // Check page content to see if there's any response
        const pageContent = await page.textContent('body')
        console.log('📄 Page content length:', pageContent?.length || 0)
        
        if (pageContent && pageContent.length > 1000) {
          console.log('✅ Page has content (potential AI response)')
        }
      } else {
        console.log('❌ Message not found in chat')
      }
      
    } catch (e) {
      console.log('⚠️ Enter key failed, trying to find send button')
      
      // Look for any button that might be a send button
      const buttons = page.locator('button')
      const buttonCount = await buttons.count()
      console.log(`🔍 Found ${buttonCount} buttons on page`)
      
      // Try different button selectors
      const sendBtnCandidates = [
        page.locator('button[type="submit"]'),
        page.locator('button:has-text("Send")'),
        page.locator('button[aria-label*="send"]'),
        page.locator('button[title*="send"]')
      ]
      
      for (let i = 0; i < sendBtnCandidates.length; i++) {
        const btn = sendBtnCandidates[i]
        if (await btn.isVisible()) {
          console.log(`✅ Found send button candidate ${i + 1}`)
          await btn.click()
          await page.waitForTimeout(2000)
          break
        }
      }
    }
  } else {
    console.log('❌ Message input not found or not visible')
  }
  
  // Final screenshot
  await page.screenshot({ path: 'test-results/manual-final.png', fullPage: true })
  
  console.log('🏁 Manual test completed')
})