"use client";

/**
 * Ticket List Component
 *
 * Displays and manages support tickets with filtering.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import {
  MoreHorizontal,
  Eye,
  UserPlus,
  CheckCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

type Ticket = {
  id: string;
  conversation_id: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  summary: string;
  status: string;
  priority: string;
  category: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
};

type TicketListProps = {
  status?: string[];
  adminId: string;
};

export function TicketList({ status, adminId }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const supabase = createClient();

  const fetchTickets = async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("support_tickets")
      .select("*, profiles:user_id(full_name, email)")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50);

    if (status && status.length > 0) {
      query = query.in("status", status);
    }

    if (priorityFilter !== "all") {
      query = query.eq("priority", priorityFilter);
    }

    if (categoryFilter !== "all") {
      query = query.eq("category", categoryFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch tickets:", error);
      setTickets([]);
    } else {
      setTickets((data || []) as Ticket[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [status, priorityFilter, categoryFilter]);

  const handleAssign = async (ticketId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update({
        assigned_to: adminId,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      console.error("Failed to assign ticket:", error);
    } else {
      fetchTickets();
    }
  };

  const handleResolve = async (ticketId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      console.error("Failed to resolve ticket:", error);
    } else {
      fetchTickets();
    }
  };

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

  const getStatusIcon = (ticketStatus: string) => {
    switch (ticketStatus) {
      case "open":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "waiting":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getCustomerName = (ticket: Ticket) => {
    if (ticket.profiles?.full_name) {
      return ticket.profiles.full_name;
    }
    if (ticket.guest_name) {
      return ticket.guest_name;
    }
    if (ticket.profiles?.email) {
      return ticket.profiles.email;
    }
    if (ticket.guest_email) {
      return ticket.guest_email;
    }
    return "Anonymous";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
            <SelectItem value="feature">Feature</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={fetchTickets}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading tickets...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/app/admin/support/${ticket.id}`}
                        className="font-medium hover:underline"
                      >
                        {ticket.summary.length > 50
                          ? ticket.summary.slice(0, 50) + "..."
                          : ticket.summary}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{getCustomerName(ticket)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ticket.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(ticket.status)}
                        <span className="text-sm">{ticket.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/app/admin/support/${ticket.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {ticket.status === "open" && (
                            <DropdownMenuItem onClick={() => handleAssign(ticket.id)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign to Me
                            </DropdownMenuItem>
                          )}
                          {["open", "in_progress", "waiting"].includes(ticket.status) && (
                            <DropdownMenuItem onClick={() => handleResolve(ticket.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
