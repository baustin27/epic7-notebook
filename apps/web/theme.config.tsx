import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>AI Chat Platform Docs</span>,
  project: {
    link: 'https://github.com/your-org/ai-chat-platform',
  },
  chat: {
    link: 'https://discord.com',
  },
  docsRepositoryBase: 'https://github.com/your-org/ai-chat-platform/tree/main/apps/web',
  footer: {
    text: 'AI Chat Platform Documentation',
  },
  navigation: {
    prev: true,
    next: true
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    autoCollapse: true
  },
  search: {
    placeholder: 'Search documentation...'
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="AI Chat Platform Documentation" />
      <meta property="og:description" content="Comprehensive documentation for the AI Chat Platform" />
    </>
  ),
}

export default config