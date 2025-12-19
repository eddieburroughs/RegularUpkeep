export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
    };
    Views: {};
    Functions: {};
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
