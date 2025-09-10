import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { message, model = 'gpt-3.5-turbo' } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get OpenAI API key from environment variables
    const openAiApiKey = process.env.OPENAI_API_KEY
    
    if (!openAiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      return NextResponse.json({ 
        error: `OpenAI API error: ${response.status} ${response.statusText}`,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 })
    }

    return NextResponse.json({
      response: data.choices[0].message.content,
      model: data.model,
      usage: data.usage
    })

  } catch (error) {
    console.error('OpenAI Chat API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}