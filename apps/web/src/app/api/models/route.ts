import { NextRequest, NextResponse } from 'next/server'
import { providerFactory } from '../../../lib/providers/factory'

export async function GET(request: NextRequest) {
  try {
    // Use provider factory to get models from all configured providers
    const models = await providerFactory.getAvailableModels()

    // If no models found from configured providers, add fallback models
    if (models.length === 0) {
      console.warn('No models available from configured providers, using fallback models')
      models.push({
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'Default'
      })
    }

    console.log('DEBUG: Final models from /api/models:', models.map(m => ({id: m.id, provider: m.provider, pricing: m.pricing, context_length: m.context_length})))
    return NextResponse.json({
      models,
      totalCount: models.length,
      providersCount: new Set(models.map(m => m.provider)).size
    })

  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch models',
        models: [{
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          provider: 'Default'
        }],
        totalCount: 1,
        providersCount: 1
      },
      { status: 200 } // Return 200 with fallback instead of error
    )
  }
}