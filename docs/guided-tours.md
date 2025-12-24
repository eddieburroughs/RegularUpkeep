# RegularUpkeep In-App Guided Tours

**Version:** 1.0
**Last Updated:** December 2024
**Purpose:** Tooltip walkthrough scripts for new user onboarding and feature adoption

---

## Overview

These guided tours help users learn RegularUpkeep through contextual, step-by-step walkthroughs. Each tour is triggered at specific moments in the user journey and can be replayed from the Help menu.

### Design Principles

1. **Progressive Disclosure** — Show only what's relevant now
2. **Action-Oriented** — Every tooltip ends with a clear next step
3. **Interruptible** — Users can exit and resume later
4. **Contextual** — Tours trigger based on user state, not arbitrary timing

### Tour Trigger Logic

| Trigger | Description |
|---------|-------------|
| `first_login` | User's first authenticated session |
| `first_[action]` | First time user attempts specific action |
| `feature_unlock` | User gains access to new feature (tier upgrade, etc.) |
| `manual` | User clicks "Take a Tour" in Help menu |

### Technical Implementation Notes

- Tours use a tooltip library (recommend: `driver.js` or `react-joyride`)
- Tour progress persisted in `user_preferences.completed_tours[]`
- Analytics events fire at each step (see Instrumentation section)
- Tours pause if user navigates away; resume on return to relevant screen

---

## Homeowner Tours (1-2 Properties)

### Tour H1: Signup + Add Property

**Trigger:** `first_login` after registration
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| H1-01 | `/onboarding/welcome` | Welcome message area | Welcome to RegularUpkeep! | Let's set up your first home. We'll walk you through adding your property and key systems. Takes about 3 minutes. | Let's Go | User clicks action |
| H1-02 | `/onboarding/home-details` | Address input field | Add Your Home | Start with your property address. We'll use this to find local service providers. | Enter Address | Address field populated |
| H1-03 | `/onboarding/home-details` | Property type selector | Property Type | Select what kind of home this is. This helps us customize your maintenance plan. | Select Type | Property type selected |
| H1-04 | `/onboarding/home-details` | Year built field | When Was It Built? | Older homes have different maintenance needs. If you're not sure, an estimate is fine. | Continue | Year entered |
| H1-05 | `/onboarding/systems` | System category grid | Your Home Systems | Now let's add the important stuff: HVAC, water heater, appliances. Don't worry—you can add more later. | Add First System | At least 1 system added |
| H1-06 | `/onboarding/systems` | Photo upload button | Add a Photo | Snap a photo of the system label. Our AI can read model numbers and warranty info. | Upload Photo | Photo uploaded or skipped |
| H1-07 | `/onboarding/plan-preview` | Maintenance calendar preview | Your Maintenance Plan | Based on your systems, here's your personalized maintenance calendar. We'll send reminders when tasks are due. | Looks Good | User confirms |
| H1-08 | `/app` | Dashboard overview | You're All Set! | This is your home dashboard. You can add more properties, request service, or explore your maintenance calendar. | Explore Dashboard | Tour complete |

---

### Tour H2: Create First Maintenance Task

**Trigger:** User clicks calendar or "Add Task" for first time
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| H2-01 | `/app/calendar` | Add task button | Schedule Maintenance | Click here to add a maintenance task. These are recurring items like filter changes or seasonal checkups. | Add Task | Modal opens |
| H2-02 | `/app/calendar` (modal) | Task type selector | What Type of Task? | Choose from common maintenance items or create your own custom task. | Select Task Type | Task type selected |
| H2-03 | `/app/calendar` (modal) | System dropdown | Link to a System | Connect this task to one of your home systems. This helps track maintenance history. | Select System | System selected |
| H2-04 | `/app/calendar` (modal) | Frequency selector | How Often? | Set how frequently you need to do this. We'll create automatic reminders. | Set Schedule | Frequency set |
| H2-05 | `/app/calendar` (modal) | Save button | Save Your Task | All set! Your task will appear on the calendar and we'll remind you when it's due. | Save Task | Task created |
| H2-06 | `/app/calendar` | New task on calendar | Task Added! | Your new task is on the calendar. Click any task to mark it complete or request professional help. | Got It | Tour complete |

---

### Tour H3: Submit Service Request with Photos/Video

**Trigger:** User clicks "Request Service" for first time
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| H3-01 | `/app/requests/new` | Category selector or AI input | Describe Your Issue | Tell us what's wrong. You can type a description or let our AI analyze your photos. | Describe Issue | Category selected or text entered |
| H3-02 | `/app/requests/new` | Photo upload area | Add Photos | Photos help providers understand the problem and give accurate quotes. Add at least 2 for best results. | Upload Photos | At least 1 photo uploaded |
| H3-03 | `/app/requests/new` | Video upload option | Video Works Too | For complex issues, a 10-30 second video can show things photos miss. Optional but helpful! | Add Video (Optional) | Video added or skipped |
| H3-04 | `/app/requests/new` | AI analysis card | AI Analysis | Our AI is reviewing your photos to identify the issue. It may ask follow-up questions. | Continue | AI analysis complete |
| H3-05 | `/app/requests/new` | Safety warning (if shown) | Safety First | If we detect a safety issue like gas or electrical problems, we'll flag it for urgent handling. | I Understand | User acknowledges (if applicable) |
| H3-06 | `/app/requests/new` | Urgency selector | How Urgent? | Let us know your timeline. Urgent requests get faster matching but may have different pricing. | Select Urgency | Urgency selected |
| H3-07 | `/app/requests/new` | Diagnostic fee display | Diagnostic Fee | A diagnostic fee covers the provider's initial assessment. It's credited toward your final invoice if you proceed. | Continue | User acknowledges |
| H3-08 | `/app/requests/new` | Submit button | Submit Request | Ready to go! We'll match you with a qualified provider and notify you when they respond. | Submit Request | Request submitted |
| H3-09 | `/app/requests` | Request confirmation | Request Submitted! | You'll get a notification when a provider is matched. Check your messages for updates. | View Request | Tour complete |

---

### Tour H4: Booking Flow + Messaging

**Trigger:** User receives first estimate or booking notification
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| H4-01 | `/app/requests/[id]` | Estimate card | You Got an Estimate! | A provider has sent you an estimate. Review the scope of work and price before approving. | Review Estimate | Estimate card visible |
| H4-02 | `/app/requests/[id]` | Estimate details | Scope of Work | This shows exactly what the provider will do. If anything's unclear, use the message button to ask. | Review Details | User scrolls/views |
| H4-03 | `/app/requests/[id]` | Message button | Ask Questions | Not sure about something? Message the provider directly before approving. | Message Provider | Message thread opens |
| H4-04 | `/app/messages/[thread]` | Message input | Send a Message | Type your question here. Providers typically respond within a few hours. | Send Message | Message sent (optional) |
| H4-05 | `/app/requests/[id]` | Approve button | Approve & Schedule | When you're ready, approve the estimate. Your payment method will be authorized (not charged yet). | Approve Estimate | Estimate approved |
| H4-06 | `/app/requests/[id]` | Calendar/scheduling area | Pick a Time | Choose a date and time that works for you. The provider will confirm availability. | Select Time | Time selected |
| H4-07 | `/app/requests/[id]` | Confirmation | Booking Confirmed! | You're all set. You'll get reminders before your appointment. Message anytime if plans change. | Done | Tour complete |

---

### Tour H5: Inspection Walkthrough + Export Report

**Trigger:** User starts first inspection
**Estimated Time:** 4 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| H5-01 | `/app/inspection/new` | Property selector | Start an Inspection | Inspections document your home's condition room by room. Great for move-in/out or annual checkups. | Select Property | Property selected |
| H5-02 | `/app/inspection/new` | Room list | Room by Room | We'll go through each room. For each area, you'll take photos and rate the condition. | Start Inspection | First room selected |
| H5-03 | `/app/inspection/[id]` | Item checklist | Check Each Item | Go through the checklist for this room. Tap items to rate their condition. | Rate Items | At least 1 item rated |
| H5-04 | `/app/inspection/[id]` | Photo button | Add Photos | Take photos of each item—especially any issues. These become part of your permanent record. | Add Photo | Photo added |
| H5-05 | `/app/inspection/[id]` | Condition rating | Rate Condition | Mark as Good, Fair, or Needs Attention. Issues flagged here can become service requests. | Set Rating | Rating selected |
| H5-06 | `/app/inspection/[id]` | Notes field | Add Notes | Add any details about this item. These notes are included in your export. | Add Note (Optional) | Note added or skipped |
| H5-07 | `/app/inspection/[id]` | Next room button | Continue to Next Room | Move through each room until the inspection is complete. You can pause and resume anytime. | Next Room | Next room started |
| H5-08 | `/app/inspection/[id]` | Complete button | Finish Inspection | When all rooms are done, complete the inspection to generate your report. | Complete Inspection | Inspection completed |
| H5-09 | `/app/inspection/[id]` | Export button | Export Your Report | Download a PDF report for your records, insurance, or sharing with others. | Export PDF | PDF downloaded |
| H5-10 | `/app/inspection/[id]` | Success message | Inspection Complete! | Your inspection is saved to your home binder. You can view or export it anytime. | Done | Tour complete |

---

## Homeowner Tours (3+ Properties)

### Tour HM1: Multi-Property Setup

**Trigger:** User adds 3rd property
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| HM1-01 | `/app/properties` | Properties list | Managing Multiple Properties | You now have 3+ properties! Let's show you some tools for managing them efficiently. | Show Me | User clicks action |
| HM1-02 | `/app/properties` | Property naming area | Naming Convention | Tip: Use consistent names like "Austin-123Main" to keep properties organized at scale. | Got It | User acknowledges |
| HM1-03 | `/app/properties` | Filter/group controls | Filter & Group | Filter properties by location, status, or type. Group them for bulk actions. | Try Filtering | Filter applied (optional) |
| HM1-04 | `/app/properties/[id]` | Clone settings button | Clone Settings | Set up one property completely, then clone its systems and settings to similar properties. | Clone Settings | Clone action initiated (optional) |
| HM1-05 | `/app/properties/[id]/team` | Team section | Add Your Team | Invite property managers or maintenance staff. Assign them to specific properties. | Add Team Member | Team modal opens |
| HM1-06 | `/app/properties/[id]/team` | Role selector | Assign Roles | Managers can approve estimates. Tenants can submit requests for their unit. Viewers are read-only. | Select Role | Role selected |
| HM1-07 | `/app` | Bulk actions menu | Bulk Operations | From the dashboard, you can create maintenance requests across multiple properties at once. | Got It | Tour complete |

---

### Tour HM2: Delegation & Team Management

**Trigger:** User clicks Team section for first time
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| HM2-01 | `/app/properties/[id]/team` | Team list | Your Property Team | Add people who help manage this property. Each person gets their own login. | Invite Member | Invite modal opens |
| HM2-02 | `/app/properties/[id]/team` (modal) | Email input | Invite by Email | Enter their email address. They'll get an invitation to create their account. | Enter Email | Email entered |
| HM2-03 | `/app/properties/[id]/team` (modal) | Role selector | Choose Their Role | Manager: Full access. Tenant: Limited to their unit. Viewer: Read-only. | Select Role | Role selected |
| HM2-04 | `/app/properties/[id]/team` (modal) | Property access selector | Property Access | Choose which properties they can access. You can assign multiple properties at once. | Set Access | Properties selected |
| HM2-05 | `/app/properties/[id]/team` (modal) | Send button | Send Invitation | They'll receive an email with setup instructions. You can resend or revoke anytime. | Send Invite | Invitation sent |
| HM2-06 | `/app/properties/[id]/team` | Team list updated | Invitation Sent! | They'll appear here once they accept. Review access quarterly to keep your team current. | Done | Tour complete |

