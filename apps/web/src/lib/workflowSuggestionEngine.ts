import { openRouterAPI, OpenRouterMessage } from './openrouter'
import type {
  WorkflowSuggestionOptions,
  AutomationSuggestion,
  AutomationAction,
  AutomationWorkflow
} from '../types/automation'

export class WorkflowSuggestionEngine {
  private static readonly SUGGESTION_MODEL = 'gpt-3.5-turbo'
  private static readonly MAX_SUGGESTIONS = 3

  /**
   * Generate workflow suggestions based on conversation context
   */
  static async generateSuggestions(
    options: WorkflowSuggestionOptions
  ): Promise<AutomationSuggestion[]> {
    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes conversations to suggest automation workflows and templates.

Your task is to identify patterns in the conversation and suggest appropriate automation actions.

Return a JSON array of suggestions with this structure:
[
  {
    "id": "unique_id",
    "type": "workflow|pattern|template",
    "title": "Brief title for the suggestion",
    "description": "Detailed description of what this automation does",
    "confidence": 0.0-1.0,
    "actions": [
      {
        "type": "suggest_response|apply_template|insert_text|show_suggestion|execute_workflow",
        "data": {
          "text": "suggested text content",
          "template_id": "template identifier",
          "suggestion": "suggestion text",
          "workflow_id": "workflow identifier"
        },
        "confirmation_required": true|false,
        "delay_ms": 0
      }
    ],
    "source": "detected_pattern|user_workflow|ai_generated",
    "requires_confirmation": true|false
  }
]

Focus on:
1. Repetitive tasks or questions
2. Common response patterns
3. Multi-step workflows
4. Context-aware suggestions
5. Template opportunities

Keep suggestions practical and actionable.`
        },
        {
          role: 'user',
          content: this.buildAnalysisPrompt(options)
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        messages,
        this.SUGGESTION_MODEL,
        undefined,
        undefined,
        {
          temperature: 0.3,
          maxTokens: 1500,
          systemPrompt: '',
          topP: 1.0,
          presencePenalty: 0.0,
          frequencyPenalty: 0.0
        }
      )

      const content = response.choices[0]?.message?.content
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content)
          if (Array.isArray(parsed)) {
            return this.validateAndFilterSuggestions(parsed)
          }
        } catch (parseError) {
          console.warn('Failed to parse workflow suggestions:', parseError)
        }
      }

      return []
    } catch (error) {
      console.error('Error generating workflow suggestions:', error)
      return []
    }
  }

  /**
   * Build the analysis prompt for the AI
   */
  private static buildAnalysisPrompt(options: WorkflowSuggestionOptions): string {
    const { message_content, conversation_history, user_context } = options

    let prompt = `Analyze this conversation and suggest automation workflows:\n\n`

    // Current message
    prompt += `CURRENT MESSAGE: "${message_content}"\n\n`

    // Recent conversation history
    if (conversation_history.length > 0) {
      prompt += `RECENT CONVERSATION HISTORY:\n`
      conversation_history.slice(-10).forEach((msg, index) => {
        prompt += `${msg.role.toUpperCase()}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}\n`
      })
      prompt += `\n`
    }

    // User context
    if (user_context) {
      if (user_context.recent_topics?.length) {
        prompt += `RECENT TOPICS: ${user_context.recent_topics.join(', ')}\n`
      }
      if (user_context.common_questions?.length) {
        prompt += `COMMON QUESTIONS: ${user_context.common_questions.join(', ')}\n`
      }
      if (user_context.preferred_responses?.length) {
        prompt += `PREFERRED RESPONSES: ${user_context.preferred_responses.slice(0, 3).join(', ')}\n`
      }
    }

    prompt += `\nSuggest ${this.MAX_SUGGESTIONS} most relevant automation workflows or templates that could help streamline this type of interaction. Focus on practical, immediately useful suggestions.`

    return prompt
  }

  /**
   * Validate and filter suggestions
   */
  private static validateAndFilterSuggestions(
    suggestions: any[]
  ): AutomationSuggestion[] {
    return suggestions
      .filter(suggestion => this.isValidSuggestion(suggestion))
      .slice(0, this.MAX_SUGGESTIONS)
      .map(suggestion => ({
        ...suggestion,
        id: suggestion.id || `ai-${Date.now()}-${Math.random()}`,
        source: 'ai_generated' as const
      }))
  }

  /**
   * Validate a suggestion object
   */
  private static isValidSuggestion(suggestion: any): boolean {
    return (
      suggestion &&
      typeof suggestion === 'object' &&
      typeof suggestion.title === 'string' &&
      typeof suggestion.description === 'string' &&
      typeof suggestion.confidence === 'number' &&
      suggestion.confidence >= 0 &&
      suggestion.confidence <= 1 &&
      Array.isArray(suggestion.actions) &&
      suggestion.actions.length > 0 &&
      ['workflow', 'pattern', 'template'].includes(suggestion.type) &&
      typeof suggestion.requires_confirmation === 'boolean'
    )
  }

  /**
   * Generate context-aware prompt suggestions
   */
  static async generateContextAwareSuggestions(
    conversationId: string,
    currentMessage: string,
    conversationContext: string[]
  ): Promise<AutomationSuggestion[]> {
    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are an AI assistant that provides context-aware prompt suggestions.

Based on the conversation context, suggest relevant prompts or responses that would be helpful.

Return a JSON array of suggestions focused on:
1. Follow-up questions
2. Related topics
3. Clarification requests
4. Alternative approaches
5. Best practices

Use the conversation context to make suggestions that are relevant to the current topic.`
        },
        {
          role: 'user',
          content: `Current message: "${currentMessage}"

Conversation context:
${conversationContext.slice(-5).join('\n')}

Suggest 2-3 contextually relevant prompts or responses.`
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        messages,
        this.SUGGESTION_MODEL,
        undefined,
        undefined,
        {
          temperature: 0.4,
          maxTokens: 800,
          systemPrompt: '',
          topP: 1.0,
          presencePenalty: 0.0,
          frequencyPenalty: 0.0
        }
      )

      const content = response.choices[0]?.message?.content
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content)
          if (Array.isArray(parsed)) {
            return parsed.map(suggestion => ({
              id: `context-${Date.now()}-${Math.random()}`,
              type: 'pattern' as const,
              title: suggestion.title || 'Context Suggestion',
              description: suggestion.description || suggestion.text || '',
              confidence: suggestion.confidence || 0.7,
              actions: [{
                type: 'insert_text' as const,
                data: { text: suggestion.text || suggestion.prompt || '' },
                confirmation_required: false
              }],
              source: 'ai_generated' as const,
              requires_confirmation: false
            }))
          }
        } catch (parseError) {
          console.warn('Failed to parse context suggestions:', parseError)
        }
      }

      return []
    } catch (error) {
      console.error('Error generating context suggestions:', error)
      return []
    }
  }

  /**
   * Create a workflow from a suggestion
   */
  static async createWorkflowFromSuggestion(
    suggestion: AutomationSuggestion,
    userId: string
  ): Promise<AutomationWorkflow | null> {
    try {
      const workflow: Omit<AutomationWorkflow, 'id' | 'created_at' | 'updated_at'> = {
        user_id: userId,
        title: suggestion.title,
        description: suggestion.description,
        trigger_type: 'manual', // Default to manual, can be updated later
        trigger_conditions: [],
        actions: suggestion.actions,
        is_active: true,
        priority: 0,
        usage_count: 0
      }

      // This would typically save to database
      // For now, return the workflow object
      return {
        ...workflow,
        id: `workflow-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error creating workflow from suggestion:', error)
      return null
    }
  }

  /**
   * Analyze conversation for workflow opportunities
   */
  static async analyzeConversationForWorkflows(
    conversationId: string,
    conversationMessages: Array<{ role: string; content: string; timestamp: string }>
  ): Promise<{
    opportunities: Array<{
      type: string
      description: string
      confidence: number
      suggested_workflow: Partial<AutomationWorkflow>
    }>
  }> {
    try {
      const conversationText = conversationMessages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n')
        .substring(0, 2000) // Limit context

      const aiMessages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `Analyze this conversation and identify opportunities for automation workflows.

Look for:
1. Repetitive tasks
2. Multi-step processes
3. Common question patterns
4. Response templates
5. Decision trees

Return a JSON object with an "opportunities" array.`
        },
        {
          role: 'user',
          content: `Analyze this conversation for workflow opportunities:\n\n${conversationText}`
        }
      ]

      const response = await openRouterAPI.chatCompletion(
        aiMessages,
        this.SUGGESTION_MODEL,
        undefined,
        undefined,
        {
          temperature: 0.2,
          maxTokens: 1000,
          systemPrompt: '',
          topP: 1.0,
          presencePenalty: 0.0,
          frequencyPenalty: 0.0
        }
      )

      const content = response.choices[0]?.message?.content
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content)
          return parsed
        } catch (parseError) {
          console.warn('Failed to parse workflow analysis:', parseError)
        }
      }

      return { opportunities: [] }
    } catch (error) {
      console.error('Error analyzing conversation for workflows:', error)
      return { opportunities: [] }
    }
  }
}