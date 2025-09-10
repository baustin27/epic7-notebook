import { supabase } from './supabase'
import { PatternDetectionService } from './patternDetectionService'
import { WorkflowSuggestionEngine } from './workflowSuggestionEngine'
import type {
  AutomationWorkflow,
  ConversationPattern,
  WorkflowExecution,
  AutomationSuggestion,
  WorkflowSuggestionOptions,
  AutomationSettings
} from '../types/automation'

export class AutomationService {
  private static settings: AutomationSettings = {
    enabled: true,
    pattern_detection_enabled: true,
    workflow_suggestions_enabled: true,
    context_aware_suggestions_enabled: true,
    confirmation_required: true,
    max_suggestions_per_message: 3,
    confidence_threshold: 0.3,
    auto_apply_high_confidence: false,
    high_confidence_threshold: 0.8
  }

  /**
   * Initialize automation service with user settings
   */
  static async initialize(userId: string): Promise<void> {
    try {
      // Load user automation settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', userId)
        .single()

      if (settings?.preferences && typeof settings.preferences === 'object' && 'automation' in settings.preferences) {
        const automationPrefs = (settings.preferences as any).automation
        if (automationPrefs) {
          this.settings = { ...this.settings, ...automationPrefs }
        }
      }
    } catch (error) {
      console.warn('Failed to load automation settings:', error)
    }
  }