---

## Provider Tours

### Tour P1: Provider Profile Setup

**Trigger:** `first_login` after provider registration
**Estimated Time:** 4 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| P1-01 | `/provider/onboarding/signup` | Welcome message | Welcome, Provider! | Let's set up your business profile. A complete profile gets more bookings. Takes about 4 minutes. | Get Started | User clicks action |
| P1-02 | `/provider/onboarding/signup` | Business name field | Business Information | Enter your business name as it appears on your license. This is what customers see. | Enter Business Name | Name entered |
| P1-03 | `/provider/onboarding/signup` | License number field | License & Insurance | Add your contractor license number. We'll verify this for your Verified badge. | Enter License | License entered |
| P1-04 | `/provider/onboarding/signup` | Document upload | Upload Documents | Upload your license and insurance certificate. Required for verification. | Upload Documents | Documents uploaded |
| P1-05 | `/provider/onboarding/signup` | Service categories | Services You Offer | Select all service categories you provide. Customers search by these categories. | Select Services | At least 1 service selected |
| P1-06 | `/provider/onboarding/signup` | Service area map | Your Service Area | Draw your coverage area or enter zip codes. You'll only get jobs within this area. | Set Service Area | Area defined |
| P1-07 | `/provider/onboarding/signup` | Availability hours | Business Hours | Set your typical availability. Customers see this when scheduling. You can adjust for specific days. | Set Hours | Hours set |
| P1-08 | `/provider/onboarding/signup` | Stripe connect button | Connect Payments | Link your bank account to receive payments. Powered by Stripe—secure and fast. | Connect Stripe | Stripe connected |
| P1-09 | `/provider/jobs` | Dashboard | Profile Complete! | You're ready to receive jobs. We'll notify you when there's a match in your area. | View Dashboard | Tour complete |

---

### Tour P2: Accept/Decline Booking + Ask Questions

**Trigger:** Provider receives first job offer
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| P2-01 | `/provider/jobs` | Job notification/card | New Job Offer! | A homeowner needs your help. Review the details and respond within 15 minutes for best matching. | View Job | Job details open |
| P2-02 | `/provider/jobs/[id]` | Job brief section | AI Job Brief | Our AI summarizes the issue based on customer photos and description. Review before responding. | Read Brief | User views brief |
| P2-03 | `/provider/jobs/[id]` | Customer photos | Customer Photos | See exactly what you're dealing with. Swipe through all photos before deciding. | View Photos | Photos viewed |
| P2-04 | `/provider/jobs/[id]` | Message button | Need More Info? | Not sure about something? Message the customer to clarify before accepting. | Ask Question | Message thread opens |
| P2-05 | `/provider/jobs/[id]` | Accept button | Ready to Accept? | Accepting means you'll send an estimate within 24 hours. Decline if you can't take this job. | Accept Job | Job accepted |
| P2-06 | `/provider/jobs/[id]` | Confirmation | Job Accepted! | Great! Now send an estimate. Faster estimates = more won jobs. | Create Estimate | Tour continues to P3 or ends |

---

### Tour P3: Create/Send Estimate + Schedule

**Trigger:** Provider clicks "Create Estimate" for first time
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| P3-01 | `/provider/jobs/[id]/estimate` | Estimate form | Create Your Estimate | Break down the work into clear line items. Customers appreciate transparency. | Start Estimate | Form focused |
| P3-02 | `/provider/jobs/[id]/estimate` | AI draft button | AI Can Help | Click here for an AI-generated first draft based on the job brief. Review and edit before sending. | Use AI Draft | AI draft generated (optional) |
| P3-03 | `/provider/jobs/[id]/estimate` | Line items section | Add Line Items | List each task with its price. Be specific—"Replace faucet cartridge" is better than "Fix faucet". | Add Line Item | At least 1 item added |
| P3-04 | `/provider/jobs/[id]/estimate` | Scope description | Scope of Work | Describe exactly what you'll do and what's NOT included. This protects both you and the customer. | Describe Scope | Scope entered |
| P3-05 | `/provider/jobs/[id]/estimate` | Total field | Set Your Price | Your total should include labor and materials. The customer also pays a platform fee separately. | Enter Total | Total entered |
| P3-06 | `/provider/jobs/[id]/estimate` | Timeline field | Estimated Timeline | How long will the job take? Set realistic expectations. | Set Timeline | Timeline entered |
| P3-07 | `/provider/jobs/[id]/estimate` | Send button | Send Estimate | The customer will be notified. They can approve, ask questions, or request changes. | Send Estimate | Estimate sent |
| P3-08 | `/provider/jobs/[id]` | Pending status | Estimate Sent! | You'll be notified when they respond. Average approval time is 4-6 hours. | Got It | Tour complete |

---

### Tour P4: Job Documentation + Completion

**Trigger:** Provider starts first job (marks "On My Way" or "Started")
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| P4-01 | `/provider/jobs/[id]` | Start job button | Starting the Job | Before you begin work, document the current condition. This protects you in disputes. | Start Job | Job status updated |
| P4-02 | `/provider/jobs/[id]` | Before photos section | Before Photos (Required) | Take at least 2 clear photos of the area before starting. Show the problem clearly. | Add Before Photos | 2+ photos added |
| P4-03 | `/provider/jobs/[id]` | Protective notes field | Document Pre-Existing Issues | See damage that isn't part of this job? Note it here with photos. Protects you later. | Add Notes (If Needed) | Notes added or skipped |
| P4-04 | `/provider/jobs/[id]` | During photos section | During Photos | Take photos as you work. Shows your process and quality. Minimum 1 required. | Add Progress Photo | 1+ photo added |
| P4-05 | `/provider/jobs/[id]` | After photos section | After Photos (Required) | When work is complete, take at least 2 photos showing the finished result. | Add After Photos | 2+ photos added |
| P4-06 | `/provider/jobs/[id]` | Complete job button | Ready to Complete? | Make sure all photos are uploaded and work is finished before marking complete. | Complete Job | Completion flow starts |
| P4-07 | `/provider/jobs/[id]/complete` | Invoice amount | Create Invoice | Confirm the final amount. Must match your estimate unless there's an approved change order. | Confirm Amount | Amount confirmed |
| P4-08 | `/provider/jobs/[id]/complete` | Work summary | AI Work Summary | AI can generate a summary of work completed. Review and edit—especially any compliance notes. | Generate Summary | Summary generated |
| P4-09 | `/provider/jobs/[id]/complete` | Submit button | Submit Invoice | The customer has 24 hours to review, then 72 hours to dispute. You'll be paid after that window. | Submit Invoice | Invoice submitted |
| P4-10 | `/provider/jobs/[id]` | Success message | Job Complete! | Nice work! Payment will be transferred after the 72-hour dispute window. | Done | Tour complete |

---

### Tour P5: Request Review + Repeat Customer

**Trigger:** First job completed and paid
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| P5-01 | `/provider/jobs/[id]` | Review request section | Ask for a Review | Happy customers often forget to leave reviews. A quick reminder can help build your reputation. | Request Review | Review request sent |
| P5-02 | `/provider/jobs/[id]` | Customer info | Save This Customer | This customer is now in your network. They can request you directly for future jobs. | View Customer | Customer profile viewed |
| P5-03 | `/provider/profile` | Rating display | Your Rating Matters | Your overall rating affects how often you get matched. Aim for 4.5+ to qualify for Preferred status. | Got It | User acknowledges |
| P5-04 | `/provider/profile` | Tier progress | Path to Preferred | Complete 10 jobs with 4.5+ rating and <5% disputes to qualify for Preferred tier benefits. | View Benefits | Benefits viewed (optional) |
| P5-05 | `/provider/jobs` | Job list | Keep Going! | More completed jobs = higher visibility. We prioritize providers with fast response times. | View Jobs | Tour complete |

---

## Handyman Tours

### Tour HY1: Toggle Online + Set Availability

**Trigger:** `first_login` after handyman registration/onboarding
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| HY1-01 | `/handyman/jobs` | Welcome message | Welcome! | You're set up and ready to work. Let's show you how to go online and get jobs. | Let's Go | User clicks action |
| HY1-02 | `/handyman/jobs` | Status toggle (top of screen) | Your Status Toggle | This controls whether you receive job offers. Green = Online and accepting jobs. | Find Toggle | Toggle located |
| HY1-03 | `/handyman/jobs` | Status toggle | Go Online | Tap to go Online. You'll start receiving job notifications in your area. | Toggle Online | Status set to Online |
| HY1-04 | `/handyman/jobs` | Location permission prompt | Enable Location | We need your location to match you with nearby jobs. Enable it for best results. | Allow Location | Location enabled |
| HY1-05 | `/handyman/profile` | Availability hours section | Set Your Hours | Set when you're typically available. This helps us send jobs at the right times. | Set Hours | Hours configured |
| HY1-06 | `/handyman/jobs` | Waiting state | Ready for Jobs! | You're online and ready. Jobs appear here when there's a match. Respond quickly—within 15 minutes. | Got It | Tour complete |

---

### Tour HY2: Accept Job + Navigate

**Trigger:** Handyman receives first job notification
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| HY2-01 | `/handyman/jobs` | Job notification card | New Job! | You've been assigned a job. Review the details and accept within 15 minutes. | View Job | Job details open |
| HY2-02 | `/handyman/jobs/[id]` | Job details | Job Details | Review the customer name, address, and work description. Make sure you can handle it. | Review Details | Details viewed |
| HY2-03 | `/handyman/jobs/[id]` | Photos section | Customer Photos | Check the photos to understand what you're walking into. Come prepared with the right tools. | View Photos | Photos viewed |
| HY2-04 | `/handyman/jobs/[id]` | Accept/Decline buttons | Accept or Decline | Accept if you can do the job. Decline if you can't—it's better than canceling later. | Make Decision | Job accepted or declined |
| HY2-05 | `/handyman/jobs/[id]` | Navigate button | Navigate to Job | Tap to open maps and get directions. Arrive within your scheduled window. | Get Directions | Maps opened |
| HY2-06 | `/handyman/jobs/[id]` | On My Way button | Mark On My Way | Let the customer know you're coming. They'll get a notification. | On My Way | Status updated |

---

### Tour HY3: Start Job → Document → Complete

**Trigger:** Handyman arrives at first job
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| HY3-01 | `/handyman/jobs/[id]` | Arrive button | You've Arrived | Tap when you arrive. This timestamps your arrival for the customer. | Mark Arrived | Arrival marked |
| HY3-02 | `/handyman/jobs/[id]` | Before photos button | Take Before Photos | Before starting work, take at least 2 photos showing the current condition. Required! | Add Photos | 2+ photos added |
| HY3-03 | `/handyman/jobs/[id]` | Start work button | Start Working | Tap when you begin the actual work. This tracks your job duration. | Start Work | Work started |
| HY3-04 | `/handyman/jobs/[id]` | During photos section | Document Progress | Take at least 1 photo while working. Shows your process and protects you. | Add Photo | 1+ photo added |
| HY3-05 | `/handyman/jobs/[id]` | After photos section | Almost Done! | When work is complete, take at least 2 "after" photos showing the finished result. | Add After Photos | 2+ photos added |
| HY3-06 | `/handyman/jobs/[id]` | Complete button | Complete the Job | Review all your photos, then mark the job complete. Customer will be notified. | Complete Job | Job completed |
| HY3-07 | `/handyman/jobs/[id]` | Success message | Job Done! | Great work! Your completion is logged. Head to your next job or go offline. | Next Job | Tour complete |

