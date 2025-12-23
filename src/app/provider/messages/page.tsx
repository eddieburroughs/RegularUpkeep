import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  MessageSquare,
  ClipboardList,
  Home,
} from "lucide-react";

type ThreadWithDetails = {
  id: string;
  subject: string | null;
  thread_type: string;
  last_message_at: string;
  is_archived: boolean;
  properties: { nickname: string | null; address_line1: string } | null;
  bookings: { booking_number: string; services: { name: string } | null } | null;
  messages: { content: string; sender_id: string; is_read: boolean }[];
};

export default async function ProviderMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/messages");
  }

  // Get provider profile
  const { data: provider } = await supabase
    .from("providers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as { data: { id: string } | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  // Get message threads where provider is involved (through bookings assigned to them)
  // First get bookings assigned to this provider
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id")
    .eq("provider_id", provider.id) as { data: { id: string }[] | null };

  const bookingIds = bookings?.map(b => b.id) || [];

  // Get threads for these bookings
  let threads: ThreadWithDetails[] = [];
  if (bookingIds.length > 0) {
    const { data: threadData } = await supabase
      .from("message_threads")
      .select(`
        id,
        subject,
        thread_type,
        last_message_at,
        is_archived,
        properties(nickname, address_line1),
        bookings(booking_number, services(name)),
        messages(content, sender_id, is_read)
      `)
      .in("booking_id", bookingIds)
      .eq("is_active", true)
      .order("last_message_at", { ascending: false })
      .limit(50) as { data: ThreadWithDetails[] | null };

    threads = threadData || [];
  }

  // Count unread messages
  const unreadCount = threads.reduce((count, thread) => {
    const unreadMessages = thread.messages.filter(
      (m) => !m.is_read && m.sender_id !== user.id
    ).length;
    return count + unreadMessages;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with homeowners
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="default">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Your message threads with customers</CardDescription>
        </CardHeader>
        <CardContent>
          {threads.length > 0 ? (
            <div className="space-y-2">
              {threads.map((thread) => {
                const lastMessage = thread.messages[thread.messages.length - 1];
                const unreadMessages = thread.messages.filter(
                  (m) => !m.is_read && m.sender_id !== user.id
                ).length;
                const hasUnread = unreadMessages > 0;

                // Determine thread title
                let title = thread.subject;
                let subtitle = "";
                let Icon = MessageSquare;

                if (thread.bookings) {
                  title = thread.bookings.services?.name || `Booking #${thread.bookings.booking_number}`;
                  subtitle = `Booking #${thread.bookings.booking_number}`;
                  Icon = ClipboardList;
                } else if (thread.properties) {
                  title = thread.properties.nickname || thread.properties.address_line1;
                  subtitle = "Property inquiry";
                  Icon = Home;
                }

                return (
                  <Link
                    key={thread.id}
                    href={`/provider/messages/${thread.id}`}
                    className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                      hasUnread
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      hasUnread ? "bg-primary/10" : "bg-background"
                    }`}>
                      <Icon className={`h-5 w-5 ${hasUnread ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`font-medium truncate ${hasUnread ? "text-primary" : ""}`}>
                          {title || "Conversation"}
                        </p>
                        <div className="flex items-center gap-2">
                          {hasUnread && (
                            <Badge variant="default" className="text-xs">
                              {unreadMessages}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(thread.last_message_at)}
                          </span>
                        </div>
                      </div>
                      {subtitle && (
                        <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>
                      )}
                      {lastMessage && (
                        <p className={`text-sm truncate ${hasUnread ? "font-medium" : "text-muted-foreground"}`}>
                          {lastMessage.content}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">No messages yet</p>
              <p className="text-sm">
                Messages from homeowners will appear here when you have active jobs
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
