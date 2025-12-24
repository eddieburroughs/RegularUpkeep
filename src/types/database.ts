export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================================
// EXISTING ENUMS
// ============================================================================
export type UserRole = "customer" | "provider" | "handyman" | "admin" | "territory_manager" | "franchisee";
export type ProviderMemberRole = "owner" | "manager" | "technician";
export type ProviderMemberStatus = "pending" | "active" | "inactive";
export type PropertyType = "single_family" | "condo" | "townhouse" | "apartment" | "multi_family" | "commercial";
export type PropertyMemberRole = "owner" | "manager" | "tenant" | "viewer";
export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
export type TravelStatus = "none" | "on_my_way" | "arrived";
export type VerificationStatus = "unverified" | "pending" | "verified";
export type MaintenanceStatus = "scheduled" | "upcoming" | "due" | "overdue" | "in_progress" | "completed" | "skipped" | "cancelled";
export type MaintenancePriority = "urgent" | "high" | "normal" | "low";
export type MaintenanceCategory = "hvac" | "plumbing" | "electrical" | "appliances" | "exterior" | "interior" | "landscaping" | "pest_control" | "safety" | "other";
export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired";
export type DocumentCategory = "receipt" | "warranty" | "manual" | "inspection" | "permit" | "insurance" | "contract" | "photo" | "other";

// ============================================================================
// NEW ENUMS (from pricing/payments/CRM overhaul)
// ============================================================================

// Subscription & Payment
export type HomeownerSubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";
export type PaymentMethodType = "card" | "us_bank_account" | "link";
export type TransactionType = "subscription_payment" | "diagnostic_fee" | "service_payment" | "platform_fee" | "provider_payout" | "refund" | "dispute_credit" | "sponsor_payment";
export type TransactionStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded" | "disputed";

// Provider
export type ProviderStripeStatus = "not_started" | "pending" | "active" | "restricted" | "disabled";
export type ProviderTier = "basic" | "verified" | "preferred";

// Service Requests & Marketplace
export type ServiceRequestStatus = "draft" | "submitted" | "ai_processing" | "pending_provider" | "estimate_received" | "estimate_approved" | "in_progress" | "pending_completion" | "completed" | "disputed" | "canceled";
export type UrgencyLevel = "emergency" | "urgent" | "standard" | "flexible";
export type EstimateStatus = "draft" | "sent" | "viewed" | "approved" | "rejected" | "expired" | "superseded";
export type ChangeOrderStatus = "pending" | "approved" | "rejected" | "expired";
export type InvoiceStatus = "draft" | "pending_approval" | "approved" | "auto_approved" | "disputed" | "paid" | "refunded";

// Disputes
export type DisputeStatus = "open" | "under_review" | "resolved_customer_favor" | "resolved_provider_favor" | "closed";
export type DisputeReason = "work_not_completed" | "work_quality" | "overcharged" | "unauthorized_work" | "damage_caused" | "other";

// Sponsors
export type SponsorType = "realtor" | "insurance" | "handyman";
export type SponsorStatus = "pending" | "active" | "expired" | "canceled";

// CRM
export type FollowUpStatus = "pending" | "completed" | "skipped" | "overdue";
export type ReviewRequestStatus = "pending" | "sent" | "clicked" | "completed" | "expired";

