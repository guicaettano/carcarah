# Contributing to Carcarah

Thank you for your interest in Carcarah! This document provides technical context for developers.

## Development Setup

### Prerequisites
- Node.js 22 or newer
- npm
- OpenAI API key (for investigation features)

### Installation
```bash
# Clone the repository
git clone [repository-url]
cd carcarah

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Add your API key to .env.local
# OPENAI_API_KEY=sk-...
```

### Running Locally
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000`

## Project Structure

### Core Libraries

#### `src/lib/search-analysis/`
Deterministic revenue leak detection and opportunity calculation.

**Key files:**
- `detector.ts` - Leak detection logic
- `metrics.ts` - Conversion and revenue calculations
- `types.ts` - TypeScript interfaces

**How it works:**
1. Loads search events and products
2. Calculates baseline conversion rates
3. Identifies queries below baseline
4. Estimates GMV opportunity

#### `src/lib/investigation-agent/`
AI agent with OpenAI tool calling.

**Key files:**
- `agent.ts` - Main agent orchestration
- `tools.ts` - Investigation tool definitions
- `grounding.ts` - Result validation
- `types.ts` - Agent response types

**Tools:**
- `getLeakContext` - Revenue metrics
- `searchStorefront` - Current behavior
- `searchCatalog` - Product vocabulary
- `getProductDetails` - Product validation

#### `src/lib/search-actions/`
Controlled Act boundary for applying changes.

**Key files:**
- `executor.ts` - Apply/revert logic
- `approval.ts` - Signature generation/validation
- `validator.ts` - Change validation
- `types.ts` - Action interfaces

**Safety mechanisms:**
- Approval token signing (HMAC-SHA256)
- Risk assessment
- Regression detection
- Audit trail

#### `src/lib/commerce-search/`
Deterministic search engine simulator.

**Key files:**
- `storefront.ts` - Storefront search
- `catalog.ts` - Catalog search
- `types.ts` - Search interfaces

**Features:**
- Lexical matching
- Synonym rules
- Query rewriting
- Configurable sandbox

### API Routes

#### `POST /api/investigate`
Triggers agent investigation.

**Request:**
```json
{
  "query": "moletom canguru preto"
}
```

**Response:**
```json
{
  "investigation": {
    "query": "moletom canguru preto",
    "rootCause": "vocabulary_mismatch",
    "diagnosis": "...",
    "confidence": 0.92,
    "risk": "low",
    "evidence": [...],
    "relatedProducts": [...]
  },
  "trace": [...],
  "approval": {
    "proposal": {
      "type": "synonym_rule",
      "source": "canguru",
      "targets": ["hoodie"],
      ...
    },
    "token": "signed-hmac-token"
  }
}
```

#### `POST /api/resolve`
Applies or reverts approved actions.

**Apply request:**
```json
{
  "operation": "apply",
  "query": "moletom canguru preto",
  "proposal": {...},
  "approvalToken": "..."
}
```

**Revert request:**
```json
{
  "operation": "revert",
  "query": "moletom canguru preto",
  "proposal": {...},
  "approvalToken": "...",
  "ruleId": "..."
}
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Structure
```
src/
├── lib/
│   ├── search-analysis/__tests__/
│   ├── commerce-search/__tests__/
│   ├── investigation-agent/__tests__/
│   └── search-actions/__tests__/
└── app/api/
    ├── investigate/__tests__/
    └── resolve/__tests__/
```

### Writing Tests
- Use Vitest
- Test both success and error cases
- Mock external dependencies (OpenAI)
- Validate types with Zod

## Code Style

### TypeScript
- Strict mode enabled
- No implicit any
- Proper error handling
- Type exports in `types.ts`

### React
- Functional components
- Hooks for state management
- Server components where possible
- Client components marked with `"use client"`

### CSS
- CSS Modules for scoping
- Semantic class names
- Mobile-first responsive design

## Architecture Principles

### 1. Separation of Concerns
```
Detect (deterministic) ≠ Investigate (agentic) ≠ Act (controlled)
```

### 2. Read vs. Write
- Investigation tools: **read-only**
- Act tools: **single controlled write**
- No direct database/catalog modifications

### 3. Safety First
- Human approval required
- Cryptographic signatures
- Risk assessment
- Regression checks
- Instant revert

### 4. Grounding
- Every recommendation backed by tool results
- No hallucinated data
- Explicit evidence chain

### 5. Transparency
- Full tool execution trace
- Visible agent reasoning
- Clear audit trail

## Adding New Features

### New Investigation Tool
1. Define tool in `src/lib/investigation-agent/tools.ts`
2. Add Zod schema for parameters/output
3. Implement tool function
4. Register in agent configuration
5. Add tests
6. Update documentation

### New Search Rule Type
1. Extend `SearchConfiguration` type
2. Update `applySearchRule` logic
3. Add validation in `executor.ts`
4. Update revert logic
5. Add tests

### New Validation Check
1. Add check in `validator.ts`
2. Update `ActionTraceEvent` types
3. Include in validation trace
4. Add tests

## Debugging

### Enable Debug Logs
```typescript
// In investigation-agent/agent.ts
console.log('Tool call:', toolCall);
console.log('Tool result:', toolResult);
```

### Common Issues

**Agent not returning proposals:**
- Check OpenAI API key
- Verify tool results are valid
- Check grounding logic

**Approval token invalid:**
- Verify `CARCARAH_APPROVAL_SECRET` matches
- Check token hasn't expired (5 min)
- Ensure proposal wasn't modified

**Validation failing:**
- Check sandbox configuration
- Verify products exist in catalog
- Review regression check queries

## Performance

### Optimization Tips
- Cache catalog searches
- Minimize API calls
- Use React.memo for expensive components
- Lazy load heavy components

### Monitoring
- Track agent response times
- Monitor tool call counts
- Log validation failures

## Security

### Best Practices
- Never commit `.env` files
- Use environment variables for secrets
- Validate all user input (Zod)
- Sign all action proposals
- Rate limit API endpoints (future)

### Approval Token
- HMAC-SHA256 signature
- 5-minute expiration
- Includes: source, targets, confidence, risk
- Prevents tampering

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production
vercel --prod
```

### Environment Variables
Required:
- `OPENAI_API_KEY` - OpenAI API key

Optional:
- `CARCARAH_APPROVAL_SECRET` - Custom signing secret
- `NODE_ENV` - Environment (production/development)

## Roadmap

### Near-term
- [ ] Real analytics integration
- [ ] E-commerce platform connectors
- [ ] A/B testing framework
- [ ] Enhanced validation rules

### Long-term
- [ ] Multi-agent orchestration
- [ ] LLM-agnostic architecture
- [ ] Enterprise auth & multi-tenancy
- [ ] Embeddings + semantic search

## Questions?

Open an issue or reach out to the team!

---

**Happy coding!** 🚀
