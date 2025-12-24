# RegularUpkeep Project Context

This file provides comprehensive context for Claude Code when working on this project.

## Project Overview

**RegularUpkeep** is a home maintenance platform connecting homeowners with service providers. Think of it as a concierge service that helps homeowners stay on top of maintenance with reminders, trusted provider connections, and coordination support.

### Business Model
- Homeowners get 1-2 homes FREE, pay $2.50/mo per additional home
- Providers join the network to receive quality leads (8% commission on jobs)
- RegularUpkeep coordinates between homeowners and providers
- Platform fees on bookings ($6-$25 based on job size)

### Service Area
Eastern North Carolina (and growing)

### User Types
1. **Homeowners (customers)** - Schedule and manage home maintenance
2. **Providers** - Professional service companies (plumbing, HVAC, electrical, etc.)
3. **Handymen** - Individual contractors for general maintenance
4. **Admins** - Internal staff managing the platform
5. **Territory Managers** - Regional oversight
6. **Franchisees** - Future franchise operators

## Brand Information

```
Name: RegularUpkeep
Tagline: "AI-powered home maintenance made simple"
Phone: 888-502-UPKEEP (8753)
Email: info@regularupkeep.com
Website: https://regularupkeep.com
App: https://app.regularupkeep.com
```

### Brand Assets
- Logo with text: `/public/brand/regularupkeep-logo1.svg`
- Mascot only: `/public/brand/regularupkeep-mascot.png` (1024x1024)
- Favicon: `/src/app/favicon.ico` (synced with marketing site)

## Technical Architecture

### Stack
- **Framework**: Next.js 16 with App Router
- **Database/Auth**: Supabase (self-hosted)
- **UI Components**: shadcn/ui with Tailwind CSS
- **Validation**: Zod schemas
- **Deployment**: PM2 on VPS with nginx reverse proxy

### Domains & Servers

| Domain | Purpose | Port | PM2 Process |
|--------|---------|------|-------------|
| `regularupkeep.com` | Marketing site | 3002 | `regularupkeep-main-app` |
| `app.regularupkeep.com` | Main application | 3002 | `regularupkeep-main-app` |
| `api.regularupkeep.com` | Supabase API (Kong) | - | Docker containers |

**Note:** Both `regularupkeep.com` and `app.regularupkeep.com` are served by the same Next.js app. Deploying once updates both sites.

### Server Paths
- **App Code**: `/root/RegularUpkeep-app/` (serves both domains)
- **Static Files (legacy)**: `/home/regularupkeep/htdocs/regularupkeep.com/` (archived)
- **Nginx Configs**: `/etc/nginx/sites-enabled/`
- **PM2 Logs**: `/root/.pm2/logs/`

## Directory Structure

```
/root/RegularUpkeep-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (marketing)/        # Marketing pages (grouped route)
│   │   ├── about/
│   │   ├── api/                # API routes
│   │   ├── app/                # Homeowner dashboard
│   │   │   ├── admin/          # Admin section
│   │   │   ├── binder/         # Home binder (documents)
│   │   │   ├── calendar/       # Maintenance calendar
│   │   │   ├── inspection/     # Home inspections
│   │   │   ├── messages/       # Messaging
│   │   │   ├── profile/        # User profile
│   │   │   ├── properties/     # Property management
│   │   │   └── requests/       # Service requests
│   │   ├── auth/               # Authentication pages
│   │   │   ├── callback/       # OAuth callback
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── signout/
│   │   ├── contact/
│   │   ├── faq/
│   │   ├── get-started/        # Role selection page
│   │   ├── handyman/           # Handyman portal
│   │   │   ├── inspection/
│   │   │   ├── jobs/
│   │   │   ├── messages/
│   │   │   ├── money/
│   │   │   ├── onboarding/
│   │   │   └── profile/
│   │   ├── how-it-works/
│   │   ├── join/[code]/        # Referral/invite codes
│   │   ├── legal/
│   │   │   ├── privacy/
│   │   │   └── terms/
│   │   ├── onboarding/         # Homeowner onboarding
│   │   │   ├── home-details/
│   │   │   ├── plan-preview/
│   │   │   ├── systems/
│   │   │   └── welcome/
│   │   ├── pricing/
│   │   ├── provider/           # Provider portal
│   │   │   ├── inspection/
│   │   │   ├── jobs/
│   │   │   ├── messages/
│   │   │   ├── money/
│   │   │   ├── onboarding/
│   │   │   ├── profile/
│   │   │   └── team/           # Team management
│   │   ├── providers/          # Marketing: provider benefits
│   │   └── services/           # Marketing: services list
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   └── marketing/          # Marketing-specific components
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       ├── hero.tsx
│   │       ├── cta-band.tsx
│   │       ├── mobile-cta-bar.tsx
│   │       └── pricing-cards.tsx
│   │
│   ├── content/
│   │   └── site.ts             # SINGLE SOURCE OF TRUTH for all site content
│   │                           # (brand info, pricing, services, FAQs, etc.)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Browser client
│   │   │   ├── server.ts       # Server client
│   │   │   └── middleware.ts   # Auth middleware
│   │   ├── validations/        # Zod schemas
│   │   └── utils.ts            # Utility functions
│   │
│   └── types/
│       ├── database.ts         # Supabase database types
│       └── inspection.ts       # Inspection-specific types
│
├── public/
│   └── brand/                  # Brand assets
│
├── scripts/
│   ├── deploy.sh               # Deployment with backup
│   ├── rollback.sh             # Standard rollback
│   └── emergency-rollback.sh   # Quick rollback
│
├── next.config.ts              # Next.js config (includes CSP headers)
├── tailwind.config.ts
├── package.json
└── CLAUDE.md                   # This file
```

