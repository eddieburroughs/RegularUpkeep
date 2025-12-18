import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { MessageThread } from "./message-thread";

type ThreadDetails = {
  id: string;
  subject: string | null;
  thread_type: string;
  properties: { nickname: string | null; address_line1: string } | null;
  bookings: { booking_number: string; services: { name: string } | null } | null;
};

type MessageDetails = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get thread details
  const { data: thread, error } = await supabase
    .from("message_threads")
    .select(`
      id,
      subject,
      thread_type,
      properties(nickname, address_line1),
      bookings(booking_number, services(name))
    `)
    .eq("id", id)
    .single() as { data: ThreadDetails | null; error: unknown };

  if (error || !thread) {
    notFound();
  }

  // Get messages in the thread
  const { data: messages } = await supabase
    .from("messages")
    .select(`
      id,
      thread_id,
      sender_id,
      content,
      is_read,
      created_at,
      profiles:sender_id(full_name, avatar_url)
    `)
    .eq("thread_id", id)
    .order("created_at", { ascending: true }) as { data: MessageDetails[] | null };

  // Mark messages as read
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("thread_id", id)
      .neq("sender_id", user.id)
      .eq("is_read", false);
  }

  // Determine thread title
  let title = thread.subject || "Conversation";
  if (thread.bookings) {
    title = thread.bookings.services?.name || `Booking #${thread.bookings.booking_number}`;
  } else if (thread.properties) {
    title = thread.properties.nickname || thread.properties.address_line1;
  }

  return (
    <MessageThread
      thread={thread}
      messages={messages || []}
      currentUserId={user?.id || ""}
      title={title}
    />
  );
}
