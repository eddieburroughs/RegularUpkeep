# RegularUpkeep Standard Operating Procedures (SOP) Pack

**Version:** 1.0
**Effective Date:** December 2024
**Owner:** Operations Team
**Review Cycle:** Quarterly

---

## Table of Contents

1. [SOP-001: No-Show / Late Arrival](#sop-001-no-show--late-arrival)
2. [SOP-002: Cancellations](#sop-002-cancellations)
3. [SOP-003: Scope Changes & Change Orders](#sop-003-scope-changes--change-orders)
4. [SOP-004: Poor Workmanship / Quality Complaints](#sop-004-poor-workmanship--quality-complaints)
5. [SOP-005: Property Access Issues](#sop-005-property-access-issues)
6. [SOP-006: Emergency vs Non-Emergency Routing](#sop-006-emergency-vs-non-emergency-routing)
7. [SOP-007: Fraud / Suspicious Activity](#sop-007-fraud--suspicious-activity)
8. [SOP-008: Refunds / Credits / Re-Dispatch](#sop-008-refunds--credits--re-dispatch)
9. [SOP-009: Provider Performance Enforcement](#sop-009-provider-performance-enforcement)
10. [SOP-010: Recordkeeping Requirements](#sop-010-recordkeeping-requirements)
11. [Chatbot Knowledge Base Add-On](#chatbot-knowledge-base-add-on)

---

# SOP-001: No-Show / Late Arrival

## Purpose
Define procedures for handling situations where a provider or handyman fails to arrive at the scheduled appointment time or arrives significantly late.

## When to Use / Trigger Conditions
- Provider has not arrived within 15 minutes of scheduled start time
- Provider has not marked "On My Way" within expected travel time
- Homeowner reports provider has not arrived
- Provider cancels after marking "On My Way"

## Inputs Required
- Booking ID
- Scheduled appointment time
- Provider status timestamps (accepted, on_my_way, arrived)
- Homeowner contact info
- Provider contact info
- Any messages exchanged

## Step-by-Step Procedure

### For Support Agents

1. **Verify booking details**
   - Pull up booking by ID or support code
   - Confirm scheduled time and current status
   - Check provider's last known status update

2. **Attempt provider contact**
   - Call provider within 5 minutes of no-show report
   - Document call attempts (time, outcome)
   - If no answer after 2 attempts, proceed to Step 3

3. **Assess situation**
   - If provider responds with valid reason (traffic, emergency), negotiate new ETA
   - If provider is unreachable or ETA unacceptable, proceed to re-dispatch

4. **Execute resolution**
   - Apply appropriate resolution per decision tree
   - Update booking status
   - Notify homeowner of outcome

5. **Document and tag**
   - Log all actions in booking notes
   - Apply appropriate tags for reporting

### For Providers/Handymen

1. **If running late (before scheduled time)**
   - Update status to "Running Late" in app immediately
   - Message homeowner with revised ETA
   - If delay exceeds 30 minutes, contact support

2. **If unable to make appointment**
   - Contact support IMMEDIATELY (do not just no-show)
   - Provide reason and any documentation
   - Accept re-assignment penalty if applicable

## Decision Tree

```
Provider status at scheduled time?
├── "On My Way" marked
│   ├── Within 15 min of appointment → Wait, monitor
│   ├── 15-30 min late
│   │   ├── Provider reachable → Get ETA, notify homeowner
│   │   └── Provider unreachable → Re-dispatch, flag provider
│   └── 30+ min late → Re-dispatch, flag provider, consider compensation
│
├── No status update
│   ├── Provider reachable
│   │   ├── Valid emergency → Reschedule, no penalty
│   │   ├── Forgot/overbooked → Re-dispatch, warning to provider
│   │   └── Refuses to come → Re-dispatch, strike to provider
│   └── Provider unreachable (2+ attempts)
│       └── Re-dispatch, strike to provider, escalate if pattern
│
└── "Arrived" marked but homeowner says not there
    └── Investigate (GPS check if available), resolve discrepancy
```

## Customer Scripts

### CS-001-01: Initial Contact (Homeowner reports no-show)
```
Hi [Homeowner Name],

I'm sorry to hear your provider hasn't arrived yet. I'm looking into this right now.

I can see your appointment was scheduled for [TIME]. Let me contact [Provider Name] to get an update. I'll message you back within 10 minutes with next steps.

In the meantime, please stay available at the property if possible.
```

### CS-001-02: Provider Running Late (ETA provided)
```
Hi [Homeowner Name],

I just spoke with [Provider Name]. They're running about [X] minutes late due to [REASON] and expect to arrive by [NEW TIME].

Does this new time work for you? If not, I can reschedule to a time that's more convenient.

Let me know how you'd like to proceed.
```

### CS-001-03: Re-Dispatch Required
```
Hi [Homeowner Name],

I apologize, but [Provider Name] is unable to make today's appointment. I know this is frustrating.

I'm working on finding another available provider right now. I'll have an update for you within [30 minutes/1 hour].

As a courtesy for this inconvenience, [we're waiving your diagnostic fee / applying a $X credit to your account].

Thank you for your patience.
```

### CS-001-04: Homeowner Wants to Cancel
```
Hi [Homeowner Name],

I completely understand. Given the circumstances, I've canceled this booking with no charge to you.

When you're ready to reschedule, just submit a new request and we'll prioritize matching you with a reliable provider.

Again, I'm very sorry for this experience.
```

## Provider Scripts

### PS-001-01: Running Late Notification (Provider → Homeowner)
```
Hi [Homeowner Name],

I'm running about [X] minutes behind schedule due to [traffic/previous job running long]. I expect to arrive at [NEW TIME].

I apologize for any inconvenience. Please let me know if this time still works for you.

Thank you for your understanding.
```

### PS-001-02: Warning from Support (Support → Provider)
```
Hi [Provider Name],

We're reaching out regarding booking #[BOOKING_ID] scheduled for [DATE/TIME].

The homeowner reported you did not arrive and we were unable to reach you. This has been logged as a no-show.

No-shows negatively impact your provider rating and matching priority. Repeated no-shows may result in account suspension.

If there were extenuating circumstances, please reply with details so we can update our records.

Going forward, please update your status in the app and contact support immediately if you cannot make an appointment.
```

### PS-001-03: Emergency Excuse Accepted
```
Hi [Provider Name],

Thank you for explaining the situation. We understand that [EMERGENCY REASON] was beyond your control.

This incident has been documented as an excused absence and will not count against your performance record.

Please let us know when you're available to take bookings again.
```

## Resolution Outcomes

| Outcome | Homeowner Action | Provider Action | System Action |
|---------|------------------|-----------------|---------------|
| Rescheduled (same provider) | Notify new time | Confirm availability | Update booking |
| Re-dispatched (new provider) | Notify reassignment | Remove from booking | Match new provider |
| Canceled (no charge) | Full refund if paid | No payment | Close booking |
| Canceled (partial credit) | Credit applied | No payment | Close + credit |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `no_show:provider` | Provider did not arrive |
| `late_arrival:15-30min` | Arrived 15-30 min late |
| `late_arrival:30+min` | Arrived 30+ min late |
| `no_show:excused` | Valid emergency excuse |
| `redispatch:no_show` | Re-dispatched due to no-show |
| `compensation:no_show` | Credit/refund issued for no-show |

## SLA Targets

| Metric | Target |
|--------|--------|
| Initial response to homeowner report | 5 minutes |
| Provider contact attempt | 10 minutes |
| Re-dispatch initiated | 30 minutes |
| Homeowner update on resolution | 1 hour |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Provider has 3+ no-shows in 30 days | Admin for review |
| VIP/Premium homeowner affected | Senior Support |
| Provider disputes no-show determination | Admin |
| Unable to re-dispatch within 2 hours | Territory Manager |

---

# SOP-002: Cancellations

## Purpose
Define procedures for handling booking cancellations by homeowners, providers, or the platform, including fee policies and re-booking options.

## When to Use / Trigger Conditions
- Homeowner requests to cancel a confirmed booking
- Provider requests to cancel an accepted booking
- Platform needs to cancel (provider removal, safety concern, etc.)
- Booking auto-cancels due to non-payment or expiration

## Inputs Required
- Booking ID
- Cancellation requestor (homeowner/provider/system)
- Time until scheduled appointment
- Reason for cancellation
- Payment status (diagnostic fee paid, estimate authorized)
- Provider assignment status

## Step-by-Step Procedure

### For Homeowner Cancellations

1. **Check cancellation timing**
   - Calculate hours until scheduled appointment
   - Determine applicable cancellation policy

2. **Apply cancellation policy**
   - 24+ hours: Full refund of diagnostic fee
   - 12-24 hours: 50% diagnostic fee refund
   - Under 12 hours: No refund (unless provider not yet assigned)
   - After provider en route: No refund

3. **Process cancellation**
   - Update booking status to "Canceled by Customer"
   - Process refund if applicable
   - Notify provider of cancellation
   - Release authorization hold if estimate was approved

4. **Offer alternatives**
   - Ask if homeowner wants to reschedule
   - Note any issues for follow-up

### For Provider Cancellations

1. **Assess impact and timing**
   - How close to appointment?
   - Can we re-dispatch in time?

2. **Document reason**
   - Emergency (excused)
   - Overbooked (not excused)
   - Customer issue (investigate)

3. **Execute re-dispatch or cancel**
   - If time permits, find replacement provider
   - If not, cancel and compensate homeowner

4. **Apply provider consequences**
   - Log cancellation against provider
   - Apply warning/strike if applicable

## Decision Tree

```
Who is canceling?
├── Homeowner
│   ├── 24+ hours before appointment
│   │   └── Full refund, no penalty, offer reschedule
│   ├── 12-24 hours before
│   │   └── 50% refund, log reason, offer reschedule
│   ├── Under 12 hours
│   │   ├── Provider not assigned → Full refund
│   │   └── Provider assigned → No refund (or case-by-case)
│   └── Provider already en route
│       └── No refund, compensate provider for trip
│
├── Provider
│   ├── 24+ hours before
│   │   └── Reschedule or re-dispatch, no penalty if first occurrence
│   ├── Under 24 hours
│   │   ├── Valid emergency → Excused, re-dispatch
│   │   └── No valid reason → Strike, re-dispatch, compensate homeowner
│   └── After marking en route
│       └── Serious infraction, possible suspension
│
└── Platform/Admin
    ├── Safety concern → Cancel, full refund, document
    ├── Provider removed → Re-dispatch or refund
    └── Payment issue → Hold booking, contact homeowner
```

## Customer Scripts

### CS-002-01: Cancellation Confirmed (Full Refund)
```
Hi [Homeowner Name],

Your booking #[BOOKING_ID] for [DATE/TIME] has been canceled.

Your diagnostic fee of $[AMOUNT] will be refunded to your original payment method within 3-5 business days.

If you'd like to reschedule, just submit a new request anytime. We're here to help.
```

### CS-002-02: Cancellation with Partial Refund
```
Hi [Homeowner Name],

Your booking #[BOOKING_ID] for [DATE/TIME] has been canceled.

Since this cancellation was made within 24 hours of your appointment, a 50% cancellation fee applies per our policy. We've refunded $[AMOUNT] to your original payment method.

If you'd like to reschedule for a future date, submit a new request and we'll get you matched quickly.
```

### CS-002-03: Cancellation Denied (Too Late)
```
Hi [Homeowner Name],

I understand you'd like to cancel your booking #[BOOKING_ID].

Unfortunately, since [Provider Name] is already en route / the appointment is in less than [X] hours, we're unable to process a refund at this time.

If there's an emergency preventing you from being home, please let me know and we can discuss options.
```

### CS-002-04: Provider Canceled Your Booking
```
Hi [Homeowner Name],

I'm reaching out because [Provider Name] has unfortunately had to cancel your booking scheduled for [DATE/TIME] due to [an emergency / unforeseen circumstances].

We're actively working to find a replacement provider for you. I'll update you within [30 minutes] with options.

We apologize for this inconvenience and appreciate your patience.
```

## Provider Scripts

### PS-002-01: Cancellation Request Process
```
Hi [Provider Name],

We've received your request to cancel booking #[BOOKING_ID] scheduled for [DATE/TIME].

Please reply with your reason for cancellation so we can document appropriately:
- Emergency (medical, family, vehicle breakdown)
- Scheduling conflict
- Unable to perform requested work
- Customer-related issue
- Other (please specify)

Note: Cancellations without valid reason may affect your performance score.
```

### PS-002-02: Cancellation Accepted (Excused)
```
Hi [Provider Name],

Your cancellation for booking #[BOOKING_ID] has been processed as an excused absence.

We've reassigned the job to another provider. This will not count against your performance record.

Please let us know when you're available to accept new bookings.
```

### PS-002-03: Cancellation Warning
```
Hi [Provider Name],

Your cancellation for booking #[BOOKING_ID] has been logged.

This is your [1st/2nd/3rd] cancellation in the past 30 days. Frequent cancellations impact your matching priority and may result in account review.

If you're having difficulty managing your schedule, please reach out—we're here to help.
```

## Resolution Outcomes

| Scenario | Homeowner | Provider | Platform |
|----------|-----------|----------|----------|
| HO cancel 24+ hrs | Full refund | Released | Close booking |
| HO cancel 12-24 hrs | 50% refund | May receive partial | Close booking |
| HO cancel <12 hrs | No refund | Receives trip fee | Close booking |
| Provider cancel (excused) | Re-dispatch/refund | No penalty | Re-assign |
| Provider cancel (not excused) | Re-dispatch + credit | Strike logged | Re-assign + flag |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `cancel:homeowner:24plus` | HO canceled 24+ hrs ahead |
| `cancel:homeowner:12-24` | HO canceled 12-24 hrs ahead |
| `cancel:homeowner:late` | HO canceled <12 hrs |
| `cancel:provider:excused` | Provider canceled with valid reason |
| `cancel:provider:unexcused` | Provider canceled without valid reason |
| `cancel:platform` | Platform-initiated cancellation |
| `cancel:reschedule` | Canceled with immediate reschedule |

## SLA Targets

| Metric | Target |
|--------|--------|
| Process cancellation request | 15 minutes |
| Refund initiated | Same day |
| Provider notification | Immediate |
| Re-dispatch (if applicable) | 1 hour |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Homeowner disputes cancellation fee | Senior Support |
| Provider has 3+ cancellations in 30 days | Admin for review |
| VIP homeowner requests exception | Manager approval |
| Unable to re-dispatch within 4 hours | Territory Manager |

---

# SOP-003: Scope Changes & Change Orders

## Purpose
Define procedures for handling requests to modify the scope of work after an estimate has been approved, including change order creation, approval, and billing.

## When to Use / Trigger Conditions
- Provider discovers additional work needed on-site
- Homeowner requests additional work during service visit
- Original scope cannot be completed as estimated
- Work will exceed estimate by more than 10% or $75

## Inputs Required
- Original booking/estimate ID
- Original scope and price
- Proposed change description
- New total estimate
- Reason for change
- Photos documenting need for change
- Homeowner consent (if obtained verbally)

## Step-by-Step Procedure

### For Providers (On-Site)

1. **Stop work before exceeding scope**
   - Do NOT perform work beyond original estimate
   - Document the additional need with photos

2. **Create change order in app**
   - Navigate to active job → "Request Change Order"
   - Describe additional work needed
   - Add new line items with pricing
   - Upload supporting photos
   - Submit for homeowner approval

3. **Communicate with homeowner**
   - Explain what was found and why additional work is needed
   - Review change order together if on-site
   - Do NOT proceed until approval received in app

4. **Wait for approval**
   - Change order requires digital approval from homeowner
   - If homeowner declines, complete only original scope
   - If homeowner approves, proceed with additional work

### For Homeowners

1. **Review change order notification**
   - Open change order in app
   - Review description and new pricing
   - View photos of issue

2. **Make decision**
   - Approve: Payment authorization updated, work proceeds
   - Decline: Only original scope completed
   - Ask questions: Message provider for clarification

3. **Provide digital approval**
   - Must tap "Approve" in app
   - Verbal approval is NOT sufficient

### For Support Agents

1. **If homeowner contacts about change order**
   - Explain the process
   - Help them access and understand the change order
   - Do NOT approve on their behalf

2. **If dispute arises**
   - Review original estimate vs change order
   - Check photo documentation
   - Mediate between parties

## Decision Tree

```
Additional work discovered on-site
├── Exceeds estimate by 10%+ OR $75+
│   ├── Provider creates change order
│   │   ├── Homeowner approves → Proceed, update authorization
│   │   ├── Homeowner declines → Complete original scope only
│   │   └── Homeowner unreachable → Complete original, note for follow-up
│   └── Provider proceeds WITHOUT change order
│       └── Provider may not be paid for additional work
│
├── Under 10% AND under $75
│   ├── Minor adjustment → Can proceed, explain at completion
│   └── Should still document and communicate
│
└── Original scope cannot be completed
    ├── Different issue than described → Change order for new issue
    ├── Parts unavailable → Partial completion + reschedule
    └── Safety concern discovered → Stop, document, escalate
```

## Customer Scripts

### CS-003-01: Explaining Change Order Process
```
Hi [Homeowner Name],

[Provider Name] has found additional work needed at your property. They've submitted a change order request for your review.

Here's what was found:
[DESCRIPTION FROM CHANGE ORDER]

The additional cost would be $[AMOUNT], bringing your new total to $[NEW TOTAL].

To proceed:
1. Open the RegularUpkeep app
2. Go to your active booking
3. Review the change order details and photos
4. Tap "Approve" or "Decline"

The provider will wait for your decision before doing any additional work. Let me know if you have questions.
```

### CS-003-02: Homeowner Declines Change Order
```
Hi [Homeowner Name],

I've noted that you've declined the change order for additional work.

[Provider Name] will complete the original scope of work as estimated. The additional issue they identified will not be addressed at this time.

If you'd like to schedule a separate appointment for the additional work in the future, just submit a new service request.
```

### CS-003-03: Change Order Dispute
```
Hi [Homeowner Name],

I understand you have concerns about the change order submitted by [Provider Name].

Let me review the details:
- Original estimate: $[AMOUNT]
- Change order amount: $[AMOUNT]
- Reason given: [REASON]

I can see [X] photos were submitted documenting the issue.

Would you like me to:
1. Connect you directly with the provider to discuss?
2. Have a senior technician review the documentation?
3. Proceed with original scope only?

Let me know how you'd like to proceed.
```

## Provider Scripts

### PS-003-01: Requesting Change Order (Provider → Homeowner)
```
Hi [Homeowner Name],

While working on [ORIGINAL ISSUE], I discovered [ADDITIONAL ISSUE].

This wasn't visible during the initial assessment and requires additional work to address properly.

I've submitted a change order through the app with:
- Description of additional work needed
- Photos showing the issue
- Updated pricing

Please review and approve in the app when you're ready. I'll pause on the additional work until I receive your approval.

Let me know if you have any questions.
```

### PS-003-02: Homeowner Approved Change Order
```
Hi [Homeowner Name],

Thank you for approving the change order. I'll proceed with the additional work now.

Updated scope:
- [ORIGINAL WORK]
- [ADDITIONAL WORK]

New total: $[AMOUNT]

I'll update you when everything is complete.
```

### PS-003-03: Change Order Declined - Completing Original Only
```
Hi [Homeowner Name],

I understand you'd prefer not to proceed with the additional work at this time. No problem.

I'll complete the original scope of work:
- [ORIGINAL WORK ITEMS]

Please note: [ADDITIONAL ISSUE] will remain unaddressed. If you'd like to schedule this separately in the future, just submit a new request.

I'll message you when the original work is complete.
```

## Resolution Outcomes

| Outcome | Authorization | Invoice | Provider Action |
|---------|---------------|---------|-----------------|
| Change order approved | Updated (+buffer) | Includes additional | Complete all work |
| Change order declined | Original only | Original only | Complete original only |
| Change order disputed | Held pending review | Pending | Stop, await resolution |
| No change order submitted | Original only | May dispute overage | Risk of non-payment |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `change_order:submitted` | Provider submitted change order |
| `change_order:approved` | Homeowner approved |
| `change_order:declined` | Homeowner declined |
| `change_order:disputed` | Dispute over change order |
| `scope_exceeded:no_co` | Provider exceeded scope without CO |

## SLA Targets

| Metric | Target |
|--------|--------|
| Change order review (homeowner) | 2 hours |
| Support response to CO questions | 30 minutes |
| Dispute resolution | 24 hours |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Provider completed work without approved CO | Admin |
| Homeowner disputes CO pricing | Senior Support |
| Safety-related scope change | Priority handling |
| CO amount exceeds 50% of original | Manager review |

---

# SOP-004: Poor Workmanship / Quality Complaints

## Purpose
Define procedures for handling homeowner complaints about the quality of work performed, including investigation, resolution, and provider accountability.

## When to Use / Trigger Conditions
- Homeowner reports work was not completed properly
- Homeowner reports work failed shortly after completion
- Homeowner disputes invoice based on quality
- Follow-up inspection reveals deficiencies
- Homeowner requests different provider for fix

## Inputs Required
- Booking ID
- Original scope of work
- Provider's completion photos
- Homeowner's complaint (written/photos/video)
- Time since completion
- Invoice status
- Prior complaints on this provider

## Step-by-Step Procedure

### For Support Agents

1. **Gather information**
   - Get detailed description of complaint
   - Request photos/video of current condition
   - Pull provider's completion documentation
   - Review original scope and estimate

2. **Assess complaint validity**
   - Compare homeowner complaint to provider documentation
   - Check if issue is covered under original scope
   - Determine if issue is workmanship vs. separate problem

3. **Determine appropriate resolution**
   - Follow decision tree
   - Get approval for any credits/refunds over $100

4. **Execute resolution**
   - Contact provider if callback required
   - Process refund/credit if applicable
   - Arrange re-dispatch if provider unwilling/unable

5. **Document and follow up**
   - Log all findings and decisions
   - Apply appropriate tags
   - Flag provider if pattern exists

### For Providers

1. **Respond promptly to callback request**
   - Within 24 hours of notification
   - Propose date/time for return visit

2. **Inspect and remediate**
   - Document current condition
   - Complete corrective work
   - Document completed repairs

3. **If disputing complaint**
   - Provide documentation supporting your position
   - Be professional and factual
   - Accept admin decision

## Decision Tree

```
Quality complaint received
├── Within 72-hour dispute window
│   ├── Clear workmanship issue (photos confirm)
│   │   ├── Minor fix needed → Provider callback at no charge
│   │   ├── Major rework needed → Provider callback OR refund
│   │   └── Provider disputes → Admin review
│   │
│   ├── Unclear if workmanship issue
│   │   └── Request additional documentation from both parties
│   │
│   └── Not a workmanship issue (normal wear, different problem)
│       └── Explain to homeowner, offer new service request
│
├── After 72-hour window but within 30 days
│   ├── Likely related to original work
│   │   └── Provider callback recommended (goodwill)
│   └── Unclear relationship
│       └── Case-by-case evaluation
│
└── After 30 days
    └── Standard warranty/callback policies don't apply
        └── New service request required
```

## Customer Scripts

### CS-004-01: Acknowledging Quality Complaint
```
Hi [Homeowner Name],

Thank you for bringing this to our attention. I'm sorry to hear the work didn't meet your expectations.

To help me investigate, could you please:
1. Describe specifically what's wrong
2. Send photos showing the issue
3. Let me know when you first noticed the problem

I'll review this alongside the provider's completion documentation and get back to you within [4 hours / 1 business day].

We take quality seriously and will make this right.
```

### CS-004-02: Provider Callback Scheduled
```
Hi [Homeowner Name],

I've reviewed your complaint and agree this needs to be addressed.

[Provider Name] will return to correct the issue at no additional charge. They've proposed:

Date: [DATE]
Time: [TIME WINDOW]

Does this work for you? If not, let me know your availability and I'll coordinate a better time.

I'll follow up after the visit to make sure everything was resolved to your satisfaction.
```

### CS-004-03: Offering Alternative Resolution
```
Hi [Homeowner Name],

I've reviewed your complaint and the documentation from both sides.

Based on my assessment, I'd like to offer you [one of the following options]:

Option A: Have [Provider Name] return to fix the issue at no charge
Option B: Dispatch a different provider to assess and repair (diagnostic fee waived)
Option C: [Partial refund of $X / Full refund and close the booking]

Please let me know which option works best for you.
```

### CS-004-04: Complaint Not Substantiated
```
Hi [Homeowner Name],

Thank you for your patience while I reviewed your concern.

After comparing your complaint with the provider's documentation and scope of work, I wasn't able to find evidence of defective workmanship:

[SPECIFIC EXPLANATION]

If you have additional photos or information that might help, please share them.

If you're experiencing a new issue, I'm happy to help you submit a service request to get it addressed.
```

## Provider Scripts

### PS-004-01: Callback Request Notification
```
Hi [Provider Name],

We've received a quality complaint from the homeowner for booking #[BOOKING_ID] completed on [DATE].

Issue reported: [DESCRIPTION]

Please contact the homeowner within 24 hours to schedule a callback visit to inspect and correct the issue if warranted.

The callback should be completed at no additional charge to the homeowner. Document your findings with photos.

If you believe the complaint is not valid, please respond with your documentation and explanation.
```

### PS-004-02: Callback Completed Confirmation
```
Hi [Provider Name],

Thank you for completing the callback visit for booking #[BOOKING_ID].

Please confirm:
1. What issue did you find?
2. What corrective action did you take?
3. Is the homeowner satisfied with the resolution?

Please upload any additional photos documenting the repair.
```

### PS-004-03: Quality Warning
```
Hi [Provider Name],

This is a formal notice regarding quality concerns.

In the past [30/60/90] days, you've received [X] quality complaints:
- Booking #[ID]: [Issue]
- Booking #[ID]: [Issue]

Consistent quality issues impact your rating and may result in:
- Reduced matching priority
- Required re-training
- Account suspension

Please review your processes and let us know if you need support. We want to help you succeed on our platform.
```

## Resolution Outcomes

| Outcome | Homeowner | Provider | Notes |
|---------|-----------|----------|-------|
| Callback completed | Issue resolved | No charge to HO | Document resolution |
| Partial refund | Credit applied | Partial payment | Deduct from provider |
| Full refund | Full refund | No payment | Strike logged |
| Re-dispatch | New provider sent | Removed from job | May charge original |
| Complaint dismissed | Explained findings | Full payment | No impact to provider |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `quality:complaint` | Quality complaint received |
| `quality:callback_scheduled` | Provider callback arranged |
| `quality:callback_completed` | Callback resolved issue |
| `quality:refund_partial` | Partial refund for quality |
| `quality:refund_full` | Full refund for quality |
| `quality:redispatch` | Different provider sent |
| `quality:dismissed` | Complaint not substantiated |

## SLA Targets

| Metric | Target |
|--------|--------|
| Initial response to complaint | 4 hours |
| Investigation complete | 24 hours |
| Callback scheduled | 48 hours |
| Resolution achieved | 72 hours |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Complaint involves safety issue | Immediate Admin |
| Provider has 5+ quality complaints in 90 days | Admin for review |
| Homeowner threatens legal action | Legal/Manager |
| Refund request exceeds $500 | Manager approval |
| Provider refuses callback | Admin |

---

# SOP-005: Property Access Issues

## Purpose
Define procedures for handling situations where providers cannot access the property due to lockbox codes, pets, gated communities, locked doors, or other access barriers.

## When to Use / Trigger Conditions
- Provider cannot access property (gate code, lockbox failed)
- Aggressive or loose pet prevents entry
- No one home and no access instructions
- Access instructions incorrect or incomplete
- Security/HOA denies entry

## Inputs Required
- Booking ID
- Provider location (confirm they're at correct address)
- Access instructions on file
- Homeowner contact info
- Property type (gated, apartment, single-family)
- Photos of access point/barrier

## Step-by-Step Procedure

### For Providers (On-Site)

1. **Verify location**
   - Confirm you're at the correct address
   - Check for unit/apartment number

2. **Try documented access method**
   - Follow access instructions in booking
   - Try lockbox code, gate code, etc.

3. **If access fails**
   - Document with photo (gate, lockbox, barrier)
   - Message homeowner through app
   - Wait 10 minutes for response

4. **Contact support if no response**
   - Provide booking ID and situation
   - Support will attempt to reach homeowner

5. **Wait time policy**
   - Wait up to 15 minutes after contacting support
   - If no resolution, may leave with trip fee compensation

### For Support Agents

1. **Attempt homeowner contact**
   - Call primary phone number
   - Text message
   - In-app notification

2. **If homeowner reached**
   - Get correct access info
   - Relay to provider
   - Update booking notes

3. **If homeowner unreachable**
   - Allow provider to leave after 15 min wait
   - Document as access issue
   - Attempt to reschedule

4. **Determine billing impact**
   - Provider may receive trip fee
   - Homeowner may forfeit diagnostic fee

## Decision Tree

```
Provider cannot access property
├── Wrong address/unit
│   └── Correct and proceed
│
├── Access instructions incorrect/missing
│   ├── Homeowner reachable
│   │   └── Get correct info, update booking, proceed
│   └── Homeowner unreachable (15 min wait)
│       └── Provider leaves, reschedule required
│
├── Lockbox/gate code not working
│   ├── Homeowner can provide alternative
│   │   └── Proceed with alternative access
│   └── No alternative available
│       └── Reschedule required
│
├── Pet blocking access
│   ├── Homeowner can secure pet
│   │   └── Wait and proceed
│   └── Homeowner cannot secure pet
│       └── Reschedule, note pet requirement
│
├── Security/HOA denies entry
│   ├── Homeowner can authorize remotely
│   │   └── Proceed after authorization
│   └── Requires homeowner presence
│       └── Reschedule, note requirement
│
└── Homeowner not home (no access plan)
    ├── Homeowner reachable, can return quickly
    │   └── Wait up to 30 min
    └── Homeowner cannot return
        └── Reschedule required
```

## Customer Scripts

### CS-005-01: Access Issue - Contacting Homeowner
```
Hi [Homeowner Name],

Your service provider [Provider Name] has arrived for your [TIME] appointment but is unable to access the property.

Issue: [DESCRIPTION - gate code not working / no lockbox code / pet in yard / etc.]

Can you help resolve this? Please reply ASAP or call us at [PHONE].

The provider can wait about 15 minutes before needing to move to their next appointment.
```

### CS-005-02: Access Issue Resolved
```
Hi [Homeowner Name],

Great news! [Provider Name] was able to access the property and is now beginning work.

For future appointments, we've updated your access instructions to: [UPDATED INSTRUCTIONS]

Let me know if you need to change anything.
```

### CS-005-03: Appointment Rescheduled Due to Access
```
Hi [Homeowner Name],

Unfortunately, [Provider Name] was unable to access your property today after waiting 15 minutes.

I've rescheduled your appointment for:
Date: [DATE]
Time: [TIME]

To prevent this in the future, please update your access instructions:
- Gate code: [if applicable]
- Lockbox code: [if applicable]
- Special instructions: [pets secured, HOA notification, etc.]

If you need to provide different information, please reply to this message.
```

### CS-005-04: Access Failure - Fees Applied
```
Hi [Homeowner Name],

Your appointment for [DATE/TIME] could not be completed because [Provider Name] was unable to access the property.

Per our policy, a trip fee of $[AMOUNT] applies when a provider travels to the property but cannot complete the service due to access issues.

Your diagnostic fee will be [applied as credit toward rescheduling / forfeited].

To reschedule with correct access instructions, please [submit a new request / contact support].

We're sorry for the inconvenience and want to help you get this resolved.
```

## Provider Scripts

### PS-005-01: Reporting Access Issue
```
Hi [Homeowner Name],

I've arrived at [ADDRESS] for your scheduled appointment, but I'm unable to access the property.

Issue: [Gate code isn't working / Lockbox code incorrect / No one is home / Pet in yard / etc.]

Could you please help me get access? I can wait about 10-15 minutes.

You can message me here or call [PHONE] if that's easier.

Thank you!
```

### PS-005-02: Access Resolved - Starting Work
```
Hi [Homeowner Name],

Thank you! I was able to get in. I'm starting work now and will update you when I'm done.
```

### PS-005-03: Leaving Due to Access Issue
```
Hi [Homeowner Name],

I've waited 15 minutes but still can't access the property. Unfortunately, I need to leave for my next appointment.

Please contact RegularUpkeep support to reschedule. Make sure to update your access instructions so this doesn't happen next time.

I'm sorry we couldn't complete your service today.
```

## Resolution Outcomes

| Outcome | Homeowner Impact | Provider Impact |
|---------|------------------|-----------------|
| Access resolved, work completed | Normal billing | Normal payment |
| Rescheduled (HO's fault) | May lose diagnostic fee | Trip fee compensation |
| Rescheduled (system fault) | No penalty | Trip fee compensation |
| Wrong address (provider) | No penalty | No compensation |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `access:gate_code_failed` | Gate code didn't work |
| `access:lockbox_failed` | Lockbox code didn't work |
| `access:pet_blocking` | Pet prevented access |
| `access:no_one_home` | No access plan, HO not home |
| `access:hoa_denied` | Security/HOA blocked entry |
| `access:resolved` | Issue resolved, work proceeded |
| `access:rescheduled` | Had to reschedule |

## SLA Targets

| Metric | Target |
|--------|--------|
| Contact homeowner after provider report | 2 minutes |
| Resolve or escalate access issue | 15 minutes |
| Reschedule if unresolved | Same day |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Homeowner disputes trip fee | Senior Support |
| Repeated access issues (same property) | Account review |
| Provider safety concern (aggressive animal) | Priority handling |
| HOA/security conflict | Admin |

---

# SOP-006: Emergency vs Non-Emergency Routing

## Purpose
Define procedures for correctly categorizing and routing emergency vs non-emergency service requests, including safety protocols and priority dispatch.

## When to Use / Trigger Conditions
- New service request submitted
- AI flags potential safety concern
- Homeowner marks request as "Urgent"
- Gas, water, electrical, or structural keywords detected
- Provider reports emergency on-site

## Inputs Required
- Service request details
- Photos/video from homeowner
- AI classification result
- Safety flags triggered
- Property location
- Available providers

## Step-by-Step Procedure

### For Service Request Intake

1. **AI Classification**
   - System analyzes description and photos
   - Checks for safety flag keywords
   - Assigns urgency level

2. **Safety Flag Keywords**
   - Gas: smell, leak, hissing, meter
   - Water: flooding, burst, sewage, no water
   - Electrical: sparks, burning smell, exposed wires, no power
   - Structural: collapse, crack, sinking, foundation

3. **Urgency Classification**
   - **Emergency (Immediate):** Life safety risk, active damage
   - **Urgent (Same-day):** Property damage risk, habitability issue
   - **Standard (Scheduled):** No immediate risk

4. **Routing**
   - Emergency → Immediate notification to all available providers
   - Urgent → Priority matching, same-day target
   - Standard → Normal matching queue

### For Support Agents

1. **Emergency Request Received**
   - Verify nature of emergency
   - Provide safety instructions if needed
   - Initiate priority dispatch

2. **Uncertain Classification**
   - Ask clarifying questions
   - Err on side of caution (treat as higher priority)
   - Document decision rationale

3. **No Providers Available for Emergency**
   - Provide homeowner with 911/utility hotline info
   - Continue searching for providers
   - Escalate to Territory Manager

## Decision Tree

```
New service request received
├── AI Safety Flag triggered
│   ├── Gas-related
│   │   └── EMERGENCY: "Leave property, call 911 if smell strong"
│   ├── Active flooding
│   │   └── EMERGENCY: "Turn off water main if safe, document damage"
│   ├── Electrical fire risk
│   │   └── EMERGENCY: "Turn off breaker if safe, evacuate if smoke"
│   └── Structural concern
│       └── URGENT or EMERGENCY based on severity
│
├── Homeowner marked "Urgent"
│   ├── Matches emergency criteria
│   │   └── Route as EMERGENCY
│   ├── Matches urgent criteria
│   │   └── Route as URGENT (same-day)
│   └── Does not match criteria
│       └── Discuss with homeowner, route appropriately
│
├── Standard maintenance request
│   └── Route as STANDARD
│
└── Provider reports emergency on-site
    └── Escalate immediately, may need utility/911
```

## Customer Scripts

### CS-006-01: Gas Emergency Response
```
IMPORTANT SAFETY NOTICE

If you smell gas:
1. Do NOT turn on/off any electrical switches
2. Leave the property immediately
3. Call 911 from outside the property
4. Contact your gas utility company

Once you're safe, we can help arrange repairs.

Are you currently safe and outside the property?
```

### CS-006-02: Flooding Emergency Response
```
Hi [Homeowner Name],

I see you're dealing with flooding. Here's what to do right now:

1. If it's safe, turn off your water main valve
2. Turn off electricity to affected areas if water is near outlets
3. Move valuables to higher ground
4. Document damage with photos

We're dispatching an emergency plumber now. Expected arrival: [TIME]

Is anyone in immediate danger? Reply "SAFE" to confirm you're okay.
```

### CS-006-03: Electrical Emergency Response
```
ELECTRICAL SAFETY ALERT

If you see sparks, smell burning, or have exposed wires:
1. Do NOT touch anything electrical
2. Turn off the main breaker if you can do so safely
3. Evacuate if you see smoke or flames
4. Call 911 if there's fire

Once the immediate danger is addressed, we can dispatch an electrician.

Please confirm: Are you safe right now?
```

### CS-006-04: Urgent but Not Emergency
```
Hi [Homeowner Name],

I've reviewed your request and understand this is an urgent situation.

While this doesn't require emergency evacuation, I'm treating it as priority and working to get someone there today.

Current status: [MATCHING/DISPATCHED]
Estimated arrival: [TIME or "within X hours"]

I'll update you as soon as I have confirmation. Is there anything else you need right now?
```

### CS-006-05: Re-Classifying as Non-Emergency
```
Hi [Homeowner Name],

Thank you for the details. Based on what you've described, this appears to be a [standard/routine] issue that doesn't pose an immediate safety risk.

I've submitted your request and you should be matched with a provider within [TIMEFRAME].

If the situation changes or becomes more urgent, please let us know immediately.
```

## Provider Scripts

### PS-006-01: Emergency Dispatch Notification
```
🚨 EMERGENCY DISPATCH 🚨

Booking #[BOOKING_ID]
Location: [ADDRESS]
Issue: [DESCRIPTION]

This is a priority emergency request. Please respond immediately if you can take this job.

Reply "ACCEPT" or "DECLINE" within 5 minutes.

Note: Emergency jobs may have different billing terms.
```

### PS-006-02: Reporting On-Site Emergency
```
If you discover an emergency on-site that wasn't apparent before:

1. Ensure everyone's safety first
2. If life-threatening: Call 911
3. Contact support immediately: [PHONE]
4. Document with photos
5. Advise homeowner on immediate safety steps

Do NOT attempt repairs that exceed your qualifications during an emergency.
```

## Resolution Outcomes

| Classification | Response Time Target | Dispatch Priority |
|---------------|---------------------|-------------------|
| Emergency | Immediate (< 1 hour) | All available providers |
| Urgent | Same-day (< 4 hours) | Priority queue |
| Standard | 24-48 hours | Normal queue |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `emergency:gas` | Gas-related emergency |
| `emergency:water` | Flooding/water emergency |
| `emergency:electrical` | Electrical emergency |
| `emergency:structural` | Structural emergency |
| `urgent:same_day` | Urgent, same-day dispatch |
| `emergency:dispatched` | Emergency provider sent |
| `emergency:resolved` | Emergency situation resolved |
| `safety:911_advised` | Homeowner advised to call 911 |

## SLA Targets

| Metric | Target |
|--------|--------|
| Emergency triage | < 2 minutes |
| Emergency dispatch | < 30 minutes |
| Urgent dispatch | < 4 hours |
| Provider on-site (emergency) | < 2 hours |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| No provider available for emergency | Territory Manager |
| Life-safety situation | Immediate Admin + 911 |
| Multiple emergencies in same area | Operations Lead |
| Provider reports unsafe condition | Priority Admin |

---

# SOP-007: Fraud / Suspicious Activity

## Purpose
Define procedures for detecting, investigating, and responding to fraudulent or suspicious activity by homeowners, providers, or third parties.

## When to Use / Trigger Conditions
- Unusual payment patterns detected
- Multiple accounts from same identity/payment method
- Provider submits suspicious invoices
- Referral abuse patterns
- Fake reviews or ratings manipulation
- Identity mismatch between booking and on-site contact
- Provider reports suspicious customer behavior

## Inputs Required
- Account details (user ID, email, phone, payment methods)
- Transaction history
- Activity logs
- IP addresses / device fingerprints [TBD]
- Related accounts
- Referral chain data
- Photos from disputed transactions

## Step-by-Step Procedure

### Detection Phase

1. **Automated Flags**
   - System monitors for fraud patterns
   - AI analyzes referral chains
   - Payment processor flags suspicious transactions

2. **Manual Reports**
   - Support agents report suspicious activity
   - Providers report suspicious customers
   - Customers report suspicious providers

### Investigation Phase

1. **Gather evidence**
   - Pull all related account activity
   - Check for linked accounts (email, phone, payment method)
   - Review transaction patterns
   - Examine referral relationships

2. **Classify severity**
   - Low: Minor policy violation, first offense
   - Medium: Clear fraud attempt, limited impact
   - High: Organized fraud, significant financial impact

3. **Document findings**
   - Create investigation summary
   - Screenshot relevant evidence
   - Note all related accounts

### Action Phase

1. **Immediate actions (if needed)**
   - Suspend accounts pending investigation
   - Block payment methods
   - Pause pending payouts

2. **Resolution**
   - Issue warnings for minor violations
   - Permanent ban for confirmed fraud
   - Report to authorities if warranted
   - Process chargebacks/refunds as needed

## Decision Tree

```
Fraud signal detected
├── Referral abuse
│   ├── Self-referral (same person)
│   │   └── Void referral credits, warning
│   ├── Referral ring (coordinated)
│   │   └── Void all credits, ban accounts
│   └── Borderline case
│       └── Monitor, no immediate action
│
├── Payment fraud
│   ├── Stolen credit card
│   │   └── Block card, suspend account, refund if work done
│   ├── Chargeback abuse
│   │   └── Review history, may ban if pattern
│   └── Invoice manipulation (provider)
│       └── Investigate, withhold payment, may ban
│
├── Fake reviews
│   ├── Provider's own reviews
│   │   └── Remove reviews, warning or ban
│   ├── Competitor sabotage
│   │   └── Remove reviews, investigate source
│   └── Purchased reviews
│       └── Remove reviews, ban provider
│
├── Identity fraud
│   ├── Fake provider credentials
│   │   └── Immediate ban, report to authorities
│   ├── Mismatched identity at service
│   │   └── Investigate, may void warranty
│   └── Account takeover attempt
│       └── Secure account, investigate
│
└── Provider billing fraud
    ├── Inflated invoices
    │   └── Adjust invoice, warning or ban
    ├── Work not performed
    │   └── Full refund, ban provider
    └── Kickback scheme
        └── Ban all involved parties
```

## Customer Scripts

### CS-007-01: Account Suspended - Investigation
```
Hi [User Name],

Your RegularUpkeep account has been temporarily suspended while we review some unusual activity.

This is a precautionary measure. If this is in error, please reply to this message with:
1. Confirmation of your identity (last 4 digits of payment card on file)
2. Explanation of [SPECIFIC ACTIVITY IN QUESTION]

We aim to resolve this within 24-48 hours. We apologize for any inconvenience.
```

### CS-007-02: Fraud Confirmed - Account Banned
```
Hi [User Name],

After reviewing your account activity, we've determined that it violates our Terms of Service regarding [SPECIFIC VIOLATION].

Your account has been permanently closed. Any pending transactions have been [canceled/voided].

This decision is final. If you believe this is in error, you may submit an appeal to [EMAIL] with supporting documentation.
```

### CS-007-03: Fraud Alert Cleared
```
Hi [User Name],

Good news—our review is complete and your account has been restored.

We apologize for any inconvenience this caused. The temporary hold was triggered by [GENERAL EXPLANATION - e.g., "unusual login patterns"] and was a precautionary measure.

You can now use RegularUpkeep normally. Thank you for your patience and understanding.
```

## Provider Scripts

### PS-007-01: Provider Billing Investigation
```
Hi [Provider Name],

We're reviewing invoice #[INVOICE_ID] for booking #[BOOKING_ID].

The following items require clarification:
[SPECIFIC CONCERNS]

Please provide:
1. Documentation supporting these charges
2. Additional photos if available
3. Any relevant context

Your payout is temporarily on hold pending this review. Please respond within 48 hours.
```

### PS-007-02: Provider Fraud Warning
```
Hi [Provider Name],

We've identified activity on your account that violates our policies:
[SPECIFIC VIOLATION]

This is a formal warning. Continued violations will result in account suspension or termination.

Please reply acknowledging you understand our policies and will comply going forward.
```

### PS-007-03: Provider Account Terminated
```
Hi [Provider Name],

Following our investigation, we've determined your account has engaged in fraudulent activity:
[SPECIFIC VIOLATION]

Your provider account is permanently terminated, effective immediately.

Outstanding payouts totaling $[AMOUNT] have been [withheld to offset fraudulent charges / processed normally despite this violation].

This decision is final. You may not create a new account on our platform.
```

## Resolution Outcomes

| Severity | User Action | Financial Action | Reporting |
|----------|-------------|------------------|-----------|
| Low (warning) | Warning issued | No change | Internal log |
| Medium | Suspension or ban | Void credits/adjustments | Internal log |
| High | Permanent ban | Withhold payments, chargebacks | May report to authorities |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `fraud:referral_abuse` | Referral manipulation |
| `fraud:payment` | Payment/card fraud |
| `fraud:reviews` | Fake review activity |
| `fraud:identity` | Identity fraud |
| `fraud:billing` | Provider billing fraud |
| `fraud:investigation` | Under investigation |
| `fraud:confirmed` | Fraud confirmed |
| `fraud:cleared` | False positive, cleared |
| `account:suspended` | Account suspended |
| `account:banned` | Account permanently banned |

## SLA Targets

| Metric | Target |
|--------|--------|
| Initial fraud flag review | 4 hours |
| Investigation complete | 48 hours |
| Account suspension (if needed) | Immediate |
| User notification | 24 hours |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Fraud amount exceeds $1,000 | Manager |
| Organized fraud ring suspected | Director + Legal |
| Provider identity fraud | Immediate Admin + Legal |
| Involves employee or insider | Director + HR |
| Law enforcement request | Legal team |

---

# SOP-008: Refunds / Credits / Re-Dispatch

## Purpose
Define procedures for processing refunds, applying account credits, and arranging re-dispatch when a service was not completed satisfactorily.

## When to Use / Trigger Conditions
- Quality complaint results in refund decision
- Cancellation qualifies for refund
- No-show or access issue requires refund
- Dispute resolved in customer favor
- Goodwill credit requested/approved
- Re-dispatch needed due to provider failure

## Inputs Required
- Original booking ID
- Payment amount and method
- Refund/credit amount
- Reason code
- Authorization level required
- New provider availability (if re-dispatch)

## Step-by-Step Procedure

### For Refunds

1. **Determine refund eligibility**
   - Check refund policies by scenario
   - Calculate eligible refund amount
   - Get approval if exceeds authorization limit

2. **Process refund**
   - Navigate to booking → "Issue Refund"
   - Select refund type (full/partial)
   - Enter amount and reason
   - Confirm with customer

3. **Notify affected parties**
   - Customer: Confirmation with timeline
   - Provider: If affects their payment
   - Finance: For tracking

### For Credits

1. **Determine credit amount**
   - Based on policy or manager approval
   - Document justification

2. **Apply credit**
   - Navigate to customer account → "Add Credit"
   - Enter amount and reason
   - Set expiration if applicable

3. **Notify customer**
   - Explain credit amount and usage
   - Note any restrictions

### For Re-Dispatch

1. **Assess original failure**
   - What went wrong?
   - Is original provider capable of fixing?
   - Customer preference?

2. **Determine approach**
   - Same provider (callback)
   - Different provider (re-dispatch)
   - Customer choice

3. **Execute re-dispatch**
   - Create new booking linked to original
   - Waive diagnostic fee
   - Match with available provider
   - Notify customer

4. **Handle billing**
   - Original payment applies to re-dispatch
   - Additional charges only if scope expands
   - Provider penalties if their fault

## Decision Tree

```
Resolution requires compensation
├── Full Refund warranted
│   ├── Within agent limit ($100)
│   │   └── Process immediately
│   └── Exceeds agent limit
│       └── Get manager approval, then process
│
├── Partial Refund warranted
│   ├── Calculate percentage based on policy
│   ├── Document reasoning
│   └── Process with approval if needed
│
├── Credit preferred over refund
│   ├── Customer agrees
│   │   └── Apply credit, may add bonus amount
│   └── Customer wants cash refund
│       └── Process refund instead
│
├── Re-dispatch needed
│   ├── Customer wants same provider
│   │   └── Schedule callback
│   ├── Customer wants different provider
│   │   └── Match new provider, expedite
│   └── No provider available
│       └── Refund and apologize
│
└── Goodwill gesture (no clear fault)
    ├── Minor issue → Small credit ($10-25)
    ├── Moderate inconvenience → Medium credit ($25-50)
    └── Significant issue → Large credit ($50-100) or manager approval
```

## Customer Scripts

### CS-008-01: Full Refund Confirmation
```
Hi [Homeowner Name],

Your refund of $[AMOUNT] has been processed.

Reason: [REASON]

The funds will be returned to your [PAYMENT METHOD] within 3-5 business days.

If you'd like to rebook this service, just submit a new request and we'll prioritize matching you with a great provider.

I'm sorry for this experience. We appreciate your patience.
```

### CS-008-02: Partial Refund Confirmation
```
Hi [Homeowner Name],

After reviewing your case, we've processed a partial refund of $[AMOUNT].

Original charge: $[ORIGINAL]
Refund amount: $[REFUND]
Reason: [REASON]

The refund will appear on your [PAYMENT METHOD] within 3-5 business days.

If you have any questions about this amount, please let me know.
```

### CS-008-03: Credit Applied
```
Hi [Homeowner Name],

We've applied a credit of $[AMOUNT] to your account.

This credit:
- Is available immediately
- Will automatically apply to your next booking
- Expires on [DATE if applicable / "Never" if no expiration]

Thank you for your patience. We hope your next experience exceeds expectations.
```

### CS-008-04: Re-Dispatch Confirmation
```
Hi [Homeowner Name],

I've arranged for a new provider to complete your service.

New provider: [Provider Name]
Date: [DATE]
Time: [TIME]

There's no additional charge for this visit. Your original payment covers everything.

Please confirm this time works for you. If not, let me know and I'll find an alternative.
```

### CS-008-05: Refund + We'd Like Another Chance
```
Hi [Homeowner Name],

I've processed your refund of $[AMOUNT], and I understand if you're frustrated.

We'd love the opportunity to make this right. If you're willing to give us another try:
- Your next diagnostic fee will be waived
- We'll prioritize matching you with one of our highest-rated providers
- I'll personally follow up to ensure everything goes smoothly

No pressure at all—the offer stands whenever you're ready.
```

## Provider Scripts

### PS-008-01: Payment Adjustment Notification
```
Hi [Provider Name],

Booking #[BOOKING_ID] has been adjusted due to [REASON].

Original payout: $[ORIGINAL]
Adjusted payout: $[ADJUSTED]
Difference: $[DIFFERENCE]

This adjustment is reflected in your next payout statement.

If you have questions, please reply to this message.
```

### PS-008-02: Re-Dispatch (Your Job Reassigned)
```
Hi [Provider Name],

Booking #[BOOKING_ID] has been reassigned to another provider.

Reason: [REASON]

If work was partially completed, you may receive partial payment. Otherwise, no payment will be issued.

This has been logged in your performance record. If you'd like to discuss, please contact provider support.
```

## Resolution Outcomes

| Type | Timeline | Limits |
|------|----------|--------|
| Refund to card | 3-5 business days | Per policy |
| Account credit | Immediate | No limit (with approval) |
| Re-dispatch | Same day if possible | Free to customer |

## Authorization Limits

| Role | Refund Limit | Credit Limit |
|------|--------------|--------------|
| Support Agent | $100 | $50 |
| Senior Support | $250 | $100 |
| Manager | $500 | $250 |
| Admin | Unlimited | Unlimited |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `refund:full` | Full refund processed |
| `refund:partial` | Partial refund processed |
| `credit:goodwill` | Goodwill credit applied |
| `credit:policy` | Policy-based credit |
| `redispatch:quality` | Re-dispatch for quality issue |
| `redispatch:noshow` | Re-dispatch for no-show |
| `redispatch:access` | Re-dispatch for access issue |

## SLA Targets

| Metric | Target |
|--------|--------|
| Refund processing | Same day |
| Credit application | Immediate |
| Re-dispatch arranged | 4 hours |
| Customer notification | 30 minutes |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Refund exceeds role limit | Next level approval |
| Customer demands beyond policy | Manager |
| Unable to re-dispatch within 24 hours | Territory Manager |
| Provider disputes payment adjustment | Admin |

---

# SOP-009: Provider Performance Enforcement

## Purpose
Define procedures for monitoring provider performance, issuing warnings, placing providers on probation, and removing providers from the platform.

## When to Use / Trigger Conditions
- Performance metrics fall below thresholds
- Pattern of complaints detected
- Serious policy violation occurs
- Provider fails to respond to warnings
- Probation period review due

## Inputs Required
- Provider ID
- Performance metrics (rating, response time, completion rate, dispute rate)
- Complaint history
- Warning/probation history
- Booking volume
- Time on platform

## Step-by-Step Procedure

### Automated Monitoring

1. **Weekly performance check**
   - System calculates rolling 30/60/90 day metrics
   - Flags providers below thresholds
   - Generates alert for review

2. **Threshold triggers**
   - Rating below 4.0 (30-day average)
   - Response time above 4 hours (average)
   - Completion rate below 80%
   - Dispute rate above 10%
   - No-show rate above 5%

### Warning Process

1. **First Warning**
   - Automated email with metrics
   - 30-day improvement period
   - No immediate impact to matching

2. **Second Warning**
   - Personal outreach from support
   - Reduced matching priority
   - 30-day improvement period

3. **Probation**
   - Formal probation notice
   - Significantly reduced matching
   - 30-day improvement period
   - May require re-training [TBD]

4. **Suspension/Removal**
   - Temporary suspension (review pending)
   - Permanent removal if no improvement
   - Appeal process available

### Manual Review Triggers

- Any individual complaint over $500
- Safety-related incident
- Customer threatens legal action
- Media/social media mention
- Law enforcement contact

## Decision Tree

```
Performance review triggered
├── Metrics below threshold (first time)
│   └── First Warning
│       ├── Improves within 30 days → Clear warning
│       └── No improvement → Second Warning
│
├── Second occurrence
│   └── Second Warning
│       ├── Improves within 30 days → Clear, monitoring continues
│       └── No improvement → Probation
│
├── Third occurrence or continued decline
│   └── Probation
│       ├── Improves within 30 days → Return to normal, monitoring
│       ├── No improvement → Suspension
│       └── Further decline → Removal
│
├── Serious single incident
│   ├── Safety violation → Immediate suspension, investigate
│   ├── Fraud confirmed → Immediate removal
│   ├── Major complaint (one-time) → Warning or probation based on history
│   └── Policy violation → Based on severity
│
└── Appeal received
    ├── Valid new information → Reconsider decision
    ├── No new information → Decision stands
    └── Partial merit → May reduce penalty
```

## Performance Thresholds

| Metric | Good | Warning | Probation | Suspension |
|--------|------|---------|-----------|------------|
| Rating (30-day) | 4.5+ | 4.0-4.4 | 3.5-3.9 | <3.5 |
| Response Time | <2 hr | 2-4 hr | 4-8 hr | >8 hr |
| Completion Rate | 95%+ | 85-94% | 75-84% | <75% |
| Dispute Rate | <3% | 3-5% | 5-10% | >10% |
| No-Show Rate | <2% | 2-5% | 5-10% | >10% |

## Customer Scripts

N/A - Customer does not receive these communications.

## Provider Scripts

### PS-009-01: First Warning
```
Hi [Provider Name],

We're reaching out because your performance metrics have fallen below our standards.

Current metrics (30-day rolling):
- Rating: [X] (threshold: 4.0)
- Response Time: [X] hours (threshold: 4 hours)
- Completion Rate: [X]% (threshold: 85%)
- Dispute Rate: [X]% (threshold: 5%)

You have 30 days to improve these metrics. Here are some tips:
- Respond to job offers within 15 minutes
- Communicate proactively with customers
- Document work thoroughly with photos
- Follow up to ensure satisfaction

If you need support, reply to this message. We want to help you succeed.
```

### PS-009-02: Second Warning
```
Hi [Provider Name],

This is your second performance warning.

Despite our previous notice, your metrics remain below standards:
[CURRENT METRICS]

Effective immediately:
- Your matching priority has been reduced
- You may receive fewer job offers
- You have 30 days to improve

If metrics don't improve, you will be placed on probation, which further limits your access to jobs.

Please take this seriously. Reply if you need guidance on improving.
```

### PS-009-03: Probation Notice
```
Hi [Provider Name],

You are now on PROBATION due to continued performance issues.

Current metrics:
[METRICS]

During probation (30 days):
- Severely reduced matching priority
- Jobs limited to [X] per week maximum
- All work reviewed for quality
- One additional complaint may result in suspension

Requirements to exit probation:
[SPECIFIC IMPROVEMENT TARGETS]

This is your final opportunity to correct course. If you cannot meet these standards, your account will be suspended or terminated.
```

### PS-009-04: Suspension Notice
```
Hi [Provider Name],

Your provider account has been SUSPENDED effective immediately.

Reason: [SPECIFIC REASON]

During suspension:
- You cannot accept new jobs
- Current pending payouts are [on hold / will be processed normally]
- You may not access provider features

Next steps:
- Reply to this message to request a review
- Provide any information relevant to your case
- Review will be completed within 5 business days

If suspension is upheld, you will be informed of permanent removal.
```

### PS-009-05: Account Terminated
```
Hi [Provider Name],

After careful review, we've made the difficult decision to remove your account from RegularUpkeep.

Reason: [SPECIFIC REASON]

This decision is effective immediately. You cannot create a new provider account.

Outstanding payouts:
- [Amount and status]

If you believe this decision was made in error, you may submit a written appeal to [EMAIL] within 14 days.

We wish you the best in your future endeavors.
```

### PS-009-06: Probation Cleared
```
Hi [Provider Name],

Congratulations! Your probation period has ended successfully.

Your metrics have improved to acceptable levels:
[CURRENT METRICS]

Your account has been restored to normal status with full matching priority.

Thank you for your commitment to improvement. Keep up the great work!
```

## Resolution Outcomes

| Status | Impact | Duration |
|--------|--------|----------|
| Warning (1st) | No impact | 30 days |
| Warning (2nd) | Reduced matching | 30 days |
| Probation | Severely limited | 30 days |
| Suspension | Cannot work | Until review |
| Removal | Permanent | Permanent |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `performance:warning_1` | First warning issued |
| `performance:warning_2` | Second warning issued |
| `performance:probation` | Probation started |
| `performance:suspension` | Account suspended |
| `performance:removal` | Account permanently removed |
| `performance:cleared` | Cleared warning/probation |
| `performance:appeal` | Appeal submitted |

## SLA Targets

| Metric | Target |
|--------|--------|
| Weekly performance review | Every Monday |
| Warning communication | Within 24 hours of trigger |
| Appeal response | 5 business days |
| Suspension review | 5 business days |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Provider appeals warning | Senior Support |
| Provider appeals probation | Manager |
| Provider appeals suspension | Admin |
| Safety incident | Immediate Admin |
| Legal threat | Legal + Admin |
| Media mention | PR + Director |

---

# SOP-010: Recordkeeping Requirements

## Purpose
Define requirements for documentation, retention, and access of records including photos, messages, timestamps, and transaction data.

## When to Use / Trigger Conditions
- Every booking (automatic)
- Dispute or complaint filed
- Legal/compliance request
- Audit requirement
- Data retention review

## Inputs Required
N/A - This SOP defines what inputs are REQUIRED for other processes.

## Required Documentation by Stage

### Service Request Creation

| Item | Required | Retention |
|------|----------|-----------|
| Request description | Yes | 7 years |
| Photos from homeowner | Yes (min 1) | 7 years |
| Video from homeowner | Optional | 7 years |
| AI classification result | Yes | 7 years |
| Safety flags triggered | Yes | 7 years |
| Timestamp | Yes | 7 years |

### Estimate/Booking

| Item | Required | Retention |
|------|----------|-----------|
| Estimate document | Yes | 7 years |
| Line items breakdown | Yes | 7 years |
| Approval timestamp | Yes | 7 years |
| Authorization amount | Yes | 7 years |
| Change orders (if any) | Yes | 7 years |

### Job Execution

| Item | Required | Retention |
|------|----------|-----------|
| Provider accepted timestamp | Yes | 7 years |
| On My Way timestamp | Yes | 7 years |
| Arrived timestamp | Yes | 7 years |
| Before photos | Yes (min 2) | 7 years |
| During photos | Yes (min 1) | 7 years |
| After photos | Yes (min 2) | 7 years |
| Completion timestamp | Yes | 7 years |
| Work notes | Recommended | 7 years |

### Invoice/Payment

| Item | Required | Retention |
|------|----------|-----------|
| Invoice document | Yes | 7 years |
| Final amount | Yes | 7 years |
| Payment capture timestamp | Yes | 7 years |
| Dispute filing (if any) | Yes | 7 years |
| Resolution documentation | Yes | 7 years |

### Communications

| Item | Required | Retention |
|------|----------|-----------|
| In-app messages | All | 7 years |
| Support tickets | All | 7 years |
| Email communications | All | 7 years |
| Phone call logs | Yes | 7 years |
| Phone call recordings | Optional [TBD] | 7 years |

## Photo Requirements

### Technical Standards

| Requirement | Standard |
|-------------|----------|
| Minimum resolution | 1080p |
| Format | JPEG, PNG, HEIC |
| File size | Max 10MB |
| Metadata | Timestamp, GPS (if available) |

### Content Requirements

#### Before Photos (2 minimum)
- Show full area of work
- Show specific issue/problem
- Clear, well-lit
- No obstructions

#### During Photos (1 minimum)
- Show work in progress
- Show methodology used
- Document any discoveries

#### After Photos (2 minimum)
- Show completed work
- Show same angles as "before"
- Show cleanup completed
- Show any related areas

### Categories Requiring Enhanced Documentation

| Category | Additional Requirements |
|----------|------------------------|
| Plumbing | Water flow test photo/video |
| Electrical | Panel/breaker photo, test results |
| HVAC | Before/after temperature readings |
| Roofing | Wide shot + close-ups of repairs |
| Water damage | Moisture meter readings, affected areas |

## Message Retention

### What's Logged
- All in-app messages (customer ↔ provider)
- All support interactions
- All system notifications
- All email communications

### Access Controls
| Role | Access Level |
|------|--------------|
| Homeowner | Own messages only |
| Provider | Own messages only |
| Support Agent | All related to active tickets |
| Admin | Full access |
| Legal/Compliance | Full access (with approval) |

## Timestamp Requirements

### Required Timestamps (Auto-Captured)

| Event | Precision |
|-------|-----------|
| Request creation | Milliseconds |
| Estimate sent | Milliseconds |
| Estimate approved | Milliseconds |
| Provider accepted | Milliseconds |
| Provider status changes | Milliseconds |
| Messages sent/received | Milliseconds |
| Photos uploaded | Milliseconds |
| Invoice submitted | Milliseconds |
| Payment captured | Milliseconds |
| Dispute filed | Milliseconds |
| Dispute resolved | Milliseconds |

### Timezone Handling
- All stored in UTC
- Displayed in user's local timezone
- Property timezone used for scheduling

## Data Retention Schedule

| Data Type | Retention Period | After Retention |
|-----------|------------------|-----------------|
| Booking records | 7 years | Archive |
| Photos/media | 7 years | Delete |
| Messages | 7 years | Archive |
| Financial transactions | 7 years | Archive |
| User accounts | 2 years after deletion | Anonymize |
| Support tickets | 7 years | Archive |
| Performance metrics | 3 years | Aggregate |

## Audit Trail Requirements

### What's Tracked

- Who accessed what data
- What changes were made
- When changes occurred
- Why (if provided)

### Admin Actions Requiring Audit
- Refund processed
- Account suspended/banned
- Payment adjustment
- Manual override of system decision
- Access to sensitive data
- Configuration changes

## Compliance Requests

### Process for Legal/Compliance Data Requests

1. Request received through legal@regularupkeep.com
2. Verify requestor identity and authority
3. Scope data required
4. Manager approval for release
5. Extract and provide data
6. Log request and response

### Data Subject Requests (GDPR/CCPA)

| Request Type | Response Time | Process |
|--------------|---------------|---------|
| Access request | 30 days | Export user data |
| Deletion request | 30 days | Delete/anonymize |
| Correction request | 30 days | Update records |
| Portability request | 30 days | Export in standard format |

## Logging / Tags

| Tag | When to Apply |
|-----|---------------|
| `documentation:complete` | All required docs present |
| `documentation:missing_photos` | Missing required photos |
| `documentation:missing_before` | Missing before photos |
| `documentation:missing_after` | Missing after photos |
| `audit:accessed` | Data accessed for audit |
| `legal:request` | Legal data request |
| `compliance:deletion` | Deletion request processed |

## SLA Targets

| Metric | Target |
|--------|--------|
| Photo upload | Real-time |
| Message logging | Real-time |
| Audit trail update | Real-time |
| Data export (compliance) | 30 days |
| Deletion request | 30 days |

## Escalation Rules

| Condition | Escalate To |
|-----------|-------------|
| Missing critical documentation in dispute | Admin |
| Provider repeatedly fails documentation requirements | Performance review |
| Legal/compliance request | Legal team |
| Data breach suspected | Security + Legal + Director |

---

# Chatbot Knowledge Base Add-On

## KB Chunks (JSON)

```json
[
  {
    "id": "sop-noshow-overview",
    "category": "sop",
    "topic": "no_show",
    "role": "all",
    "title": "What happens if a provider doesn't show up?",
    "content": "If your provider doesn't arrive, contact support immediately. We'll try to reach the provider within 10 minutes. If we can't resolve the issue, we'll either reschedule or dispatch a different provider. You may receive a credit or refund depending on the situation. Providers who no-show face performance penalties including warnings and potential account suspension."
  },
  {
    "id": "sop-noshow-homeowner",
    "category": "sop",
    "topic": "no_show",
    "role": "homeowner",
    "title": "My provider didn't arrive - what do I do?",
    "content": "If your provider hasn't arrived within 15 minutes of the scheduled time and hasn't contacted you: 1) Check your messages for any updates, 2) Contact support through the app or call us, 3) Stay at the property if possible. We'll work to reach the provider and either get them there quickly or find a replacement. If we can't resolve it, you'll receive a full refund or credit."
  },
  {
    "id": "sop-noshow-provider",
    "category": "sop",
    "topic": "no_show",
    "role": "provider",
    "title": "I can't make my scheduled appointment - what should I do?",
    "content": "If you cannot make a scheduled appointment, contact support IMMEDIATELY - do not simply not show up. Update your status in the app and message the homeowner. If running late, provide an updated ETA. No-shows without communication result in strikes against your account and may lead to reduced matching priority, probation, or account suspension."
  },
  {
    "id": "sop-cancel-policy",
    "category": "sop",
    "topic": "cancellation",
    "role": "homeowner",
    "title": "What is the cancellation policy?",
    "content": "Cancellation refunds depend on timing: More than 24 hours before appointment = full refund of diagnostic fee. Between 12-24 hours = 50% refund. Less than 12 hours = no refund (exceptions may apply). If a provider hasn't been assigned yet, you typically receive a full refund regardless of timing. To cancel, go to your booking and select 'Cancel Appointment' or contact support."
  },
  {
    "id": "sop-cancel-provider",
    "category": "sop",
    "topic": "cancellation",
    "role": "provider",
    "title": "How do I cancel a booking I've accepted?",
    "content": "To cancel an accepted booking, contact support immediately with your reason. Valid emergencies (medical, family, vehicle breakdown) are excused. Non-emergency cancellations count against your performance record. Cancelling after marking 'On My Way' or within a few hours of the appointment is a serious infraction that may result in suspension. We'll reassign the job to another provider."
  },
  {
    "id": "sop-change-order",
    "category": "sop",
    "topic": "scope_change",
    "role": "all",
    "title": "What is a change order?",
    "content": "A change order is required when work will exceed the original estimate by more than 10% or $75. The provider must stop work, document the additional need with photos, and submit a change order through the app. You'll receive a notification to review and approve or decline. Providers cannot perform additional work without your digital approval. If you decline, only the original scope is completed."
  },
  {
    "id": "sop-change-order-provider",
    "category": "sop",
    "topic": "scope_change",
    "role": "provider",
    "title": "How do I submit a change order?",
    "content": "When you discover additional work is needed: 1) Stop before exceeding the original scope, 2) Take photos documenting the additional issue, 3) In the app, go to the active job and select 'Request Change Order', 4) Describe the additional work and add new line items with pricing, 5) Submit and wait for homeowner approval. Do NOT proceed with additional work until you receive digital approval in the app."
  },
  {
    "id": "sop-quality-complaint",
    "category": "sop",
    "topic": "quality",
    "role": "homeowner",
    "title": "How do I report poor quality work?",
    "content": "To report a quality issue: 1) Document the problem with photos, 2) Go to your booking and select 'Report Issue' or contact support, 3) Describe specifically what's wrong. Within the 72-hour dispute window, we can arrange a free callback, dispatch a different provider, or issue a refund. Include as much detail and documentation as possible to help us investigate."
  },
  {
    "id": "sop-quality-callback",
    "category": "sop",
    "topic": "quality",
    "role": "provider",
    "title": "What happens when a customer reports quality issues?",
    "content": "When a quality complaint is filed, you'll be notified and asked to schedule a callback visit within 24 hours. Callbacks for valid workmanship issues are done at no charge to the homeowner. Document your findings with photos. If you believe the complaint is unfounded, provide your documentation and explanation. Repeated quality complaints affect your performance rating and may result in warnings or probation."
  },
  {
    "id": "sop-access-issue",
    "category": "sop",
    "topic": "access",
    "role": "homeowner",
    "title": "How do I provide access instructions for my property?",
    "content": "To ensure smooth access: 1) Add gate codes, lockbox codes, and special instructions to your property profile, 2) Update instructions before each appointment if they change, 3) Secure pets before the provider arrives, 4) Notify security/HOA if authorization is required, 5) Be available by phone during your appointment window. If access issues occur, you may be charged a trip fee and need to reschedule."
  },
  {
    "id": "sop-access-provider",
    "category": "sop",
    "topic": "access",
    "role": "provider",
    "title": "I can't access the property - what do I do?",
    "content": "If you can't access the property: 1) Verify you're at the correct address, 2) Try the access instructions in the booking, 3) Take a photo of the barrier (gate, lockbox, etc.), 4) Message the homeowner through the app, 5) Wait 10 minutes for a response, 6) If no response, contact support. After 15 minutes with no resolution, you may leave with documentation. You may receive a trip fee for failed access due to homeowner error."
  },
  {
    "id": "sop-emergency-routing",
    "category": "sop",
    "topic": "emergency",
    "role": "all",
    "title": "What counts as an emergency?",
    "content": "Emergencies requiring immediate attention include: Gas leaks or gas smell, active flooding or burst pipes, electrical fires or exposed wires with sparks, structural collapse or major cracks. For these situations, prioritize safety first - evacuate if needed and call 911 for life-threatening issues. Then contact us for emergency dispatch. We treat these with highest priority and attempt same-day or immediate response."
  },
  {
    "id": "sop-emergency-gas",
    "category": "sop",
    "topic": "emergency",
    "role": "homeowner",
    "title": "I smell gas - what should I do?",
    "content": "If you smell gas: 1) DO NOT turn on/off any electrical switches or appliances, 2) Leave the property immediately, 3) Call 911 from outside, 4) Contact your gas utility company's emergency line, 5) Only contact RegularUpkeep after you're safe. Do not re-enter until cleared by authorities. We can arrange repairs once the emergency is resolved."
  },
  {
    "id": "sop-refund-process",
    "category": "sop",
    "topic": "refund",
    "role": "homeowner",
    "title": "How do refunds work?",
    "content": "Refunds are processed back to your original payment method and typically take 3-5 business days to appear. Full refunds are issued for cancellations made 24+ hours in advance, no-shows by providers, or quality issues warranting it. Partial refunds may apply for late cancellations or partial completion. Account credits are an alternative that apply immediately to your next booking."
  },
  {
    "id": "sop-redispatch",
    "category": "sop",
    "topic": "redispatch",
    "role": "homeowner",
    "title": "Can I get a different provider?",
    "content": "Yes, you can request a different provider in several situations: If your assigned provider no-shows, if quality issues occur and you don't want the same provider to return, or if you have a valid concern about the assigned provider. Contact support with your request. Re-dispatch typically happens at no additional cost to you if it's due to provider issues."
  },
  {
    "id": "sop-provider-ratings",
    "category": "sop",
    "topic": "performance",
    "role": "provider",
    "title": "How does the provider rating system work?",
    "content": "Your performance is measured on: Average rating (target: 4.5+), Response time (target: under 4 hours), Completion rate (target: 95%+), Dispute rate (target: under 3%), and No-show rate (target: under 2%). Metrics are calculated on a rolling 30-day basis. Falling below thresholds triggers warnings. Continued issues lead to probation with reduced matching priority, and persistent problems result in suspension or removal."
  },
  {
    "id": "sop-provider-preferred",
    "category": "sop",
    "topic": "performance",
    "role": "provider",
    "title": "How do I become a Preferred provider?",
    "content": "To qualify for Preferred tier: Maintain a 4.5+ rating, complete at least 10 jobs, keep dispute rate under 5%, average response time under 4 hours, and hold current Verified status. Preferred providers get top placement in search results, featured status, and access to Priority Dispatch. The qualification is reviewed automatically but you can also contact support to check your eligibility."
  },
  {
    "id": "sop-fraud-report",
    "category": "sop",
    "topic": "fraud",
    "role": "all",
    "title": "How do I report suspicious activity?",
    "content": "To report fraud or suspicious activity, contact support immediately with details. Signs of fraud include: requests for payment outside the platform, suspicious pricing, providers asking for cash, fake reviews, or identity mismatches. We investigate all reports within 48 hours. Never pay outside the RegularUpkeep platform - all legitimate transactions happen through the app."
  },
  {
    "id": "sop-photos-required",
    "category": "sop",
    "topic": "documentation",
    "role": "provider",
    "title": "What photos are required for each job?",
    "content": "Minimum photo requirements: BEFORE (2 photos) - show the area and specific issue before starting work. DURING (1 photo) - document work in progress. AFTER (2 photos) - show completed work from same angles as before photos. Photos must be clear, well-lit, and show the actual work area. Missing documentation can affect your ability to be paid in disputes. Categories like plumbing and electrical have additional requirements."
  },
  {
    "id": "sop-dispute-window",
    "category": "sop",
    "topic": "dispute",
    "role": "homeowner",
    "title": "How long do I have to dispute work?",
    "content": "You have 72 hours after invoice approval to file a dispute. During this window, you can report quality issues, incomplete work, or damage caused by the service. After 72 hours, the standard dispute process doesn't apply, but you can still contact support - we may offer goodwill resolutions for issues reported within 30 days. Always document any problems immediately with photos."
  }
]
```

## Intent Map (YAML)

```yaml
# RegularUpkeep SOP Intent Map
# Maps user intents to appropriate SOP sections

version: "1.0"
last_updated: "2024-12"

intents:

  # === NO-SHOW / LATE ARRIVAL ===
  - intent: provider_no_show
    examples:
      - "provider didn't show up"
      - "my appointment was missed"
      - "no one came"
      - "provider never arrived"
      - "where is my technician"
      - "contractor didn't come"
    sop: "SOP-001"
    kb_chunk: "sop-noshow-homeowner"
    role: "homeowner"

  - intent: running_late_provider
    examples:
      - "I'm running late to a job"
      - "I'll be late to appointment"
      - "can't make it on time"
      - "stuck in traffic"
    sop: "SOP-001"
    kb_chunk: "sop-noshow-provider"
    role: "provider"

  - intent: reschedule_noshow
    examples:
      - "reschedule after no-show"
      - "book again after missed appointment"
    sop: "SOP-001"
    kb_chunk: "sop-noshow-homeowner"
    role: "homeowner"

  # === CANCELLATIONS ===
  - intent: cancel_appointment
    examples:
      - "cancel my appointment"
      - "I need to cancel"
      - "cancel booking"
      - "don't need the service anymore"
      - "how do I cancel"
    sop: "SOP-002"
    kb_chunk: "sop-cancel-policy"
    role: "homeowner"

  - intent: cancel_as_provider
    examples:
      - "I need to cancel a job"
      - "can't take this booking"
      - "cancel my accepted job"
      - "emergency can't make appointment"
    sop: "SOP-002"
    kb_chunk: "sop-cancel-provider"
    role: "provider"

  - intent: cancellation_refund
    examples:
      - "will I get a refund if I cancel"
      - "cancellation fee"
      - "refund for cancelled appointment"
    sop: "SOP-002"
    kb_chunk: "sop-cancel-policy"
    role: "homeowner"

  # === SCOPE CHANGES ===
  - intent: additional_work_needed
    examples:
      - "they found more work needed"
      - "estimate went up"
      - "provider wants to charge more"
      - "unexpected repairs needed"
    sop: "SOP-003"
    kb_chunk: "sop-change-order"
    role: "homeowner"

  - intent: submit_change_order
    examples:
      - "how do I submit change order"
      - "need to add work to estimate"
      - "found additional issue on site"
      - "work exceeds estimate"
    sop: "SOP-003"
    kb_chunk: "sop-change-order-provider"
    role: "provider"

  # === QUALITY COMPLAINTS ===
  - intent: report_bad_work
    examples:
      - "work wasn't done right"
      - "poor quality"
      - "not satisfied with service"
      - "job was done badly"
      - "problem with completed work"
      - "issue after service"
    sop: "SOP-004"
    kb_chunk: "sop-quality-complaint"
    role: "homeowner"

  - intent: callback_request
    examples:
      - "need provider to come back"
      - "fix what they did wrong"
      - "redo the work"
    sop: "SOP-004"
    kb_chunk: "sop-quality-callback"
    role: "homeowner"

  - intent: quality_callback_provider
    examples:
      - "customer wants callback"
      - "complaint about my work"
      - "need to return to job"
    sop: "SOP-004"
    kb_chunk: "sop-quality-callback"
    role: "provider"

  # === ACCESS ISSUES ===
  - intent: update_access_instructions
    examples:
      - "change gate code"
      - "update lockbox"
      - "add access instructions"
      - "how to give access"
    sop: "SOP-005"
    kb_chunk: "sop-access-issue"
    role: "homeowner"

  - intent: cant_access_property
    examples:
      - "can't get in"
      - "gate code doesn't work"
      - "lockbox won't open"
      - "no one home"
      - "can't access property"
    sop: "SOP-005"
    kb_chunk: "sop-access-provider"
    role: "provider"

  - intent: pet_at_property
    examples:
      - "there's a dog"
      - "pet won't let me in"
      - "animal blocking access"
    sop: "SOP-005"
    kb_chunk: "sop-access-provider"
    role: "provider"

  # === EMERGENCY ROUTING ===
  - intent: emergency_general
    examples:
      - "this is an emergency"
      - "urgent help needed"
      - "emergency service"
      - "need someone right now"
    sop: "SOP-006"
    kb_chunk: "sop-emergency-routing"
    role: "all"

  - intent: gas_emergency
    examples:
      - "I smell gas"
      - "gas leak"
      - "gas smell in house"
    sop: "SOP-006"
    kb_chunk: "sop-emergency-gas"
    role: "homeowner"

  - intent: flooding_emergency
    examples:
      - "house is flooding"
      - "water everywhere"
      - "pipe burst"
      - "water leak emergency"
    sop: "SOP-006"
    kb_chunk: "sop-emergency-routing"
    role: "homeowner"

  - intent: electrical_emergency
    examples:
      - "sparks from outlet"
      - "electrical fire"
      - "burning smell electrical"
      - "exposed wires"
    sop: "SOP-006"
    kb_chunk: "sop-emergency-routing"
    role: "homeowner"

  # === FRAUD ===
  - intent: report_fraud
    examples:
      - "I think this is fraud"
      - "suspicious activity"
      - "fake provider"
      - "scam"
      - "asked for cash payment"
    sop: "SOP-007"
    kb_chunk: "sop-fraud-report"
    role: "all"

  - intent: payment_outside_platform
    examples:
      - "provider wants cash"
      - "asked to pay directly"
      - "venmo payment request"
    sop: "SOP-007"
    kb_chunk: "sop-fraud-report"
    role: "homeowner"

  # === REFUNDS / CREDITS ===
  - intent: request_refund
    examples:
      - "I want a refund"
      - "get my money back"
      - "refund request"
      - "how do refunds work"
    sop: "SOP-008"
    kb_chunk: "sop-refund-process"
    role: "homeowner"

  - intent: want_different_provider
    examples:
      - "different provider please"
      - "don't want this provider"
      - "send someone else"
      - "new provider"
    sop: "SOP-008"
    kb_chunk: "sop-redispatch"
    role: "homeowner"

  - intent: apply_credit
    examples:
      - "use my credit"
      - "account credit"
      - "apply credit to booking"
    sop: "SOP-008"
    kb_chunk: "sop-refund-process"
    role: "homeowner"

  # === PROVIDER PERFORMANCE ===
  - intent: check_performance
    examples:
      - "what is my rating"
      - "how am I doing"
      - "performance metrics"
      - "why am I getting fewer jobs"
    sop: "SOP-009"
    kb_chunk: "sop-provider-ratings"
    role: "provider"

  - intent: become_preferred
    examples:
      - "how to become preferred"
      - "preferred provider requirements"
      - "upgrade to preferred"
    sop: "SOP-009"
    kb_chunk: "sop-provider-preferred"
    role: "provider"

  - intent: warning_received
    examples:
      - "I got a warning"
      - "performance warning"
      - "account probation"
      - "why was I suspended"
    sop: "SOP-009"
    kb_chunk: "sop-provider-ratings"
    role: "provider"

  # === DOCUMENTATION ===
  - intent: photo_requirements
    examples:
      - "what photos do I need"
      - "how many photos required"
      - "before and after photos"
      - "documentation requirements"
    sop: "SOP-010"
    kb_chunk: "sop-photos-required"
    role: "provider"

  - intent: dispute_deadline
    examples:
      - "how long can I dispute"
      - "dispute window"
      - "too late to dispute"
      - "72 hours"
    sop: "SOP-010"
    kb_chunk: "sop-dispute-window"
    role: "homeowner"

# Fallback handling
fallback:
  unknown_sop:
    response: "I'm not sure which procedure applies here. Let me connect you with a support agent who can help."
    escalate: true

# Role detection for routing
role_detection:
  homeowner:
    - "my home"
    - "my property"
    - "my appointment"
    - "provider didn't"
  provider:
    - "my booking"
    - "my job"
    - "customer wants"
    - "job site"
  admin:
    - "review dispute"
    - "suspend account"
    - "process refund"
```

---

*End of SOP Pack*

**Document Version:** 1.0
**Total SOPs:** 10
**Total KB Chunks:** 20
**Total Intents:** 35+