## Database Schema (Key Tables)

### User-Related
- `profiles` - User accounts (all roles)
- `customers` - Homeowner-specific data
- `providers` - Provider company data
- `provider_members` - Provider team members

### Property-Related
- `properties` - Homes/buildings
- `property_members` - Property access (owner, manager, tenant)
- `property_systems` - HVAC, plumbing, etc. for each property

### Maintenance-Related
- `maintenance_tasks` - Scheduled maintenance items
- `service_requests` - Requests from homeowners
- `bookings` - Scheduled service appointments
- `quotes` - Price quotes from providers

### Documents
- `documents` - Receipts, warranties, manuals, etc.
- `inspections` - Home inspection reports

### Key Enums
```typescript
UserRole = "customer" | "provider" | "handyman" | "admin" | "territory_manager" | "franchisee"
PropertyType = "single_family" | "condo" | "townhouse" | "apartment" | "multi_family" | "commercial"
BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"
MaintenanceCategory = "hvac" | "plumbing" | "electrical" | "appliances" | "exterior" | "interior" | "landscaping" | "pest_control" | "safety" | "other"
```

## Authentication Flow

### Entry Points
1. **Get Started Page** (`/get-started`)
   - "I'm a Homeowner" → `/auth/register`
   - "I'm a Service Provider" → `/provider/onboarding/signup`

2. **Login** (`/auth/login`)
   - Email/password authentication
   - Redirects based on user role

3. **Provider Signup** (`/provider/onboarding/signup`)
   - Multi-step: Business info → Services & coverage
   - Creates auth user + provider record

4. **Handyman Signup** (`/handyman/onboarding/signup`)
   - Similar flow for individual contractors

### Post-Login Routing
- Customers → `/app` (homeowner dashboard)
- Providers → `/provider/jobs`
- Handymen → `/handyman/jobs`

### TODO: Social Login
Social OAuth (Google, Facebook, Apple) needs to be:
1. Configured in Supabase dashboard
2. Added to login/register pages with `signInWithOAuth`

## Deployment Commands

### Deploy (Both Sites)
```bash
cd /root/RegularUpkeep-app
npm run build
pm2 restart regularupkeep-main-app
```

This deploys to both `regularupkeep.com` and `app.regularupkeep.com` since they share the same Next.js app.

### Full Deploy with Backup
```bash
./scripts/deploy.sh
```

### Rollback
```bash
./scripts/rollback.sh           # With confirmation
./scripts/emergency-rollback.sh # Immediate
```

### View Logs
```bash
pm2 logs regularupkeep-main-app --lines 50
```

## Configuration Notes

### Content-Security-Policy (next.config.ts)
The CSP must include these for the app to work:
```
connect-src: 'self', https://*.supabase.co, wss://*.supabase.co, https://api.regularupkeep.com
img-src: 'self', data:, blob:, https://*.supabase.co, https://api.regularupkeep.com
```

### Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://api.regularupkeep.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### Nginx Configs
- `/etc/nginx/sites-enabled/app.regularupkeep.com.conf` - Main app (proxy to 3002)
- `/etc/nginx/sites-enabled/regularupkeep.com.conf` - Marketing (proxy to 3002)
- `/etc/nginx/sites-enabled/api.regularupkeep.com.conf` - Supabase API

## Pricing Model (Freemium)

### Homeowners
| Item | Price |
|------|-------|
| Base plan (1-2 homes) | FREE |
| Additional homes | +$2.50/home/mo |
| Tenant access | +$2.50/seat/mo |
| Sponsor-free experience | $25/year |

### Providers
| Tier | Price | Requirements |
|------|-------|--------------|
| Verified | $10/mo | Background check, insurance, license |
| Preferred | +$15/mo | Verified + 4.5 rating, 10 jobs, <5% disputes |

### Sponsors
- Local Sponsor: $250/year
- Realtor Referral: 50 qualified referrals = free sponsor year

### Marketplace Fees ("Profit + Risk Rails")
- **Homeowner platform fee**: $6 (<$300), $12 ($300-$1500), $25 cap (>$1500)
- **Provider commission**: 8% of commissionable subtotal ($3.50 minimum)
  - Excludes: tax, tip, permit fees
- **Instant payout**: +1% fee (requires Verified tier)

### Diagnostic Fees (Base Service Fees)
| Category | Fee | After-Hours (+35%) |
|----------|-----|-------------------|
| Handyman | $49 | $66 |
| Plumbing | $79 | $107 |
| Electrical | $79 | $107 |
| HVAC | $89 | $120 |
| Default | $59 | $80 |

- All fees creditable toward final invoice
- Refundable before provider accepts, non-refundable after
- After-hours window: 6 PM - 8 AM local time

### Payment Flow Rails
| Setting | Value |
|---------|-------|
| Estimate buffer | 20% (capped at $250) |
| Change order required | >12% OR >$75 increase |
| Auto-approve | 24 hours (if within cap, no dispute) |
| Dispute window | 72 hours after payment |
| Provider transfer | After dispute window closes |

### Proof Requirements
- Required categories: plumbing, hvac, electrical, roofing, water_damage
- Before photo: Required
- After photo: Required

### Provider Marketing Packages
- Priority Dispatch: $49/year (1.5x boost in dispatch algorithm)
- Maintenance Plans: $39-79/home/year (interior/exterior/full)
- Instant Payout: +1% per job (immediate transfer vs 72h hold)

## Service Categories

1. HVAC & Climate
2. Plumbing
3. Electrical
4. Exterior & Roofing
5. Lawn & Landscape
6. Appliances
7. Pest Control
8. Safety & Security
9. General Repairs

## Important Files to Know

| File | Purpose |
|------|---------|
| `src/content/site.ts` | ALL marketing content, pricing, FAQs, services |
| `src/lib/supabase/middleware.ts` | Auth route protection |
| `src/lib/config/admin-config.ts` | Database-backed pricing/config (no redeploy needed) |
| `src/lib/stripe/` | Stripe integration (Connect, payments, subscriptions) |
| `src/lib/ai/` | AI gateway, task definitions, provider routing |
| `src/types/database.ts` | Database schema types |
| `next.config.ts` | Security headers, image domains |
| `src/app/layout.tsx` | Root layout, metadata, fonts |

### Documentation (Handbooks & Operations)
| File | Audience | Contents |
|------|----------|----------|
| `docs/master-user-guide.md` | **All roles (unified)** | Platform overview, common features, role quick starts, unified chatbot KB |
| `docs/sop-pack.md` | **Support & Operations** | 10 SOPs, decision trees, scripts, SLA targets, chatbot KB |
| `docs/guided-tours.md` | **Product/Engineering** | 16 in-app tours, 127 steps, JSON export, instrumentation |
| `docs/media-quality-standards.md` | **All roles + Chatbot** | Photo/video standards, job-type requirements, intake form schema, 3 JSON exports |
| `docs/error-center-playbook.md` | **Support + Engineering** | 55 error codes, user/admin fixes, escalation matrix, Claude Code fix template, JSON + YAML exports |
| `docs/release-notes-system.md` | **Product Ops** | Release notes template, change taxonomy, KB update workflow, versioning rules, regression checklist, JSON automation |
| `docs/policies-pack.md` | **All Users + Support** | 8 policies (cancellation, no-show, disputes, refunds, emergency, reviews, quality), canned scripts, chatbot KB |
| `docs/homeowner-handbook.md` | Homeowners (1-2 properties) | User guide, FAQ, glossary, chatbot KB |
| `docs/multi-property-handbook.md` | Portfolio owners (3+ properties) | Scaling, delegation, reporting, chatbot KB |
| `docs/provider-handbook.md` | Service companies | Jobs, estimates, AI copilot, tiers, chatbot KB |
| `docs/handyman-handbook.md` | Individual contractors | Availability, jobs, earnings, chatbot KB |
| `docs/admin-handbook.md` | Platform admins | Operations, disputes, config, KPIs, chatbot KB |

