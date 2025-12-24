# RegularUpkeep Admin & Super Admin Handbook

**Version 1.0** | Last Updated: December 2024

---

## Table of Contents

1. [Admin Quick Start (First Day)](#1-admin-quick-start-first-day)
2. [Roles & Permissions Model](#2-roles--permissions-model)
3. [Daily Operations Checklist](#3-daily-operations-checklist)
4. [User Management](#4-user-management)
5. [Provider Management](#5-provider-management)
6. [Booking Oversight](#6-booking-oversight)
7. [Disputes & Refunds](#7-disputes--refunds)
8. [Content & Knowledge Base Management](#8-content--knowledge-base-management)
9. [System Health & Integrations](#9-system-health--integrations)
10. [Data & Security](#10-data--security)
11. [Reporting & KPIs](#11-reporting--kpis)
12. [FAQ](#12-faq)
13. [Glossary](#13-glossary)
14. [Support Escalation & Incident Response Playbook](#14-support-escalation--incident-response-playbook)
15. [Chatbot KB Add-On](#15-chatbot-kb-add-on)

---

## 1. Admin Quick Start (First Day)

Welcome to the RegularUpkeep Admin team. This section gets you up and running within your first day.

### 1.1 Getting Access

1. **Request Admin Account**: Contact the Super Admin to have your profile role changed to `admin`
2. **Login**: Navigate to `https://app.regularupkeep.com/auth/login` and sign in with your credentials
3. **Verify Access**: After login, you should be redirected to `/app`. Navigate to `/app/admin` to confirm admin access

### 1.2 First Day Checklist

| Task | Location | Priority |
|------|----------|----------|
| Review Admin Dashboard | `/app/admin` | Critical |
| Check pending disputes | `/app/admin/disputes` | High |
| Review fraud review queue | `/app/admin/fraud-review` | High |
| Review platform configuration | `/app/admin/config` | Medium |
| Browse user list | `/app/admin/users` | Medium |
| Check AI Ops metrics | Admin Dashboard > AI Ops tab | Medium |

### 1.3 Admin Dashboard Overview

The Admin Dashboard (`/app/admin`) displays:

**Top-Level KPIs:**
- Monthly Revenue (current month)
- Active Homeowners (total + new this month)
- Active Providers (total + online now)
- Average Provider Rating

**Dashboard Tabs:**
- **Overview**: User growth, provider network health, booking performance
- **Revenue**: Total revenue, platform fees, revenue breakdown by stream
- **Providers**: Provider counts by tier (Verified/Preferred), quality metrics
- **Operations**: Pending bookings, sponsor network stats
- **AI Ops**: AI usage metrics, costs, budget tracking, data retention

### 1.4 Key Navigation Shortcuts

| Action | Path |
|--------|------|
| Admin Dashboard | `/app/admin` |
| User Management | `/app/admin/users` |
| Platform Config | `/app/admin/config` |
| Disputes | `/app/admin/disputes` |
| Fraud Review | `/app/admin/fraud-review` |

---

## 2. Roles & Permissions Model

### 2.1 User Roles

RegularUpkeep uses role-based access control (RBAC) with the following roles:

| Role | Code | Access Level | Description |
|------|------|--------------|-------------|
| Customer | `customer` | Standard | Homeowners using the platform |
| Provider | `provider` | Standard | Service provider companies |
| Handyman | `handyman` | Standard | Individual contractors |
| Admin | `admin` | Elevated | Platform administrators |
| Territory Manager | `territory_manager` | Regional | Regional oversight [TBD — confirm in product] |
| Franchisee | `franchisee` | Partner | Future franchise operators [TBD — confirm in product] |

### 2.2 Admin Capabilities

Admins can:
- View all users, properties, bookings, and transactions
- Edit user profiles (name, phone, active status)
- Add properties on behalf of users
- Manage platform configuration (pricing, fees, feature flags)
- Review and resolve disputes
- Process fraud review queue
- View AI operations metrics
- Run manual data cleanup

### 2.3 Super Admin vs Admin

[TBD — confirm in product] Currently, all admins have equal access. Future distinction may include:

| Capability | Admin | Super Admin |
|------------|-------|-------------|
| User management | Yes | Yes |
| Config changes | Yes | Yes |
| Create new admins | No | Yes |
| Delete accounts | No | Yes |
| Access audit logs | Limited | Full |

### 2.4 Role Verification

Admin access is verified on every page load:

```
1. Check if user is authenticated
2. Query profiles table for role
3. If role !== 'admin', redirect to /app
```

---

## 3. Daily Operations Checklist

### 3.1 Morning Checklist (Start of Day)

- [ ] **Check Admin Dashboard** — Review overnight KPI changes
- [ ] **Review Pending Disputes** — `/app/admin/disputes` (Pending tab)
  - Target: Acknowledge within 4 hours
- [ ] **Review Fraud Queue** — `/app/admin/fraud-review`
  - Prioritize High Risk items first
- [ ] **Check AI Budget** — Admin Dashboard > AI Ops tab
  - Ensure spend is within daily budget ($100 default)
- [ ] **Review Error Rate** — AI Ops panel shows today's error rate
  - Alert if >5%

### 3.2 Ongoing Monitoring

| Task | Frequency | Threshold |
|------|-----------|-----------|
| Dispute response | Every 4 hours | No dispute >24h unreviewed |
| Fraud review | Every 4 hours | No high-risk item >12h unreviewed |
| AI budget check | Twice daily | Alert at 75% ($75 of $100) |
| Provider online status | Hourly | Ensure adequate coverage |

### 3.3 End of Day Checklist

- [ ] **Clear Pending Disputes** — All pending disputes reviewed
- [ ] **Clear High-Risk Fraud** — No high-risk items remaining
- [ ] **Check Booking Completion** — Review any stuck bookings
- [ ] **Review AI Costs** — Note any unusual patterns

### 3.4 Weekly Tasks

| Day | Task |
|-----|------|
| Monday | Review provider qualification cron results |
| Tuesday | Review referral qualification status |
| Wednesday | Check provider tier distributions |
| Thursday | Review revenue trends |
| Friday | Generate weekly KPI summary |

---

## 4. User Management

### 4.1 Accessing User Management

Navigate to `/app/admin/users` to see all customer accounts.

**User List Displays:**
- User count (total)
- Active users count
- Users with properties count
- Searchable table with: Name, Email, Phone, Properties, Status, Created Date

### 4.2 User Detail View

Click any user to view `/app/admin/users/[userId]`:

**Sections:**
1. **User Information** — Editable form for name, email (read-only), phone, active status
2. **Account Stats** — Property count, booking count, join date
3. **Properties** — List of all user's properties with member role
4. **Quick Actions** — Start inspection, add property

### 4.3 Activate/Deactivate Users

**To deactivate a user:**
1. Go to `/app/admin/users/[userId]`
2. Toggle "Account Active" switch to OFF
3. Click "Save Changes"

**Effect:** Inactive users cannot log in. Existing sessions may continue until expired.

**To reactivate:** Toggle the switch back to ON.

### 4.4 Role Changes

[TBD — confirm in product] Currently, role changes require direct database access:

```sql
UPDATE profiles
SET role = 'provider', updated_at = NOW()
WHERE id = 'user-uuid-here';
```

### 4.5 Fraud Flags

Users flagged for fraud appear in the Fraud Review Queue (`/app/admin/fraud-review`).

**Flag Sources:**
- AI-generated risk scores on referrals
- Unusual signup patterns
- IP/device clustering

**Risk Levels:**
| Score | Level | Action |
|-------|-------|--------|
| 0-30 | Low | Standard review |
| 31-60 | Medium | Enhanced review |
| 61-100 | High | Priority review, possible hold |

**Review Guidelines:**
1. AI signals are advisory only — human judgment required
2. Never auto-reject based on AI score alone
3. High-risk referrals may require additional investigation
4. All decisions are logged for audit

### 4.6 Adding Properties for Users

1. Navigate to user detail page
2. Click "Add Property" button
3. Complete property form on behalf of user
4. Property is linked to user with `owner` role

---

## 5. Provider Management

### 5.1 Provider Dashboard Metrics

On the Admin Dashboard, view:
- **Total Providers**: All registered providers
- **Verified Providers**: Passed background check, insurance, license
- **Preferred Providers**: Verified + performance thresholds met
- **Online Now**: Providers currently available

### 5.2 Provider Tiers

| Tier | Requirements | Monthly Fee |
|------|--------------|-------------|
| **None** | Default tier | $0 |
| **Verified** | Background check, insurance proof, license | $10/mo |
| **Preferred** | Verified + 4.5 rating, 10 jobs, <5% disputes, <4h response | +$15/mo |

### 5.3 Verification Checklist

Before marking a provider as Verified:

- [ ] **Background Check** — Clear criminal background
- [ ] **Insurance** — Valid general liability insurance
  - Minimum coverage: $1M [TBD — confirm in product]
- [ ] **License** — Valid trade license for declared services
- [ ] **Business Registration** — Valid business entity

### 5.4 Performance Monitoring

Access provider quality insights via API:
`GET /api/admin/providers/[id]/quality-insights`

**Metrics Tracked:**
- Average rating
- Total jobs completed
- Dispute rate
- Average response time (hours)

**Preferred Thresholds:**
| Metric | Threshold |
|--------|-----------|
| Min Rating | 4.5 |
| Min Completed Jobs | 10 |
| Max Dispute Rate | 5% |
| Max Response Time | 4 hours |

### 5.5 Provider Qualification Cron

The system automatically checks provider qualifications weekly:

**Endpoint:** `GET /api/cron/provider-qualification`

**What it does:**
1. Checks all providers against Preferred tier thresholds
2. Updates `qualifies_for_preferred` flag
3. Sends notification if status changes

### 5.6 Featured Providers

[TBD — confirm in product] Featured provider functionality:
- Manual selection by admin
- Displayed prominently in homeowner search
- May require Preferred tier + additional criteria

---

## 6. Booking Oversight

### 6.1 Booking Lifecycle

```
Service Request → Diagnostic Fee → Provider Matches → Estimate
    ↓
Estimate Approval → Work Scheduled → Work In Progress
    ↓
Work Completed → Invoice → Customer Approval → Payment Captured
    ↓
72h Dispute Window → Provider Transfer
```

### 6.2 Booking Statuses

| Status | Description | Admin Action |
|--------|-------------|--------------|
| `pending` | Awaiting confirmation | Monitor |
| `confirmed` | Provider accepted | None |
| `in_progress` | Work underway | None |
| `completed` | Work finished | None |
| `cancelled` | Cancelled by any party | Review reason |
| `disputed` | Under dispute | Resolve dispute |

### 6.3 Exceptions Queue

[TBD — confirm in product] Bookings requiring attention:
- Stuck in `pending` > 48 hours
- Provider no-show
- Customer no-show
- Payment failed
- Dispute opened

### 6.4 Cancellations

**Cancellation Reasons to Monitor:**
- Provider unavailable
- Customer cancelled
- Price disagreement
- Emergency/safety issue

**Admin Actions:**
1. Review cancellation reason
2. Check for pattern (provider with many cancellations)
3. Contact parties if unclear
4. Document resolution

### 6.5 No-Shows

**Provider No-Show:**
1. Customer reports no-show
2. Review booking timeline
3. Contact provider for explanation
4. If confirmed no-show:
   - Process refund to customer
   - Note on provider record
   - Consider tier demotion if pattern

**Customer No-Show:**
1. Provider reports no-show
2. Review if customer was notified
3. Determine if diagnostic fee applies
4. Document for future reference

### 6.6 Payment Flow

**Standard Flow:**
1. Diagnostic fee collected at service request
2. Estimate authorized with 20% buffer (max $250 extra)
3. Final invoice submitted
4. Auto-approve after 24h if no action
5. 72h dispute window after payment
6. Transfer to provider after dispute window

**Key Settings (Admin Config):**
| Setting | Default |
|---------|---------|
| Estimate buffer | 20% |
| Buffer cap | $250 |
| Auto-approve | 24 hours |
| Dispute window | 72 hours |

---

## 7. Disputes & Refunds

### 7.1 Dispute Dashboard

Navigate to `/app/admin/disputes` to manage disputes.

**Dashboard Shows:**
- Total disputes (all time)
- Pending review count
- Total disputed amount
- Pending disputed amount

**Tabs:**
- Pending — New disputes awaiting review
- Under Review — Currently being investigated
- Resolved — Closed in favor of either party
- Rejected — Dispute denied
- All — Complete history

### 7.2 Dispute Statuses

| Status | Description |
|--------|-------------|
| `pending` | New, awaiting admin review |
| `under_review` | Admin investigating |
| `resolved` | Closed with resolution |
| `rejected` | Dispute denied |
| `resolved_customer_favor` | Refund issued |
| `resolved_provider_favor` | Provider receives payment |

### 7.3 Dispute Review Process

**Step 1: Triage**
1. Open dispute from queue
2. Review disputed amount
3. Read customer's reason and description
4. Note filing date (72h window from payment)

**Step 2: Investigation**
1. Review booking timeline (created → scheduled → completed)
2. Check invoice amount vs disputed amount
3. Review any change orders
4. Read message history between parties
5. Review AI Summary (advisory only)

**Step 3: Resolution**
Select one of:

| Resolution | Effect |
|------------|--------|
| **Customer Favor** | Full refund to customer |
| **Provider Favor** | Payment transferred to provider |
| **Split** | Partial refund + partial provider payment |

### 7.4 Resolution Scripts

**Customer Favor:**
> "After reviewing the booking details and evidence, we've resolved this dispute in your favor. A refund of $[amount] will be processed to your original payment method within 5-10 business days."

**Provider Favor:**
> "After reviewing the booking details and evidence, we've determined the work was completed as described. The payment has been released to the provider. If you have additional concerns, please contact support."

**Split Resolution:**
> "After reviewing the evidence, we've issued a partial refund of $[amount] while also compensating the provider for completed work. Both parties will receive confirmation."

### 7.5 Refund Processing

Refunds are processed via Stripe:

1. Admin selects resolution type
2. System calls Stripe Refund API
3. Transaction recorded in `transactions` table
4. Notifications sent to both parties
5. Provider metrics updated if customer favor

**Refund Timeline:**
- Stripe processing: Immediate
- Customer bank: 5-10 business days

### 7.6 Documentation Requirements

**For Every Resolution:**
- [ ] Resolution type selected
- [ ] Notes explaining decision
- [ ] Evidence reviewed (messages, invoices, photos)
- [ ] Both parties notified

### 7.7 AI Dispute Summary

The AI Summary panel provides:
- Timeline reconstruction
- Key issue identification
- Refund recommendation (advisory only)

**IMPORTANT:** AI recommendations are non-binding. Human judgment is always required.

---

## 8. Content & Knowledge Base Management

### 8.1 Content Locations

| Content Type | Location |
|--------------|----------|
| Marketing site content | `/src/content/site.ts` |
| Homeowner handbook | `/docs/homeowner-handbook.md` |
| Multi-property handbook | `/docs/multi-property-handbook.md` |
| Provider handbook | `/docs/provider-handbook.md` |
| Handyman handbook | `/docs/handyman-handbook.md` |
| Admin handbook | `/docs/admin-handbook.md` |

### 8.2 Updating Marketing Content

The file `/src/content/site.ts` is the **single source of truth** for:
- Pricing information
- FAQs
- Services list
- Testimonials
- Feature descriptions

**To update:**
1. Edit `src/content/site.ts`
2. Rebuild and deploy
3. Changes reflect on both `regularupkeep.com` and `app.regularupkeep.com`

### 8.3 Handbook Maintenance

Each handbook includes a Chatbot KB Add-On for integration with support chatbots.

**Update Cycle:**
1. Review handbook quarterly
2. Update content to reflect product changes
3. Update KB JSON chunks for chatbot
4. Update FAQ pairs
5. Update intent map YAML

### 8.4 Keeping FAQ Updated

**When to update FAQ:**
- New feature launched
- Common support question identified
- Process or pricing change
- Bug fix affecting user behavior

**Update Process:**
1. Add question/answer to handbook FAQ section
2. Add corresponding entry to KB JSON chunks
3. Add FAQ pair to JSON pairs section
4. Add intent if new category

### 8.5 Chatbot Integration

[TBD — confirm in product] Chatbot KB structure:

```
handbook.md
├── Main content (human readable)
├── KB Chunks JSON (25 entries)
├── FAQ Pairs JSON (25 entries)
└── Intent Map YAML (intents)
```

---

## 9. System Health & Integrations

### 9.1 System Architecture

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 16 | App Router, SSR |
| Database | Supabase (PostgreSQL) | Data storage |
| Auth | Supabase Auth | User authentication |
| Payments | Stripe Connect | Payment processing |
| AI | OpenAI + Claude | AI features |
| Hosting | VPS + PM2 + nginx | Production hosting |

### 9.2 Monitoring AI Operations

**Access:** Admin Dashboard > AI Ops tab

**Metrics Displayed:**
- Today's AI Spend ($)
- AI Calls Today
- Active Users using AI
- Error Rate (%)

**Budget Tracking:**
- Daily budget: $100 (configurable)
- Alert threshold: 75% ($75)
- Visual progress bar

**7-Day Cost Trend:** Historical spend visualization

### 9.3 AI Data Retention

| Data Type | Retention |
|-----------|-----------|
| AI Jobs | 180 days |
| AI Outputs | 180 days |
| Media References | 30 days |
| Aggregate Metrics | Preserved |

**Manual Cleanup:**
Click "Run Cleanup Now" in AI Ops panel to trigger immediate cleanup.

### 9.4 Cron Jobs

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/process-transfers` | Hourly | Process provider payouts after 72h |
| `/api/cron/provider-qualification` | Weekly | Check Preferred tier eligibility |
| `/api/cron/referral-qualification` | Daily | Qualify referrals for sponsor rewards |
| `/api/cron/ai-cleanup` | Daily 3 AM | Clean up old AI data |

**Authentication:** All cron jobs require `Authorization: Bearer $CRON_SECRET`

### 9.5 Logging & Monitoring

[TBD — confirm in product] Recommended monitoring:

| Tool | Purpose |
|------|---------|
| PM2 Logs | Application logs |
| nginx Logs | Request logs |
| Supabase Dashboard | Database metrics |
| Stripe Dashboard | Payment monitoring |

**Access PM2 Logs:**
```bash
pm2 logs regularupkeep-main-app --lines 100
```

### 9.6 Error Center

[TBD — confirm in product] Error tracking and logging:

**Recommended Error Log Structure:**
```
| Error Code | Category | Description | Resolution |
|------------|----------|-------------|------------|
| ERR_AUTH_001 | Auth | Invalid session | Refresh login |
| ERR_PAY_001 | Payment | Stripe API error | Retry or contact Stripe |
| ERR_AI_001 | AI | Rate limit exceeded | Wait and retry |
```

**Error Reporting Procedure:**
1. Note error code and timestamp
2. Check application logs for stack trace
3. Document user impact
4. Create incident ticket if widespread
5. Notify engineering if critical

### 9.7 Integration Health Checks

**Stripe:**
- Monitor webhook events in `/api/webhooks/stripe`
- Check Stripe Dashboard for failed payments

**Supabase:**
- Monitor connection pool usage
- Check for slow queries

**AI Providers:**
- Monitor error rate in AI Ops
- Check rate limit hits

---

## 10. Data & Security

### 10.1 Audit Trails

Actions logged include:
- Admin config changes (updated_by, updated_at)
- User profile changes
- Dispute resolutions (resolved_by, resolved_at)
- Fraud review decisions

### 10.2 Access Control

**Database Level:**
- Row Level Security (RLS) on all tables
- Admin role bypasses certain policies

**Application Level:**
- Role check on every admin page
- Non-admin users redirected

### 10.3 Privacy Basics

**Data Handling:**
- User data stored in Supabase (self-hosted)
- Payment data stored in Stripe (PCI compliant)
- AI inputs may be hashed for privacy

**Data Access:**
- Only access user data for legitimate admin purposes
- Document reason for accessing sensitive records
- Do not share user data externally

### 10.4 Security Best Practices

1. **Never share admin credentials**
2. **Use unique passwords** — Not reused from other services
3. **Report suspicious activity** — Unusual logins, data requests
4. **Don't modify production data directly** — Use admin tools
5. **Document all manual database changes**

### 10.5 Handling Sensitive Data

**Do:**
- Access user data only when necessary
- Use admin UI for standard operations
- Log reason for accessing PII

**Don't:**
- Export user data to personal devices
- Share credentials or access tokens
- Modify database directly without documentation

### 10.6 Incident Reporting

If you discover a security issue:
1. Do not attempt to fix without authorization
2. Document what you observed
3. Report to engineering/security team immediately
4. Do not discuss externally

---

## 11. Reporting & KPIs

### 11.1 Key Performance Indicators

**User Metrics:**
| KPI | Target | Source |
|-----|--------|--------|
| Total Homeowners | Growth | Admin Dashboard |
| New Homeowners/Month | >10% growth | Admin Dashboard |
| Active Users | >60% of total | [TBD — confirm in product] |

**Provider Metrics:**
| KPI | Target | Source |
|-----|--------|--------|
| Verified Providers | >50% of total | Admin Dashboard |
| Preferred Providers | >10% of total | Admin Dashboard |
| Avg Provider Rating | >4.5 | Admin Dashboard |
| Provider Online Rate | >30% peak hours | Admin Dashboard |

**Booking Metrics:**
| KPI | Target | Source |
|-----|--------|--------|
| Completion Rate | >90% | Admin Dashboard |
| Dispute Rate | <5% | Admin Dashboard |
| Avg Response Time | <4 hours | Provider metrics |

**Revenue Metrics:**
| KPI | Source |
|-----|--------|
| Monthly Revenue | Admin Dashboard |
| Platform Fees | Admin Dashboard |
| Avg Ticket Size | Admin Dashboard |
| Provider Subscriptions | Admin Dashboard |
| Sponsor Revenue | Admin Dashboard |

### 11.2 Revenue Streams

| Stream | Calculation |
|--------|-------------|
| Provider Fees | 8% of job value (min $3.50) |
| Provider Subscriptions | Verified ($10/mo) + Preferred ($15/mo) |
| Homeowner Platform Fees | $6-$25 tiered by job size |
| Sponsor Tiles | $250/year per sponsor |
| Add-ons | Priority Dispatch ($49/yr), Instant Payout (+1%) |

### 11.3 Dashboard Tabs

**Overview Tab:**
- User Growth (homeowners, new this month, avg properties)
- Provider Network (total, verified, preferred)
- Booking Performance (total, this month, completion rate)

**Revenue Tab:**
- Total Revenue (all time)
- Platform Fees (8% of GMV)
- Avg Ticket (per completed job)
- Revenue breakdown by stream

**Providers Tab:**
- Provider counts by tier
- Online status
- Quality metrics (rating, disputes, completion rate)

**Operations Tab:**
- Pending bookings
- Sponsor network status

**AI Ops Tab:**
- Daily spend and budget
- Call volume
- Error rate
- Top task types
- 7-day trend

### 11.4 Generating Reports

[TBD — confirm in product] Manual reporting process:
1. Export data from Admin Dashboard
2. Compile in spreadsheet
3. Calculate trends week-over-week
4. Share with stakeholders

---

## 12. FAQ

### General Admin

**Q1: How do I access the Admin Dashboard?**
A: Navigate to `/app/admin` after logging in with an admin account.

**Q2: What's the difference between Admin and Super Admin?**
A: [TBD — confirm in product] Currently all admins have equal access. Future versions may add Super Admin with elevated privileges.

**Q3: Can I access admin features on mobile?**
A: The admin interface is responsive but optimized for desktop. Complex tasks like dispute resolution are easier on larger screens.

**Q4: How do I know if a user has admin access?**
A: Check the `role` field in the `profiles` table. Admin users have `role = 'admin'`.

**Q5: Where can I see my admin actions logged?**
A: Config changes are logged with `updated_by`. Dispute resolutions log `resolved_by`. [TBD — comprehensive audit log]

### User Management

**Q6: How do I deactivate a user account?**
A: Go to `/app/admin/users/[userId]`, toggle "Account Active" off, click "Save Changes".

**Q7: Can I change a user's email address?**
A: No, email is read-only in admin UI. Email changes require Supabase Auth console access.

**Q8: How do I change a user's role?**
A: [TBD — confirm in product] Currently requires database access. Future UI may support role changes.

**Q9: What happens when I deactivate a user?**
A: The user cannot log in. Existing sessions may continue until they expire. Data is preserved.

**Q10: How do I add a property for a user?**
A: Go to user detail page, click "Add Property", complete the form.

### Provider Management

**Q11: How do I verify a provider?**
A: [TBD — confirm in product] Provider verification requires checking documents and updating the `verification_status` field.

**Q12: What are the Preferred tier thresholds?**
A: 4.5+ rating, 10+ completed jobs, <5% dispute rate, <4h avg response time.

**Q13: How often are provider qualifications checked?**
A: The provider-qualification cron runs weekly.

**Q14: Can I manually promote a provider to Preferred?**
A: [TBD — confirm in product] Manual tier changes require database access.

**Q15: How do I see a provider's performance history?**
A: Call `/api/admin/providers/[id]/quality-insights` or check `provider_metrics` table.

### Disputes

**Q16: What's the dispute window?**
A: Customers have 72 hours after payment to file a dispute.

**Q17: Can I re-open a resolved dispute?**
A: [TBD — confirm in product] Currently, resolved disputes cannot be reopened through UI.

**Q18: What if both parties are at fault?**
A: Use "Split" resolution to issue partial refund and partial provider payment.

**Q19: How long do I have to resolve a dispute?**
A: Best practice is to acknowledge within 4 hours and resolve within 48 hours.

**Q20: Does the AI Summary automatically resolve disputes?**
A: No, AI provides advisory recommendations only. Human judgment is always required.

### Configuration

**Q21: What can I change in Platform Config?**
A: Pricing (homeowner, sponsor), fees (diagnostic, platform, provider), provider tiers, feature flags, marketplace settings, referral program settings.

**Q22: Do config changes require a deploy?**
A: No, config is stored in database and takes effect immediately.

**Q23: What are feature flags?**
A: Toggles to enable/disable features like AI intake, sponsor tiles, marketplace payments.

**Q24: How do I rollback a config change?**
A: [TBD — confirm in product] Currently no automatic rollback. Document previous values before changing.

**Q25: What's the difference between diagnostic fees and platform fees?**
A: Diagnostic fees are charged upfront before service ($49-$89 by category). Platform fees are charged on completed jobs ($6-$25 by job size).

### AI Operations

**Q26: What's the daily AI budget?**
A: Default is $100/day. Alert triggers at 75% ($75).

**Q27: What happens if we exceed the AI budget?**
A: [TBD — confirm in product] Budget is advisory; may require manual rate limiting.

**Q28: How do I run manual AI cleanup?**
A: Go to Admin Dashboard > AI Ops tab, click "Run Cleanup Now".

**Q29: What data does AI cleanup remove?**
A: AI jobs and outputs older than retention period (180 days default). Aggregate metrics are preserved.

**Q30: What's a normal AI error rate?**
A: Below 5% is healthy. Investigate if consistently above 5%.

### Security & Data

**Q31: How do I report a security issue?**
A: Document findings and report to engineering team immediately. Do not discuss externally.

**Q32: Can I export user data?**
A: [TBD — confirm in product] Data exports should follow data handling policies. Document reason for export.

**Q33: How long is user data retained?**
A: User data is retained indefinitely unless user requests deletion. AI data follows retention policy (180 days).

**Q34: Who can see my admin actions?**
A: Admin actions that modify data are logged. Super Admins and database administrators can see logs.

---

## 13. Glossary

| Term | Definition |
|------|------------|
| **Active User** | User who has logged in within the last 30 days |
| **Admin Config** | Database-backed configuration that can be changed without deploy |
| **AI Gateway** | Central routing system for all AI requests |
| **AI Ops** | Operational monitoring of AI usage, costs, and performance |
| **Booking** | Scheduled service appointment between homeowner and provider |
| **Change Order** | Request to increase scope/price beyond original estimate |
| **Diagnostic Fee** | Upfront fee charged before service begins (creditable toward final invoice) |
| **Dispute** | Customer challenge to a completed booking within 72h window |
| **Feature Flag** | Toggle to enable/disable platform features |
| **Fraud Review Queue** | Referrals flagged by AI for potential fraud patterns |
| **GMV** | Gross Merchandise Value; total value of transactions |
| **Homeowner** | Customer role; property owner using the platform |
| **KPI** | Key Performance Indicator; metric for measuring success |
| **Platform Fee** | Fee charged to homeowner per completed job ($6-$25) |
| **Preferred Tier** | Top provider tier with performance requirements |
| **Provider** | Service company registered on the platform |
| **Provider Fee** | 8% commission on completed jobs (min $3.50) |
| **RBAC** | Role-Based Access Control; permission system |
| **Referral** | New user signup attributed to existing user |
| **Resolution** | Final decision on a dispute (customer favor, provider favor, split) |
| **RLS** | Row Level Security; database-level access control |
| **Service Request** | Homeowner's initial request for service |
| **Sponsor** | Local business paying for tile placement |
| **Sponsor Tile** | Advertisement placement on homeowner dashboard |
| **Supabase** | Backend-as-a-service platform for database and auth |
| **Verified Tier** | Provider tier requiring background check, insurance, license |
| **Webhook** | HTTP callback for external service notifications (e.g., Stripe) |

---

## 14. Support Escalation & Incident Response Playbook

### 14.1 Escalation Tiers

| Tier | Handled By | Response Time | Examples |
|------|------------|---------------|----------|
| L1 | Admin | <4 hours | Standard disputes, user questions |
| L2 | Senior Admin | <2 hours | Complex disputes, fraud review |
| L3 | Engineering | <1 hour | System issues, security incidents |
| L4 | Leadership | Immediate | Major outages, legal issues |

### 14.2 When to Escalate

**Escalate to L2 if:**
- Dispute involves >$500
- Fraud review involves potential organized fraud
- Customer threatens legal action
- Provider has pattern of issues

**Escalate to L3 if:**
- System is experiencing errors
- AI services are failing
- Payment processing issues
- Database performance problems

**Escalate to L4 if:**
- Major system outage (>30 min)
- Security breach suspected
- Legal action initiated
- Media inquiry

### 14.3 Incident Classification

| Severity | Description | Response |
|----------|-------------|----------|
| **SEV-1** | Full outage, all users affected | All hands, immediate |
| **SEV-2** | Major feature broken, many users affected | Engineering priority |
| **SEV-3** | Minor feature broken, some users affected | Normal priority |
| **SEV-4** | Cosmetic/minor issue, few users affected | Backlog |

### 14.4 Incident Response Steps

**1. Identify**
- What is happening?
- When did it start?
- Who is affected?
- What is the impact?

**2. Contain**
- Stop the bleeding
- Disable affected features if necessary
- Communicate status

**3. Investigate**
- Check logs
- Identify root cause
- Document findings

**4. Resolve**
- Implement fix
- Test thoroughly
- Deploy carefully

**5. Recover**
- Verify resolution
- Monitor for recurrence
- Update affected users

**6. Review**
- Post-incident review
- Document lessons learned
- Update procedures

### 14.5 Communication Templates

**Outage Acknowledgment:**
> "We're aware of an issue affecting [feature]. Our team is investigating and we'll provide updates as we have more information. Thank you for your patience."

**Resolution:**
> "The issue affecting [feature] has been resolved as of [time]. Normal operation has resumed. We apologize for any inconvenience."

**Extended Outage:**
> "Our team continues to work on the [feature] issue. Current status: [status]. We expect to have an update by [time]. Thank you for your patience."

### 14.6 Emergency Contacts

[TBD — confirm in product] Document emergency contacts:
- Engineering Lead: [contact]
- Security: [contact]
- CEO/Founder: [contact]

### 14.7 Support Code Flow

When users contact support with issues:

1. User generates Support Code from app
2. Support Code format: `SUP-[timestamp]-[userId-prefix]`
3. Admin looks up code in system
4. Code provides context: user, recent actions, error details

---

## 15. Chatbot KB Add-On

### 15.1 KB Chunks (JSON)

```json
[
  {
    "id": "admin-kb-001",
    "topic": "Admin Dashboard Access",
    "content": "The Admin Dashboard is located at /app/admin and displays KPIs including monthly revenue, active homeowners, active providers, and average provider rating. Only users with admin role can access this page."
  },
  {
    "id": "admin-kb-002",
    "topic": "User Management",
    "content": "Admins manage users at /app/admin/users. They can view user details, edit profile information (name, phone, active status), and add properties on behalf of users. Email cannot be changed through admin UI."
  },
  {
    "id": "admin-kb-003",
    "topic": "User Deactivation",
    "content": "To deactivate a user, go to their detail page, toggle Account Active to OFF, and save. Inactive users cannot log in but their data is preserved. Reactivate by toggling back to ON."
  },
  {
    "id": "admin-kb-004",
    "topic": "Provider Tiers",
    "content": "Provider tiers are: None (default, free), Verified ($10/mo, requires background check, insurance, license), and Preferred ($15/mo additional, requires 4.5+ rating, 10+ jobs, <5% disputes, <4h response)."
  },
  {
    "id": "admin-kb-005",
    "topic": "Provider Verification",
    "content": "To verify a provider, confirm: background check cleared, valid general liability insurance, valid trade license, business registration. Update verification_status after confirming all requirements."
  },
  {
    "id": "admin-kb-006",
    "topic": "Dispute Management",
    "content": "Disputes are managed at /app/admin/disputes. Customers have 72 hours after payment to file. Admins review evidence and select resolution: customer favor (refund), provider favor (release payment), or split (partial refund)."
  },
  {
    "id": "admin-kb-007",
    "topic": "Dispute Resolution Process",
    "content": "To resolve a dispute: 1) Review booking timeline, 2) Check invoices and change orders, 3) Read message history, 4) Consider AI Summary (advisory only), 5) Select resolution type, 6) Add notes, 7) Submit decision."
  },
  {
    "id": "admin-kb-008",
    "topic": "AI Summary for Disputes",
    "content": "The AI Summary panel provides timeline reconstruction, key issue identification, and refund recommendations. AI recommendations are non-binding and advisory only. Human judgment is always required for final decisions."
  },
  {
    "id": "admin-kb-009",
    "topic": "Fraud Review Queue",
    "content": "The fraud review queue at /app/admin/fraud-review shows referrals flagged by AI. Risk scores: 0-30 (low), 31-60 (medium), 61-100 (high). AI signals are advisory only; never auto-reject based on score alone."
  },
  {
    "id": "admin-kb-010",
    "topic": "Platform Configuration",
    "content": "Platform config at /app/admin/config allows changing pricing, fees, provider tiers, feature flags, and marketplace settings without redeploying. Changes take effect immediately."
  },
  {
    "id": "admin-kb-011",
    "topic": "Diagnostic Fees",
    "content": "Diagnostic fees are upfront charges before service: Handyman $49, Plumbing $79, Electrical $79, HVAC $89. Fees are creditable toward the final invoice by default."
  },
  {
    "id": "admin-kb-012",
    "topic": "Platform Fees",
    "content": "Homeowner platform fees are tiered by job size: <$300 = $6, $300-$1500 = $12, >$1500 = $25 (capped). Provider commission is 8% with $3.50 minimum."
  },
  {
    "id": "admin-kb-013",
    "topic": "Feature Flags",
    "content": "Feature flags enable/disable platform features: AI intake, media quality check, provider copilot, admin triage, CRM copilot, maintenance coach, sponsor copy, sponsor tiles, marketplace payments, provider CRM, realtor referral."
  },
  {
    "id": "admin-kb-014",
    "topic": "AI Operations Monitoring",
    "content": "AI Ops tab shows daily spend, call volume, active users, error rate, top task types, and 7-day cost trend. Default budget is $100/day with alert at 75% ($75)."
  },
  {
    "id": "admin-kb-015",
    "topic": "AI Data Retention",
    "content": "AI data retention defaults: AI jobs 180 days, AI outputs 180 days, media references 30 days. Aggregate metrics are preserved after cleanup. Manual cleanup available via Run Cleanup Now button."
  },
  {
    "id": "admin-kb-016",
    "topic": "Cron Jobs",
    "content": "Automated cron jobs: process-transfers (hourly, provider payouts after 72h), provider-qualification (weekly, tier eligibility), referral-qualification (daily, sponsor rewards), ai-cleanup (daily 3 AM, data cleanup)."
  },
  {
    "id": "admin-kb-017",
    "topic": "Daily Operations",
    "content": "Daily admin checklist: Check dashboard for KPI changes, review pending disputes (within 4 hours), review fraud queue (prioritize high risk), check AI budget, monitor error rate (alert if >5%)."
  },
  {
    "id": "admin-kb-018",
    "topic": "Booking Lifecycle",
    "content": "Booking flow: Service Request → Diagnostic Fee → Provider Matches → Estimate → Approval (20% buffer) → Scheduled → In Progress → Completed → Invoice → Customer Approval (24h auto) → 72h Dispute Window → Provider Transfer."
  },
  {
    "id": "admin-kb-019",
    "topic": "Payment Flow",
    "content": "Payment authorization includes 20% buffer (max $250 extra). Auto-approve after 24h if no customer action. 72h dispute window after payment capture. Provider receives funds after dispute window closes."
  },
  {
    "id": "admin-kb-020",
    "topic": "Role-Based Access",
    "content": "User roles: customer (homeowner), provider (service company), handyman (contractor), admin (platform admin), territory_manager (regional oversight), franchisee (franchise operator). Admin role required for admin dashboard access."
  },
  {
    "id": "admin-kb-021",
    "topic": "Security Practices",
    "content": "Admin security: never share credentials, use unique passwords, report suspicious activity, don't modify production data directly, document all database changes, access user data only when necessary."
  },
  {
    "id": "admin-kb-022",
    "topic": "Audit Trails",
    "content": "Admin actions logged include: config changes (updated_by, updated_at), dispute resolutions (resolved_by, resolved_at), fraud review decisions. All decisions documented for audit purposes."
  },
  {
    "id": "admin-kb-023",
    "topic": "Incident Response",
    "content": "Incident response: Identify issue and impact, contain/disable if needed, investigate root cause, resolve and test, verify and monitor, conduct post-incident review. Escalate to L3/L4 for system issues or security incidents."
  },
  {
    "id": "admin-kb-024",
    "topic": "KPI Targets",
    "content": "KPI targets: Booking completion rate >90%, dispute rate <5%, provider response time <4h, avg provider rating >4.5, verified providers >50%, preferred providers >10%."
  },
  {
    "id": "admin-kb-025",
    "topic": "Content Management",
    "content": "Marketing content lives in /src/content/site.ts (single source of truth). Handbooks are in /docs/ folder. Each handbook includes Chatbot KB Add-On for chatbot integration. Update content quarterly."
  }
]
```

### 15.2 FAQ Pairs (JSON)

```json
[
  {
    "id": "admin-faq-001",
    "question": "How do I access the Admin Dashboard?",
    "answer": "Navigate to /app/admin after logging in with an admin account. You must have the 'admin' role in your profile to access this page."
  },
  {
    "id": "admin-faq-002",
    "question": "How do I deactivate a user account?",
    "answer": "Go to /app/admin/users/[userId], toggle 'Account Active' switch to OFF, and click 'Save Changes'. The user will no longer be able to log in."
  },
  {
    "id": "admin-faq-003",
    "question": "Can I change a user's email address?",
    "answer": "No, email is read-only in the admin UI. Email changes require access to the Supabase Auth console."
  },
  {
    "id": "admin-faq-004",
    "question": "What are the requirements for Preferred tier?",
    "answer": "Preferred tier requires: Verified status, 4.5+ average rating, 10+ completed jobs, less than 5% dispute rate, and less than 4 hours average response time."
  },
  {
    "id": "admin-faq-005",
    "question": "How long do customers have to file a dispute?",
    "answer": "Customers have 72 hours after payment is captured to file a dispute."
  },
  {
    "id": "admin-faq-006",
    "question": "Does the AI automatically resolve disputes?",
    "answer": "No. AI provides advisory recommendations only. Human judgment is always required for final dispute resolution decisions."
  },
  {
    "id": "admin-faq-007",
    "question": "What happens when I select 'Customer Favor' resolution?",
    "answer": "A full refund is processed to the customer's original payment method. The provider does not receive payment. This is logged in the dispute record."
  },
  {
    "id": "admin-faq-008",
    "question": "What's the difference between diagnostic fees and platform fees?",
    "answer": "Diagnostic fees are charged upfront before service ($49-$89 by category) and are creditable toward the final invoice. Platform fees are charged on completed jobs ($6-$25 by job size)."
  },
  {
    "id": "admin-faq-009",
    "question": "Do config changes require a deploy?",
    "answer": "No. Platform configuration is stored in the database and changes take effect immediately without redeploying."
  },
  {
    "id": "admin-faq-010",
    "question": "What is the daily AI budget?",
    "answer": "The default daily AI budget is $100. An alert triggers when spending reaches 75% ($75). Budget can be configured in AI Operations settings."
  },
  {
    "id": "admin-faq-011",
    "question": "How do I run manual AI cleanup?",
    "answer": "Go to Admin Dashboard > AI Ops tab, then click 'Run Cleanup Now' button. This immediately removes AI data older than the retention period."
  },
  {
    "id": "admin-faq-012",
    "question": "What are feature flags?",
    "answer": "Feature flags are toggles to enable or disable platform features without code changes. Examples include AI intake, sponsor tiles, marketplace payments, and provider CRM."
  },
  {
    "id": "admin-faq-013",
    "question": "How often are provider qualifications checked?",
    "answer": "The provider-qualification cron job runs weekly to check if providers meet Preferred tier thresholds and updates their eligibility status."
  },
  {
    "id": "admin-faq-014",
    "question": "What should I do if I see a high AI error rate?",
    "answer": "Investigate if error rate is consistently above 5%. Check AI Ops panel for error details, review recent task types for patterns, and escalate to engineering if the issue persists."
  },
  {
    "id": "admin-faq-015",
    "question": "How do I add a property for a user?",
    "answer": "Go to the user detail page at /app/admin/users/[userId], click 'Add Property' button, and complete the property form. The property will be linked to the user with 'owner' role."
  },
  {
    "id": "admin-faq-016",
    "question": "What is the estimate buffer?",
    "answer": "When a customer approves an estimate, an additional 20% (capped at $250) is authorized to cover potential scope increases. This buffer reduces the need for change orders."
  },
  {
    "id": "admin-faq-017",
    "question": "What triggers auto-approve for invoices?",
    "answer": "If a customer takes no action on an invoice for 24 hours, it is automatically approved and the payment is captured."
  },
  {
    "id": "admin-faq-018",
    "question": "How do I view the fraud review queue?",
    "answer": "Navigate to /app/admin/fraud-review. The queue shows referrals flagged by AI with risk scores. Review high-risk items first (score 61-100)."
  },
  {
    "id": "admin-faq-019",
    "question": "What are the risk score levels in fraud review?",
    "answer": "Low risk: 0-30, Medium risk: 31-60, High risk: 61-100. High-risk items should be reviewed with priority and may require additional investigation."
  },
  {
    "id": "admin-faq-020",
    "question": "How long is AI data retained?",
    "answer": "AI jobs and outputs are retained for 180 days. Media references are retained for 30 days. Aggregate metrics are preserved indefinitely even after cleanup."
  },
  {
    "id": "admin-faq-021",
    "question": "What cron jobs run automatically?",
    "answer": "Four cron jobs: process-transfers (hourly), provider-qualification (weekly), referral-qualification (daily), ai-cleanup (daily at 3 AM)."
  },
  {
    "id": "admin-faq-022",
    "question": "How do I report a security issue?",
    "answer": "Document your findings and report to the engineering/security team immediately. Do not attempt to fix without authorization and do not discuss externally."
  },
  {
    "id": "admin-faq-023",
    "question": "When should I escalate to engineering?",
    "answer": "Escalate to L3 (engineering) for: system errors, AI service failures, payment processing issues, or database performance problems."
  },
  {
    "id": "admin-faq-024",
    "question": "What is the provider commission rate?",
    "answer": "Providers pay 8% commission on completed jobs with a minimum of $3.50 per job. Excludes tax, tip, and permit fees from the commissionable amount."
  },
  {
    "id": "admin-faq-025",
    "question": "How do I update marketing content?",
    "answer": "Edit the file /src/content/site.ts which is the single source of truth for pricing, FAQs, services, and other marketing content. Rebuild and deploy after changes."
  }
]
```

### 15.3 Intent Map (YAML)

```yaml
# Admin Handbook - Chatbot Intent Map
# Version: 1.0
# Updated: December 2024

intents:
  # Dashboard & Navigation
  admin_dashboard_access:
    patterns:
      - "access admin dashboard"
      - "get to admin"
      - "admin page"
      - "admin login"
    response_key: admin-kb-001

  admin_navigation:
    patterns:
      - "where is admin"
      - "find admin settings"
      - "admin menu"
    response_key: admin-kb-001

  # User Management
  user_management:
    patterns:
      - "manage users"
      - "user list"
      - "view users"
      - "customer accounts"
    response_key: admin-kb-002

  deactivate_user:
    patterns:
      - "deactivate user"
      - "disable account"
      - "suspend user"
      - "turn off account"
    response_key: admin-kb-003

  add_property_for_user:
    patterns:
      - "add property for user"
      - "create property admin"
      - "add home for customer"
    response_key: admin-kb-002

  # Provider Management
  provider_tiers:
    patterns:
      - "provider tiers"
      - "verified tier"
      - "preferred tier"
      - "provider levels"
    response_key: admin-kb-004

  provider_verification:
    patterns:
      - "verify provider"
      - "provider verification"
      - "background check"
      - "insurance check"
    response_key: admin-kb-005

  # Disputes
  dispute_management:
    patterns:
      - "manage disputes"
      - "dispute queue"
      - "pending disputes"
      - "customer disputes"
    response_key: admin-kb-006

  dispute_resolution:
    patterns:
      - "resolve dispute"
      - "close dispute"
      - "dispute decision"
      - "refund dispute"
    response_key: admin-kb-007

  ai_dispute_summary:
    patterns:
      - "AI summary"
      - "dispute AI"
      - "AI recommendation"
    response_key: admin-kb-008

  # Fraud
  fraud_review:
    patterns:
      - "fraud review"
      - "fraud queue"
      - "suspicious activity"
      - "fraud detection"
    response_key: admin-kb-009

  fraud_risk_scores:
    patterns:
      - "risk score"
      - "fraud score"
      - "high risk"
    response_key: admin-kb-009

  # Configuration
  platform_config:
    patterns:
      - "platform config"
      - "change settings"
      - "admin config"
      - "update pricing"
    response_key: admin-kb-010

  diagnostic_fees:
    patterns:
      - "diagnostic fees"
      - "upfront fee"
      - "service fee"
    response_key: admin-kb-011

  platform_fees:
    patterns:
      - "platform fee"
      - "commission"
      - "provider fee"
    response_key: admin-kb-012

  feature_flags:
    patterns:
      - "feature flag"
      - "toggle feature"
      - "enable feature"
      - "disable feature"
    response_key: admin-kb-013

  # AI Operations
  ai_ops_monitoring:
    patterns:
      - "AI ops"
      - "AI monitoring"
      - "AI costs"
      - "AI budget"
    response_key: admin-kb-014

  ai_data_retention:
    patterns:
      - "AI retention"
      - "AI cleanup"
      - "delete AI data"
    response_key: admin-kb-015

  ai_error_rate:
    patterns:
      - "AI error"
      - "AI failing"
      - "AI problems"
    response_key: admin-kb-014

  # Operations
  cron_jobs:
    patterns:
      - "cron job"
      - "scheduled task"
      - "automated job"
    response_key: admin-kb-016

  daily_operations:
    patterns:
      - "daily checklist"
      - "morning tasks"
      - "admin duties"
    response_key: admin-kb-017

  # Bookings & Payments
  booking_lifecycle:
    patterns:
      - "booking flow"
      - "booking status"
      - "booking lifecycle"
    response_key: admin-kb-018

  payment_flow:
    patterns:
      - "payment flow"
      - "estimate buffer"
      - "auto approve"
      - "dispute window"
    response_key: admin-kb-019

  # Security
  security_practices:
    patterns:
      - "security"
      - "admin security"
      - "access control"
    response_key: admin-kb-021

  audit_trails:
    patterns:
      - "audit log"
      - "action history"
      - "admin actions"
    response_key: admin-kb-022

  incident_response:
    patterns:
      - "incident"
      - "escalation"
      - "emergency"
      - "outage"
    response_key: admin-kb-023

  # KPIs & Reporting
  kpi_targets:
    patterns:
      - "KPI"
      - "metrics"
      - "performance targets"
    response_key: admin-kb-024

  # Content
  content_management:
    patterns:
      - "update content"
      - "marketing content"
      - "handbook update"
    response_key: admin-kb-025

  # Fallback
  admin_help:
    patterns:
      - "admin help"
      - "how do I"
      - "need help"
    response_key: admin-kb-001

# Entities
entities:
  user_action:
    - deactivate
    - activate
    - edit
    - view
    - add

  dispute_resolution:
    - customer favor
    - provider favor
    - split
    - reject

  provider_tier:
    - none
    - verified
    - preferred

  risk_level:
    - low
    - medium
    - high

  config_category:
    - pricing
    - fees
    - providers
    - features
```

---

*End of Admin & Super Admin Handbook*

**Last Updated:** December 2024
**Version:** 1.0
**Author:** RegularUpkeep Platform Team