---

### Tour HY4: Handling Scope Change + Messaging

**Trigger:** Manual (from Help menu) or when handyman first messages customer
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| HY4-01 | `/handyman/jobs/[id]` | Message button | Contact Customer | Need to ask the customer something? Use the message button to communicate. | Open Messages | Message thread opens |
| HY4-02 | `/handyman/messages/[thread]` | Message input | Send a Message | Keep messages professional. Never discuss pricing or additional work here. | Type Message | Message composed |
| HY4-03 | `/handyman/jobs/[id]` | Scope change warning | What If Scope Changes? | If the customer asks for more work, STOP. Contact your provider—don't do extra work without approval. | I Understand | User acknowledges |
| HY4-04 | `/handyman/jobs/[id]` | Provider contact info | Contact Your Provider | For scope changes, contact your provider company. They'll submit a change order if needed. | Got It | User acknowledges |
| HY4-05 | `/handyman/jobs/[id]` | Issue report button | Report Issues | Safety hazard? Can't complete? Use "Report Issue" to document and escalate. | Find Button | Button located |
| HY4-06 | `/handyman/jobs/[id]` | Summary | Stay in Touch | Keep customers informed, but route all scope/pricing discussions through your provider. | Done | Tour complete |

---

## Admin Tours

### Tour A1: Verify Provider + Move to Preferred

**Trigger:** Admin first accesses provider management
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| A1-01 | `/app/admin` | Admin dashboard | Welcome, Admin | Let's show you how to verify providers and manage their tier status. | Start Tour | User clicks action |
| A1-02 | `/app/admin/providers` | Provider list | Provider Management | This is your provider queue. Filter by status to find pending verifications. | View Providers | Provider list visible |
| A1-03 | `/app/admin/providers` | Status filter | Filter by Status | Click to filter: Pending Verification, Verified, Preferred, or Suspended. | Filter Pending | Filter applied |
| A1-04 | `/app/admin/providers/[id]` | Provider detail | Review Provider | Check their submitted documents: license, insurance, business info. | Open Provider | Provider details open |
| A1-05 | `/app/admin/providers/[id]` | Documents section | Verify Documents | Review each document. Click to expand. Check expiration dates and authenticity. | Review Documents | Documents reviewed |
| A1-06 | `/app/admin/providers/[id]` | External check link | External Verification | Verify license numbers against state database (opens external link). | Check License | External check initiated |
| A1-07 | `/app/admin/providers/[id]` | Approve button | Approve or Reject | Satisfied? Click Approve to grant Verified status. Or reject with a reason. | Approve Provider | Provider verified |
| A1-08 | `/app/admin/providers/[id]` | Tier upgrade section | Upgrade to Preferred | For qualified providers (4.5+ rating, 10+ jobs, <5% disputes), you can upgrade to Preferred. | View Qualifications | Qualifications displayed |
| A1-09 | `/app/admin/providers/[id]` | Upgrade button | Manual Override | Click to manually set Preferred status. Document the reason. | Upgrade Tier | Tier updated (optional) |
| A1-10 | `/app/admin/providers` | Return to list | Provider Updated! | Changes are saved. The provider is notified of their new status. | Done | Tour complete |

---

### Tour A2: Review Exceptions Queue

**Trigger:** Admin clicks "Open Items" or exceptions queue
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| A2-01 | `/app/admin` | Open items widget/tab | Open Items Queue | This shows items needing your attention: pending approvals, disputes, flagged bookings. | View Queue | Queue displayed |
| A2-02 | `/app/admin/open-items` [TBD — confirm screen exists] | Queue filters | Filter by Type | Filter by: Disputes, Verifications, Flagged Transactions, or Manual Reviews. | Apply Filter | Filter applied |
| A2-03 | `/app/admin/open-items` [TBD] | Priority indicators | Priority Levels | Red = urgent (SLA at risk). Yellow = approaching deadline. Green = routine. | Got It | User acknowledges |
| A2-04 | `/app/admin/open-items` [TBD] | Item detail | Review an Item | Click any item to see details. Each type has its own review workflow. | Open Item | Item details open |
| A2-05 | `/app/admin/open-items` [TBD] | Action buttons | Take Action | Process the item: approve, reject, escalate, or resolve. Add notes for audit trail. | Take Action | Action taken (optional) |
| A2-06 | `/app/admin` | Queue updated | Item Processed! | Completed items move to history. Your queue updates automatically. | Done | Tour complete |

---

### Tour A3: Dispute Handling + Refund Decision

**Trigger:** Admin opens first dispute
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| A3-01 | `/app/admin/disputes` | Dispute list | Dispute Queue | Active disputes are listed by age. Oldest first—resolve within 72 hours. | View Disputes | List visible |
| A3-02 | `/app/admin/disputes/[id]` | Dispute detail | Review Dispute | This shows the customer's complaint, provider response, and all evidence. | Open Dispute | Dispute details open |
| A3-03 | `/app/admin/disputes/[id]` | Timeline section | Dispute Timeline | See the full history: booking, messages, photos, invoice. Context matters. | Review Timeline | Timeline viewed |
| A3-04 | `/app/admin/disputes/[id]` | Customer evidence | Customer's Side | Read their complaint and view any photos they submitted as evidence. | Review Evidence | Customer evidence viewed |
| A3-05 | `/app/admin/disputes/[id]` | Provider evidence | Provider's Side | See the provider's response, their documentation, and before/after photos. | Review Evidence | Provider evidence viewed |
| A3-06 | `/app/admin/disputes/[id]` | Decision buttons | Make Your Decision | Choose: Customer Favor (full/partial refund), Provider Favor, or Split Decision. | Select Outcome | Outcome selected |
| A3-07 | `/app/admin/disputes/[id]` | Refund amount field | Set Refund Amount | For partial refunds, enter the amount. Explain your reasoning in the notes. | Enter Amount | Amount entered (if applicable) |
| A3-08 | `/app/admin/disputes/[id]` | Reasoning field | Document Your Decision | Write a clear explanation. Both parties receive this. Be professional and factual. | Add Reasoning | Reasoning entered |
| A3-09 | `/app/admin/disputes/[id]` | Resolve button | Finalize Resolution | This processes any refund and notifies both parties. Action cannot be undone. | Resolve Dispute | Dispute resolved |
| A3-10 | `/app/admin/disputes` | Success message | Dispute Resolved! | The customer and provider have been notified. Funds are processed accordingly. | Done | Tour complete |

---

### Tour A4: Error Center + Resolution Steps

**Trigger:** Admin accesses error center [TBD — confirm screen exists]
**Estimated Time:** 2 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| A4-01 | `/app/admin/errors` [TBD] | Error log | Error Center | This logs system errors and customer-reported issues with error codes. | View Errors | Error list visible |
| A4-02 | `/app/admin/errors` [TBD] | Error categories | Filter by Category | Filter by: Payment, Auth, Booking, AI, Integration, or Other. | Apply Filter | Filter applied |
| A4-03 | `/app/admin/errors/[id]` [TBD] | Error detail | Error Details | See the error code, affected user, timestamp, and stack trace (if available). | Open Error | Error details open |
| A4-04 | `/app/admin/errors/[id]` [TBD] | Resolution steps section | Document Resolution | If you solve this, document the steps so others can resolve similar issues. | Add Steps | Resolution input visible |
| A4-05 | `/app/admin/errors/[id]` [TBD] | Link to KB | Link to Knowledge Base | Connect this resolution to a KB article for the support chatbot. | Link KB (Optional) | Link created or skipped |
| A4-06 | `/app/admin/errors/[id]` [TBD] | Mark resolved button | Mark Resolved | Once documented, mark the error as resolved. It moves to history. | Resolve Error | Error resolved |
| A4-07 | `/app/admin/errors` [TBD] | Success | Error Documented! | Your resolution steps help the team handle similar issues faster. | Done | Tour complete |

---

### Tour A5: KB Update Workflow for Chatbot

**Trigger:** Admin accesses KB management [TBD — confirm screen exists]
**Estimated Time:** 3 minutes

| Step | Screen | Selector Hint | Title | Body | Action Label | Success Criteria |
|------|--------|---------------|-------|------|--------------|------------------|
| A5-01 | `/app/admin/knowledge-base` [TBD] | KB dashboard | Knowledge Base | This manages content for the support chatbot. Updates here improve AI responses. | View KB | KB list visible |
| A5-02 | `/app/admin/knowledge-base` [TBD] | KB categories | Content Categories | Content is organized by role (Homeowner, Provider, etc.) and topic. | Browse Categories | Categories visible |
| A5-03 | `/app/admin/knowledge-base/new` [TBD] | New article form | Add KB Article | Create a new knowledge chunk. Keep it focused on one topic. | Create Article | Form displayed |
| A5-04 | `/app/admin/knowledge-base/new` [TBD] | Role selector | Set Target Role | Choose which role this content applies to. Affects chatbot routing. | Select Role | Role selected |
| A5-05 | `/app/admin/knowledge-base/new` [TBD] | Content fields | Write Content | Title should be a question. Body should be a clear, concise answer. | Enter Content | Content entered |
| A5-06 | `/app/admin/knowledge-base/new` [TBD] | Intent tags | Add Intent Tags | Tag with related intents so the chatbot knows when to surface this. | Add Tags | Tags added |
| A5-07 | `/app/admin/knowledge-base/new` [TBD] | Preview button | Preview Response | See how this will appear in the chatbot before publishing. | Preview | Preview displayed |
| A5-08 | `/app/admin/knowledge-base/new` [TBD] | Publish button | Publish to Chatbot | Publishing makes this immediately available to the support bot. | Publish | Article published |
| A5-09 | `/app/admin/knowledge-base` [TBD] | Success message | KB Updated! | The chatbot now includes your new content. Monitor chat logs to verify it's working. | Done | Tour complete |

---

## JSON Export

