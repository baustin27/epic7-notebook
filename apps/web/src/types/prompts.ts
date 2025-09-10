export interface Prompt {
  id: string
  title: string
  content: string
  category: string
  description?: string
  tags?: string[]
  isCustom?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PromptCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
}

export const DEFAULT_CATEGORIES: PromptCategory[] = [
  {
    id: 'writing',
    name: 'Writing',
    description: 'Creative writing, content creation, and editing prompts',
    icon: '✍️',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  },
  {
    id: 'coding',
    name: 'Coding',
    description: 'Programming, debugging, and development assistance',
    icon: '💻',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Data analysis, research, and problem-solving',
    icon: '📊',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Art, design, and creative brainstorming',
    icon: '🎨',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Business strategy, marketing, and professional communication',
    icon: '💼',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Learning, teaching, and educational content',
    icon: '📚',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Your personal prompts and templates',
    icon: '⭐',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }
]