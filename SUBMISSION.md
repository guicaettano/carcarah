# Carcarah - Hackathon Submission

## Project Overview

**Carcarah** is an autonomous AI agent that detects, investigates, and fixes e-commerce search revenue leaks with human-in-the-loop approval and automatic validation.

## What Makes Carcarah Special

### 1. Real Autonomous Intelligence
- Not a chatbot or simple classifier
- Uses OpenAI tool calling with 4 grounded, read-only investigation tools
- Reasons semantically about vocabulary mismatches
- Proposes changes based on evidence, not guesswork

### 2. Safety-First Design
- **Separation of concerns:** Detect ≠ Investigate ≠ Act
- **Read-only investigation:** Agent can't modify anything
- **Controlled write:** Single `applySearchRule` tool
- **Human approval required:** Every action needs explicit permission
- **Cryptographically signed proposals:** No tampering possible
- **Automatic validation:** Before/after measured + regression checks
- **Instant revert:** Restore original behavior anytime

### 3. Production-Ready Architecture
- Next.js 16 + React 19
- TypeScript strict mode
- Comprehensive test coverage (32 tests, 100% passing)
- Clean component structure
- Proper error handling
- Security best practices

## Technical Highlights

### AI Integration
- **Model:** OpenAI GPT-4o with structured output
- **Framework:** Vercel AI SDK
- **Validation:** Zod schemas
- **Tool calling:** 4 investigation tools + 1 controlled Act tool

### Investigation Tools
1. `getLeakContext` - Revenue and conversion metrics
2. `searchStorefront` - Test current search behavior  
3. `searchCatalog` - Explore product vocabulary
4. `getProductDetails` - Validate products exist

### Act Tool (Write)
- `applySearchRule` - Apply approved rule in sandbox

### Safety Mechanisms
1. **Risk Assessment:** Low/Medium/High classification
2. **Approval Tokens:** HMAC-signed with expiration
3. **Regression Detection:** Check 6+ related healthy queries
4. **Sandbox Isolation:** Changes don't affect "production"
5. **Audit Trail:** Full tool execution trace visible

## Demo Flow

The complete autonomous loop:

```
1. Dashboard shows detected opportunities
   └─ Deterministic analysis: 187 searches, 0 conversions
   
2. User clicks "Investigate"
   └─ Agent uses 4 tools to diagnose root cause
   └─ Discovers: vocabulary mismatch (canguru ≠ hoodie)
   
3. Agent proposes: "canguru" → "hoodie"  
   └─ Confidence: 92%
   └─ Risk: Low
   └─ Signed proposal generated
   
4. Human reviews and approves
   └─ Explicit click required
   
5. System applies in sandbox
   └─ Rule added to SearchConfiguration
   └─ Query re-executed: 0 → 2 products
   └─ Regression checks: 0 degradations
   └─ Validation: ✓ Passed
   
6. User sees measured before/after
   └─ Link to storefront shows real products
   
7. User can revert anytime
   └─ Original behavior restored
   └─ Confirmed with re-validation
```

## What We Built (In Scope)

✅ Deterministic revenue leak detection  
✅ Autonomous AI investigation with tool calling  
✅ Safe, controlled Act boundary  
✅ Human approval workflow  
✅ Automatic validation + regression checks  
✅ Demo storefront integration  
✅ Before/after visualization  
✅ Instant revert capability  
✅ Full test coverage  
✅ Clean, documented codebase  

## What We Didn't Build (Intentional)

❌ Real e-commerce platform integrations (Shopify, VTEX)  
❌ Production database or persistence  
❌ RAG, embeddings, vector search  
❌ Multi-agent orchestration  
❌ Authentication or multi-tenancy  
❌ A/B testing framework  

**Why?** To demonstrate the core autonomous loop with real AI reasoning and safety controls, without the complexity of production integrations.

## Code Quality

- **100% TypeScript** with strict mode
- **32 passing tests** (Vitest)
- **Zero lint errors** (ESLint + Next.js config)
- **Clean build** (Next.js production build)
- **Comprehensive documentation**
- **Clear architecture separation**

## Innovation Highlights

### 1. Grounding
Every recommendation is backed by actual tool results. The agent can't hallucinate products or rules — if it proposes `"canguru" → "hoodie"`, it's because it found real products with "hoodie" in the catalog.

### 2. Approval Tokens
Proposals are signed with HMAC using a secret key. The browser can't modify source/targets/confidence/risk without invalidating the signature. This prevents:
- Tampering with risk assessment
- Changing proposed rules
- Bypassing approval requirements

### 3. Regression Detection
Before showing "success," Carcarah tests 6+ related healthy queries to ensure the change doesn't break existing good behavior.

### 4. Audit Trail
Every tool call is logged and displayed:
- What the agent searched for
- What it found
- Why it made each decision
- Full reasoning chain visible

### 5. Reversible by Design
Every rule tracks:
- `ruleId` for identification
- `source` and `targets` for reconstruction  
- `reversible: true` flag
- `collection` for scoping

Revert reconstructs the original state and validates restoration.

## Files Structure

```
carcarah/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── investigate/     # Agent investigation
│   │   │   ├── resolve/         # Apply/revert actions
│   │   │   └── storefront/      # Demo storefront
│   │   ├── leaks/[query]/       # Leak details
│   │   └── storefront/          # NOVA demo
│   │
│   ├── lib/
│   │   ├── search-analysis/     # Leak detection
│   │   ├── investigation-agent/ # AI agent
│   │   ├── search-actions/      # Act boundary
│   │   ├── commerce-search/     # Search simulator
│   │   └── storefront-demo/     # Session state
│   │
│   └── components/              # React components
│
├── data/
│   ├── products.json            # 28 products
│   └── search-events.json       # Search analytics
│
└── tests/                       # 32 tests (100% pass)
```

## Running the Project

### Prerequisites
- Node.js 22+
- OpenAI API key

### Setup
```bash
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local
npm run dev
```

### Quality Checks
```bash
npm run lint   # ✅ Passes
npm test       # ✅ 32/32 tests
npm run build  # ✅ Clean build
```

## Links

- **Live Demo:** [https://carcarah.vercel.app](https://carcarah.vercel.app)
- **Source Code:** This repository
- **Demo Video:** [Link to video]

## Team & Timeline

- **Built by:** [Your Name/Team]
- **Duration:** Hackathon duration
- **Tech Stack:** Next.js 16, React 19, OpenAI, TypeScript

## Judge Evaluation Points

### Technical Excellence
- Clean, type-safe codebase
- Comprehensive test coverage
- Real AI tool calling implementation
- Security-first architecture

### Innovation
- Autonomous agent with real reasoning
- Novel approval token mechanism
- Automatic validation + regression detection
- Complete before/after loop

### Product Quality
- Clear value proposition
- Intuitive user experience
- Professional UI/UX
- Well-documented

### Completeness
- Full working demo
- All features functional
- No critical bugs
- Ready for showcase

## Future Vision

After the hackathon, Carcarah can become:

1. **Multi-Platform Agent**
   - Shopify, VTEX, WooCommerce connectors
   - Real analytics integration (GA, Mixpanel)
   
2. **Enterprise SaaS**
   - Multi-tenant support
   - Team collaboration
   - A/B testing framework
   
3. **Agent Orchestration**
   - Inventory management agent
   - Pricing optimization agent
   - Product description agent
   
4. **LLM-Agnostic**
   - Support Claude, Gemini, Llama
   - Model router based on task

---

**Carcarah demonstrates that AI agents can be autonomous, intelligent, AND safe.**

Thank you for considering our submission!