```json
{
  "version": "1.0",
  "generated": "2024-12",
  "roles": {
    "homeowner": {
      "tours": [
        {
          "tour_id": "H1",
          "tour_name": "Signup + Add Property",
          "trigger": "first_login",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "H1-01",
              "screen_name": "/onboarding/welcome",
              "selector_hint": "Welcome message area",
              "tooltip_title": "Welcome to RegularUpkeep!",
              "tooltip_body": "Let's set up your first home. We'll walk you through adding your property and key systems. Takes about 3 minutes.",
              "primary_action_label": "Let's Go",
              "success_criteria": "User clicks action"
            },
            {
              "step_id": "H1-02",
              "screen_name": "/onboarding/home-details",
              "selector_hint": "Address input field",
              "tooltip_title": "Add Your Home",
              "tooltip_body": "Start with your property address. We'll use this to find local service providers.",
              "primary_action_label": "Enter Address",
              "success_criteria": "Address field populated"
            },
            {
              "step_id": "H1-03",
              "screen_name": "/onboarding/home-details",
              "selector_hint": "Property type selector",
              "tooltip_title": "Property Type",
              "tooltip_body": "Select what kind of home this is. This helps us customize your maintenance plan.",
              "primary_action_label": "Select Type",
              "success_criteria": "Property type selected"
            },
            {
              "step_id": "H1-04",
              "screen_name": "/onboarding/home-details",
              "selector_hint": "Year built field",
              "tooltip_title": "When Was It Built?",
              "tooltip_body": "Older homes have different maintenance needs. If you're not sure, an estimate is fine.",
              "primary_action_label": "Continue",
              "success_criteria": "Year entered"
            },
            {
              "step_id": "H1-05",
              "screen_name": "/onboarding/systems",
              "selector_hint": "System category grid",
              "tooltip_title": "Your Home Systems",
              "tooltip_body": "Now let's add the important stuff: HVAC, water heater, appliances. Don't worry—you can add more later.",
              "primary_action_label": "Add First System",
              "success_criteria": "At least 1 system added"
            },
            {
              "step_id": "H1-06",
              "screen_name": "/onboarding/systems",
              "selector_hint": "Photo upload button",
              "tooltip_title": "Add a Photo",
              "tooltip_body": "Snap a photo of the system label. Our AI can read model numbers and warranty info.",
              "primary_action_label": "Upload Photo",
              "success_criteria": "Photo uploaded or skipped"
            },
            {
              "step_id": "H1-07",
              "screen_name": "/onboarding/plan-preview",
              "selector_hint": "Maintenance calendar preview",
              "tooltip_title": "Your Maintenance Plan",
              "tooltip_body": "Based on your systems, here's your personalized maintenance calendar. We'll send reminders when tasks are due.",
              "primary_action_label": "Looks Good",
              "success_criteria": "User confirms"
            },
            {
              "step_id": "H1-08",
              "screen_name": "/app",
              "selector_hint": "Dashboard overview",
              "tooltip_title": "You're All Set!",
              "tooltip_body": "This is your home dashboard. You can add more properties, request service, or explore your maintenance calendar.",
              "primary_action_label": "Explore Dashboard",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "H2",
          "tour_name": "Create First Maintenance Task",
          "trigger": "first_calendar_interaction",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "H2-01",
              "screen_name": "/app/calendar",
              "selector_hint": "Add task button",
              "tooltip_title": "Schedule Maintenance",
              "tooltip_body": "Click here to add a maintenance task. These are recurring items like filter changes or seasonal checkups.",
              "primary_action_label": "Add Task",
              "success_criteria": "Modal opens"
            },
            {
              "step_id": "H2-02",
              "screen_name": "/app/calendar (modal)",
              "selector_hint": "Task type selector",
              "tooltip_title": "What Type of Task?",
              "tooltip_body": "Choose from common maintenance items or create your own custom task.",
              "primary_action_label": "Select Task Type",
              "success_criteria": "Task type selected"
            },
            {
              "step_id": "H2-03",
              "screen_name": "/app/calendar (modal)",
              "selector_hint": "System dropdown",
              "tooltip_title": "Link to a System",
              "tooltip_body": "Connect this task to one of your home systems. This helps track maintenance history.",
              "primary_action_label": "Select System",
              "success_criteria": "System selected"
            },
            {
              "step_id": "H2-04",
              "screen_name": "/app/calendar (modal)",
              "selector_hint": "Frequency selector",
              "tooltip_title": "How Often?",
              "tooltip_body": "Set how frequently you need to do this. We'll create automatic reminders.",
              "primary_action_label": "Set Schedule",
              "success_criteria": "Frequency set"
            },
            {
              "step_id": "H2-05",
              "screen_name": "/app/calendar (modal)",
              "selector_hint": "Save button",
              "tooltip_title": "Save Your Task",
              "tooltip_body": "All set! Your task will appear on the calendar and we'll remind you when it's due.",
              "primary_action_label": "Save Task",
              "success_criteria": "Task created"
            },
            {
              "step_id": "H2-06",
              "screen_name": "/app/calendar",
              "selector_hint": "New task on calendar",
              "tooltip_title": "Task Added!",
              "tooltip_body": "Your new task is on the calendar. Click any task to mark it complete or request professional help.",
              "primary_action_label": "Got It",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "H3",
          "tour_name": "Submit Service Request with Photos/Video",
          "trigger": "first_service_request",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "H3-01",
              "screen_name": "/app/requests/new",
              "selector_hint": "Category selector or AI input",
              "tooltip_title": "Describe Your Issue",
              "tooltip_body": "Tell us what's wrong. You can type a description or let our AI analyze your photos.",
              "primary_action_label": "Describe Issue",
              "success_criteria": "Category selected or text entered"
            },
            {
              "step_id": "H3-02",
              "screen_name": "/app/requests/new",
              "selector_hint": "Photo upload area",
              "tooltip_title": "Add Photos",
              "tooltip_body": "Photos help providers understand the problem and give accurate quotes. Add at least 2 for best results.",
              "primary_action_label": "Upload Photos",
              "success_criteria": "At least 1 photo uploaded"
            },
            {
              "step_id": "H3-03",
              "screen_name": "/app/requests/new",
              "selector_hint": "Video upload option",
              "tooltip_title": "Video Works Too",
              "tooltip_body": "For complex issues, a 10-30 second video can show things photos miss. Optional but helpful!",
              "primary_action_label": "Add Video (Optional)",
              "success_criteria": "Video added or skipped"
            },
            {
              "step_id": "H3-04",
              "screen_name": "/app/requests/new",
              "selector_hint": "AI analysis card",
              "tooltip_title": "AI Analysis",
              "tooltip_body": "Our AI is reviewing your photos to identify the issue. It may ask follow-up questions.",
              "primary_action_label": "Continue",
              "success_criteria": "AI analysis complete"
            },
            {
              "step_id": "H3-05",
              "screen_name": "/app/requests/new",
              "selector_hint": "Safety warning (if shown)",
              "tooltip_title": "Safety First",
              "tooltip_body": "If we detect a safety issue like gas or electrical problems, we'll flag it for urgent handling.",
              "primary_action_label": "I Understand",
              "success_criteria": "User acknowledges (if applicable)"
            },
            {
              "step_id": "H3-06",
              "screen_name": "/app/requests/new",
              "selector_hint": "Urgency selector",
              "tooltip_title": "How Urgent?",
              "tooltip_body": "Let us know your timeline. Urgent requests get faster matching but may have different pricing.",
              "primary_action_label": "Select Urgency",
              "success_criteria": "Urgency selected"
            },
            {
              "step_id": "H3-07",
              "screen_name": "/app/requests/new",
              "selector_hint": "Diagnostic fee display",
              "tooltip_title": "Diagnostic Fee",
              "tooltip_body": "A diagnostic fee covers the provider's initial assessment. It's credited toward your final invoice if you proceed.",
              "primary_action_label": "Continue",
              "success_criteria": "User acknowledges"
            },
            {
              "step_id": "H3-08",
              "screen_name": "/app/requests/new",
              "selector_hint": "Submit button",
              "tooltip_title": "Submit Request",
              "tooltip_body": "Ready to go! We'll match you with a qualified provider and notify you when they respond.",
              "primary_action_label": "Submit Request",
              "success_criteria": "Request submitted"
            },
            {
              "step_id": "H3-09",
              "screen_name": "/app/requests",
              "selector_hint": "Request confirmation",
              "tooltip_title": "Request Submitted!",
              "tooltip_body": "You'll get a notification when a provider is matched. Check your messages for updates.",
              "primary_action_label": "View Request",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "H4",
          "tour_name": "Booking Flow + Messaging",
          "trigger": "first_estimate_received",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "H4-01",
              "screen_name": "/app/requests/[id]",
              "selector_hint": "Estimate card",
              "tooltip_title": "You Got an Estimate!",
              "tooltip_body": "A provider has sent you an estimate. Review the scope of work and price before approving.",
              "primary_action_label": "Review Estimate",
              "success_criteria": "Estimate card visible"
            },
            {
              "step_id": "H4-02",
              "screen_name": "/app/requests/[id]",
              "selector_hint": "Estimate details",
              "tooltip_title": "Scope of Work",
              "tooltip_body": "This shows exactly what the provider will do. If anything's unclear, use the message button to ask.",
              "primary_action_label": "Review Details",
              "success_criteria": "User scrolls/views"
            },
            {
              "step_id": "H4-03",
              "screen_name": "/app/requests/[id]",
              "selector_hint": "Message button",
              "tooltip_title": "Ask Questions",
              "tooltip_body": "Not sure about something? Message the provider directly before approving.",
              "primary_action_label": "Message Provider",
              "success_criteria": "Message thread opens"
            },
            {
              "step_id": "H4-04",
              "screen_name": "/app/messages/[thread]",
              "selector_hint": "Message input",
              "tooltip_title": "Send a Message",
              "tooltip_body": "Type your question here. Providers typically respond within a few hours.",
              "primary_action_label": "Send Message",
              "success_criteria": "Message sent (optional)"
            },
            {
              "step_id": "H4-05",
              "screen_name": "/app/requests/[id]",
              "selector_hint": "Approve button",
              "tooltip_title": "Approve & Schedule",
              "tooltip_body": "When you're ready, approve the estimate. Your payment method will be authorized (not charged yet).",
              "primary_action_label": "Approve Estimate",
              "success_criteria": "Estimate approved"
            },
            {
              "step_id": "H4-06",
              "screen_name": "/app/requests/[id]",
              "selector_hint": "Calendar/scheduling area",
              "tooltip_title": "Pick a Time",
              "tooltip_body": "Choose a date and time that works for you. The provider will confirm availability.",
              "primary_action_label": "Select Time",
              "success_criteria": "Time selected"
            },
            {
              "step_id": "H4-07",
              "screen_name": "/app/requests/[id]",
              "selector_hint": "Confirmation",
              "tooltip_title": "Booking Confirmed!",
              "tooltip_body": "You're all set. You'll get reminders before your appointment. Message anytime if plans change.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "H5",
          "tour_name": "Inspection Walkthrough + Export Report",
          "trigger": "first_inspection_start",
          "estimated_time_minutes": 4,
          "steps": [
            {
              "step_id": "H5-01",
              "screen_name": "/app/inspection/new",
              "selector_hint": "Property selector",
              "tooltip_title": "Start an Inspection",
              "tooltip_body": "Inspections document your home's condition room by room. Great for move-in/out or annual checkups.",
              "primary_action_label": "Select Property",
              "success_criteria": "Property selected"
            },
            {
              "step_id": "H5-02",
              "screen_name": "/app/inspection/new",
              "selector_hint": "Room list",
              "tooltip_title": "Room by Room",
              "tooltip_body": "We'll go through each room. For each area, you'll take photos and rate the condition.",
              "primary_action_label": "Start Inspection",
              "success_criteria": "First room selected"
            },
            {
              "step_id": "H5-03",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Item checklist",
              "tooltip_title": "Check Each Item",
              "tooltip_body": "Go through the checklist for this room. Tap items to rate their condition.",
              "primary_action_label": "Rate Items",
              "success_criteria": "At least 1 item rated"
            },
            {
              "step_id": "H5-04",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Photo button",
              "tooltip_title": "Add Photos",
              "tooltip_body": "Take photos of each item—especially any issues. These become part of your permanent record.",
              "primary_action_label": "Add Photo",
              "success_criteria": "Photo added"
            },
            {
              "step_id": "H5-05",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Condition rating",
              "tooltip_title": "Rate Condition",
              "tooltip_body": "Mark as Good, Fair, or Needs Attention. Issues flagged here can become service requests.",
              "primary_action_label": "Set Rating",
              "success_criteria": "Rating selected"
            },
            {
              "step_id": "H5-06",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Notes field",
              "tooltip_title": "Add Notes",
              "tooltip_body": "Add any details about this item. These notes are included in your export.",
              "primary_action_label": "Add Note (Optional)",
              "success_criteria": "Note added or skipped"
            },
            {
              "step_id": "H5-07",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Next room button",
              "tooltip_title": "Continue to Next Room",
              "tooltip_body": "Move through each room until the inspection is complete. You can pause and resume anytime.",
              "primary_action_label": "Next Room",
              "success_criteria": "Next room started"
            },
            {
              "step_id": "H5-08",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Complete button",
              "tooltip_title": "Finish Inspection",
              "tooltip_body": "When all rooms are done, complete the inspection to generate your report.",
              "primary_action_label": "Complete Inspection",
              "success_criteria": "Inspection completed"
            },
            {
              "step_id": "H5-09",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Export button",
              "tooltip_title": "Export Your Report",
              "tooltip_body": "Download a PDF report for your records, insurance, or sharing with others.",
              "primary_action_label": "Export PDF",
              "success_criteria": "PDF downloaded"
            },
            {
              "step_id": "H5-10",
              "screen_name": "/app/inspection/[id]",
              "selector_hint": "Success message",
              "tooltip_title": "Inspection Complete!",
              "tooltip_body": "Your inspection is saved to your home binder. You can view or export it anytime.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        }
      ]
    },
    "homeowner_multi": {
      "tours": [
        {
          "tour_id": "HM1",
          "tour_name": "Multi-Property Setup",
          "trigger": "third_property_added",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "HM1-01",
              "screen_name": "/app/properties",
              "selector_hint": "Properties list",
              "tooltip_title": "Managing Multiple Properties",
              "tooltip_body": "You now have 3+ properties! Let's show you some tools for managing them efficiently.",
              "primary_action_label": "Show Me",
              "success_criteria": "User clicks action"
            },
            {
              "step_id": "HM1-02",
              "screen_name": "/app/properties",
              "selector_hint": "Property naming area",
              "tooltip_title": "Naming Convention",
              "tooltip_body": "Tip: Use consistent names like \"Austin-123Main\" to keep properties organized at scale.",
              "primary_action_label": "Got It",
              "success_criteria": "User acknowledges"
            },
            {
              "step_id": "HM1-03",
              "screen_name": "/app/properties",
              "selector_hint": "Filter/group controls",
              "tooltip_title": "Filter & Group",
              "tooltip_body": "Filter properties by location, status, or type. Group them for bulk actions.",
              "primary_action_label": "Try Filtering",
              "success_criteria": "Filter applied (optional)"
            },
            {
              "step_id": "HM1-04",
              "screen_name": "/app/properties/[id]",
              "selector_hint": "Clone settings button",
              "tooltip_title": "Clone Settings",
              "tooltip_body": "Set up one property completely, then clone its systems and settings to similar properties.",
              "primary_action_label": "Clone Settings",
              "success_criteria": "Clone action initiated (optional)"
            },
            {
              "step_id": "HM1-05",
              "screen_name": "/app/properties/[id]/team",
              "selector_hint": "Team section",
              "tooltip_title": "Add Your Team",
              "tooltip_body": "Invite property managers or maintenance staff. Assign them to specific properties.",
              "primary_action_label": "Add Team Member",
              "success_criteria": "Team modal opens"
            },
            {
              "step_id": "HM1-06",
              "screen_name": "/app/properties/[id]/team",
              "selector_hint": "Role selector",
              "tooltip_title": "Assign Roles",
              "tooltip_body": "Managers can approve estimates. Tenants can submit requests for their unit. Viewers are read-only.",
              "primary_action_label": "Select Role",
              "success_criteria": "Role selected"
            },
            {
              "step_id": "HM1-07",
              "screen_name": "/app",
              "selector_hint": "Bulk actions menu",
              "tooltip_title": "Bulk Operations",
              "tooltip_body": "From the dashboard, you can create maintenance requests across multiple properties at once.",
              "primary_action_label": "Got It",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "HM2",
          "tour_name": "Delegation & Team Management",
          "trigger": "first_team_access",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "HM2-01",
              "screen_name": "/app/properties/[id]/team",
              "selector_hint": "Team list",
              "tooltip_title": "Your Property Team",
              "tooltip_body": "Add people who help manage this property. Each person gets their own login.",
              "primary_action_label": "Invite Member",
              "success_criteria": "Invite modal opens"
            },
            {
              "step_id": "HM2-02",
              "screen_name": "/app/properties/[id]/team (modal)",
              "selector_hint": "Email input",
              "tooltip_title": "Invite by Email",
              "tooltip_body": "Enter their email address. They'll get an invitation to create their account.",
              "primary_action_label": "Enter Email",
              "success_criteria": "Email entered"
            },
            {
              "step_id": "HM2-03",
              "screen_name": "/app/properties/[id]/team (modal)",
              "selector_hint": "Role selector",
              "tooltip_title": "Choose Their Role",
              "tooltip_body": "Manager: Full access. Tenant: Limited to their unit. Viewer: Read-only.",
              "primary_action_label": "Select Role",
              "success_criteria": "Role selected"
            },
            {
              "step_id": "HM2-04",
              "screen_name": "/app/properties/[id]/team (modal)",
              "selector_hint": "Property access selector",
              "tooltip_title": "Property Access",
              "tooltip_body": "Choose which properties they can access. You can assign multiple properties at once.",
              "primary_action_label": "Set Access",
              "success_criteria": "Properties selected"
            },
            {
              "step_id": "HM2-05",
              "screen_name": "/app/properties/[id]/team (modal)",
              "selector_hint": "Send button",
              "tooltip_title": "Send Invitation",
              "tooltip_body": "They'll receive an email with setup instructions. You can resend or revoke anytime.",
              "primary_action_label": "Send Invite",
              "success_criteria": "Invitation sent"
            },
            {
              "step_id": "HM2-06",
              "screen_name": "/app/properties/[id]/team",
              "selector_hint": "Team list updated",
              "tooltip_title": "Invitation Sent!",
              "tooltip_body": "They'll appear here once they accept. Review access quarterly to keep your team current.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        }
      ]
    },
    "provider": {
      "tours": [
        {
          "tour_id": "P1",
          "tour_name": "Provider Profile Setup",
          "trigger": "first_login",
          "estimated_time_minutes": 4,
          "steps": [
            {
              "step_id": "P1-01",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "Welcome message",
              "tooltip_title": "Welcome, Provider!",
              "tooltip_body": "Let's set up your business profile. A complete profile gets more bookings. Takes about 4 minutes.",
              "primary_action_label": "Get Started",
              "success_criteria": "User clicks action"
            },
            {
              "step_id": "P1-02",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "Business name field",
              "tooltip_title": "Business Information",
              "tooltip_body": "Enter your business name as it appears on your license. This is what customers see.",
              "primary_action_label": "Enter Business Name",
              "success_criteria": "Name entered"
            },
            {
              "step_id": "P1-03",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "License number field",
              "tooltip_title": "License & Insurance",
              "tooltip_body": "Add your contractor license number. We'll verify this for your Verified badge.",
              "primary_action_label": "Enter License",
              "success_criteria": "License entered"
            },
            {
              "step_id": "P1-04",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "Document upload",
              "tooltip_title": "Upload Documents",
              "tooltip_body": "Upload your license and insurance certificate. Required for verification.",
              "primary_action_label": "Upload Documents",
              "success_criteria": "Documents uploaded"
            },
            {
              "step_id": "P1-05",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "Service categories",
              "tooltip_title": "Services You Offer",
              "tooltip_body": "Select all service categories you provide. Customers search by these categories.",
              "primary_action_label": "Select Services",
              "success_criteria": "At least 1 service selected"
            },
            {
              "step_id": "P1-06",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "Service area map",
              "tooltip_title": "Your Service Area",
              "tooltip_body": "Draw your coverage area or enter zip codes. You'll only get jobs within this area.",
              "primary_action_label": "Set Service Area",
              "success_criteria": "Area defined"
            },
            {
              "step_id": "P1-07",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "Availability hours",
              "tooltip_title": "Business Hours",
              "tooltip_body": "Set your typical availability. Customers see this when scheduling. You can adjust for specific days.",
              "primary_action_label": "Set Hours",
              "success_criteria": "Hours set"
            },
            {
              "step_id": "P1-08",
              "screen_name": "/provider/onboarding/signup",
              "selector_hint": "Stripe connect button",
              "tooltip_title": "Connect Payments",
              "tooltip_body": "Link your bank account to receive payments. Powered by Stripe—secure and fast.",
              "primary_action_label": "Connect Stripe",
              "success_criteria": "Stripe connected"
            },
            {
              "step_id": "P1-09",
              "screen_name": "/provider/jobs",
              "selector_hint": "Dashboard",
              "tooltip_title": "Profile Complete!",
              "tooltip_body": "You're ready to receive jobs. We'll notify you when there's a match in your area.",
              "primary_action_label": "View Dashboard",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "P2",
          "tour_name": "Accept/Decline Booking + Ask Questions",
          "trigger": "first_job_offer",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "P2-01",
              "screen_name": "/provider/jobs",
              "selector_hint": "Job notification/card",
              "tooltip_title": "New Job Offer!",
              "tooltip_body": "A homeowner needs your help. Review the details and respond within 15 minutes for best matching.",
              "primary_action_label": "View Job",
              "success_criteria": "Job details open"
            },
            {
              "step_id": "P2-02",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Job brief section",
              "tooltip_title": "AI Job Brief",
              "tooltip_body": "Our AI summarizes the issue based on customer photos and description. Review before responding.",
              "primary_action_label": "Read Brief",
              "success_criteria": "User views brief"
            },
            {
              "step_id": "P2-03",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Customer photos",
              "tooltip_title": "Customer Photos",
              "tooltip_body": "See exactly what you're dealing with. Swipe through all photos before deciding.",
              "primary_action_label": "View Photos",
              "success_criteria": "Photos viewed"
            },
            {
              "step_id": "P2-04",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Message button",
              "tooltip_title": "Need More Info?",
              "tooltip_body": "Not sure about something? Message the customer to clarify before accepting.",
              "primary_action_label": "Ask Question",
              "success_criteria": "Message thread opens"
            },
            {
              "step_id": "P2-05",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Accept button",
              "tooltip_title": "Ready to Accept?",
              "tooltip_body": "Accepting means you'll send an estimate within 24 hours. Decline if you can't take this job.",
              "primary_action_label": "Accept Job",
              "success_criteria": "Job accepted"
            },
            {
              "step_id": "P2-06",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Confirmation",
              "tooltip_title": "Job Accepted!",
              "tooltip_body": "Great! Now send an estimate. Faster estimates = more won jobs.",
              "primary_action_label": "Create Estimate",
              "success_criteria": "Tour continues to P3 or ends"
            }
          ]
        },
        {
          "tour_id": "P3",
          "tour_name": "Create/Send Estimate + Schedule",
          "trigger": "first_estimate_creation",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "P3-01",
              "screen_name": "/provider/jobs/[id]/estimate",
              "selector_hint": "Estimate form",
              "tooltip_title": "Create Your Estimate",
              "tooltip_body": "Break down the work into clear line items. Customers appreciate transparency.",
              "primary_action_label": "Start Estimate",
              "success_criteria": "Form focused"
            },
            {
              "step_id": "P3-02",
              "screen_name": "/provider/jobs/[id]/estimate",
              "selector_hint": "AI draft button",
              "tooltip_title": "AI Can Help",
              "tooltip_body": "Click here for an AI-generated first draft based on the job brief. Review and edit before sending.",
              "primary_action_label": "Use AI Draft",
              "success_criteria": "AI draft generated (optional)"
            },
            {
              "step_id": "P3-03",
              "screen_name": "/provider/jobs/[id]/estimate",
              "selector_hint": "Line items section",
              "tooltip_title": "Add Line Items",
              "tooltip_body": "List each task with its price. Be specific—\"Replace faucet cartridge\" is better than \"Fix faucet\".",
              "primary_action_label": "Add Line Item",
              "success_criteria": "At least 1 item added"
            },
            {
              "step_id": "P3-04",
              "screen_name": "/provider/jobs/[id]/estimate",
              "selector_hint": "Scope description",
              "tooltip_title": "Scope of Work",
              "tooltip_body": "Describe exactly what you'll do and what's NOT included. This protects both you and the customer.",
              "primary_action_label": "Describe Scope",
              "success_criteria": "Scope entered"
            },
            {
              "step_id": "P3-05",
              "screen_name": "/provider/jobs/[id]/estimate",
              "selector_hint": "Total field",
              "tooltip_title": "Set Your Price",
              "tooltip_body": "Your total should include labor and materials. The customer also pays a platform fee separately.",
              "primary_action_label": "Enter Total",
              "success_criteria": "Total entered"
            },
            {
              "step_id": "P3-06",
              "screen_name": "/provider/jobs/[id]/estimate",
              "selector_hint": "Timeline field",
              "tooltip_title": "Estimated Timeline",
              "tooltip_body": "How long will the job take? Set realistic expectations.",
              "primary_action_label": "Set Timeline",
              "success_criteria": "Timeline entered"
            },
            {
              "step_id": "P3-07",
              "screen_name": "/provider/jobs/[id]/estimate",
              "selector_hint": "Send button",
              "tooltip_title": "Send Estimate",
              "tooltip_body": "The customer will be notified. They can approve, ask questions, or request changes.",
              "primary_action_label": "Send Estimate",
              "success_criteria": "Estimate sent"
            },
            {
              "step_id": "P3-08",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Pending status",
              "tooltip_title": "Estimate Sent!",
              "tooltip_body": "You'll be notified when they respond. Average approval time is 4-6 hours.",
              "primary_action_label": "Got It",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "P4",
          "tour_name": "Job Documentation + Completion",
          "trigger": "first_job_start",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "P4-01",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Start job button",
              "tooltip_title": "Starting the Job",
              "tooltip_body": "Before you begin work, document the current condition. This protects you in disputes.",
              "primary_action_label": "Start Job",
              "success_criteria": "Job status updated"
            },
            {
              "step_id": "P4-02",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Before photos section",
              "tooltip_title": "Before Photos (Required)",
              "tooltip_body": "Take at least 2 clear photos of the area before starting. Show the problem clearly.",
              "primary_action_label": "Add Before Photos",
              "success_criteria": "2+ photos added"
            },
            {
              "step_id": "P4-03",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Protective notes field",
              "tooltip_title": "Document Pre-Existing Issues",
              "tooltip_body": "See damage that isn't part of this job? Note it here with photos. Protects you later.",
              "primary_action_label": "Add Notes (If Needed)",
              "success_criteria": "Notes added or skipped"
            },
            {
              "step_id": "P4-04",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "During photos section",
              "tooltip_title": "During Photos",
              "tooltip_body": "Take photos as you work. Shows your process and quality. Minimum 1 required.",
              "primary_action_label": "Add Progress Photo",
              "success_criteria": "1+ photo added"
            },
            {
              "step_id": "P4-05",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "After photos section",
              "tooltip_title": "After Photos (Required)",
              "tooltip_body": "When work is complete, take at least 2 photos showing the finished result.",
              "primary_action_label": "Add After Photos",
              "success_criteria": "2+ photos added"
            },
            {
              "step_id": "P4-06",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Complete job button",
              "tooltip_title": "Ready to Complete?",
              "tooltip_body": "Make sure all photos are uploaded and work is finished before marking complete.",
              "primary_action_label": "Complete Job",
              "success_criteria": "Completion flow starts"
            },
            {
              "step_id": "P4-07",
              "screen_name": "/provider/jobs/[id]/complete",
              "selector_hint": "Invoice amount",
              "tooltip_title": "Create Invoice",
              "tooltip_body": "Confirm the final amount. Must match your estimate unless there's an approved change order.",
              "primary_action_label": "Confirm Amount",
              "success_criteria": "Amount confirmed"
            },
            {
              "step_id": "P4-08",
              "screen_name": "/provider/jobs/[id]/complete",
              "selector_hint": "Work summary",
              "tooltip_title": "AI Work Summary",
              "tooltip_body": "AI can generate a summary of work completed. Review and edit—especially any compliance notes.",
              "primary_action_label": "Generate Summary",
              "success_criteria": "Summary generated"
            },
            {
              "step_id": "P4-09",
              "screen_name": "/provider/jobs/[id]/complete",
              "selector_hint": "Submit button",
              "tooltip_title": "Submit Invoice",
              "tooltip_body": "The customer has 24 hours to review, then 72 hours to dispute. You'll be paid after that window.",
              "primary_action_label": "Submit Invoice",
              "success_criteria": "Invoice submitted"
            },
            {
              "step_id": "P4-10",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Success message",
              "tooltip_title": "Job Complete!",
              "tooltip_body": "Nice work! Payment will be transferred after the 72-hour dispute window.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "P5",
          "tour_name": "Request Review + Repeat Customer",
          "trigger": "first_job_paid",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "P5-01",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Review request section",
              "tooltip_title": "Ask for a Review",
              "tooltip_body": "Happy customers often forget to leave reviews. A quick reminder can help build your reputation.",
              "primary_action_label": "Request Review",
              "success_criteria": "Review request sent"
            },
            {
              "step_id": "P5-02",
              "screen_name": "/provider/jobs/[id]",
              "selector_hint": "Customer info",
              "tooltip_title": "Save This Customer",
              "tooltip_body": "This customer is now in your network. They can request you directly for future jobs.",
              "primary_action_label": "View Customer",
              "success_criteria": "Customer profile viewed"
            },
            {
              "step_id": "P5-03",
              "screen_name": "/provider/profile",
              "selector_hint": "Rating display",
              "tooltip_title": "Your Rating Matters",
              "tooltip_body": "Your overall rating affects how often you get matched. Aim for 4.5+ to qualify for Preferred status.",
              "primary_action_label": "Got It",
              "success_criteria": "User acknowledges"
            },
            {
              "step_id": "P5-04",
              "screen_name": "/provider/profile",
              "selector_hint": "Tier progress",
              "tooltip_title": "Path to Preferred",
              "tooltip_body": "Complete 10 jobs with 4.5+ rating and <5% disputes to qualify for Preferred tier benefits.",
              "primary_action_label": "View Benefits",
              "success_criteria": "Benefits viewed (optional)"
            },
            {
              "step_id": "P5-05",
              "screen_name": "/provider/jobs",
              "selector_hint": "Job list",
              "tooltip_title": "Keep Going!",
              "tooltip_body": "More completed jobs = higher visibility. We prioritize providers with fast response times.",
              "primary_action_label": "View Jobs",
              "success_criteria": "Tour complete"
            }
          ]
        }
      ]
    },
    "handyman": {
      "tours": [
        {
          "tour_id": "HY1",
          "tour_name": "Toggle Online + Set Availability",
          "trigger": "first_login",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "HY1-01",
              "screen_name": "/handyman/jobs",
              "selector_hint": "Welcome message",
              "tooltip_title": "Welcome!",
              "tooltip_body": "You're set up and ready to work. Let's show you how to go online and get jobs.",
              "primary_action_label": "Let's Go",
              "success_criteria": "User clicks action"
            },
            {
              "step_id": "HY1-02",
              "screen_name": "/handyman/jobs",
              "selector_hint": "Status toggle (top of screen)",
              "tooltip_title": "Your Status Toggle",
              "tooltip_body": "This controls whether you receive job offers. Green = Online and accepting jobs.",
              "primary_action_label": "Find Toggle",
              "success_criteria": "Toggle located"
            },
            {
              "step_id": "HY1-03",
              "screen_name": "/handyman/jobs",
              "selector_hint": "Status toggle",
              "tooltip_title": "Go Online",
              "tooltip_body": "Tap to go Online. You'll start receiving job notifications in your area.",
              "primary_action_label": "Toggle Online",
              "success_criteria": "Status set to Online"
            },
            {
              "step_id": "HY1-04",
              "screen_name": "/handyman/jobs",
              "selector_hint": "Location permission prompt",
              "tooltip_title": "Enable Location",
              "tooltip_body": "We need your location to match you with nearby jobs. Enable it for best results.",
              "primary_action_label": "Allow Location",
              "success_criteria": "Location enabled"
            },
            {
              "step_id": "HY1-05",
              "screen_name": "/handyman/profile",
              "selector_hint": "Availability hours section",
              "tooltip_title": "Set Your Hours",
              "tooltip_body": "Set when you're typically available. This helps us send jobs at the right times.",
              "primary_action_label": "Set Hours",
              "success_criteria": "Hours configured"
            },
            {
              "step_id": "HY1-06",
              "screen_name": "/handyman/jobs",
              "selector_hint": "Waiting state",
              "tooltip_title": "Ready for Jobs!",
              "tooltip_body": "You're online and ready. Jobs appear here when there's a match. Respond quickly—within 15 minutes.",
              "primary_action_label": "Got It",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "HY2",
          "tour_name": "Accept Job + Navigate",
          "trigger": "first_job_notification",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "HY2-01",
              "screen_name": "/handyman/jobs",
              "selector_hint": "Job notification card",
              "tooltip_title": "New Job!",
              "tooltip_body": "You've been assigned a job. Review the details and accept within 15 minutes.",
              "primary_action_label": "View Job",
              "success_criteria": "Job details open"
            },
            {
              "step_id": "HY2-02",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Job details",
              "tooltip_title": "Job Details",
              "tooltip_body": "Review the customer name, address, and work description. Make sure you can handle it.",
              "primary_action_label": "Review Details",
              "success_criteria": "Details viewed"
            },
            {
              "step_id": "HY2-03",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Photos section",
              "tooltip_title": "Customer Photos",
              "tooltip_body": "Check the photos to understand what you're walking into. Come prepared with the right tools.",
              "primary_action_label": "View Photos",
              "success_criteria": "Photos viewed"
            },
            {
              "step_id": "HY2-04",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Accept/Decline buttons",
              "tooltip_title": "Accept or Decline",
              "tooltip_body": "Accept if you can do the job. Decline if you can't—it's better than canceling later.",
              "primary_action_label": "Make Decision",
              "success_criteria": "Job accepted or declined"
            },
            {
              "step_id": "HY2-05",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Navigate button",
              "tooltip_title": "Navigate to Job",
              "tooltip_body": "Tap to open maps and get directions. Arrive within your scheduled window.",
              "primary_action_label": "Get Directions",
              "success_criteria": "Maps opened"
            },
            {
              "step_id": "HY2-06",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "On My Way button",
              "tooltip_title": "Mark On My Way",
              "tooltip_body": "Let the customer know you're coming. They'll get a notification.",
              "primary_action_label": "On My Way",
              "success_criteria": "Status updated"
            }
          ]
        },
        {
          "tour_id": "HY3",
          "tour_name": "Start Job → Document → Complete",
          "trigger": "first_job_arrival",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "HY3-01",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Arrive button",
              "tooltip_title": "You've Arrived",
              "tooltip_body": "Tap when you arrive. This timestamps your arrival for the customer.",
              "primary_action_label": "Mark Arrived",
              "success_criteria": "Arrival marked"
            },
            {
              "step_id": "HY3-02",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Before photos button",
              "tooltip_title": "Take Before Photos",
              "tooltip_body": "Before starting work, take at least 2 photos showing the current condition. Required!",
              "primary_action_label": "Add Photos",
              "success_criteria": "2+ photos added"
            },
            {
              "step_id": "HY3-03",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Start work button",
              "tooltip_title": "Start Working",
              "tooltip_body": "Tap when you begin the actual work. This tracks your job duration.",
              "primary_action_label": "Start Work",
              "success_criteria": "Work started"
            },
            {
              "step_id": "HY3-04",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "During photos section",
              "tooltip_title": "Document Progress",
              "tooltip_body": "Take at least 1 photo while working. Shows your process and protects you.",
              "primary_action_label": "Add Photo",
              "success_criteria": "1+ photo added"
            },
            {
              "step_id": "HY3-05",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "After photos section",
              "tooltip_title": "Almost Done!",
              "tooltip_body": "When work is complete, take at least 2 \"after\" photos showing the finished result.",
              "primary_action_label": "Add After Photos",
              "success_criteria": "2+ photos added"
            },
            {
              "step_id": "HY3-06",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Complete button",
              "tooltip_title": "Complete the Job",
              "tooltip_body": "Review all your photos, then mark the job complete. Customer will be notified.",
              "primary_action_label": "Complete Job",
              "success_criteria": "Job completed"
            },
            {
              "step_id": "HY3-07",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Success message",
              "tooltip_title": "Job Done!",
              "tooltip_body": "Great work! Your completion is logged. Head to your next job or go offline.",
              "primary_action_label": "Next Job",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "HY4",
          "tour_name": "Handling Scope Change + Messaging",
          "trigger": "manual",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "HY4-01",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Message button",
              "tooltip_title": "Contact Customer",
              "tooltip_body": "Need to ask the customer something? Use the message button to communicate.",
              "primary_action_label": "Open Messages",
              "success_criteria": "Message thread opens"
            },
            {
              "step_id": "HY4-02",
              "screen_name": "/handyman/messages/[thread]",
              "selector_hint": "Message input",
              "tooltip_title": "Send a Message",
              "tooltip_body": "Keep messages professional. Never discuss pricing or additional work here.",
              "primary_action_label": "Type Message",
              "success_criteria": "Message composed"
            },
            {
              "step_id": "HY4-03",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Scope change warning",
              "tooltip_title": "What If Scope Changes?",
              "tooltip_body": "If the customer asks for more work, STOP. Contact your provider—don't do extra work without approval.",
              "primary_action_label": "I Understand",
              "success_criteria": "User acknowledges"
            },
            {
              "step_id": "HY4-04",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Provider contact info",
              "tooltip_title": "Contact Your Provider",
              "tooltip_body": "For scope changes, contact your provider company. They'll submit a change order if needed.",
              "primary_action_label": "Got It",
              "success_criteria": "User acknowledges"
            },
            {
              "step_id": "HY4-05",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Issue report button",
              "tooltip_title": "Report Issues",
              "tooltip_body": "Safety hazard? Can't complete? Use \"Report Issue\" to document and escalate.",
              "primary_action_label": "Find Button",
              "success_criteria": "Button located"
            },
            {
              "step_id": "HY4-06",
              "screen_name": "/handyman/jobs/[id]",
              "selector_hint": "Summary",
              "tooltip_title": "Stay in Touch",
              "tooltip_body": "Keep customers informed, but route all scope/pricing discussions through your provider.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        }
      ]
    },
    "admin": {
      "tours": [
        {
          "tour_id": "A1",
          "tour_name": "Verify Provider + Move to Preferred",
          "trigger": "first_admin_access",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "A1-01",
              "screen_name": "/app/admin",
              "selector_hint": "Admin dashboard",
              "tooltip_title": "Welcome, Admin",
              "tooltip_body": "Let's show you how to verify providers and manage their tier status.",
              "primary_action_label": "Start Tour",
              "success_criteria": "User clicks action"
            },
            {
              "step_id": "A1-02",
              "screen_name": "/app/admin/providers",
              "selector_hint": "Provider list",
              "tooltip_title": "Provider Management",
              "tooltip_body": "This is your provider queue. Filter by status to find pending verifications.",
              "primary_action_label": "View Providers",
              "success_criteria": "Provider list visible"
            },
            {
              "step_id": "A1-03",
              "screen_name": "/app/admin/providers",
              "selector_hint": "Status filter",
              "tooltip_title": "Filter by Status",
              "tooltip_body": "Click to filter: Pending Verification, Verified, Preferred, or Suspended.",
              "primary_action_label": "Filter Pending",
              "success_criteria": "Filter applied"
            },
            {
              "step_id": "A1-04",
              "screen_name": "/app/admin/providers/[id]",
              "selector_hint": "Provider detail",
              "tooltip_title": "Review Provider",
              "tooltip_body": "Check their submitted documents: license, insurance, business info.",
              "primary_action_label": "Open Provider",
              "success_criteria": "Provider details open"
            },
            {
              "step_id": "A1-05",
              "screen_name": "/app/admin/providers/[id]",
              "selector_hint": "Documents section",
              "tooltip_title": "Verify Documents",
              "tooltip_body": "Review each document. Click to expand. Check expiration dates and authenticity.",
              "primary_action_label": "Review Documents",
              "success_criteria": "Documents reviewed"
            },
            {
              "step_id": "A1-06",
              "screen_name": "/app/admin/providers/[id]",
              "selector_hint": "External check link",
              "tooltip_title": "External Verification",
              "tooltip_body": "Verify license numbers against state database (opens external link).",
              "primary_action_label": "Check License",
              "success_criteria": "External check initiated"
            },
            {
              "step_id": "A1-07",
              "screen_name": "/app/admin/providers/[id]",
              "selector_hint": "Approve button",
              "tooltip_title": "Approve or Reject",
              "tooltip_body": "Satisfied? Click Approve to grant Verified status. Or reject with a reason.",
              "primary_action_label": "Approve Provider",
              "success_criteria": "Provider verified"
            },
            {
              "step_id": "A1-08",
              "screen_name": "/app/admin/providers/[id]",
              "selector_hint": "Tier upgrade section",
              "tooltip_title": "Upgrade to Preferred",
              "tooltip_body": "For qualified providers (4.5+ rating, 10+ jobs, <5% disputes), you can upgrade to Preferred.",
              "primary_action_label": "View Qualifications",
              "success_criteria": "Qualifications displayed"
            },
            {
              "step_id": "A1-09",
              "screen_name": "/app/admin/providers/[id]",
              "selector_hint": "Upgrade button",
              "tooltip_title": "Manual Override",
              "tooltip_body": "Click to manually set Preferred status. Document the reason.",
              "primary_action_label": "Upgrade Tier",
              "success_criteria": "Tier updated (optional)"
            },
            {
              "step_id": "A1-10",
              "screen_name": "/app/admin/providers",
              "selector_hint": "Return to list",
              "tooltip_title": "Provider Updated!",
              "tooltip_body": "Changes are saved. The provider is notified of their new status.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "A2",
          "tour_name": "Review Exceptions Queue",
          "trigger": "first_open_items_access",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "A2-01",
              "screen_name": "/app/admin",
              "selector_hint": "Open items widget/tab",
              "tooltip_title": "Open Items Queue",
              "tooltip_body": "This shows items needing your attention: pending approvals, disputes, flagged bookings.",
              "primary_action_label": "View Queue",
              "success_criteria": "Queue displayed"
            },
            {
              "step_id": "A2-02",
              "screen_name": "/app/admin/open-items [TBD]",
              "selector_hint": "Queue filters",
              "tooltip_title": "Filter by Type",
              "tooltip_body": "Filter by: Disputes, Verifications, Flagged Transactions, or Manual Reviews.",
              "primary_action_label": "Apply Filter",
              "success_criteria": "Filter applied"
            },
            {
              "step_id": "A2-03",
              "screen_name": "/app/admin/open-items [TBD]",
              "selector_hint": "Priority indicators",
              "tooltip_title": "Priority Levels",
              "tooltip_body": "Red = urgent (SLA at risk). Yellow = approaching deadline. Green = routine.",
              "primary_action_label": "Got It",
              "success_criteria": "User acknowledges"
            },
            {
              "step_id": "A2-04",
              "screen_name": "/app/admin/open-items [TBD]",
              "selector_hint": "Item detail",
              "tooltip_title": "Review an Item",
              "tooltip_body": "Click any item to see details. Each type has its own review workflow.",
              "primary_action_label": "Open Item",
              "success_criteria": "Item details open"
            },
            {
              "step_id": "A2-05",
              "screen_name": "/app/admin/open-items [TBD]",
              "selector_hint": "Action buttons",
              "tooltip_title": "Take Action",
              "tooltip_body": "Process the item: approve, reject, escalate, or resolve. Add notes for audit trail.",
              "primary_action_label": "Take Action",
              "success_criteria": "Action taken (optional)"
            },
            {
              "step_id": "A2-06",
              "screen_name": "/app/admin",
              "selector_hint": "Queue updated",
              "tooltip_title": "Item Processed!",
              "tooltip_body": "Completed items move to history. Your queue updates automatically.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "A3",
          "tour_name": "Dispute Handling + Refund Decision",
          "trigger": "first_dispute_access",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "A3-01",
              "screen_name": "/app/admin/disputes",
              "selector_hint": "Dispute list",
              "tooltip_title": "Dispute Queue",
              "tooltip_body": "Active disputes are listed by age. Oldest first—resolve within 72 hours.",
              "primary_action_label": "View Disputes",
              "success_criteria": "List visible"
            },
            {
              "step_id": "A3-02",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Dispute detail",
              "tooltip_title": "Review Dispute",
              "tooltip_body": "This shows the customer's complaint, provider response, and all evidence.",
              "primary_action_label": "Open Dispute",
              "success_criteria": "Dispute details open"
            },
            {
              "step_id": "A3-03",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Timeline section",
              "tooltip_title": "Dispute Timeline",
              "tooltip_body": "See the full history: booking, messages, photos, invoice. Context matters.",
              "primary_action_label": "Review Timeline",
              "success_criteria": "Timeline viewed"
            },
            {
              "step_id": "A3-04",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Customer evidence",
              "tooltip_title": "Customer's Side",
              "tooltip_body": "Read their complaint and view any photos they submitted as evidence.",
              "primary_action_label": "Review Evidence",
              "success_criteria": "Customer evidence viewed"
            },
            {
              "step_id": "A3-05",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Provider evidence",
              "tooltip_title": "Provider's Side",
              "tooltip_body": "See the provider's response, their documentation, and before/after photos.",
              "primary_action_label": "Review Evidence",
              "success_criteria": "Provider evidence viewed"
            },
            {
              "step_id": "A3-06",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Decision buttons",
              "tooltip_title": "Make Your Decision",
              "tooltip_body": "Choose: Customer Favor (full/partial refund), Provider Favor, or Split Decision.",
              "primary_action_label": "Select Outcome",
              "success_criteria": "Outcome selected"
            },
            {
              "step_id": "A3-07",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Refund amount field",
              "tooltip_title": "Set Refund Amount",
              "tooltip_body": "For partial refunds, enter the amount. Explain your reasoning in the notes.",
              "primary_action_label": "Enter Amount",
              "success_criteria": "Amount entered (if applicable)"
            },
            {
              "step_id": "A3-08",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Reasoning field",
              "tooltip_title": "Document Your Decision",
              "tooltip_body": "Write a clear explanation. Both parties receive this. Be professional and factual.",
              "primary_action_label": "Add Reasoning",
              "success_criteria": "Reasoning entered"
            },
            {
              "step_id": "A3-09",
              "screen_name": "/app/admin/disputes/[id]",
              "selector_hint": "Resolve button",
              "tooltip_title": "Finalize Resolution",
              "tooltip_body": "This processes any refund and notifies both parties. Action cannot be undone.",
              "primary_action_label": "Resolve Dispute",
              "success_criteria": "Dispute resolved"
            },
            {
              "step_id": "A3-10",
              "screen_name": "/app/admin/disputes",
              "selector_hint": "Success message",
              "tooltip_title": "Dispute Resolved!",
              "tooltip_body": "The customer and provider have been notified. Funds are processed accordingly.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "A4",
          "tour_name": "Error Center + Resolution Steps",
          "trigger": "first_error_center_access",
          "note": "[TBD — confirm screen exists]",
          "estimated_time_minutes": 2,
          "steps": [
            {
              "step_id": "A4-01",
              "screen_name": "/app/admin/errors [TBD]",
              "selector_hint": "Error log",
              "tooltip_title": "Error Center",
              "tooltip_body": "This logs system errors and customer-reported issues with error codes.",
              "primary_action_label": "View Errors",
              "success_criteria": "Error list visible"
            },
            {
              "step_id": "A4-02",
              "screen_name": "/app/admin/errors [TBD]",
              "selector_hint": "Error categories",
              "tooltip_title": "Filter by Category",
              "tooltip_body": "Filter by: Payment, Auth, Booking, AI, Integration, or Other.",
              "primary_action_label": "Apply Filter",
              "success_criteria": "Filter applied"
            },
            {
              "step_id": "A4-03",
              "screen_name": "/app/admin/errors/[id] [TBD]",
              "selector_hint": "Error detail",
              "tooltip_title": "Error Details",
              "tooltip_body": "See the error code, affected user, timestamp, and stack trace (if available).",
              "primary_action_label": "Open Error",
              "success_criteria": "Error details open"
            },
            {
              "step_id": "A4-04",
              "screen_name": "/app/admin/errors/[id] [TBD]",
              "selector_hint": "Resolution steps section",
              "tooltip_title": "Document Resolution",
              "tooltip_body": "If you solve this, document the steps so others can resolve similar issues.",
              "primary_action_label": "Add Steps",
              "success_criteria": "Resolution input visible"
            },
            {
              "step_id": "A4-05",
              "screen_name": "/app/admin/errors/[id] [TBD]",
              "selector_hint": "Link to KB",
              "tooltip_title": "Link to Knowledge Base",
              "tooltip_body": "Connect this resolution to a KB article for the support chatbot.",
              "primary_action_label": "Link KB (Optional)",
              "success_criteria": "Link created or skipped"
            },
            {
              "step_id": "A4-06",
              "screen_name": "/app/admin/errors/[id] [TBD]",
              "selector_hint": "Mark resolved button",
              "tooltip_title": "Mark Resolved",
              "tooltip_body": "Once documented, mark the error as resolved. It moves to history.",
              "primary_action_label": "Resolve Error",
              "success_criteria": "Error resolved"
            },
            {
              "step_id": "A4-07",
              "screen_name": "/app/admin/errors [TBD]",
              "selector_hint": "Success",
              "tooltip_title": "Error Documented!",
              "tooltip_body": "Your resolution steps help the team handle similar issues faster.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        },
        {
          "tour_id": "A5",
          "tour_name": "KB Update Workflow for Chatbot",
          "trigger": "first_kb_access",
          "note": "[TBD — confirm screen exists]",
          "estimated_time_minutes": 3,
          "steps": [
            {
              "step_id": "A5-01",
              "screen_name": "/app/admin/knowledge-base [TBD]",
              "selector_hint": "KB dashboard",
              "tooltip_title": "Knowledge Base",
              "tooltip_body": "This manages content for the support chatbot. Updates here improve AI responses.",
              "primary_action_label": "View KB",
              "success_criteria": "KB list visible"
            },
            {
              "step_id": "A5-02",
              "screen_name": "/app/admin/knowledge-base [TBD]",
              "selector_hint": "KB categories",
              "tooltip_title": "Content Categories",
              "tooltip_body": "Content is organized by role (Homeowner, Provider, etc.) and topic.",
              "primary_action_label": "Browse Categories",
              "success_criteria": "Categories visible"
            },
            {
              "step_id": "A5-03",
              "screen_name": "/app/admin/knowledge-base/new [TBD]",
              "selector_hint": "New article form",
              "tooltip_title": "Add KB Article",
              "tooltip_body": "Create a new knowledge chunk. Keep it focused on one topic.",
              "primary_action_label": "Create Article",
              "success_criteria": "Form displayed"
            },
            {
              "step_id": "A5-04",
              "screen_name": "/app/admin/knowledge-base/new [TBD]",
              "selector_hint": "Role selector",
              "tooltip_title": "Set Target Role",
              "tooltip_body": "Choose which role this content applies to. Affects chatbot routing.",
              "primary_action_label": "Select Role",
              "success_criteria": "Role selected"
            },
            {
              "step_id": "A5-05",
              "screen_name": "/app/admin/knowledge-base/new [TBD]",
              "selector_hint": "Content fields",
              "tooltip_title": "Write Content",
              "tooltip_body": "Title should be a question. Body should be a clear, concise answer.",
              "primary_action_label": "Enter Content",
              "success_criteria": "Content entered"
            },
            {
              "step_id": "A5-06",
              "screen_name": "/app/admin/knowledge-base/new [TBD]",
              "selector_hint": "Intent tags",
              "tooltip_title": "Add Intent Tags",
              "tooltip_body": "Tag with related intents so the chatbot knows when to surface this.",
              "primary_action_label": "Add Tags",
              "success_criteria": "Tags added"
            },
            {
              "step_id": "A5-07",
              "screen_name": "/app/admin/knowledge-base/new [TBD]",
              "selector_hint": "Preview button",
              "tooltip_title": "Preview Response",
              "tooltip_body": "See how this will appear in the chatbot before publishing.",
              "primary_action_label": "Preview",
              "success_criteria": "Preview displayed"
            },
            {
              "step_id": "A5-08",
              "screen_name": "/app/admin/knowledge-base/new [TBD]",
              "selector_hint": "Publish button",
              "tooltip_title": "Publish to Chatbot",
              "tooltip_body": "Publishing makes this immediately available to the support bot.",
              "primary_action_label": "Publish",
              "success_criteria": "Article published"
            },
            {
              "step_id": "A5-09",
              "screen_name": "/app/admin/knowledge-base [TBD]",
              "selector_hint": "Success message",
              "tooltip_title": "KB Updated!",
              "tooltip_body": "The chatbot now includes your new content. Monitor chat logs to verify it's working.",
              "primary_action_label": "Done",
              "success_criteria": "Tour complete"
            }
          ]
        }
      ]
    }
  }
}
```

