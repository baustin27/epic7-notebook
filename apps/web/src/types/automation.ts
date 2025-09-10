export type TriggerType = 'pattern' | 'keyword' | 'context' | 'manual'

export type PatternType = 'repetitive_question' | 'common_response' | 'workflow_sequence' | 'context_pattern'

export type ActionType = 'suggest_response' | 'apply_template' | 'insert_text' | 'show_suggestion' | 'execute_workflow'

export interface TriggerCondition {
  type: 'contains' | 'matches' | 'similar_to' | 'context_contains'
  value: string
  case_sensitive?: boolean
  threshold?: number // For similarity matching
}

export interface AutomationAction {
  type: ActionType
  data: {
    text?: string
    template_id?: string
    suggestion?: string
    workflow_id?: string
    priority?: number
  }
  confirmation_required?: boolean
  delay_ms?: number
}

export interface AutomationWorkflow {
  id: string
  user_id: string
  title: string
  description?: string
  trigger_type: TriggerType
  trigger_conditions: TriggerCondition[]
  actions: AutomationAction[]
  is_active: boolean
  priority: number
  usage_count: number
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface ConversationPattern {
  id: string
  user_id: string
  pattern_type: PatternType
  pattern_data: {
    text?: string
    keywords?: string[]
    context?: string
    frequency?: number
    examples?: string[]
  }
  confidence_score: number
  detection_count: number
  last_detected_at: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: string
  user_id: string
  workflow_id?: string
  conversation_id: string
  trigger_type: string
  trigger_data: Record<string, any>
  actions_executed: AutomationAction[]
  success: boolean
  error_message?: string
  execution_time_ms?: number
  created_at: string
}

export interface AutomationSuggestion {
  id: string
  type: 'workflow' | 'pattern' | 'template'
  title: string
  description: string
  confidence: number
  actions: AutomationAction[]
  source: 'detected_pattern' | 'user_workflow' | 'ai_generated'
  requires_confirmation: boolean
}

export interface PatternDetectionResult {
  patterns: ConversationPattern[]
  suggestions: AutomationSuggestion[]
  confidence_threshold: number
}

export interface WorkflowSuggestionOptions {
  conversation_id: string
  message_content: string
  conversation_history: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  user_context?: {
    recent_topics?: string[]
    common_questions?: string[]
    preferred_responses?: string[]
  }
}

export interface AutomationSettings {
  enabled: boolean
  pattern_detection_enabled: boolean
  workflow_suggestions_enabled: boolean
  context_aware_suggestions_enabled: boolean
  confirmation_required: boolean
  max_suggestions_per_message: number
  confidence_threshold: number
  auto_apply_high_confidence: boolean
  high_confidence_threshold: number
}