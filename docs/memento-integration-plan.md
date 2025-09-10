# Integration Plan: Adding Memento to Sleek Chat Interface

## Overview
Memento is an AI agent framework that uses Case-Based Reasoning (CBR) to improve LLM performance through memory-based experience tracking. It would complement your existing chat interface by adding "learning" capabilities.

## Integration Strategy

### 1. **Architectural Position**
- **Backend Service**: Add Memento as a separate Python service alongside your Next.js frontend
- **API Layer**: Create middleware to route requests through Memento when enhanced reasoning is needed
- **Database Extension**: Extend existing Supabase schema to store case bank data

### 2. **Implementation Steps**

#### Phase 1: Foundation Setup
- Create `services/memento/` directory for Python service
- Set up Python environment with required dependencies (Python 3.11+, uv)
- Configure Memento with your existing OpenRouter API keys
- Add Docker/container setup for development consistency

#### Phase 2: API Integration
- Create `/api/memento/` endpoints in Next.js to proxy requests
- Modify existing `useWritingAssistant.ts` hook to optionally use Memento
- Add toggle in settings for "Enhanced AI Mode" (Memento vs direct OpenRouter)
- Extend user settings table to store Memento preferences

#### Phase 3: Case Bank Integration
- Add Supabase tables for storing Memento case bank data
- Implement case sharing/privacy controls per user
- Add UI components to view/manage stored experiences
- Create conversation analysis pipeline to build case bank from chat history

#### Phase 4: Enhanced Features
- Add "Smart Suggestions" powered by similar past conversations
- Implement conversation pattern recognition
- Create "Learning Insights" dashboard showing improvement over time
- Add export functionality for case bank data

### 3. **Technical Integration Points**

#### Frontend Changes
- Extend `apps/web/src/lib/openrouter.ts` with Memento routing logic
- Add new hooks: `useMementoAssistant.ts`, `useCaseBank.ts`
- Create settings panel for Memento configuration
- Add UI indicators when Memento enhancement is active

#### Backend Changes
- New API routes: `/api/memento/chat`, `/api/memento/cases`
- Database schema extensions for case storage
- Background service for case bank processing
- Integration with existing authentication system

### 4. **Benefits for Your Project**
- **Enhanced Writing Assistant**: Your existing writing assistant becomes smarter over time
- **Conversation Intelligence**: Learn from past successful interactions
- **User Personalization**: Adapt to individual communication styles
- **Advanced Analytics**: Understand conversation patterns and success metrics

### 5. **Development Approach**
- Maintain existing functionality as fallback
- Implement feature flags for gradual rollout
- Start with read-only case bank, then add learning capabilities
- Use existing test infrastructure for integration testing

This approach leverages your existing tech stack (Next.js, Supabase, TypeScript) while adding Memento's advanced AI capabilities as an optional enhancement layer.

## Memento Technical Details

### What is Memento?
Memento is an AI agent framework designed to improve large language model (LLM) agents' performance without modifying the underlying model weights through memory-based experience tracking.

### Core Architecture
- Two-stage "planner-executor" loop
- Uses Case-Based Reasoning (CBR) to retrieve and apply past experiences
- Stores successful and failed task trajectories in a "Case Bank"

### Key Technical Features
- Supports web search, document processing, code execution, and media analysis
- Unified Multi-Client Protocol (MCP) for tool integration
- Neural case-selection policy to guide agent actions

### Installation Requirements
- Python 3.11+
- OpenAI API key
- SearxNG for web search
- FFmpeg for video processing
- Additional tool-specific API keys optional

### Performance
- Competitive results on benchmarks like GAIA (87.88% validation)
- Demonstrates improved performance on out-of-distribution datasets
- "Learning from experiences, not gradients" approach

### Repository
- GitHub: https://github.com/Agent-on-the-Fly/Memento
- Installation: `uv sync`
- Configuration: Environment variables setup required