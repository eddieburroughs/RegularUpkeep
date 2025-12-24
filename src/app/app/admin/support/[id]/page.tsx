/**
 * Ticket Detail Page
 *
 * View and respond to individual support tickets.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Clock,
  AlertTriangle,
  Tag,
  MessageSquare,
} from "lucide-react";
import { TicketActions } from "./ticket-actions";
import { TicketReply } from "./ticket-reply";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/app/admin/support");
  }

  // Verify admin
  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  // Fetch ticket with user profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket, error } = await (supabase as any)
    .from("support_tickets")
    .select("*, profiles:user_id(full_name, email, phone, support_code)")
    .eq("id", id)
    .single();

  if (error || !ticket) {
    notFound();
  }

  // Fetch conversation messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages } = await (supabase as any)
    .from("support_messages")
    .select("*")
    .eq("conversation_id", ticket.conversation_id)
    .order("created_at", { ascending: true });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "normal":
        return "bg-blue-500 text-white";
      case "low":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "waiting":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const customerName =
    ticket.profiles?.full_name || ticket.guest_name || "Anonymous";
  const customerEmail = ticket.profiles?.email || ticket.guest_email;
  const customerPhone = ticket.profiles?.phone;
  const supportCode = ticket.profiles?.support_code;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/admin/support">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Ticket #{id.slice(0, 8)}</h1>
            <p className="text-sm text-muted-foreground">
              Created {new Date(ticket.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
          <Badge className={getStatusColor(ticket.status)}>{ticket.status}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{ticket.summary}</p>
              <div className="flex gap-2 mt-4">
                <Badge variant="outline">
                  <Tag className="h-3 w-3 mr-1" />
                  {ticket.category}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {(messages || []).map((msg: {
                    id: string;
                    sender: string;
                    content: string;
                    created_at: string;
                    metadata?: { file_url?: string; [key: string]: unknown };
                  }) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "user"
                          ? "justify-start"
                          : msg.sender === "agent"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender === "user"
                            ? "bg-muted"
                            : msg.sender === "agent"
                            ? "bg-primary text-primary-foreground"
                            : "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {msg.sender === "user"
                              ? customerName
                              : msg.sender === "agent"
                              ? "Support Agent"
                              : "Bot"}
                          </span>
                          <span className="text-xs opacity-70">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                        {/* Show attachment if present */}
                        {msg.metadata?.file_url && (
                          <div className="mt-2">
                            <a
                              href={msg.metadata.file_url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs underline"
                            >
                              View attachment
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!messages || messages.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      No messages in this conversation
                    </p>
                  )}
                </div>
              </ScrollArea>

              <Separator className="my-4" />

              {/* Reply Form */}
              <TicketReply
                ticketId={ticket.id}
                conversationId={ticket.conversation_id}
                adminId={user.id}
                status={ticket.status}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{customerName}</p>
                  {supportCode && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {supportCode}
                    </p>
                  )}
                </div>
              </div>

              {customerEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${customerEmail}`}
                    className="text-sm hover:underline"
                  >
                    {customerEmail}
                  </a>
                </div>
              )}

              {customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${customerPhone}`}
                    className="text-sm hover:underline"
                  >
                    {customerPhone}
                  </a>
                </div>
              )}

              {ticket.user_id && (
                <Link href={`/app/admin/users/${ticket.user_id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Profile
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketActions
                ticketId={ticket.id}
                currentStatus={ticket.status}
                currentPriority={ticket.priority}
                assignedTo={ticket.assigned_to}
                adminId={user.id}
              />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-muted-foreground">
                    {new Date(ticket.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {ticket.assigned_to && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Assigned</p>
                    <p className="text-muted-foreground">
                      {new Date(ticket.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {ticket.resolved_at && (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-green-600" />
                  <div>
                    <p className="font-medium">Resolved</p>
                    <p className="text-muted-foreground">
                      {new Date(ticket.resolved_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
