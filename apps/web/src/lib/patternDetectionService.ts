import { supabase } from './supabase'
import type {
  ConversationPattern,
  PatternType,
  PatternDetectionResult,
  AutomationSuggestion,
  AutomationAction
} from '../types/automation'

export class PatternDetectionService {
  private static readonly MIN_PATTERN_LENGTH = 10
  private static readonly MIN_CONFIDENCE_THRESHOLD = 0.3
  private static readonly SIMILARITY_THRESHOLD = 0.7

  /**
   * Analyze conversation messages to detect repetitive patterns
   */
  static async detectPatterns(
    conversationId: string,
    userId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }>
  ): Promise<PatternDetectionResult> {
    const patterns: ConversationPattern[] = []
    const suggestions: AutomationSuggestion[] = []

    try {
      // Extract user messages for analysis
      const userMessages = messages.filter(msg => msg.role === 'user')

      if (userMessages.length < 3) {
        return { patterns: [], suggestions: [], confidence_threshold: this.MIN_CONFIDENCE_THRESHOLD }
      }

      // Detect repetitive questions
      const repetitiveQuestions = await this.detectRepetitiveQuestions(userMessages, userId)
      patterns.push(...repetitiveQuestions)

      // Detect common response patterns
      const commonResponses = await this.detectCommonResponses(messages, userId)
      patterns.push(...commonResponses)

      // Detect workflow sequences
      const workflowSequences = await this.detectWorkflowSequences(messages, userId)
      patterns.push(...workflowSequences)

      // Generate suggestions based on detected patterns
      suggestions.push(...await this.generateSuggestionsFromPatterns(patterns, userId))

      // Filter patterns by confidence threshold
      const filteredPatterns = patterns.filter(p => p.confidence_score >= this.MIN_CONFIDENCE_THRESHOLD)

      return {
        patterns: filteredPatterns,
        suggestions,
        confidence_threshold: this.MIN_CONFIDENCE_THRESHOLD
      }
    } catch (error) {
      console.error('Error detecting patterns:', error)
      return { patterns: [], suggestions: [], confidence_threshold: this.MIN_CONFIDENCE_THRESHOLD }
    }
  }

  /**
   * Detect repetitive questions in user messages
   */
  private static async detectRepetitiveQuestions(
    userMessages: Array<{ content: string; created_at: string }>,
    userId: string
  ): Promise<ConversationPattern[]> {
    const patterns: ConversationPattern[] = []
    const questionGroups: { [key: string]: Array<{ content: string; created_at: string }> } = {}

    // Group similar questions
    for (const message of userMessages) {
      const content = message.content.trim()
      if (content.length < this.MIN_PATTERN_LENGTH) continue

      // Check if it's a question
      if (!this.isQuestion(content)) continue

      // Find similar existing questions
      let foundGroup = false
      for (const [key, group] of Object.entries(questionGroups)) {
        if (this.calculateSimilarity(content, group[0].content) >= this.SIMILARITY_THRESHOLD) {
          group.push(message)
          foundGroup = true
          break
        }
      }

      if (!foundGroup) {
        questionGroups[content] = [message]
      }
    }

    // Create patterns for groups with multiple occurrences
    for (const [key, group] of Object.entries(questionGroups)) {
      if (group.length >= 2) {
        const confidence = Math.min(group.length / 5, 1) // Scale confidence with frequency
        const pattern: ConversationPattern = {
          id: '',
          user_id: userId,
          pattern_type: 'repetitive_question',
          pattern_data: {
            text: key,
            frequency: group.length,
            examples: group.slice(0, 3).map(m => m.content)
          },
          confidence_score: confidence,
          detection_count: group.length,
          last_detected_at: group[group.length - 1].created_at,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        patterns.push(pattern)
      }
    }

    return patterns
  }

  /**
   * Detect common response patterns
   */
  private static async detectCommonResponses(
    messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }>,
    userId: string
  ): Promise<ConversationPattern[]> {
    const patterns: ConversationPattern[] = []
    const responseGroups: { [key: string]: Array<{ content: string; created_at: string }> } = {}

    // Group similar assistant responses
    const assistantMessages = messages.filter(msg => msg.role === 'assistant')
    for (const message of assistantMessages) {
      const content = message.content.trim()
      if (content.length < this.MIN_PATTERN_LENGTH) continue

      let foundGroup = false
      for (const [key, group] of Object.entries(responseGroups)) {
        if (this.calculateSimilarity(content, group[0].content) >= this.SIMILARITY_THRESHOLD) {
          group.push(message)
          foundGroup = true
          break
        }
      }

      if (!foundGroup) {
        responseGroups[content] = [message]
      }
    }

    // Create patterns for groups with multiple occurrences
    for (const [key, group] of Object.entries(responseGroups)) {
      if (group.length >= 2) {
        const confidence = Math.min(group.length / 4, 1)
        const pattern: ConversationPattern = {
          id: '',
          user_id: userId,
          pattern_type: 'common_response',
          pattern_data: {
            text: key,
            frequency: group.length,
            examples: group.slice(0, 3).map(m => m.content)
          },
          confidence_score: confidence,
          detection_count: group.length,
          last_detected_at: group[group.length - 1].created_at,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        patterns.push(pattern)
      }
    }

    return patterns
  }

  /**
   * Detect workflow sequences (patterns of user-assistant interactions)
   */
  private static async detectWorkflowSequences(
    messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }>,
    userId: string
  ): Promise<ConversationPattern[]> {
    const patterns: ConversationPattern[] = []
    const sequences: { [key: string]: Array<{ user: string; assistant: string; timestamp: string }> } = {}

    // Look for user-assistant pairs
    for (let i = 0; i < messages.length - 1; i++) {
      const userMsg = messages[i]
      const assistantMsg = messages[i + 1]

      if (userMsg.role === 'user' && assistantMsg.role === 'assistant') {
        const sequenceKey = `${userMsg.content}|${assistantMsg.content}`

        if (!sequences[sequenceKey]) {
          sequences[sequenceKey] = []
        }

        sequences[sequenceKey].push({
          user: userMsg.content,
          assistant: assistantMsg.content,
          timestamp: userMsg.created_at
        })
      }
    }

    // Create patterns for sequences with multiple occurrences
    for (const [key, sequence] of Object.entries(sequences)) {
      if (sequence.length >= 2) {
        const confidence = Math.min(sequence.length / 3, 1)
        const pattern: ConversationPattern = {
          id: '',
          user_id: userId,
          pattern_type: 'workflow_sequence',
          pattern_data: {
            text: key,
            frequency: sequence.length,
            examples: sequence.slice(0, 2).map(s => `User: ${s.user}\nAssistant: ${s.assistant}`)
          },
          confidence_score: confidence,
          detection_count: sequence.length,
          last_detected_at: sequence[sequence.length - 1].timestamp,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        patterns.push(pattern)
      }
    }

    return patterns
  }

  /**
   * Generate automation suggestions from detected patterns
   */
  private static async generateSuggestionsFromPatterns(
    patterns: ConversationPattern[],
    userId: string
  ): Promise<AutomationSuggestion[]> {
    const suggestions: AutomationSuggestion[] = []

    for (const pattern of patterns) {
      if (pattern.confidence_score < this.MIN_CONFIDENCE_THRESHOLD) continue

      switch (pattern.pattern_type) {
        case 'repetitive_question':
          suggestions.push({
            id: `suggestion-${pattern.id || Date.now()}`,
            type: 'pattern',
            title: 'Repetitive Question Detected',
            description: `You frequently ask: "${pattern.pattern_data.text?.substring(0, 50)}..."`,
            confidence: pattern.confidence_score,
            actions: [{
              type: 'suggest_response',
              data: {
                suggestion: `Create a workflow for this common question`
              },
              confirmation_required: true
            }],
            source: 'detected_pattern',
            requires_confirmation: true
          })
          break

        case 'common_response':
          suggestions.push({
            id: `suggestion-${pattern.id || Date.now()}`,
            type: 'pattern',
            title: 'Common Response Pattern',
            description: `Assistant frequently responds with similar content`,
            confidence: pattern.confidence_score,
            actions: [{
              type: 'apply_template',
              data: {
                text: pattern.pattern_data.text
              },
              confirmation_required: false
            }],
            source: 'detected_pattern',
            requires_confirmation: false
          })
          break

        case 'workflow_sequence':
          suggestions.push({
            id: `suggestion-${pattern.id || Date.now()}`,
            type: 'workflow',
            title: 'Workflow Sequence Detected',
            description: `Create an automated workflow for this interaction pattern`,
            confidence: pattern.confidence_score,
            actions: [{
              type: 'execute_workflow',
              data: {
                workflow_id: `auto-${Date.now()}`
              },
              confirmation_required: true
            }],
            source: 'detected_pattern',
            requires_confirmation: true
          })
          break
      }
    }

    return suggestions
  }

  /**
   * Save detected patterns to database
   */
  static async savePatterns(patterns: ConversationPattern[]): Promise<void> {
    if (patterns.length === 0) return

    try {
      const patternsToInsert = patterns.map(pattern => ({
        user_id: pattern.user_id,
        pattern_type: pattern.pattern_type,
        pattern_data: pattern.pattern_data,
        confidence_score: pattern.confidence_score,
        detection_count: pattern.detection_count,
        last_detected_at: pattern.last_detected_at,
        is_active: pattern.is_active
      }))

      const { error } = await supabase
        .from('conversation_patterns')
        .upsert(patternsToInsert, {
          onConflict: 'user_id,pattern_type,pattern_data'
        })

      if (error) {
        console.error('Error saving patterns:', error)
      }
    } catch (error) {
      console.error('Error saving patterns:', error)
    }
  }

  /**
   * Get existing patterns for a user
   */
  static async getUserPatterns(userId: string): Promise<ConversationPattern[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_patterns')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })

      if (error) {
        console.error('Error fetching patterns:', error)
        return []
      }

      // Type cast and validate the data
      return (data || []).map(item => ({
        ...item,
        pattern_data: item.pattern_data as ConversationPattern['pattern_data']
      }))
    } catch (error) {
      console.error('Error fetching patterns:', error)
      return []
    }
  }

  /**
   * Calculate text similarity using simple string comparison
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    if (text1 === text2) return 1

    const words1 = text1.toLowerCase().split(/\s+/)
    const words2 = text2.toLowerCase().split(/\s+/)

    const commonWords = words1.filter(word => words2.includes(word))
    const maxWords = Math.max(words1.length, words2.length)

    return maxWords > 0 ? commonWords.length / maxWords : 0
  }

  /**
   * Check if text is a question
   */
  private static isQuestion(text: string): boolean {
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'would', 'should', 'do', 'does', 'did', 'is', 'are', 'was', 'were']
    const firstWord = text.toLowerCase().split(/\s+/)[0]
    return questionWords.includes(firstWord) || text.includes('?')
  }
}