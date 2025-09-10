import { supabase } from './supabase'
import { openRouterAPI, OpenRouterMessage } from './openrouter'

export interface ConversationSummary {
  id: string
  conversation_id: string
  summary_text: string
  summary_length: 'short' | 'medium' | 'long'
  confidence_score: number
  created_at: string
}

export interface ConversationSentiment {
  id: string
  conversation_id: string
  overall_sentiment: 'positive' | 'neutral' | 'negative'
  sentiment_score: number
  emotion_distribution: Record<string, number>
  confidence_score: number
  created_at: string
}

export interface ConversationTopic {
  id: string
  conversation_id: string
  topic_name: string
  topic_category?: string
  confidence_score: number
  relevance_score: number
  created_at: string
}

export interface AnalysisResult {
  summary?: ConversationSummary
  sentiment?: ConversationSentiment
  topics?: ConversationTopic[]
}

class ConversationAnalysisService {
  private readonly MIN_MESSAGES_FOR_ANALYSIS = 10
  private readonly CACHE_DURATION_HOURS = 24

  /**
   * Check if a conversation has enough messages for analysis
   */
  async shouldAnalyzeConversation(conversationId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)

      if (error) throw error
      return (count || 0) >= this.MIN_MESSAGES_FOR_ANALYSIS
    } catch (error) {
      console.error('Error checking conversation message count:', error)
      return false
    }
  }

  /**
   * Get conversation messages for analysis
   */
  private async getConversationMessages(conversationId: string): Promise<OpenRouterMessage[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))
    } catch (error) {
      console.error('Error fetching conversation messages:', error)
      throw error
    }
  }

  /**
   * Generate conversation summary
   */
  async generateSummary(conversationId: string, userId: string): Promise<ConversationSummary | null> {
    try {
      // Check if we should analyze this conversation
      if (!(await this.shouldAnalyzeConversation(conversationId))) {
        return null
      }

      // Check for existing recent summary
      const existingSummary = await this.getExistingSummary(conversationId)
      if (existingSummary) {
        return existingSummary
      }

      const messages = await this.getConversationMessages(conversationId)

      const summaryPrompt: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are an expert at summarizing conversations. Create a concise but comprehensive summary of the conversation that captures:
          - Main topics discussed
          - Key insights or conclusions
          - Important decisions made
          - Action items or next steps

          Keep the summary between 50-150 words. Focus on the most important aspects.`
        },
        {
          role: 'user',
          content: `Please summarize this conversation:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`
        }
      ]

      const response = await openRouterAPI.chatCompletion(summaryPrompt, 'gpt-3.5-turbo', undefined, undefined, {
        temperature: 0.3,
        maxTokens: 300,
        systemPrompt: '',
        topP: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0
      })

      const content = response.choices[0]?.message?.content
      const summaryText = typeof content === 'string' ? content.trim() : ''

      if (!summaryText) {
        throw new Error('Failed to generate summary')
      }

      // Store the summary
      const { data, error } = await (supabase as any)
        .from('conversation_summaries')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          summary_text: summaryText,
          summary_length: 'medium',
          confidence_score: 0.85
        })
        .select()
        .single()

      if (error) throw error

      // Update analysis status
      await this.updateAnalysisStatus(conversationId, userId, 'summary', 'completed', {
        summary_id: data.id,
        tokens_used: response.usage.total_tokens
      })

      return data as ConversationSummary
    } catch (error) {
      console.error('Error generating conversation summary:', error)
      await this.updateAnalysisStatus(conversationId, userId, 'summary', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Generate sentiment analysis
   */
  async generateSentiment(conversationId: string, userId: string): Promise<ConversationSentiment | null> {
    try {
      if (!(await this.shouldAnalyzeConversation(conversationId))) {
        return null
      }

      // Check for existing recent sentiment analysis
      const existingSentiment = await this.getExistingSentiment(conversationId)
      if (existingSentiment) {
        return existingSentiment
      }

      const messages = await this.getConversationMessages(conversationId)

      const sentimentPrompt: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `Analyze the sentiment of this conversation. Return a JSON object with:
          {
            "overall_sentiment": "positive" | "neutral" | "negative",
            "sentiment_score": number between -1 and 1,
            "emotion_distribution": {"joy": number, "anger": number, "sadness": number, "fear": number, "surprise": number, "neutral": number},
            "confidence_score": number between 0 and 1
          }

          Base the analysis on the entire conversation flow and context.`
        },
        {
          role: 'user',
          content: `Analyze the sentiment of this conversation:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`
        }
      ]

      const response = await openRouterAPI.chatCompletion(sentimentPrompt, 'gpt-3.5-turbo', undefined, undefined, {
        temperature: 0.2,
        maxTokens: 500,
        systemPrompt: '',
        topP: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0
      })

      const content = response.choices[0]?.message?.content
      const sentimentContent = typeof content === 'string' ? content.trim() : ''
      const sentimentData = JSON.parse(sentimentContent)

      // Store the sentiment analysis
      const { data, error } = await (supabase as any)
        .from('conversation_sentiment')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          overall_sentiment: sentimentData.overall_sentiment,
          sentiment_score: sentimentData.sentiment_score,
          emotion_distribution: sentimentData.emotion_distribution,
          confidence_score: sentimentData.confidence_score
        })
        .select()
        .single()

      if (error) throw error

      await this.updateAnalysisStatus(conversationId, userId, 'sentiment', 'completed', {
        sentiment_id: data.id,
        tokens_used: response.usage.total_tokens
      })

      return data as ConversationSentiment
    } catch (error) {
      console.error('Error generating sentiment analysis:', error)
      await this.updateAnalysisStatus(conversationId, userId, 'sentiment', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Generate topic extraction
   */
  async generateTopics(conversationId: string, userId: string): Promise<ConversationTopic[]> {
    try {
      if (!(await this.shouldAnalyzeConversation(conversationId))) {
        return []
      }

      // Check for existing recent topics
      const existingTopics = await this.getExistingTopics(conversationId)
      if (existingTopics.length > 0) {
        return existingTopics
      }

      const messages = await this.getConversationMessages(conversationId)

      const topicsPrompt: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `Extract the main topics from this conversation. Return a JSON array of topics with:
          [
            {
              "topic_name": "string",
              "topic_category": "string (optional)",
              "confidence_score": number between 0 and 1,
              "relevance_score": number between 0 and 1
            }
          ]

          Extract 3-7 main topics. Be specific but not too granular. Include confidence and relevance scores.`
        },
        {
          role: 'user',
          content: `Extract topics from this conversation:\n\n${messages.map(m => `${m.role}: ${m.content}`).join('\n\n')}`
        }
      ]

      const response = await openRouterAPI.chatCompletion(topicsPrompt, 'gpt-3.5-turbo', undefined, undefined, {
        temperature: 0.2,
        maxTokens: 800,
        systemPrompt: '',
        topP: 1.0,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0
      })

      const content = response.choices[0]?.message?.content
      const topicsContent = typeof content === 'string' ? content.trim() : ''
      const topicsData = JSON.parse(topicsContent)

      // Store the topics
      const topicsToInsert = topicsData.map((topic: any) => ({
        conversation_id: conversationId,
        user_id: userId,
        topic_name: topic.topic_name,
        topic_category: topic.topic_category,
        confidence_score: topic.confidence_score,
        relevance_score: topic.relevance_score
      }))

      const { data, error } = await (supabase as any)
        .from('conversation_topics')
        .insert(topicsToInsert)
        .select()

      if (error) throw error

      await this.updateAnalysisStatus(conversationId, userId, 'topics', 'completed', {
        topics_count: data.length,
        tokens_used: response.usage.total_tokens
      })

      return data as ConversationTopic[]
    } catch (error) {
      console.error('Error generating topic extraction:', error)
      await this.updateAnalysisStatus(conversationId, userId, 'topics', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Run comprehensive analysis (summary + sentiment + topics)
   */
  async analyzeConversation(conversationId: string, userId: string): Promise<AnalysisResult> {
    try {
      await this.updateAnalysisStatus(conversationId, userId, 'comprehensive', 'processing')

      const [summary, sentiment, topics] = await Promise.allSettled([
        this.generateSummary(conversationId, userId),
        this.generateSentiment(conversationId, userId),
        this.generateTopics(conversationId, userId)
      ])

      const result: AnalysisResult = {}

      if (summary.status === 'fulfilled' && summary.value) {
        result.summary = summary.value
      }

      if (sentiment.status === 'fulfilled' && sentiment.value) {
        result.sentiment = sentiment.value
      }

      if (topics.status === 'fulfilled') {
        result.topics = topics.value
      }

      await this.updateAnalysisStatus(conversationId, userId, 'comprehensive', 'completed', {
        summary_generated: !!result.summary,
        sentiment_generated: !!result.sentiment,
        topics_generated: result.topics?.length || 0
      })

      return result
    } catch (error) {
      console.error('Error in comprehensive analysis:', error)
      await this.updateAnalysisStatus(conversationId, userId, 'comprehensive', 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get existing analysis results (with caching)
   */
  private async getExistingSummary(conversationId: string): Promise<ConversationSummary | null> {
    try {
      const cacheCutoff = new Date()
      cacheCutoff.setHours(cacheCutoff.getHours() - this.CACHE_DURATION_HOURS)

      const { data, error } = await (supabase as any)
        .from('conversation_summaries')
        .select('*')
        .eq('conversation_id', conversationId)
        .gte('created_at', cacheCutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data as ConversationSummary | null
    } catch (error) {
      console.error('Error fetching existing summary:', error)
      return null
    }
  }

  private async getExistingSentiment(conversationId: string): Promise<ConversationSentiment | null> {
    try {
      const cacheCutoff = new Date()
      cacheCutoff.setHours(cacheCutoff.getHours() - this.CACHE_DURATION_HOURS)

      const { data, error } = await (supabase as any)
        .from('conversation_sentiment')
        .select('*')
        .eq('conversation_id', conversationId)
        .gte('created_at', cacheCutoff.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data as ConversationSentiment | null
    } catch (error) {
      console.error('Error fetching existing sentiment:', error)
      return null
    }
  }

  private async getExistingTopics(conversationId: string): Promise<ConversationTopic[]> {
    try {
      const cacheCutoff = new Date()
      cacheCutoff.setHours(cacheCutoff.getHours() - this.CACHE_DURATION_HOURS)

      const { data, error } = await (supabase as any)
        .from('conversation_topics')
        .select('*')
        .eq('conversation_id', conversationId)
        .gte('created_at', cacheCutoff.toISOString())
        .order('relevance_score', { ascending: false })

      if (error) throw error
      return (data || []) as ConversationTopic[]
    } catch (error) {
      console.error('Error fetching existing topics:', error)
      return []
    }
  }

  /**
   * Update analysis status
   */
  private async updateAnalysisStatus(
    conversationId: string,
    userId: string,
    analysisType: string,
    status: string,
    metadata?: any
  ): Promise<void> {
    try {
      await (supabase as any)
        .from('conversation_analysis')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          analysis_type: analysisType,
          status,
          metadata
        }, {
          onConflict: 'conversation_id,analysis_type'
        })
    } catch (error) {
      console.error('Error updating analysis status:', error)
    }
  }

  /**
   * Get analysis results for a conversation
   */
  async getConversationAnalysis(conversationId: string): Promise<AnalysisResult> {
    try {
      const [summary, sentiment, topics] = await Promise.all([
        this.getExistingSummary(conversationId),
        this.getExistingSentiment(conversationId),
        this.getExistingTopics(conversationId)
      ])

      return {
        summary: summary || undefined,
        sentiment: sentiment || undefined,
        topics: topics.length > 0 ? topics : undefined
      }
    } catch (error) {
      console.error('Error fetching conversation analysis:', error)
      return {}
    }
  }
}

export const conversationAnalysisService = new ConversationAnalysisService()