---

## Instrumentation Suggestions

Track these events for each tour step to measure activation and completion rates.

### Event Schema

```typescript
interface TourEvent {
  event_type: "tour_started" | "step_viewed" | "step_completed" | "step_skipped" | "tour_completed" | "tour_abandoned";
  tour_id: string;        // e.g., "H1", "P3", "A1"
  step_id?: string;       // e.g., "H1-01", "P3-05"
  user_id: string;
  user_role: string;
  timestamp: string;
  session_id: string;
  properties?: {
    time_on_step_ms?: number;
    skip_reason?: string;
    abandon_step?: string;
  };
}
```

### Events by Tour Phase

| Phase | Event | Properties | Purpose |
|-------|-------|------------|---------|
| Start | `tour_started` | `tour_id`, `trigger` | Activation rate |
| Each Step | `step_viewed` | `step_id`, `screen_name` | Step reach |
| Each Step | `step_completed` | `step_id`, `time_on_step_ms` | Step completion |
| Skip | `step_skipped` | `step_id`, `skip_reason` | Drop-off analysis |
| End | `tour_completed` | `tour_id`, `total_time_ms` | Completion rate |
| Exit | `tour_abandoned` | `tour_id`, `abandon_step` | Churn analysis |

### Key Metrics to Dashboard

