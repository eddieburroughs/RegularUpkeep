/**
 * Maintenance Task Notifications Cron Job
 *
 * Sends daily email digests, push notifications, and SMS for upcoming and overdue maintenance tasks.
 * Should be run daily at 8 AM via external cron.
 *
 * Logic:
 * 1. Find users with tasks due in next 3 days or overdue
 * 2. Check notification preferences
 * 3. Send email digest, push notifications, SMS, and create in-app notifications
 * 4. Mark tasks as notified
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { taskDigestEmail } from "@/lib/email/templates";
import { sendPushNotification, isPushConfigured } from "@/lib/push";
import { sendSms, isSmsConfigured, smsTemplates } from "@/lib/sms";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.regularupkeep.com";

// Use service role for cron jobs to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TaskForNotification {
  id: string;
  title: string;
  category: string;
  priority: string;
  next_due_date: string;
  property_id: string;
  property_nickname: string | null;
  property_address: string | null;
  is_overdue: boolean;
  // Equipment details
  system_id: string | null;
  equipment_brand: string | null;
  equipment_model: string | null;
  filter_size: string | null;
  enriched_title: string;
}

interface UserForNotification {
  profile_id: string;
  email: string;
  phone: string | null;
  full_name: string;
  notification_preferences: {
    maintenance_reminders?: boolean;
    maintenance_frequency?: "daily" | "weekly" | "never";
    email_enabled?: boolean;
    push_enabled?: boolean;
    sms_enabled?: boolean;
  };
  overdue_count: number;
  due_soon_count: number;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    usersProcessed: 0,
    emailsSent: 0,
    emailsFailed: 0,
    pushSent: 0,
    pushFailed: 0,
    smsSent: 0,
    smsFailed: 0,
    inAppCreated: 0,
    tasksMarked: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get users needing notifications
    const { data: users, error: usersError } = await supabaseAdmin.rpc(
      "get_users_needing_task_notifications",
      { p_days_ahead: 3 }
    );

    if (usersError) {
      console.error("[TaskNotifications] Error getting users:", usersError);
      return NextResponse.json(
        { error: "Failed to get users", details: usersError.message },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        message: "No users need notifications",
        duration: Date.now() - startTime,
      });
    }

    console.log(`[TaskNotifications] Processing ${users.length} users`);

    // 2. Process each user
    for (const user of users as UserForNotification[]) {
      try {
        // Check notification preferences
        const prefs = user.notification_preferences || {};
        const emailEnabled = prefs.email_enabled !== false;
        const pushEnabled = prefs.push_enabled !== false && isPushConfigured();
        const smsEnabled = prefs.sms_enabled === true && isSmsConfigured() && !!user.phone;

        // Get tasks for this user
        const { data: tasks, error: tasksError } = await supabaseAdmin.rpc(
          "get_tasks_for_notification",
          { p_profile_id: user.profile_id, p_days_ahead: 3 }
        );

        if (tasksError || !tasks || tasks.length === 0) {
          continue;
        }

        const typedTasks = tasks as TaskForNotification[];
        const overdueTasks = typedTasks.filter((t) => t.is_overdue);
        const dueSoonTasks = typedTasks.filter((t) => !t.is_overdue);

        // Send email if enabled
        if (emailEnabled && user.email) {
          const emailData = taskDigestEmail({
            userName: user.full_name || "there",
            overdueTasks: overdueTasks.map((t) => ({
              id: t.id,
              title: t.enriched_title || t.title, // Use enriched title with equipment details
              category: t.category,
              priority: t.priority,
              next_due_date: t.next_due_date,
              property_nickname: t.property_nickname || undefined,
              property_address: t.property_address || undefined,
            })),
            dueSoonTasks: dueSoonTasks.map((t) => ({
              id: t.id,
              title: t.enriched_title || t.title, // Use enriched title with equipment details
              category: t.category,
              priority: t.priority,
              next_due_date: t.next_due_date,
              property_nickname: t.property_nickname || undefined,
              property_address: t.property_address || undefined,
            })),
            appUrl: APP_URL,
          });

          const emailResult = await sendEmail({
            to: user.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          });

          if (emailResult.success) {
            results.emailsSent++;

            // Log the notification
            await supabaseAdmin.from("notification_log").insert({
              profile_id: user.profile_id,
              type: "task_digest",
              channel: "email",
              subject: emailData.subject,
              body_preview: `${overdueTasks.length} overdue, ${dueSoonTasks.length} due soon`,
              status: "sent",
              metadata: {
                taskIds: typedTasks.map((t) => t.id),
                overdueCount: overdueTasks.length,
                dueSoonCount: dueSoonTasks.length,
              },
              dedup_key: `task_digest_${user.profile_id}_${new Date().toISOString().split("T")[0]}`,
            });
          } else {
            results.emailsFailed++;
            results.errors.push(`Email to ${user.email}: ${emailResult.error}`);
          }
        }

        // Send push notifications if enabled
        if (pushEnabled) {
          // Get user's push subscriptions
          const { data: pushSubs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("endpoint, p256dh_key, auth_key")
            .eq("profile_id", user.profile_id)
            .eq("is_active", true);

          if (pushSubs && pushSubs.length > 0) {
            // Send a summary push notification
            const taskCount = typedTasks.length;
            const overdueCount = overdueTasks.length;

            const pushPayload = {
              title: overdueCount > 0
                ? `${overdueCount} Overdue Task${overdueCount > 1 ? "s" : ""}`
                : `${taskCount} Task${taskCount > 1 ? "s" : ""} Due Soon`,
              body: overdueCount > 0
                ? `You have ${overdueCount} overdue and ${dueSoonTasks.length} upcoming maintenance tasks.`
                : `You have ${taskCount} maintenance task${taskCount > 1 ? "s" : ""} due in the next few days.`,
              url: "/app/calendar",
              tag: `task-digest-${new Date().toISOString().split("T")[0]}`,
              requireInteraction: overdueCount > 0,
            };

            for (const sub of pushSubs) {
              try {
                const pushResult = await sendPushNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
                  },
                  pushPayload
                );

                if (pushResult.success) {
                  results.pushSent++;
                } else {
                  results.pushFailed++;
                  // Mark subscription as errored or deactivate if expired
                  if (pushResult.error === "subscription_expired") {
                    await supabaseAdmin.rpc("deactivate_push_subscription", {
                      p_endpoint: sub.endpoint,
                    });
                  } else {
                    await supabaseAdmin.rpc("mark_push_subscription_error", {
                      p_endpoint: sub.endpoint,
                    });
                  }
                }
              } catch (pushError) {
                results.pushFailed++;
                console.error(`Push notification error:`, pushError);
              }
            }

            // Log push notification
            await supabaseAdmin.from("notification_log").insert({
              profile_id: user.profile_id,
              type: "task_digest",
              channel: "push",
              subject: pushPayload.title,
              body_preview: pushPayload.body,
              status: "sent",
              metadata: {
                taskIds: typedTasks.map((t) => t.id),
                overdueCount: overdueTasks.length,
                dueSoonCount: dueSoonTasks.length,
              },
            });
          }
        }

        // Send SMS if enabled (only for overdue tasks to avoid spam)
        if (smsEnabled && user.phone && overdueTasks.length > 0) {
          try {
            // Create SMS message - use enriched title with equipment details
            const smsBody = overdueTasks.length === 1
              ? smsTemplates.taskOverdue(
                  overdueTasks[0].enriched_title || overdueTasks[0].title,
                  overdueTasks[0].property_nickname || overdueTasks[0].property_address || "your property"
                )
              : `RegularUpkeep: You have ${overdueTasks.length} overdue maintenance tasks. View at app.regularupkeep.com/app/calendar`;

            const smsResult = await sendSms(user.phone, smsBody);

            if (smsResult.success) {
              results.smsSent++;

              // Log SMS notification
              await supabaseAdmin.from("notification_log").insert({
                profile_id: user.profile_id,
                type: "task_overdue",
                channel: "sms",
                subject: "Overdue Tasks",
                body_preview: smsBody.substring(0, 100),
                status: "sent",
                metadata: {
                  taskIds: overdueTasks.map((t) => t.id),
                  messageId: smsResult.messageId,
                },
                dedup_key: `sms_overdue_${user.profile_id}_${new Date().toISOString().split("T")[0]}`,
              });
            } else {
              results.smsFailed++;
              results.errors.push(`SMS to ${user.phone}: ${smsResult.error}`);
            }
          } catch (smsError) {
            results.smsFailed++;
            console.error(`SMS error for user ${user.profile_id}:`, smsError);
          }
        }

        // Create in-app notifications for overdue tasks
        for (const task of overdueTasks) {
          await supabaseAdmin.from("notifications").insert({
            profile_id: user.profile_id,
            type: "task_overdue",
            title: `Overdue: ${task.enriched_title || task.title}`,
            body: `This task at ${task.property_nickname || task.property_address || "your property"} was due on ${new Date(task.next_due_date).toLocaleDateString()}.`,
            data: {
              taskId: task.id,
              propertyId: task.property_id,
              systemId: task.system_id,
              link: `/app/calendar/${task.id}`,
            },
          });
          results.inAppCreated++;
        }

        // Mark tasks as notified
        const taskIds = typedTasks.map((t) => t.id);
        const { data: markedCount } = await supabaseAdmin.rpc("mark_tasks_notified", {
          p_task_ids: taskIds,
        });
        results.tasksMarked += markedCount || 0;

        results.usersProcessed++;
      } catch (userError) {
        console.error(`[TaskNotifications] Error processing user ${user.profile_id}:`, userError);
        results.errors.push(`User ${user.profile_id}: ${(userError as Error).message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[TaskNotifications] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      success: true,
      duration,
      ...results,
    });
  } catch (error) {
    console.error("[TaskNotifications] Fatal error:", error);
    return NextResponse.json(
      { error: "Internal error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