  /**
   * Analyze conversation and generate automation suggestions
   */
  static async analyzeConversation(
    conversationId: string,
    userId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }>
  ): Promise<{
    patterns: ConversationPattern[]
    suggestions: AutomationSuggestion[]
    workflows: AutomationWorkflow[]
  }> {
    if (!this.settings.enabled) {
      return { patterns: [], suggestions: [], workflows: [] }
    }

    try {
      // Detect patterns
      const patternResult = this.settings.pattern_detection_enabled
        ? await PatternDetectionService.detectPatterns(conversationId, userId, messages)
        : { patterns: [], suggestions: [], confidence_threshold: 0.3 }

      // Generate AI-powered suggestions
      let aiSuggestions: AutomationSuggestion[] = []
      if (this.settings.workflow_suggestions_enabled) {
        const suggestionOptions: WorkflowSuggestionOptions = {
          conversation_id: conversationId,
          message_content: messages[messages.length - 1]?.content || '',
          conversation_history: messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.created_at
          }))
        }

        aiSuggestions = await WorkflowSuggestionEngine.generateSuggestions(suggestionOptions)
      }

      // Get existing workflows
      const workflows = await this.getUserWorkflows(userId)

      // Combine and filter suggestions
      const allSuggestions = [
        ...patternResult.suggestions,
        ...aiSuggestions
      ].filter(suggestion => suggestion.confidence >= this.settings.confidence_threshold)
        .slice(0, this.settings.max_suggestions_per_message)

      return {
        patterns: patternResult.patterns,
        suggestions: allSuggestions,
        workflows
      }
    } catch (error) {
      console.error('Error analyzing conversation:', error)
      return { patterns: [], suggestions: [], workflows: [] }
    }
  }

  /**
   * Create a new automation workflow
   */
  static async createWorkflow(
    userId: string,
    workflowData: Omit<AutomationWorkflow, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'usage_count'>
  ): Promise<AutomationWorkflow | null> {
    try {
      const dbData = {
        user_id: userId,
        title: workflowData.title,
        description: workflowData.description || null,
        trigger_type: workflowData.trigger_type,
        trigger_conditions: workflowData.trigger_conditions as any,
        actions: workflowData.actions as any,
        is_active: workflowData.is_active,
        priority: workflowData.priority
      }

      const { data, error } = await supabase
        .from('automation_workflows')
        .insert(dbData)
        .select()
        .single()

      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST205') {
          console.warn('automation_workflows table not found - automation features disabled')
          return null
        }
        throw error
      }

      return {
        ...data,
        description: data.description || undefined,
        last_used_at: data.last_used_at || undefined,
        trigger_conditions: data.trigger_conditions as any,
        actions: data.actions as any
      }
    } catch (error) {
      console.error('Error creating workflow:', error)
      return null
    }
  }

  /**
   * Get user's automation workflows
   */
  static async getUserWorkflows(userId: string): Promise<AutomationWorkflow[]> {
    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        // Check if table doesn't exist
        if (error.code === 'PGRST205') {
          console.warn('automation_workflows table not found - automation features disabled')
          return []
        }
        throw error
      }

      return data.map(workflow => ({
        ...workflow,
        description: workflow.description || undefined,
        last_used_at: workflow.last_used_at || undefined,
        trigger_conditions: workflow.trigger_conditions as any,
        actions: workflow.actions as any
      }))
    } catch (error) {
      console.error('Error fetching workflows:', error)
      return []
    }
  }

  /**
   * Update workflow usage statistics
   */
  static async updateWorkflowUsage(workflowId: string): Promise<void> {
    try {
      // First get current usage count
      const { data: current } = await supabase
        .from('automation_workflows')
        .select('usage_count')
        .eq('id', workflowId)
        .single()

      if (current) {
        const { error } = await supabase
          .from('automation_workflows')
          .update({
            usage_count: (current.usage_count || 0) + 1,
            last_used_at: new Date().toISOString()
          })
          .eq('id', workflowId)

        if (error) {
          console.error('Error updating workflow usage:', error)
        }
      }
    } catch (error) {
      console.error('Error updating workflow usage:', error)
    }
  }

  /**
   * Execute a workflow
   */
  static async executeWorkflow(
    workflowId: string,
    userId: string,
    conversationId: string,
    triggerData: Record<string, any> = {}
  ): Promise<{
    success: boolean
    actions_executed: any[]
    error?: string
    execution_time_ms?: number
  }> {
    const startTime = Date.now()

    try {
      // Get workflow
      const workflow = await this.getWorkflowById(workflowId, userId)
      if (!workflow) {
        throw new Error('Workflow not found')
      }

      // Execute actions
      const actions_executed = []
      for (const action of workflow.actions) {
        try {
          // Here you would implement the actual action execution logic
          // For now, just log the action
          console.log('Executing action:', action.type, action.data)

          actions_executed.push({
            ...action,
            executed_at: new Date().toISOString(),
            success: true
          })
        } catch (actionError) {
          console.error('Error executing action:', actionError)
          actions_executed.push({
            ...action,
            executed_at: new Date().toISOString(),
            success: false,
            error: actionError instanceof Error ? actionError.message : 'Unknown error'
          })
        }
      }

      // Update usage statistics
      await this.updateWorkflowUsage(workflowId)

      // Log execution
      await this.logWorkflowExecution({
        user_id: userId,
        workflow_id: workflowId,
        conversation_id: conversationId,
        trigger_type: 'manual',
        trigger_data: triggerData,
        actions_executed,
        success: true,
        execution_time_ms: Date.now() - startTime
      })

      return {
        success: true,
        actions_executed,
        execution_time_ms: Date.now() - startTime
      }
    } catch (error) {
      const execution_time_ms = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Log failed execution
      await this.logWorkflowExecution({
        user_id: userId,
        workflow_id: workflowId,
        conversation_id: conversationId,
        trigger_type: 'manual',
        trigger_data: triggerData,
        actions_executed: [],
        success: false,
        error_message: errorMessage,
        execution_time_ms: execution_time_ms
      })

      return {
        success: false,
        actions_executed: [],
        error: errorMessage,
        execution_time_ms
      }
    }
  }

  /**
   * Get workflow by ID
   */
  private static async getWorkflowById(
    workflowId: string,
    userId: string
  ): Promise<AutomationWorkflow | null> {
    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single()

      if (error) throw error

      return {
        ...data,
        description: data.description || undefined,
        last_used_at: data.last_used_at || undefined,
        trigger_conditions: data.trigger_conditions as any,
        actions: data.actions as any
      }
    } catch (error) {
      console.error('Error fetching workflow:', error)
      return null
    }
  }

  /**
   * Log workflow execution
   */
  private static async logWorkflowExecution(
    execution: Omit<WorkflowExecution, 'id' | 'created_at'>
  ): Promise<void> {
    try {
      const dbData = {
        user_id: execution.user_id,
        workflow_id: execution.workflow_id || null,
        conversation_id: execution.conversation_id,
        trigger_type: execution.trigger_type,
        trigger_data: execution.trigger_data as any,
        actions_executed: execution.actions_executed as any,
        success: execution.success,
        error_message: execution.error_message || null,
        execution_time_ms: execution.execution_time_ms || null
      }

      const { error } = await supabase
        .from('workflow_executions')
        .insert(dbData)

      if (error) {
        console.error('Error logging workflow execution:', error)
      }
    } catch (error) {
      console.error('Error logging workflow execution:', error)
    }
  }

  /**
   * Update automation settings
   */
  static async updateSettings(userId: string, settings: Partial<AutomationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          preferences: {
            automation: this.settings
          } as any
        })

      if (error) {
        console.error('Error updating automation settings:', error)
      }
    } catch (error) {
      console.error('Error updating automation settings:', error)
    }
  }

  /**
   * Get automation settings
   */
  static getSettings(): AutomationSettings {
    return { ...this.settings }
  }

  /**
   * Check if automation should trigger for a message
   */
  static shouldTriggerAutomation(
    message: string,
    workflow: AutomationWorkflow
  ): boolean {
    if (!workflow.is_active) return false

    // Check trigger conditions
    for (const condition of workflow.trigger_conditions) {
      switch (condition.type) {
        case 'contains':
          if (condition.case_sensitive) {
            if (!message.includes(condition.value)) return false
          } else {
            if (!message.toLowerCase().includes(condition.value.toLowerCase())) return false
          }
          break

        case 'matches':
          try {
            const regex = new RegExp(condition.value, condition.case_sensitive ? 'g' : 'gi')
            if (!regex.test(message)) return false
          } catch (error) {
            console.warn('Invalid regex in trigger condition:', condition.value)
            return false
          }
          break

        case 'similar_to':
          // Simple similarity check (could be enhanced with better algorithms)
          const similarity = this.calculateSimilarity(message, condition.value)
          if (similarity < (condition.threshold || 0.7)) return false
          break
      }
    }

    return true
  }

  /**
   * Calculate string similarity (simple implementation)
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1

    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)

    const commonWords = words1.filter(word => words2.includes(word))
    const maxWords = Math.max(words1.length, words2.length)

    return maxWords > 0 ? commonWords.length / maxWords : 0
  }
}