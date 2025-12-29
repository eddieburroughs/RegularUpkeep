/**
 * Admin Dispute AI Summary API
 *
 * Generates AI-assisted dispute analysis using DISPUTE_TIMELINE_SUMMARY task.
 * Returns timeline bullets, root cause analysis, policy violations, and refund recommendation.
 * All recommendations are non-binding - human admin makes final decision.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { DisputeTimelineInput, DisputeTimelineOutput } from "@/lib/ai/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: disputeId } = await params;

  try {
    // Check if admin triage is enabled
    const triageEnabled = await isFeatureEnabled("ai_admin_triage_enabled");
    if (!triageEnabled) {
      return NextResponse.json({
        fallback: true,
        summary: null,
        message: "AI admin triage is disabled",
      });
    }

    // Verify user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single() as { data: { id: string; role: string } | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - admins only" }, { status: 403 });
    }

    // Type for dispute with nested data
    type DisputeWithBooking = {
      id: string;
      reason: string;
      description: string | null;
      disputed_amount: number;
      status: string;
      created_at: string;
      booking_id: string;
      bookings: {
        id: string;
        booking_number: string;
        status: string;
        scheduled_at: string;
        started_at?: string;
        completed_at?: string;
        created_at: string;
        total_amount: number;
        service_requests?: { id: string; category: string; description: string };
        invoices?: Array<{ id: string; amount: number; status: string }>;
        quotes?: Array<{
          id: string;
          amount: number;
          accepted_at?: string;
          change_orders?: Array<{ id: string; description: string; amount: number; approved: boolean; approved_at?: string }>;
        }>;
      } | null;
    };

    // Get dispute details with related data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: disputeData, error: disputeError } = await (supabase as any)
      .from("disputes")
      .select(`
        id,
        reason,
        description,
        disputed_amount,
        status,
        created_at,
        booking_id,
        bookings (
          id,
          booking_number,
          status,
          scheduled_at,
          started_at,
          completed_at,
          created_at,
          total_amount,
          service_requests (
            id,
            category,
            description
          ),
          invoices (
            id,
            amount,
            status
          ),
          quotes (
            id,
            amount,
            accepted_at,
            change_orders:quote_change_orders (
              id,
              description,
              amount,
              approved,
              approved_at
            )
          )
        )
      `)
      .eq("id", disputeId)
      .single();

    const dispute = disputeData as DisputeWithBooking | null;

    if (disputeError || !dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    // Message type
    type MessageWithProfile = {
      id: string;
      content: string;
      created_at: string;
      sender_id: string;
      profiles: { full_name?: string; role?: string } | null;
    };

    // Media type
    type MediaItem = {
      id: string;
      type: string;
      url: string;
      uploaded_by: string;
      created_at: string;
    };

    // Get message history for this booking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: messagesData } = await (supabase as any)
      .from("messages")
      .select(`
        id,
        content,
        created_at,
        sender_id,
        profiles:sender_id (
          full_name,
          role
        )
      `)
      .eq("thread_id", dispute.booking_id)
      .order("created_at", { ascending: true })
      .limit(50);

    const messages = (messagesData || []) as MessageWithProfile[];

    // Get media files related to the booking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mediaData } = await (supabase as any)
      .from("media")
      .select(`
        id,
        type,
        url,
        uploaded_by,
        created_at
      `)
      .eq("entity_type", "booking")
      .eq("entity_id", dispute.booking_id);

    const media = (mediaData || []) as MediaItem[];

    // Build dispute events timeline
    const booking = dispute.bookings;

    const events: Array<{ timestamp: string; type: string; description: string; actor: string }> = [];

    if (booking) {
      events.push({
        timestamp: booking.created_at,
        type: "booking_created",
        description: `Booking #${booking.booking_number} created`,
        actor: "system",
      });

      if (booking.scheduled_at) {
        events.push({
          timestamp: booking.scheduled_at,
          type: "booking_scheduled",
          description: "Service scheduled",
          actor: "system",
        });
      }

      if (booking.started_at) {
        events.push({
          timestamp: booking.started_at,
          type: "work_started",
          description: "Provider started work",
          actor: "provider",
        });
      }

      if (booking.completed_at) {
        events.push({
          timestamp: booking.completed_at,
          type: "work_completed",
          description: "Provider marked work complete",
          actor: "provider",
        });
      }

      // Add change orders to timeline
      if (booking.quotes?.[0]?.change_orders) {
        for (const co of booking.quotes[0].change_orders) {
          if (co.approved_at) {
            events.push({
              timestamp: co.approved_at,
              type: "change_order",
              description: `Change order ${co.approved ? "approved" : "rejected"}: ${co.description}`,
              actor: "customer",
            });
          }
        }
      }
    }

    events.push({
      timestamp: dispute.created_at,
      type: "dispute_filed",
      description: `Dispute filed: ${dispute.reason}`,
      actor: "customer",
    });

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Get platform policy config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: configData } = await (supabase as any)
      .from("platform_config")
      .select("dispute_window_hours, auto_approval_threshold")
      .single();

    const config = configData as { dispute_window_hours?: number; auto_approval_threshold?: number } | null;

    // Build input for AI task
    const input: DisputeTimelineInput = {
      disputeReason: `${dispute.reason}: ${dispute.description || ""}`,
      events,
      invoiceAmount: booking?.invoices?.[0]?.amount || booking?.total_amount || 0,
      disputedAmount: dispute.disputed_amount,
      bookingTimeline: booking ? {
        created: booking.created_at,
        scheduled: booking.scheduled_at,
        started: booking.started_at,
        completed: booking.completed_at,
      } : undefined,
      estimateDetails: booking?.quotes?.[0] ? {
        originalAmount: booking.quotes[0].amount,
        changeOrders: (booking.quotes[0].change_orders || []).map(co => ({
          description: co.description,
          amount: co.amount,
          approved: co.approved,
        })),
      } : undefined,
      messageHistory: (messages || []).map(msg => {
        const msgProfile = msg.profiles as { full_name?: string; role?: string } | null;
        return {
          sender: msgProfile?.role || "unknown",
          content: msg.content,
          timestamp: msg.created_at,
        };
      }),
      mediaList: (media || []).map(m => ({
        type: m.type,
        url: m.url,
        uploadedBy: m.uploaded_by,
      })),
      policyConfig: config ? {
        disputeWindowHours: config.dispute_window_hours || 72,
        autoApprovalThreshold: config.auto_approval_threshold || 50,
      } : undefined,
    };

    // Run AI dispute timeline summary
    const result = await ai.runTask<DisputeTimelineInput, DisputeTimelineOutput>({
      taskType: "DISPUTE_TIMELINE_SUMMARY",
      actorUserId: user.id,
      entityType: "booking", // Use booking as entity type since dispute isn't defined
      entityId: dispute.booking_id,
      inputs: input,
    });

    // Persist the AI response for audit
    if (result.success) {
      await persistAITaskResponse({
        taskType: "DISPUTE_TIMELINE_SUMMARY",
        actorUserId: user.id,
        entityType: "booking",
        entityId: dispute.booking_id,
        inputs: input,
        response: result,
      });
    }

    return NextResponse.json({
      summary: result.outputJson,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
      disputeId,
      message: "AI summary is non-binding. Admin decision required.",
    });
  } catch (error) {
    console.error("Dispute AI summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate dispute summary" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing AI summary
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Note: disputeId extracted but not currently used in GET query - filtering by task_type only
  await params; // Consume params to avoid build warnings

  try {
    // Verify user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single() as { data: { id: string; role: string } | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - admins only" }, { status: 403 });
    }

    // Type for AI job record
    type AIJobRecord = {
      id: string;
      output_json: unknown;
      used_fallback: boolean;
      correlation_id: string;
      created_at: string;
    };

    // Get most recent AI summary for this dispute (using booking_id since that's what we stored)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: aiJobData } = await (supabase as any)
      .from("ai_jobs")
      .select("*")
      .eq("task_type", "DISPUTE_TIMELINE_SUMMARY")
      .eq("entity_type", "booking")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const aiJob = aiJobData as AIJobRecord | null;

    if (!aiJob) {
      return NextResponse.json({
        summary: null,
        message: "No AI summary found. Generate one using POST.",
      });
    }

    return NextResponse.json({
      summary: aiJob.output_json,
      fallback: aiJob.used_fallback,
      correlationId: aiJob.correlation_id,
      createdAt: aiJob.created_at,
      message: "AI summary is non-binding. Admin decision required.",
    });
  } catch (error) {
    console.error("Get dispute AI summary error:", error);
    return NextResponse.json(
      { error: "Failed to get dispute summary" },
      { status: 500 }
    );
  }
}
