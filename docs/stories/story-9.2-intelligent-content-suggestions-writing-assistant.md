# Story 9.2: Intelligent Content Suggestions & Writing Assistant - Brownfield Addition

## User Story

As a **user of the AI chat application**,
I want **AI-powered writing improvements, grammar checking, tone analysis, and smart content suggestions**,
So that **I can produce higher quality content more efficiently and adapt my writing style to different contexts**.

## Story Context

**Existing System Integration:**

- Integrates with: Existing message input component, conversation system, OpenRouter API integration
- Technology: Next.js 14, TypeScript, Supabase PostgreSQL, OpenRouter API, Zustand state management
- Follows pattern: Existing real-time AI integration and UI feedback patterns from message composition
- Touch points: Message input field, real-time text processing, AI API calls during composition

## Acceptance Criteria

**Functional Requirements:**

1. Writing assistant provides real-time grammar corrections and style suggestions as user types
2. Tone analysis detects and suggests adjustments for professional, casual, or empathetic tones
3. Smart content suggestions offer context-aware completions and expansions based on conversation history

**Integration Requirements:**

4. Existing message input and sending functionality continues to work unchanged
5. New writing assistant features follow existing UI component patterns for feedback overlays
6. Integration with OpenRouter API maintains current behavior and adds writing analysis calls

**Quality Requirements:**

7. Writing assistant is covered by appropriate unit and integration tests for suggestion accuracy
8. Real-time suggestions appear with minimal latency (<500ms) without blocking input
9. No regression in existing conversation composition and sending functionality verified

## Technical Notes

- **Integration Approach:** Extend the existing MessageInput component with AI-powered text analysis hooks and suggestion overlays, processing text via OpenRouter in real-time with debouncing
- **Existing Pattern Reference:** Follow the chat message input and real-time validation patterns from current codebase, similar to existing autocomplete features
- **Key Constraints:** Respect OpenRouter API rate limits with client-side debouncing and caching of common suggestions, ensure privacy by processing only user-input text, optimize for mobile input performance

## Definition of Done

- [x] Real-time grammar and style suggestions implemented and functional
- [x] Tone analysis with adjustable suggestion modes available
- [x] Context-aware content suggestions integrated into input field
- [x] Suggestions displayed via non-intrusive UI overlays
- [x] Integration with existing message input verified
- [x] Code follows existing TypeScript and component patterns
- [x] Tests pass including writing assistant scenarios
- [x] OpenRouter API usage optimized with debouncing and caching

## Risk and Compatibility Check

**Minimal Risk Assessment:**

- **Primary Risk:** Real-time API calls causing performance delays or increased costs during active typing
- **Mitigation:** Implement debouncing (300ms delay), local caching for frequent suggestions, and configurable suggestion levels to control API usage
- **Rollback:** Feature flag to disable writing assistant, reverting to plain text input without changes to core messaging

**Compatibility Verification:**

- [ ] No breaking changes to existing message APIs
- [ ] No database changes required (client-side processing only)
- [ ] UI changes follow existing input design patterns
- [ ] Performance impact is negligible with optimized real-time processing

## Dev Agent Record

### Agent Model Used
openrouter/sonoma-sky-alpha

### Debug Log References
- None

### Completion Notes List
- Initial story creation for writing assistant integration
- Implemented useWritingAssistant hook with debounced API calls and caching mechanism
- Created WritingAssistantOverlay component with expandable sections for different suggestion types
- Integrated writing assistant into MessageInput component with toggle functionality
- Added comprehensive unit and integration tests
- Verified no regression in existing message input functionality
- All acceptance criteria met with real-time suggestions, tone analysis, and content suggestions

### File List
- `apps/web/src/hooks/useWritingAssistant.ts` - Custom hook for writing assistant functionality with debounced API calls and caching
- `apps/web/src/components/ui/WritingAssistantOverlay.tsx` - UI component for displaying writing suggestions in non-intrusive overlay
- `apps/web/src/components/chat/MessageInput.tsx` - Modified to integrate writing assistant with toggle button and suggestion handling
- `apps/web/src/hooks/__tests__/useWritingAssistant.test.ts` - Unit tests for writing assistant hook
- `apps/web/src/components/chat/MessageInput.test.tsx` - Integration tests for MessageInput with writing assistant

### Change Log
- 2025-09-08: Story created
- 2025-09-08: Implemented complete writing assistant functionality with real-time suggestions, tone analysis, and content suggestions
- 2025-09-08: Added comprehensive tests and verified no regression in existing functionality
- 2025-09-08: Status updated to Ready for Review

### Status
Ready for Review

---

*Created by Product Manager (pm) Agent*  
*Date: 2025-09-08*