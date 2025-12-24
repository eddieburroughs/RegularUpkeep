# RegularUpkeep Master User Guide

**Version:** 1.0
**Last Updated:** December 2024
**Tagline:** AI-powered home maintenance made simple

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
   - [What is RegularUpkeep?](#what-is-regularupkeep)
   - [User Roles](#user-roles)
   - [How the Marketplace Works](#how-the-marketplace-works)
2. [Common Features](#2-common-features)
   - [Pricing Model](#pricing-model)
   - [Payment Flow](#payment-flow)
   - [Dispute Resolution](#dispute-resolution)
   - [Photo & Documentation Standards](#photo--documentation-standards)
   - [AI Features](#ai-features)
   - [Support & Contact](#support--contact)
3. [Role-Based Quick Start](#3-role-based-quick-start)
   - [Homeowner Quick Start](#homeowner-quick-start-1-2-properties)
   - [Multi-Property Owner Quick Start](#multi-property-owner-quick-start-3-properties)
   - [Provider Quick Start](#provider-quick-start)
   - [Handyman Quick Start](#handyman-quick-start)
   - [Admin Quick Start](#admin-quick-start)
4. [Homeowner Guide (1-2 Properties)](#4-homeowner-guide-1-2-properties)
   - [Setting Up Your Account](#setting-up-your-account)
   - [Adding Your Property](#adding-your-property)
   - [Home Systems & Appliances](#home-systems--appliances)
   - [Maintenance Calendar](#maintenance-calendar)
   - [Requesting Service](#requesting-service)
   - [Booking & Payment](#booking--payment)
   - [Home Inspections](#home-inspections)
   - [Documents & Binder](#documents--binder)
   - [Homeowner FAQ](#homeowner-faq)
5. [Multi-Property Owner Guide (3+ Properties)](#5-multi-property-owner-guide-3-properties)
   - [Portfolio Setup](#portfolio-setup)
   - [Property Naming & Organization](#property-naming--organization)
   - [Baseline Checklist Strategy](#baseline-checklist-strategy)
   - [Seasonal Maintenance Strategy](#seasonal-maintenance-strategy)
   - [Delegation & Team Access](#delegation--team-access)
   - [Bulk Operations](#bulk-operations)
   - [Reporting & Compliance](#reporting--compliance)
   - [Multi-Property FAQ](#multi-property-faq)
6. [Provider Guide](#6-provider-guide)
   - [Provider Profile Setup](#provider-profile-setup)
   - [Service Coverage & Areas](#service-coverage--areas)
   - [Getting Bookings](#getting-bookings)
   - [Estimates & Authorization](#estimates--authorization)
   - [Job Execution & Documentation](#job-execution--documentation)
   - [Invoicing & Payment](#invoicing--payment)
   - [AI Copilot Features](#ai-copilot-features)
   - [Provider Tiers](#provider-tiers)
   - [Team Management](#team-management)
   - [Provider FAQ](#provider-faq)
7. [Handyman Guide](#7-handyman-guide)
   - [Getting Started as a Handyman](#getting-started-as-a-handyman)
   - [Availability & Status](#availability--status)
   - [Accepting Jobs](#accepting-jobs)
   - [Day-of Workflow](#day-of-workflow)
   - [Safety & Professionalism](#safety--professionalism)
   - [Earnings & Ratings](#earnings--ratings)
   - [Handyman FAQ](#handyman-faq)
8. [Admin Guide](#8-admin-guide)
   - [Dashboard & Metrics](#dashboard--metrics)
   - [User Management](#user-management)
   - [Provider Management](#provider-management)
   - [Dispute Resolution](#dispute-resolution-admin)
   - [Platform Configuration](#platform-configuration)
   - [AI Operations](#ai-operations)
   - [Incident Response](#incident-response)
   - [Admin FAQ](#admin-faq)
9. [Glossary](#9-glossary)
10. [Support Chatbot Knowledge Base Export](#10-support-chatbot-knowledge-base-export)
    - [Unified KB Chunks (JSON)](#unified-kb-chunks-json)
    - [Unified FAQ Pairs (JSON)](#unified-faq-pairs-json)
    - [Unified Intent Map (YAML)](#unified-intent-map-yaml)

---

# 1. Platform Overview

## What is RegularUpkeep?

RegularUpkeep is an AI-powered home maintenance marketplace that connects homeowners with qualified service providers. The platform helps homeowners track their home systems, schedule preventive maintenance, and find reliable contractors for repairs.

**Core Value Propositions:**
- **For Homeowners:** One place to manage all home maintenance, with AI-powered recommendations and vetted providers
- **For Providers:** Qualified leads, streamlined operations, and AI tools to work more efficiently
- **For Handymen:** Flexible work assignments with clear job requirements and fair pay

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Homeowner** | Property owner managing 1-2 homes | Customer portal |
| **Multi-Property Owner** | Portfolio owner with 3+ properties | Customer portal + delegation |
| **Provider** | Service company (plumbing, HVAC, etc.) | Provider portal |
| **Handyman** | Individual contractor/technician | Mobile-first provider portal |
| **Admin** | Platform operator | Admin dashboard |
| **Territory Manager** | Regional operations manager | Admin + territory scope |
| **Franchisee** | Licensed franchise operator | Admin + franchise scope |

### Property Member Roles (for shared access)

| Role | Permissions |
|------|-------------|
| **Owner** | Full control, billing, delegation |
| **Manager** | Create requests, approve estimates, view financials |
| **Tenant** | Submit requests, view own requests only |
| **Viewer** | Read-only access to property data |

## How the Marketplace Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE REQUEST FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. HOMEOWNER SUBMITS REQUEST                                   │
│     └─> AI analyzes photos, suggests category                   │
│     └─> Safety flags detected (gas leak, electrical hazard)     │
│                                                                  │
│  2. DIAGNOSTIC FEE (if applicable)                              │
│     └─> Homeowner pays: $49-$89 based on category               │
│     └─> Fee credited toward final invoice                       │
│                                                                  │
│  3. PROVIDER MATCHED                                            │
│     └─> Based on: rating, response time, availability           │
│     └─> Provider receives AI-generated job brief                │
│                                                                  │
│  4. ESTIMATE SUBMITTED                                          │
│     └─> Provider sends scope + price                            │
│     └─> AI drafts estimate (provider reviews/edits)             │
│     └─> Homeowner approves (authorizes payment + 20% buffer)    │
│                                                                  │
│  5. WORK COMPLETED                                              │
│     └─> Provider submits invoice with photos                    │
│     └─> 24-hour auto-approve window                             │
│     └─> 72-hour dispute window after approval                   │
│                                                                  │
│  6. PAYMENT PROCESSED                                           │
│     └─> Platform fee deducted from homeowner                    │
│     └─> Provider fee (8%) deducted from provider                │
│     └─> Funds transferred after dispute window                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. Common Features

## Pricing Model

### Homeowner Pricing

| Feature | Price |
|---------|-------|
| First 2 homes | **Free** |
| Additional homes | $2.50/month each |
| Tenant access seats | $2.50/month each |
| Ad-free experience | $25/year |

### Diagnostic Fees (by category)

| Category | Fee |
|----------|-----|
| Handyman | $49 |
| Plumbing | $79 |
| Electrical | $79 |
| HVAC | $89 |
| Other categories | Varies |

> Diagnostic fees are credited toward the final invoice if you proceed with the work.

### Platform Fees (paid by homeowner)

| Invoice Amount | Platform Fee |
|----------------|--------------|
| Under $300 | $6 |
| $300 - $1,500 | $12 |
| Over $1,500 | $25 (capped) |

### Provider Fees

| Fee Type | Amount |
|----------|--------|
| Commission | 8% of invoice |
| Minimum fee | $3.50 |

### Provider Tier Pricing

| Tier | Monthly Cost | Benefits |
|------|--------------|----------|
| None | Free | Basic marketplace access |
| Verified | $10/month | Trust badge, priority in search |
| Preferred | +$15/month | Top placement, featured status |

**Add-ons:**
- Priority Dispatch: $20/month
- Instant Payout: 1.5% per transfer

## Payment Flow

### Authorization & Capture

1. **Estimate Approval** — When homeowner approves an estimate:
   - Payment is **authorized** (not charged) for estimate amount + 20% buffer
   - Buffer capped at $250 maximum
   - Authorization held for 7 days

2. **Invoice Submission** — When provider submits invoice:
   - 24-hour window for homeowner review
   - If no action: auto-approved
   - Payment is **captured** from authorization

3. **Dispute Window** — After invoice approval:
   - 72-hour window to dispute
   - Funds held during dispute resolution
   - After window: funds transferred to provider

### Change Orders

If work exceeds estimate by more than 10%:
1. Provider submits change order with justification
2. Homeowner must approve before additional work
3. New authorized amount replaces original

## Dispute Resolution

### Timeline

```
Invoice Approved ──> 72 hours ──> Dispute Window Closes ──> Provider Paid
                         │
                         └── Dispute Filed ──> Admin Review ──> Resolution
```

### Dispute Outcomes

| Outcome | Action |
|---------|--------|
| Customer Favor (Full) | Full refund, provider not paid |
| Customer Favor (Partial) | Partial refund, provider paid remainder |
| Provider Favor | Full payment to provider |
| Split Decision | Custom allocation by admin |

### What Can Be Disputed

- Work quality not matching description
- Incomplete work
- Damage caused during service
- Significant price discrepancy from estimate

### What Cannot Be Disputed

- Buyer's remorse
- Issues reported after 72-hour window
- Problems unrelated to completed work

## Photo & Documentation Standards

### Required Photos

| Stage | Minimum | Purpose |
|-------|---------|---------|
| Before | 2 photos | Document initial condition |
| During | 1 photo | Show work in progress |
| After | 2 photos | Prove completion |

### Photo Requirements

- **Resolution:** Minimum 1080p
- **Lighting:** Well-lit, details visible
- **Focus:** Sharp, not blurry
- **Framing:** Show full area of work
- **Timestamp:** Embedded in metadata (automatic)

### Video Requirements (optional)

- **Duration:** 10-30 seconds
- **Purpose:** Complex issues, before/after walkthroughs
- **Format:** MP4, MOV accepted

### Protective Notes

Always document:
- Pre-existing damage
- Areas you did NOT work on
- Customer-caused issues
- Unusual conditions

## AI Features

### AI Intake (Homeowner)
- **Photo Analysis:** AI examines uploaded photos to detect issue type
- **Smart Classification:** Suggests service category (plumbing, electrical, etc.)
- **Safety Flags:** Detects high-risk situations (gas smell, exposed wires, flooding)
- **Follow-up Questions:** AI asks clarifying questions based on initial input

### AI Maintenance Coach (Homeowner)
- Seasonal maintenance recommendations
- Property-specific task lists
- Priority repairs identification
- Printable quarterly checklists (Premium)

### AI Copilot (Provider)
- **Estimate Draft:** AI generates scope and line items from job brief
- **Message Draft:** Professional customer communication templates
- **Invoice Narrative:** Work summary generation with compliance notes

### AI CRM (Provider)
- Next best action suggestions
- Customer health scores
- Churn risk detection
- Upsell opportunity identification

### AI Safety Rules

All AI outputs follow strict safety rules:
- Never includes prices (provider adds manually)
- No pricing promises in messages
- No code compliance claims unless provider confirms
- All drafts are editable before sending
- All AI usage logged for audit

## Support & Contact

### Support Channels

| Channel | Availability | Best For |
|---------|--------------|----------|
| In-app chat | 24/7 (AI + human) | Quick questions |
| Email | Business hours | Detailed issues |
| Phone | Business hours | Urgent matters |

### Support Codes

When contacting support, provide your Support Code:
- Found in: Profile → Support → "Get Support Code"
- Valid for: 24 hours
- Contains: Anonymized context for faster resolution

### Escalation Path

1. **Tier 1:** AI chatbot / Support agent
2. **Tier 2:** Specialist (disputes, billing)
3. **Tier 3:** Territory Manager
4. **Tier 4:** Platform Admin

---

# 3. Role-Based Quick Start

## Homeowner Quick Start (1-2 Properties)

**Time to complete: 10 minutes**

- [ ] Create account with email
- [ ] Verify email address
- [ ] Add your first property (address, type, year built)
- [ ] Add 3-5 key home systems (HVAC, water heater, etc.)
- [ ] Upload one photo per system
- [ ] Review maintenance calendar
- [ ] Submit your first service request (optional)

**First Week Goals:**
- [ ] Complete property profile (75%+ complete)
- [ ] Connect at least one document (warranty, manual)
- [ ] Explore the maintenance calendar
- [ ] Download mobile app for notifications

---

## Multi-Property Owner Quick Start (3+ Properties)

**Time to complete: 30 minutes**

- [ ] Create account with email
- [ ] Verify email address
- [ ] Establish naming convention for properties
- [ ] Add first property as template
- [ ] Complete baseline checklist for template property
- [ ] Clone settings to additional properties
- [ ] Set up team roles (managers, maintenance staff)
- [ ] Configure notification preferences per role

**First Week Goals:**
- [ ] All properties added with consistent naming
- [ ] Baseline checklists completed (or scheduled)
- [ ] Team members invited and roles assigned
- [ ] Bulk maintenance schedule reviewed
- [ ] Insurance documentation uploaded

---

## Provider Quick Start

**Time to complete: 20 minutes**

- [ ] Create provider account
- [ ] Complete business profile (name, license, insurance)
- [ ] Add service categories you offer
- [ ] Define service area (zip codes or radius)
- [ ] Connect Stripe for payments
- [ ] Set availability hours
- [ ] Upload verification documents
- [ ] Enable notifications

**First Week Goals:**
- [ ] Achieve "Verified" status (complete all verification)
- [ ] Accept first job
- [ ] Submit first estimate
- [ ] Complete first invoice
- [ ] Request first review

---

## Handyman Quick Start

**Time to complete: 10 minutes**

- [ ] Create account (or accept provider invite)
- [ ] Download mobile app
- [ ] Complete profile (photo, skills, experience)
- [ ] Verify phone number
- [ ] Read photo documentation standards
- [ ] Enable location services
- [ ] Set availability to "Online"
- [ ] Wait for first job assignment

**First Day Goals:**
- [ ] Accept first job within 15 minutes of notification
- [ ] Arrive on time (within 15-minute window)
- [ ] Complete all required photos (before/during/after)
- [ ] Mark job complete in app
- [ ] Maintain 5-star rating

---

## Admin Quick Start

**Time to complete: 15 minutes**

- [ ] Access admin dashboard at `/admin`
- [ ] Review current KPIs on dashboard
- [ ] Check pending disputes queue
- [ ] Review flagged fraud signals
- [ ] Verify provider verification queue
- [ ] Check AI operations status
- [ ] Review recent user reports

**First Week Goals:**
- [ ] Resolve all pending disputes
- [ ] Process all verification requests
- [ ] Review weekly metrics report
- [ ] Check platform configuration
- [ ] Test one end-to-end transaction flow

---

# 4. Homeowner Guide (1-2 Properties)

*This section covers the core homeowner experience. For managing 3+ properties, see [Multi-Property Owner Guide](#5-multi-property-owner-guide-3-properties).*

## Setting Up Your Account

1. **Sign Up:** Visit regularupkeep.com and click "Get Started"
2. **Verify Email:** Click the link sent to your email
3. **Complete Profile:** Add your name and phone number
4. **Set Preferences:** Notification settings, communication preferences

## Adding Your Property

### Required Information
- Street address
- Property type (single-family, condo, townhouse)
- Year built
- Square footage (approximate)
- Number of bedrooms/bathrooms

### Optional Information
- Lot size
- Garage type
- Pool/spa
- Property photos

## Home Systems & Appliances

### What to Track

| Category | Examples |
|----------|----------|
| HVAC | Furnace, AC, heat pump, thermostats |
| Plumbing | Water heater, sump pump, water softener |
| Electrical | Panel, generator, EV charger |
| Appliances | Refrigerator, washer/dryer, dishwasher |
| Exterior | Roof, siding, gutters, deck |
| Safety | Smoke detectors, CO detectors, fire extinguishers |

### For Each System, Add:
- Brand and model
- Installation/purchase date
- Warranty expiration
- Last service date
- Photos (for AI analysis)

## Maintenance Calendar

The calendar shows:
- **Seasonal tasks:** Based on your location and systems
- **Manufacturer recommendations:** From your appliance data
- **AI suggestions:** Based on property age and condition

### Task Priorities
- 🔴 **Urgent:** Safety-related, overdue
- 🟡 **Soon:** Due within 30 days
- 🟢 **Scheduled:** Upcoming maintenance
- ⚪ **Optional:** Nice-to-have improvements

## Requesting Service

### Step 1: Describe the Issue
- Select category or let AI detect it
- Describe problem in your words
- Upload photos (2 minimum recommended)

### Step 2: AI Analysis
- AI examines photos and description
- May ask follow-up questions
- Detects safety issues (gas, electrical, flooding)
- Suggests urgency level

### Step 3: Review & Submit
- Confirm category and details
- Select preferred timing
- Pay diagnostic fee (if applicable)
- Request submitted to providers

## Booking & Payment

### After Submitting a Request

1. **Provider Matched:** You'll receive notification of assigned provider
2. **Estimate Received:** Review scope of work and price
3. **Approve Estimate:** Payment authorized (not charged yet)
4. **Work Scheduled:** Confirm appointment time
5. **Work Completed:** Provider submits invoice with photos
6. **Review Invoice:** 24 hours to review, then auto-approved
7. **Dispute Window:** 72 hours to raise concerns
8. **Payment Processed:** Funds released to provider

### Viewing Payment History

Navigate to: **Billing → Transaction History**

## Home Inspections

### Inspection Overview

RegularUpkeep supports comprehensive home inspections with:
- Room-by-room checklists
- Photo documentation per item
- Condition ratings
- Issue flagging

### When to Use Inspections

- Move-in/move-out documentation
- Annual property assessment
- Pre-sale preparation
- Insurance documentation

See [Payment Flow](#payment-flow) for fee structure.

## Documents & Binder

### Document Types

| Type | Examples |
|------|----------|
| Warranties | Appliance warranties, roof warranty |
| Manuals | User guides, installation instructions |
| Receipts | Purchase receipts, service invoices |
| Permits | Building permits, inspection reports |
| Insurance | Policy documents, claims |

### Organization Tips

- Name files clearly: `[System]-[Type]-[Date]`
- Example: `HVAC-Warranty-2024.pdf`
- Upload photos of physical documents
- Link documents to specific systems

## Homeowner FAQ

**Q: How many properties can I add for free?**
A: Your first 2 homes are free. Additional homes are $2.50/month each.

**Q: Can I add family members to my account?**
A: Yes. Add them as property members with appropriate roles (Manager, Tenant, or Viewer).

**Q: What if I'm not happy with the work?**
A: You have 72 hours after invoice approval to file a dispute. See [Dispute Resolution](#dispute-resolution).

**Q: How does the diagnostic fee work?**
A: The fee covers the provider's initial assessment. If you proceed with work, it's credited toward your invoice.

**Q: Can I cancel a service request?**
A: Yes, before a provider is assigned. After assignment, contact support.

**Q: What if I need emergency service?**
A: Mark your request as "Urgent" — AI will detect safety issues and prioritize accordingly.

**Q: How do I disable AI features?**
A: Go to Profile → Settings → AI Preferences and toggle off AI analysis.

**Q: Is my data private?**
A: Yes. We never share your personal information. AI analysis is opt-in. See our Privacy Policy.

---

# 5. Multi-Property Owner Guide (3+ Properties)

*This section builds on the [Homeowner Guide](#4-homeowner-guide-1-2-properties). Read that section first for basics.*

## Portfolio Setup

### Recommended Approach

1. **Start with one property** as your template
2. **Complete all systems and documents** thoroughly
3. **Clone settings** to similar properties
4. **Customize** property-specific details

### Property Limits

- 1-2 properties: Free tier
- 3+ properties: $2.50/month per additional property
- Tenant seats: $2.50/month each

## Property Naming & Organization

### Naming Convention

Use consistent naming for easy management:

```
[City/Area]-[Street Number]-[Unit]
Examples:
- Austin-1234Main
- Dallas-5678Oak-A
- Houston-9012Elm-101
```

### Grouping Strategies

| Strategy | Best For |
|----------|----------|
| By Location | Properties in different cities |
| By Type | Separating SFH from condos |
| By Status | Active, vacant, for sale |
| By Manager | Assigned to different team members |

## Baseline Checklist Strategy

### What is a Baseline Checklist?

A documented condition assessment for each property including:
- All major systems and their condition
- Existing issues or damage
- Recent maintenance history
- Warranty status

### When to Complete Baseline

- At property acquisition
- At tenant turnover
- Annually for long-term holdings

### Baseline Items

For each property, document:
- [ ] HVAC system age and condition
- [ ] Water heater age and condition
- [ ] Roof age and recent inspections
- [ ] Appliance inventory and age
- [ ] Plumbing condition
- [ ] Electrical panel capacity
- [ ] Exterior condition
- [ ] Known issues or deferred maintenance

## Seasonal Maintenance Strategy

### Quarterly Calendar

| Quarter | Focus Areas |
|---------|-------------|
| Q1 (Jan-Mar) | HVAC prep, gutter cleaning, interior systems |
| Q2 (Apr-Jun) | AC service, exterior inspection, landscaping |
| Q3 (Jul-Sep) | AC maintenance, roof inspection, pest control |
| Q4 (Oct-Dec) | Heating prep, winterization, safety checks |

### Bulk Scheduling

For portfolios, schedule similar maintenance across properties:
1. Select multiple properties
2. Choose maintenance type
3. Set date range
4. Assign to preferred provider

## Delegation & Team Access

### Team Roles

| Role | Create Requests | Approve Estimates | View Financials | Manage Team |
|------|-----------------|-------------------|-----------------|-------------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✗ |
| Tenant | ✓ (own unit) | ✗ | ✗ | ✗ |
| Viewer | ✗ | ✗ | View only | ✗ |

### Inviting Team Members

1. Navigate to: **Properties → [Property] → Team**
2. Click "Invite Member"
3. Enter email and select role
4. Set property access (all or specific)
5. Send invitation

### Best Practices

- Use Manager role for property managers
- Use Tenant role for residents (they only see their unit)
- Use Viewer role for accountants, partners
- Review team access quarterly

## Bulk Operations

### Bulk-Enabled Actions

- Create maintenance requests across multiple properties
- Export reports for property groups
- Update notification settings
- Assign providers to property groups

### Bulk Reporting

Export data across your portfolio:
- Maintenance history by property
- Spending by category
- Provider performance comparison
- System age analysis

## Reporting & Compliance

### Available Reports

| Report | Contents | Export Format |
|--------|----------|---------------|
| Maintenance History | All work orders by property | CSV, PDF |
| Spending Summary | Costs by category, property | CSV, PDF |
| Inspection Reports | Condition assessments | PDF |
| System Inventory | All tracked systems | CSV |
| Insurance Documentation | Photos, reports, receipts | PDF bundle |

### Insurance Workflow

1. **Regular Documentation:** Ensure all properties have current photos
2. **Before Incident:** Baseline photos prove pre-existing condition
3. **After Incident:** Document damage immediately
4. **Export Package:** Generate insurance-ready PDF bundle

## Multi-Property FAQ

**Q: Can I manage properties across different states?**
A: Yes. Provider availability varies by location, but you can manage properties anywhere.

**Q: How do I transfer a property to another owner?**
A: Contact support. Property history can be transferred with owner consent.

**Q: Can my property manager have their own login?**
A: Yes. Invite them with the Manager role for their assigned properties.

**Q: How do I handle tenant turnover?**
A: Remove outgoing tenant access, run move-out inspection, add incoming tenant.

**Q: Can I set spending limits for managers?**
A: Not currently. Managers can approve any estimate. [TBD — confirm in product]

**Q: How do I compare provider performance across properties?**
A: Use the Portfolio Reports section to view provider ratings and job history.

---

# 6. Provider Guide

## Provider Profile Setup

### Required Information

| Field | Description |
|-------|-------------|
| Business Name | Legal business name |
| Contact Info | Phone, email, address |
| License Number | State/local contractor license |
| Insurance | Liability insurance policy |
| Service Categories | What services you offer |
| Service Area | Where you operate |

### Verification Documents

Upload for Verified status:
- Business license
- Contractor license
- Certificate of insurance
- W-9 (for tax purposes)

## Service Coverage & Areas

### Setting Your Area

**Option 1: Zip Codes**
- List specific zip codes you serve
- Best for urban areas

**Option 2: Radius**
- Set center point and radius (miles)
- Best for suburban/rural areas

### Service Categories

Select all that apply:
- Handyman
- Plumbing
- Electrical
- HVAC
- Roofing
- Landscaping
- Cleaning
- Pest Control
- [Additional categories as available]

## Getting Bookings

### How Jobs Come to You

1. Homeowner submits service request
2. Platform matches based on:
   - Service category
   - Location
   - Your rating
   - Response time history
   - Availability
3. You receive notification
4. Accept or decline within 15 minutes

### Acceptance Rate Impact

| Acceptance Rate | Effect |
|-----------------|--------|
| 90%+ | Preferred matching priority |
| 70-89% | Standard matching |
| Below 70% | Reduced job offers |

### Response Time Impact

| Response Time | Effect |
|---------------|--------|
| Under 5 min | Preferred matching priority |
| 5-15 min | Standard matching |
| Over 15 min | Reduced job offers |

## Estimates & Authorization

### Creating an Estimate

1. Review job brief (AI-generated summary)
2. Use AI Draft or create manually
3. Add line items with descriptions
4. Set total price
5. Include timeline
6. Submit to homeowner

### AI Estimate Draft

The AI Copilot can generate a first draft:
- Based on job brief and photos
- Includes suggested scope
- Adds common line items
- **You must review and edit before sending**

### Authorization Rules

- Homeowner authorizes estimate + 20% buffer
- Buffer capped at $250
- If work exceeds buffer → submit change order
- Change orders require separate approval

### Estimate Best Practices

- Be detailed in scope description
- Break down labor and materials
- Include what's NOT covered
- Set realistic timeline
- Over-communicate rather than under-communicate

## Job Execution & Documentation

### Before Arriving

- Confirm appointment with customer
- Review job brief and estimate
- Check for any messages from customer
- Prepare materials and tools

### On Site

1. **Arrival:** Knock, introduce yourself, show ID
2. **Before Photos:** Document initial condition (minimum 2)
3. **Review Scope:** Confirm work with customer
4. **Work:** Complete job per estimate
5. **During Photos:** Document progress (minimum 1)
6. **After Photos:** Document completed work (minimum 2)
7. **Walkthrough:** Show customer completed work
8. **Sign-off:** Get verbal or in-app confirmation

### Photo Requirements

See [Photo & Documentation Standards](#photo--documentation-standards) for detailed requirements.

### Protective Notes

Document anything that protects you:
- Pre-existing damage
- Customer decisions
- Areas you didn't touch
- Unusual conditions
- Verbal agreements

## Invoicing & Payment

### Submitting an Invoice

1. Navigate to job → "Complete Job"
2. Confirm final amount
3. Upload after photos
4. Add work summary narrative
5. Submit invoice

### AI Invoice Narrative

AI can generate work summary:
- Describes what was done
- References original scope
- Notes any variations
- **Never claims code compliance unless you confirm**

### Payment Timeline

```
Invoice Submitted → 24h Review → Auto-Approve → 72h Hold → Funds Transferred
```

### Your Earnings

- Invoice amount
- Minus platform fee (8%, minimum $3.50)
- Equals your payout

### Payout Methods

- Standard: 3-5 business days after 72h hold
- Instant Payout: Same-day for 1.5% fee

## AI Copilot Features

### Available AI Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| Estimate Draft | Generate scope and line items | After reviewing job brief |
| Message Draft | Professional customer replies | When responding to messages |
| Invoice Narrative | Work summary generation | When completing jobs |

### AI Safety Rules

All AI outputs follow strict rules:
- **Never includes prices** — you add these manually
- **No pricing promises** in messages
- **No code compliance claims** unless you confirm
- **All drafts editable** before sending
- **All AI usage logged** for audit

### Using AI Effectively

1. Let AI create first draft
2. Review for accuracy
3. Edit to match actual situation
4. Add your professional judgment
5. Send when satisfied

## Provider Tiers

### Tier Comparison

| Feature | None | Verified | Preferred |
|---------|------|----------|-----------|
| Cost | Free | $10/mo | +$15/mo |
| Trust Badge | ✗ | ✓ | ✓ |
| Search Priority | Standard | Higher | Highest |
| Featured Placement | ✗ | ✗ | ✓ |
| Priority Dispatch | ✗ | ✗ | Available (+$20/mo) |

### Qualification for Preferred

- Minimum 4.5 rating
- 10+ completed jobs
- Less than 5% dispute rate
- Average response time under 4 hours
- Current Verified status

### Upgrading Your Tier

Navigate to: **Provider Portal → Billing → Upgrade**

## Team Management

### Team Roles

| Role | Accept Jobs | Create Estimates | Manage Team |
|------|-------------|------------------|-------------|
| Owner | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✗ |
| Technician | ✓ (assigned) | ✗ | ✗ |

### Adding Team Members

1. Navigate to: **Provider Portal → Team**
2. Click "Invite Team Member"
3. Enter email and role
4. Assign service categories
5. Send invitation

## Provider FAQ

**Q: How quickly must I respond to job offers?**
A: Within 15 minutes to maintain good standing. Faster response = better matching.

**Q: What if I need to cancel a job?**
A: Contact support immediately. Cancellation after acceptance affects your metrics.

**Q: How do change orders work?**
A: If work exceeds estimate by 10%+, stop and submit a change order. Customer must approve.

**Q: When do I get paid?**
A: 72 hours after invoice approval, minus 8% platform fee.

**Q: How do I dispute a customer complaint?**
A: Document everything with photos. Admin reviews both sides within 72 hours.

**Q: Can I work in multiple areas?**
A: Yes. Set multiple service areas in your profile.

**Q: How do I become Preferred?**
A: Maintain 4.5+ rating, 10+ jobs, <5% disputes, <4h response time, then apply.

---

# 7. Handyman Guide

*This guide is for individual contractors and mobile technicians working with provider companies.*

## Getting Started as a Handyman

### Account Setup

1. **Receive Invitation** from provider company, OR
2. **Create Account** as independent handyman
3. **Complete Profile:**
   - Profile photo
   - Skills and experience
   - Phone verification
4. **Download Mobile App**
5. **Enable Notifications**

### Key Differences from Provider

| Provider (Company) | Handyman (Individual) |
|-------------------|----------------------|
| Manages own estimates | Receives assigned jobs |
| Sets own pricing | Works at assigned rate |
| Manages customers | Focuses on execution |
| Handles billing | Gets paid by provider |

## Availability & Status

### Status Options

| Status | Meaning |
|--------|---------|
| 🟢 Online | Available for jobs |
| 🟡 Busy | On a job, not accepting new |
| 🔴 Offline | Not working |

### Setting Availability

1. Open app
2. Tap status toggle
3. Select new status
4. Confirm

### Best Practices

- Go Online when ready to accept jobs
- Go Offline for breaks, end of day
- Update immediately if plans change
- Keep location services enabled

## Accepting Jobs

### Job Notification

When assigned a job, you'll see:
- Customer name and address
- Service type
- Scheduled time
- Any special instructions
- Photos of issue

### Accept/Decline

- **Accept:** Tap to confirm, job added to your schedule
- **Decline:** Provide reason (optional), job reassigned

### Response Time Goal

- Accept/decline within **15 minutes**
- Faster response = more job offers
- No response = automatic decline

## Day-of Workflow

### Before Leaving

1. Check job details in app
2. Review photos and instructions
3. Confirm materials needed
4. Check route/traffic

### Arrival Protocol

1. Park appropriately (not blocking)
2. Knock/ring doorbell
3. Introduce yourself: "Hi, I'm [Name] from RegularUpkeep"
4. Show ID if requested
5. Confirm scope with customer

### During Job

1. **Before Photos:** Document condition (2 minimum)
2. **Work:** Complete assigned tasks
3. **During Photos:** Show progress (1 minimum)
4. **Changes:** If scope changes, STOP and contact provider
5. **After Photos:** Document completion (2 minimum)

### Job Completion

1. Walk through completed work with customer
2. Get verbal confirmation
3. Mark job complete in app
4. Upload all required photos
5. Add any notes about the job

## Safety & Professionalism

### Personal Protective Equipment

Always have:
- Safety glasses
- Work gloves
- Closed-toe shoes
- Appropriate clothing

### Customer Interaction

| Do | Don't |
|----|-------|
| Be punctual | Arrive late without notice |
| Be courteous | Use inappropriate language |
| Explain your work | Make unauthorized changes |
| Document everything | Skip photos |
| Follow up on issues | Ignore customer concerns |

### Safety Situations

If you encounter:
- **Gas smell:** Evacuate, call 911, then report in app
- **Exposed wires:** Do not touch, report immediately
- **Structural damage:** Document, do not proceed, contact provider
- **Unsafe customer:** Leave politely, report to provider

## Earnings & Ratings

### How You're Paid

- Payment from provider (not platform directly)
- Rate set by your agreement with provider
- Payment schedule per your provider's policy

### Rating System

After each job, customers rate:
- Quality of work (1-5 stars)
- Professionalism (1-5 stars)
- Timeliness (1-5 stars)

### Maintaining High Ratings

- Arrive on time
- Complete all work as specified
- Document with quality photos
- Communicate clearly
- Be professional and courteous

### Viewing Your Performance

Navigate to: **Profile → Performance**

See:
- Average rating
- Jobs completed
- Response time average
- Any flags or issues

## Handyman FAQ

**Q: What if I can't make a scheduled job?**
A: Contact your provider immediately. Do not leave the customer waiting.

**Q: What if the customer wants more work done?**
A: Do NOT do additional work. Contact your provider for approval first.

**Q: What if the customer offers cash?**
A: Decline politely. All work must go through the platform.

**Q: What if my photos don't upload?**
A: They'll save locally. Retry when you have better connection.

**Q: What if the customer isn't home?**
A: Wait 15 minutes, attempt contact, then report to provider.

**Q: How do I report a safety concern?**
A: Use the app's "Report Issue" feature, or call your provider directly.

**Q: Can I work for multiple providers?**
A: Depends on your agreement with each provider. Check your contract.

---

# 8. Admin Guide

*This section is for platform administrators and operations staff.*

## Dashboard & Metrics

### Key Performance Indicators

| Metric | Target | Frequency |
|--------|--------|-----------|
| Daily Active Users | Growing | Daily |
| Service Requests | Growing | Daily |
| Average Response Time | <4 hours | Daily |
| Customer Satisfaction | >4.5 stars | Weekly |
| Dispute Rate | <5% | Weekly |
| Provider Churn | <10%/month | Monthly |
| Revenue | Per plan | Daily |

### Dashboard Sections

- **Overview:** Key metrics at a glance
- **Users:** Registration trends, active users
- **Requests:** Volume, categories, status
- **Providers:** Active, verified, performance
- **Revenue:** Transactions, subscriptions, fees
- **Issues:** Disputes, fraud flags, reports

## User Management

### User Actions

| Action | When to Use |
|--------|-------------|
| View Profile | Investigate issues |
| Reset Password | User request |
| Suspend Account | Terms violation |
| Ban Account | Severe violation |
| Merge Accounts | Duplicate accounts |
| Delete Account | GDPR/privacy request |

### Suspension vs. Ban

- **Suspension:** Temporary, reversible, warning issued
- **Ban:** Permanent, account disabled, cannot re-register

### User Search

Search by:
- Email address
- Phone number
- Name
- User ID
- Property address

## Provider Management

### Verification Queue

Review pending verifications:
1. Check uploaded documents
2. Verify license number (external check)
3. Confirm insurance validity
4. Approve or reject with reason

### Provider Actions

| Action | When to Use |
|--------|-------------|
| Approve Verification | Documents valid |
| Reject Verification | Documents invalid/incomplete |
| Suspend Provider | Performance issues, complaints |
| Remove Provider | Severe violations |
| Adjust Tier | Manual tier change |

### Performance Review

Monitor:
- Rating trends
- Dispute frequency
- Response times
- Customer complaints

## Dispute Resolution (Admin)

### Dispute Queue

View all pending disputes:
- Customer name
- Provider name
- Dispute reason
- Amount in question
- Time remaining

### Resolution Workflow

1. **Review Evidence:**
   - Customer's complaint
   - Photos (before/during/after)
   - Messages between parties
   - Invoice and estimate

2. **Contact Parties (if needed):**
   - Request additional information
   - Clarify claims

3. **Make Decision:**
   - Customer Favor (full/partial refund)
   - Provider Favor (release payment)
   - Split Decision (custom allocation)

4. **Document Reason:**
   - Written explanation
   - Reference specific evidence

5. **Execute Resolution:**
   - Process refund if applicable
   - Release payment if applicable
   - Notify both parties

### Dispute Guidelines

| Situation | Typical Resolution |
|-----------|-------------------|
| Work clearly incomplete | Customer favor |
| Quality clearly substandard | Customer favor (partial) |
| Work matches estimate | Provider favor |
| Miscommunication | Split decision |
| No evidence from customer | Provider favor |
| No documentation from provider | Customer favor |

## Platform Configuration

### Configurable Settings

| Category | Settings |
|----------|----------|
| Homeowner Pricing | Free homes limit, extra home price, tenant price, ad-free price |
| Diagnostic Fees | Per-category fees |
| Provider Fees | Commission rate, minimum fee |
| Provider Tiers | Tier prices, qualification thresholds |
| Payment | Buffer percentage, buffer cap, auto-approve window, dispute window |
| AI | Feature flags, rate limits, model selection |

### Changing Configuration

1. Navigate to: **Admin → Configuration**
2. Select category
3. Edit values
4. Preview impact
5. Save changes

> Changes take effect immediately. Some changes may require user refresh.

### Feature Flags

Enable/disable features:
- `ai_intake_enabled`
- `ai_provider_copilot_enabled`
- `ai_maintenance_coach_enabled`
- `ai_crm_copilot_enabled`
- `ai_sponsor_copy_enabled`
- `ai_admin_triage_enabled`

## AI Operations

### Monitoring AI

| Metric | Monitor For |
|--------|-------------|
| Request Volume | Unusual spikes |
| Error Rate | Provider issues |
| Response Time | Latency problems |
| Cost per Request | Budget tracking |
| Daily Spend | Budget limits |

### AI Rate Limits

| Role | Default Limit |
|------|---------------|
| Customer | 50 requests/day |
| Provider | 100 requests/day |
| Admin | 500 requests/day |

### AI Cost Management

- Set daily budget alerts
- Review cost by task type
- Optimize model selection
- Monitor for abuse patterns

## Incident Response

### Incident Severity

| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 | Platform down | Immediate |
| P2 | Major feature broken | 1 hour |
| P3 | Minor issue | 4 hours |
| P4 | Low priority | Next business day |

### Response Steps

1. **Identify:** Confirm issue and scope
2. **Communicate:** Notify stakeholders
3. **Contain:** Minimize impact
4. **Fix:** Resolve root cause
5. **Verify:** Confirm resolution
6. **Document:** Post-incident review

### Communication Templates

**Status Page Update:**
```
[Investigating/Identified/Monitoring/Resolved]
We are currently [investigating reports of / experiencing] [issue].
[Impact description]
Updates will be posted as available.
```

**User Notification:**
```
We're aware of an issue affecting [feature].
Our team is working on a fix.
We apologize for any inconvenience.
```

## Admin FAQ

**Q: How do I handle a provider who keeps getting complaints?**
A: Review complaint history, issue warning, suspend if continues, remove for repeat violations.

**Q: What if a user requests data deletion?**
A: Verify identity, process request within 30 days, confirm deletion, document compliance.

**Q: How do I add a new service category?**
A: Contact development team — requires database and code changes.

**Q: What if AI costs are too high?**
A: Review usage by task type, adjust rate limits, switch to cheaper models for low-priority tasks.

**Q: How do I handle fraud?**
A: Document evidence, suspend involved accounts, process refunds if needed, report to legal if warranted.

**Q: Who can access admin functions?**
A: Users with admin, territory_manager, or franchisee roles, scoped to their territory.

---

# 9. Glossary

| Term | Definition |
|------|------------|
| **Authorization** | Payment hold placed when estimate is approved (not charged yet) |
| **Baseline Checklist** | Initial condition assessment for a property |
| **Buffer** | Extra authorization amount (20%, max $250) for unexpected work |
| **Capture** | Charging a previously authorized payment |
| **Change Order** | Request to exceed original estimate by more than 10% |
| **Diagnostic Fee** | Upfront fee for provider assessment, credited to final invoice |
| **Dispute Window** | 72-hour period after invoice approval to raise concerns |
| **Feature Flag** | Toggle to enable/disable platform features |
| **Home Binder** | Digital storage for property documents |
| **Invoice** | Final bill submitted after work completion |
| **Job Brief** | AI-generated summary of service request for providers |
| **Maintenance Calendar** | Scheduled tasks based on property and season |
| **Payout** | Transfer of funds to provider after dispute window |
| **Platform Fee** | Fee charged to homeowner ($6-$25 based on invoice) |
| **Preferred Provider** | Highest tier with top placement and features |
| **Provider Commission** | Fee charged to provider (8%, min $3.50) |
| **Service Area** | Geographic region where provider operates |
| **Service Request** | Homeowner's request for maintenance or repair |
| **Support Code** | Temporary code for customer support verification |
| **Tenant Seat** | Paid access for tenant to submit requests |
| **Tier** | Provider subscription level (None, Verified, Preferred) |
| **Verified Provider** | Mid-tier with trust badge and priority search |
| **Webhook** | Automated notification of platform events |

---

# 10. Support Chatbot Knowledge Base Export

This section contains all knowledge base content formatted for chatbot integration.

## Unified KB Chunks (JSON)

```json
[
  {
    "id": "platform-overview",
    "role": "all",
    "title": "What is RegularUpkeep?",
    "content": "RegularUpkeep is an AI-powered home maintenance marketplace connecting homeowners with qualified service providers. The platform helps track home systems, schedule preventive maintenance, and find reliable contractors for repairs."
  },
  {
    "id": "pricing-homeowner-free",
    "role": "homeowner",
    "title": "How many homes are free?",
    "content": "Your first 2 homes are included free. Additional homes cost $2.50/month each. Tenant access seats are $2.50/month each. Ad-free experience is $25/year."
  },
  {
    "id": "pricing-diagnostic-fees",
    "role": "all",
    "title": "What are diagnostic fees?",
    "content": "Diagnostic fees are upfront payments for provider assessment: Handyman $49, Plumbing $79, Electrical $79, HVAC $89. These fees are credited toward your final invoice if you proceed with the work."
  },
  {
    "id": "pricing-platform-fees",
    "role": "homeowner",
    "title": "What are platform fees?",
    "content": "Platform fees are charged on completed work: Under $300 = $6, $300-$1500 = $12, Over $1500 = $25 (capped). These fees support platform operations and payment processing."
  },
  {
    "id": "pricing-provider-commission",
    "role": "provider",
    "title": "What is the provider commission?",
    "content": "Providers pay 8% commission on completed jobs, with a minimum of $3.50. This is deducted from your payout automatically."
  },
  {
    "id": "payment-authorization",
    "role": "homeowner",
    "title": "How does payment authorization work?",
    "content": "When you approve an estimate, we authorize (hold) the estimate amount plus a 20% buffer (max $250). You're not charged until the invoice is approved. The buffer covers minor scope changes."
  },
  {
    "id": "payment-timeline",
    "role": "all",
    "title": "When does payment happen?",
    "content": "After invoice submission: 24-hour review window (auto-approves if no action), then 72-hour dispute window. After dispute window closes, funds transfer to provider."
  },
  {
    "id": "dispute-window",
    "role": "all",
    "title": "What is the dispute window?",
    "content": "You have 72 hours after invoice approval to file a dispute. During this time, funds are held. After the window closes, funds release to the provider automatically."
  },
  {
    "id": "dispute-process",
    "role": "all",
    "title": "How are disputes resolved?",
    "content": "Admin reviews evidence from both parties: photos, messages, estimates, invoices. Decisions: Customer favor (full/partial refund), Provider favor (payment released), or split decision."
  },
  {
    "id": "photo-requirements",
    "role": "provider",
    "title": "What photos are required?",
    "content": "Minimum: 2 before photos, 1 during photo, 2 after photos. All photos must be clear, well-lit, and show the work area. Photos have automatic timestamps."
  },
  {
    "id": "change-order",
    "role": "all",
    "title": "What is a change order?",
    "content": "If work exceeds the estimate by more than 10%, the provider must submit a change order. Customer approval is required before additional work. This protects both parties from surprises."
  },
  {
    "id": "provider-tiers-overview",
    "role": "provider",
    "title": "What are provider tiers?",
    "content": "Three tiers: None (free, basic access), Verified ($10/mo, trust badge, priority search), Preferred (+$15/mo, top placement, featured status). Higher tiers get more visibility."
  },
  {
    "id": "provider-tier-qualification",
    "role": "provider",
    "title": "How do I qualify for Preferred?",
    "content": "Requirements: 4.5+ rating, 10+ completed jobs, less than 5% dispute rate, average response time under 4 hours, current Verified status."
  },
  {
    "id": "ai-intake",
    "role": "homeowner",
    "title": "How does AI photo analysis work?",
    "content": "When you upload photos, AI analyzes them to detect the issue type, suggest categories, and identify safety concerns. This speeds up matching with the right provider."
  },
  {
    "id": "ai-safety-flags",
    "role": "all",
    "title": "What are AI safety flags?",
    "content": "AI detects high-risk situations: gas smells, exposed electrical wires, active flooding, structural damage. These trigger urgent handling and safety warnings."
  },
  {
    "id": "ai-copilot-estimate",
    "role": "provider",
    "title": "How does AI estimate drafting work?",
    "content": "AI generates a first draft based on the job brief and photos. Includes suggested scope and line items. You must review and edit before sending. AI never sets prices."
  },
  {
    "id": "ai-copilot-message",
    "role": "provider",
    "title": "How does AI message drafting work?",
    "content": "AI creates professional message templates for customer communication. You review and edit before sending. AI never makes pricing promises or commitments."
  },
  {
    "id": "ai-copilot-invoice",
    "role": "provider",
    "title": "How does AI invoice narrative work?",
    "content": "AI generates a work summary describing what was done. Never claims code compliance unless you explicitly confirm. Always editable before submitting."
  },
  {
    "id": "ai-maintenance-coach",
    "role": "homeowner",
    "title": "What is the Maintenance Coach?",
    "content": "AI provides seasonal maintenance recommendations based on your property and location. Premium subscribers get printable quarterly checklists."
  },
  {
    "id": "ai-crm",
    "role": "provider",
    "title": "What is AI CRM?",
    "content": "AI provides customer insights: next best actions, health scores, churn risk detection, upsell opportunities. Helps maintain customer relationships proactively."
  },
  {
    "id": "ai-privacy",
    "role": "all",
    "title": "Is my data used for AI training?",
    "content": "Your data is not used for external AI training. AI analysis is opt-in via Profile → Settings → AI Preferences. You can disable AI features at any time."
  },
  {
    "id": "property-member-roles",
    "role": "homeowner",
    "title": "What are property member roles?",
    "content": "Owner: full control. Manager: create requests, approve estimates, view financials. Tenant: submit requests for own unit. Viewer: read-only access."
  },
  {
    "id": "multi-property-setup",
    "role": "homeowner",
    "title": "How do I manage multiple properties?",
    "content": "Use consistent naming, complete one property as template, clone settings to similar properties. First 2 homes free, additional homes $2.50/mo each."
  },
  {
    "id": "handyman-availability",
    "role": "handyman",
    "title": "How does availability work?",
    "content": "Toggle your status: Online (accepting jobs), Busy (on a job), Offline (not working). Keep location services enabled when Online for job matching."
  },
  {
    "id": "handyman-job-flow",
    "role": "handyman",
    "title": "What is the job workflow?",
    "content": "Receive notification → Accept within 15 minutes → Arrive on time → Before photos → Complete work → During photos → After photos → Mark complete."
  },
  {
    "id": "handyman-scope-changes",
    "role": "handyman",
    "title": "What if scope needs to change?",
    "content": "Do NOT do additional work without approval. Contact your provider immediately. They will submit a change order for customer approval."
  },
  {
    "id": "admin-dispute-resolution",
    "role": "admin",
    "title": "How do admins resolve disputes?",
    "content": "Review evidence (photos, messages, estimates), contact parties if needed, make decision (customer favor, provider favor, or split), document reasoning, execute resolution."
  },
  {
    "id": "admin-provider-verification",
    "role": "admin",
    "title": "How is provider verification processed?",
    "content": "Review uploaded documents, verify license externally, confirm insurance validity, approve or reject with documented reason."
  },
  {
    "id": "admin-config",
    "role": "admin",
    "title": "What can admins configure?",
    "content": "Pricing (fees, commissions), payment flow (buffer, windows), AI (feature flags, rate limits, models), provider tiers (prices, qualifications)."
  },
  {
    "id": "admin-ai-ops",
    "role": "admin",
    "title": "How do admins monitor AI?",
    "content": "Dashboard shows: request volume, error rates, response times, cost per request, daily spend. Set alerts for budget thresholds."
  },
  {
    "id": "support-contact",
    "role": "all",
    "title": "How do I contact support?",
    "content": "In-app chat (24/7), email (business hours), phone (business hours). Get your Support Code from Profile → Support for faster resolution."
  },
  {
    "id": "support-code",
    "role": "all",
    "title": "What is a Support Code?",
    "content": "A temporary code (valid 24 hours) that contains anonymized context about your account. Provide it to support for faster resolution without sharing personal details."
  },
  {
    "id": "cancel-request",
    "role": "homeowner",
    "title": "Can I cancel a service request?",
    "content": "Yes, before a provider is assigned. After assignment, contact support. Diagnostic fees may be non-refundable depending on timing."
  },
  {
    "id": "emergency-service",
    "role": "homeowner",
    "title": "What if I need emergency service?",
    "content": "Mark your request as 'Urgent'. AI will detect safety issues and prioritize accordingly. For true emergencies (gas leak, fire), call 911 first."
  },
  {
    "id": "inspection-overview",
    "role": "homeowner",
    "title": "What are home inspections?",
    "content": "Comprehensive property assessments with room-by-room checklists, photo documentation, condition ratings. Use for move-in/out, annual assessment, pre-sale prep."
  },
  {
    "id": "documents-binder",
    "role": "homeowner",
    "title": "What is the Home Binder?",
    "content": "Digital storage for property documents: warranties, manuals, receipts, permits, insurance. Link documents to specific systems for easy reference."
  },
  {
    "id": "bulk-operations",
    "role": "homeowner",
    "title": "Can I do bulk operations?",
    "content": "Multi-property owners can: create requests across properties, export reports by group, assign providers to property groups, schedule bulk maintenance."
  },
  {
    "id": "team-management-provider",
    "role": "provider",
    "title": "How do provider teams work?",
    "content": "Roles: Owner (full control), Manager (accept jobs, create estimates), Technician (assigned jobs only). Invite team via Provider Portal → Team."
  },
  {
    "id": "provider-response-time",
    "role": "provider",
    "title": "How important is response time?",
    "content": "Very important. Under 5 minutes = preferred matching. 5-15 minutes = standard. Over 15 minutes = reduced job offers. Affects your visibility."
  },
  {
    "id": "provider-acceptance-rate",
    "role": "provider",
    "title": "How important is acceptance rate?",
    "content": "90%+ = preferred matching. 70-89% = standard. Below 70% = reduced offers. Declining frequently hurts your visibility on the platform."
  },
  {
    "id": "payout-timing",
    "role": "provider",
    "title": "When do I get paid?",
    "content": "Standard: 3-5 business days after 72-hour dispute window. Instant Payout available for 1.5% fee. Amount = invoice minus 8% commission (min $3.50)."
  },
  {
    "id": "protective-notes",
    "role": "provider",
    "title": "What are protective notes?",
    "content": "Document: pre-existing damage, areas not touched, customer decisions, unusual conditions, verbal agreements. Protects you in disputes."
  },
  {
    "id": "admin-incident-response",
    "role": "admin",
    "title": "How are incidents handled?",
    "content": "P1 (platform down): immediate. P2 (major feature): 1 hour. P3 (minor): 4 hours. P4 (low priority): next business day. Follow identify, communicate, contain, fix, verify, document."
  },
  {
    "id": "admin-user-suspension",
    "role": "admin",
    "title": "When to suspend vs ban users?",
    "content": "Suspension: temporary, reversible, for warnings. Ban: permanent, for severe violations, prevents re-registration. Document all actions."
  }
]
```

## Unified FAQ Pairs (JSON)

```json
[
  {
    "id": "faq-free-homes",
    "role": "homeowner",
    "question": "How many properties can I add for free?",
    "answer": "Your first 2 homes are free. Additional homes are $2.50/month each."
  },
  {
    "id": "faq-add-family",
    "role": "homeowner",
    "question": "Can I add family members to my account?",
    "answer": "Yes. Add them as property members with appropriate roles: Manager (full access), Tenant (limited to their unit), or Viewer (read-only)."
  },
  {
    "id": "faq-unhappy-work",
    "role": "homeowner",
    "question": "What if I'm not happy with the work?",
    "answer": "You have 72 hours after invoice approval to file a dispute. Admin will review evidence from both parties and make a decision."
  },
  {
    "id": "faq-diagnostic-fee",
    "role": "homeowner",
    "question": "How does the diagnostic fee work?",
    "answer": "The fee covers the provider's initial assessment. If you proceed with work, it's credited toward your final invoice."
  },
  {
    "id": "faq-cancel-request",
    "role": "homeowner",
    "question": "Can I cancel a service request?",
    "answer": "Yes, before a provider is assigned. After assignment, contact support. Diagnostic fees may be non-refundable depending on timing."
  },
  {
    "id": "faq-emergency",
    "role": "homeowner",
    "question": "What if I need emergency service?",
    "answer": "Mark your request as 'Urgent'. AI will detect safety issues and prioritize accordingly. For true emergencies, call 911 first."
  },
  {
    "id": "faq-disable-ai",
    "role": "homeowner",
    "question": "How do I disable AI features?",
    "answer": "Go to Profile → Settings → AI Preferences and toggle off AI analysis. Your existing data won't be affected."
  },
  {
    "id": "faq-data-privacy",
    "role": "homeowner",
    "question": "Is my data private?",
    "answer": "Yes. We never share your personal information. AI analysis is opt-in. See our Privacy Policy for details."
  },
  {
    "id": "faq-multi-state",
    "role": "homeowner",
    "question": "Can I manage properties in different states?",
    "answer": "Yes. Provider availability varies by location, but you can manage properties anywhere from a single account."
  },
  {
    "id": "faq-transfer-property",
    "role": "homeowner",
    "question": "How do I transfer a property to another owner?",
    "answer": "Contact support. Property history can be transferred with both parties' consent."
  },
  {
    "id": "faq-manager-login",
    "role": "homeowner",
    "question": "Can my property manager have their own login?",
    "answer": "Yes. Invite them with the Manager role for their assigned properties. They'll create their own account."
  },
  {
    "id": "faq-tenant-turnover",
    "role": "homeowner",
    "question": "How do I handle tenant turnover?",
    "answer": "Remove outgoing tenant's access, run a move-out inspection, then invite the incoming tenant with their email."
  },
  {
    "id": "faq-spending-limits",
    "role": "homeowner",
    "question": "Can I set spending limits for managers?",
    "answer": "Not currently. Managers can approve any estimate. Consider using Viewer role for limited access. [TBD — confirm in product]"
  },
  {
    "id": "faq-compare-providers",
    "role": "homeowner",
    "question": "How do I compare provider performance across properties?",
    "answer": "Use Portfolio Reports to view provider ratings, job history, and performance metrics across your properties."
  },
  {
    "id": "faq-response-time",
    "role": "provider",
    "question": "How quickly must I respond to job offers?",
    "answer": "Within 15 minutes to maintain good standing. Faster response (under 5 minutes) = better matching priority."
  },
  {
    "id": "faq-cancel-job",
    "role": "provider",
    "question": "What if I need to cancel a job?",
    "answer": "Contact support immediately. Cancellation after acceptance negatively affects your metrics and matching."
  },
  {
    "id": "faq-change-orders",
    "role": "provider",
    "question": "How do change orders work?",
    "answer": "If work exceeds estimate by 10%+, stop work and submit a change order. Customer must approve before you continue."
  },
  {
    "id": "faq-payment-timing",
    "role": "provider",
    "question": "When do I get paid?",
    "answer": "72 hours after invoice approval, minus 8% platform commission. Instant Payout available for 1.5% fee."
  },
  {
    "id": "faq-dispute-customer",
    "role": "provider",
    "question": "How do I dispute a customer complaint?",
    "answer": "Document everything with photos and notes. Admin reviews evidence from both sides and makes a decision within 72 hours."
  },
  {
    "id": "faq-multiple-areas",
    "role": "provider",
    "question": "Can I work in multiple areas?",
    "answer": "Yes. Set multiple service areas in your profile settings."
  },
  {
    "id": "faq-become-preferred",
    "role": "provider",
    "question": "How do I become a Preferred provider?",
    "answer": "Maintain 4.5+ rating, complete 10+ jobs, keep disputes under 5%, maintain under 4-hour response time, then apply through billing settings."
  },
  {
    "id": "faq-handyman-cant-make-job",
    "role": "handyman",
    "question": "What if I can't make a scheduled job?",
    "answer": "Contact your provider immediately. Never leave the customer waiting without communication."
  },
  {
    "id": "faq-handyman-more-work",
    "role": "handyman",
    "question": "What if the customer wants more work done?",
    "answer": "Do NOT do additional work without approval. Contact your provider first for change order approval."
  },
  {
    "id": "faq-handyman-cash",
    "role": "handyman",
    "question": "What if the customer offers cash?",
    "answer": "Decline politely. All work must go through the platform for your protection and proper documentation."
  },
  {
    "id": "faq-handyman-photos-fail",
    "role": "handyman",
    "question": "What if my photos don't upload?",
    "answer": "They'll save locally on your device. Retry when you have a better connection. Don't leave the job without attempting upload."
  },
  {
    "id": "faq-handyman-no-customer",
    "role": "handyman",
    "question": "What if the customer isn't home?",
    "answer": "Wait 15 minutes, attempt to contact them, then report to your provider. Document with a photo of the property."
  },
  {
    "id": "faq-handyman-safety",
    "role": "handyman",
    "question": "How do I report a safety concern?",
    "answer": "Use the app's 'Report Issue' feature immediately, or call your provider directly for urgent situations."
  },
  {
    "id": "faq-handyman-multiple-providers",
    "role": "handyman",
    "question": "Can I work for multiple providers?",
    "answer": "Depends on your agreement with each provider. Check your contract for exclusivity clauses."
  },
  {
    "id": "faq-admin-complaints",
    "role": "admin",
    "question": "How do I handle a provider with repeated complaints?",
    "answer": "Review complaint history, issue formal warning, suspend if behavior continues, remove for repeated or severe violations."
  },
  {
    "id": "faq-admin-data-deletion",
    "role": "admin",
    "question": "What if a user requests data deletion?",
    "answer": "Verify identity, process request within 30 days, confirm deletion to user, document for compliance records."
  },
  {
    "id": "faq-admin-new-category",
    "role": "admin",
    "question": "How do I add a new service category?",
    "answer": "Contact the development team — this requires database schema and code changes, not just configuration."
  },
  {
    "id": "faq-admin-ai-costs",
    "role": "admin",
    "question": "What if AI costs are too high?",
    "answer": "Review usage by task type, adjust rate limits, switch to cheaper models for lower-priority tasks, or disable features temporarily."
  },
  {
    "id": "faq-admin-fraud",
    "role": "admin",
    "question": "How do I handle suspected fraud?",
    "answer": "Document all evidence, suspend involved accounts, process refunds if customers affected, report to legal if warranted."
  },
  {
    "id": "faq-admin-access",
    "role": "admin",
    "question": "Who can access admin functions?",
    "answer": "Users with admin, territory_manager, or franchisee roles. Each is scoped to their assigned territory or franchise."
  },
  {
    "id": "faq-ai-training",
    "role": "all",
    "question": "Is my data used to train AI?",
    "answer": "No. Your data is not used for external AI model training. AI features only analyze your content to provide immediate assistance."
  },
  {
    "id": "faq-support-contact",
    "role": "all",
    "question": "How do I contact support?",
    "answer": "In-app chat (24/7), email (business hours), or phone (business hours). Get your Support Code from Profile → Support for faster help."
  },
  {
    "id": "faq-payment-safe",
    "role": "all",
    "question": "Is my payment information safe?",
    "answer": "Yes. We use Stripe for payment processing. We never store your full card details on our servers."
  },
  {
    "id": "faq-dispute-after-window",
    "role": "all",
    "question": "What if I find a problem after the 72-hour window?",
    "answer": "Contact support. While funds have been released, we may still be able to help mediate with the provider."
  },
  {
    "id": "faq-app-required",
    "role": "all",
    "question": "Do I need the mobile app?",
    "answer": "Not required but recommended. The app provides real-time notifications and is easier for photo uploads on-site."
  }
]
```

## Unified Intent Map (YAML)

```yaml
# RegularUpkeep Unified Intent Map
# Role-aware routing for support chatbot

version: "1.0"
last_updated: "2024-12"

# Intent definitions with role-based routing
intents:

  # === ACCOUNT & ACCESS ===
  - intent: account_setup
    patterns:
      - "how do I sign up"
      - "create account"
      - "get started"
    role_routing:
      default: "platform-overview"
      homeowner: "pricing-homeowner-free"
      provider: "provider-tiers-overview"

  - intent: add_team_member
    patterns:
      - "add family member"
      - "invite manager"
      - "add tenant"
      - "invite team"
    role_routing:
      homeowner: "property-member-roles"
      provider: "team-management-provider"
      admin: "admin-user-suspension"

  # === PRICING & BILLING ===
  - intent: pricing_inquiry
    patterns:
      - "how much does it cost"
      - "what are the fees"
      - "pricing"
      - "subscription cost"
    role_routing:
      homeowner: "pricing-homeowner-free"
      provider: "pricing-provider-commission"
      all: "pricing-diagnostic-fees"

  - intent: diagnostic_fee
    patterns:
      - "diagnostic fee"
      - "upfront payment"
      - "assessment fee"
    role_routing:
      default: "pricing-diagnostic-fees"

  - intent: platform_fee
    patterns:
      - "platform fee"
      - "service fee"
      - "booking fee"
    role_routing:
      homeowner: "pricing-platform-fees"
      provider: "pricing-provider-commission"

  - intent: provider_commission
    patterns:
      - "commission"
      - "how much do I keep"
      - "provider fee"
    role_routing:
      provider: "pricing-provider-commission"

  # === PAYMENTS ===
  - intent: payment_flow
    patterns:
      - "when am I charged"
      - "how does payment work"
      - "when do I pay"
    role_routing:
      homeowner: "payment-authorization"
      provider: "payout-timing"
      all: "payment-timeline"

  - intent: payout_timing
    patterns:
      - "when do I get paid"
      - "payout"
      - "transfer funds"
    role_routing:
      provider: "payout-timing"

  - intent: change_order
    patterns:
      - "change order"
      - "work exceeds estimate"
      - "additional work"
    role_routing:
      default: "change-order"
      handyman: "handyman-scope-changes"

  # === DISPUTES ===
  - intent: dispute_general
    patterns:
      - "dispute"
      - "not happy with work"
      - "problem with job"
      - "complaint"
    role_routing:
      homeowner: "dispute-window"
      provider: "dispute-process"
      admin: "admin-dispute-resolution"

  - intent: dispute_window
    patterns:
      - "how long to dispute"
      - "72 hours"
      - "dispute deadline"
    role_routing:
      default: "dispute-window"

  - intent: dispute_resolution
    patterns:
      - "how are disputes resolved"
      - "dispute outcome"
      - "refund decision"
    role_routing:
      default: "dispute-process"
      admin: "admin-dispute-resolution"

  # === SERVICE REQUESTS ===
  - intent: create_request
    patterns:
      - "submit request"
      - "request service"
      - "need help with"
      - "book service"
    role_routing:
      homeowner: "ai-intake"

  - intent: cancel_request
    patterns:
      - "cancel request"
      - "cancel service"
      - "don't need anymore"
    role_routing:
      homeowner: "cancel-request"

  - intent: emergency_service
    patterns:
      - "emergency"
      - "urgent"
      - "gas leak"
      - "flooding"
    role_routing:
      homeowner: "emergency-service"
      all: "ai-safety-flags"

  # === PROVIDER-SPECIFIC ===
  - intent: provider_verification
    patterns:
      - "get verified"
      - "verification status"
      - "become verified"
    role_routing:
      provider: "provider-tiers-overview"
      admin: "admin-provider-verification"

  - intent: provider_tiers
    patterns:
      - "provider tiers"
      - "preferred status"
      - "verified badge"
    role_routing:
      provider: "provider-tiers-overview"

  - intent: become_preferred
    patterns:
      - "become preferred"
      - "upgrade tier"
      - "preferred requirements"
    role_routing:
      provider: "provider-tier-qualification"

  - intent: response_time
    patterns:
      - "response time"
      - "how fast respond"
      - "acceptance rate"
    role_routing:
      provider: "provider-response-time"

  - intent: provider_estimates
    patterns:
      - "create estimate"
      - "submit estimate"
      - "estimate tips"
    role_routing:
      provider: "ai-copilot-estimate"

  - intent: provider_team
    patterns:
      - "add technician"
      - "team management"
      - "employee access"
    role_routing:
      provider: "team-management-provider"

  # === HANDYMAN-SPECIFIC ===
  - intent: handyman_availability
    patterns:
      - "go online"
      - "set available"
      - "availability toggle"
    role_routing:
      handyman: "handyman-availability"

  - intent: handyman_job_flow
    patterns:
      - "how do jobs work"
      - "job workflow"
      - "what to do on site"
    role_routing:
      handyman: "handyman-job-flow"

  - intent: handyman_photos
    patterns:
      - "photo requirements"
      - "what photos needed"
      - "before after photos"
    role_routing:
      handyman: "photo-requirements"
      provider: "photo-requirements"

  - intent: scope_change
    patterns:
      - "customer wants more"
      - "additional work"
      - "scope change"
    role_routing:
      handyman: "handyman-scope-changes"
      provider: "change-order"

  # === AI FEATURES ===
  - intent: ai_features
    patterns:
      - "AI features"
      - "artificial intelligence"
      - "smart features"
    role_routing:
      homeowner: "ai-intake"
      provider: "ai-copilot-estimate"
      admin: "admin-ai-ops"

  - intent: ai_photo_analysis
    patterns:
      - "photo analysis"
      - "AI analyze photos"
      - "image detection"
    role_routing:
      homeowner: "ai-intake"

  - intent: ai_maintenance
    patterns:
      - "maintenance coach"
      - "maintenance recommendations"
      - "seasonal tasks"
    role_routing:
      homeowner: "ai-maintenance-coach"

  - intent: ai_copilot
    patterns:
      - "AI estimate"
      - "AI draft"
      - "AI message"
    role_routing:
      provider: "ai-copilot-estimate"

  - intent: ai_privacy
    patterns:
      - "AI privacy"
      - "data used for AI"
      - "AI training"
    role_routing:
      default: "ai-privacy"

  - intent: disable_ai
    patterns:
      - "disable AI"
      - "turn off AI"
      - "opt out AI"
    role_routing:
      default: "ai-privacy"

  # === PROPERTIES ===
  - intent: add_property
    patterns:
      - "add property"
      - "add home"
      - "new property"
    role_routing:
      homeowner: "pricing-homeowner-free"

  - intent: property_members
    patterns:
      - "share access"
      - "property members"
      - "who can access"
    role_routing:
      homeowner: "property-member-roles"

  - intent: multi_property
    patterns:
      - "multiple properties"
      - "portfolio"
      - "many homes"
    role_routing:
      homeowner: "multi-property-setup"

  - intent: bulk_operations
    patterns:
      - "bulk"
      - "multiple at once"
      - "batch"
    role_routing:
      homeowner: "bulk-operations"

  # === DOCUMENTS ===
  - intent: documents
    patterns:
      - "upload document"
      - "warranty"
      - "home binder"
    role_routing:
      homeowner: "documents-binder"

  - intent: inspections
    patterns:
      - "inspection"
      - "property assessment"
      - "condition report"
    role_routing:
      homeowner: "inspection-overview"

  # === ADMIN-SPECIFIC ===
  - intent: admin_config
    patterns:
      - "change settings"
      - "platform configuration"
      - "update pricing"
    role_routing:
      admin: "admin-config"

  - intent: admin_users
    patterns:
      - "suspend user"
      - "ban account"
      - "user management"
    role_routing:
      admin: "admin-user-suspension"

  - intent: admin_ai_ops
    patterns:
      - "AI operations"
      - "AI monitoring"
      - "AI costs"
    role_routing:
      admin: "admin-ai-ops"

  - intent: admin_incidents
    patterns:
      - "incident"
      - "outage"
      - "system down"
    role_routing:
      admin: "admin-incident-response"

  # === SUPPORT ===
  - intent: contact_support
    patterns:
      - "contact support"
      - "help"
      - "talk to someone"
      - "customer service"
    role_routing:
      default: "support-contact"

  - intent: support_code
    patterns:
      - "support code"
      - "reference number"
      - "ticket number"
    role_routing:
      default: "support-code"

# Role detection patterns
role_detection:
  homeowner:
    - "my home"
    - "my property"
    - "service request"
    - "book a"
  provider:
    - "my business"
    - "my company"
    - "get jobs"
    - "estimates"
  handyman:
    - "on site"
    - "arriving"
    - "customer location"
    - "accept job"
  admin:
    - "platform"
    - "configuration"
    - "all users"
    - "dispute resolution"

# Fallback handling
fallback:
  unknown_intent:
    response: "I'm not sure I understand. Could you rephrase that? Or you can contact support for personalized help."
    offer_human: true

  role_mismatch:
    response: "That feature is for {expected_role}s. Is there something else I can help you with?"
    offer_redirect: true

# Escalation triggers
escalation_triggers:
  - "speak to human"
  - "real person"
  - "not helpful"
  - "escalate"
  - "manager"
  - "supervisor"
```

---

*End of Master User Guide*

**Document Version:** 1.0
**Generated:** December 2024
**Source Files:** homeowner-handbook.md, multi-property-handbook.md, provider-handbook.md, handyman-handbook.md, admin-handbook.md