## Cron Jobs

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/process-transfers` | Hourly | Process provider payouts after 72h dispute window |
| `/api/cron/provider-qualification` | Weekly | Check providers against Preferred tier thresholds |
| `/api/cron/referral-qualification` | Daily | Qualify referrals, award free sponsor years |
| `/api/cron/ai-cleanup` | Daily | Clean up old AI data per retention policy |

All cron jobs require `Authorization: Bearer $CRON_SECRET` header.

## Common Tasks

### Update Marketing Content
Edit `src/content/site.ts` - it contains all pricing, FAQs, services, testimonials

### Add New Page
1. Create folder in `src/app/` with `page.tsx`
2. For protected routes, add to middleware if needed

### Update Branding
1. Replace files in `public/brand/`
2. Update references in `site.ts` if filenames change

### Fix CSP Issues
Edit `next.config.ts` → `securityHeaders` → `Content-Security-Policy`

## Recent Changes Log

### 2025-12-24 (AI & Documentation)
- **Policies Pack**: Comprehensive marketplace policies for fair, simple dispute reduction
  - `docs/policies-pack.md` — 8 policies with user-facing + internal enforcement versions
  - Cancellation, No-Show, Change Order, Dispute, Refund, Emergency, Reviews, Quality
  - Edge cases and resolution guidelines for each policy
  - Canned message scripts: homeowner, provider, admin notifications
  - 28 FAQ JSON pairs + complete YAML intent map for chatbot
  - Quick reference card for support agents
- **Release Notes & Change Control System**: Product ops release management
  - `docs/release-notes-system.md` — Release notes template, change taxonomy
  - KB update workflow with feature-to-doc mapping matrix
  - Versioning rules for handbooks (MAJOR.MINOR.PATCH) and KB datasets (KB-YYYY-MM-DD-VX)
  - Doc Diff Checklist (8 sections) and Chatbot Regression Checklist (50 queries)
  - 10 sample release notes (v2.1.1 - v2.3.0)
  - JSON automation: release schema, doc diff, regression, KB workflow
- **Error Center Playbook**: Comprehensive error management for support + self-service
  - `docs/error-center-playbook.md` — 55 error codes across 12 categories
  - Categories: AUTH, ONBD, PROP, BOOK, MSG, UPLD, NOTIF, PAY, ADMIN, INTG, API, UNK
  - Each entry: user message, causes, user fix, admin fix, logs to capture, escalation
  - Error Intake Form template for admin dashboard
  - Claude Code Fix Prompt template for engineering escalation
  - JSON error catalog + YAML intent map for chatbot
- **Media Quality Standards**: Photo/video documentation requirements
  - `docs/media-quality-standards.md` — Homeowner + Provider photo guides
  - 4-Photo Rule, before/during/after standards, 8 job-type specific requirements
  - Smart Intake form template with conditional fields and AI features
  - 3 JSON exports: media checklist, job-type requirements, intake form schema
- **SOP Pack**: Complete Standard Operating Procedures for support/operations
  - `docs/sop-pack.md` — 10 SOPs covering no-shows, cancellations, disputes, fraud, etc.
  - Decision trees, customer/provider scripts, SLA targets, escalation rules
  - Chatbot KB add-on: 20 KB chunks, 35+ intent mappings
- **Guided Tours**: In-app tooltip walkthrough scripts
  - `docs/guided-tours.md` — 16 tours, 127 steps across all roles
  - JSON export for implementation (driver.js/react-joyride compatible)
  - Instrumentation suggestions with event schema and A/B testing
- **Master User Guide**: Unified documentation combining all 5 handbooks
  - `docs/master-user-guide.md` — 2,500+ lines, all roles in one document
  - Shared sections: Platform overview, pricing, payment flow, disputes, AI features
  - Role-based quick start checklists on one page
  - Unified chatbot KB: 50 KB chunks, 40 FAQ pairs, role-aware intent map
- **Hybrid AI Mode**: Implemented per-task routing between Claude 4.5 and OpenAI
  - OpenAI (gpt-4o/gpt-4o-mini): Vision tasks (photo analysis, intake classification)
  - Claude (sonnet/haiku/opus): Long-form text (estimates, messages, disputes, CRM)
  - Fallback model per task for resilience
- **Complete Handbook Suite**: Five role-based handbooks with chatbot KB add-ons:
  - `docs/homeowner-handbook.md` — 1-2 property owners (30 FAQ, 22 glossary)
  - `docs/multi-property-handbook.md` — Portfolio owners 3+ properties (30 FAQ, 25 glossary)
  - `docs/provider-handbook.md` — Service companies (25 FAQ, 20+ glossary)
  - `docs/handyman-handbook.md` — Individual contractors (25 FAQ, 23 glossary)
  - `docs/admin-handbook.md` — Platform administrators (30 FAQ, 27 glossary)
  - Each includes: JSON KB chunks, JSON FAQ pairs, YAML intent map for chatbot
- **Unified Deployment**: Both domains now served from single Next.js app
  - `regularupkeep.com` and `app.regularupkeep.com` → localhost:3002
  - Single PM2 process (`regularupkeep-main-app`)
  - Marketing app archived to `/home/regularupkeep/apps/regularupkeep-app.archived-*`

### 2025-12-24 (Profit + Risk Rails)
- **Payment Flow Rails**: 20% buffer (capped $250), 12%/$75 change order triggers, 24h auto-approve
- **Proof Requirements**: Before/after photos required for plumbing, hvac, electrical, roofing, water_damage
- **After-Hours Pricing**: 35% multiplier for 6 PM - 8 AM bookings
- **Base Fee Rules**: Creditable by default, refundable before provider accepts
- **Commissionable Excludes**: Tax, tip, permit fees excluded from provider commission
- **New Helper Functions**: `requiresChangeOrder()`, `calculateAuthorizationAmount()`, `requiresPhotoProof()`, `isAfterHours()`, `getBaseFeeRules()`

### 2025-12-24 (ADDENDUM - Monetization Hardening)
- **Homeowner Platform Fee**: Added per-booking fee ($6 for <$300, $12 for $300-$1500, $25 cap for >$1500)
- **Provider Minimum Fee**: Set $3.50 minimum on 8% commission
- **Marketing Packages**: Added Priority Dispatch ($49/yr), Maintenance Plans ($39-79/home/yr), Instant Payout (+1%)
- **Local Sponsor Tiles**: Renamed from "ads", max 8 tiles per metro, waitlist for full territories
- **Preferred Gating**: Provider tier status history logging, gating helpers for tier-locked features
- **New Tables**: provider_tier_history, provider_addons, sponsor_tile_waitlist

### 2025-12-24
- **Pricing Model**: Changed from tiered ($19/$39/$79) to freemium (2 homes free, $2.50/extra)
- **Marketplace Payment Flow**: Implemented full booking lifecycle with Stripe Connect
  - Diagnostic fee at service request
  - Estimate authorization with 15% buffer (+ platform fee)
  - Change orders for scope changes >10%
  - Invoice approval with manual capture (+ homeowner platform fee)
  - 72-hour dispute window before provider transfer (or instant with +1% fee)
- **Change Order System**: Provider can submit change orders, customer approves/rejects
- **Cron Jobs**: Added process-transfers, provider-qualification, referral-qualification
- **Referral Tracking**: Sponsor referral codes with anti-fraud qualification rules
- **Admin Dispute Resolution**: Full resolution with refunds/transfers

### 2025-12-23
- Added AI ops hardening (rate limiting, cost tracking, retention policies)
- Added AI features: Maintenance Coach, CRM Copilot, Sponsor Copy, Admin Triage

### 2025-12-20
- Fixed CSP blocking API calls (added api.regularupkeep.com to connect-src)
- Synced favicon.ico and apple-touch-icon.png from marketing site
- Created `/get-started` page with role selection (Homeowner vs Provider)
- Updated brand.authUrl and login page to use /get-started
- Added mascot logo (regularupkeep-mascot.png) above login, register, and get-started pages
- Logo links back to marketing site (regularupkeep.com)
- Updated all marketing site "Get Started" links to point to /get-started

---

*Last updated: 2025-12-24 (AI & Documentation update)*
