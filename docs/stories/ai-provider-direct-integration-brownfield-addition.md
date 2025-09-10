#### Story Title

AI Provider Direct Integration - Brownfield Addition

#### User Story

As a chat application user,
I want direct integration with OpenAI, Google Gemini, Anthropic Claude, and xAI Grok APIs plus OpenAI-compatible endpoints with a scalable provider selection UI,
So that I can easily manage multiple AI providers with a clean interface that's ready for future expansions.

#### Story Context

**Existing System Integration:**

- Integrates with: AIService class, ModelSelector component, SettingsModal
- Technology: Next.js, TypeScript, Lucide React icons, Tailwind CSS
- Follows pattern: Existing ModelSelector.tsx and SettingsModal.tsx UI patterns
- Touch points: ai-service.ts, ModelSelector.tsx, SettingsModal.tsx, API key management

#### Acceptance Criteria

**Functional Requirements:**
1. Add direct API clients for OpenAI, Google Gemini, Anthropic Claude, and xAI Grok
2. Support OpenAI-compatible endpoint configuration (custom base URLs with naming)
3. Maintain existing streaming response functionality for all providers

**UI/UX Requirements:**
4. Provider selection UI is organized by provider with clear visual hierarchy
5. Provider cards show connection status, model count, and configuration state
6. Custom endpoint configuration is intuitive with validation and testing
7. Model selector groups models by provider with provider branding/icons
8. Settings are organized in expandable sections per provider
9. UI scales gracefully for 10+ providers without cluttering

**Integration Requirements:**
10. Existing OpenRouter integration continues to work unchanged
11. New providers follow existing OpenRouter API client pattern
12. Integration with AIService maintains current streaming and model settings behavior

**Quality Requirements:**
13. Changes are covered by unit tests matching existing test patterns
14. API key storage follows existing Supabase + localStorage pattern
15. No regression in existing chat functionality verified
16. UI components are responsive and accessible

#### Technical Notes

- **Integration Approach:**
  - Provider factory pattern in AIService
  - Scalable provider registry for UI components
  - Provider-specific configuration schemas
- **UI Architecture:**
  - Provider card system with consistent layout
  - Tabbed/accordion settings organization
  - Provider icon system using Lucide + custom icons
  - Model grouping by provider in selector
- **Existing Pattern Reference:** Follow ModelSelector.tsx component patterns, SettingsModal.tsx section organization
- **Key Constraints:** UI must handle dynamic provider list, maintain existing Tailwind design system

#### UI Specifications

Provider Settings Panel:
┌─ AI Providers ─────────────────────────┐
│ ┌─ OpenRouter ──────────── ✓ Connected │
│ │ • 150+ models available              │
│ │ [Manage API Key] [Test Connection]   │
│ └─────────────────────────────────────── │
│ ┌─ OpenAI ─────────────── ⚠ Configure  │
│ │ Direct access to GPT models          │
│ │ [Set API Key] [Test Connection]      │
│ └─────────────────────────────────────── │
│ ┌─ Custom Endpoints ───── + Add New    │
│ │ ┌─ Local Ollama ────── ✓ Connected   │
│ │ │ http://localhost:11434/v1          │
│ │ │ [Edit] [Test] [Remove]             │
│ │ └───────────────────────────────────── │
│ └─────────────────────────────────────── │
└─────────────────────────────────────────┘

Model Selector Enhancement:
┌─ Select Model ───────────────────────┐
│ 🔍 Search models...                  │
│ ┌─ OpenRouter ─────────────────────── │
│ │ ○ GPT-4o                          │
│ │ ○ Claude 3.5 Sonnet               │
│ │ ○ Gemini Pro                      │
│ └───────────────────────────────────── │
│ ┌─ OpenAI Direct ──────────────────── │
│ │ ○ GPT-4o (Direct)                 │
│ │ ○ GPT-4o Mini (Direct)            │
│ └───────────────────────────────────── │
│ ┌─ Local Ollama ────────────────────── │
│ │ ○ Llama 3.1 8B                    │
│ └───────────────────────────────────── │
└───────────────────────────────────────┘

#### Definition of Done

- Provider management UI with card-based layout implemented
- Custom endpoint configuration with validation and testing
- Model selector groups models by provider with clear labeling
- Provider connection status indicators working
- Settings organized in expandable provider sections
- UI handles 10+ providers gracefully without scroll issues
- Provider icon system implemented with fallbacks
- All providers support streaming responses like OpenRouter
- Existing OpenRouter functionality regression tested
- Code follows existing TypeScript and Tailwind patterns
- Components are responsive (mobile/desktop) and accessible
- API key storage uses existing Supabase encryption pattern

#### Risk and Compatibility Check

**Minimal Risk Assessment:**
- **Primary Risk:** UI complexity could impact performance with many providers
- **Mitigation:** Virtualized lists for large provider/model lists, lazy loading
- **Rollback:** Feature flag to revert to simple provider dropdown

**Compatibility Verification:**
- No breaking changes to existing ModelSelector component interface
- Settings modal layout remains consistent with existing patterns
- Provider addition doesn't affect existing OpenRouter users
- Performance remains smooth with 1-2 configured providers (common case)