/**
 * CRM Next Best Action API
 *
 * Generates AI-suggested next actions for customer engagement.
 * Behind ai_crm_copilot_enabled feature flag.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse, submitAIFeedback } from "@/lib/ai";
import type { CrmNextActionInput, CrmNextActionOutput } from "@/lib/ai/types";
import { getTaskDefinition } from "@/lib/ai/tasks";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { customerId, bookingId } = body as { customerId?: string; bookingId?: string };

    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    // Verify user is a provider
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single() as { data: { id: string; role: string } | null };

    if (!profile || profile.role !== "provider") {
      return NextResponse.json({ error: "Forbidden - providers only" }, { status: 403 });
    }

    // Check if CRM copilot is enabled
    const crmEnabled = await isFeatureEnabled("ai_crm_copilot_enabled");

    // Get customer data with booking history
    type CustomerWithHistory = {
      id: string;
      profiles: { full_name: string; email: string } | null;
      created_at: string;
      subscription_tier?: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customerData, error: customerError } = await (supabase as any)
      .from("customers")
      .select(`
        id,
        profiles (
          full_name,
          email
        ),
        created_at,
        subscription_tier
      `)
      .eq("id", customerId)
      .single();

    const customer = customerData as CustomerWithHistory | null;

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Get provider info
    type ProviderInfo = {
      id: string;
      service_categories: string[];
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: providerData } = await (supabase as any)
      .from("providers")
      .select("id, service_categories")
      .eq("user_id", user.id)
      .single();

    const provider = providerData as ProviderInfo | null;

    // Get booking history for this customer with this provider
    type BookingRecord = {
      id: string;
      status: string;
      total_amount: number;
      scheduled_at: string;
      completed_at?: string;
      customer_rating?: number;
      service_requests?: { category: string };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookingsData } = await (supabase as any)
      .from("bookings")
      .select(`
        id,
        status,
        total_amount,
        scheduled_at,
        completed_at,
        customer_rating,
        service_requests (
          category
        )
      `)
      .eq("customer_id", customerId)
      .eq("provider_id", provider?.id)
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(20);

    const bookings = (bookingsData || []) as BookingRecord[];

    // Calculate customer metrics
    const completedBookings = bookings.filter(b => b.status === "completed");
    const totalSpend = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const avgRating = completedBookings.length > 0
      ? completedBookings.reduce((sum, b) => sum + (b.customer_rating || 5), 0) / completedBookings.length
      : 5;
    const lastJobDate = completedBookings[0]?.completed_at || completedBookings[0]?.scheduled_at || customer.created_at;

    // Get recent interactions (messages)
    type MessageRecord = {
      content: string;
      created_at: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: messagesData } = await (supabase as any)
      .from("messages")
      .select("content, created_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(10);

    const messages = (messagesData || []) as MessageRecord[];
    const recentInteractions = messages.map(m => `${m.created_at.split("T")[0]}: ${m.content.substring(0, 100)}`);

    // Get booking context if provided
    let bookingContext: CrmNextActionInput["bookingContext"] | undefined;

    if (bookingId) {
      const currentBooking = bookings.find(b => b.id === bookingId);
      if (currentBooking) {
        bookingContext = {
          bookingId,
          serviceCategory: currentBooking.service_requests?.category || "general",
          status: currentBooking.status,
          scheduledDate: currentBooking.scheduled_at,
          completedDate: currentBooking.completed_at,
          amount: currentBooking.total_amount,
        };
      }
    }

    // Build input for AI task
    const input: CrmNextActionInput = {
      customerId,
      customerName: customer.profiles?.full_name || "Customer",
      customerHistory: {
        totalJobs: completedBookings.length,
        totalSpend: totalSpend / 100, // Convert cents to dollars
        lastJobDate,
        avgRating,
        memberSince: customer.created_at,
        subscriptionTier: customer.subscription_tier as "essential" | "standard" | "premium" | undefined,
      },
      recentInteractions,
      bookingContext,
      providerCategories: provider?.service_categories || [],
    };

    // If AI is disabled, return fallback
    if (!crmEnabled) {
      const task = getTaskDefinition("CRM_NEXT_BEST_ACTION")!;
      const fallbackOutput = task.getFallback(input) as CrmNextActionOutput;

      return NextResponse.json({
        suggestions: fallbackOutput,
        fallback: true,
        featureDisabled: true,
        message: "AI CRM copilot is disabled. Showing rule-based suggestions.",
      });
    }

    // Run AI task
    const result = await ai.runTask<CrmNextActionInput, CrmNextActionOutput>({
      taskType: "CRM_NEXT_BEST_ACTION",
      actorUserId: user.id,
      entityType: "customer",
      entityId: customerId,
      inputs: input,
    });

    // Persist the response
    const { jobId } = await persistAITaskResponse({
      taskType: "CRM_NEXT_BEST_ACTION",
      actorUserId: user.id,
      entityType: "customer",
      entityId: customerId,
      inputs: input,
      response: result,
    });

    return NextResponse.json({
      suggestions: result.outputJson,
      fallback: result.usedFallback,
      jobId,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("CRM next action error:", error);
    return NextResponse.json(
      { error: "Failed to generate CRM suggestions" },
      { status: 500 }
    );
  }
}

// POST feedback on CRM suggestions
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId, rating, reasonCode, comment } = body as {
      jobId: string;
      rating: "up" | "down";
      reasonCode?: string;
      comment?: string;
    };

    if (!jobId || !rating) {
      return NextResponse.json({ error: "jobId and rating are required" }, { status: 400 });
    }

    const feedbackId = await submitAIFeedback({
      jobId,
      actorUserId: user.id,
      rating,
      reasonCode,
      comment,
    });

    return NextResponse.json({ success: true, feedbackId });
  } catch (error) {
    console.error("CRM feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
