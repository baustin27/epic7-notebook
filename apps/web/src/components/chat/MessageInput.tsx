'use client'

import { useState, useRef, KeyboardEvent, useEffect, DragEvent, useCallback, useMemo } from 'react'
import { conversationService, messageService } from '../../lib/database'
import { aiService } from '../../lib/ai-service'
import { supabase } from '../../lib/supabase'
import { PromptLibrary } from './PromptLibrary'
import { PromptService } from '../../lib/promptService'
import { useDebounce } from '../../hooks/useDebounce'
import { useErrorHandling } from '../../hooks/useErrorHandling'
import { useToast } from '../../hooks/useToast'
import { analyticsService } from '../../lib/analyticsService'
import { useAuth } from '../../contexts/SimpleAuthContext'
import { useWritingAssistant, GrammarSuggestion, ContentSuggestion } from '../../hooks/useWritingAssistant'
import { WritingAssistantOverlay } from '../../components/ui/WritingAssistantOverlay'
import { AutomationService } from '../../lib/automationService'
import { AutomationSuggestions, WorkflowManager, AutomationSettings } from '../../components/automation'
import { AutomationSuggestion, AutomationWorkflow, AutomationSettings as AutomationSettingsType } from '../../types/automation'
import { useMessages } from '../../hooks/useRealtime'

// Predictive AI features
import { usePredictiveText } from '../../hooks/usePredictiveText'
import { useSmartResponseSuggestions } from '../../hooks/useSmartResponseSuggestions'
import { useConversationFlowPrediction } from '../../hooks/useConversationFlowPrediction'
import { useProactiveAssistance } from '../../hooks/useProactiveAssistance'
import { PredictiveSettings, PredictiveSettingsData } from '../../components/settings/PredictiveSettings'

interface MessageInputProps {
  conversationId: string | null
  onConversationCreated: (id: string) => void
}

