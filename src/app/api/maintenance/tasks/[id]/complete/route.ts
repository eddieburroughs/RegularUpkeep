/**
 * Task Completion API
 *
 * POST /api/maintenance/tasks/[id]/complete - Mark task as completed
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markTaskComplete } from "@/lib/maintenance";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task } = await (supabase as any)
      .from("property_maintenance_tasks")
      .select("property_id")
      .eq("id", id)
      .single() as { data: { property_id: string } | null };

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check access - homeowner or provider with assigned request
    const { data: member } = await supabase
      .from("property_members")
      .select("member_role")
      .eq("property_id", task.property_id)
      .eq("user_id", user.id)
      .single() as { data: { member_role: string } | null };

    const isPropertyOwner = member && ["owner", "manager"].includes(member.member_role);

    // Check if user is provider with linked request
    let relatedRequestId: string | undefined;
    if (!isPropertyOwner) {
      const { data: providerMember } = await supabase
        .from("provider_members")
        .select("provider_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single() as { data: { provider_id: string } | null };

      if (providerMember) {
        // Check for linked request
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: link } = await (supabase as any)
          .from("maintenance_task_request_links")
          .select(`
            request_id,
            service_requests!inner(provider_id)
          `)
          .eq("property_task_id", id)
          .eq("service_requests.provider_id", providerMember.provider_id)
          .single() as { data: { request_id: string } | null };

        if (link) {
          relatedRequestId = link.request_id;
        } else {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { notes, cost_cents, attachments } = body;

    const result = await markTaskComplete(supabase, id, user.id, {
      notes,
      costCents: cost_cents,
      attachments,
      relatedRequestId,
      completionSource: relatedRequestId ? "provider_job" : "manual",
    });

    return NextResponse.json({
      success: true,
      completion: result.completion,
      next_due_date: result.nextDueDate,
    });
  } catch (error) {
    console.error("[Maintenance API] Complete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete task" },
      { status: 500 }
    );
  }
}