| Metric | Calculation | Target |
|--------|-------------|--------|
| **Tour Activation Rate** | Tours started / eligible users | >70% |
| **Tour Completion Rate** | Tours completed / tours started | >60% |
| **Step Drop-off Rate** | (Step N viewers - Step N+1 viewers) / Step N viewers | <15% per step |
| **Average Time per Step** | Mean(time_on_step_ms) | 10-30 seconds |
| **Skip Rate** | Steps skipped / steps viewed | <10% |
| **Abandon Points** | Most common abandon_step | Identify friction |

### Recommended Event Tracking per Step

#### Homeowner Tours

| Tour | Step | Events |
|------|------|--------|
| H1 | H1-01 | `tour_started`, `step_viewed` |
| H1 | H1-02 | `step_viewed`, `step_completed` (when address entered) |
| H1 | H1-05 | `step_completed` (track `systems_added_count`) |
| H1 | H1-06 | `step_completed` OR `step_skipped` (track photo upload decision) |
| H1 | H1-08 | `tour_completed` |
| H3 | H3-02 | `step_completed` (track `photos_uploaded_count`) |
| H3 | H3-04 | `step_completed` (track `ai_analysis_time_ms`) |
| H3 | H3-08 | `step_completed` (track `request_submitted`) |

#### Provider Tours

