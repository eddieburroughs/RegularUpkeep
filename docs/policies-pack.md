# RegularUpkeep Policies Pack

> **Version**: 1.0
> **Effective Date**: 2025-12-24
> **Last Updated**: 2025-12-24
> **Owner**: Platform Operations
> **Audience**: All Users, Support, Admin

---

## Table of Contents

1. [Cancellation & Reschedule Policy](#1-cancellation--reschedule-policy)
2. [No-Show Policy](#2-no-show-policy)
3. [Scope Change & Change Order Policy](#3-scope-change--change-order-policy)
4. [Dispute Policy](#4-dispute-policy)
5. [Refunds & Credits Policy](#5-refunds--credits-policy)
6. [Emergency Routing Policy](#6-emergency-routing-policy)
7. [Reviews & Ratings Policy](#7-reviews--ratings-policy)
8. [Provider Quality Standards & Enforcement](#8-provider-quality-standards--enforcement)
9. [Canned Message Scripts](#canned-message-scripts)
10. [Chatbot KB Add-On](#chatbot-kb-add-on)

---

## 1. Cancellation & Reschedule Policy

### Short Version (User-Facing)

#### For Homeowners

**Cancelling a Booking**

| When You Cancel | What Happens |
|-----------------|--------------|
| **Before provider accepts** | Full refund of diagnostic fee |
| **After acceptance, 24+ hours before** | Full refund of diagnostic fee |
| **12-24 hours before** | 50% of diagnostic fee retained |
| **Less than 12 hours before** | Diagnostic fee non-refundable |
| **After provider arrives** | Full charge applies |

**Rescheduling**
- Free if done 24+ hours before the appointment
- Same-day reschedule: $15 rescheduling fee
- You can reschedule up to 2 times per booking; after that, you must cancel and rebook

**How to Cancel or Reschedule**
1. Go to **Requests** → Select your booking
2. Tap **Cancel** or **Reschedule**
3. Follow the prompts

#### For Providers

**Cancelling a Job**

| When You Cancel | What Happens |
|-----------------|--------------|
| **Before accepting** | No penalty |
| **After accepting, 24+ hours before** | Warning logged |
| **12-24 hours before** | Counts toward cancellation rate |
| **Less than 12 hours before** | Strike on record + possible suspension |
| **After confirming en route** | Serious strike + review required |

**Rescheduling**
- Contact the homeowner through the app to propose a new time
- If the homeowner agrees, update the booking
- If no response within 4 hours, escalate to support

---

### Internal Version (Admin Enforcement)

#### Homeowner Cancellation Processing

```
CANCELLATION TIMELINE LOGIC:

1. Get booking.scheduled_at and now()
2. Calculate hours_until = (scheduled_at - now) / 3600

IF booking.status == 'pending' (not yet accepted):
   → Full refund of diagnostic_fee
   → No cancellation fee
   → booking.status = 'cancelled_by_customer'
   → Log: "Cancelled before acceptance"

ELSE IF hours_until >= 24:
   → Full refund of diagnostic_fee
   → No cancellation fee
   → booking.status = 'cancelled_by_customer'
   → Log: "Cancelled 24+ hours ahead"

ELSE IF hours_until >= 12 AND hours_until < 24:
   → Refund 50% of diagnostic_fee
   → Retain 50% as cancellation fee
   → booking.status = 'cancelled_by_customer_late'
   → Log: "Late cancellation (12-24h)"
   → Notify provider: "Booking cancelled, partial compensation"

ELSE IF hours_until < 12 AND hours_until > 0:
   → No refund of diagnostic_fee
   → booking.status = 'cancelled_by_customer_very_late'
   → Log: "Very late cancellation (<12h)"
   → Notify provider: "Booking cancelled, full diagnostic fee retained"
   → Credit provider 50% of diagnostic fee as compensation

ELSE IF provider.status == 'en_route' OR provider.status == 'arrived':
   → No refund
   → Charge full estimate if work not started
   → booking.status = 'cancelled_by_customer_onsite'
   → Log: "Cancelled after provider arrival"
   → Credit provider trip fee ($25)
```

#### Provider Cancellation Processing

```
PROVIDER CANCELLATION LOGIC:

1. Get provider cancellation history (last 30 days)
2. Calculate cancellation_rate = cancellations / total_accepted

IF booking.status == 'pending':
   → No penalty
   → Re-dispatch to next provider
   → Log: "Declined before acceptance"

ELSE IF hours_until >= 24:
   → Log warning (no penalty)
   → Re-dispatch to next provider
   → Notify homeowner: "Provider unavailable, finding replacement"

ELSE IF hours_until >= 12 AND hours_until < 24:
   → Increment provider.cancellation_count
   → Check cancellation_rate:
      IF >= 15%: Send warning email
      IF >= 20%: Temporary suspension (24h)
   → Re-dispatch to next provider
   → Notify homeowner: "Provider had to cancel, finding replacement"

ELSE IF hours_until < 12:
   → Add strike to provider record
   → IF strike_count >= 2 in 30 days: Suspend for 7 days
   → IF strike_count >= 3 in 30 days: Permanent review
   → Priority re-dispatch
   → Notify homeowner: "Provider cancelled, priority re-matching"
   → Consider goodwill credit for homeowner ($10)

ELSE IF provider.status == 'en_route':
   → Serious strike
   → Automatic 48-hour suspension
   → Manual review required before reactivation
   → Full refund to homeowner
   → Log for provider performance review
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| Homeowner cancels due to emergency (medical, death in family) | Full refund regardless of timing; require documentation |
| Provider cancels due to vehicle breakdown | No strike if documentation provided within 24h |
| Weather emergency prevents service | Full refund, no penalties either side |
| Homeowner not reachable for confirmation | Hold booking 2 hours, then auto-cancel with full refund |
| Provider accepts then immediately cancels | Treat as decline, no penalty if within 15 minutes |
| Multiple same-day reschedules by homeowner | Block further reschedules; require cancellation |

---

## 2. No-Show Policy

### Short Version (User-Facing)

#### For Homeowners

**If You're Not Home When the Provider Arrives**

The provider will:
1. Call/text you using the app
2. Wait up to **15 minutes**
3. Take a photo of arrival (timestamped)
4. Leave if no response

**What Happens Next**
- You'll be charged the **full diagnostic fee** (non-refundable)
- You may be charged a **$25 trip fee**
- To rebook, you'll need to pay the diagnostic fee again

**How to Avoid No-Show Charges**
- Ensure someone 18+ is home during the appointment window
- Update your phone number if it changes
- Cancel at least 12 hours ahead if plans change

#### For Providers

**If the Homeowner Doesn't Show**

1. **Call the homeowner** through the app (required)
2. **Wait 15 minutes** from the start of the appointment window
3. **Take arrival photo** with timestamp visible
4. **Mark as no-show** in the app

**What You'll Receive**
- Full diagnostic fee
- $25 trip compensation
- No impact on your ratings

**What NOT to Do**
- Don't leave before 15 minutes
- Don't skip the call attempt
- Don't mark as no-show without photo evidence

---

### Internal Version (Admin Enforcement)

#### Homeowner No-Show Processing

```
NO-SHOW VERIFICATION CHECKLIST:

□ Provider marked no-show in app
□ Provider waited minimum 15 minutes (check timestamps)
□ Provider attempted contact (check message logs)
□ Arrival photo submitted with metadata
□ GPS confirms provider was at location

IF all checks pass:
   → Retain diagnostic fee (no refund)
   → Add $25 trip fee to homeowner invoice
   → Credit provider: diagnostic_fee + $25
   → Log: no_show_confirmed
   → Increment homeowner.no_show_count

   IF homeowner.no_show_count >= 2 in 90 days:
      → Require prepayment for future bookings
      → Send warning email

   IF homeowner.no_show_count >= 3 in 90 days:
      → Account review required
      → Consider account suspension

IF checks fail:
   → Investigate discrepancy
   → Contact both parties
   → Make judgment call based on evidence
```

#### Provider No-Show Processing

```
PROVIDER NO-SHOW VERIFICATION:

Trigger: Homeowner reports provider didn't arrive

1. Check provider GPS history during appointment window
2. Check for arrival photo from provider
3. Check message logs for communication attempts
4. Check if provider marked job as complete (fraud check)

IF provider never arrived AND no valid excuse:
   → Full refund to homeowner
   → Serious strike on provider record
   → Immediate suspension pending review
   → Log: provider_no_show_confirmed

IF provider was late but arrived:
   → Partial credit to homeowner if >30 min late
   → Warning to provider
   → Check for pattern (3+ late arrivals = suspension)

VALID EXCUSES (require documentation within 24h):
   - Vehicle breakdown (photo + repair receipt)
   - Medical emergency (note from provider)
   - Road closure/accident (traffic report)
   - Family emergency (self-reported, 1 per quarter grace)
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| Homeowner claims they were home, provider says they weren't | Check GPS, photos, call logs; favor party with more evidence |
| Provider waited only 10 minutes | Partial trip fee ($15), remind of 15-min policy |
| Homeowner had medical emergency | Full refund, waive no-show, require documentation |
| Gated community, provider couldn't get in | Not a no-show; refund homeowner, no penalty to provider, instruct on gate codes |
| Wrong address entered by homeowner | Not a no-show; refund minus trip fee, homeowner responsible for rebooking |
| Provider arrived at wrong address | Provider error; full refund to homeowner, strike on provider |

---

## 3. Scope Change & Change Order Policy

### Short Version (User-Facing)

#### For Homeowners

**What Is a Change Order?**

A change order is required when the actual work needed differs significantly from the original estimate. This protects you from surprise charges.

**When a Change Order Happens**
- The provider discovers additional issues during the job
- The cost will increase by **more than 12%** OR **more than $75**
- You must approve before the provider continues

**Your Options**
1. **Approve** — Work continues at the new price
2. **Decline** — Provider completes only the original scope
3. **Negotiate** — Message the provider to discuss

**Important**
- You have **4 hours** to respond (or before end of business day)
- If you don't respond, only the original work is completed
- You're never charged more than you approve

#### For Providers

**When to Submit a Change Order**

Submit a change order when:
- You discover issues not visible during initial assessment
- Materials cost more than estimated
- The scope of work needs to expand
- The total will exceed the estimate by **>12% OR >$75**

**How to Submit**
1. Go to the active job in your app
2. Tap **Submit Change Order**
3. Enter the new total and reason
4. Upload photos of the issue
5. Wait for homeowner approval

**Rules**
- Never proceed with unapproved work exceeding the threshold
- If homeowner doesn't respond in 4 hours, complete original scope only
- Document everything with photos before and after

---

### Internal Version (Admin Enforcement)

#### Change Order Thresholds

```
CHANGE ORDER REQUIRED IF:

increase_amount = new_total - original_estimate
increase_percent = (increase_amount / original_estimate) * 100

IF increase_percent > 12 OR increase_amount > 75:
   → Change order REQUIRED
   → Block invoice submission until approved

IF increase_percent <= 12 AND increase_amount <= 75:
   → Change order OPTIONAL
   → Provider can complete and invoice
   → Flag for review if pattern detected
```

#### Change Order Processing

```
CHANGE ORDER WORKFLOW:

1. Provider submits change_order:
   - new_total (required)
   - reason (required, min 50 chars)
   - photos (required, min 1)
   - breakdown (optional but recommended)

2. System validation:
   - Verify increase exceeds threshold
   - Check provider doesn't have pending disputes
   - Verify job is in 'in_progress' status

3. Homeowner notification:
   - Push notification
   - SMS
   - Email
   - In-app banner on job page

4. Homeowner response window: 4 hours OR end of business (5 PM local), whichever is later

5. Response handling:
   APPROVED:
      → Update authorized_amount
      → Provider continues
      → Log: change_order_approved

   DECLINED:
      → Provider completes original scope only
      → Lock invoice at original estimate
      → Log: change_order_declined

   NO RESPONSE:
      → Treat as declined
      → Provider completes original scope
      → Log: change_order_expired
      → Consider goodwill gesture if work was urgent

6. Multiple change orders:
   - Max 2 change orders per job
   - 3rd request requires admin approval
   - Pattern of excessive change orders → provider review
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| Emergency repair needed (safety issue) | Provider can proceed, document heavily, submit change order retroactively |
| Homeowner unreachable, work is time-sensitive | Complete original scope; if safety issue, complete minimum to make safe |
| Provider submits change order after completing work | Flag as policy violation; honor if legitimate, warn provider |
| Homeowner disputes change order after approving | Show approval record; if regret, offer partial credit as goodwill |
| Change order for less than original estimate | No approval needed; provider can offer discount |
| Materials price increased mid-job | Valid reason; approve if documentation provided |

---

## 4. Dispute Policy

### Short Version (User-Facing)

#### For Homeowners

**When to File a Dispute**

File a dispute if:
- Work wasn't completed as agreed
- Quality doesn't meet standards
- You were overcharged
- Provider caused property damage
- Provider was unprofessional

**How to File**
1. Go to **Requests** → Select the completed booking
2. Tap **Report a Problem** within **72 hours** of job completion
3. Describe the issue and upload photos/videos
4. Submit for review

**Timeline**
| Step | Timeframe |
|------|-----------|
| File dispute | Within 72 hours of completion |
| Initial review | Within 24 hours |
| Investigation | 3-5 business days |
| Resolution | Within 7 business days |

**What Happens During a Dispute**
- Provider payment is held (not transferred)
- Both parties can submit evidence
- RegularUpkeep reviews and makes a decision
- Decision is communicated with explanation

#### For Providers

**When a Dispute Is Filed Against You**

1. You'll receive a notification immediately
2. Your payout for this job is held pending resolution
3. You have **48 hours** to respond with your evidence

**How to Respond**
1. Go to **Jobs** → Find the disputed job
2. Tap **Respond to Dispute**
3. Upload your documentation (photos, messages, receipts)
4. Provide your account of what happened

**Tips for Strong Responses**
- Include before/after photos
- Reference any signed change orders
- Provide material receipts
- Stay professional — no personal attacks

---

### Internal Version (Admin Enforcement)

#### Dispute Processing Workflow

```
DISPUTE INTAKE:

1. Validate dispute:
   - Filed within 72 hours of booking.completed_at
   - Booking status is 'completed' or 'payment_pending'
   - Homeowner hasn't disputed this booking before

2. Categorize dispute:
   - quality_issue: Work not up to standard
   - incomplete_work: Scope not fully completed
   - overcharge: Charged more than authorized
   - property_damage: Damage caused by provider
   - unprofessional: Behavior/conduct issue
   - no_show: Provider didn't arrive (see No-Show policy)
   - other: Requires manual categorization

3. Hold payment:
   - Set booking.payout_status = 'disputed'
   - Stop automatic transfer to provider
   - Log: payment_hold_initiated

4. Notify provider:
   - Send dispute notification (push, email, SMS)
   - Start 48-hour response timer
   - Provide dispute details and evidence

5. Collect provider response:
   - IF response received: Proceed to investigation
   - IF no response in 48h: Decision may proceed without input
```

#### Evidence Requirements

| Dispute Type | Homeowner Must Provide | Provider Should Provide |
|--------------|------------------------|------------------------|
| Quality Issue | Photos of poor work, description | Before/after photos, industry standards reference |
| Incomplete Work | List of unfinished items, photos | Completion photos, scope documentation |
| Overcharge | Invoice vs estimate comparison | Approved change orders, receipts |
| Property Damage | Photos of damage, repair estimate | Photos showing prior condition, insurance info |
| Unprofessional | Description, any recorded evidence | Context, any relevant messages |

#### Resolution Decision Matrix

```
DECISION FRAMEWORK:

QUALITY ISSUE:
   IF evidence shows substandard work:
      → Partial or full refund (based on severity)
      → Provider must offer to fix OR accept refund
      → Note on provider record
   IF evidence is inconclusive:
      → Split resolution (50% credit to homeowner)
      → No penalty to provider
   IF homeowner expectations unreasonable:
      → No refund
      → Educate homeowner on standards

INCOMPLETE WORK:
   IF scope items clearly missing:
      → Refund proportional to incomplete portion
      → Provider can offer to complete for no additional charge
   IF scope was ambiguous:
      → Partial credit as goodwill
      → Update estimate practices

OVERCHARGE:
   IF charge exceeds authorized amount:
      → Refund difference + 10% inconvenience credit
      → Warning to provider
   IF approved change order exists:
      → No refund
      → Show homeowner the approval record

PROPERTY DAMAGE:
   IF provider caused damage:
      → Full repair cost refunded
      → Provider insurance claim initiated
      → Serious strike on provider record
   IF damage was pre-existing:
      → No refund
      → Provider should document pre-existing issues

UNPROFESSIONAL:
   IF verified misconduct:
      → Full refund
      → Provider suspended pending review
      → Report to appropriate authorities if severe
   IF he-said-she-said:
      → Goodwill credit to homeowner
      → Warning to provider
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| Dispute filed 73 hours after completion | Allow if <80 hours and valid reason for delay |
| Homeowner has pattern of disputes | Flag for review; consider requiring mediation |
| Provider has multiple disputes | Escalate to provider quality review |
| Dispute amount is <$25 | Fast-track resolution, favor homeowner if reasonable |
| Both parties unresponsive | Close dispute, release payment to provider after 14 days |
| Homeowner wants to drop dispute | Allow, release payment, log reason |

---

## 5. Refunds & Credits Policy

### Short Version (User-Facing)

#### Refund Eligibility

| Situation | Refund Amount | Timeline |
|-----------|---------------|----------|
| Cancelled before provider accepts | 100% | 3-5 business days |
| Cancelled 24+ hours before | 100% | 3-5 business days |
| Cancelled 12-24 hours before | 50% | 3-5 business days |
| Cancelled <12 hours before | 0% | N/A |
| Provider no-show | 100% + $10 credit | 24-48 hours |
| Quality issue (verified) | Up to 100% | After investigation |
| Service not as described | Up to 100% | After investigation |
| Platform error | 100% + goodwill credit | 24-48 hours |

#### Credits vs Refunds

- **Refund**: Money returned to your original payment method
- **Credit**: Balance added to your RegularUpkeep account for future use

We may offer credits instead of refunds for:
- Small amounts (<$25)
- Goodwill gestures
- Faster resolution

You can always request a refund instead of credit for amounts over $25.

#### How to Request a Refund

1. Go to **Billing** → **Transaction History**
2. Find the charge and tap **Request Refund**
3. Select reason and provide details
4. Submit for review

---

### Internal Version (Admin Enforcement)

#### Refund Decision Criteria

```
REFUND DECISION TREE:

1. Determine refund reason:
   - cancellation: Use cancellation policy matrix
   - no_show: Auto-approve full refund + $10 credit
   - quality_dispute: Use dispute resolution outcome
   - overcharge: Refund difference + 10%
   - platform_error: Full refund + goodwill credit
   - duplicate_charge: Full refund immediately
   - unauthorized_charge: Full refund + investigation

2. Check refund eligibility:
   - Was service delivered?
   - Is there evidence of issue?
   - Is this a pattern (repeat refund requestor)?
   - What does provider documentation show?

3. Calculate refund amount:
   IF full_refund:
      refund_amount = original_charge
   IF partial_refund:
      refund_amount = original_charge * refund_percentage
   IF credit_only:
      credit_amount = calculated_amount
      refund_amount = 0

4. Apply refund:
   - Process via Stripe refund API
   - Update booking.refund_status
   - Notify homeowner
   - Adjust provider payout if needed
```

#### Refund Limits and Controls

| Control | Threshold | Action |
|---------|-----------|--------|
| Daily refund limit per account | $500 | Require manager approval above |
| Monthly refund rate | >5% of bookings | Flag account for review |
| Single refund amount | >$1,000 | Require director approval |
| Repeat refund requests | 3+ in 30 days | Manual review required |

#### Credit vs Refund Guidelines

```
ISSUE CREDIT IF:
- Amount <= $25
- Resolution needs to be fast
- Customer prefers credit
- Goodwill gesture (not a dispute)
- Repeat customer (incentive to stay)

ISSUE REFUND IF:
- Amount > $25 (unless customer prefers credit)
- Serious platform error
- Customer explicitly requests refund
- First-time customer (no account history)
- Legal/fraud situation
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| Refund requested 6 months after service | Decline; offer small goodwill credit if longtime customer |
| Customer demands refund but service was completed properly | Decline with explanation; offer mediation |
| Provider agrees to refund but already paid out | Deduct from provider's next payout; if insufficient, invoice provider |
| Chargeback filed instead of refund request | Work with Stripe; provide evidence; accept if legitimate |
| Partial service completed before cancellation | Refund proportional to uncompleted portion |
| Refund requested for "changed mind" after service | Decline; service was rendered as agreed |

---

## 6. Emergency Routing Policy

### Short Version (User-Facing)

#### What Counts as an Emergency?

**TRUE EMERGENCIES (Call 911 first)**
- Gas leak or smell of gas
- Active fire
- Electrical sparking/fire risk
- Flooding that can't be stopped
- Carbon monoxide alarm
- Structural collapse

**URGENT ISSUES (Same-day service)**
- No hot water
- No heat (when below 50°F outside)
- No A/C (when above 90°F outside)
- Toilet not working (only toilet in home)
- Active water leak (contained but ongoing)
- No power to part of home
- Broken lock/security issue

**STANDARD ISSUES (Schedule normally)**
- Slow drains
- Minor leaks
- Appliance not working
- Cosmetic damage
- Routine maintenance

#### How Emergency Routing Works

1. When you submit a request, answer the urgency questions
2. If flagged as emergency, your request goes to the **Priority Queue**
3. Providers with emergency availability are notified first
4. You may see an **after-hours fee** (+35%) for nights/weekends

#### After-Hours Definition
- **After-hours**: 6 PM to 8 AM, plus weekends and holidays
- **After-hours fee**: +35% on diagnostic fee and labor

---

### Internal Version (Admin Enforcement)

#### Emergency Classification Logic

```
EMERGENCY CLASSIFICATION:

INPUT: service_request with answers to urgency questions

LEVEL 1 - LIFE SAFETY (Call 911):
IF any of:
   - gas_leak == true
   - active_fire == true
   - electrical_sparking == true
   - co_alarm == true
   - structural_collapse == true
THEN:
   → Show 911 prompt immediately
   → Log: emergency_911_redirect
   → Allow service request AFTER 911 confirmation
   → Flag for human review

LEVEL 2 - URGENT (Same-day priority):
IF any of:
   - no_water AND no_alternative
   - no_heat AND outside_temp < 50
   - no_cooling AND outside_temp > 90
   - only_toilet_broken
   - active_leak AND affecting_living_space
   - no_power_partial
   - security_compromised
THEN:
   → Route to priority queue
   → Notify emergency-available providers
   → Apply after_hours_fee if applicable
   → Set SLA: 4-hour response target

LEVEL 3 - STANDARD:
ELSE:
   → Normal routing
   → Standard SLA (24-48 hours)
```

#### Emergency Provider Dispatch

```
PRIORITY DISPATCH LOGIC:

1. Get providers in service area with:
   - emergency_available == true
   - current_status == 'available'
   - matching service category

2. Rank by:
   - Distance (closest first)
   - Rating (4.5+ preferred)
   - Response time history (fastest first)

3. Notify in waves:
   - Wave 1 (0 min): Top 3 providers
   - Wave 2 (15 min): Next 5 providers
   - Wave 3 (30 min): All available providers
   - Wave 4 (60 min): Expand radius by 50%

4. If no provider accepts in 2 hours:
   - Escalate to operations team
   - Consider partner network referral
   - Notify homeowner of delay
```

#### After-Hours Fee Application

```
AFTER-HOURS DEFINITION:

is_after_hours = true IF:
   - time is between 18:00 and 08:00 local
   - day is Saturday or Sunday
   - day is in holiday_list

AFTER-HOURS FEE:
   - Diagnostic fee: base_fee * 1.35
   - Labor rate: base_rate * 1.35
   - Materials: no markup

DISPLAY:
   - Show base fee AND after-hours fee separately
   - Explain: "After-hours fee (+35%) applies to evenings, weekends, and holidays"
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| Customer marks non-emergency as emergency | Provider can reclassify; if pattern, warn customer |
| True emergency but no providers available | Escalate to ops; provide 24/7 hotline numbers |
| Customer wants emergency service for routine issue | Allow with after-hours fee; note for analytics |
| Provider claims emergency was misrepresented | Review classification; adjust future routing |
| Life safety issue customer refuses 911 | Log refusal; allow service request; document heavily |

---

## 7. Reviews & Ratings Policy

### Short Version (User-Facing)

#### How Ratings Work

After each completed job, both homeowners and providers can leave ratings:

- **Star Rating**: 1-5 stars
- **Written Review**: Optional but encouraged
- **Category Ratings** (optional): Punctuality, Quality, Communication, Value

#### Rating Guidelines

**DO**
- Be honest and specific
- Focus on the service provided
- Mention what went well and what could improve
- Update your review if the provider makes it right

**DON'T**
- Include personal attacks or profanity
- Mention disputes or payment issues (use Dispute process)
- Reference other customers or jobs
- Post fake reviews or review your own service

#### When Reviews Can Be Removed

We remove reviews that:
- Contain profanity, threats, or harassment
- Are clearly fake or fraudulent
- Violate privacy (share personal info)
- Are posted on the wrong job
- Are retaliatory (reviewed after being reviewed negatively)

#### Responding to Reviews

**For Providers**: You can respond to any review once. Keep it professional. Your response will be public.

**For Homeowners**: You can update your review within 14 days if the situation changes.

---

### Internal Version (Admin Enforcement)

#### Review Validation

```
REVIEW SUBMISSION VALIDATION:

1. Verify reviewer was party to the booking
2. Verify booking is completed
3. Verify review window (within 30 days of completion)
4. Check for prohibited content:
   - Profanity filter
   - Personal info (phone, address, SSN patterns)
   - Competitor mentions
   - Threats/harassment keywords

5. Check for patterns:
   - Same IP/device reviewing multiple providers
   - Review swap patterns (A reviews B, B reviews A)
   - Sudden review volume spike
```

#### Review Removal Criteria

| Removal Reason | Action | Appeal Allowed |
|----------------|--------|----------------|
| Profanity/harassment | Remove immediately | Yes, if edited |
| Personal information | Remove, redact | Yes, if redacted |
| Wrong booking | Remove | Yes, repost on correct booking |
| Fake/fraudulent | Remove, flag account | Yes, with verification |
| Retaliation | Remove, warn reviewer | Yes, with evidence |
| Legal request | Remove, document | N/A |
| Factually false (verified) | Remove after investigation | Yes |

#### Retaliation Detection

```
RETALIATION PATTERN:

1. Provider A reviews Homeowner B: 1-2 stars
2. Within 24 hours, Homeowner B reviews Provider A: 1-2 stars
3. Content suggests tit-for-tat

HANDLING:
   - Flag both reviews for manual review
   - Check if complaints are legitimate
   - If retaliatory: Remove Homeowner B's review, keep Provider A's
   - If both legitimate: Keep both
   - Warn party that appears retaliatory
```

#### Rating Calculation

```
PROVIDER RATING CALCULATION:

overall_rating = weighted_average of:
   - Last 30 days: weight 3x
   - 30-90 days: weight 2x
   - 90+ days: weight 1x

Minimum reviews for display: 3
If <3 reviews: Show "New Provider"

RATING PROTECTION:
   - First 5 jobs: Bad ratings weighted less (0.5x)
   - Disputed jobs: Rating not counted until resolved
   - Outlier detection: 1-star after all 5-stars flagged for review
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| Review mentions pending dispute | Hide until dispute resolved; show after with context |
| Customer threatens bad review for discount | Document threat; review may be preemptively flagged |
| Provider offers payment for good review | Remove review; warn customer; serious penalty for provider |
| Review is accurate but hurts provider unfairly | Keep review; allow provider response |
| Customer wants to update review after 14 days | Allow one-time exception with good reason |
| Provider harasses customer about review | Suspend provider; remove any review response |

---

## 8. Provider Quality Standards & Enforcement

### Short Version (User-Facing)

#### Our Quality Standards

All RegularUpkeep providers must meet these standards:

**Reliability**
- Accept 70%+ of offered jobs
- Cancel <10% of accepted jobs
- Arrive within the scheduled window

**Quality**
- Maintain 4.0+ star rating
- Complete work as described
- Use quality materials
- Follow industry best practices

**Professionalism**
- Communicate promptly
- Dress appropriately
- Treat customers respectfully
- Leave work areas clean

**Documentation**
- Take before/after photos
- Provide detailed invoices
- Respond to messages within 4 hours

#### Provider Tiers

| Tier | Requirements | Benefits |
|------|--------------|----------|
| **Standard** | Active account | Basic listing |
| **Verified** | Background check, insurance, license | Verification badge, more visibility |
| **Preferred** | Verified + 4.5+ rating, 10+ jobs, <5% disputes | Priority dispatch, premium listing |

---

### Internal Version (Admin Enforcement)

#### Quality Metrics Tracking

```
PROVIDER METRICS (calculated daily):

acceptance_rate = accepted_jobs / offered_jobs (30-day rolling)
cancellation_rate = cancelled_jobs / accepted_jobs (30-day rolling)
on_time_rate = on_time_arrivals / total_arrivals (30-day rolling)
average_rating = weighted_average_rating (see Rating Calculation)
response_time = average_message_response_minutes (30-day rolling)
dispute_rate = disputes / completed_jobs (90-day rolling)
completion_rate = completed_jobs / started_jobs (30-day rolling)

THRESHOLDS:
   acceptance_rate: minimum 70%
   cancellation_rate: maximum 10%
   on_time_rate: minimum 85%
   average_rating: minimum 4.0
   response_time: maximum 240 minutes (4 hours)
   dispute_rate: maximum 5%
   completion_rate: minimum 95%
```

#### Enforcement Ladder

```
ENFORCEMENT LADDER:

LEVEL 1 - WARNING:
Trigger: First violation of any metric OR minor policy violation
Action:
   - Automated warning email
   - In-app notification
   - 30-day monitoring period
   - Log: enforcement_warning

LEVEL 2 - PROBATION:
Trigger: Second violation within 90 days OR moderate policy violation
Action:
   - Personal outreach from provider success team
   - 14-day probation period
   - Reduced job visibility
   - Must improve metrics to exit probation
   - Log: enforcement_probation

LEVEL 3 - TEMPORARY SUSPENSION:
Trigger: Third violation within 90 days OR serious policy violation
Action:
   - 7-day suspension from receiving new jobs
   - Required remediation training
   - Must pass quality review to reactivate
   - Log: enforcement_suspension

LEVEL 4 - EXTENDED SUSPENSION:
Trigger: Violation during or immediately after temporary suspension
Action:
   - 30-day suspension
   - All active jobs reassigned
   - In-person or video review meeting required
   - Must demonstrate corrective action
   - Log: enforcement_extended_suspension

LEVEL 5 - PERMANENT REMOVAL:
Trigger: Pattern of violations OR severe policy violation OR fraud
Action:
   - Permanent account deactivation
   - Cannot create new provider account
   - Log: enforcement_permanent_removal
   - May be reported to licensing boards if applicable
```

#### Severe Violations (Immediate Action)

| Violation | Immediate Action |
|-----------|------------------|
| Fraud/theft | Permanent removal + law enforcement |
| Physical threat/assault | Permanent removal + law enforcement |
| Discrimination | Suspension pending investigation |
| Unlicensed work (where required) | Suspension until license provided |
| Subcontracting without disclosure | Warning or suspension based on context |
| Fake reviews/rating manipulation | Suspension + review removal |
| Customer harassment | Suspension pending investigation |
| Property damage (intentional) | Permanent removal + insurance claim |

#### Reinstatement Process

```
REINSTATEMENT AFTER SUSPENSION:

1. Provider completes required remediation:
   - Training modules (if applicable)
   - Written explanation of corrective actions
   - Wait period complete

2. Provider submits reinstatement request

3. Review committee evaluates:
   - Violation severity
   - Provider history
   - Corrective actions taken
   - Risk of recurrence

4. Decision:
   APPROVED:
      - Reactivate account
      - 90-day enhanced monitoring
      - Log: reinstatement_approved

   DENIED:
      - Provide reason
      - May appeal in 30 days
      - Log: reinstatement_denied

5. Post-reinstatement monitoring:
   - Any violation in 90 days → Level 4 suspension
   - Clean 90 days → Return to normal status
```

#### Edge Cases

| Scenario | Resolution |
|----------|------------|
| New provider has 1-star from first job | Don't penalize heavily; offer coaching |
| Provider's metrics dropped due to illness | Allow medical leave; pause metrics |
| Provider disputes validity of complaint | Investigate before enforcing |
| High-volume provider has low rates but high absolute numbers | Consider absolute + relative metrics |
| Provider in good standing makes one serious mistake | Consider context; may skip levels with contrition |
| Provider claims customer is lying | Investigate both sides; document everything |

---

## Canned Message Scripts

### Homeowner Notifications

#### Cancellation Notifications

```
CANCELLATION_CONFIRMED_FULL_REFUND:
Subject: Your booking has been cancelled

Hi {homeowner_name},

Your booking for {service_type} on {date} has been cancelled.

A full refund of ${refund_amount} will be processed to your original payment method within 3-5 business days.

Need to rebook? You can schedule a new appointment anytime at app.regularupkeep.com.

Thanks for using RegularUpkeep.
```

```
CANCELLATION_CONFIRMED_PARTIAL_REFUND:
Subject: Your booking has been cancelled

Hi {homeowner_name},

Your booking for {service_type} on {date} has been cancelled.

Because the cancellation was made less than 24 hours before your appointment, a partial refund of ${refund_amount} will be processed within 3-5 business days.

A ${fee_amount} late cancellation fee was applied per our cancellation policy.

Need help? Contact us at support@regularupkeep.com.
```

```
CANCELLATION_NO_REFUND:
Subject: Your booking has been cancelled

Hi {homeowner_name},

Your booking for {service_type} on {date} has been cancelled.

Because the cancellation was made less than 12 hours before your appointment, the diagnostic fee is non-refundable per our cancellation policy. This fee helps compensate our providers who reserved time for your appointment.

We understand things come up. If this was due to an emergency, please contact us and we'll review your situation.
```

#### Provider Issue Notifications

```
PROVIDER_CANCELLED_REBOOKING:
Subject: We're finding you a new provider

Hi {homeowner_name},

Unfortunately, {provider_name} is no longer available for your {service_type} appointment on {date}.

Good news: We're already working on finding you another qualified provider. You'll receive a notification as soon as one accepts.

No action needed from you. If you'd prefer to reschedule, you can do so in the app.

We apologize for the inconvenience.
```

```
PROVIDER_NO_SHOW_REFUND:
Subject: We're sorry your provider didn't show up

Hi {homeowner_name},

We sincerely apologize — {provider_name} did not arrive for your {service_type} appointment.

Here's what we've done:
✓ Full refund of ${refund_amount} processed
✓ Added a $10 credit to your account for the inconvenience
✓ Documented this incident on the provider's record

Would you like us to book another provider? Just reply to this email or tap below.

[Book Again]

We take no-shows seriously and appreciate your patience.
```

#### Dispute Notifications

```
DISPUTE_RECEIVED:
Subject: We've received your dispute

Hi {homeowner_name},

Thank you for letting us know about your experience with {provider_name} for {service_type}.

Here's what happens next:
1. We've notified the provider and asked for their response
2. Our team will review all documentation within 24 hours
3. We'll reach out if we need any additional information
4. You can expect a resolution within 5-7 business days

Your reference number: {dispute_id}

The provider's payment is on hold until this is resolved.

Questions? Reply to this email anytime.
```

```
DISPUTE_RESOLVED_REFUND:
Subject: Your dispute has been resolved

Hi {homeowner_name},

We've completed our review of your dispute (#{dispute_id}).

**Decision: Refund approved**

After reviewing the evidence, we've determined that {resolution_reason}.

A refund of ${refund_amount} has been processed and will appear on your statement within 3-5 business days.

We've also documented this on the provider's record to help maintain quality standards.

Thank you for bringing this to our attention.
```

```
DISPUTE_RESOLVED_NO_REFUND:
Subject: Your dispute has been resolved

Hi {homeowner_name},

We've completed our review of your dispute (#{dispute_id}).

**Decision: No refund**

After carefully reviewing the evidence from both parties, we found that {resolution_reason}.

We understand this may not be the outcome you hoped for. If you have additional evidence we didn't consider, you can respond to this email within 7 days.

Thank you for using RegularUpkeep.
```

### Provider Notifications

#### Booking Notifications

```
JOB_CANCELLED_BY_HOMEOWNER:
Subject: Booking cancelled - {service_type} on {date}

Hi {provider_name},

The homeowner has cancelled their {service_type} appointment scheduled for {date} at {time}.

{if hours_until >= 24}
No compensation applies for cancellations made 24+ hours in advance.
{endif}

{if hours_until >= 12 && hours_until < 24}
A 50% cancellation fee (${fee_amount}) has been credited to your account.
{endif}

{if hours_until < 12}
The full diagnostic fee (${fee_amount}) has been credited to your account to compensate for the late cancellation.
{endif}

This time slot is now open for other bookings.
```

```
HOMEOWNER_NO_SHOW_COMPENSATION:
Subject: No-show confirmed - compensation credited

Hi {provider_name},

We've confirmed that the homeowner was not present for your {service_type} appointment on {date}.

Your compensation:
- Diagnostic fee: ${diagnostic_fee}
- Trip fee: $25
- Total credited: ${total_amount}

This will appear in your next payout. Thank you for following the proper no-show documentation procedure.
```

#### Dispute Notifications

```
DISPUTE_FILED_AGAINST_YOU:
Subject: Action required: Dispute filed for {service_type} on {date}

Hi {provider_name},

A homeowner has filed a dispute regarding your {service_type} job on {date}.

**Dispute Type:** {dispute_type}
**Homeowner's Concern:** {dispute_summary}

**Your payment for this job (${job_amount}) is on hold** until this is resolved.

**What you need to do:**
Please respond within 48 hours with your documentation:
- Before and after photos
- Any signed agreements or change orders
- Material receipts
- Relevant message history

[Respond to Dispute]

We review all evidence fairly. Your thorough documentation helps ensure a fair resolution.

Questions? Contact provider-support@regularupkeep.com.
```

```
DISPUTE_RESOLVED_IN_YOUR_FAVOR:
Subject: Dispute resolved - payment released

Hi {provider_name},

Good news! The dispute filed against your {service_type} job on {date} has been resolved in your favor.

**Decision:** Payment released

Your full payment of ${job_amount} will be included in your next payout.

Thank you for providing thorough documentation. Keep up the great work!
```

```
DISPUTE_RESOLVED_AGAINST_YOU:
Subject: Dispute resolved - refund issued

Hi {provider_name},

We've completed our review of the dispute for your {service_type} job on {date}.

**Decision:** Refund issued to homeowner

After reviewing the evidence, we determined that {resolution_reason}.

**Impact:**
- Homeowner refunded: ${refund_amount}
- Your payout: ${remaining_payout}
- This has been noted on your quality record

We encourage you to review our quality standards and reach out if you have questions about improving your service.

If you believe this decision was made in error, you can appeal within 7 days by replying to this email.
```

#### Quality & Enforcement Notifications

```
QUALITY_WARNING:
Subject: Quality notice for your RegularUpkeep account

Hi {provider_name},

We've noticed some metrics on your account that need attention:

{foreach metric in failing_metrics}
- {metric.name}: {metric.current} (minimum required: {metric.threshold})
{endforeach}

This is a friendly heads-up. No action is required right now, but continued issues may affect your standing on the platform.

**Tips to improve:**
{improvement_tips}

Questions? Our provider success team is here to help: provider-support@regularupkeep.com
```

```
SUSPENSION_NOTICE:
Subject: Your RegularUpkeep account has been suspended

Hi {provider_name},

Your provider account has been suspended for {suspension_duration} due to {suspension_reason}.

**Effective:** {start_date}
**Ends:** {end_date}

**What this means:**
- You cannot receive new job offers
- Active jobs have been reassigned
- Your profile is hidden from searches

**To be reinstated:**
{reinstatement_requirements}

We take quality seriously to protect our homeowners and providers. If you believe this suspension was made in error, you can appeal by replying to this email.
```

### Admin Decision Outcomes

```
ADMIN_DISPUTE_DECISION:
Internal template for documenting decisions

Dispute ID: {dispute_id}
Date Resolved: {resolution_date}
Resolved By: {admin_name}

Parties:
- Homeowner: {homeowner_name} ({homeowner_id})
- Provider: {provider_name} ({provider_id})

Dispute Type: {dispute_type}
Amount in Dispute: ${dispute_amount}

Evidence Reviewed:
{evidence_summary}

Decision: {decision_type}
Rationale: {decision_rationale}

Actions Taken:
- Homeowner: {homeowner_action}
- Provider: {provider_action}
- Financial: {financial_action}

Follow-up Required: {follow_up_notes}
```

```
ADMIN_REFUND_APPROVAL:
Internal template for refund decisions

Refund Request ID: {refund_id}
Requested By: {requestor_name}
Amount: ${refund_amount}
Reason: {refund_reason}

Decision: APPROVED / DENIED

If Approved:
- Refund Method: Original payment method / Account credit
- Processing Time: Standard (3-5 days) / Expedited (24h)
- Notification Sent: Yes / No

If Denied:
- Denial Reason: {denial_reason}
- Alternative Offered: {alternative}
- Escalation Path: {escalation_info}

Approved By: {admin_name}
Date: {approval_date}
```

---

## Chatbot KB Add-On

### FAQ JSON Pairs by Policy

```json
{
  "policies_faq": [
    {
      "id": "cancel_1",
      "policy": "cancellation",
      "question": "How do I cancel my booking?",
      "answer": "To cancel a booking, go to Requests → select your booking → tap Cancel. If you cancel 24+ hours before your appointment, you'll receive a full refund. Cancellations within 24 hours may incur fees."
    },
    {
      "id": "cancel_2",
      "policy": "cancellation",
      "question": "What is the cancellation fee?",
      "answer": "Cancellation fees depend on timing: Free if 24+ hours before, 50% of diagnostic fee if 12-24 hours before, and non-refundable if less than 12 hours before your appointment."
    },
    {
      "id": "cancel_3",
      "policy": "cancellation",
      "question": "Can I reschedule instead of cancel?",
      "answer": "Yes! Rescheduling is free if done 24+ hours before. Same-day reschedules have a $15 fee. You can reschedule up to 2 times per booking in the app."
    },
    {
      "id": "cancel_4",
      "policy": "cancellation",
      "question": "The provider cancelled on me, what happens?",
      "answer": "We apologize for the inconvenience. We'll immediately find you a replacement provider. If a provider cancels last-minute, you may receive a goodwill credit for the inconvenience."
    },
    {
      "id": "noshow_1",
      "policy": "no_show",
      "question": "What happens if I'm not home when the provider arrives?",
      "answer": "The provider will wait 15 minutes and try to contact you. If you don't respond, this is considered a no-show and you'll be charged the full diagnostic fee plus a $25 trip fee."
    },
    {
      "id": "noshow_2",
      "policy": "no_show",
      "question": "The provider didn't show up, what do I do?",
      "answer": "We're so sorry! Report the no-show in the app immediately. You'll receive a full refund plus a $10 credit for the inconvenience. We take provider no-shows very seriously."
    },
    {
      "id": "noshow_3",
      "policy": "no_show",
      "question": "How do I avoid no-show charges?",
      "answer": "Make sure someone 18+ is home during your appointment window, keep your phone nearby, and cancel at least 12 hours ahead if your plans change."
    },
    {
      "id": "change_1",
      "policy": "change_order",
      "question": "What is a change order?",
      "answer": "A change order is required when the provider discovers additional work that will increase the cost by more than 12% or $75. You must approve change orders before the provider can proceed with the additional work."
    },
    {
      "id": "change_2",
      "policy": "change_order",
      "question": "Do I have to approve a change order?",
      "answer": "You have three options: Approve (work continues at new price), Decline (only original work is completed), or Negotiate with the provider. If you don't respond within 4 hours, only the original work will be completed."
    },
    {
      "id": "change_3",
      "policy": "change_order",
      "question": "Can I be charged more than I approved?",
      "answer": "No. You're never charged more than you approve. Any increase over 12% or $75 requires your explicit approval through a change order."
    },
    {
      "id": "dispute_1",
      "policy": "dispute",
      "question": "How do I file a dispute?",
      "answer": "Go to Requests → select the completed booking → tap 'Report a Problem'. Describe the issue and upload photos. You must file within 72 hours of job completion."
    },
    {
      "id": "dispute_2",
      "policy": "dispute",
      "question": "How long does a dispute take to resolve?",
      "answer": "We aim to resolve disputes within 5-7 business days. You'll receive an initial review within 24 hours, and we'll keep you updated throughout the process."
    },
    {
      "id": "dispute_3",
      "policy": "dispute",
      "question": "What happens to the provider's payment during a dispute?",
      "answer": "The provider's payment is held and not transferred until the dispute is resolved. This protects you while we investigate."
    },
    {
      "id": "dispute_4",
      "policy": "dispute",
      "question": "What evidence do I need for a dispute?",
      "answer": "Photos are most helpful. Include images of the issue, the work area, and any damage. Also describe what was agreed vs. what was delivered. The more detail, the faster we can resolve it."
    },
    {
      "id": "refund_1",
      "policy": "refund",
      "question": "How do I get a refund?",
      "answer": "Go to Billing → Transaction History → find the charge → tap 'Request Refund'. Select the reason and submit. Refund eligibility depends on the situation."
    },
    {
      "id": "refund_2",
      "policy": "refund",
      "question": "How long do refunds take?",
      "answer": "Refunds are processed within 3-5 business days and appear on your original payment method. Some banks may take additional time to post the credit."
    },
    {
      "id": "refund_3",
      "policy": "refund",
      "question": "What's the difference between a refund and a credit?",
      "answer": "A refund goes back to your original payment method. A credit is added to your RegularUpkeep account for future use. For amounts over $25, you can always request a refund instead of credit."
    },
    {
      "id": "emergency_1",
      "policy": "emergency",
      "question": "What counts as an emergency?",
      "answer": "True emergencies include gas leaks, active fires, flooding, and electrical sparking — call 911 first. Urgent issues like no heat, no water, or a broken only-toilet get same-day priority but aren't 911 emergencies."
    },
    {
      "id": "emergency_2",
      "policy": "emergency",
      "question": "Is there an after-hours fee?",
      "answer": "Yes, a 35% after-hours fee applies to evenings (6 PM - 8 AM), weekends, and holidays. This compensates providers for emergency availability."
    },
    {
      "id": "emergency_3",
      "policy": "emergency",
      "question": "How fast can someone come for an emergency?",
      "answer": "For urgent issues, we target a provider response within 4 hours. For true emergencies, call 911 first, then submit a request and we'll prioritize matching you."
    },
    {
      "id": "review_1",
      "policy": "reviews",
      "question": "How do ratings work?",
      "answer": "After each job, you can rate your provider 1-5 stars and leave an optional written review. Providers can also rate homeowners. Ratings help maintain quality on the platform."
    },
    {
      "id": "review_2",
      "policy": "reviews",
      "question": "Can I change my review?",
      "answer": "Yes, you can update your review within 14 days of posting. This is helpful if the provider makes things right after initial issues."
    },
    {
      "id": "review_3",
      "policy": "reviews",
      "question": "How do I report a fake or unfair review?",
      "answer": "Tap the flag icon on the review to report it. We investigate and remove reviews that are fake, contain harassment, or violate our guidelines."
    },
    {
      "id": "review_4",
      "policy": "reviews",
      "question": "Can a provider see who left a low rating?",
      "answer": "Yes, reviews are not anonymous. This encourages honest, constructive feedback. However, we have strict anti-retaliation policies."
    },
    {
      "id": "quality_1",
      "policy": "provider_quality",
      "question": "What are the provider quality standards?",
      "answer": "Providers must maintain 70%+ acceptance rate, <10% cancellation rate, 4.0+ star rating, <5% dispute rate, and respond to messages within 4 hours."
    },
    {
      "id": "quality_2",
      "policy": "provider_quality",
      "question": "What is a Verified provider?",
      "answer": "Verified providers have passed a background check and provided proof of insurance and licensing. They display a verification badge on their profile."
    },
    {
      "id": "quality_3",
      "policy": "provider_quality",
      "question": "What is a Preferred provider?",
      "answer": "Preferred providers are our top-tier providers with 4.5+ ratings, 10+ completed jobs, and less than 5% dispute rate. They get priority in our matching system."
    },
    {
      "id": "quality_4",
      "policy": "provider_quality",
      "question": "What happens if a provider has poor quality?",
      "answer": "We use an enforcement ladder: warning, probation, temporary suspension, extended suspension, and permanent removal for repeated or serious issues."
    }
  ]
}
```

### Intent Map YAML

```yaml
# RegularUpkeep Policies - Chatbot Intent Map
# Version: 1.0

policy_intents:
  # Cancellation Policy
  - intent: policy_cancellation
    patterns:
      - "cancellation policy"
      - "how do I cancel"
      - "cancel my booking"
      - "cancel appointment"
      - "cancellation fee"
      - "what if I cancel"
    policy: cancellation
    response_key: cancel_overview
    follow_up_intents:
      - policy_cancellation_fee
      - policy_reschedule

  - intent: policy_cancellation_fee
    patterns:
      - "how much to cancel"
      - "cancellation charge"
      - "will I be charged for cancelling"
      - "is cancellation free"
      - "late cancellation"
    policy: cancellation
    response_key: cancel_fee_breakdown
    faq_ids: ["cancel_2"]

  - intent: policy_reschedule
    patterns:
      - "reschedule"
      - "change my appointment"
      - "move my booking"
      - "different time"
      - "can I reschedule"
    policy: cancellation
    response_key: reschedule_info
    faq_ids: ["cancel_3"]

  - intent: policy_provider_cancelled
    patterns:
      - "provider cancelled"
      - "my provider cancelled"
      - "they cancelled on me"
      - "service cancelled by provider"
    policy: cancellation
    response_key: provider_cancel_info
    faq_ids: ["cancel_4"]

  # No-Show Policy
  - intent: policy_noshow
    patterns:
      - "no show policy"
      - "what if I'm not home"
      - "missed appointment"
      - "wasn't home"
      - "provider didn't show"
      - "no one showed up"
    policy: no_show
    response_key: noshow_overview

  - intent: policy_noshow_homeowner
    patterns:
      - "I missed my appointment"
      - "I wasn't home"
      - "forgot about appointment"
      - "no show fee"
    policy: no_show
    response_key: homeowner_noshow
    faq_ids: ["noshow_1", "noshow_3"]

  - intent: policy_noshow_provider
    patterns:
      - "provider didn't come"
      - "no one arrived"
      - "where is my provider"
      - "provider never showed"
    policy: no_show
    response_key: provider_noshow
    faq_ids: ["noshow_2"]
    escalation: true

  # Change Order Policy
  - intent: policy_change_order
    patterns:
      - "change order"
      - "additional charges"
      - "price went up"
      - "more than estimate"
      - "extra charges"
      - "scope change"
    policy: change_order
    response_key: change_order_overview
    faq_ids: ["change_1", "change_2", "change_3"]

  - intent: policy_change_order_approve
    patterns:
      - "approve change order"
      - "accept additional work"
      - "agree to change"
    policy: change_order
    response_key: change_order_approval

  - intent: policy_change_order_decline
    patterns:
      - "decline change order"
      - "reject extra charges"
      - "don't want additional work"
    policy: change_order
    response_key: change_order_decline

  # Dispute Policy
  - intent: policy_dispute
    patterns:
      - "dispute policy"
      - "file a dispute"
      - "report a problem"
      - "bad service"
      - "work not done right"
      - "not satisfied"
      - "complain"
    policy: dispute
    response_key: dispute_overview
    faq_ids: ["dispute_1", "dispute_2"]

  - intent: policy_dispute_timeline
    patterns:
      - "how long to dispute"
      - "dispute deadline"
      - "when can I dispute"
      - "72 hours"
    policy: dispute
    response_key: dispute_timeline
    faq_ids: ["dispute_2"]

  - intent: policy_dispute_evidence
    patterns:
      - "what evidence for dispute"
      - "proof for dispute"
      - "dispute documentation"
    policy: dispute
    response_key: dispute_evidence
    faq_ids: ["dispute_4"]

  - intent: policy_dispute_payment
    patterns:
      - "payment during dispute"
      - "is payment held"
      - "do they still get paid"
    policy: dispute
    response_key: dispute_payment_hold
    faq_ids: ["dispute_3"]

  # Refund Policy
  - intent: policy_refund
    patterns:
      - "refund policy"
      - "get a refund"
      - "money back"
      - "request refund"
      - "how to get refund"
    policy: refund
    response_key: refund_overview
    faq_ids: ["refund_1", "refund_2"]

  - intent: policy_refund_timeline
    patterns:
      - "how long for refund"
      - "when will I get refund"
      - "refund processing time"
    policy: refund
    response_key: refund_timeline
    faq_ids: ["refund_2"]

  - intent: policy_refund_vs_credit
    patterns:
      - "refund or credit"
      - "difference between refund and credit"
      - "account credit"
    policy: refund
    response_key: refund_vs_credit
    faq_ids: ["refund_3"]

  # Emergency Policy
  - intent: policy_emergency
    patterns:
      - "emergency service"
      - "urgent help"
      - "need someone now"
      - "same day service"
      - "emergency plumber"
      - "emergency electrician"
    policy: emergency
    response_key: emergency_overview
    faq_ids: ["emergency_1", "emergency_3"]
    priority: high

  - intent: policy_emergency_definition
    patterns:
      - "what is an emergency"
      - "what counts as emergency"
      - "is this an emergency"
    policy: emergency
    response_key: emergency_definition
    faq_ids: ["emergency_1"]

  - intent: policy_after_hours
    patterns:
      - "after hours fee"
      - "weekend service"
      - "night service"
      - "holiday service"
      - "after hours cost"
    policy: emergency
    response_key: after_hours_fee
    faq_ids: ["emergency_2"]

  # Reviews Policy
  - intent: policy_reviews
    patterns:
      - "review policy"
      - "ratings policy"
      - "how to review"
      - "leave a review"
      - "rate provider"
    policy: reviews
    response_key: reviews_overview
    faq_ids: ["review_1"]

  - intent: policy_review_update
    patterns:
      - "change my review"
      - "update review"
      - "edit rating"
      - "modify review"
    policy: reviews
    response_key: review_update
    faq_ids: ["review_2"]

  - intent: policy_review_report
    patterns:
      - "fake review"
      - "unfair review"
      - "report review"
      - "remove review"
    policy: reviews
    response_key: review_report
    faq_ids: ["review_3"]

  - intent: policy_review_visibility
    patterns:
      - "who sees my review"
      - "is review anonymous"
      - "can provider see rating"
    policy: reviews
    response_key: review_visibility
    faq_ids: ["review_4"]

  # Provider Quality Policy
  - intent: policy_quality
    patterns:
      - "quality standards"
      - "provider standards"
      - "what makes a good provider"
      - "provider requirements"
    policy: provider_quality
    response_key: quality_overview
    faq_ids: ["quality_1"]

  - intent: policy_verified_provider
    patterns:
      - "verified provider"
      - "what is verified"
      - "verification badge"
      - "background check"
    policy: provider_quality
    response_key: verified_info
    faq_ids: ["quality_2"]

  - intent: policy_preferred_provider
    patterns:
      - "preferred provider"
      - "what is preferred"
      - "top rated provider"
      - "best providers"
    policy: provider_quality
    response_key: preferred_info
    faq_ids: ["quality_3"]

  - intent: policy_quality_enforcement
    patterns:
      - "bad provider"
      - "provider punishment"
      - "what happens to bad providers"
      - "provider suspension"
    policy: provider_quality
    response_key: enforcement_info
    faq_ids: ["quality_4"]

# Response templates
response_templates:
  cancel_overview: |
    **Cancellation Policy**

    You can cancel a booking anytime. Refund depends on timing:
    - **24+ hours before**: Full refund
    - **12-24 hours before**: 50% refund
    - **Less than 12 hours**: No refund

    To cancel: Requests → Your Booking → Cancel

    Need to reschedule instead? That's free if done 24+ hours ahead.

  noshow_overview: |
    **No-Show Policy**

    If you're not home when the provider arrives, they'll wait 15 minutes and try to contact you. If no response, it's considered a no-show.

    Homeowner no-show: Full diagnostic fee + $25 trip fee
    Provider no-show: Full refund + $10 credit

    Always ensure someone 18+ is home during your appointment window.

  change_order_overview: |
    **Change Order Policy**

    If additional work is needed beyond the original estimate (more than 12% or $75 increase), the provider must submit a change order.

    You can:
    ✓ Approve - work continues at new price
    ✓ Decline - only original work is done
    ✓ Negotiate - message the provider

    You're never charged more than you approve.

  dispute_overview: |
    **Dispute Policy**

    File a dispute within 72 hours if work wasn't completed properly.

    How: Requests → Completed Job → Report a Problem

    Timeline:
    - Initial review: 24 hours
    - Investigation: 3-5 days
    - Resolution: Within 7 days

    Provider payment is held until resolved.

  refund_overview: |
    **Refund Policy**

    Refunds are processed within 3-5 business days to your original payment method.

    Full refunds for:
    - Cancellations 24+ hours ahead
    - Provider no-shows
    - Verified quality issues

    To request: Billing → Transaction → Request Refund

  emergency_overview: |
    **Emergency Service**

    ⚠️ For gas leaks, fire, or flooding: Call 911 first

    We prioritize:
    - No water/heat/cooling
    - Active leaks
    - Security issues
    - Only toilet broken

    After-hours fee (+35%) applies 6 PM - 8 AM, weekends, and holidays.

  reviews_overview: |
    **Reviews & Ratings**

    Rate your provider 1-5 stars after each job. Written reviews are optional but helpful.

    Guidelines:
    ✓ Be honest and specific
    ✓ Focus on the service
    ✗ No personal attacks
    ✗ No fake reviews

    You can update your review within 14 days.

  quality_overview: |
    **Provider Quality Standards**

    All providers must maintain:
    - 70%+ acceptance rate
    - <10% cancellation rate
    - 4.0+ star rating
    - <5% dispute rate

    Look for **Verified** (background checked) and **Preferred** (top performers) badges.

# Escalation rules
escalation_rules:
  - intent: policy_noshow_provider
    action: offer_human_handoff
    message: "I'm sorry your provider didn't show up. Would you like me to connect you with support to get this resolved quickly?"

  - intent: policy_emergency
    condition: contains_life_safety_keywords
    action: show_911_warning
    message: "If this is a life-threatening emergency (gas leak, fire, flooding), please call 911 immediately."

  - intent: policy_dispute
    condition: mentions_property_damage
    action: escalate_to_support
    priority: high
```

---

## Appendix: Policy Quick Reference Card

### For Support Agents

```
┌─────────────────────────────────────────────────────────────┐
│                POLICY QUICK REFERENCE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CANCELLATION                                                │
│  ─────────────                                               │
│  24+ hours: Full refund                                      │
│  12-24 hours: 50% refund                                     │
│  <12 hours: No refund                                        │
│  Max reschedules: 2 per booking                              │
│                                                              │
│  NO-SHOW                                                     │
│  ───────                                                     │
│  Homeowner: Diagnostic + $25 trip fee                        │
│  Provider: Full refund + $10 credit                          │
│  Wait time: 15 minutes                                       │
│                                                              │
│  CHANGE ORDER                                                │
│  ────────────                                                │
│  Required if: >12% OR >$75 increase                          │
│  Response window: 4 hours                                    │
│  No response = decline                                       │
│                                                              │
│  DISPUTE                                                     │
│  ───────                                                     │
│  Filing window: 72 hours                                     │
│  Initial review: 24 hours                                    │
│  Resolution: 5-7 business days                               │
│  Payment: Held during dispute                                │
│                                                              │
│  REFUND                                                      │
│  ──────                                                      │
│  Processing: 3-5 business days                               │
│  Credit vs Refund: >$25 can choose refund                    │
│                                                              │
│  EMERGENCY                                                   │
│  ─────────                                                   │
│  After-hours: +35%                                           │
│  Hours: 6 PM - 8 AM, weekends, holidays                      │
│  Response target: 4 hours                                    │
│                                                              │
│  REVIEWS                                                     │
│  ───────                                                     │
│  Update window: 14 days                                      │
│  Removal: Harassment, fake, privacy, retaliation             │
│                                                              │
│  PROVIDER ENFORCEMENT                                        │
│  ────────────────────                                        │
│  Level 1: Warning                                            │
│  Level 2: Probation (14 days)                                │
│  Level 3: Suspension (7 days)                                │
│  Level 4: Extended (30 days)                                 │
│  Level 5: Permanent removal                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

*End of Policies Pack*
