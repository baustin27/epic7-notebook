'use server'

import { conversationService } from '../lib/database'

export async function createNewConversation(userId: string) {
  if (!userId) {
    throw new Error('User not authenticated')
  }

  try {
    // The service internally gets the user, so we just need to provide a title.
    // The service has been updated to not require the user_id as a parameter.
    const newConversation = await conversationService.create('New Chat')
    return newConversation
  } catch (error) {
    console.error('Error creating new conversation:', error)
    // Return a more specific error message or object
    return { error: 'Failed to create conversation' }
  }
}
