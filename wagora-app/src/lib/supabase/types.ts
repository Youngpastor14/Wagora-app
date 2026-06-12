// Auto-generated TypeScript types for the Wagora Supabase database schema
// Keep in sync with the DB schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Plan = 'free' | 'pro' | 'growth' | 'agency';
export type CampaignStatus = 'Live' | 'Paused' | 'Draft' | 'Complete' | 'Needs attention';
export type CampaignPlatform = 'Email' | 'LinkedIn' | 'Instagram';
export type ProspectStatus = 'New' | 'Outreach sent' | 'Replied' | 'In closing sequence' | 'Call booked' | 'Closed' | 'Not a fit';
export type ConversationStatus = 'Wagora responding' | 'Awaiting reply' | 'In closing sequence' | 'Call booked' | 'Closed' | 'Flagged — input needed';
export type DealStatus = 'Payment confirmed' | 'Awaiting payment' | 'In delivery' | 'Complete';
export type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Paid' | 'Overdue';
export type DocumentStatus = 'Processing' | 'Active' | 'Error — reupload';
export type ActivityType = 'prospect_found' | 'reply_received' | 'deal_closed' | 'campaign_status' | 'outreach_sent' | 'call_booked' | 'flagged';
export type NotificationType = 'deal_closed' | 'call_booked' | 'new_reply' | 'input_needed' | 'campaign_complete' | 'limit_reached' | 'platform_disconnected' | 'payment_confirmed';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          business_name: string | null;
          industry: string | null;
          country: string | null;
          avatar_url: string | null;
          plan: Plan;
          trial_ends_at: string;
          email_verified_at: string | null;
          onboarding_completed: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          business_name?: string | null;
          industry?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          plan?: Plan;
          trial_ends_at?: string;
          email_verified_at?: string | null;
          onboarding_completed?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          business_name?: string | null;
          industry?: string | null;
          country?: string | null;
          avatar_url?: string | null;
          plan?: Plan;
          onboarding_completed?: boolean;
        };
      };

      workspace_settings: {
        Row: {
          user_id: string;
          daily_outreach_limit: number;
          what_you_sell: string | null;
          target_client_description: string | null;
          average_deal_value: number | null;
          connected_platforms: Json;
          notification_prefs: Json;
        };
        Insert: {
          user_id: string;
          daily_outreach_limit?: number;
          what_you_sell?: string | null;
          target_client_description?: string | null;
          average_deal_value?: number | null;
          connected_platforms?: Json;
          notification_prefs?: Json;
        };
        Update: {
          daily_outreach_limit?: number;
          what_you_sell?: string | null;
          target_client_description?: string | null;
          average_deal_value?: number | null;
          connected_platforms?: Json;
          notification_prefs?: Json;
        };
      };

      campaigns: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          platform: CampaignPlatform;
          description: string | null;
          status: CampaignStatus;
          prospects: number;
          replies: number;
          closed: number;
          last_active: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          platform: CampaignPlatform;
          description?: string | null;
          status?: CampaignStatus;
          prospects?: number;
          replies?: number;
          closed?: number;
          last_active?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          platform?: CampaignPlatform;
          description?: string | null;
          status?: CampaignStatus;
          prospects?: number;
          replies?: number;
          closed?: number;
          last_active?: string | null;
        };
      };

      prospects: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string | null;
          name: string;
          company: string | null;
          role: string | null;
          email: string | null;
          score: number;
          platform: CampaignPlatform;
          status: ProspectStatus;
          last_contact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          campaign_id?: string | null;
          name: string;
          company?: string | null;
          role?: string | null;
          email?: string | null;
          score?: number;
          platform: CampaignPlatform;
          status?: ProspectStatus;
          last_contact?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          company?: string | null;
          role?: string | null;
          email?: string | null;
          score?: number;
          platform?: CampaignPlatform;
          status?: ProspectStatus;
          last_contact?: string | null;
        };
      };

      conversations: {
        Row: {
          id: string;
          user_id: string;
          prospect_id: string | null;
          prospect_name: string;
          prospect_company: string | null;
          platform: CampaignPlatform;
          status: ConversationStatus;
          last_message: string | null;
          last_message_time: string | null;
          unread: boolean;
          campaign_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          prospect_id?: string | null;
          prospect_name: string;
          prospect_company?: string | null;
          platform: CampaignPlatform;
          status?: ConversationStatus;
          last_message?: string | null;
          last_message_time?: string | null;
          unread?: boolean;
          campaign_name?: string | null;
          created_at?: string;
        };
        Update: {
          status?: ConversationStatus;
          last_message?: string | null;
          last_message_time?: string | null;
          unread?: boolean;
        };
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender: 'wagora' | 'prospect' | 'user';
          content: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender: 'wagora' | 'prospect' | 'user';
          content: string;
          timestamp?: string;
        };
        Update: never;
      };

      deals: {
        Row: {
          id: string;
          user_id: string;
          client: string;
          company: string | null;
          service: string | null;
          value: number;
          closed_date: string | null;
          campaign: string | null;
          status: DealStatus;
          closed_via: 'Chat' | 'Call' | null;
          conversation_summary: string | null;
          commitments: string[];
          suggested_next_step: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          client: string;
          company?: string | null;
          service?: string | null;
          value?: number;
          closed_date?: string | null;
          campaign?: string | null;
          status?: DealStatus;
          closed_via?: 'Chat' | 'Call' | null;
          conversation_summary?: string | null;
          commitments?: string[];
          suggested_next_step?: string | null;
          created_at?: string;
        };
        Update: {
          client?: string;
          company?: string | null;
          service?: string | null;
          value?: number;
          status?: DealStatus;
          commitments?: string[];
          suggested_next_step?: string | null;
        };
      };

      invoices: {
        Row: {
          id: string;
          deal_id: string | null;
          user_id: string;
          invoice_number: string;
          template_id: string | null;
          client_name: string;
          client_email: string | null;
          client_company: string | null;
          line_items: Json;
          subtotal: number;
          tax: number;
          total: number;
          currency: string;
          payment_details_type: 'local' | 'international' | null;
          status: InvoiceStatus;
          issued_at: string | null;
          due_at: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deal_id?: string | null;
          user_id?: string;
          invoice_number: string;
          template_id?: string | null;
          client_name: string;
          client_email?: string | null;
          client_company?: string | null;
          line_items?: Json;
          subtotal?: number;
          tax?: number;
          total?: number;
          currency?: string;
          payment_details_type?: 'local' | 'international' | null;
          status?: InvoiceStatus;
          issued_at?: string | null;
          due_at?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          client_name?: string;
          client_email?: string | null;
          client_company?: string | null;
          line_items?: Json;
          subtotal?: number;
          tax?: number;
          total?: number;
          status?: InvoiceStatus;
          paid_at?: string | null;
        };
      };

      invoice_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          default_currency: string;
          payment_details_local: Json | null;
          payment_details_international: Json | null;
          logo_url: string | null;
          footer_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          default_currency?: string;
          payment_details_local?: Json | null;
          payment_details_international?: Json | null;
          logo_url?: string | null;
          footer_note?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          default_currency?: string;
          payment_details_local?: Json | null;
          payment_details_international?: Json | null;
          logo_url?: string | null;
          footer_note?: string | null;
        };
      };

      activities: {
        Row: {
          id: string;
          user_id: string;
          type: ActivityType;
          message: string;
          meta: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: ActivityType;
          message: string;
          meta?: string | null;
          created_at?: string;
        };
        Update: never;
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          message: string;
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: NotificationType;
          message: string;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          read?: boolean;
        };
      };

      brand_documents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          file_type: string;
          size: string;
          storage_path: string;
          status: DocumentStatus;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          file_type: string;
          size: string;
          storage_path: string;
          status?: DocumentStatus;
          uploaded_at?: string;
        };
        Update: {
          status?: DocumentStatus;
        };
      };
    };
  };
}