| Tour | Step | Events |
|------|------|--------|
| P1 | P1-08 | `step_completed` (track `stripe_connected: boolean`) |
| P2 | P2-05 | `step_completed` (track `job_accepted: boolean`) |
| P3 | P3-02 | `step_completed` (track `ai_draft_used: boolean`) |
| P3 | P3-07 | `step_completed` (track `estimate_amount`, `line_item_count`) |
| P4 | P4-02 | `step_completed` (track `before_photo_count`) |
| P4 | P4-09 | `step_completed` (track `invoice_amount`) |

#### Handyman Tours

| Tour | Step | Events |
|------|------|--------|
| HY1 | HY1-03 | `step_completed` (track `went_online: boolean`) |
| HY1 | HY1-04 | `step_completed` (track `location_enabled: boolean`) |
| HY2 | HY2-04 | `step_completed` (track `job_decision: "accepted" | "declined"`) |
| HY3 | HY3-02 | `step_completed` (track `before_photo_count`) |
| HY3 | HY3-06 | `step_completed` (track `job_duration_ms`) |

#### Admin Tours

| Tour | Step | Events |
|------|------|--------|
| A1 | A1-07 | `step_completed` (track `provider_verified: boolean`) |
| A1 | A1-09 | `step_completed` (track `tier_upgraded: boolean`) |
| A3 | A3-06 | `step_completed` (track `dispute_decision: string`) |
| A3 | A3-09 | `step_completed` (track `refund_amount`, `resolution_time_ms`) |

