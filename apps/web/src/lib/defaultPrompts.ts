import { Prompt } from '../types/prompts'

export const DEFAULT_PROMPTS: Prompt[] = [
  // Writing Prompts
  {
    id: 'writing-blog-post',
    title: 'Blog Post Writer',
    content: 'Write a comprehensive blog post about [TOPIC]. Include an engaging introduction, 3-5 main sections with subheadings, and a strong conclusion. Use SEO-friendly language and include relevant keywords naturally.',
    category: 'writing',
    description: 'Create engaging blog posts with proper structure',
    tags: ['blogging', 'content', 'SEO']
  },
  {
    id: 'writing-email-professional',
    title: 'Professional Email',
    content: 'Write a professional email to [RECIPIENT] regarding [SUBJECT]. Include a clear subject line, proper greeting, concise body, and professional closing. Keep it under 200 words.',
    category: 'writing',
    description: 'Craft professional business emails',
    tags: ['email', 'business', 'communication']
  },
  {
    id: 'writing-story-outline',
    title: 'Story Outline Generator',
    content: 'Create a detailed outline for a [GENRE] story about [PLOT IDEA]. Include main characters, plot points, conflicts, and resolution. Structure it with beginning, middle, and end.',
    category: 'writing',
    description: 'Generate story outlines and plot structures',
    tags: ['fiction', 'storytelling', 'creative writing']
  },

  // Coding Prompts
  {
    id: 'coding-debug',
    title: 'Code Debugger',
    content: 'I have this [LANGUAGE] code that\'s not working as expected:\n\n```\n[PASTE CODE HERE]\n```\n\nThe error/issue is: [DESCRIBE PROBLEM]\n\nPlease help me debug this and provide the corrected code with explanation.',
    category: 'coding',
    description: 'Debug and fix code issues',
    tags: ['debugging', 'programming', 'error fixing']
  },
  {
    id: 'coding-refactor',
    title: 'Code Refactoring',
    content: 'Refactor this [LANGUAGE] code to improve readability, performance, and maintainability:\n\n```\n[PASTE CODE HERE]\n```\n\nFocus on: [SPECIFIC IMPROVEMENTS]',
    category: 'coding',
    description: 'Improve existing code quality',
    tags: ['refactoring', 'optimization', 'best practices']
  },
  {
    id: 'coding-explain',
    title: 'Code Explainer',
    content: 'Explain what this [LANGUAGE] code does in simple terms:\n\n```\n[PASTE CODE HERE]\n```\n\nBreak it down step by step and explain the logic behind it.',
    category: 'coding',
    description: 'Understand and explain code functionality',
    tags: ['learning', 'explanation', 'understanding']
  },

  // Analysis Prompts
  {
    id: 'analysis-data-insights',
    title: 'Data Analysis',
    content: 'Analyze this dataset/information: [DATA DESCRIPTION]\n\nProvide insights on:\n1. Key trends and patterns\n2. Anomalies or outliers\n3. Recommendations based on the analysis\n4. Potential next steps',
    category: 'analysis',
    description: 'Extract insights from data and information',
    tags: ['data', 'insights', 'recommendations']
  },
  {
    id: 'analysis-problem-solving',
    title: 'Problem Solver',
    content: 'I\'m facing this problem: [PROBLEM DESCRIPTION]\n\nContext: [BACKGROUND INFO]\n\nI\'ve tried: [ATTEMPTED SOLUTIONS]\n\nPlease help me:\n1. Understand the root cause\n2. Explore possible solutions\n3. Recommend the best approach',
    category: 'analysis',
    description: 'Systematic problem analysis and solutions',
    tags: ['problem solving', 'analysis', 'solutions']
  },

  // Creative Prompts
  {
    id: 'creative-brainstorm',
    title: 'Idea Brainstorm',
    content: 'Brainstorm creative ideas for [PROJECT/TOPIC]. Generate 10 diverse concepts that could work. For each idea, include:\n- Brief description\n- Potential benefits\n- Implementation considerations\n- Target audience',
    category: 'creative',
    description: 'Generate creative ideas and concepts',
    tags: ['brainstorming', 'ideas', 'creativity']
  },
  {
    id: 'creative-logo-concept',
    title: 'Logo Design Concept',
    content: 'Design a logo concept for [BRAND/COMPANY]. Consider:\n- Brand personality and values\n- Target audience\n- Industry context\n- Color psychology\n- Typography choices\n\nProvide detailed description and reasoning.',
    category: 'creative',
    description: 'Create logo design concepts',
    tags: ['design', 'branding', 'visual']
  },

  // Business Prompts
  {
    id: 'business-strategy',
    title: 'Business Strategy',
    content: 'Develop a business strategy for [BUSINESS IDEA]. Include:\n1. Market analysis\n2. Competitive landscape\n3. Target market definition\n4. Value proposition\n5. Marketing strategy\n6. Financial projections\n7. Risk assessment',
    category: 'business',
    description: 'Create comprehensive business strategies',
    tags: ['strategy', 'business', 'planning']
  },
  {
    id: 'business-pitch',
    title: 'Investor Pitch',
    content: 'Create an investor pitch for [STARTUP/COMPANY]. Structure it as:\n1. Problem statement\n2. Solution overview\n3. Market opportunity\n4. Business model\n5. Traction and milestones\n6. Team introduction\n7. Financials and ask',
    category: 'business',
    description: 'Craft compelling investor presentations',
    tags: ['pitch', 'investors', 'startup']
  },

  // Education Prompts
  {
    id: 'education-lesson-plan',
    title: 'Lesson Plan Creator',
    content: 'Create a lesson plan for [SUBJECT] at [GRADE LEVEL]. Include:\n1. Learning objectives\n2. Materials needed\n3. Lesson structure (introduction, main activity, conclusion)\n4. Assessment methods\n5. Differentiation strategies\n6. Extension activities',
    category: 'education',
    description: 'Design effective lesson plans',
    tags: ['teaching', 'education', 'curriculum']
  },
  {
    id: 'education-explanation',
    title: 'Concept Explainer',
    content: 'Explain [COMPLEX TOPIC] in simple terms that a [TARGET AUDIENCE] can understand. Use analogies, examples, and break it down into digestible parts. Avoid jargon or explain it when necessary.',
    category: 'education',
    description: 'Simplify complex concepts for learning',
    tags: ['explanation', 'learning', 'simplification']
  }
]