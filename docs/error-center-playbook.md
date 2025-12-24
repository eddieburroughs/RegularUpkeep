# RegularUpkeep Error Center Playbook

> **Version**: 1.0
> **Last Updated**: 2025-12-24
> **Audience**: Support Engineers, Admins, Developers, Chatbot

---

## Table of Contents

1. [Error Code Format](#error-code-format)
2. [Error Categories](#error-categories)
3. [Error Catalog](#error-catalog)
   - [AUTH - Authentication/Login](#auth---authenticationlogin)
   - [ONBD - Onboarding](#onbd---onboarding)
   - [PROP - Property Setup](#prop---property-setup)
   - [BOOK - Bookings](#book---bookings)
   - [MSG - Messaging](#msg---messaging)
   - [UPLD - Uploads](#upld---uploads)
   - [NOTIF - Notifications](#notif---notifications)
   - [PAY - Payments](#pay---payments)
   - [ADMIN - Admin](#admin---admin)
   - [INTG - Integrations](#intg---integrations)
   - [API - API/System](#api---apisystem)
   - [UNK - Unknown](#unk---unknown)
4. [Error Intake Form Template](#error-intake-form-template)
5. [Claude Code Fix Prompt Template](#claude-code-fix-prompt-template)
6. [Escalation Matrix](#escalation-matrix)
7. [JSON Error Catalog](#json-error-catalog)
8. [YAML Intent Map for Chatbot](#yaml-intent-map-for-chatbot)

---

## Error Code Format

```
RU-{CATEGORY}-{NUMBER}
```

| Component | Description | Example |
|-----------|-------------|---------|
| `RU` | RegularUpkeep prefix | RU |
| `CATEGORY` | 3-5 letter category code | AUTH, BOOK, PAY |
| `NUMBER` | 3-digit sequential number | 001, 014, 100 |

**Examples:**
- `RU-AUTH-001` — Invalid email format during login
- `RU-BOOK-014` — Provider unavailable for selected time
- `RU-PAY-003` — Card declined
- `RU-API-500` — Internal server error

---

## Error Categories

| Code | Category | Description | Owner |
|------|----------|-------------|-------|
| `AUTH` | Authentication/Login | Login, logout, password reset, session issues | Auth Team |
| `ONBD` | Onboarding | Account creation, role selection, initial setup | Product |
| `PROP` | Property Setup | Adding properties, systems, access management | Product |
| `BOOK` | Bookings | Scheduling, estimates, appointments, change orders | Operations |
| `MSG` | Messaging | Chat, notifications in-app, thread issues | Product |
| `UPLD` | Uploads | Photos, videos, documents, file processing | Engineering |
| `NOTIF` | Notifications | Email, SMS, push notifications | Engineering |
| `PAY` | Payments | Stripe, invoices, refunds, payouts | Finance/Eng |
| `ADMIN` | Admin | Dashboard, user management, config | Admin Team |
| `INTG` | Integrations | Third-party APIs, webhooks, external services | Engineering |
| `API` | API/System | Server errors, timeouts, rate limits | Engineering |
| `UNK` | Unknown | Unclassified or new errors | Triage |

---

## Error Catalog

### AUTH - Authentication/Login

#### RU-AUTH-001: Invalid Email Format
| Field | Value |
|-------|-------|
| **Error Code** | RU-AUTH-001 |
| **User Message** | "Please enter a valid email address." |
| **Likely Causes** | Typo in email, missing @ symbol, invalid domain |
| **User Fix** | 1. Check email for typos<br>2. Ensure format is name@domain.com<br>3. Try a different email |
| **Admin Fix** | 1. Check input validation regex<br>2. Review allowed email domains<br>3. Check for encoding issues |
| **Logs to Capture** | `input_value`, `validation_error`, `timestamp`, `user_agent` |
| **Escalation** | 3+ occurrences same user → Tier 2 |

#### RU-AUTH-002: Incorrect Password
| Field | Value |
|-------|-------|
| **Error Code** | RU-AUTH-002 |
| **User Message** | "The password you entered is incorrect. Please try again or reset your password." |
| **Likely Causes** | Wrong password, caps lock on, copy-paste whitespace |
| **User Fix** | 1. Check caps lock<br>2. Try typing password manually<br>3. Use "Forgot Password" to reset |
| **Admin Fix** | 1. Check auth logs for user<br>2. Verify account not locked<br>3. Check for brute force attempts |
| **Logs to Capture** | `user_email`, `attempt_count`, `ip_address`, `timestamp` |
| **Escalation** | 5 failed attempts → Auto-lock, notify user |

#### RU-AUTH-003: Account Locked
| Field | Value |
|-------|-------|
| **Error Code** | RU-AUTH-003 |
| **User Message** | "Your account has been temporarily locked due to too many failed login attempts. Please try again in 30 minutes or contact support." |
| **Likely Causes** | 5+ failed password attempts, suspicious activity detected |
| **User Fix** | 1. Wait 30 minutes<br>2. Reset password via email<br>3. Contact support if urgent |
| **Admin Fix** | 1. Check `auth.users` for lockout status<br>2. Review IP/device for fraud signals<br>3. Manually unlock if legitimate |
| **Logs to Capture** | `user_id`, `lockout_reason`, `failed_attempts`, `ip_addresses` |
| **Escalation** | Immediate if user claims account compromise |

#### RU-AUTH-004: Session Expired
| Field | Value |
|-------|-------|
| **Error Code** | RU-AUTH-004 |
| **User Message** | "Your session has expired. Please log in again." |
| **Likely Causes** | Idle timeout (24h), token refresh failed, cleared cookies |
| **User Fix** | 1. Log in again<br>2. Enable cookies if disabled<br>3. Check browser privacy settings |
| **Admin Fix** | 1. Check Supabase auth token expiry settings<br>2. Review refresh token logic<br>3. Check for JWT clock skew |
| **Logs to Capture** | `session_id`, `token_expiry`, `last_activity`, `refresh_attempt` |
| **Escalation** | Frequent occurrences → Engineering review |

#### RU-AUTH-005: Email Not Verified
| Field | Value |
|-------|-------|
| **Error Code** | RU-AUTH-005 |
| **User Message** | "Please verify your email address before logging in. Check your inbox for a verification link." |
| **Likely Causes** | User didn't click verification link, email in spam |
| **User Fix** | 1. Check inbox and spam folder<br>2. Click "Resend verification email"<br>3. Check email is correct |
| **Admin Fix** | 1. Check if verification email was sent<br>2. Manually verify if user confirms ownership<br>3. Check email delivery logs |
| **Logs to Capture** | `user_email`, `verification_sent_at`, `email_status` |
| **Escalation** | 3+ resend requests → Manual verification |

#### RU-AUTH-006: OAuth Provider Error
| Field | Value |
|-------|-------|
| **Error Code** | RU-AUTH-006 |
| **User Message** | "We couldn't sign you in with [Provider]. Please try again or use email/password." |
| **Likely Causes** | Google/Apple OAuth failure, popup blocked, provider outage |
| **User Fix** | 1. Allow popups for regularupkeep.com<br>2. Try a different browser<br>3. Use email/password login |
| **Admin Fix** | 1. Check OAuth provider status<br>2. Verify OAuth credentials in Supabase<br>3. Check callback URL configuration |
| **Logs to Capture** | `provider`, `oauth_error`, `redirect_uri`, `timestamp` |
| **Escalation** | Provider-wide outage → Status page update |

---

### ONBD - Onboarding

#### RU-ONBD-001: Role Selection Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-ONBD-001 |
| **User Message** | "We couldn't save your account type. Please try again." |
| **Likely Causes** | Database write failed, session lost during selection |
| **User Fix** | 1. Refresh the page<br>2. Log out and back in<br>3. Try a different browser |
| **Admin Fix** | 1. Check `profiles` table for user<br>2. Verify role enum value<br>3. Check database connection |
| **Logs to Capture** | `user_id`, `selected_role`, `db_error`, `timestamp` |
| **Escalation** | Database errors → Engineering immediate |

#### RU-ONBD-002: Business Info Validation Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-ONBD-002 |
| **User Message** | "Please check your business information. Some fields need correction." |
| **Likely Causes** | Invalid phone format, missing required fields, license number format |
| **User Fix** | 1. Check highlighted fields<br>2. Use format: (555) 123-4567 for phone<br>3. Ensure all required fields filled |
| **Admin Fix** | 1. Review validation rules in Zod schema<br>2. Check for locale-specific formatting issues<br>3. Verify field requirements |
| **Logs to Capture** | `user_id`, `validation_errors`, `form_data` (sanitized) |
| **Escalation** | Schema bug → Engineering |

#### RU-ONBD-003: Service Area Too Large
| Field | Value |
|-------|-------|
| **Error Code** | RU-ONBD-003 |
| **User Message** | "The service area you selected is too large. Please select a smaller region or fewer ZIP codes." |
| **Likely Causes** | Selected >50 ZIP codes, entire state selected |
| **User Fix** | 1. Select fewer ZIP codes (max 50)<br>2. Focus on your primary service area<br>3. You can expand later |
| **Admin Fix** | 1. Review ZIP code limit in config<br>2. Check for UI allowing over-selection<br>3. Consider tier-based limits |
| **Logs to Capture** | `provider_id`, `zip_count`, `selected_zips` |
| **Escalation** | Enterprise provider → Manual approval |

#### RU-ONBD-004: Duplicate Business Registration
| Field | Value |
|-------|-------|
| **Error Code** | RU-ONBD-004 |
| **User Message** | "A business with this name or license number is already registered. Contact support if this is your business." |
| **Likely Causes** | Same business registered by another user, duplicate submission |
| **User Fix** | 1. Check if you already have an account<br>2. Contact support with business proof<br>3. Use a different email if authorized |
| **Admin Fix** | 1. Search `providers` for duplicate<br>2. Verify business ownership<br>3. Merge accounts if same owner |
| **Logs to Capture** | `business_name`, `license_number`, `existing_provider_id` |
| **Escalation** | Ownership dispute → Legal review |

---

### PROP - Property Setup

#### RU-PROP-001: Address Not Found
| Field | Value |
|-------|-------|
| **Error Code** | RU-PROP-001 |
| **User Message** | "We couldn't verify this address. Please check the address or enter it manually." |
| **Likely Causes** | New construction, typo, address not in database |
| **User Fix** | 1. Double-check spelling<br>2. Use the manual entry option<br>3. Try without apartment/unit number first |
| **Admin Fix** | 1. Check address validation service status<br>2. Add address to manual approval queue<br>3. Verify against county records |
| **Logs to Capture** | `input_address`, `validation_service`, `error_response` |
| **Escalation** | Service outage → Switch to fallback |

#### RU-PROP-002: Property Limit Reached
| Field | Value |
|-------|-------|
| **Error Code** | RU-PROP-002 |
| **User Message** | "You've reached your property limit (2 free). Upgrade your plan to add more properties." |
| **Likely Causes** | Free tier limit, subscription lapsed |
| **User Fix** | 1. Go to Billing → Upgrade<br>2. Add properties at $2.50/month each<br>3. Remove unused properties first |
| **Admin Fix** | 1. Check `customers` table for plan<br>2. Verify billing status<br>3. Apply courtesy extension if needed |
| **Logs to Capture** | `user_id`, `current_property_count`, `plan_tier` |
| **Escalation** | None — billing flow |

#### RU-PROP-003: System Addition Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-PROP-003 |
| **User Message** | "We couldn't save this system information. Please try again." |
| **Likely Causes** | Database error, invalid system type, property not found |
| **User Fix** | 1. Refresh and try again<br>2. Check all required fields<br>3. Save property first, then add systems |
| **Admin Fix** | 1. Check `property_systems` table<br>2. Verify property_id exists<br>3. Check system_type enum |
| **Logs to Capture** | `property_id`, `system_type`, `db_error` |
| **Escalation** | Repeated failures → Engineering |

#### RU-PROP-004: Property Access Denied
| Field | Value |
|-------|-------|
| **Error Code** | RU-PROP-004 |
| **User Message** | "You don't have access to this property. Contact the property owner to request access." |
| **Likely Causes** | Not a member, access revoked, wrong property ID |
| **User Fix** | 1. Check you're logged into correct account<br>2. Request access from property owner<br>3. Contact support if you should have access |
| **Admin Fix** | 1. Check `property_members` for user<br>2. Verify property ownership<br>3. Add user if authorized |
| **Logs to Capture** | `user_id`, `property_id`, `requested_action` |
| **Escalation** | Dispute → Property owner verification |

#### RU-PROP-005: Duplicate Property
| Field | Value |
|-------|-------|
| **Error Code** | RU-PROP-005 |
| **User Message** | "This property is already in your account." |
| **Likely Causes** | Double submission, address normalization matched existing |
| **User Fix** | 1. Check your properties list<br>2. Property may already be added<br>3. Use search to find it |
| **Admin Fix** | 1. Check for duplicate addresses<br>2. Review address normalization logic<br>3. Merge if true duplicate |
| **Logs to Capture** | `user_id`, `address`, `existing_property_id` |
| **Escalation** | None — informational |

---

### BOOK - Bookings

#### RU-BOOK-001: No Providers Available
| Field | Value |
|-------|-------|
| **Error Code** | RU-BOOK-001 |
| **User Message** | "No providers are currently available in your area for this service. We'll notify you when one becomes available." |
| **Likely Causes** | No providers serve ZIP code, all providers busy, new service area |
| **User Fix** | 1. Try a different date/time<br>2. Expand service type (e.g., "General Handyman")<br>3. Join waitlist for notification |
| **Admin Fix** | 1. Check provider coverage for ZIP<br>2. Review provider availability settings<br>3. Recruit providers for area |
| **Logs to Capture** | `zip_code`, `service_type`, `requested_date`, `search_radius` |
| **Escalation** | Coverage gap → Territory Manager |

#### RU-BOOK-002: Time Slot Unavailable
| Field | Value |
|-------|-------|
| **Error Code** | RU-BOOK-002 |
| **User Message** | "This time slot is no longer available. Please select a different time." |
| **Likely Causes** | Slot booked by another user, provider schedule changed |
| **User Fix** | 1. Select a different time slot<br>2. Try a different day<br>3. Request earliest availability |
| **Admin Fix** | 1. Check provider calendar<br>2. Verify slot locking mechanism<br>3. Review race condition handling |
| **Logs to Capture** | `provider_id`, `requested_slot`, `current_bookings` |
| **Escalation** | Frequent conflicts → Calendar sync review |

#### RU-BOOK-003: Estimate Expired
| Field | Value |
|-------|-------|
| **Error Code** | RU-BOOK-003 |
| **User Message** | "This estimate has expired. Please request a new estimate from the provider." |
| **Likely Causes** | Estimate older than 14 days, provider updated pricing |
| **User Fix** | 1. Request new estimate<br>2. Message provider for updated quote<br>3. Check for newer estimates in your inbox |
| **Admin Fix** | 1. Check estimate expiry settings<br>2. Verify estimate timestamp<br>3. Allow extension if within 7 days |
| **Logs to Capture** | `estimate_id`, `created_at`, `expiry_date`, `provider_id` |
| **Escalation** | None — standard flow |

#### RU-BOOK-004: Booking Confirmation Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-BOOK-004 |
| **User Message** | "We couldn't confirm your booking. Your card was not charged. Please try again." |
| **Likely Causes** | Payment failed, provider calendar sync error, database timeout |
| **User Fix** | 1. Check your payment method<br>2. Try again in a few minutes<br>3. Contact support if persists |
| **Admin Fix** | 1. Check Stripe payment intent status<br>2. Review booking creation logs<br>3. Check provider availability lock |
| **Logs to Capture** | `booking_id`, `payment_intent_id`, `error_code`, `provider_id` |
| **Escalation** | Payment system error → Engineering |

#### RU-BOOK-005: Change Order Limit Exceeded
| Field | Value |
|-------|-------|
| **Error Code** | RU-BOOK-005 |
| **User Message** | "This change order exceeds the allowed limit. The homeowner must approve the additional charges." |
| **Likely Causes** | Change >12% or >$75 of original estimate, scope creep |
| **User Fix** | 1. Review change order details<br>2. Approve or request modification<br>3. Contact provider to discuss |
| **Admin Fix** | 1. Review change order history<br>2. Check threshold settings<br>3. Mediate if disputed |
| **Logs to Capture** | `booking_id`, `original_amount`, `change_amount`, `change_reason` |
| **Escalation** | Dispute → Operations review |

#### RU-BOOK-006: Provider Declined Job
| Field | Value |
|-------|-------|
| **Error Code** | RU-BOOK-006 |
| **User Message** | "The provider is unable to complete this job. We're finding you another qualified provider." |
| **Likely Causes** | Provider schedule conflict, outside expertise, equipment unavailable |
| **User Fix** | 1. Wait for new provider match<br>2. Review other available providers<br>3. Modify job requirements if needed |
| **Admin Fix** | 1. Log decline reason<br>2. Trigger re-dispatch<br>3. Review provider decline rate |
| **Logs to Capture** | `booking_id`, `provider_id`, `decline_reason`, `decline_count` |
| **Escalation** | High decline rate → Provider performance review |

#### RU-BOOK-007: Diagnostic Fee Required
| Field | Value |
|-------|-------|
| **Error Code** | RU-BOOK-007 |
| **User Message** | "A diagnostic fee of $[amount] is required to proceed. This fee is credited toward your final invoice." |
| **Likely Causes** | Service category requires upfront diagnostic (HVAC, plumbing, electrical) |
| **User Fix** | 1. Review fee details<br>2. Pay diagnostic fee to proceed<br>3. Fee applies to final invoice |
| **Admin Fix** | 1. Verify fee amount matches category<br>2. Check customer billing status<br>3. Apply waiver if authorized |
| **Logs to Capture** | `service_request_id`, `fee_amount`, `category`, `waiver_applied` |
| **Escalation** | None — standard flow |

---

### MSG - Messaging

#### RU-MSG-001: Message Send Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-MSG-001 |
| **User Message** | "Your message couldn't be sent. Please try again." |
| **Likely Causes** | Network error, thread archived, recipient blocked |
| **User Fix** | 1. Check internet connection<br>2. Refresh the page<br>3. Try sending again |
| **Admin Fix** | 1. Check message queue status<br>2. Verify thread is active<br>3. Check for blocked users |
| **Logs to Capture** | `thread_id`, `sender_id`, `recipient_id`, `error_type` |
| **Escalation** | System-wide → Engineering |

#### RU-MSG-002: Thread Not Found
| Field | Value |
|-------|-------|
| **Error Code** | RU-MSG-002 |
| **User Message** | "This conversation is no longer available." |
| **Likely Causes** | Thread deleted, booking cancelled, access revoked |
| **User Fix** | 1. Check your messages list<br>2. Start a new conversation if needed<br>3. Contact support if thread should exist |
| **Admin Fix** | 1. Check `message_threads` for soft delete<br>2. Verify user access permissions<br>3. Restore if accidentally deleted |
| **Logs to Capture** | `thread_id`, `user_id`, `deletion_reason` |
| **Escalation** | Data loss → Engineering review |

#### RU-MSG-003: Attachment Too Large
| Field | Value |
|-------|-------|
| **Error Code** | RU-MSG-003 |
| **User Message** | "This file is too large. Maximum size is 10MB." |
| **Likely Causes** | File exceeds 10MB limit, high-resolution photo |
| **User Fix** | 1. Reduce file size or resolution<br>2. Use a file compression tool<br>3. Send multiple smaller files |
| **Admin Fix** | 1. Review file size limits in config<br>2. Consider increasing limit<br>3. Add compression option |
| **Logs to Capture** | `file_size`, `file_type`, `user_id` |
| **Escalation** | None — user action required |

#### RU-MSG-004: Rate Limit Exceeded
| Field | Value |
|-------|-------|
| **Error Code** | RU-MSG-004 |
| **User Message** | "You're sending messages too quickly. Please wait a moment before trying again." |
| **Likely Causes** | Spam prevention triggered, automated sending detected |
| **User Fix** | 1. Wait 60 seconds<br>2. Send messages at normal pace<br>3. Contact support if incorrectly flagged |
| **Admin Fix** | 1. Review user message rate<br>2. Check for bot activity<br>3. Whitelist if legitimate |
| **Logs to Capture** | `user_id`, `message_count`, `time_window`, `ip_address` |
| **Escalation** | Suspected bot → Security review |

---

### UPLD - Uploads

#### RU-UPLD-001: Upload Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-UPLD-001 |
| **User Message** | "Upload failed. Please check your connection and try again." |
| **Likely Causes** | Network interruption, storage full, file corrupted |
| **User Fix** | 1. Check internet connection<br>2. Try a smaller file<br>3. Try a different browser |
| **Admin Fix** | 1. Check Supabase storage status<br>2. Verify bucket permissions<br>3. Check storage quota |
| **Logs to Capture** | `file_name`, `file_size`, `storage_error`, `user_id` |
| **Escalation** | Storage issues → Engineering |

#### RU-UPLD-002: Invalid File Type
| Field | Value |
|-------|-------|
| **Error Code** | RU-UPLD-002 |
| **User Message** | "This file type is not supported. Please upload JPG, PNG, PDF, or MP4 files." |
| **Likely Causes** | Unsupported format, wrong extension, HEIC from iPhone |
| **User Fix** | 1. Convert to supported format<br>2. For iPhone photos, enable "Most Compatible" in settings<br>3. Use JPG/PNG for images |
| **Admin Fix** | 1. Review allowed MIME types<br>2. Consider adding HEIC support<br>3. Add format conversion |
| **Logs to Capture** | `file_name`, `mime_type`, `expected_types` |
| **Escalation** | Feature request → Product review |

#### RU-UPLD-003: Video Too Long
| Field | Value |
|-------|-------|
| **Error Code** | RU-UPLD-003 |
| **User Message** | "Video must be between 10-30 seconds. Please trim your video and try again." |
| **Likely Causes** | Video exceeds 30 second limit, under 10 seconds |
| **User Fix** | 1. Trim video to 10-30 seconds<br>2. Use your phone's built-in editor<br>3. Focus on the key issue |
| **Admin Fix** | 1. Review duration limits<br>2. Check video processing pipeline<br>3. Consider limit adjustment |
| **Logs to Capture** | `video_duration`, `file_size`, `user_id` |
| **Escalation** | None — user action required |

#### RU-UPLD-004: Photo Quality Too Low
| Field | Value |
|-------|-------|
| **Error Code** | RU-UPLD-004 |
| **User Message** | "This photo is too blurry or low resolution. Please take a clearer photo." |
| **Likely Causes** | Camera shake, poor lighting, heavy compression |
| **User Fix** | 1. Hold phone steady<br>2. Ensure good lighting<br>3. Clean camera lens<br>4. Tap to focus before taking photo |
| **Admin Fix** | 1. Review quality threshold settings<br>2. Check AI quality detection<br>3. Allow manual override |
| **Logs to Capture** | `image_resolution`, `quality_score`, `rejection_reason` |
| **Escalation** | Quality threshold too strict → Product review |

#### RU-UPLD-005: Storage Quota Exceeded
| Field | Value |
|-------|-------|
| **Error Code** | RU-UPLD-005 |
| **User Message** | "You've reached your storage limit. Delete old files or upgrade your plan." |
| **Likely Causes** | Free tier limit reached, too many documents stored |
| **User Fix** | 1. Go to Home Binder → delete old documents<br>2. Upgrade plan for more storage<br>3. Download and remove completed job photos |
| **Admin Fix** | 1. Check user storage usage<br>2. Review retention policy<br>3. Apply courtesy extension |
| **Logs to Capture** | `user_id`, `storage_used`, `storage_limit`, `plan_tier` |
| **Escalation** | None — billing flow |

---

### NOTIF - Notifications

#### RU-NOTIF-001: Email Delivery Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-NOTIF-001 |
| **User Message** | "We couldn't send an email to your address. Please check your email settings." |
| **Likely Causes** | Invalid email, mailbox full, spam filter blocking |
| **User Fix** | 1. Check email address in profile<br>2. Add noreply@regularupkeep.com to contacts<br>3. Check spam folder |
| **Admin Fix** | 1. Check email delivery logs<br>2. Review bounce reasons<br>3. Verify email service status |
| **Logs to Capture** | `recipient_email`, `bounce_type`, `email_template`, `error_message` |
| **Escalation** | Deliverability issues → Email service review |

#### RU-NOTIF-002: SMS Delivery Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-NOTIF-002 |
| **User Message** | "We couldn't send a text to your phone number. Please verify your number." |
| **Likely Causes** | Invalid number, carrier block, DND enabled |
| **User Fix** | 1. Verify phone number in profile<br>2. Ensure you haven't blocked short codes<br>3. Check carrier settings |
| **Admin Fix** | 1. Check SMS provider status<br>2. Review carrier error codes<br>3. Try alternate SMS route |
| **Logs to Capture** | `phone_number`, `carrier`, `error_code`, `message_type` |
| **Escalation** | Carrier issues → SMS provider ticket |

#### RU-NOTIF-003: Push Notification Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-NOTIF-003 |
| **User Message** | "Push notifications aren't working. Please check your app settings." |
| **Likely Causes** | Notifications disabled, token expired, app not updated |
| **User Fix** | 1. Enable notifications in phone settings<br>2. Open app to refresh token<br>3. Update to latest app version |
| **Admin Fix** | 1. Check push token validity<br>2. Review FCM/APNs status<br>3. Resend notification |
| **Logs to Capture** | `device_token`, `platform`, `error_response`, `last_token_refresh` |
| **Escalation** | Token issues → Mobile team |

#### RU-NOTIF-004: Notification Preferences Error
| Field | Value |
|-------|-------|
| **Error Code** | RU-NOTIF-004 |
| **User Message** | "We couldn't save your notification preferences. Please try again." |
| **Likely Causes** | Database error, invalid preference combination |
| **User Fix** | 1. Refresh the page<br>2. Try saving one setting at a time<br>3. Contact support if persists |
| **Admin Fix** | 1. Check `notification_preferences` table<br>2. Verify user_id exists<br>3. Review constraint violations |
| **Logs to Capture** | `user_id`, `preference_changes`, `db_error` |
| **Escalation** | Database errors → Engineering |

---

### PAY - Payments

#### RU-PAY-001: Card Declined
| Field | Value |
|-------|-------|
| **Error Code** | RU-PAY-001 |
| **User Message** | "Your card was declined. Please try a different payment method or contact your bank." |
| **Likely Causes** | Insufficient funds, card expired, fraud block by bank |
| **User Fix** | 1. Check card balance<br>2. Contact your bank<br>3. Try a different card |
| **Admin Fix** | 1. Check Stripe decline code<br>2. Review for fraud signals<br>3. Do not disclose specific decline reason |
| **Logs to Capture** | `payment_intent_id`, `decline_code`, `card_last4`, `amount` |
| **Escalation** | None — user action required |

#### RU-PAY-002: Payment Processing Error
| Field | Value |
|-------|-------|
| **Error Code** | RU-PAY-002 |
| **User Message** | "We couldn't process your payment. Please try again in a few minutes." |
| **Likely Causes** | Stripe API error, network timeout, concurrent request |
| **User Fix** | 1. Wait 2-3 minutes<br>2. Refresh and try again<br>3. Do NOT retry multiple times (may double charge) |
| **Admin Fix** | 1. Check Stripe dashboard for status<br>2. Verify payment intent state<br>3. Check for duplicate charges |
| **Logs to Capture** | `payment_intent_id`, `stripe_error`, `amount`, `timestamp` |
| **Escalation** | Stripe outage → Status page update |

#### RU-PAY-003: Refund Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-PAY-003 |
| **User Message** | "We couldn't process your refund. Our team has been notified and will resolve this within 24 hours." |
| **Likely Causes** | Original charge too old, insufficient provider balance |
| **User Fix** | 1. No action needed<br>2. Support will contact you<br>3. Refund typically processed within 24h |
| **Admin Fix** | 1. Check original payment status<br>2. Verify refund amount ≤ charge<br>3. Process manual refund if needed |
| **Logs to Capture** | `payment_id`, `refund_amount`, `stripe_error`, `provider_balance` |
| **Escalation** | Immediate → Finance review |

#### RU-PAY-004: Invoice Generation Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-PAY-004 |
| **User Message** | "We couldn't generate your invoice. Please try again or contact support." |
| **Likely Causes** | Missing booking data, PDF generation error |
| **User Fix** | 1. Refresh and try again<br>2. Request invoice via support<br>3. Check booking is completed |
| **Admin Fix** | 1. Check booking/invoice data<br>2. Verify PDF service status<br>3. Generate manually if needed |
| **Logs to Capture** | `booking_id`, `invoice_data`, `generation_error` |
| **Escalation** | PDF service down → Engineering |

#### RU-PAY-005: Payout Delayed
| Field | Value |
|-------|-------|
| **Error Code** | RU-PAY-005 |
| **User Message** | "Your payout is delayed due to additional verification. This typically resolves within 2-3 business days." |
| **Likely Causes** | Dispute window active, Stripe verification, large amount |
| **User Fix** | 1. Check payout status in Money tab<br>2. Complete any pending verification<br>3. Contact support if >5 days |
| **Admin Fix** | 1. Check dispute window status (72h)<br>2. Review Stripe Connect verification<br>3. Process manual transfer if stuck |
| **Logs to Capture** | `provider_id`, `payout_amount`, `delay_reason`, `expected_date` |
| **Escalation** | >5 business days → Finance escalation |

#### RU-PAY-006: Stripe Connect Onboarding Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-PAY-006 |
| **User Message** | "We couldn't complete your payment account setup. Please try again or contact support." |
| **Likely Causes** | Verification failed, invalid bank info, identity mismatch |
| **User Fix** | 1. Ensure legal name matches ID<br>2. Double-check bank account number<br>3. Use a clear photo of your ID |
| **Admin Fix** | 1. Check Stripe Connect dashboard<br>2. Review verification requirements<br>3. Contact Stripe support if blocked |
| **Logs to Capture** | `provider_id`, `stripe_account_id`, `verification_status`, `requirements` |
| **Escalation** | Stripe verification stuck → Stripe support ticket |

---

### ADMIN - Admin

#### RU-ADMIN-001: Permission Denied
| Field | Value |
|-------|-------|
| **Error Code** | RU-ADMIN-001 |
| **User Message** | "You don't have permission to perform this action." |
| **Likely Causes** | Role insufficient, permission revoked, wrong account |
| **User Fix** | 1. Verify you're logged into correct account<br>2. Request permission from admin<br>3. Contact IT if role incorrect |
| **Admin Fix** | 1. Check `profiles.role` for user<br>2. Review permission requirements<br>3. Update role if authorized |
| **Logs to Capture** | `user_id`, `user_role`, `attempted_action`, `required_role` |
| **Escalation** | Unauthorized access attempt → Security review |

#### RU-ADMIN-002: Config Update Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-ADMIN-002 |
| **User Message** | "Configuration could not be saved. Please check values and try again." |
| **Likely Causes** | Invalid value, database constraint, concurrent edit |
| **User Fix** | 1. Check all values are valid<br>2. Refresh and try again<br>3. Contact engineering if urgent |
| **Admin Fix** | 1. Check `admin_config` table<br>2. Review validation rules<br>3. Check for constraint violations |
| **Logs to Capture** | `config_key`, `attempted_value`, `db_error`, `admin_id` |
| **Escalation** | Config critical → Engineering |

#### RU-ADMIN-003: User Not Found
| Field | Value |
|-------|-------|
| **Error Code** | RU-ADMIN-003 |
| **User Message** | "User not found. They may have been deleted or the ID is incorrect." |
| **Likely Causes** | User deleted, typo in user ID, soft-deleted account |
| **User Fix** | N/A (admin action) |
| **Admin Fix** | 1. Search by email instead of ID<br>2. Check soft-deleted users<br>3. Verify ID format |
| **Logs to Capture** | `searched_user_id`, `search_method`, `admin_id` |
| **Escalation** | None — retry with correct ID |

#### RU-ADMIN-004: Bulk Action Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-ADMIN-004 |
| **User Message** | "Bulk action partially failed. [X] of [Y] items processed successfully." |
| **Likely Causes** | Some items locked, timeout on large batch, individual validation failures |
| **User Fix** | N/A (admin action) |
| **Admin Fix** | 1. Review failed items list<br>2. Process failures individually<br>3. Check for locked records |
| **Logs to Capture** | `action_type`, `total_items`, `success_count`, `failure_reasons` |
| **Escalation** | >50% failure → Engineering review |

---

### INTG - Integrations

#### RU-INTG-001: Webhook Delivery Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-INTG-001 |
| **User Message** | N/A (system error) |
| **Likely Causes** | Endpoint down, invalid URL, timeout |
| **User Fix** | N/A |
| **Admin Fix** | 1. Check webhook endpoint status<br>2. Review delivery logs<br>3. Retry or disable webhook |
| **Logs to Capture** | `webhook_url`, `event_type`, `response_code`, `retry_count` |
| **Escalation** | Critical webhook (Stripe) → Immediate |

#### RU-INTG-002: API Rate Limit
| Field | Value |
|-------|-------|
| **Error Code** | RU-INTG-002 |
| **User Message** | "Service temporarily unavailable. Please try again in a few minutes." |
| **Likely Causes** | Third-party API rate limit hit (Google, Stripe, etc.) |
| **User Fix** | 1. Wait 5 minutes<br>2. Try again<br>3. Contact support if urgent |
| **Admin Fix** | 1. Check API usage dashboard<br>2. Implement request queuing<br>3. Request rate limit increase |
| **Logs to Capture** | `api_provider`, `endpoint`, `rate_limit_header`, `request_count` |
| **Escalation** | Stripe rate limit → Engineering |

#### RU-INTG-003: AI Service Unavailable
| Field | Value |
|-------|-------|
| **Error Code** | RU-INTG-003 |
| **User Message** | "AI features are temporarily unavailable. You can continue without AI assistance." |
| **Likely Causes** | OpenAI/Anthropic API down, rate limit, budget exceeded |
| **User Fix** | 1. Continue without AI<br>2. Manually enter information<br>3. Try again in a few minutes |
| **Admin Fix** | 1. Check AI provider status page<br>2. Verify API keys<br>3. Check budget limits<br>4. Enable fallback mode |
| **Logs to Capture** | `ai_provider`, `task_type`, `error_response`, `fallback_used` |
| **Escalation** | Extended outage → Status page update |

#### RU-INTG-004: Calendar Sync Failed
| Field | Value |
|-------|-------|
| **Error Code** | RU-INTG-004 |
| **User Message** | "We couldn't sync with your calendar. Please reconnect your calendar in settings." |
| **Likely Causes** | OAuth token expired, calendar permissions revoked |
| **User Fix** | 1. Go to Settings → Integrations<br>2. Disconnect and reconnect calendar<br>3. Grant all requested permissions |
| **Admin Fix** | 1. Check OAuth token status<br>2. Verify calendar API permissions<br>3. Refresh tokens if possible |
| **Logs to Capture** | `user_id`, `calendar_provider`, `oauth_error`, `last_sync` |
| **Escalation** | Provider API change → Engineering |

---

### API - API/System

#### RU-API-400: Bad Request
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-400 |
| **User Message** | "Something went wrong with your request. Please refresh and try again." |
| **Likely Causes** | Invalid request data, missing required fields, malformed JSON |
| **User Fix** | 1. Refresh the page<br>2. Re-enter information<br>3. Clear browser cache |
| **Admin Fix** | 1. Check request validation logs<br>2. Review API schema<br>3. Fix client-side validation |
| **Logs to Capture** | `endpoint`, `request_body`, `validation_errors`, `user_agent` |
| **Escalation** | Recurring → Engineering fix |

#### RU-API-401: Unauthorized
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-401 |
| **User Message** | "Your session has expired. Please log in again." |
| **Likely Causes** | Token expired, invalid token, user logged out elsewhere |
| **User Fix** | 1. Log in again<br>2. Check if logged out on another device<br>3. Clear cookies and retry |
| **Admin Fix** | 1. Check token expiry settings<br>2. Review auth middleware<br>3. Verify Supabase auth status |
| **Logs to Capture** | `user_id`, `token_expiry`, `request_path` |
| **Escalation** | Auth system issues → Engineering |

#### RU-API-403: Forbidden
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-403 |
| **User Message** | "You don't have access to this resource." |
| **Likely Causes** | RLS policy blocking, role insufficient, resource not owned |
| **User Fix** | 1. Check you're accessing correct resource<br>2. Request access from owner<br>3. Contact support |
| **Admin Fix** | 1. Review RLS policies<br>2. Check resource ownership<br>3. Verify user role |
| **Logs to Capture** | `user_id`, `resource_type`, `resource_id`, `rls_policy` |
| **Escalation** | RLS bug → Engineering |

#### RU-API-404: Not Found
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-404 |
| **User Message** | "The page or resource you're looking for doesn't exist." |
| **Likely Causes** | Deleted resource, invalid URL, typo in link |
| **User Fix** | 1. Check URL is correct<br>2. Go back to previous page<br>3. Use navigation menu |
| **Admin Fix** | 1. Check if resource was deleted<br>2. Review redirect rules<br>3. Fix broken links |
| **Logs to Capture** | `requested_url`, `referrer`, `user_id` |
| **Escalation** | Broken production links → Engineering |

#### RU-API-429: Rate Limited
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-429 |
| **User Message** | "You've made too many requests. Please wait a moment before trying again." |
| **Likely Causes** | Automated requests, refresh spam, attack attempt |
| **User Fix** | 1. Wait 60 seconds<br>2. Avoid rapid clicking<br>3. Contact support if legitimate |
| **Admin Fix** | 1. Check request patterns<br>2. Review rate limit thresholds<br>3. Whitelist if legitimate automation |
| **Logs to Capture** | `user_id`, `ip_address`, `endpoint`, `request_count`, `window` |
| **Escalation** | Attack pattern → Security team |

#### RU-API-500: Internal Server Error
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-500 |
| **User Message** | "Something went wrong on our end. Please try again later." |
| **Likely Causes** | Unhandled exception, database error, service crash |
| **User Fix** | 1. Wait a few minutes<br>2. Try again<br>3. Contact support if persists |
| **Admin Fix** | 1. Check error logs immediately<br>2. Identify stack trace<br>3. Deploy hotfix if needed |
| **Logs to Capture** | `stack_trace`, `request_path`, `user_id`, `timestamp` |
| **Escalation** | Immediate → Engineering on-call |

#### RU-API-502: Bad Gateway
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-502 |
| **User Message** | "Our servers are temporarily unavailable. Please try again in a few minutes." |
| **Likely Causes** | Upstream server down, nginx misconfiguration, PM2 crash |
| **User Fix** | 1. Wait 2-3 minutes<br>2. Refresh page<br>3. Check status.regularupkeep.com |
| **Admin Fix** | 1. Check PM2 status<br>2. Review nginx logs<br>3. Restart services if needed |
| **Logs to Capture** | `nginx_error_log`, `pm2_status`, `upstream_response` |
| **Escalation** | Immediate → Infrastructure |

#### RU-API-503: Service Unavailable
| Field | Value |
|-------|-------|
| **Error Code** | RU-API-503 |
| **User Message** | "We're performing maintenance. Please check back shortly." |
| **Likely Causes** | Planned maintenance, deployment in progress, server overload |
| **User Fix** | 1. Wait for maintenance to complete<br>2. Check status page<br>3. Try again in 15 minutes |
| **Admin Fix** | 1. Verify maintenance window<br>2. Check deployment status<br>3. Scale resources if overloaded |
| **Logs to Capture** | `server_status`, `load_average`, `deployment_status` |
| **Escalation** | Unplanned → Engineering immediate |

---

### UNK - Unknown

#### RU-UNK-001: Unclassified Error
| Field | Value |
|-------|-------|
| **Error Code** | RU-UNK-001 |
| **User Message** | "An unexpected error occurred. Our team has been notified." |
| **Likely Causes** | New/uncategorized error, edge case, third-party issue |
| **User Fix** | 1. Try refreshing the page<br>2. Log out and back in<br>3. Contact support with error ID |
| **Admin Fix** | 1. Review error logs with error_id<br>2. Categorize and create proper error code<br>3. Implement proper handling |
| **Logs to Capture** | `error_id`, `stack_trace`, `user_actions`, `device_info` |
| **Escalation** | New error types → Triage and categorize |

---

## Error Intake Form Template

### Admin Dashboard: Log New Error

```
┌─────────────────────────────────────────────────────────────┐
│                    LOG NEW ERROR                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Error Code: [____________] (auto-suggest or create new)    │
│                                                             │
│  Category: [▼ Select Category ]                             │
│    ○ AUTH - Authentication/Login                            │
│    ○ ONBD - Onboarding                                      │
│    ○ PROP - Property Setup                                  │
│    ○ BOOK - Bookings                                        │
│    ○ MSG - Messaging                                        │
│    ○ UPLD - Uploads                                         │
│    ○ NOTIF - Notifications                                  │
│    ○ PAY - Payments                                         │
│    ○ ADMIN - Admin                                          │
│    ○ INTG - Integrations                                    │
│    ○ API - API/System                                       │
│    ○ UNK - Unknown                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  REPORTER INFORMATION                                       │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Reporter Type: ○ User  ○ Admin  ○ System Alert             │
│                                                             │
│  User ID: [____________] (if user-reported)                 │
│                                                             │
│  User Email: [________________________]                     │
│                                                             │
│  User Role: [▼ Select ]                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ENVIRONMENT                                                │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Platform: ○ Web  ○ iOS  ○ Android                          │
│                                                             │
│  Browser/App Version: [________________________]            │
│    (e.g., Chrome 120.0, iOS App 2.3.1)                     │
│                                                             │
│  Device: [________________________]                         │
│    (e.g., iPhone 15, Windows 11, MacBook Pro)              │
│                                                             │
│  Screen Size: [____] x [____] px                            │
│                                                             │
│  Network: ○ WiFi  ○ Cellular  ○ Unknown                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ERROR DETAILS                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Error Message Shown to User:                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Technical Error (from logs):                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Steps to Reproduce:                                        │
│  1. [________________________________________]              │
│  2. [________________________________________]              │
│  3. [________________________________________]              │
│  4. [________________________________________]              │
│  [+ Add Step]                                               │
│                                                             │
│  Expected Behavior:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Actual Behavior:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  ATTACHMENTS                                                │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Screenshots: [📎 Upload Files] (max 5, 10MB each)          │
│                                                             │
│  Screen Recording: [📎 Upload Video] (max 2min)             │
│                                                             │
│  Console Logs: [📎 Upload File]                             │
│                                                             │
│  Network HAR: [📎 Upload File]                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  IMPACT & PRIORITY                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Severity: ○ Critical  ○ High  ○ Medium  ○ Low              │
│                                                             │
│  Affected Users:                                            │
│    ○ Single user                                            │
│    ○ Multiple users (estimated: [____])                     │
│    ○ All users                                              │
│    ○ Specific role: [▼ Select ]                             │
│                                                             │
│  Workaround Available: ○ Yes  ○ No                          │
│                                                             │
│  Workaround Description:                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  RELATED DATA                                               │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Request ID: [________________________]                     │
│                                                             │
│  Session ID: [________________________]                     │
│                                                             │
│  Related Booking ID: [____________]                         │
│                                                             │
│  Related Property ID: [____________]                        │
│                                                             │
│  Timestamp (UTC): [____-__-__ __:__:__]                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│           [Cancel]              [Save Draft]    [Submit]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Required Fields by Severity

| Field | Critical | High | Medium | Low |
|-------|----------|------|--------|-----|
| Error Code | ✓ | ✓ | ✓ | ✓ |
| Category | ✓ | ✓ | ✓ | ✓ |
| Error Message | ✓ | ✓ | ✓ | ✓ |
| Steps to Reproduce | ✓ | ✓ | ✓ | ○ |
| Screenshot | ✓ | ✓ | ○ | ○ |
| Technical Error | ✓ | ✓ | ○ | ○ |
| Affected Users | ✓ | ✓ | ○ | ○ |
| Request ID | ✓ | ○ | ○ | ○ |

✓ = Required, ○ = Optional

---

## Claude Code Fix Prompt Template

Use this template when escalating an error to engineering for a code fix:

````markdown
## Error Investigation: {ERROR_CODE}

### Error Summary
- **Error Code**: {ERROR_CODE}
- **Category**: {CATEGORY}
- **Severity**: {SEVERITY}
- **First Reported**: {TIMESTAMP}
- **Occurrences**: {COUNT} in last {TIME_WINDOW}

### User-Facing Message
```
{USER_MESSAGE}
```

### Technical Error
```
{STACK_TRACE_OR_ERROR_LOG}
```

### Reproduction Steps
1. {STEP_1}
2. {STEP_2}
3. {STEP_3}

### Environment
- Platform: {PLATFORM}
- Browser/App: {BROWSER_VERSION}
- Device: {DEVICE}

### Relevant Logs
```
{SANITIZED_LOGS}
```

### Database State (if applicable)
```sql
-- Relevant query or state
{DB_QUERY_RESULT}
```

### Related Code Files
- {FILE_PATH_1}
- {FILE_PATH_2}

---

## Task for Claude Code

Please analyze this error and provide:

1. **Root Cause Analysis**
   - What is the most likely cause of this error?
   - What conditions trigger it?
   - Is this a regression or new issue?

2. **Affected Code Paths**
   - Which files/functions are involved?
   - What is the call stack?

3. **Proposed Fix**
   - Specific code changes needed
   - Include the actual patch/diff
   - Explain why this fix addresses the root cause

4. **Risk Assessment**
   - What could this fix break?
   - Are there edge cases to consider?
   - Should this be behind a feature flag?

5. **Test Plan**
   - Unit tests to add
   - Integration tests to add
   - Manual test cases to verify

6. **Rollout Recommendation**
   - Immediate hotfix?
   - Standard release?
   - Staged rollout?

Please search the codebase, read relevant files, and provide specific code changes.
````

### Example Filled Template

````markdown
## Error Investigation: RU-PAY-003

### Error Summary
- **Error Code**: RU-PAY-003
- **Category**: PAY - Payments
- **Severity**: High
- **First Reported**: 2025-12-24 10:15:00 UTC
- **Occurrences**: 7 in last 24 hours

### User-Facing Message
```
We couldn't process your refund. Our team has been notified and will resolve this within 24 hours.
```

### Technical Error
```
StripeInvalidRequestError: This charge has already been refunded.
    at /root/RegularUpkeep-app/src/app/api/admin/disputes/[id]/resolve/route.ts:87:15
    at processRefund (/root/RegularUpkeep-app/src/lib/stripe/refunds.ts:42:11)
```

### Reproduction Steps
1. Admin opens dispute #1234
2. Clicks "Full Refund" button
3. Error appears
4. Checking Stripe dashboard shows refund was already processed

### Environment
- Platform: Web
- Browser/App: Chrome 120.0
- Device: Windows 11

### Relevant Logs
```
2025-12-24T10:15:00Z [ERROR] Refund failed for payment_intent pi_3QXxx
2025-12-24T10:15:00Z [DEBUG] Stripe response: {"error":{"code":"charge_already_refunded"}}
2025-12-24T10:14:55Z [INFO] Admin user_abc initiated refund for dispute_1234
```

### Database State
```sql
SELECT id, stripe_refund_id, status FROM refunds WHERE payment_id = 'pi_3QXxx';
-- Returns: id=rf_123, stripe_refund_id=re_xxx, status='completed'
```

### Related Code Files
- src/app/api/admin/disputes/[id]/resolve/route.ts
- src/lib/stripe/refunds.ts

---

## Task for Claude Code

Please analyze this error and provide:

1. **Root Cause Analysis**
2. **Affected Code Paths**
3. **Proposed Fix**
4. **Risk Assessment**
5. **Test Plan**
6. **Rollout Recommendation**

Please search the codebase, read relevant files, and provide specific code changes.
````

---

## Escalation Matrix

| Severity | Response Time | Resolution Target | Escalation Path |
|----------|---------------|-------------------|-----------------|
| **Critical** | 15 minutes | 2 hours | Support → Engineering On-Call → CTO |
| **High** | 1 hour | 8 hours | Support → Engineering Lead |
| **Medium** | 4 hours | 48 hours | Support → Engineering Queue |
| **Low** | 24 hours | 1 week | Support → Backlog |

### Severity Definitions

| Severity | Definition | Examples |
|----------|------------|----------|
| **Critical** | Service down, payments broken, data loss | RU-API-500 (widespread), RU-PAY-002, RU-API-502 |
| **High** | Major feature broken, many users affected | RU-AUTH-003, RU-BOOK-004, RU-PAY-001 (high volume) |
| **Medium** | Feature degraded, workaround available | RU-UPLD-001, RU-MSG-001, RU-NOTIF-001 |
| **Low** | Minor issue, few users, cosmetic | RU-UPLD-004, RU-MSG-003, UI glitches |

### Auto-Escalation Triggers

| Condition | Action |
|-----------|--------|
| Same error 10+ times in 1 hour | Auto-escalate to High |
| Payment errors 5+ times in 15 min | Auto-escalate to Critical |
| API 5xx errors >1% of traffic | Page on-call engineer |
| User reports same error 3+ times | Escalate to Tier 2 |

---

## JSON Error Catalog

```json
{
  "error_catalog": {
    "version": "1.0",
    "last_updated": "2025-12-24",
    "categories": [
      {
        "code": "AUTH",
        "name": "Authentication/Login",
        "owner": "Auth Team"
      },
      {
        "code": "ONBD",
        "name": "Onboarding",
        "owner": "Product"
      },
      {
        "code": "PROP",
        "name": "Property Setup",
        "owner": "Product"
      },
      {
        "code": "BOOK",
        "name": "Bookings",
        "owner": "Operations"
      },
      {
        "code": "MSG",
        "name": "Messaging",
        "owner": "Product"
      },
      {
        "code": "UPLD",
        "name": "Uploads",
        "owner": "Engineering"
      },
      {
        "code": "NOTIF",
        "name": "Notifications",
        "owner": "Engineering"
      },
      {
        "code": "PAY",
        "name": "Payments",
        "owner": "Finance/Engineering"
      },
      {
        "code": "ADMIN",
        "name": "Admin",
        "owner": "Admin Team"
      },
      {
        "code": "INTG",
        "name": "Integrations",
        "owner": "Engineering"
      },
      {
        "code": "API",
        "name": "API/System",
        "owner": "Engineering"
      },
      {
        "code": "UNK",
        "name": "Unknown",
        "owner": "Triage"
      }
    ],
    "errors": [
      {
        "error_code": "RU-AUTH-001",
        "category": "AUTH",
        "user_message": "Please enter a valid email address.",
        "likely_causes": ["Typo in email", "Missing @ symbol", "Invalid domain"],
        "user_fix": ["Check email for typos", "Ensure format is name@domain.com", "Try a different email"],
        "admin_fix": ["Check input validation regex", "Review allowed email domains", "Check for encoding issues"],
        "logs_to_capture": ["input_value", "validation_error", "timestamp", "user_agent"],
        "escalation_threshold": "3+ occurrences same user → Tier 2"
      },
      {
        "error_code": "RU-AUTH-002",
        "category": "AUTH",
        "user_message": "The password you entered is incorrect. Please try again or reset your password.",
        "likely_causes": ["Wrong password", "Caps lock on", "Copy-paste whitespace"],
        "user_fix": ["Check caps lock", "Try typing password manually", "Use 'Forgot Password' to reset"],
        "admin_fix": ["Check auth logs for user", "Verify account not locked", "Check for brute force attempts"],
        "logs_to_capture": ["user_email", "attempt_count", "ip_address", "timestamp"],
        "escalation_threshold": "5 failed attempts → Auto-lock, notify user"
      },
      {
        "error_code": "RU-AUTH-003",
        "category": "AUTH",
        "user_message": "Your account has been temporarily locked due to too many failed login attempts. Please try again in 30 minutes or contact support.",
        "likely_causes": ["5+ failed password attempts", "Suspicious activity detected"],
        "user_fix": ["Wait 30 minutes", "Reset password via email", "Contact support if urgent"],
        "admin_fix": ["Check auth.users for lockout status", "Review IP/device for fraud signals", "Manually unlock if legitimate"],
        "logs_to_capture": ["user_id", "lockout_reason", "failed_attempts", "ip_addresses"],
        "escalation_threshold": "Immediate if user claims account compromise"
      },
      {
        "error_code": "RU-AUTH-004",
        "category": "AUTH",
        "user_message": "Your session has expired. Please log in again.",
        "likely_causes": ["Idle timeout (24h)", "Token refresh failed", "Cleared cookies"],
        "user_fix": ["Log in again", "Enable cookies if disabled", "Check browser privacy settings"],
        "admin_fix": ["Check Supabase auth token expiry settings", "Review refresh token logic", "Check for JWT clock skew"],
        "logs_to_capture": ["session_id", "token_expiry", "last_activity", "refresh_attempt"],
        "escalation_threshold": "Frequent occurrences → Engineering review"
      },
      {
        "error_code": "RU-AUTH-005",
        "category": "AUTH",
        "user_message": "Please verify your email address before logging in. Check your inbox for a verification link.",
        "likely_causes": ["User didn't click verification link", "Email in spam"],
        "user_fix": ["Check inbox and spam folder", "Click 'Resend verification email'", "Check email is correct"],
        "admin_fix": ["Check if verification email was sent", "Manually verify if user confirms ownership", "Check email delivery logs"],
        "logs_to_capture": ["user_email", "verification_sent_at", "email_status"],
        "escalation_threshold": "3+ resend requests → Manual verification"
      },
      {
        "error_code": "RU-AUTH-006",
        "category": "AUTH",
        "user_message": "We couldn't sign you in with [Provider]. Please try again or use email/password.",
        "likely_causes": ["Google/Apple OAuth failure", "Popup blocked", "Provider outage"],
        "user_fix": ["Allow popups for regularupkeep.com", "Try a different browser", "Use email/password login"],
        "admin_fix": ["Check OAuth provider status", "Verify OAuth credentials in Supabase", "Check callback URL configuration"],
        "logs_to_capture": ["provider", "oauth_error", "redirect_uri", "timestamp"],
        "escalation_threshold": "Provider-wide outage → Status page update"
      },
      {
        "error_code": "RU-ONBD-001",
        "category": "ONBD",
        "user_message": "We couldn't save your account type. Please try again.",
        "likely_causes": ["Database write failed", "Session lost during selection"],
        "user_fix": ["Refresh the page", "Log out and back in", "Try a different browser"],
        "admin_fix": ["Check profiles table for user", "Verify role enum value", "Check database connection"],
        "logs_to_capture": ["user_id", "selected_role", "db_error", "timestamp"],
        "escalation_threshold": "Database errors → Engineering immediate"
      },
      {
        "error_code": "RU-ONBD-002",
        "category": "ONBD",
        "user_message": "Please check your business information. Some fields need correction.",
        "likely_causes": ["Invalid phone format", "Missing required fields", "License number format"],
        "user_fix": ["Check highlighted fields", "Use format: (555) 123-4567 for phone", "Ensure all required fields filled"],
        "admin_fix": ["Review validation rules in Zod schema", "Check for locale-specific formatting issues", "Verify field requirements"],
        "logs_to_capture": ["user_id", "validation_errors", "form_data (sanitized)"],
        "escalation_threshold": "Schema bug → Engineering"
      },
      {
        "error_code": "RU-ONBD-003",
        "category": "ONBD",
        "user_message": "The service area you selected is too large. Please select a smaller region or fewer ZIP codes.",
        "likely_causes": ["Selected >50 ZIP codes", "Entire state selected"],
        "user_fix": ["Select fewer ZIP codes (max 50)", "Focus on your primary service area", "You can expand later"],
        "admin_fix": ["Review ZIP code limit in config", "Check for UI allowing over-selection", "Consider tier-based limits"],
        "logs_to_capture": ["provider_id", "zip_count", "selected_zips"],
        "escalation_threshold": "Enterprise provider → Manual approval"
      },
      {
        "error_code": "RU-ONBD-004",
        "category": "ONBD",
        "user_message": "A business with this name or license number is already registered. Contact support if this is your business.",
        "likely_causes": ["Same business registered by another user", "Duplicate submission"],
        "user_fix": ["Check if you already have an account", "Contact support with business proof", "Use a different email if authorized"],
        "admin_fix": ["Search providers for duplicate", "Verify business ownership", "Merge accounts if same owner"],
        "logs_to_capture": ["business_name", "license_number", "existing_provider_id"],
        "escalation_threshold": "Ownership dispute → Legal review"
      },
      {
        "error_code": "RU-PROP-001",
        "category": "PROP",
        "user_message": "We couldn't verify this address. Please check the address or enter it manually.",
        "likely_causes": ["New construction", "Typo", "Address not in database"],
        "user_fix": ["Double-check spelling", "Use the manual entry option", "Try without apartment/unit number first"],
        "admin_fix": ["Check address validation service status", "Add address to manual approval queue", "Verify against county records"],
        "logs_to_capture": ["input_address", "validation_service", "error_response"],
        "escalation_threshold": "Service outage → Switch to fallback"
      },
      {
        "error_code": "RU-PROP-002",
        "category": "PROP",
        "user_message": "You've reached your property limit (2 free). Upgrade your plan to add more properties.",
        "likely_causes": ["Free tier limit", "Subscription lapsed"],
        "user_fix": ["Go to Billing → Upgrade", "Add properties at $2.50/month each", "Remove unused properties first"],
        "admin_fix": ["Check customers table for plan", "Verify billing status", "Apply courtesy extension if needed"],
        "logs_to_capture": ["user_id", "current_property_count", "plan_tier"],
        "escalation_threshold": "None — billing flow"
      },
      {
        "error_code": "RU-PROP-003",
        "category": "PROP",
        "user_message": "We couldn't save this system information. Please try again.",
        "likely_causes": ["Database error", "Invalid system type", "Property not found"],
        "user_fix": ["Refresh and try again", "Check all required fields", "Save property first, then add systems"],
        "admin_fix": ["Check property_systems table", "Verify property_id exists", "Check system_type enum"],
        "logs_to_capture": ["property_id", "system_type", "db_error"],
        "escalation_threshold": "Repeated failures → Engineering"
      },
      {
        "error_code": "RU-PROP-004",
        "category": "PROP",
        "user_message": "You don't have access to this property. Contact the property owner to request access.",
        "likely_causes": ["Not a member", "Access revoked", "Wrong property ID"],
        "user_fix": ["Check you're logged into correct account", "Request access from property owner", "Contact support if you should have access"],
        "admin_fix": ["Check property_members for user", "Verify property ownership", "Add user if authorized"],
        "logs_to_capture": ["user_id", "property_id", "requested_action"],
        "escalation_threshold": "Dispute → Property owner verification"
      },
      {
        "error_code": "RU-PROP-005",
        "category": "PROP",
        "user_message": "This property is already in your account.",
        "likely_causes": ["Double submission", "Address normalization matched existing"],
        "user_fix": ["Check your properties list", "Property may already be added", "Use search to find it"],
        "admin_fix": ["Check for duplicate addresses", "Review address normalization logic", "Merge if true duplicate"],
        "logs_to_capture": ["user_id", "address", "existing_property_id"],
        "escalation_threshold": "None — informational"
      },
      {
        "error_code": "RU-BOOK-001",
        "category": "BOOK",
        "user_message": "No providers are currently available in your area for this service. We'll notify you when one becomes available.",
        "likely_causes": ["No providers serve ZIP code", "All providers busy", "New service area"],
        "user_fix": ["Try a different date/time", "Expand service type", "Join waitlist for notification"],
        "admin_fix": ["Check provider coverage for ZIP", "Review provider availability settings", "Recruit providers for area"],
        "logs_to_capture": ["zip_code", "service_type", "requested_date", "search_radius"],
        "escalation_threshold": "Coverage gap → Territory Manager"
      },
      {
        "error_code": "RU-BOOK-002",
        "category": "BOOK",
        "user_message": "This time slot is no longer available. Please select a different time.",
        "likely_causes": ["Slot booked by another user", "Provider schedule changed"],
        "user_fix": ["Select a different time slot", "Try a different day", "Request earliest availability"],
        "admin_fix": ["Check provider calendar", "Verify slot locking mechanism", "Review race condition handling"],
        "logs_to_capture": ["provider_id", "requested_slot", "current_bookings"],
        "escalation_threshold": "Frequent conflicts → Calendar sync review"
      },
      {
        "error_code": "RU-BOOK-003",
        "category": "BOOK",
        "user_message": "This estimate has expired. Please request a new estimate from the provider.",
        "likely_causes": ["Estimate older than 14 days", "Provider updated pricing"],
        "user_fix": ["Request new estimate", "Message provider for updated quote", "Check for newer estimates in your inbox"],
        "admin_fix": ["Check estimate expiry settings", "Verify estimate timestamp", "Allow extension if within 7 days"],
        "logs_to_capture": ["estimate_id", "created_at", "expiry_date", "provider_id"],
        "escalation_threshold": "None — standard flow"
      },
      {
        "error_code": "RU-BOOK-004",
        "category": "BOOK",
        "user_message": "We couldn't confirm your booking. Your card was not charged. Please try again.",
        "likely_causes": ["Payment failed", "Provider calendar sync error", "Database timeout"],
        "user_fix": ["Check your payment method", "Try again in a few minutes", "Contact support if persists"],
        "admin_fix": ["Check Stripe payment intent status", "Review booking creation logs", "Check provider availability lock"],
        "logs_to_capture": ["booking_id", "payment_intent_id", "error_code", "provider_id"],
        "escalation_threshold": "Payment system error → Engineering"
      },
      {
        "error_code": "RU-BOOK-005",
        "category": "BOOK",
        "user_message": "This change order exceeds the allowed limit. The homeowner must approve the additional charges.",
        "likely_causes": ["Change >12% or >$75 of original estimate", "Scope creep"],
        "user_fix": ["Review change order details", "Approve or request modification", "Contact provider to discuss"],
        "admin_fix": ["Review change order history", "Check threshold settings", "Mediate if disputed"],
        "logs_to_capture": ["booking_id", "original_amount", "change_amount", "change_reason"],
        "escalation_threshold": "Dispute → Operations review"
      },
      {
        "error_code": "RU-BOOK-006",
        "category": "BOOK",
        "user_message": "The provider is unable to complete this job. We're finding you another qualified provider.",
        "likely_causes": ["Provider schedule conflict", "Outside expertise", "Equipment unavailable"],
        "user_fix": ["Wait for new provider match", "Review other available providers", "Modify job requirements if needed"],
        "admin_fix": ["Log decline reason", "Trigger re-dispatch", "Review provider decline rate"],
        "logs_to_capture": ["booking_id", "provider_id", "decline_reason", "decline_count"],
        "escalation_threshold": "High decline rate → Provider performance review"
      },
      {
        "error_code": "RU-BOOK-007",
        "category": "BOOK",
        "user_message": "A diagnostic fee of $[amount] is required to proceed. This fee is credited toward your final invoice.",
        "likely_causes": ["Service category requires upfront diagnostic"],
        "user_fix": ["Review fee details", "Pay diagnostic fee to proceed", "Fee applies to final invoice"],
        "admin_fix": ["Verify fee amount matches category", "Check customer billing status", "Apply waiver if authorized"],
        "logs_to_capture": ["service_request_id", "fee_amount", "category", "waiver_applied"],
        "escalation_threshold": "None — standard flow"
      },
      {
        "error_code": "RU-MSG-001",
        "category": "MSG",
        "user_message": "Your message couldn't be sent. Please try again.",
        "likely_causes": ["Network error", "Thread archived", "Recipient blocked"],
        "user_fix": ["Check internet connection", "Refresh the page", "Try sending again"],
        "admin_fix": ["Check message queue status", "Verify thread is active", "Check for blocked users"],
        "logs_to_capture": ["thread_id", "sender_id", "recipient_id", "error_type"],
        "escalation_threshold": "System-wide → Engineering"
      },
      {
        "error_code": "RU-MSG-002",
        "category": "MSG",
        "user_message": "This conversation is no longer available.",
        "likely_causes": ["Thread deleted", "Booking cancelled", "Access revoked"],
        "user_fix": ["Check your messages list", "Start a new conversation if needed", "Contact support if thread should exist"],
        "admin_fix": ["Check message_threads for soft delete", "Verify user access permissions", "Restore if accidentally deleted"],
        "logs_to_capture": ["thread_id", "user_id", "deletion_reason"],
        "escalation_threshold": "Data loss → Engineering review"
      },
      {
        "error_code": "RU-MSG-003",
        "category": "MSG",
        "user_message": "This file is too large. Maximum size is 10MB.",
        "likely_causes": ["File exceeds 10MB limit", "High-resolution photo"],
        "user_fix": ["Reduce file size or resolution", "Use a file compression tool", "Send multiple smaller files"],
        "admin_fix": ["Review file size limits in config", "Consider increasing limit", "Add compression option"],
        "logs_to_capture": ["file_size", "file_type", "user_id"],
        "escalation_threshold": "None — user action required"
      },
      {
        "error_code": "RU-MSG-004",
        "category": "MSG",
        "user_message": "You're sending messages too quickly. Please wait a moment before trying again.",
        "likely_causes": ["Spam prevention triggered", "Automated sending detected"],
        "user_fix": ["Wait 60 seconds", "Send messages at normal pace", "Contact support if incorrectly flagged"],
        "admin_fix": ["Review user message rate", "Check for bot activity", "Whitelist if legitimate"],
        "logs_to_capture": ["user_id", "message_count", "time_window", "ip_address"],
        "escalation_threshold": "Suspected bot → Security review"
      },
      {
        "error_code": "RU-UPLD-001",
        "category": "UPLD",
        "user_message": "Upload failed. Please check your connection and try again.",
        "likely_causes": ["Network interruption", "Storage full", "File corrupted"],
        "user_fix": ["Check internet connection", "Try a smaller file", "Try a different browser"],
        "admin_fix": ["Check Supabase storage status", "Verify bucket permissions", "Check storage quota"],
        "logs_to_capture": ["file_name", "file_size", "storage_error", "user_id"],
        "escalation_threshold": "Storage issues → Engineering"
      },
      {
        "error_code": "RU-UPLD-002",
        "category": "UPLD",
        "user_message": "This file type is not supported. Please upload JPG, PNG, PDF, or MP4 files.",
        "likely_causes": ["Unsupported format", "Wrong extension", "HEIC from iPhone"],
        "user_fix": ["Convert to supported format", "For iPhone photos, enable 'Most Compatible' in settings", "Use JPG/PNG for images"],
        "admin_fix": ["Review allowed MIME types", "Consider adding HEIC support", "Add format conversion"],
        "logs_to_capture": ["file_name", "mime_type", "expected_types"],
        "escalation_threshold": "Feature request → Product review"
      },
      {
        "error_code": "RU-UPLD-003",
        "category": "UPLD",
        "user_message": "Video must be between 10-30 seconds. Please trim your video and try again.",
        "likely_causes": ["Video exceeds 30 second limit", "Under 10 seconds"],
        "user_fix": ["Trim video to 10-30 seconds", "Use your phone's built-in editor", "Focus on the key issue"],
        "admin_fix": ["Review duration limits", "Check video processing pipeline", "Consider limit adjustment"],
        "logs_to_capture": ["video_duration", "file_size", "user_id"],
        "escalation_threshold": "None — user action required"
      },
      {
        "error_code": "RU-UPLD-004",
        "category": "UPLD",
        "user_message": "This photo is too blurry or low resolution. Please take a clearer photo.",
        "likely_causes": ["Camera shake", "Poor lighting", "Heavy compression"],
        "user_fix": ["Hold phone steady", "Ensure good lighting", "Clean camera lens", "Tap to focus before taking photo"],
        "admin_fix": ["Review quality threshold settings", "Check AI quality detection", "Allow manual override"],
        "logs_to_capture": ["image_resolution", "quality_score", "rejection_reason"],
        "escalation_threshold": "Quality threshold too strict → Product review"
      },
      {
        "error_code": "RU-UPLD-005",
        "category": "UPLD",
        "user_message": "You've reached your storage limit. Delete old files or upgrade your plan.",
        "likely_causes": ["Free tier limit reached", "Too many documents stored"],
        "user_fix": ["Go to Home Binder → delete old documents", "Upgrade plan for more storage", "Download and remove completed job photos"],
        "admin_fix": ["Check user storage usage", "Review retention policy", "Apply courtesy extension"],
        "logs_to_capture": ["user_id", "storage_used", "storage_limit", "plan_tier"],
        "escalation_threshold": "None — billing flow"
      },
      {
        "error_code": "RU-NOTIF-001",
        "category": "NOTIF",
        "user_message": "We couldn't send an email to your address. Please check your email settings.",
        "likely_causes": ["Invalid email", "Mailbox full", "Spam filter blocking"],
        "user_fix": ["Check email address in profile", "Add noreply@regularupkeep.com to contacts", "Check spam folder"],
        "admin_fix": ["Check email delivery logs", "Review bounce reasons", "Verify email service status"],
        "logs_to_capture": ["recipient_email", "bounce_type", "email_template", "error_message"],
        "escalation_threshold": "Deliverability issues → Email service review"
      },
      {
        "error_code": "RU-NOTIF-002",
        "category": "NOTIF",
        "user_message": "We couldn't send a text to your phone number. Please verify your number.",
        "likely_causes": ["Invalid number", "Carrier block", "DND enabled"],
        "user_fix": ["Verify phone number in profile", "Ensure you haven't blocked short codes", "Check carrier settings"],
        "admin_fix": ["Check SMS provider status", "Review carrier error codes", "Try alternate SMS route"],
        "logs_to_capture": ["phone_number", "carrier", "error_code", "message_type"],
        "escalation_threshold": "Carrier issues → SMS provider ticket"
      },
      {
        "error_code": "RU-NOTIF-003",
        "category": "NOTIF",
        "user_message": "Push notifications aren't working. Please check your app settings.",
        "likely_causes": ["Notifications disabled", "Token expired", "App not updated"],
        "user_fix": ["Enable notifications in phone settings", "Open app to refresh token", "Update to latest app version"],
        "admin_fix": ["Check push token validity", "Review FCM/APNs status", "Resend notification"],
        "logs_to_capture": ["device_token", "platform", "error_response", "last_token_refresh"],
        "escalation_threshold": "Token issues → Mobile team"
      },
      {
        "error_code": "RU-NOTIF-004",
        "category": "NOTIF",
        "user_message": "We couldn't save your notification preferences. Please try again.",
        "likely_causes": ["Database error", "Invalid preference combination"],
        "user_fix": ["Refresh the page", "Try saving one setting at a time", "Contact support if persists"],
        "admin_fix": ["Check notification_preferences table", "Verify user_id exists", "Review constraint violations"],
        "logs_to_capture": ["user_id", "preference_changes", "db_error"],
        "escalation_threshold": "Database errors → Engineering"
      },
      {
        "error_code": "RU-PAY-001",
        "category": "PAY",
        "user_message": "Your card was declined. Please try a different payment method or contact your bank.",
        "likely_causes": ["Insufficient funds", "Card expired", "Fraud block by bank"],
        "user_fix": ["Check card balance", "Contact your bank", "Try a different card"],
        "admin_fix": ["Check Stripe decline code", "Review for fraud signals", "Do not disclose specific decline reason"],
        "logs_to_capture": ["payment_intent_id", "decline_code", "card_last4", "amount"],
        "escalation_threshold": "None — user action required"
      },
      {
        "error_code": "RU-PAY-002",
        "category": "PAY",
        "user_message": "We couldn't process your payment. Please try again in a few minutes.",
        "likely_causes": ["Stripe API error", "Network timeout", "Concurrent request"],
        "user_fix": ["Wait 2-3 minutes", "Refresh and try again", "Do NOT retry multiple times (may double charge)"],
        "admin_fix": ["Check Stripe dashboard for status", "Verify payment intent state", "Check for duplicate charges"],
        "logs_to_capture": ["payment_intent_id", "stripe_error", "amount", "timestamp"],
        "escalation_threshold": "Stripe outage → Status page update"
      },
      {
        "error_code": "RU-PAY-003",
        "category": "PAY",
        "user_message": "We couldn't process your refund. Our team has been notified and will resolve this within 24 hours.",
        "likely_causes": ["Original charge too old", "Insufficient provider balance"],
        "user_fix": ["No action needed", "Support will contact you", "Refund typically processed within 24h"],
        "admin_fix": ["Check original payment status", "Verify refund amount ≤ charge", "Process manual refund if needed"],
        "logs_to_capture": ["payment_id", "refund_amount", "stripe_error", "provider_balance"],
        "escalation_threshold": "Immediate → Finance review"
      },
      {
        "error_code": "RU-PAY-004",
        "category": "PAY",
        "user_message": "We couldn't generate your invoice. Please try again or contact support.",
        "likely_causes": ["Missing booking data", "PDF generation error"],
        "user_fix": ["Refresh and try again", "Request invoice via support", "Check booking is completed"],
        "admin_fix": ["Check booking/invoice data", "Verify PDF service status", "Generate manually if needed"],
        "logs_to_capture": ["booking_id", "invoice_data", "generation_error"],
        "escalation_threshold": "PDF service down → Engineering"
      },
      {
        "error_code": "RU-PAY-005",
        "category": "PAY",
        "user_message": "Your payout is delayed due to additional verification. This typically resolves within 2-3 business days.",
        "likely_causes": ["Dispute window active", "Stripe verification", "Large amount"],
        "user_fix": ["Check payout status in Money tab", "Complete any pending verification", "Contact support if >5 days"],
        "admin_fix": ["Check dispute window status (72h)", "Review Stripe Connect verification", "Process manual transfer if stuck"],
        "logs_to_capture": ["provider_id", "payout_amount", "delay_reason", "expected_date"],
        "escalation_threshold": ">5 business days → Finance escalation"
      },
      {
        "error_code": "RU-PAY-006",
        "category": "PAY",
        "user_message": "We couldn't complete your payment account setup. Please try again or contact support.",
        "likely_causes": ["Verification failed", "Invalid bank info", "Identity mismatch"],
        "user_fix": ["Ensure legal name matches ID", "Double-check bank account number", "Use a clear photo of your ID"],
        "admin_fix": ["Check Stripe Connect dashboard", "Review verification requirements", "Contact Stripe support if blocked"],
        "logs_to_capture": ["provider_id", "stripe_account_id", "verification_status", "requirements"],
        "escalation_threshold": "Stripe verification stuck → Stripe support ticket"
      },
      {
        "error_code": "RU-ADMIN-001",
        "category": "ADMIN",
        "user_message": "You don't have permission to perform this action.",
        "likely_causes": ["Role insufficient", "Permission revoked", "Wrong account"],
        "user_fix": ["Verify you're logged into correct account", "Request permission from admin", "Contact IT if role incorrect"],
        "admin_fix": ["Check profiles.role for user", "Review permission requirements", "Update role if authorized"],
        "logs_to_capture": ["user_id", "user_role", "attempted_action", "required_role"],
        "escalation_threshold": "Unauthorized access attempt → Security review"
      },
      {
        "error_code": "RU-ADMIN-002",
        "category": "ADMIN",
        "user_message": "Configuration could not be saved. Please check values and try again.",
        "likely_causes": ["Invalid value", "Database constraint", "Concurrent edit"],
        "user_fix": ["Check all values are valid", "Refresh and try again", "Contact engineering if urgent"],
        "admin_fix": ["Check admin_config table", "Review validation rules", "Check for constraint violations"],
        "logs_to_capture": ["config_key", "attempted_value", "db_error", "admin_id"],
        "escalation_threshold": "Config critical → Engineering"
      },
      {
        "error_code": "RU-ADMIN-003",
        "category": "ADMIN",
        "user_message": "User not found. They may have been deleted or the ID is incorrect.",
        "likely_causes": ["User deleted", "Typo in user ID", "Soft-deleted account"],
        "user_fix": "N/A (admin action)",
        "admin_fix": ["Search by email instead of ID", "Check soft-deleted users", "Verify ID format"],
        "logs_to_capture": ["searched_user_id", "search_method", "admin_id"],
        "escalation_threshold": "None — retry with correct ID"
      },
      {
        "error_code": "RU-ADMIN-004",
        "category": "ADMIN",
        "user_message": "Bulk action partially failed. [X] of [Y] items processed successfully.",
        "likely_causes": ["Some items locked", "Timeout on large batch", "Individual validation failures"],
        "user_fix": "N/A (admin action)",
        "admin_fix": ["Review failed items list", "Process failures individually", "Check for locked records"],
        "logs_to_capture": ["action_type", "total_items", "success_count", "failure_reasons"],
        "escalation_threshold": ">50% failure → Engineering review"
      },
      {
        "error_code": "RU-INTG-001",
        "category": "INTG",
        "user_message": "N/A (system error)",
        "likely_causes": ["Endpoint down", "Invalid URL", "Timeout"],
        "user_fix": "N/A",
        "admin_fix": ["Check webhook endpoint status", "Review delivery logs", "Retry or disable webhook"],
        "logs_to_capture": ["webhook_url", "event_type", "response_code", "retry_count"],
        "escalation_threshold": "Critical webhook (Stripe) → Immediate"
      },
      {
        "error_code": "RU-INTG-002",
        "category": "INTG",
        "user_message": "Service temporarily unavailable. Please try again in a few minutes.",
        "likely_causes": ["Third-party API rate limit hit"],
        "user_fix": ["Wait 5 minutes", "Try again", "Contact support if urgent"],
        "admin_fix": ["Check API usage dashboard", "Implement request queuing", "Request rate limit increase"],
        "logs_to_capture": ["api_provider", "endpoint", "rate_limit_header", "request_count"],
        "escalation_threshold": "Stripe rate limit → Engineering"
      },
      {
        "error_code": "RU-INTG-003",
        "category": "INTG",
        "user_message": "AI features are temporarily unavailable. You can continue without AI assistance.",
        "likely_causes": ["OpenAI/Anthropic API down", "Rate limit", "Budget exceeded"],
        "user_fix": ["Continue without AI", "Manually enter information", "Try again in a few minutes"],
        "admin_fix": ["Check AI provider status page", "Verify API keys", "Check budget limits", "Enable fallback mode"],
        "logs_to_capture": ["ai_provider", "task_type", "error_response", "fallback_used"],
        "escalation_threshold": "Extended outage → Status page update"
      },
      {
        "error_code": "RU-INTG-004",
        "category": "INTG",
        "user_message": "We couldn't sync with your calendar. Please reconnect your calendar in settings.",
        "likely_causes": ["OAuth token expired", "Calendar permissions revoked"],
        "user_fix": ["Go to Settings → Integrations", "Disconnect and reconnect calendar", "Grant all requested permissions"],
        "admin_fix": ["Check OAuth token status", "Verify calendar API permissions", "Refresh tokens if possible"],
        "logs_to_capture": ["user_id", "calendar_provider", "oauth_error", "last_sync"],
        "escalation_threshold": "Provider API change → Engineering"
      },
      {
        "error_code": "RU-API-400",
        "category": "API",
        "user_message": "Something went wrong with your request. Please refresh and try again.",
        "likely_causes": ["Invalid request data", "Missing required fields", "Malformed JSON"],
        "user_fix": ["Refresh the page", "Re-enter information", "Clear browser cache"],
        "admin_fix": ["Check request validation logs", "Review API schema", "Fix client-side validation"],
        "logs_to_capture": ["endpoint", "request_body", "validation_errors", "user_agent"],
        "escalation_threshold": "Recurring → Engineering fix"
      },
      {
        "error_code": "RU-API-401",
        "category": "API",
        "user_message": "Your session has expired. Please log in again.",
        "likely_causes": ["Token expired", "Invalid token", "User logged out elsewhere"],
        "user_fix": ["Log in again", "Check if logged out on another device", "Clear cookies and retry"],
        "admin_fix": ["Check token expiry settings", "Review auth middleware", "Verify Supabase auth status"],
        "logs_to_capture": ["user_id", "token_expiry", "request_path"],
        "escalation_threshold": "Auth system issues → Engineering"
      },
      {
        "error_code": "RU-API-403",
        "category": "API",
        "user_message": "You don't have access to this resource.",
        "likely_causes": ["RLS policy blocking", "Role insufficient", "Resource not owned"],
        "user_fix": ["Check you're accessing correct resource", "Request access from owner", "Contact support"],
        "admin_fix": ["Review RLS policies", "Check resource ownership", "Verify user role"],
        "logs_to_capture": ["user_id", "resource_type", "resource_id", "rls_policy"],
        "escalation_threshold": "RLS bug → Engineering"
      },
      {
        "error_code": "RU-API-404",
        "category": "API",
        "user_message": "The page or resource you're looking for doesn't exist.",
        "likely_causes": ["Deleted resource", "Invalid URL", "Typo in link"],
        "user_fix": ["Check URL is correct", "Go back to previous page", "Use navigation menu"],
        "admin_fix": ["Check if resource was deleted", "Review redirect rules", "Fix broken links"],
        "logs_to_capture": ["requested_url", "referrer", "user_id"],
        "escalation_threshold": "Broken production links → Engineering"
      },
      {
        "error_code": "RU-API-429",
        "category": "API",
        "user_message": "You've made too many requests. Please wait a moment before trying again.",
        "likely_causes": ["Automated requests", "Refresh spam", "Attack attempt"],
        "user_fix": ["Wait 60 seconds", "Avoid rapid clicking", "Contact support if legitimate"],
        "admin_fix": ["Check request patterns", "Review rate limit thresholds", "Whitelist if legitimate automation"],
        "logs_to_capture": ["user_id", "ip_address", "endpoint", "request_count", "window"],
        "escalation_threshold": "Attack pattern → Security team"
      },
      {
        "error_code": "RU-API-500",
        "category": "API",
        "user_message": "Something went wrong on our end. Please try again later.",
        "likely_causes": ["Unhandled exception", "Database error", "Service crash"],
        "user_fix": ["Wait a few minutes", "Try again", "Contact support if persists"],
        "admin_fix": ["Check error logs immediately", "Identify stack trace", "Deploy hotfix if needed"],
        "logs_to_capture": ["stack_trace", "request_path", "user_id", "timestamp"],
        "escalation_threshold": "Immediate → Engineering on-call"
      },
      {
        "error_code": "RU-API-502",
        "category": "API",
        "user_message": "Our servers are temporarily unavailable. Please try again in a few minutes.",
        "likely_causes": ["Upstream server down", "Nginx misconfiguration", "PM2 crash"],
        "user_fix": ["Wait 2-3 minutes", "Refresh page", "Check status.regularupkeep.com"],
        "admin_fix": ["Check PM2 status", "Review nginx logs", "Restart services if needed"],
        "logs_to_capture": ["nginx_error_log", "pm2_status", "upstream_response"],
        "escalation_threshold": "Immediate → Infrastructure"
      },
      {
        "error_code": "RU-API-503",
        "category": "API",
        "user_message": "We're performing maintenance. Please check back shortly.",
        "likely_causes": ["Planned maintenance", "Deployment in progress", "Server overload"],
        "user_fix": ["Wait for maintenance to complete", "Check status page", "Try again in 15 minutes"],
        "admin_fix": ["Verify maintenance window", "Check deployment status", "Scale resources if overloaded"],
        "logs_to_capture": ["server_status", "load_average", "deployment_status"],
        "escalation_threshold": "Unplanned → Engineering immediate"
      },
      {
        "error_code": "RU-UNK-001",
        "category": "UNK",
        "user_message": "An unexpected error occurred. Our team has been notified.",
        "likely_causes": ["New/uncategorized error", "Edge case", "Third-party issue"],
        "user_fix": ["Try refreshing the page", "Log out and back in", "Contact support with error ID"],
        "admin_fix": ["Review error logs with error_id", "Categorize and create proper error code", "Implement proper handling"],
        "logs_to_capture": ["error_id", "stack_trace", "user_actions", "device_info"],
        "escalation_threshold": "New error types → Triage and categorize"
      }
    ]
  }
}
```

---

## YAML Intent Map for Chatbot

```yaml
# RegularUpkeep Error Center - Chatbot Intent Map
# Version: 1.0
# Use: Route "I got error RU-____" queries to appropriate responses

error_intents:
  # Meta intent for error code pattern matching
  - intent: error_code_lookup
    patterns:
      - "I got error {error_code}"
      - "error {error_code}"
      - "RU-{category}-{number}"
      - "what does {error_code} mean"
      - "help with {error_code}"
      - "I'm getting {error_code}"
      - "fix {error_code}"
      - "{error_code} error"
    action: lookup_error_catalog
    response_template: |
      I found information about error **{error_code}**:

      **What this means:** {user_message}

      **How to fix it:**
      {user_fix_steps}

      If this doesn't resolve your issue, please contact support with error code {error_code}.

  # Category-specific intents
  - intent: auth_error
    patterns:
      - "can't log in"
      - "login problem"
      - "password not working"
      - "account locked"
      - "session expired"
      - "verification email"
      - "sign in issue"
    category: AUTH
    suggested_codes:
      - RU-AUTH-001
      - RU-AUTH-002
      - RU-AUTH-003
      - RU-AUTH-004
      - RU-AUTH-005
    clarifying_questions:
      - "Are you seeing a specific error message?"
      - "Have you tried resetting your password?"
      - "Is this happening on web or mobile?"

  - intent: onboarding_error
    patterns:
      - "can't sign up"
      - "registration problem"
      - "can't create account"
      - "business registration"
      - "service area problem"
    category: ONBD
    suggested_codes:
      - RU-ONBD-001
      - RU-ONBD-002
      - RU-ONBD-003
      - RU-ONBD-004
    clarifying_questions:
      - "At which step are you encountering the issue?"
      - "Are you signing up as a homeowner or provider?"

  - intent: property_error
    patterns:
      - "can't add property"
      - "address not found"
      - "property limit"
      - "can't access property"
      - "property setup"
    category: PROP
    suggested_codes:
      - RU-PROP-001
      - RU-PROP-002
      - RU-PROP-003
      - RU-PROP-004
      - RU-PROP-005
    clarifying_questions:
      - "Is this a new property or existing one?"
      - "Are you seeing an error message?"

  - intent: booking_error
    patterns:
      - "can't book"
      - "no providers available"
      - "time slot"
      - "estimate expired"
      - "booking failed"
      - "change order"
      - "provider declined"
      - "diagnostic fee"
    category: BOOK
    suggested_codes:
      - RU-BOOK-001
      - RU-BOOK-002
      - RU-BOOK-003
      - RU-BOOK-004
      - RU-BOOK-005
      - RU-BOOK-006
      - RU-BOOK-007
    clarifying_questions:
      - "What service are you trying to book?"
      - "What ZIP code is the property in?"
      - "Did you receive a specific error message?"

  - intent: messaging_error
    patterns:
      - "message won't send"
      - "can't send message"
      - "conversation missing"
      - "file too large"
      - "sending too fast"
    category: MSG
    suggested_codes:
      - RU-MSG-001
      - RU-MSG-002
      - RU-MSG-003
      - RU-MSG-004
    clarifying_questions:
      - "Who are you trying to message?"
      - "Are you trying to send an attachment?"

  - intent: upload_error
    patterns:
      - "upload failed"
      - "can't upload photo"
      - "file type not supported"
      - "video too long"
      - "photo blurry"
      - "storage full"
    category: UPLD
    suggested_codes:
      - RU-UPLD-001
      - RU-UPLD-002
      - RU-UPLD-003
      - RU-UPLD-004
      - RU-UPLD-005
    clarifying_questions:
      - "What type of file are you uploading?"
      - "How large is the file?"
      - "Are you using iPhone or Android?"

  - intent: notification_error
    patterns:
      - "not getting emails"
      - "not getting texts"
      - "push notifications"
      - "notification settings"
      - "didn't receive email"
    category: NOTIF
    suggested_codes:
      - RU-NOTIF-001
      - RU-NOTIF-002
      - RU-NOTIF-003
      - RU-NOTIF-004
    clarifying_questions:
      - "Which notifications are you missing?"
      - "Have you checked your spam folder?"
      - "Are notifications enabled on your phone?"

  - intent: payment_error
    patterns:
      - "card declined"
      - "payment failed"
      - "refund problem"
      - "invoice issue"
      - "payout delayed"
      - "Stripe setup"
      - "can't pay"
    category: PAY
    suggested_codes:
      - RU-PAY-001
      - RU-PAY-002
      - RU-PAY-003
      - RU-PAY-004
      - RU-PAY-005
      - RU-PAY-006
    clarifying_questions:
      - "Are you a homeowner or provider?"
      - "What payment method are you using?"
      - "Did you receive a specific error message?"
    escalation_note: "Payment issues may require human review"

  - intent: admin_error
    patterns:
      - "permission denied"
      - "can't access admin"
      - "config error"
      - "user not found"
      - "bulk action failed"
    category: ADMIN
    suggested_codes:
      - RU-ADMIN-001
      - RU-ADMIN-002
      - RU-ADMIN-003
      - RU-ADMIN-004
    requires_role: admin

  - intent: integration_error
    patterns:
      - "webhook failed"
      - "API error"
      - "AI not working"
      - "calendar sync"
      - "rate limit"
    category: INTG
    suggested_codes:
      - RU-INTG-001
      - RU-INTG-002
      - RU-INTG-003
      - RU-INTG-004
    clarifying_questions:
      - "Which feature stopped working?"
      - "When did this start happening?"

  - intent: server_error
    patterns:
      - "something went wrong"
      - "site down"
      - "page not loading"
      - "server error"
      - "500 error"
      - "503 error"
      - "bad gateway"
    category: API
    suggested_codes:
      - RU-API-500
      - RU-API-502
      - RU-API-503
    response_template: |
      I'm sorry you're experiencing technical difficulties.

      **Quick fixes to try:**
      1. Refresh the page
      2. Clear your browser cache
      3. Try a different browser
      4. Wait a few minutes and try again

      If the problem persists, our team has been notified.
      Check status.regularupkeep.com for service updates.

  - intent: unknown_error
    patterns:
      - "unexpected error"
      - "weird error"
      - "never seen this before"
      - "new error"
    category: UNK
    suggested_codes:
      - RU-UNK-001
    response_template: |
      I'm sorry you're experiencing an unexpected error.

      To help us investigate:
      1. Note the exact error message
      2. Take a screenshot if possible
      3. Note what you were doing when it happened

      Please contact support with these details and we'll help resolve this quickly.

# Escalation rules
escalation_rules:
  - condition: "payment_error AND user_mentions_charged"
    action: immediate_human_handoff
    priority: high

  - condition: "error_count > 3 AND same_session"
    action: offer_human_support
    message: "I see you've encountered multiple issues. Would you like to speak with a support agent?"

  - condition: "server_error AND affects_all_users"
    action: status_page_redirect
    message: "We're aware of this issue. Please check status.regularupkeep.com for updates."

# Quick responses for common error codes
quick_responses:
  RU-AUTH-002:
    instant_reply: "Password issues? Try clicking 'Forgot Password' to reset it, or check that Caps Lock is off."

  RU-AUTH-004:
    instant_reply: "Session expired? Simply log in again. This is normal after being inactive for a while."

  RU-PROP-002:
    instant_reply: "Hit your property limit? Free accounts get 2 properties. Go to Billing → Upgrade to add more at $2.50/month each."

  RU-UPLD-002:
    instant_reply: "File type not supported? We accept JPG, PNG, PDF, and MP4. iPhone users: go to Settings → Camera → Formats → Most Compatible."

  RU-PAY-001:
    instant_reply: "Card declined? This usually means your bank blocked the charge. Try a different card or contact your bank to approve RegularUpkeep charges."

  RU-BOOK-001:
    instant_reply: "No providers available? Try a different date/time, or select a broader service category. We're always adding new providers!"
```

---

## Appendix: Error Code Quick Reference

| Code | User Message (Short) | Category |
|------|---------------------|----------|
| RU-AUTH-001 | Invalid email format | Auth |
| RU-AUTH-002 | Incorrect password | Auth |
| RU-AUTH-003 | Account locked | Auth |
| RU-AUTH-004 | Session expired | Auth |
| RU-AUTH-005 | Email not verified | Auth |
| RU-AUTH-006 | OAuth provider error | Auth |
| RU-ONBD-001 | Role selection failed | Onboarding |
| RU-ONBD-002 | Business info validation failed | Onboarding |
| RU-ONBD-003 | Service area too large | Onboarding |
| RU-ONBD-004 | Duplicate business | Onboarding |
| RU-PROP-001 | Address not found | Property |
| RU-PROP-002 | Property limit reached | Property |
| RU-PROP-003 | System addition failed | Property |
| RU-PROP-004 | Property access denied | Property |
| RU-PROP-005 | Duplicate property | Property |
| RU-BOOK-001 | No providers available | Bookings |
| RU-BOOK-002 | Time slot unavailable | Bookings |
| RU-BOOK-003 | Estimate expired | Bookings |
| RU-BOOK-004 | Booking confirmation failed | Bookings |
| RU-BOOK-005 | Change order limit exceeded | Bookings |
| RU-BOOK-006 | Provider declined job | Bookings |
| RU-BOOK-007 | Diagnostic fee required | Bookings |
| RU-MSG-001 | Message send failed | Messaging |
| RU-MSG-002 | Thread not found | Messaging |
| RU-MSG-003 | Attachment too large | Messaging |
| RU-MSG-004 | Rate limit exceeded | Messaging |
| RU-UPLD-001 | Upload failed | Uploads |
| RU-UPLD-002 | Invalid file type | Uploads |
| RU-UPLD-003 | Video too long | Uploads |
| RU-UPLD-004 | Photo quality too low | Uploads |
| RU-UPLD-005 | Storage quota exceeded | Uploads |
| RU-NOTIF-001 | Email delivery failed | Notifications |
| RU-NOTIF-002 | SMS delivery failed | Notifications |
| RU-NOTIF-003 | Push notification failed | Notifications |
| RU-NOTIF-004 | Notification preferences error | Notifications |
| RU-PAY-001 | Card declined | Payments |
| RU-PAY-002 | Payment processing error | Payments |
| RU-PAY-003 | Refund failed | Payments |
| RU-PAY-004 | Invoice generation failed | Payments |
| RU-PAY-005 | Payout delayed | Payments |
| RU-PAY-006 | Stripe Connect onboarding failed | Payments |
| RU-ADMIN-001 | Permission denied | Admin |
| RU-ADMIN-002 | Config update failed | Admin |
| RU-ADMIN-003 | User not found | Admin |
| RU-ADMIN-004 | Bulk action failed | Admin |
| RU-INTG-001 | Webhook delivery failed | Integrations |
| RU-INTG-002 | API rate limit | Integrations |
| RU-INTG-003 | AI service unavailable | Integrations |
| RU-INTG-004 | Calendar sync failed | Integrations |
| RU-API-400 | Bad request | API |
| RU-API-401 | Unauthorized | API |
| RU-API-403 | Forbidden | API |
| RU-API-404 | Not found | API |
| RU-API-429 | Rate limited | API |
| RU-API-500 | Internal server error | API |
| RU-API-502 | Bad gateway | API |
| RU-API-503 | Service unavailable | API |
| RU-UNK-001 | Unclassified error | Unknown |

---

*End of Error Center Playbook*