### A/B Testing Opportunities

| Test | Variants | Success Metric |
|------|----------|----------------|
| Tour length | 5 steps vs 8 steps | Completion rate |
| Tooltip timing | Immediate vs 2s delay | Step completion |
| Action labels | "Got It" vs "Next" vs "Continue" | Click rate |
| Photo upload step | Required vs optional | Overall completion |
| AI draft promotion | Prominent vs subtle | AI feature adoption |

---

## Implementation Checklist

### Pre-Launch

- [ ] Integrate tooltip library (`driver.js` or `react-joyride`)
- [ ] Create `user_preferences.completed_tours[]` field
- [ ] Implement tour trigger logic based on user state
- [ ] Add "Take a Tour" to Help menu for replay
- [ ] Set up analytics events in tracking system
- [ ] Create dashboard for tour metrics

### Per Tour

- [ ] Add `data-tour-step="STEP_ID"` attributes to target elements
- [ ] Test tour flow on mobile and desktop
- [ ] Verify success criteria detection logic
- [ ] Handle edge cases (element not visible, async loading)
- [ ] Add pause/resume for multi-screen tours

### Post-Launch

- [ ] Monitor completion rates weekly
- [ ] Identify high drop-off steps for optimization
- [ ] A/B test tooltip copy improvements
- [ ] Update tours when UI changes
- [ ] Remove tours for deprecated features

---

*End of Guided Tours Documentation*

**Document Version:** 1.0
**Total Tours:** 16
**Total Steps:** 127
