import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  
  if (!conversationId) {
    return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 })
  }

  // First verify the user owns this conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()
    
  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { conversation_id, role, content } = await request.json()
  
  if (!conversation_id || !role || !content) {
    return NextResponse.json({ 
      error: 'conversation_id, role, and content are required' 
    }, { status: 400 })
  }

  // Verify the user owns this conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversation_id)
    .eq('user_id', user.id)
    .single()
    
  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found or unauthorized' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      role,
      content
    })
    .select()
    .single()
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data)
}