// AI
export type AIJobStatus = "queued" | "processing" | "success" | "failed" | "cached";
export type AIPolicySeverity = "info" | "warning" | "critical";
export type AIFeedbackRating = "up" | "down";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          language: string | null;
          push_token: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          stripe_customer_id: string | null;
          territory_id: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          language?: string | null;
          push_token?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          stripe_customer_id?: string | null;
          territory_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          language?: string | null;
          push_token?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          stripe_customer_id?: string | null;
          territory_id?: string | null;
        };
      };
      customers: {
        Row: {
          id: string;
          profile_id: string;
          default_address_id: string | null;
          wallet_balance: number;
          total_bookings: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          default_address_id?: string | null;
          wallet_balance?: number;
          total_bookings?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          default_address_id?: string | null;
          wallet_balance?: number;
          total_bookings?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          nickname: string | null;
          property_type: PropertyType;
          address_line1: string;
          address_line2: string | null;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          year_built: number | null;
          square_footage: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          lot_size_sqft: number | null;
          notes: string | null;
          access_notes: string | null;
          utility_shutoff_notes: string | null;
          photos: Json;
          territory_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nickname?: string | null;
          property_type?: PropertyType;
          address_line1: string;
          address_line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
          year_built?: number | null;
          square_footage?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          lot_size_sqft?: number | null;
          notes?: string | null;
          access_notes?: string | null;
          utility_shutoff_notes?: string | null;
          photos?: Json;
          territory_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string | null;
          property_type?: PropertyType;
          address_line1?: string;
          address_line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
          year_built?: number | null;
          square_footage?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          lot_size_sqft?: number | null;
          notes?: string | null;
          access_notes?: string | null;
          utility_shutoff_notes?: string | null;
          photos?: Json;
          territory_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      property_members: {
        Row: {
          id: string;
          property_id: string;
          user_id: string;
          member_role: PropertyMemberRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          user_id: string;
          member_role?: PropertyMemberRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          user_id?: string;
          member_role?: PropertyMemberRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          booking_number: string;
          customer_id: string;
          provider_id: string;
          service_id: string;
          handyman_id: string | null;
          scheduled_date: string;
          scheduled_time: string;
          estimated_duration: number | null;
          actual_start_time: string | null;
          actual_end_time: string | null;
          address_id: string | null;
          service_address: string;
          base_price: number;
          addons_total: number;
          discount_amount: number;
          tax_amount: number;
          platform_fee: number;
          total_amount: number;
          status: BookingStatus;
          travel_status: TravelStatus;
          customer_notes: string | null;
          provider_notes: string | null;
          completion_notes: string | null;
          invoice_items: Json;
          invoice_cents: number;
          job_photos: Json;
          cancellation_reason: string | null;
          cancelled_by: string | null;
          created_at: string;
          updated_at: string;
          payment_status: string;
          property_id: string | null;
          priority: string;
        };
        Insert: {
          id?: string;
          booking_number?: string;
          customer_id: string;
          provider_id: string;
          service_id: string;
          handyman_id?: string | null;
          scheduled_date: string;
          scheduled_time: string;
          estimated_duration?: number | null;
          service_address: string;
          base_price: number;
          addons_total?: number;
          discount_amount?: number;
          tax_amount?: number;
          platform_fee?: number;
          total_amount: number;
          status?: BookingStatus;
          travel_status?: TravelStatus;
          customer_notes?: string | null;
          invoice_items?: Json;
          invoice_cents?: number;
          job_photos?: Json;
          property_id?: string | null;
          priority?: string;
        };
        Update: {
          status?: BookingStatus;
          travel_status?: TravelStatus;
          provider_notes?: string | null;
          completion_notes?: string | null;
          invoice_items?: Json;
          invoice_cents?: number;
          job_photos?: Json;
          actual_start_time?: string | null;
          actual_end_time?: string | null;
          cancellation_reason?: string | null;
          cancelled_by?: string | null;
          updated_at?: string;
        };
      };
      maintenance_tasks: {
        Row: {
          id: string;
          schedule_id: string | null;
          property_id: string;
          booking_id: string | null;
          name: string;
          description: string | null;
          category: MaintenanceCategory;
          priority: MaintenancePriority;
          status: MaintenanceStatus;
          due_date: string;
          due_time: string | null;
          scheduled_date: string | null;
          scheduled_time: string | null;
          completed_at: string | null;
          assigned_provider_id: string | null;
          assigned_handyman_id: string | null;
          assigned_user_id: string | null;
          estimated_cost_cents: number | null;
          actual_cost_cents: number | null;
          instructions: string | null;
          checklist: Json;
          completion_notes: string | null;
          completion_photos: string[];
          is_recurring: boolean;
          skipped_reason: string | null;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          schedule_id?: string | null;
          property_id: string;
          booking_id?: string | null;
          name: string;
          description?: string | null;
          category?: MaintenanceCategory;
          priority?: MaintenancePriority;
          status?: MaintenanceStatus;
          due_date: string;
          due_time?: string | null;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
          assigned_provider_id?: string | null;
          assigned_handyman_id?: string | null;
          assigned_user_id?: string | null;
          estimated_cost_cents?: number | null;
          instructions?: string | null;
          checklist?: Json;
          is_recurring?: boolean;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: MaintenanceCategory;
          priority?: MaintenancePriority;
          status?: MaintenanceStatus;
          due_date?: string;
          scheduled_date?: string | null;
          completed_at?: string | null;
          actual_cost_cents?: number | null;
          completion_notes?: string | null;
          completion_photos?: string[];
          skipped_reason?: string | null;
          updated_at?: string;
        };
      };
      quotes: {
        Row: {
          id: string;
          quote_number: string;
          booking_id: string | null;
          property_id: string | null;
          provider_id: string;
          customer_id: string;
          status: QuoteStatus;
          title: string | null;
          description: string | null;
          line_items: Json;
          subtotal_cents: number;
          tax_cents: number;
          discount_cents: number;
          total_cents: number;
          options: Json;
          selected_option: string | null;
          valid_until: string | null;
          provider_notes: string | null;
          customer_notes: string | null;
          attachments: Json;
          sent_at: string | null;
          viewed_at: string | null;
          responded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_number?: string;
          booking_id?: string | null;
          property_id?: string | null;
          provider_id: string;
          customer_id: string;
          status?: QuoteStatus;
          title?: string | null;
          description?: string | null;
          line_items?: Json;
          subtotal_cents?: number;
          tax_cents?: number;
          discount_cents?: number;
          total_cents?: number;
          options?: Json;
          valid_until?: string | null;
          provider_notes?: string | null;
        };
        Update: {
          status?: QuoteStatus;
          selected_option?: string | null;
          customer_notes?: string | null;
          viewed_at?: string | null;
          responded_at?: string | null;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          property_id: string | null;
          service_record_id: string | null;
          booking_id: string | null;
          category: DocumentCategory;
          title: string;
          description: string | null;
          file_url: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          thumbnail_url: string | null;
          document_date: string | null;
          expiry_date: string | null;
          amount_cents: number | null;
          tags: string[];
          is_pinned: boolean;
          is_archived: boolean;
          visibility: string;
          created_at: string;
          updated_at: string;
          uploaded_by: string | null;
          meta: Json;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          service_record_id?: string | null;
          booking_id?: string | null;
          category: DocumentCategory;
          title: string;
          description?: string | null;
          file_url: string;
          file_name: string;
          meta?: Json;
          file_type?: string | null;
          file_size?: number | null;
          thumbnail_url?: string | null;
          document_date?: string | null;
          expiry_date?: string | null;
          amount_cents?: number | null;
          tags?: string[];
          is_pinned?: boolean;
          visibility?: string;
          uploaded_by?: string | null;
        };
        Update: {
          category?: DocumentCategory;
          title?: string;
          description?: string | null;
          document_date?: string | null;
          expiry_date?: string | null;
          tags?: string[];
          is_pinned?: boolean;
          is_archived?: boolean;
          visibility?: string;
          updated_at?: string;
          meta?: Json;
        };
      };
      message_threads: {
        Row: {
          id: string;
          property_id: string | null;
          booking_id: string | null;
          created_by: string;
          subject: string | null;
          thread_type: string;
          is_active: boolean;
          is_archived: boolean;
          last_message_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          booking_id?: string | null;
          created_by: string;
          subject?: string | null;
          thread_type?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          subject?: string | null;
          is_active?: boolean;
          is_archived?: boolean;
          last_message_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          content: string;
          attachments: Json;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          content: string;
          attachments?: Json;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
      };
      thread_participants: {
        Row: {
          id: string;
          thread_id: string;
          user_id: string;
          is_active: boolean;
          last_read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          user_id: string;
          is_active?: boolean;
        };
        Update: {
          is_active?: boolean;
          last_read_at?: string | null;
        };
      };
      services: {
        Row: {
          id: string;
          provider_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          base_price: number;
          duration_minutes: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          base_price: number;
          duration_minutes?: number | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          base_price?: number;
          duration_minutes?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      providers: {
        Row: {
          id: string;
          profile_id: string;
          business_name: string;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          description: string | null;
          logo_url: string | null;
          is_online: boolean;
          is_verified: boolean;
          verification_status: VerificationStatus;
          service_categories: Json;
          service_area: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          business_name: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          description?: string | null;
          logo_url?: string | null;
          is_online?: boolean;
          is_verified?: boolean;
          verification_status?: VerificationStatus;
          service_categories?: Json;
          service_area?: Json;
          is_active?: boolean;
        };
        Update: {
          business_name?: string;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          description?: string | null;
          logo_url?: string | null;
          is_online?: boolean;
          is_verified?: boolean;
          verification_status?: VerificationStatus;
          service_categories?: Json;
          service_area?: Json;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          profile_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Json;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          type: string;
          title: string;
          body?: string | null;
          data?: Json;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
      };

      // ========================================================================
      // NEW TABLES (from pricing/payments/CRM overhaul)
      // ========================================================================

      admin_config: {
        Row: {
          id: string;
          config_key: string;
          config_value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          config_key: string;
          config_value: Json;
          description?: string | null;
          updated_by?: string | null;
        };
        Update: {
          config_value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };

      homeowner_subscriptions: {
        Row: {
          id: string;
          customer_id: string;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          status: HomeownerSubscriptionStatus;
          active_homes_count: number;
          billable_homes_count: number;
          tenant_access_homes: string[];
          sponsor_free_enabled: boolean;
          homes_monthly_cents: number;
          tenant_access_monthly_cents: number;
          sponsor_free_yearly_cents: number | null;
          total_monthly_cents: number;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_start: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: HomeownerSubscriptionStatus;
          active_homes_count?: number;
          billable_homes_count?: number;
          tenant_access_homes?: string[];
          sponsor_free_enabled?: boolean;
        };
        Update: {
          status?: HomeownerSubscriptionStatus;
          active_homes_count?: number;
          billable_homes_count?: number;
          tenant_access_homes?: string[];
          sponsor_free_enabled?: boolean;
          homes_monthly_cents?: number;
          tenant_access_monthly_cents?: number;
          sponsor_free_yearly_cents?: number | null;
          total_monthly_cents?: number;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          updated_at?: string;
        };
      };

      payment_methods: {
        Row: {
          id: string;
          profile_id: string;
          stripe_payment_method_id: string;
          type: PaymentMethodType;
          card_brand: string | null;
          card_last4: string | null;
          card_exp_month: number | null;
          card_exp_year: number | null;
          bank_name: string | null;
          bank_last4: string | null;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          stripe_payment_method_id: string;
          type: PaymentMethodType;
          card_brand?: string | null;
          card_last4?: string | null;
          card_exp_month?: number | null;
          card_exp_year?: number | null;
          bank_name?: string | null;
          bank_last4?: string | null;
          is_default?: boolean;
          is_active?: boolean;
        };
        Update: {
          is_default?: boolean;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      transactions: {
        Row: {
          id: string;
          profile_id: string | null;
          booking_id: string | null;
          service_request_id: string | null;
          subscription_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          stripe_transfer_id: string | null;
          stripe_refund_id: string | null;
          type: TransactionType;
          status: TransactionStatus;
          amount_cents: number;
          fee_cents: number;
          net_cents: number;
          currency: string;
          description: string | null;
          metadata: Json;
          failure_reason: string | null;
          idempotency_key: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          booking_id?: string | null;
          service_request_id?: string | null;
          subscription_id?: string | null;
          stripe_payment_intent_id?: string | null;
          type: TransactionType;
          amount_cents: number;
          fee_cents?: number;
          net_cents: number;
          currency?: string;
          description?: string | null;
          metadata?: Json;
          idempotency_key?: string | null;
        };
        Update: {
          status?: TransactionStatus;
          stripe_charge_id?: string | null;
          stripe_transfer_id?: string | null;
          stripe_refund_id?: string | null;
          fee_cents?: number;
          net_cents?: number;
          failure_reason?: string | null;
          processed_at?: string | null;
          updated_at?: string;
        };
      };

      provider_stripe_accounts: {
        Row: {
          id: string;
          provider_id: string;
          stripe_account_id: string | null;
          status: ProviderStripeStatus;
          onboarding_complete: boolean;
          charges_enabled: boolean;
          payouts_enabled: boolean;
          details_submitted: boolean;
          payout_schedule: string;
          available_balance_cents: number;
          pending_balance_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          stripe_account_id?: string | null;
          status?: ProviderStripeStatus;
        };
        Update: {
          stripe_account_id?: string | null;
          status?: ProviderStripeStatus;
          onboarding_complete?: boolean;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          details_submitted?: boolean;
          payout_schedule?: string;
          available_balance_cents?: number;
          pending_balance_cents?: number;
          updated_at?: string;
        };
      };

      provider_subscriptions: {
        Row: {
          id: string;
          provider_id: string;
          stripe_subscription_id: string | null;
          tier: ProviderTier;
          status: HomeownerSubscriptionStatus;
          background_check_completed: boolean;
          background_check_date: string | null;
          insurance_verified: boolean;
          insurance_expiry: string | null;
          license_verified: boolean;
          license_expiry: string | null;
          monthly_cents: number;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          stripe_subscription_id?: string | null;
          tier?: ProviderTier;
          status?: HomeownerSubscriptionStatus;
        };
        Update: {
          tier?: ProviderTier;
          status?: HomeownerSubscriptionStatus;
          background_check_completed?: boolean;
          background_check_date?: string | null;
          insurance_verified?: boolean;
          insurance_expiry?: string | null;
          license_verified?: boolean;
          license_expiry?: string | null;
          monthly_cents?: number;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
      };

      provider_metrics: {
        Row: {
          id: string;
          provider_id: string;
          average_rating: number;
          total_ratings: number;
          total_jobs_completed: number;
          total_jobs_disputed: number;
          dispute_rate: number;
          avg_response_time_hours: number;
          jobs_completed_on_time: number;
          on_time_rate: number;
          total_revenue_cents: number;
          last_30_days_revenue_cents: number;
          qualifies_for_preferred: boolean;
          last_qualification_check: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
        };
        Update: {
          average_rating?: number;
          total_ratings?: number;
          total_jobs_completed?: number;
          total_jobs_disputed?: number;
          dispute_rate?: number;
          avg_response_time_hours?: number;
          jobs_completed_on_time?: number;
          on_time_rate?: number;
          total_revenue_cents?: number;
          last_30_days_revenue_cents?: number;
          qualifies_for_preferred?: boolean;
          last_qualification_check?: string | null;
          updated_at?: string;
        };
      };

      service_requests: {
        Row: {
          id: string;
          request_number: string;
          customer_id: string;
          property_id: string;
          provider_id: string | null;
          booking_id: string | null;
          category: string;
          title: string;
          description: string | null;
          urgency: UrgencyLevel;
          status: ServiceRequestStatus;
          photos: string[];
          videos: string[];
          media_requirements_met: boolean;
          emergency_media_exception: boolean;
          ai_summary: string | null;
          ai_follow_up_questions: Json;
          ai_follow_up_answers: Json;
          ai_provider_brief: string | null;
          ai_processing_status: string | null;
          diagnostic_fee_cents: number;
          diagnostic_fee_paid: boolean;
          diagnostic_fee_creditable: boolean;
          diagnostic_payment_intent_id: string | null;
          preferred_date: string | null;
          preferred_time_start: string | null;
          preferred_time_end: string | null;
          flexible_scheduling: boolean;
          submitted_at: string | null;
          provider_assigned_at: string | null;
          completed_at: string | null;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_number?: string;
          customer_id: string;
          property_id: string;
          provider_id?: string | null;
          category: string;
          title: string;
          description?: string | null;
          urgency?: UrgencyLevel;
          status?: ServiceRequestStatus;
          photos?: string[];
          videos?: string[];
          emergency_media_exception?: boolean;
        };
        Update: {
          provider_id?: string | null;
          booking_id?: string | null;
          title?: string;
          description?: string | null;
          urgency?: UrgencyLevel;
          status?: ServiceRequestStatus;
          photos?: string[];
          videos?: string[];
          media_requirements_met?: boolean;
          ai_summary?: string | null;
          ai_follow_up_questions?: Json;
          ai_follow_up_answers?: Json;
          ai_provider_brief?: string | null;
          ai_processing_status?: string | null;
          diagnostic_fee_paid?: boolean;
          diagnostic_payment_intent_id?: string | null;
          preferred_date?: string | null;
          preferred_time_start?: string | null;
          preferred_time_end?: string | null;
          flexible_scheduling?: boolean;
          submitted_at?: string | null;
          provider_assigned_at?: string | null;
          completed_at?: string | null;
          canceled_at?: string | null;
          updated_at?: string;
        };
      };

      estimates: {
        Row: {
          id: string;
          estimate_number: string;
          service_request_id: string;
          provider_id: string;
          customer_id: string;
          labor_cents: number;
          materials_cents: number;
          subtotal_cents: number;
          tax_cents: number;
          total_cents: number;
          buffer_percentage: number;
          buffer_cents: number;
          authorization_total_cents: number;
          line_items: Json;
          status: EstimateStatus;
          valid_until: string | null;
          provider_notes: string | null;
          scope_of_work: string | null;
          estimated_duration_hours: number | null;
          warranty_terms: string | null;
          stripe_payment_intent_id: string | null;
          authorized_at: string | null;
          sent_at: string | null;
          viewed_at: string | null;
          approved_at: string | null;
          rejected_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          estimate_number?: string;
          service_request_id: string;
          provider_id: string;
          customer_id: string;
          labor_cents?: number;
          materials_cents?: number;
          line_items?: Json;
          scope_of_work?: string | null;
          estimated_duration_hours?: number | null;
          warranty_terms?: string | null;
        };
        Update: {
          labor_cents?: number;
          materials_cents?: number;
          subtotal_cents?: number;
          tax_cents?: number;
          total_cents?: number;
          buffer_percentage?: number;
          buffer_cents?: number;
          authorization_total_cents?: number;
          line_items?: Json;
          status?: EstimateStatus;
          valid_until?: string | null;
          provider_notes?: string | null;
          scope_of_work?: string | null;
          estimated_duration_hours?: number | null;
          warranty_terms?: string | null;
          stripe_payment_intent_id?: string | null;
          authorized_at?: string | null;
          sent_at?: string | null;
          viewed_at?: string | null;
          approved_at?: string | null;
          rejected_at?: string | null;
          updated_at?: string;
        };
      };

      change_orders: {
        Row: {
          id: string;
          change_order_number: string;
          estimate_id: string;
          service_request_id: string;
          provider_id: string;
          customer_id: string;
          original_total_cents: number;
          additional_cents: number;
          new_total_cents: number;
          reason: string;
          line_items: Json;
          photos: string[];
          status: ChangeOrderStatus;
          submitted_at: string;
          approved_at: string | null;
          rejected_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          change_order_number?: string;
          estimate_id: string;
          service_request_id: string;
          provider_id: string;
          customer_id: string;
          original_total_cents: number;
          additional_cents: number;
          new_total_cents: number;
          reason: string;
          line_items?: Json;
          photos?: string[];
        };
        Update: {
          status?: ChangeOrderStatus;
          approved_at?: string | null;
          rejected_at?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
      };

      invoices: {
        Row: {
          id: string;
          invoice_number: string;
          service_request_id: string;
          estimate_id: string | null;
          provider_id: string;
          customer_id: string;
          labor_cents: number;
          materials_cents: number;
          subtotal_cents: number;
          diagnostic_credit_cents: number;
          homeowner_platform_fee_cents: number;
          provider_fee_cents: number;
          provider_fee_percentage: number;
          tax_cents: number;
          total_cents: number;
          provider_net_cents: number;
          line_items: Json;
          work_summary: string | null;
          completion_photos: string[];
          completion_notes: string | null;
          status: InvoiceStatus;
          stripe_payment_intent_id: string | null;
          captured_at: string | null;
          auto_approve_at: string | null;
          submitted_at: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invoice_number?: string;
          service_request_id: string;
          estimate_id?: string | null;
          provider_id: string;
          customer_id: string;
          labor_cents?: number;
          materials_cents?: number;
          line_items?: Json;
          work_summary?: string | null;
          completion_photos?: string[];
          completion_notes?: string | null;
        };
        Update: {
          labor_cents?: number;
          materials_cents?: number;
          subtotal_cents?: number;
          diagnostic_credit_cents?: number;
          homeowner_platform_fee_cents?: number;
          provider_fee_cents?: number;
          provider_fee_percentage?: number;
          tax_cents?: number;
          total_cents?: number;
          provider_net_cents?: number;
          line_items?: Json;
          work_summary?: string | null;
          completion_photos?: string[];
          completion_notes?: string | null;
          status?: InvoiceStatus;
          stripe_payment_intent_id?: string | null;
          captured_at?: string | null;
          auto_approve_at?: string | null;
          submitted_at?: string | null;
          approved_at?: string | null;
          updated_at?: string;
        };
      };

      disputes: {
        Row: {
          id: string;
          dispute_number: string;
          invoice_id: string;
          service_request_id: string;
          customer_id: string;
          provider_id: string;
          reason: DisputeReason;
          description: string;
          evidence_photos: string[];
          disputed_amount_cents: number;
          status: DisputeStatus;
          resolution_notes: string | null;
          refund_amount_cents: number | null;
          resolved_by: string | null;
          resolved_at: string | null;
          dispute_window_ends_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          dispute_number?: string;
          invoice_id: string;
          service_request_id: string;
          customer_id: string;
          provider_id: string;
          reason: DisputeReason;
          description: string;
          evidence_photos?: string[];
          disputed_amount_cents: number;
        };
        Update: {
          status?: DisputeStatus;
          resolution_notes?: string | null;
          refund_amount_cents?: number | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
      };

      territories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          zip_codes: string[];
          counties: string[];
          state: string | null;
          max_sponsor_tiles: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          zip_codes?: string[];
          counties?: string[];
          state?: string | null;
          max_sponsor_tiles?: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          zip_codes?: string[];
          counties?: string[];
          state?: string | null;
          max_sponsor_tiles?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      sponsors: {
        Row: {
          id: string;
          profile_id: string | null;
          business_name: string;
          contact_name: string;
          email: string;
          phone: string | null;
          website: string | null;
          logo_url: string | null;
          sponsor_type: SponsorType;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: SponsorStatus;
          referral_code: string | null;
          referred_homeowners_count: number;
          qualified_homeowners_count: number;
          free_year_earned: boolean;
          free_year_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          business_name: string;
          contact_name: string;
          email: string;
          phone?: string | null;
          website?: string | null;
          logo_url?: string | null;
          sponsor_type: SponsorType;
        };
        Update: {
          business_name?: string;
          contact_name?: string;
          email?: string;
          phone?: string | null;
          website?: string | null;
          logo_url?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: SponsorStatus;
          referral_code?: string | null;
          referred_homeowners_count?: number;
          qualified_homeowners_count?: number;
          free_year_earned?: boolean;
          free_year_expires_at?: string | null;
          updated_at?: string;
        };
      };

      sponsor_tiles: {
        Row: {
          id: string;
          sponsor_id: string;
          territory_id: string;
          tile_position: number;
          headline: string;
          description: string | null;
          cta_text: string;
          cta_url: string | null;
          image_url: string | null;
          target_categories: string[];
          impressions: number;
          clicks: number;
          period_start: string;
          period_end: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          territory_id: string;
          tile_position: number;
          headline: string;
          description?: string | null;
          cta_text?: string;
          cta_url?: string | null;
          image_url?: string | null;
          target_categories?: string[];
          period_start: string;
          period_end: string;
          is_active?: boolean;
        };
        Update: {
          headline?: string;
          description?: string | null;
          cta_text?: string;
          cta_url?: string | null;
          image_url?: string | null;
          target_categories?: string[];
          impressions?: number;
          clicks?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      sponsor_referrals: {
        Row: {
          id: string;
          sponsor_id: string;
          referred_customer_id: string;
          is_qualified: boolean;
          qualified_at: string | null;
          qualification_reason: string | null;
          signup_ip: string | null;
          days_active: number;
          properties_added: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          referred_customer_id: string;
          signup_ip?: string | null;
        };
        Update: {
          is_qualified?: boolean;
          qualified_at?: string | null;
          qualification_reason?: string | null;
          days_active?: number;
          properties_added?: number;
          updated_at?: string;
        };
      };

      provider_customer_notes: {
        Row: {
          id: string;
          provider_id: string;
          customer_id: string;
          property_id: string | null;
          note: string;
          note_type: string;
          is_pinned: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          customer_id: string;
          property_id?: string | null;
          note: string;
          note_type?: string;
          is_pinned?: boolean;
          created_by: string;
        };
        Update: {
          note?: string;
          note_type?: string;
          is_pinned?: boolean;
          updated_at?: string;
        };
      };

      provider_follow_ups: {
        Row: {
          id: string;
          provider_id: string;
          customer_id: string | null;
          service_request_id: string | null;
          title: string;
          description: string | null;
          due_date: string;
          due_time: string | null;
          status: FollowUpStatus;
          completed_at: string | null;
          completed_by: string | null;
          is_recurring: boolean;
          recurrence_pattern: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          customer_id?: string | null;
          service_request_id?: string | null;
          title: string;
          description?: string | null;
          due_date: string;
          due_time?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          due_date?: string;
          due_time?: string | null;
          status?: FollowUpStatus;
          completed_at?: string | null;
          completed_by?: string | null;
          is_recurring?: boolean;
          recurrence_pattern?: string | null;
          updated_at?: string;
        };
      };

      provider_templates: {
        Row: {
          id: string;
          provider_id: string;
          name: string;
          category: string;
          subject: string | null;
          body: string;
          variables: string[];
          is_active: boolean;
          use_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name: string;
          category: string;
          subject?: string | null;
          body: string;
          variables?: string[];
          is_active?: boolean;
        };
        Update: {
          name?: string;
          category?: string;
          subject?: string | null;
          body?: string;
          variables?: string[];
          is_active?: boolean;
          use_count?: number;
          updated_at?: string;
        };
      };

      review_requests: {
        Row: {
          id: string;
          provider_id: string;
          customer_id: string;
          service_request_id: string | null;
          invoice_id: string | null;
          status: ReviewRequestStatus;
          send_at: string | null;
          sent_at: string | null;
          clicked_at: string | null;
          completed_at: string | null;
          rating: number | null;
          review_text: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          customer_id: string;
          service_request_id?: string | null;
          invoice_id?: string | null;
          send_at?: string | null;
        };
        Update: {
          status?: ReviewRequestStatus;
          sent_at?: string | null;
          clicked_at?: string | null;
          completed_at?: string | null;
          rating?: number | null;
          review_text?: string | null;
          updated_at?: string;
        };
      };

      provider_pipeline_stages: {
        Row: {
          id: string;
          provider_id: string;
          name: string;
          description: string | null;
          color: string;
          position: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name: string;
          description?: string | null;
          color?: string;
          position: number;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          position?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };

      platform_metrics_daily: {
        Row: {
          id: string;
          metric_date: string;
          new_homeowners: number;
          active_homeowners: number;
          churned_homeowners: number;
          new_providers: number;
          active_providers: number;
          verified_providers: number;
          preferred_providers: number;
          new_properties: number;
          total_active_properties: number;
          new_service_requests: number;
          completed_service_requests: number;
          canceled_service_requests: number;
          avg_request_to_complete_hours: number | null;
          total_gmv_cents: number;
          total_platform_fees_cents: number;
          total_provider_fees_cents: number;
          total_subscription_revenue_cents: number;
          total_sponsor_revenue_cents: number;
          new_disputes: number;
          resolved_disputes: number;
          dispute_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          metric_date: string;
        };
        Update: {
          new_homeowners?: number;
          active_homeowners?: number;
          churned_homeowners?: number;
          new_providers?: number;
          active_providers?: number;
          verified_providers?: number;
          preferred_providers?: number;
          new_properties?: number;
          total_active_properties?: number;
          new_service_requests?: number;
          completed_service_requests?: number;
          canceled_service_requests?: number;
          avg_request_to_complete_hours?: number | null;
          total_gmv_cents?: number;
          total_platform_fees_cents?: number;
          total_provider_fees_cents?: number;
          total_subscription_revenue_cents?: number;
          total_sponsor_revenue_cents?: number;
          new_disputes?: number;
          resolved_disputes?: number;
          dispute_rate?: number | null;
        };
      };

      provider_metrics_monthly: {
        Row: {
          id: string;
          provider_id: string;
          metric_month: string;
          jobs_received: number;
          jobs_completed: number;
          jobs_canceled: number;
          gross_revenue_cents: number;
          platform_fees_cents: number;
          net_revenue_cents: number;
          avg_rating: number | null;
          reviews_received: number;
          avg_response_time_hours: number | null;
          on_time_completion_rate: number | null;
          new_customers: number;
          repeat_customers: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider_id: string;
          metric_month: string;
        };
        Update: {
          jobs_received?: number;
          jobs_completed?: number;
          jobs_canceled?: number;
          gross_revenue_cents?: number;
          platform_fees_cents?: number;
          net_revenue_cents?: number;
          avg_rating?: number | null;
          reviews_received?: number;
          avg_response_time_hours?: number | null;
          on_time_completion_rate?: number | null;
          new_customers?: number;
          repeat_customers?: number;
        };
      };

      webhook_events: {
        Row: {
          id: string;
          source: string;
          event_id: string;
          event_type: string;
          payload: Json;
          processed: boolean;
          processed_at: string | null;
          error: string | null;
          retry_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          source: string;
          event_id: string;
          event_type: string;
          payload: Json;
        };
        Update: {
          processed?: boolean;
          processed_at?: string | null;
          error?: string | null;
          retry_count?: number;
        };
      };

      // ========================================================================
      // AI TABLES
      // ========================================================================

      ai_jobs: {
        Row: {
          id: string;
          task_type: string;
          actor_user_id: string;
          entity_type: string;
          entity_id: string | null;
          status: AIJobStatus;
          provider: string | null;
          model: string | null;
          latency_ms: number | null;
          cost_estimate_cents: number;
          input_tokens: number | null;
          output_tokens: number | null;
          input_hash: string | null;
          used_cache: boolean;
          cache_source_job_id: string | null;
          correlation_id: string | null;
          error_message: string | null;
          retry_count: number;
          created_at: string;
          completed_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          task_type: string;
          actor_user_id: string;
          entity_type: string;
          entity_id?: string | null;
          status?: AIJobStatus;
          provider?: string | null;
          model?: string | null;
          latency_ms?: number | null;
          cost_estimate_cents?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          input_hash?: string | null;
          used_cache?: boolean;
          cache_source_job_id?: string | null;
          correlation_id?: string | null;
          error_message?: string | null;
          retry_count?: number;
          metadata?: Json;
        };
        Update: {
          status?: AIJobStatus;
          provider?: string | null;
          model?: string | null;
          latency_ms?: number | null;
          cost_estimate_cents?: number;
          input_tokens?: number | null;
          output_tokens?: number | null;
          error_message?: string | null;
          retry_count?: number;
          completed_at?: string | null;
          metadata?: Json;
        };
      };

      ai_outputs: {
        Row: {
          id: string;
          ai_job_id: string;
          entity_type: string;
          entity_id: string | null;
          output_json: Json;
          version: string;
          is_current: boolean;
          superseded_by: string | null;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          ai_job_id: string;
          entity_type: string;
          entity_id?: string | null;
          output_json: Json;
          version?: string;
          is_current?: boolean;
          superseded_by?: string | null;
          expires_at?: string | null;
        };
        Update: {
          is_current?: boolean;
          superseded_by?: string | null;
          expires_at?: string | null;
        };
      };

      ai_feedback: {
        Row: {
          id: string;
          ai_job_id: string;
          ai_output_id: string | null;
          actor_user_id: string;
          rating: AIFeedbackRating;
          reason_code: string | null;
          comment: string | null;
          context_snapshot: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ai_job_id: string;
          ai_output_id?: string | null;
          actor_user_id: string;
          rating: AIFeedbackRating;
          reason_code?: string | null;
          comment?: string | null;
          context_snapshot?: Json | null;
        };
        Update: {
          rating?: AIFeedbackRating;
          reason_code?: string | null;
          comment?: string | null;
        };
      };

      ai_policy_events: {
        Row: {
          id: string;
          ai_job_id: string;
          event_type: string;
          severity: AIPolicySeverity;
          message: string | null;
          metadata: Json;
          action_taken: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ai_job_id: string;
          event_type: string;
          severity: AIPolicySeverity;
          message?: string | null;
          metadata?: Json;
          action_taken?: string | null;
        };
        Update: {
          action_taken?: string | null;
          metadata?: Json;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_ai_job: {
        Args: {
          p_task_type: string;
          p_actor_user_id: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_input_hash: string;
          p_correlation_id: string | null;
          p_metadata: Json;
        };
        Returns: string;
      };
      complete_ai_job: {
        Args: {
          p_job_id: string;
          p_status: string;
          p_provider: string | null;
          p_model: string | null;
          p_latency_ms: number | null;
          p_cost_estimate_cents: number;
          p_input_tokens: number | null;
          p_output_tokens: number | null;
          p_error_message: string | null;
        };
        Returns: void;
      };
      save_ai_output: {
        Args: {
          p_job_id: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_output_json: Json;
          p_version: string;
        };
        Returns: string;
      };
      log_ai_policy_event: {
        Args: {
          p_job_id: string;
          p_event_type: string;
          p_severity: string;
          p_message: string | null;
          p_metadata: Json;
          p_action_taken: string | null;
        };
        Returns: string;
      };
      get_cached_ai_output: {
        Args: {
          p_task_type: string;
          p_entity_type: string;
          p_entity_id: string | null;
          p_input_hash: string;
        };
        Returns: {
          job_id: string;
          output_json: Json;
          created_at: string;
        }[];
      };
      cleanup_expired_ai_data: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      property_type: PropertyType;
      property_member_role: PropertyMemberRole;
      booking_status: BookingStatus;
      maintenance_status: MaintenanceStatus;
      maintenance_priority: MaintenancePriority;
      maintenance_category: MaintenanceCategory;
      quote_status: QuoteStatus;
      document_category: DocumentCategory;
      // New enums
      homeowner_subscription_status: HomeownerSubscriptionStatus;
      payment_method_type: PaymentMethodType;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      provider_stripe_status: ProviderStripeStatus;
      provider_tier: ProviderTier;
      service_request_status: ServiceRequestStatus;
      urgency_level: UrgencyLevel;
      estimate_status: EstimateStatus;
      change_order_status: ChangeOrderStatus;
      invoice_status: InvoiceStatus;
      dispute_status: DisputeStatus;
      dispute_reason: DisputeReason;
      sponsor_type: SponsorType;
      sponsor_status: SponsorStatus;
      follow_up_status: FollowUpStatus;
      review_request_status: ReviewRequestStatus;
      // AI enums
      ai_job_status: AIJobStatus;
      ai_policy_severity: AIPolicySeverity;
      ai_feedback_rating: AIFeedbackRating;
    };
  };
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Existing table types
export type Profile = Tables<"profiles">;
export type Customer = Tables<"customers">;
export type Property = Tables<"properties">;
export type PropertyMember = Tables<"property_members">;
export type Booking = Tables<"bookings">;
export type MaintenanceTask = Tables<"maintenance_tasks">;
export type Quote = Tables<"quotes">;
export type Document = Tables<"documents">;
export type MessageThread = Tables<"message_threads">;
export type Message = Tables<"messages">;
export type Service = Tables<"services">;
export type Provider = Tables<"providers">;
export type Notification = Tables<"notifications">;

// New table types (from pricing/payments/CRM overhaul)
export type AdminConfig = Tables<"admin_config">;
export type HomeownerSubscription = Tables<"homeowner_subscriptions">;
export type PaymentMethod = Tables<"payment_methods">;
export type Transaction = Tables<"transactions">;
export type ProviderStripeAccount = Tables<"provider_stripe_accounts">;
export type ProviderSubscription = Tables<"provider_subscriptions">;
export type ProviderMetrics = Tables<"provider_metrics">;
export type ServiceRequest = Tables<"service_requests">;
export type Estimate = Tables<"estimates">;
export type ChangeOrder = Tables<"change_orders">;
export type Invoice = Tables<"invoices">;
export type Dispute = Tables<"disputes">;
export type Territory = Tables<"territories">;
export type Sponsor = Tables<"sponsors">;
export type SponsorTile = Tables<"sponsor_tiles">;
export type SponsorReferral = Tables<"sponsor_referrals">;
export type ProviderCustomerNote = Tables<"provider_customer_notes">;
export type ProviderFollowUp = Tables<"provider_follow_ups">;
export type ProviderTemplate = Tables<"provider_templates">;
export type ReviewRequest = Tables<"review_requests">;
export type ProviderPipelineStage = Tables<"provider_pipeline_stages">;
export type PlatformMetricsDaily = Tables<"platform_metrics_daily">;
export type ProviderMetricsMonthly = Tables<"provider_metrics_monthly">;
export type WebhookEvent = Tables<"webhook_events">;

// Provider team types (not in generated types yet)
export interface ProviderMember {
  id: string;
  provider_id: string;
  profile_id: string;
  role: ProviderMemberRole;
  status: ProviderMemberStatus;
  invited_by: string | null;
  invite_id: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderInvite {
  id: string;
  provider_id: string;
  invite_code: string;
  email: string | null;
  role: "manager" | "technician";
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Admin Config Types (strongly-typed config values)
// ============================================================================

export interface HomeownerPricingConfig {
  free_homes_limit: number;
  additional_home_monthly_cents: number;
  tenant_access_monthly_cents: number;
  sponsor_free_yearly_cents: number;
}

export interface DiagnosticFeeConfig {
  [category: string]: {
    fee_cents: number;
    creditable: boolean;
  };
}

export interface PlatformFeeTier {
  min_cents: number;
  max_cents: number;
  fee_cents: number;
}

export interface HomeownerPlatformFeesConfig {
  tiers: PlatformFeeTier[];
  cap_cents: number;
}

export interface ProviderFeesConfig {
  percentage: number;
  minimum_cents: number;
}

export interface ProviderTierConfig {
  verified: {
    monthly_cents: number;
    requirements: string[];
  };
  preferred: {
    monthly_cents: number;
    requires_verified: boolean;
    performance_thresholds: {
      min_rating: number;
      min_completed_jobs: number;
      max_dispute_rate: number;
      min_response_time_hours: number;
    };
  };
}

export interface SponsorPricingConfig {
  local_sponsor_yearly_cents: number;
  tiles_per_territory: number;
  max_total_tiles: number; // Max tiles per metro (ADDENDUM D)
  sponsor_types: SponsorType[];
}

// Marketing packages config (ADDENDUM C)
export interface MarketingPackagesConfig {
  priority_dispatch: {
    yearly_cents: number;
    placement_boost_weight: number; // How much to boost in dispatch algorithm
  };
  maintenance_plans: {
    interior_yearly_per_home_cents: number;
    exterior_yearly_per_home_cents: number;
    full_yearly_per_home_cents: number;
    includes_seasonal_visits: number;
  };
  instant_payout: {
    fee_percentage: number; // Additional fee for instant payout
    available_after_verification: boolean;
  };
}

// Provider payout config (ADDENDUM C3)
export interface ProviderPayoutConfig {
  standard_hold_hours: number; // 72h default
  instant_payout_fee_percentage: number; // 1% additional fee
  instant_payout_requires_verified: boolean;
}

export interface RealtorReferralConfig {
  qualified_homeowners_threshold: number;
  reward: string;
  anti_fraud: {
    min_days_active: number;
    min_properties: number;
    require_verified_email: boolean;
  };
}

export interface MarketplacePaymentsConfig {
  estimate_buffer_percentage: number;
  change_order_threshold_percentage: number;
  auto_approve_hours: number;
  dispute_window_hours: number;
  hold_period_hours: number;
}

export interface MediaRequirementsConfig {
  [category: string]: {
    min_photos: number;
    video_required: boolean;
    emergency_exception: boolean;
  };
}

export interface FeatureFlagsConfig {
  // AI Features
  ai_intake_enabled: boolean;
  ai_media_quality_enabled: boolean;
  ai_provider_copilot_enabled: boolean;
  ai_admin_triage_enabled: boolean;
  ai_crm_copilot_enabled: boolean;
  ai_maintenance_coach_enabled: boolean;
  ai_sponsor_copy_enabled: boolean;
  // Platform Features
  sponsor_tiles_enabled: boolean;
  marketplace_payments_enabled: boolean;
  provider_crm_enabled: boolean;
  realtor_referral_enabled: boolean;
}

export interface AIOperationsConfig {
  /** Rate limits per user role per day */
  rate_limits: {
    customer_daily_limit: number;
    provider_daily_limit: number;
    admin_daily_limit: number;
  };
  /** Cost budget in cents per day */
  cost_budgets: {
    daily_budget_cents: number;
    alert_threshold_cents: number;
  };
  /** Privacy and consent settings */
  privacy: {
    media_retention_days: number;
    prompt_retention_days: number;
    hash_sensitive_inputs: boolean;
    require_explicit_consent: boolean;
  };
  /** Data retention settings */
  retention: {
    ai_jobs_retention_days: number;
    ai_outputs_retention_days: number;
    keep_aggregate_metrics: boolean;
  };
}

// Estimate line item type
export interface EstimateLineItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  type: "labor" | "material";
}

// ============================================================================
// AI Tables Types (convenience interfaces for common use)
// Note: AIJobStatus, AIPolicySeverity, AIFeedbackRating enums are defined above
// ============================================================================

export interface AIJob {
  id: string;
  task_type: string;
  actor_user_id: string;
  entity_type: string;
  entity_id: string | null;
  status: AIJobStatus;
  provider: string | null;
  model: string | null;
  latency_ms: number | null;
  cost_estimate_cents: number;
  input_tokens: number | null;
  output_tokens: number | null;
  input_hash: string | null;
  used_cache: boolean;
  cache_source_job_id: string | null;
  correlation_id: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface AIOutput {
  id: string;
  ai_job_id: string;
  entity_type: string;
  entity_id: string | null;
  output_json: Record<string, unknown>;
  version: string;
  is_current: boolean;
  superseded_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface AIFeedback {
  id: string;
  ai_job_id: string;
  ai_output_id: string | null;
  actor_user_id: string;
  rating: AIFeedbackRating;
  reason_code: string | null;
  comment: string | null;
  context_snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface AIPolicyEventRecord {
  id: string;
  ai_job_id: string;
  event_type: string;
  severity: AIPolicySeverity;
  message: string | null;
  metadata: Record<string, unknown>;
  action_taken: string | null;
  created_at: string;
}

// AI Retention Config (stored in admin_config)
export interface AIRetentionConfig {
  ai_jobs_retention_days: number;
  ai_outputs_retention_days: number;
  ai_feedback_retention_days: number;
  ai_policy_events_retention_days: number;
  cache_ttl_hours: number;
}