export function MessageInput({ conversationId, onConversationCreated }: MessageInputProps) {
   const { user } = useAuth()
   const { handleError } = useErrorHandling()
   const { error: showErrorToast } = useToast()
   const [message, setMessage] = useState('')
   const [isLoading, setIsLoading] = useState(false)
   const [selectedFile, setSelectedFile] = useState<File | null>(null)
   const [filePreview, setFilePreview] = useState<string | null>(null)
   const [isDragOver, setIsDragOver] = useState(false)
   const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false)
   const [writingAssistantEnabled, setWritingAssistantEnabled] = useState(false)
   const [automationEnabled, setAutomationEnabled] = useState(true)
   const [automationSuggestions, setAutomationSuggestions] = useState<AutomationSuggestion[]>([])
   const [showAutomationSuggestions, setShowAutomationSuggestions] = useState(false)
   const [isWorkflowManagerOpen, setIsWorkflowManagerOpen] = useState(false)
   const [isAutomationSettingsOpen, setIsAutomationSettingsOpen] = useState(false)
   const [automationWorkflows, setAutomationWorkflows] = useState<AutomationWorkflow[]>([])
   const [automationSettings, setAutomationSettings] = useState<AutomationSettingsType>({
     enabled: true,
     pattern_detection_enabled: true,
     workflow_suggestions_enabled: true,
     context_aware_suggestions_enabled: true,
     confirmation_required: true,
     max_suggestions_per_message: 3,
     confidence_threshold: 0.3,
     auto_apply_high_confidence: false,
     high_confidence_threshold: 0.8
   })

   // Predictive AI features state
   const [predictiveSettings, setPredictiveSettings] = useState<PredictiveSettingsData>({
     predictiveTextEnabled: true,
     predictiveTextMaxSuggestions: 5,
     predictiveTextMinConfidence: 0.3,
     predictiveTextCompletionTypes: ['word', 'phrase', 'sentence'],
     smartResponsesEnabled: true,
     smartResponsesMaxSuggestions: 4,
     smartResponsesMinConfidence: 0.4,
     smartResponsesPreferredTone: 'auto',
     smartResponsesCategories: ['agreement', 'question', 'clarification', 'elaboration', 'alternative', 'conclusion'],
     flowPredictionEnabled: true,
     flowPredictionMaxPredictions: 3,
     flowPredictionMinConfidence: 0.5,
     flowPredictionTypes: ['action', 'question', 'clarification', 'follow_up', 'transition'],
     proactiveAssistanceEnabled: true,
     proactiveAssistanceMaxInterventions: 2,
     proactiveAssistanceMinConfidence: 0.6,
     proactiveAssistanceTypes: ['reminder', 'suggestion', 'warning', 'help', 'optimization'],
     proactiveAssistanceAutoTrigger: false,
     debounceMs: 300,
     useConversationHistory: true,
     respectCooldowns: true
   })
   const [isPredictiveSettingsOpen, setIsPredictiveSettingsOpen] = useState(false)
   const [showPredictiveText, setShowPredictiveText] = useState(false)
   const [showSmartResponses, setShowSmartResponses] = useState(false)
   const [showFlowPredictions, setShowFlowPredictions] = useState(false)
   const [showProactiveAssistance, setShowProactiveAssistance] = useState(false)
   const textareaRef = useRef<HTMLTextAreaElement>(null)
   const fileInputRef = useRef<HTMLInputElement>(null)

  // Debounce message for expensive operations
  const debouncedMessage = useDebounce(message, 300)

  // Writing assistant
  const writingAssistant = useWritingAssistant(message, conversationId, {
    enabled: writingAssistantEnabled,
    debounceMs: 300
  })

  // Get conversation history for predictive features
  const { messages: conversationMessages } = useMessages(conversationId)
  const conversationHistory = useMemo(() => {
    return conversationMessages?.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.created_at
    })) || []
  }, [conversationMessages])

  // Predictive text completion
  const predictiveText = {
    completions: []
  }

  // Smart response suggestions
  const smartResponses = {
    suggestions: []
  }

  // Conversation flow prediction
  const flowPredictions = {
    predictions: []
  }

  // Proactive assistance
  const proactiveAssistance = {
    interventions: []
  }

  // Memoize expensive calculations
  const messageLength = useMemo(() => message.length, [message])
  const isMessageValid = useMemo(() => message.trim().length > 0 || !!selectedFile, [message, selectedFile])
  const canSubmit = useMemo(() => isMessageValid && !isLoading, [isMessageValid, isLoading])

  // Auto-focus textarea on mount and when loading completes
  useEffect(() => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus()
    }
  }, [isLoading])

  // Load automation workflows
  const loadAutomationWorkflows = useCallback(async () => {
    if (!user?.id) return

    try {
      const workflows = await AutomationService.getUserWorkflows(user.id)
      setAutomationWorkflows(workflows)
    } catch (error) {
      console.error('Failed to load automation workflows:', error)
    }
  }, [user?.id])

  // Initialize automation service
  useEffect(() => {
    if (user?.id && automationEnabled) {
      AutomationService.initialize(user.id)
      loadAutomationWorkflows()
    }
  }, [user?.id, automationEnabled, loadAutomationWorkflows])

  // Generate automation suggestions when message changes
  useEffect(() => {
    // Temporarily disabled to fix loading issue
    setAutomationSuggestions([])
    setShowAutomationSuggestions(false)
  }, [debouncedMessage, conversationId, user?.id, automationEnabled])

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, GIF, and WebP images are allowed' }
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 10MB' }
    }

    return { valid: true }
  }

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file)
    if (!validation.valid) {
      showErrorToast(validation.error || 'Invalid file', {
        title: 'File Upload Error',
        duration: 5000
      })
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setFilePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [showErrorToast])

  // Handle file input change
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Handle drag and drop
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Remove selected file
  const removeFile = useCallback(() => {
    setSelectedFile(null)
    setFilePreview(null)
    // Clear the file input using ref
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleSelectPrompt = useCallback((promptContent: string) => {
    setMessage(promptContent)
    // Focus the textarea after inserting the prompt
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        // Position cursor at the end
        textareaRef.current.setSelectionRange(promptContent.length, promptContent.length)
      }
    }, 100)
  }, [])

  const handleSaveAsPrompt = useCallback(async () => {
    if (!message.trim()) {
      showErrorToast('Cannot save empty message as prompt', {
        title: 'Save Error',
        duration: 3000
      })
      return
    }

    try {
      const promptTitle = message.trim().substring(0, 50) + (message.length > 50 ? '...' : '')
      await PromptService.createPrompt({
        title: promptTitle,
        content: message.trim(),
        category: 'custom',
        description: 'Saved from message input',
        isCustom: true
      })

      // Track prompt creation
      if (user?.id) {
        analyticsService.trackEvent('prompt_saved', {
          prompt_title: promptTitle,
          prompt_length: message.trim().length,
          category: 'custom'
        }, user.id)
        analyticsService.trackFeatureUsage(user.id, 'prompt_library')
        analyticsService.updateUserEngagement(user.id)
      }

      showErrorToast('Prompt saved successfully!', {
        title: 'Success',
        duration: 3000
      })
    } catch (error) {
      console.error('Failed to save prompt:', error)
      showErrorToast('Failed to save prompt', {
        title: 'Save Error',
        duration: 5000
      })
    }
  }, [message, showErrorToast])

  // Writing assistant handlers
  const handleApplySuggestion = useCallback((suggestion: GrammarSuggestion | ContentSuggestion, type: 'grammar' | 'content') => {
    if (type === 'grammar') {
      const grammarSuggestion = suggestion as GrammarSuggestion
      const before = message.substring(0, grammarSuggestion.position.start)
      const after = message.substring(grammarSuggestion.position.end)
      const newMessage = before + grammarSuggestion.suggestion + after
      setMessage(newMessage)

      // Track suggestion application
      if (user?.id) {
        analyticsService.trackEvent('writing_assistant_applied', {
          suggestion_type: 'grammar',
          original_length: message.length,
          suggestion_length: grammarSuggestion.suggestion.length
        }, user.id)
        analyticsService.trackFeatureUsage(user.id, 'writing_assistant')
      }
    } else {
      const contentSuggestion = suggestion as ContentSuggestion
      const newMessage = message + ' ' + contentSuggestion.text
      setMessage(newMessage)

      // Track suggestion application
      if (user?.id) {
        analyticsService.trackEvent('writing_assistant_applied', {
          suggestion_type: 'content',
          original_length: message.length,
          suggestion_length: contentSuggestion.text.length
        }, user.id)
        analyticsService.trackFeatureUsage(user.id, 'writing_assistant')
      }
    }
  }, [message, setMessage, user?.id])

  const handleDismissSuggestion = useCallback((index: number, type: 'grammar' | 'tone' | 'content') => {
    // For now, just track the dismissal - in a more advanced implementation,
    // we could hide specific suggestions or learn from user preferences
    if (user?.id) {
      analyticsService.trackEvent('writing_assistant_dismissed', {
        suggestion_type: type,
        suggestion_index: index
      }, user.id)
    }
  }, [user?.id])

  // Automation handlers
  const handleApplyAutomationSuggestion = useCallback(async (suggestion: AutomationSuggestion, action: any) => {
    try {
      // Apply the automation action
      switch (action.type) {
        case 'insert_text':
          setMessage(prev => prev + (action.data?.text || ''))
          break
        case 'suggest_response':
          // Could show a response suggestion
          break
        case 'apply_template':
          // Could apply a template
          break
        default:
          console.log('Applying automation action:', action.type)
      }

      // Track automation usage
      if (user?.id) {
        analyticsService.trackEvent('automation_suggestion_applied', {
          suggestion_type: suggestion.type,
          action_type: action.type,
          confidence: suggestion.confidence
        }, user.id)
        analyticsService.trackFeatureUsage(user.id, 'automation')
      }
    } catch (error) {
      console.error('Failed to apply automation suggestion:', error)
    }
  }, [user?.id, setMessage])

  const handleDismissAutomationSuggestion = useCallback((suggestionId: string) => {
    setAutomationSuggestions(prev => prev.filter(s => s.id !== suggestionId))
    if (user?.id) {
      analyticsService.trackEvent('automation_suggestion_dismissed', {
        suggestion_id: suggestionId
      }, user.id)
    }
  }, [user?.id])

  const handleCreateWorkflowFromSuggestion = useCallback(async (suggestion: AutomationSuggestion) => {
    // This would open the workflow creation dialog with pre-filled data
    setIsWorkflowManagerOpen(true)
    // Could pre-fill the workflow form with suggestion data
  }, [])

  const handleCreateWorkflow = useCallback(async (workflowData: any) => {
    if (!user?.id) return

    try {
      await AutomationService.createWorkflow(user.id, workflowData)
      await loadAutomationWorkflows()

      if (user?.id) {
        analyticsService.trackEvent('automation_workflow_created', {
          trigger_type: workflowData.trigger_type,
          actions_count: workflowData.actions?.length || 0
        }, user.id)
        analyticsService.trackFeatureUsage(user.id, 'workflow_creation')
      }
    } catch (error) {
      console.error('Failed to create workflow:', error)
    }
  }, [user?.id, loadAutomationWorkflows])

  const handleUpdateWorkflow = useCallback(async (workflowId: string, updates: any) => {
    try {
      await AutomationService.updateWorkflow(workflowId, updates)
      await loadAutomationWorkflows()
    } catch (error) {
      console.error('Failed to update workflow:', error)
    }
  }, [loadAutomationWorkflows])

  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    try {
      await AutomationService.deleteWorkflow(workflowId)
      await loadAutomationWorkflows()
    } catch (error) {
      console.error('Failed to delete workflow:', error)
    }
  }, [loadAutomationWorkflows])

  const handleExecuteWorkflow = useCallback(async (workflowId: string) => {
    if (!user?.id || !conversationId) return

    try {
      await AutomationService.executeWorkflow(workflowId, user.id, conversationId)

      if (user?.id) {
        analyticsService.trackEvent('automation_workflow_executed', {
          workflow_id: workflowId,
          conversation_id: conversationId
        }, user.id)
        analyticsService.trackFeatureUsage(user.id, 'workflow_execution')
      }
    } catch (error) {
      console.error('Failed to execute workflow:', error)
    }
  }, [user?.id, conversationId])

  const handleUpdateAutomationSettings = useCallback(async (settings: any) => {
    if (!user?.id) return

    try {
      await AutomationService.updateSettings(user.id, settings)
      setAutomationSettings(settings)
    } catch (error) {
      console.error('Failed to update automation settings:', error)
    }
  }, [user?.id])

  // Predictive AI handlers
  const handleApplyPredictiveCompletion = useCallback((completion: string) => {
    const currentMessage = message
    const newMessage = currentMessage + completion
    setMessage(newMessage)

    // Track usage
    if (user?.id) {
      analyticsService.trackEvent('predictive_completion_applied', {
        completion_length: completion.length,
        original_length: currentMessage.length
      }, user.id)
      analyticsService.trackFeatureUsage(user.id, 'predictive_text')
    }
  }, [message, setMessage, user?.id])

  const handleApplySmartResponse = useCallback((responseText: string) => {
    setMessage(responseText)

    // Track usage
    if (user?.id) {
      analyticsService.trackEvent('smart_response_applied', {
        response_length: responseText.length
      }, user.id)
      analyticsService.trackFeatureUsage(user.id, 'smart_responses')
    }
  }, [setMessage, user?.id])

  const handleExecuteFlowPrediction = useCallback((predictionId: string) => {
    // Handle flow prediction actions
    const prediction = flowPredictions.predictions.find(p => p.id === predictionId)
    if (prediction && user?.id) {
      analyticsService.trackEvent('flow_prediction_executed', {
        prediction_type: prediction.type,
        confidence: prediction.confidence
      }, user.id)
      analyticsService.trackFeatureUsage(user.id, 'flow_prediction')
    }
  }, [flowPredictions.predictions, user?.id])

  const handleSavePredictiveSettings = useCallback((settings: PredictiveSettingsData) => {
    setPredictiveSettings(settings)
    setIsPredictiveSettingsOpen(false)

    // Could save to user preferences here
    if (user?.id) {
      analyticsService.trackEvent('predictive_settings_updated', {
        features_enabled: Object.entries(settings)
          .filter(([key, value]) => key.includes('Enabled') && value === true)
          .map(([key]) => key.replace('Enabled', ''))
      }, user.id)
    }
  }, [user?.id])

  // Upload file to Supabase Storage
  const uploadFile = async (file: File): Promise<string> => {
    console.log('🔄 Starting file upload...', { fileName: file.name, size: file.size, type: file.type })
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('❌ User not authenticated')
      throw new Error('User not authenticated')
    }
    console.log('✅ User authenticated:', user.id)

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const filePath = `message-attachments/${fileName}`
    
    console.log('📁 Upload path:', filePath)

    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file)

    if (error) {
      console.error('❌ Upload error:', error)
      throw error
    }
    
    console.log('✅ Upload successful:', data)

    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath)

    console.log('🔗 Public URL:', urlData.publicUrl)
    return urlData.publicUrl
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
  
    // Validate message content if provided
    if (message.trim()) {
      const validation = aiService.validateMessage(message)
      if (!validation.valid) {
        showErrorToast(validation.error || 'Invalid message', {
          title: 'Message Validation Error',
          duration: 5000
        })
        return
      }
    }
  
    setIsLoading(true)
    const userMessage = message.trim()
    const fileToUpload = selectedFile
    setMessage('')
    setSelectedFile(null)
    setFilePreview(null)
  
    // Auto-resize textarea back to single line
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  
    // Clear file input using ref
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  
    try {
      let currentConversationId = conversationId
  
      // Create new conversation if none exists
      if (!currentConversationId) {
        const conversation = await conversationService.create('New Chat')
        currentConversationId = conversation.id
        onConversationCreated(conversation.id)
  
        // Track conversation creation
        if (user?.id) {
          analyticsService.trackEvent('conversation_created', {
            conversation_id: conversation.id,
            title: conversation.title
          }, user.id)
          analyticsService.incrementConversationCount(user.id)
          analyticsService.updateUserEngagement(user.id)
        }
      }
  
      // Determine model to use early
      const modelToUse = fileToUpload ? 'moonshotai/kimi-vl-a3b-thinking:free' : 'gpt-3.5-turbo'
  
      // Upload file if selected
      let fileUrl: string | undefined
      let metadata: any = {}
  
      if (fileToUpload) {
        try {
          // Convert file to base64 for vision models
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(fileToUpload)
          })
  
          fileUrl = await uploadFile(fileToUpload)
          metadata.image = {
            url: fileUrl,
            base64: base64Data, // Add base64 data for vision models
            filename: fileToUpload.name,
            size: fileToUpload.size,
            type: fileToUpload.type
          }
        } catch (error) {
          console.error('Failed to upload file:', error)
          const errorInfo = handleError(error)
          showErrorToast(errorInfo.message, {
            title: 'File Upload Failed',
            duration: 6000
          })
          setIsLoading(false)
          return
        }
      }
  
      // Send user message with image metadata
      const messageContent = userMessage || (fileToUpload ? `Uploaded image: ${fileToUpload.name}` : '')
      const userMessageData = await messageService.create(currentConversationId, 'user', messageContent, metadata)
  
      // Track message sent
      if (user?.id) {
        analyticsService.trackEvent('message_sent', {
          conversation_id: currentConversationId,
          message_id: userMessageData.id,
          has_file: !!fileToUpload,
          message_length: messageContent.length,
          model: modelToUse
        }, user.id)
        analyticsService.incrementMessageCount(user.id)
        analyticsService.trackModelUsage(user.id, modelToUse)
        analyticsService.updateUserEngagement(user.id)
  
        if (fileToUpload) {
          analyticsService.trackFeatureUsage(user.id, 'file_upload')
        }
      }
  
      // Immediately scroll to bottom after user message is added
      setTimeout(() => {
        const messageContainer = document.querySelector('[data-messages-container]')
        if (messageContainer) {
          messageContainer.scrollTo({
            top: messageContainer.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 100)
  
      // Process AI response using the service layer
      const abortController = new AbortController()
      
      const assistantResponse = await aiService.processMessage(
        currentConversationId,
        userMessage,
        {
          model: modelToUse,
          signal: abortController.signal,
          onStream: (response) => {
            // TODO: Update UI with streaming content
            console.log('Streaming response:', response.content)
          }
        }
      )
  
      // Save assistant response
      if (assistantResponse) {
        const assistantMessageData = await messageService.create(currentConversationId, 'assistant', assistantResponse)
  
        // Track assistant response
        if (user?.id) {
          analyticsService.trackEvent('assistant_response', {
            conversation_id: currentConversationId,
            message_id: assistantMessageData.id,
            response_length: assistantResponse.length,
            model: modelToUse
          }, user.id)
        }
        
        // Generate conversation title if needed
        const conversation = await conversationService.getById(currentConversationId)
        if (conversation && conversation.title === 'New Chat') {
          try {
            const generatedTitle = await aiService.generateTitle(currentConversationId)
            if (generatedTitle !== 'New Chat') {
              await conversationService.update(currentConversationId, { title: generatedTitle })
            }
          } catch (error) {
            console.warn('Failed to generate conversation title:', error)
          }
        }
        
        // Manually refresh messages since real-time might not be working
        if (typeof window !== 'undefined' && (window as any).refreshMessages) {
          await (window as any).refreshMessages()
          
          // Force scroll to bottom after message refresh
          setTimeout(() => {
            const messageContainer = document.querySelector('[data-messages-container]')
            if (messageContainer) {
              messageContainer.scrollTo({
                top: messageContainer.scrollHeight,
                behavior: 'smooth'
              })
            }
          }, 200)
        }
      }
  
    } catch (error) {
      console.error('Failed to send message:', error)
  
      // Restore the message if it failed
      setMessage(userMessage)
  
      // Handle error with proper user feedback
      const errorInfo = handleError(error)
  
      // Show specific error messages based on error type
      let title = 'Message Send Failed'
      let duration = 6000
  
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          title = 'API Key Missing'
        } else if (error.message.includes('Table') || error.message.includes('relation')) {
          title = 'Database Setup Required'
          duration = 10000
        } else if (error.message.includes('Network') || error.message.includes('fetch')) {
          title = 'Connection Error'
        } else if (error.message.includes('rate limit')) {
          title = 'Rate Limit Exceeded'
        } else if (error.message.includes('too long')) {
          title = 'Message Too Long'
        }
      }
  
      showErrorToast(errorInfo.message, {
        title,
        duration
      })
    } finally {
      setIsLoading(false)
  
      // Refocus the textarea after message is sent
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
        }
      }, 100)
    }
  }, [canSubmit, message, selectedFile, conversationId, onConversationCreated, handleError, showErrorToast])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Image Preview */}
      {filePreview && (
        <div className="mb-4 relative inline-block">
          <img
            src={filePreview}
            alt="Selected image preview"
            className="max-w-32 max-h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
          />
          <button
            onClick={removeFile}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
            aria-label="Remove selected image"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} role="form" aria-label="Message input form" className="flex items-end space-x-3">
        {/* File Upload Button */}
        <div className="flex flex-col items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
            id="file-upload-input"
            aria-describedby="file-error"
          />
          <label
            htmlFor="file-upload-input"
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </label>
        </div>

        {/* Prompt Library Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setIsPromptLibraryOpen(true)}
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Open prompt library"
            title="Prompt Library"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>

        {/* Save as Prompt Button */}
        {message.trim() && (
          <div className="flex flex-col items-center">
            <button
              onClick={handleSaveAsPrompt}
              className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Save current message as prompt"
              title="Save as Prompt"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        )}

        {/* Writing Assistant Toggle */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setWritingAssistantEnabled(!writingAssistantEnabled)}
            className={`p-3 transition-colors ${
              writingAssistantEnabled
                ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            aria-label={writingAssistantEnabled ? 'Disable writing assistant' : 'Enable writing assistant'}
            title={writingAssistantEnabled ? 'Disable Writing Assistant' : 'Enable Writing Assistant'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        {/* Automation Toggle */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setAutomationEnabled(!automationEnabled)}
            className={`p-3 transition-colors ${
              automationEnabled
                ? 'text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
            }`}
            aria-label={automationEnabled ? 'Disable automation' : 'Enable automation'}
            title={automationEnabled ? 'Disable Automation' : 'Enable Automation'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>

        {/* Automation Suggestions Indicator */}
        {automationEnabled && automationSuggestions.length > 0 && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowAutomationSuggestions(!showAutomationSuggestions)}
              className="p-3 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors relative"
              aria-label="Toggle automation suggestions"
              title="Automation Suggestions"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {automationSuggestions.length}
              </span>
            </button>
          </div>
        )}

        {/* Workflow Manager */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setIsWorkflowManagerOpen(true)}
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Open workflow manager"
            title="Workflow Manager"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        </div>

        {/* Automation Settings */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setIsAutomationSettingsOpen(true)}
            className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            aria-label="Open automation settings"
            title="Automation Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Predictive AI Settings */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setIsPredictiveSettingsOpen(true)}
            className="p-3 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            aria-label="Open predictive AI settings"
            title="Predictive AI Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        </div>

        {/* Predictive Text Toggle */}
        {predictiveSettings.predictiveTextEnabled && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowPredictiveText(!showPredictiveText)}
              className={`p-3 transition-colors ${
                showPredictiveText
                  ? 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              aria-label={showPredictiveText ? 'Hide predictive text' : 'Show predictive text'}
              title={showPredictiveText ? 'Hide Predictive Text' : 'Show Predictive Text'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              {predictiveText.completions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {predictiveText.completions.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Smart Responses Toggle */}
        {predictiveSettings.smartResponsesEnabled && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowSmartResponses(!showSmartResponses)}
              className={`p-3 transition-colors ${
                showSmartResponses
                  ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              aria-label={showSmartResponses ? 'Hide smart responses' : 'Show smart responses'}
              title={showSmartResponses ? 'Hide Smart Responses' : 'Show Smart Responses'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {smartResponses.suggestions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {smartResponses.suggestions.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Flow Prediction Toggle */}
        {predictiveSettings.flowPredictionEnabled && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowFlowPredictions(!showFlowPredictions)}
              className={`p-3 transition-colors ${
                showFlowPredictions
                  ? 'text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              aria-label={showFlowPredictions ? 'Hide flow predictions' : 'Show flow predictions'}
              title={showFlowPredictions ? 'Hide Flow Predictions' : 'Show Flow Predictions'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {flowPredictions.predictions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {flowPredictions.predictions.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Proactive Assistance Toggle */}
        {predictiveSettings.proactiveAssistanceEnabled && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowProactiveAssistance(!showProactiveAssistance)}
              className={`p-3 transition-colors ${
                showProactiveAssistance
                  ? 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                  : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
              }`}
              aria-label={showProactiveAssistance ? 'Hide proactive assistance' : 'Show proactive assistance'}
              title={showProactiveAssistance ? 'Hide Proactive Assistance' : 'Show Proactive Assistance'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {proactiveAssistance.interventions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {proactiveAssistance.interventions.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Message Input */}
        <div
          className={`flex-1 relative ${isDragOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="group"
          aria-labelledby="message-input-label"
        >
          <div id="message-input-label" className="sr-only">
            Compose message
          </div>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here (Shift+Enter for new line)"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[44px] max-h-32"
            rows={1}
            disabled={isLoading}
            aria-label="Message input"
            aria-describedby="input-help input-error"
          />
          <div id="input-help" className="sr-only">
            Press Enter to send, Shift+Enter for new line. Drag and drop images or use the upload button.
          </div>

          {/* Character count (optional) */}
          {messageLength > 500 && (
            <div className="absolute -top-6 right-0 text-xs text-gray-500">
              {messageLength}/2000
            </div>
          )}

          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-medium">Drop image here</span>
            </div>
          )}

          <div id="input-error" className="sr-only" role="alert" aria-live="polite"></div>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
          <span className="sr-only">Send message</span>
        </button>
      </form>

      {/* Error message display */}
      {selectedFile && (
        <div id="file-error" className="text-sm text-red-600 dark:text-red-400 mt-2 sr-only" role="alert" aria-live="assertive">
          Selected file: {selectedFile.name}
        </div>
      )}

      {/* Typing Indicator Placeholder */}
      {isLoading && (
        <div className="flex items-center space-x-2 mt-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span>AI is thinking...</span>
        </div>
      )}

      {/* Prompt Library Modal */}
      <PromptLibrary
        isOpen={isPromptLibraryOpen}
        onClose={() => setIsPromptLibraryOpen(false)}
        onSelectPrompt={handleSelectPrompt}
      />

      {/* Writing Assistant Overlay */}
      <WritingAssistantOverlay
        grammarSuggestions={writingAssistant.grammarSuggestions}
        toneAnalysis={writingAssistant.toneAnalysis}
        contentSuggestions={writingAssistant.contentSuggestions}
        isLoading={writingAssistant.isLoading}
        error={writingAssistant.error}
        onApplySuggestion={handleApplySuggestion}
        onDismissSuggestion={handleDismissSuggestion}
      />

      {/* Automation Suggestions */}
      <AutomationSuggestions
        suggestions={automationSuggestions}
        onApplySuggestion={handleApplyAutomationSuggestion}
        onDismissSuggestion={handleDismissAutomationSuggestion}
        onCreateWorkflow={handleCreateWorkflowFromSuggestion}
        isVisible={showAutomationSuggestions}
        onClose={() => setShowAutomationSuggestions(false)}
      />

      {/* Workflow Manager */}
      <WorkflowManager
        isOpen={isWorkflowManagerOpen}
        onClose={() => setIsWorkflowManagerOpen(false)}
        workflows={automationWorkflows}
        onCreateWorkflow={handleCreateWorkflow}
        onUpdateWorkflow={handleUpdateWorkflow}
        onDeleteWorkflow={handleDeleteWorkflow}
        onExecuteWorkflow={handleExecuteWorkflow}
      />

      {/* Automation Settings */}
      <AutomationSettings
        isOpen={isAutomationSettingsOpen}
        onClose={() => setIsAutomationSettingsOpen(false)}
        currentSettings={automationSettings}
        onUpdateSettings={handleUpdateAutomationSettings}
      />

      {/* Predictive AI Settings */}
      <PredictiveSettings
        isOpen={isPredictiveSettingsOpen}
        onClose={() => setIsPredictiveSettingsOpen(false)}
        currentSettings={predictiveSettings}
        onSave={handleSavePredictiveSettings}
      />

      {/* Predictive Text Completion Overlay */}
      {showPredictiveText && predictiveText.completions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              📝 Predictive Completions
            </h4>
            <button
              onClick={() => setShowPredictiveText(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-1">
            {predictiveText.completions.map((completion, index) => (
              <button
                key={index}
                onClick={() => handleApplyPredictiveCompletion(completion.text)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span className="flex-1 truncate">{completion.text}</span>
                <div className="flex items-center space-x-2 ml-2">
                  <span className="text-xs text-gray-500 capitalize">{completion.type}</span>
                  <span className="text-xs text-gray-500">{Math.round(completion.confidence * 100)}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Smart Response Suggestions Overlay */}
      {showSmartResponses && smartResponses.suggestions.length > 0 && (
        <div className="absolute bottom-full right-0 mb-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              💬 Smart Response Suggestions
            </h4>
            <button
              onClick={() => setShowSmartResponses(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {smartResponses.suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white mb-1">{suggestion.text}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{suggestion.category}</span>
                      <span>•</span>
                      <span>{suggestion.tone}</span>
                      <span>•</span>
                      <span>{Math.round(suggestion.confidence * 100)}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => smartResponses.dismissSuggestion(suggestion.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                    title="Dismiss suggestion"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => handleApplySmartResponse(suggestion.text)}
                  className="w-full px-3 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                >
                  Use This Response
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Flow Predictions Overlay */}
      {showFlowPredictions && flowPredictions.predictions.length > 0 && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              🔮 Flow Predictions
            </h4>
            <button
              onClick={() => setShowFlowPredictions(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {flowPredictions.predictions.map((prediction) => (
              <div key={prediction.id} className="border border-gray-200 dark:border-gray-600 rounded p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {prediction.title}
                    </h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {prediction.description}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        prediction.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        prediction.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {prediction.priority}
                      </span>
                      <span>{Math.round(prediction.confidence * 100)}%</span>
                      <span>•</span>
                      <span>{prediction.estimatedTime}min</span>
                    </div>
                  </div>
                  <button
                    onClick={() => flowPredictions.dismissPrediction(prediction.id)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-2"
                    title="Dismiss prediction"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {prediction.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {prediction.suggestedActions.slice(0, 3).map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleExecuteFlowPrediction(prediction.id)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proactive Assistance Notifications */}
      {showProactiveAssistance && proactiveAssistance.interventions.length > 0 && (
        <div className="fixed bottom-20 left-4 z-50 max-w-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                🚀 Proactive Assistance
              </h3>
              <button
                onClick={() => setShowProactiveAssistance(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {proactiveAssistance.interventions.map((intervention) => (
                <div
                  key={intervention.id}
                  className={`border rounded-lg p-3 ${
                    intervention.priority === 'urgent' ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20' :
                    intervention.priority === 'high' ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20' :
                    intervention.priority === 'medium' ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/20' :
                    'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {intervention.title}
                    </h4>
                    <div className="flex items-center space-x-1 ml-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        intervention.priority === 'urgent' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                        intervention.priority === 'high' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
                        intervention.priority === 'medium' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200' :
                        'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {intervention.priority}
                      </span>
                      {intervention.dismissible && (
                        <button
                          onClick={() => proactiveAssistance.dismissIntervention(intervention.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Dismiss"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {intervention.message}
                  </p>

                  {intervention.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {intervention.actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => proactiveAssistance.executeInterventionAction(intervention.id, action.id)}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}