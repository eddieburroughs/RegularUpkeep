# AI Integration Map

> **Document Version**: 2.0
> **Last Updated**: 2025-12-24
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
9. [Implementation Status](#implementation-status)

---

## Executive Summary

**The RegularUpkeep codebase has extensive AI infrastructure already built.** Full audit completed 2025-12-24.

### Key Findings

| Area | Status |
|------|--------|
| AI SDK packages | **Installed** (`openai`, `@anthropic-ai/sdk`) |
| AI provider abstraction | **Complete** (`src/lib/ai/`) |
| Prompt templates | **Complete** (13 task types) |
| Rate limiting | **Complete** (per-minute + daily database limits) |
| Cost tracking | **Complete** (`ai_jobs`, `ai_daily_metrics` tables) |
| Feature flags | **All 7 exist** in `admin_config` |
| AI API routes | **10+ routes** implemented |
| AI UI components | **15+ components** implemented |

### What Needs Work

- Enable and test disabled feature flags
- Add unit tests for AI edge cases
- End-to-end testing of AI flows
- Performance optimization for AI responses

---

## Current AI Infrastructure

### AI Provider Layer (`src/lib/ai/`)

| File | Purpose | Status |
|------|---------|--------|
| `gateway.ts` | Central AI request handler with rate limiting, consent checks, logging | **Complete** |
| `providers/index.ts` | Provider abstraction (OpenAI, Anthropic, mock) | **Complete** |
| `providers/openai.ts` | OpenAI GPT-4 Vision implementation | **Complete** |
| `providers/anthropic.ts` | Claude implementation | **Complete** |
| `providers/mock.ts` | Mock provider for testing | **Complete** |
| `tasks/index.ts` | Task type registry | **Complete** |

### AI Task Types (13 Total)

| Task Type | Description | Feature Flag |
|-----------|-------------|--------------|
| `homeowner_classification` | Classify service requests from photos/description | `ai_intake_enabled` |
| `homeowner_follow_up` | Generate follow-up questions | `ai_intake_enabled` |
| `homeowner_safety_check` | Detect safety hazards (gas, electrical, flooding) | `ai_intake_enabled` |
| `provider_brief` | Generate brief for providers | `ai_intake_enabled` |
| `estimate_draft` | Help providers draft estimates | `ai_provider_copilot_enabled` |
| `message_draft` | Draft professional messages | `ai_provider_copilot_enabled` |
| `invoice_narrative` | Generate work summary narratives | `ai_provider_copilot_enabled` |
| `crm_next_action` | Suggest CRM follow-up actions | `ai_crm_copilot_enabled` |
| `maintenance_plan` | Generate seasonal maintenance plans | `ai_maintenance_coach_enabled` |
| `sponsor_copy` | Generate ad copy variants | `ai_sponsor_copy_enabled` |
| `dispute_summary` | Summarize disputes for admin | `ai_admin_triage_enabled` |
| `fraud_detection` | Detect referral fraud signals | `ai_admin_triage_enabled` |
| `provider_insights` | Provider quality insights | `ai_admin_triage_enabled` |

### Database Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `ai_jobs` | Log all AI requests (user, task type, status, cost) | **Complete** |
| `ai_outputs` | Store AI outputs linked to jobs | **Complete** |
| `ai_feedback` | User thumbs up/down feedback | **Complete** |
| `ai_policy_events` | Blocked content logging | **Complete** |
| `ai_daily_usage` | Per-user daily usage tracking | **Complete** |
| `ai_daily_metrics` | Platform-wide daily metrics | **Complete** |
| `ai_cleanup_log` | Retention cleanup audit log | **Complete** |
| `user_preferences` | User AI consent preferences | **Complete** |

### AI API Routes

| Route | Purpose | Status |
|-------|---------|--------|
| `/api/ai/classify` | Classify service request | **Complete** |
| `/api/ai/follow-up` | Generate follow-up questions | **Complete** |
| `/api/ai/provider-brief` | Generate provider brief | **Complete** |
| `/api/provider/estimate-draft` | AI estimate suggestions | **Complete** |
| `/api/provider/message-draft` | AI message drafts | **Complete** |
| `/api/provider/invoice-narrative` | AI work summaries | **Complete** |
| `/api/provider/crm/next-action` | CRM suggestions | **Complete** |
| `/api/properties/[id]/maintenance-plan` | Maintenance coach | **Complete** |
| `/api/sponsor/campaigns/[id]/copy` | Sponsor copy generation | **Complete** |
| `/api/admin/disputes/[id]/ai-summary` | Dispute summarization | **Complete** |
| `/api/admin/referrals/[id]/fraud-check` | Fraud detection | **Complete** |
| `/api/admin/providers/[id]/insights` | Provider insights | **Complete** |
| `/api/user/ai-preferences` | User consent management | **Complete** |
| `/api/admin/ai-ops` | Admin AI metrics dashboard | **Complete** |
| `/api/ai/feedback` | Feedback collection | **Complete** |
| `/api/cron/ai-cleanup` | Data retention cleanup | **Complete** |

### AI UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `AIClassificationCard` | `src/components/ai-intake/classification-card.tsx` | Display AI classification |
| `AIFollowUpQuestions` | `src/components/ai-intake/follow-up-questions.tsx` | Show/collect follow-ups |
| `SafetyWarning` | `src/components/ai-intake/safety-warning.tsx` | Display safety alerts |
| `VoiceNoteRecorder` | `src/components/ai-intake/voice-note-recorder.tsx` | Voice input for emergencies |
| `EmergencyChecklist` | `src/components/ai-intake/emergency-checklist.tsx` | Emergency bypass checklist |
| `AIEstimateDraft` | `src/components/provider/ai-estimate-draft.tsx` | AI estimate suggestions |
| `AIMessageDraft` | `src/components/provider/ai-message-draft.tsx` | AI message drafts |
| `AIInvoiceNarrative` | `src/components/provider/ai-invoice-narrative.tsx` | Work summary generator |
| `MissingInfoChecker` | `src/components/provider/missing-info-checker.tsx` | Hard + soft info checks |
| `CrmSuggestionsPanel` | `src/components/provider/crm-suggestions-panel.tsx` | CRM AI suggestions |
| `MaintenanceCoachPanel` | `src/components/homeowner/maintenance-coach-panel.tsx` | Seasonal recommendations |
| `SponsorCopyEditor` | `src/components/sponsor/sponsor-copy-editor.tsx` | AI copy variants |
| `AIFeedback` | `src/components/ai/ai-feedback.tsx` | Thumbs up/down component |
| `AdminAIOpsTab` | `src/app/app/admin/ai-ops/page.tsx` | AI operations dashboard |

---

## Integration Points by AI Feature

### A. AI Intake (Homeowner Service Requests)

**Status**: **COMPLETE** - Behind `ai_intake_enabled` flag (currently enabled)

**Flow**:
```
Upload Photos → AI Classification → Safety Check → Follow-up Questions → Provider Brief
```

**Files**:
| File | Line(s) | Integration |
|------|---------|-------------|
| `src/app/app/requests/new/page.tsx` | 50-200 | Main flow orchestration |
| `src/components/ai-intake/classification-card.tsx` | * | Classification display |
| `src/components/ai-intake/follow-up-questions.tsx` | * | Q&A collection |
| `src/components/ai-intake/safety-warning.tsx` | * | Safety alerts |
| `src/app/api/ai/classify/route.ts` | * | Classification endpoint |
| `src/app/api/ai/follow-up/route.ts` | * | Follow-up generation |
| `src/app/api/ai/provider-brief/route.ts` | * | Brief generation |

**Safety Features**:
- Gas leak detection → Emergency services prompt
- Electrical hazards → Professional warning
- Flooding → Water shutoff guidance

### B. Provider AI Copilot

**Status**: **COMPLETE** - Behind `ai_provider_copilot_enabled` flag (currently disabled)

**Features**:
1. Estimate Draft - AI suggests line items and scope
2. Message Draft - Professional message templates
3. Invoice Narrative - Work summary generation

**Files**:
| File | Integration |
|------|-------------|
| `src/app/provider/jobs/[id]/page.tsx` | AI estimate button |
| `src/app/provider/messages/[id]/page.tsx` | AI draft reply button |
| `src/app/provider/jobs/[id]/complete/page.tsx` | AI work summary |
| `src/components/provider/ai-estimate-draft.tsx` | Estimate UI |
| `src/components/provider/ai-message-draft.tsx` | Message UI |
| `src/components/provider/ai-invoice-narrative.tsx` | Summary UI |

**Safety Rules**:
- Never include prices in AI output (provider adds)
- No pricing promises in messages
- No code compliance claims unless provider confirms
- All drafts editable before sending

### C. CRM Copilot (Provider)

**Status**: **COMPLETE** - Behind `ai_crm_copilot_enabled` flag (currently disabled)

**Features**:
- Next best action suggestions
- Churn risk detection
- Upsell opportunities
- Customer health scores

**Files**:
| File | Integration |
|------|-------------|
| `src/app/provider/crm/page.tsx` | CRM dashboard |
| `src/components/provider/crm-suggestions-panel.tsx` | Suggestions UI |
| `src/app/api/provider/crm/next-action/route.ts` | API endpoint |

### D. Maintenance Coach (Homeowner)

**Status**: **COMPLETE** - Behind `ai_maintenance_coach_enabled` flag (currently disabled)

**Features**:
- Seasonal task recommendations
- Priority repairs identification
- Premium: Printable quarterly checklist

**Files**:
| File | Integration |
|------|-------------|
| `src/app/app/properties/[id]/page.tsx` | Property detail |
| `src/components/homeowner/maintenance-coach-panel.tsx` | Coach UI |
| `src/app/api/properties/[id]/maintenance-plan/route.ts` | API endpoint |

### E. Sponsor Copy (Advertisers)

**Status**: **COMPLETE** - Behind `ai_sponsor_copy_enabled` flag (currently disabled)

**Features**:
- Multiple copy variants (headlines, CTAs, descriptions)
- Compliance checking
- Brand guidelines support

**Files**:
| File | Integration |
|------|-------------|
| `src/app/sponsor/campaigns/[id]/page.tsx` | Campaign editor |
| `src/components/sponsor/sponsor-copy-editor.tsx` | Copy UI |
| `src/app/api/sponsor/campaigns/[id]/copy/route.ts` | API endpoint |

### F. Admin AI Triage

**Status**: **COMPLETE** - Behind `ai_admin_triage_enabled` flag (currently disabled)

**Features**:
- Dispute timeline summarization
- Refund recommendations
- Fraud signal detection
- Provider quality insights

**Files**:
| File | Integration |
|------|-------------|
| `src/app/app/admin/disputes/[id]/page.tsx` | Dispute detail |
| `src/app/app/admin/referrals/page.tsx` | Referral management |
| `src/app/app/admin/providers/[id]/page.tsx` | Provider profile |

---

## What We Can Reuse As-Is

### Infrastructure (100% Reusable)

| Component | Path | Notes |
|-----------|------|-------|
| AI Gateway | `src/lib/ai/gateway.ts` | Rate limiting, logging, consent |
| Provider Abstraction | `src/lib/ai/providers/` | OpenAI + Anthropic ready |
| Task Registry | `src/lib/ai/tasks/` | 13 task types defined |
| Feature Flags | `src/lib/config/admin-config.ts` | All 7 AI flags exist |
| Rate Limiting | Per-minute (memory) + Daily (DB) | Complete |
| Cost Tracking | `ai_jobs` + `ai_daily_metrics` | Complete |
| Consent System | `user_preferences` table | Complete |
| Feedback System | `ai_feedback` table + component | Complete |
| Cleanup Cron | `/api/cron/ai-cleanup` | Complete |

### Database Schema (No Changes Needed)

| Table | Purpose |
|-------|---------|
| `service_requests` | Has `ai_*` fields for AI data |
| `ai_jobs` | AI request logging |
| `ai_outputs` | AI output storage |
| `ai_feedback` | User feedback |
| `ai_policy_events` | Content moderation logs |
| `ai_daily_usage` | Per-user usage |
| `ai_daily_metrics` | Platform metrics |
| `user_preferences` | Consent tracking |

### API Patterns (Reuse)

| Pattern | Location | Notes |
|---------|----------|-------|
| AI Gateway wrapper | `src/lib/ai/gateway.ts` | All routes use this |
| Feature flag checking | `isFeatureEnabled()` | Consistent pattern |
| Error handling | JSON error responses | Consistent |
| Cost calculation | Gateway handles | Automatic |

---

## Minimal Refactors Required

### 1. Enable Disabled Features

**Action**: Set flags to `true` in admin config or database

| Flag | Current | Action |
|------|---------|--------|
| `ai_intake_enabled` | `true` | Already enabled |
| `ai_media_quality_enabled` | `false` | Enable when ready |
| `ai_provider_copilot_enabled` | `false` | Enable when ready |
| `ai_admin_triage_enabled` | `false` | Enable when ready |
| `ai_crm_copilot_enabled` | `false` | Enable when ready |
| `ai_maintenance_coach_enabled` | `false` | Enable when ready |
| `ai_sponsor_copy_enabled` | `false` | Enable when ready |

### 2. Add Missing Tests

**Status**: 47 tests exist, but more edge cases needed

| Test Area | Status | Needed |
|-----------|--------|--------|
| Media validation | Complete | - |
| AI fallback | Complete | - |
| Rate limiting | Partial | Add exhaustion tests |
| Consent flows | Partial | Add opt-out tests |
| Cost tracking | Partial | Add budget limit tests |

### 3. Performance Optimization

| Area | Current | Improvement |
|------|---------|-------------|
| AI response time | ~2-5s | Add caching for common queries |
| Image processing | Serial | Parallelize multi-image analysis |
| Prompt length | Variable | Optimize token usage |

---

## Deprecation Candidates

> **Note**: Do NOT delete immediately. Mark as deprecated, monitor, remove in future release.

### Files to Deprecate Later

| File | Reason | When to Remove |
|------|--------|----------------|
| `src/app/api/ai/analyze-media/route.ts` | Old placeholder, replaced by `/api/ai/classify` | After verifying no references |

### Code Patterns to Deprecate Later

| Pattern | Location | Replacement |
|---------|----------|-------------|
| Hardcoded mock responses | Old analyze-media route | Now uses real AI |

---

## Data Flow Diagrams

### Complete AI-Enhanced Service Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AI-ENHANCED SERVICE REQUEST LIFECYCLE                     │
└─────────────────────────────────────────────────────────────────────────────────┘

1. INTAKE AI (ai_intake_enabled)
   ┌────────────┐    ┌────────────┐    ┌─────────────────┐    ┌──────────────────┐
   │ Homeowner  │───►│ Upload     │───►│ AI Classification│───►│ Safety Check     │
   │ Starts     │    │ Photos     │    │ /api/ai/classify │    │ (Gas/Elec/Water) │
   └────────────┘    └────────────┘    └─────────────────┘    └────────┬─────────┘
                                                                       │
                                              ┌────────────────────────┘
                                              ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  If Safety Hazard Detected:                                                   │
   │  ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────────┐   │
   │  │ SafetyWarning    │───►│ Emergency Guidance │───►│ Continue or         │   │
   │  │ Component        │    │ (Shutoffs, 911)    │    │ Emergency Exit      │   │
   │  └──────────────────┘    └────────────────────┘    └─────────────────────┘   │
   └──────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  Follow-up Questions:                                                         │
   │  ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────────┐   │
   │  │ AI Generates     │───►│ User Answers       │───►│ Stored in           │   │
   │  │ /api/ai/follow-up│    │ Questions          │    │ ai_follow_up_answers│   │
   │  └──────────────────┘    └────────────────────┘    └─────────────────────┘   │
   └──────────────────────────────────────────────────────────────────────────────┘
                                              │
2. PROVIDER BRIEF GENERATION                  ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  ┌────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐   │
   │  │ Combine:       │───►│ /api/ai/            │───►│ Store in             │   │
   │  │ - Classification│    │ provider-brief      │    │ ai_provider_brief    │   │
   │  │ - Answers      │    └─────────────────────┘    └──────────────────────┘   │
   │  │ - Media URLs   │                                                          │
   │  └────────────────┘                                                          │
   └──────────────────────────────────────────────────────────────────────────────┘
                                              │
3. PROVIDER COPILOT (ai_provider_copilot_enabled)
                                              ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  ┌────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐   │
   │  │ Provider Views │───►│ AI Estimate Draft   │───►│ Provider Edits       │   │
   │  │ Job + Brief    │    │ /api/provider/      │    │ and Sends            │   │
   │  │                │    │ estimate-draft      │    │                      │   │
   │  └────────────────┘    └─────────────────────┘    └──────────────────────┘   │
   │                                                                               │
   │  Safety Rules:                                                                │
   │  - Never includes prices (provider adds)                                      │
   │  - All drafts editable before sending                                         │
   │  - No compliance claims without confirmation                                  │
   └──────────────────────────────────────────────────────────────────────────────┘
                                              │
4. PAYMENT FLOW (Existing - Stripe Integration)
                                              ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  Estimate Sent → Customer Approves → Payment Authorized (20% buffer, $250 cap)│
   │       ↓                                                                       │
   │  Work Completed → Invoice Submitted → 24h Auto-Approve → Payment Captured     │
   │       ↓                                                                       │
   │  72h Dispute Window → Provider Transfer (or Instant +1% fee)                  │
   └──────────────────────────────────────────────────────────────────────────────┘
                                              │
5. INVOICE AI (ai_provider_copilot_enabled)   ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  ┌────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐   │
   │  │ Provider       │───►│ AI Work Summary     │───►│ Professional         │   │
   │  │ Completes Work │    │ /api/provider/      │    │ Narrative Added      │   │
   │  │                │    │ invoice-narrative   │    │                      │   │
   │  └────────────────┘    └─────────────────────┘    └──────────────────────┘   │
   └──────────────────────────────────────────────────────────────────────────────┘
                                              │
6. DISPUTE AI (ai_admin_triage_enabled)       ▼
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  ┌────────────────┐    ┌─────────────────────┐    ┌──────────────────────┐   │
   │  │ Customer Opens │───►│ AI Dispute Summary  │───►│ Admin Reviews        │   │
   │  │ Dispute        │    │ /api/admin/disputes/│    │ with AI Insights     │   │
   │  │                │    │ [id]/ai-summary     │    │                      │   │
   │  └────────────────┘    └─────────────────────┘    └──────────────────────┘   │
   │                                                                               │
   │  AI Outputs:                                                                  │
   │  - Timeline summary                                                           │
   │  - Scope vs invoice comparison                                                │
   │  - Refund recommendation                                                      │
   │  - Risk assessment                                                            │
   └──────────────────────────────────────────────────────────────────────────────┘
```

### AI Operations Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AI OPERATIONS FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
  │ AI Request  │───►│ Gateway Check    │───►│ Rate Limit      │
  │ (any route) │    │ src/lib/ai/      │    │ Check           │
  └─────────────┘    │ gateway.ts       │    │ (per-min + daily│
                     └──────────────────┘    └────────┬────────┘
                                                      │
                     ┌────────────────────────────────┘
                     ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  Consent Check:                                                               │
  │  ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────────┐   │
  │  │ Check user_      │───►│ If consent=false   │───►│ Return rule-based   │   │
  │  │ preferences      │    │ Skip AI            │    │ fallback            │   │
  │  └──────────────────┘    └────────────────────┘    └─────────────────────┘   │
  └──────────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼ (If consent OK)
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  Provider Selection:                                                          │
  │  ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────────┐   │
  │  │ Task Type        │───►│ Select Provider    │───►│ OpenAI / Anthropic  │   │
  │  │ Definition       │    │ (config or env)    │    │ / Mock              │   │
  │  └──────────────────┘    └────────────────────┘    └─────────────────────┘   │
  └──────────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  Logging & Cost Tracking:                                                     │
  │  ┌──────────────────┐    ┌────────────────────┐    ┌─────────────────────┐   │
  │  │ Create ai_jobs   │───►│ Execute AI Call    │───►│ Update ai_jobs      │   │
  │  │ record           │    │                    │    │ + ai_daily_metrics  │   │
  │  └──────────────────┘    └────────────────────┘    └─────────────────────┘   │
  └──────────────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │  Admin Monitoring:                                                            │
  │  ┌──────────────────────────────────────────────────────────────────────┐    │
  │  │ /app/admin/ai-ops                                                    │    │
  │  │ - Daily spend vs budget                                              │    │
  │  │ - 7-day cost trend                                                   │    │
  │  │ - Top task types                                                     │    │
  │  │ - Alert at 75% budget                                                │    │
  │  └──────────────────────────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Flags

### Current Status (All Exist)

| Flag | Config Key | Default | Status |
|------|------------|---------|--------|
| AI Intake | `ai_intake_enabled` | `true` | **ENABLED** |
| AI Media Quality | `ai_media_quality_enabled` | `false` | Disabled |
| AI Provider Copilot | `ai_provider_copilot_enabled` | `false` | Disabled |
| AI Admin Triage | `ai_admin_triage_enabled` | `false` | Disabled |
| AI CRM Copilot | `ai_crm_copilot_enabled` | `false` | Disabled |
| AI Maintenance Coach | `ai_maintenance_coach_enabled` | `false` | Disabled |
| AI Sponsor Copy | `ai_sponsor_copy_enabled` | `false` | Disabled |

### Flag Location

All flags are defined in:
- **Interface**: `src/types/database.ts` → `FeatureFlagsConfig`
- **Defaults**: `src/lib/config/admin-config.ts` → `DEFAULT_CONFIG.feature_flags`
- **Runtime**: `admin_config` table → `config_key = 'feature_flags'`

### Usage Pattern

```typescript
import { isFeatureEnabled } from "@/lib/config/admin-config";

// In API route or component
const aiEnabled = await isFeatureEnabled("ai_provider_copilot_enabled");
if (!aiEnabled) {
  return fallbackBehavior();
}
```

---

## Implementation Status

### Completed (Ready to Enable)

| Feature | Implementation | Tests | Enable When |
|---------|----------------|-------|-------------|
| AI Intake | 100% | 47 tests | **Already enabled** |
| Provider Copilot | 100% | Included | Ready now |
| CRM Copilot | 100% | Included | Ready now |
| Maintenance Coach | 100% | Included | Ready now |
| Sponsor Copy | 100% | Included | Ready now |
| Admin Triage | 100% | Included | Ready now |
| AI Ops Dashboard | 100% | N/A | Always on for admins |
| Rate Limiting | 100% | Partial | Always on |
| Cost Tracking | 100% | Partial | Always on |
| Consent System | 100% | Partial | Always on |
| Cleanup Cron | 100% | N/A | Runs daily |

### Not Yet Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| AI Media Quality | Placeholder | Needs quality assessment prompts |
| Real-time Chat AI | Not started | Future enhancement |
| AI Invoice Review | Not started | Future enhancement |

### Recommended Enablement Order

1. **Phase 1** (Immediate): Already done
   - `ai_intake_enabled` ✓

2. **Phase 2** (Next Sprint):
   - `ai_provider_copilot_enabled` - High provider value
   - `ai_admin_triage_enabled` - Reduces admin workload

3. **Phase 3** (Following Sprint):
   - `ai_crm_copilot_enabled` - Provider retention
   - `ai_maintenance_coach_enabled` - Homeowner retention

4. **Phase 4** (Future):
   - `ai_sponsor_copy_enabled` - Lower priority
   - `ai_media_quality_enabled` - Needs more work

---

## Acceptance Criteria (Per Feature)

Before enabling any AI feature flag:

- [x] Feature flag controls enable/disable
- [x] Graceful fallback when AI unavailable
- [x] Error handling with user-friendly messages
- [x] Cost tracking per AI call
- [x] Rate limiting in place
- [x] Existing flow unchanged when AI disabled
- [ ] Tests cover AI success and failure paths (partial)
- [x] Prompt templates externalized
- [x] No hardcoded API keys
- [x] User consent respected

---

*Document maintained by: Engineering Team*
*Last updated: 2025-12-24*
