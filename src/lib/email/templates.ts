/**
 * Email Templates
 *
 * HTML email templates for various notifications.
 */

interface TaskForEmail {
  id: string;
  title: string;
  category: string;
  priority: string;
  next_due_date: string;
  property_nickname?: string;
  property_address?: string;
}

interface TaskDigestData {
  userName: string;
  overdueTasks: TaskForEmail[];
  dueSoonTasks: TaskForEmail[];
  appUrl: string;
}

/**
 * Format a date for email display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Get priority color
 */
function getPriorityColor(priority: string): string {
  switch (priority) {
    case "urgent":
      return "#dc2626"; // red
    case "high":
      return "#ea580c"; // orange
    case "normal":
      return "#2563eb"; // blue
    case "low":
      return "#6b7280"; // gray
    default:
      return "#2563eb";
  }
}

/**
 * Format category for display
 */
function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate task row HTML
 */
function taskRow(task: TaskForEmail, isOverdue: boolean): string {
  const propertyName = task.property_nickname || task.property_address || "Your Property";
  const dueText = isOverdue ? `Overdue: ${formatDate(task.next_due_date)}` : `Due: ${formatDate(task.next_due_date)}`;
  const dueColor = isOverdue ? "#dc2626" : "#6b7280";

  return `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-weight: 500; color: #111827;">${task.title}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">
          ${propertyName} &bull; ${formatCategory(task.category)}
        </div>
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; background-color: ${getPriorityColor(task.priority)}20; color: ${getPriorityColor(task.priority)};">
          ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
        </span>
        <div style="font-size: 12px; color: ${dueColor}; margin-top: 4px;">
          ${dueText}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Daily task digest email template
 */
export function taskDigestEmail(data: TaskDigestData): { subject: string; html: string; text: string } {
  const totalTasks = data.overdueTasks.length + data.dueSoonTasks.length;
  const hasOverdue = data.overdueTasks.length > 0;

  const subject = hasOverdue
    ? `⚠️ ${data.overdueTasks.length} overdue task${data.overdueTasks.length > 1 ? "s" : ""} need attention`
    : `${totalTasks} maintenance task${totalTasks > 1 ? "s" : ""} due soon`;

  const overdueSection =
    data.overdueTasks.length > 0
      ? `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 16px; font-weight: 600; color: #dc2626; margin: 0 0 12px 0;">
        ⚠️ Overdue Tasks (${data.overdueTasks.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        ${data.overdueTasks.map((t) => taskRow(t, true)).join("")}
      </table>
    </div>
  `
      : "";

  const dueSoonSection =
    data.dueSoonTasks.length > 0
      ? `
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 16px; font-weight: 600; color: #2563eb; margin: 0 0 12px 0;">
        📅 Due Soon (${data.dueSoonTasks.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
        ${data.dueSoonTasks.map((t) => taskRow(t, false)).join("")}
      </table>
    </div>
  `
      : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0;">
        RegularUpkeep
      </h1>
      <p style="color: #6b7280; margin: 8px 0 0 0;">
        Your Maintenance Reminder
      </p>
    </div>

    <!-- Greeting -->
    <div style="background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #374151;">
        Hi ${data.userName},
      </p>
      <p style="margin: 12px 0 0 0; color: #374151;">
        ${hasOverdue ? "You have some overdue maintenance tasks that need attention." : "Here's a summary of your upcoming maintenance tasks."}
      </p>
    </div>

    <!-- Task Sections -->
    ${overdueSection}
    ${dueSoonSection}

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/app/calendar" style="display: inline-block; padding: 12px 32px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
        View Calendar
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 13px; color: #9ca3af; margin: 0;">
        You're receiving this because you have maintenance reminders enabled.
      </p>
      <p style="font-size: 13px; color: #9ca3af; margin: 8px 0 0 0;">
        <a href="${data.appUrl}/app/profile" style="color: #6b7280;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Plain text version
  const text = `
Hi ${data.userName},

${hasOverdue ? "You have overdue maintenance tasks that need attention." : "Here's a summary of your upcoming maintenance tasks."}

${data.overdueTasks.length > 0 ? `OVERDUE TASKS (${data.overdueTasks.length}):\n${data.overdueTasks.map((t) => `- ${t.title} (${formatCategory(t.category)}) - Due: ${formatDate(t.next_due_date)}`).join("\n")}\n` : ""}
${data.dueSoonTasks.length > 0 ? `DUE SOON (${data.dueSoonTasks.length}):\n${data.dueSoonTasks.map((t) => `- ${t.title} (${formatCategory(t.category)}) - Due: ${formatDate(t.next_due_date)}`).join("\n")}\n` : ""}

View your calendar: ${data.appUrl}/app/calendar

---
Manage notification preferences: ${data.appUrl}/app/profile
  `.trim();

  return { subject, html, text };
}

/**
 * Single task reminder email (for urgent/overdue items)
 */
export function urgentTaskEmail(data: {
  userName: string;
  task: TaskForEmail;
  appUrl: string;
}): { subject: string; html: string; text: string } {
  const propertyName = data.task.property_nickname || data.task.property_address || "Your Property";

  const subject = `🚨 Urgent: ${data.task.title} is overdue`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0;">
        RegularUpkeep
      </h1>
    </div>

    <!-- Alert Card -->
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; color: #dc2626; margin: 0 0 12px 0;">
        🚨 Overdue Task Needs Attention
      </h2>
      <div style="background: #fff; border-radius: 6px; padding: 16px; border: 1px solid #e5e7eb;">
        <div style="font-size: 18px; font-weight: 600; color: #111827;">${data.task.title}</div>
        <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
          ${propertyName} &bull; ${formatCategory(data.task.category)}
        </div>
        <div style="font-size: 14px; color: #dc2626; margin-top: 8px; font-weight: 500;">
          Was due: ${formatDate(data.task.next_due_date)}
        </div>
      </div>
    </div>

    <!-- CTA Buttons -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.appUrl}/app/calendar/${data.task.id}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; margin-right: 12px;">
        Mark Complete
      </a>
      <a href="${data.appUrl}/app/requests/new?task=${data.task.id}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500;">
        Request Provider
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 13px; color: #9ca3af; margin: 0;">
        <a href="${data.appUrl}/app/profile" style="color: #6b7280;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
Hi ${data.userName},

Your maintenance task "${data.task.title}" is overdue and needs attention.

Property: ${propertyName}
Category: ${formatCategory(data.task.category)}
Was due: ${formatDate(data.task.next_due_date)}

Mark complete: ${data.appUrl}/app/calendar/${data.task.id}
Request a provider: ${data.appUrl}/app/requests/new?task=${data.task.id}

---
Manage notification preferences: ${data.appUrl}/app/profile
  `.trim();

  return { subject, html, text };
}
