# AI Integration Map

> **Document Version**: 1.0
> **Created**: 2025-12-23
> **Purpose**: Pre-AI audit mapping what exists, what to reuse, what to refactor

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current AI Infrastructure](#current-ai-infrastructure)
3. [Integration Points by AI Feature](#integration-points-by-ai-feature)
4. [What We Can Reuse As-Is](#what-we-can-reuse-as-is)
5. [Minimal Refactors Required](#minimal-refactors-required)
6. [Deprecation Candidates](#deprecation-candidates)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [Feature Flags](#feature-flags)
9. [Implementation Priority](#implementation-priority)

---

## Executive Summary

The RegularUpkeep codebase is **architecturally ready** for AI integration. Key findings:

- **Existing AI stub** at `/api/ai/analyze-media` returns placeholder responses - ready to connect to real AI
- **Feature flag system** already has `ai_intake_enabled` flag
- **No AI SDKs installed** - need to add `openai` or `@anthropic-ai/sdk`
- **No AI API keys configured** - need `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- **198 TypeScript files** total, well-organized codebase
- **All major flows are complete**: service requests, estimates, invoices, disputes, messaging, dashboards

---

## Current AI Infrastructure

### Existing Files

| File | Status | Purpose |
|------|--------|---------|
| `src/app/api/ai/analyze-media/route.ts` | **Placeholder** | Image analysis API - returns category-specific mock responses |
| `src/components/service-request/ai-assisted-description.tsx` | **Active** | UI component for AI-assisted service descriptions |
| `src/lib/config/admin-config.ts` | **Active** | Contains `ai_intake_enabled` feature flag |
| `src/types/database.ts` | **Active** | Has `FeatureFlagsConfig` interface with `ai_intake_enabled` |

### Missing Infrastructure

| Item | Action Required |
|------|-----------------|
| AI SDK package | Install `openai` or `@anthropic-ai/sdk` |
| API key env var | Add `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` to `.env.local` |
| AI provider abstraction | Create `src/lib/ai/` with provider-agnostic interface |
| Prompt templates | Create `src/lib/ai/prompts/` directory |
| Token/cost tracking | Add to `transactions` table or new `ai_usage` table |

---

## Integration Points by AI Feature

### 1. AI Intake (Service Request Creation)

**Current Flow:**
```
User selects category → Uploads media → AI analyzes photos → Suggests description → User refines → Submits
```

**Files to Modify:**

| File | Line(s) | Change |
|------|---------|--------|
| `src/app/api/ai/analyze-media/route.ts` | 35-143 | Replace mock responses with real AI vision call |
| `src/app/app/requests/new/page.tsx` | 385-410 | Already integrated - no changes needed |
| `src/components/service-request/ai-assisted-description.tsx` | 140-175 | Already integrated - no changes needed |

**Database Fields (Already Exist):**
- `service_requests.ai_summary` - AI-generated summary
- `service_requests.ai_follow_up_questions` - Generated clarifying questions
- `service_requests.ai_follow_up_answers` - User responses
- `service_requests.ai_provider_brief` - Brief for provider
- `service_requests.ai_processing_status` - Processing state

### 2. AI Media Quality Check

**Current Flow:**
```
User uploads photo → Manual requirements check → Submit if met
```

**Target Flow:**
```
User uploads photo → AI validates quality/relevance → Feedback if poor → Submit
```

**Files to Create/Modify:**

| File | Action |
|------|--------|
| `src/app/api/ai/validate-media/route.ts` | **Create** - Quality validation endpoint |
| `src/components/service-request/media-upload.tsx:107-128` | Modify - Call validation before accepting upload |
| `src/lib/ai/prompts/media-quality.ts` | **Create** - Prompt template for quality check |

### 3. AI Provider Copilot

**Current Flow:**
```
Provider receives job → Views details → Creates estimate manually
```

**Target Flow:**
```
Provider receives job → AI analyzes request → Suggests estimate → Provider refines
```

**Files to Create/Modify:**

| File | Action |
|------|--------|
| `src/app/api/ai/estimate-assist/route.ts` | **Create** - Estimate generation endpoint |
| `src/app/provider/jobs/[id]/job-detail-client.tsx` | Modify - Add AI estimate button |
| `src/components/provider/ai-estimate-generator.tsx` | **Create** - UI for AI estimate suggestions |

### 4. AI Admin Triage

**Current Flow:**
```
Admin manually reviews requests → Assigns to providers
```

**Target Flow:**
```
Request submitted → AI categorizes/prioritizes → Suggests provider matches → Admin confirms
```

**Files to Create/Modify:**

| File | Action |
|------|--------|
| `src/app/api/ai/triage/route.ts` | **Create** - Auto-triage endpoint |
| `src/app/app/admin/page.tsx:300-400` | Modify - Add AI triage panel |
| `src/components/admin/ai-triage-queue.tsx` | **Create** - Triage queue component |

### 5. AI CRM Copilot (Provider)

**Current Flow:**
```
Provider views CRM → Manual customer analysis → Manual follow-up decisions
```

**Target Flow:**
```
Provider views CRM → AI suggests follow-ups → AI drafts messages → Provider sends
```

**Files to Create/Modify:**

| File | Action |
|------|--------|
| `src/app/api/ai/crm-insights/route.ts` | **Create** - Customer insights endpoint |
| `src/app/provider/crm/page.tsx:291-325` | Modify - Add AI insights panel |
| `src/components/provider/ai-customer-insights.tsx` | **Create** - Insights component |

### 6. AI Maintenance Coach (Homeowner)

**Current Flow:**
```
Homeowner views dashboard → Manual maintenance planning
```

**Target Flow:**
```
Homeowner views dashboard → AI analyzes property → Suggests maintenance → Explains benefits
```

**Files to Create/Modify:**

| File | Action |
|------|--------|
| `src/app/api/ai/maintenance-coach/route.ts` | **Create** - Coaching endpoint |
| `src/app/app/page.tsx:119-148` | Modify - Add AI coach widget |
| `src/components/app/ai-maintenance-coach.tsx` | **Create** - Coach component |

### 7. AI Sponsor Ad Copy

**Current Flow:**
```
Sponsor uploads ad → Manual content creation
```

**Target Flow:**
```
Sponsor uploads product info → AI generates ad copy → Sponsor refines
```

**Files to Create/Modify:**

| File | Action |
|------|--------|
| `src/app/api/ai/generate-ad-copy/route.ts` | **Create** - Ad copy generation |
| `src/components/sponsors/ad-editor.tsx` | Modify - Add AI generation button |

---

## What We Can Reuse As-Is

### Components (No Changes Needed)

| Component | Path | Reason |
|-----------|------|--------|
| AIAssistedDescription | `src/components/service-request/ai-assisted-description.tsx` | Already consumes AI API response correctly |
| MediaUpload | `src/components/service-request/media-upload.tsx` | Upload logic is AI-agnostic |
| EstimateApproval | `src/components/marketplace/estimate-approval.tsx` | UI complete, just needs AI suggestion source |
| InvoiceApproval | `src/components/marketplace/invoice-approval.tsx` | Complete as-is |
| MessageThread | `src/app/*/messages/[id]/message-thread.tsx` | AI responses can use same thread system |

### Database Schema (No Changes Needed)

| Table | Reason |
|-------|--------|
| `service_requests` | Already has `ai_*` fields for AI data |
| `estimates` | Structure supports AI-generated line items |
| `message_threads` | Can be used for AI conversations |
| `admin_config` | Feature flags ready for AI toggles |

### API Patterns (Reuse)

| Pattern | Location | Reuse For |
|---------|----------|-----------|
| Auth middleware | `src/lib/supabase/middleware.ts` | All AI endpoints |
| Config fetching | `src/lib/config/admin-config.ts:getConfig()` | AI feature flags |
| Error handling | API routes use consistent JSON responses | AI endpoints |
| Rate limiting | `src/app/api/inspection/generate-pdf/route.ts:33-42` | AI endpoints |

---

## Minimal Refactors Required

### 1. AI Provider Abstraction

**Reason**: Allow switching between OpenAI/Anthropic/others without code changes

**Create**: `src/lib/ai/provider.ts`

```typescript
// Interface for AI provider abstraction
export interface AIProvider {
  analyzeImage(imageUrls: string[], prompt: string): Promise<AIResponse>;
  generateText(prompt: string, context?: string): Promise<string>;
  embedText(text: string): Promise<number[]>;
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'openai';
  // Return appropriate implementation
}
```

**Files Affected**: Just the new file + env configuration

### 2. Prompt Management System

**Reason**: Centralize prompts for easy iteration and A/B testing

**Create**: `src/lib/ai/prompts/`

```
src/lib/ai/prompts/
├── index.ts           # Prompt registry
├── intake.ts          # Service request intake prompts
├── estimate.ts        # Estimate generation prompts
├── triage.ts          # Admin triage prompts
├── crm.ts             # CRM insights prompts
└── maintenance.ts     # Maintenance coaching prompts
```

**Files Affected**: New directory only

### 3. API Route Pattern for AI

**Reason**: Consistent error handling, rate limiting, cost tracking

**Create**: `src/lib/ai/route-helpers.ts`

```typescript
export async function withAIRateLimit(
  request: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  // Rate limiting
  // Cost tracking
  // Error handling wrapper
}
```

**Files Affected**: New file, then update AI routes to use it

---

## Deprecation Candidates

> **Note**: Do NOT delete these immediately. Mark as deprecated, monitor usage, remove in future release.

### Files to Deprecate Later

| File | Reason | When to Remove |
|------|--------|----------------|
| None currently | Codebase is clean | N/A |

### Code Patterns to Deprecate Later

| Pattern | Location | Replacement |
|---------|----------|-------------|
| Hardcoded category prompts | `src/app/api/ai/analyze-media/route.ts:35-143` | Move to prompt templates |
| Mock AI responses | Same file | Replace with real AI calls |

---

## Data Flow Diagrams

### Intake AI → Provider Brief → Estimate AI → Invoice AI → Dispute AI

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE REQUEST LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────────────────┘

1. INTAKE AI
   ┌──────────┐    ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐
   │ Homeowner│───►│ Upload Media│───►│ AI Analyze   │───►│ Generate Summary │
   │ starts   │    │ (photos)    │    │ /api/ai/     │    │ + Questions      │
   │ request  │    └─────────────┘    │ analyze-media│    └────────┬─────────┘
   └──────────┘                       └──────────────┘             │
                                                                   ▼
                                                          ┌──────────────────┐
                                                          │ User answers     │
                                                          │ follow-ups       │
                                                          └────────┬─────────┘
                                                                   │
2. PROVIDER BRIEF GENERATION                                       ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │  ┌────────────────┐    ┌─────────────────┐    ┌───────────────────────┐  │
   │  │ Combine:       │───►│ AI Generate     │───►│ Store in              │  │
   │  │ - AI summary   │    │ Provider Brief  │    │ service_requests.     │  │
   │  │ - User answers │    │ /api/ai/brief   │    │ ai_provider_brief     │  │
   │  │ - Media URLs   │    └─────────────────┘    └───────────────────────┘  │
   │  └────────────────┘                                                       │
   └──────────────────────────────────────────────────────────────────────────┘
                                                                   │
3. ESTIMATE AI                                                     ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │  ┌────────────────┐    ┌─────────────────┐    ┌───────────────────────┐  │
   │  │ Provider views │───►│ AI Suggest      │───►│ Provider reviews      │  │
   │  │ job + brief    │    │ Estimate        │    │ and adjusts           │  │
   │  │                │    │ /api/ai/        │    │                       │  │
   │  │                │    │ estimate-assist │    └───────────────────────┘  │
   │  └────────────────┘    └─────────────────┘              │                │
   └─────────────────────────────────────────────────────────┼────────────────┘
                                                             │
                        ┌────────────────────────────────────┘
                        ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ PAYMENT FLOW (Existing - No AI changes needed)                            │
   │                                                                           │
   │  Estimate Sent → Customer Approves → Payment Authorized (15% buffer)      │
   │       ↓                                                                   │
   │  Work Completed → Invoice Submitted → Customer Approves → Payment Captured│
   └──────────────────────────────────────────────────────────────────────────┘
                                                             │
4. INVOICE AI (Optional Enhancement)                         ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │  ┌────────────────┐    ┌─────────────────┐    ┌───────────────────────┐  │
   │  │ Provider       │───►│ AI Validate     │───►│ Auto-flag anomalies   │  │
   │  │ submits invoice│    │ Line Items      │    │ for admin review      │  │
   │  │                │    │ /api/ai/        │    │                       │  │
   │  │                │    │ invoice-review  │    └───────────────────────┘  │
   │  └────────────────┘    └─────────────────┘                               │
   └──────────────────────────────────────────────────────────────────────────┘
                                                             │
5. DISPUTE AI                                                ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                                                                           │
   │  ┌────────────────┐    ┌─────────────────┐    ┌───────────────────────┐  │
   │  │ Customer opens │───►│ AI Analyze      │───►│ Recommend resolution  │  │
   │  │ dispute        │    │ Dispute         │    │ to admin              │  │
   │  │                │    │ /api/ai/        │    │                       │  │
   │  │                │    │ dispute-analyze │    └───────────────────────┘  │
   │  └────────────────┘    └─────────────────┘                               │
   │                                                                           │
   │  Inputs:                          Output:                                 │
   │  - Original request + photos      - Similarity score (scope vs invoice)  │
   │  - Estimate scope                 - Risk assessment                      │
   │  - Invoice line items             - Suggested resolution                 │
   │  - Completion photos              - Supporting evidence analysis         │
   │  - Dispute reason + evidence                                             │
   └──────────────────────────────────────────────────────────────────────────┘
```

### Admin Triage Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN TRIAGE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐    ┌────────────────┐    ┌─────────────────┐    ┌────────────┐
  │ New Request  │───►│ AI Triage      │───►│ Admin Dashboard │───►│ Provider   │
  │ Submitted    │    │ /api/ai/triage │    │ Review Queue    │    │ Assigned   │
  └──────────────┘    └────────────────┘    └─────────────────┘    └────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ AI Outputs:         │
                    │ - Priority score    │
                    │ - Category confirm  │
                    │ - Provider matches  │
                    │ - Urgency flag      │
                    │ - Complexity rating │
                    └─────────────────────┘
```

---

## Feature Flags

### Existing Flag

| Flag | Key | Default | Location |
|------|-----|---------|----------|
| AI Intake | `ai_intake_enabled` | `true` | `admin_config.feature_flags` |

### New Flags to Add

| Flag | Key | Default | Purpose |
|------|-----|---------|---------|
| AI Media Quality | `AI_MEDIA_QUALITY_ENABLED` | `false` | Photo quality validation |
| AI Provider Copilot | `AI_PROVIDER_COPILOT_ENABLED` | `false` | Estimate suggestions |
| AI Admin Triage | `AI_ADMIN_TRIAGE_ENABLED` | `false` | Auto-categorization |
| AI CRM Copilot | `AI_CRM_COPILOT_ENABLED` | `false` | Customer insights |
| AI Maintenance Coach | `AI_MAINTENANCE_COACH_ENABLED` | `false` | Homeowner recommendations |
| AI Sponsor Copy | `AI_SPONSOR_COPY_ENABLED` | `false` | Ad copy generation |

### Implementation Location

All flags should be added to:
- `src/types/database.ts` - `FeatureFlagsConfig` interface
- `src/lib/config/admin-config.ts` - Default values
- Admin UI at `/app/admin/config` - Toggle switches

---

## Implementation Priority

### Phase 1: Foundation (Week 1)
1. Install AI SDK (`openai` package)
2. Add `OPENAI_API_KEY` to environment
3. Create `src/lib/ai/` abstraction layer
4. Add feature flags to config
5. Update `/api/ai/analyze-media` with real AI

### Phase 2: Core Features (Weeks 2-3)
1. AI Media Quality validation
2. AI Provider Copilot (estimate suggestions)
3. AI Admin Triage

### Phase 3: Enhancement Features (Weeks 4-5)
1. AI CRM Copilot
2. AI Maintenance Coach
3. AI Sponsor Copy

### Phase 4: Advanced (Future)
1. AI Dispute Analysis
2. AI Invoice Review
3. Real-time AI chat assistant

---

## Acceptance Criteria

Before marking any AI feature as complete:

- [ ] Feature flag controls enable/disable
- [ ] Graceful fallback when AI unavailable
- [ ] Error handling with user-friendly messages
- [ ] Cost tracking per AI call
- [ ] Rate limiting in place
- [ ] Existing flow unchanged when AI disabled
- [ ] Tests cover AI success and failure paths
- [ ] Prompt templates externalized
- [ ] No hardcoded API keys

---

*Document maintained by: Engineering Team*
*Last updated: 2025-12-23*
