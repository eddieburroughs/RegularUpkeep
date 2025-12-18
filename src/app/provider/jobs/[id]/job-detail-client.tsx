"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  FileText,
  Camera,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
  Navigation,
  CheckCircle2,
  Play,
  MessageSquare,
} from "lucide-react";
import type { BookingStatus, TravelStatus, Json } from "@/types/database";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
}

interface JobDetailClientProps {
  booking: {
    id: string;
    booking_number: string;
    status: string;
    travel_status: string;
    scheduled_date: string;
    scheduled_time: string;
    service_address: string;
    total_amount: number;
    invoice_cents: number;
    invoice_items: unknown;
    job_photos: unknown;
    customer_notes: string | null;
    provider_notes: string | null;
    completion_notes: string | null;
    actual_start_time: string | null;
    actual_end_time: string | null;
    services: { name: string; description: string | null } | null;
    properties: {
      nickname: string | null;
      address_line1: string;
      city: string;
      state: string;
      access_notes: string | null;
    } | null;
    customers: {
      profiles: { full_name: string | null; phone: string | null } | null;
    } | null;
  };
  providerId: string;
}

export function JobDetailClient({ booking, providerId }: JobDetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(booking.completion_notes || "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);

  // Parse existing invoice items
  const existingItems = (booking.invoice_items as LineItem[]) || [];
  const [lineItems, setLineItems] = useState<LineItem[]>(
    existingItems.length > 0
      ? existingItems
      : [{ id: "1", description: "", quantity: 1, unit_price_cents: 0 }]
  );

  const invoiceTotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0
  );

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${minutes} ${ampm}`;
  };

  const updateStatus = async (
    newStatus?: BookingStatus,
    newTravelStatus?: TravelStatus
  ) => {
    setLoading(true);
    const supabase = createClient();

    const updateData: Record<string, unknown> = {};

    if (newStatus) {
      updateData.status = newStatus;
      if (newStatus === "in_progress") {
        updateData.actual_start_time = new Date().toISOString();
      }
      if (newStatus === "completed") {
        updateData.actual_end_time = new Date().toISOString();
        updateData.completion_notes = notes;
        updateData.invoice_items = lineItems;
        updateData.invoice_cents = invoiceTotal;
      }
    }

    if (newTravelStatus) {
      updateData.travel_status = newTravelStatus;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("bookings") as any)
      .update(updateData)
      .eq("id", booking.id);

    // Upload photos if completing
    if (newStatus === "completed" && photos.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        for (const photo of photos) {
          const fileExt = photo.name.split(".").pop();
          const fileName = `jobs/${booking.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fileName, photo);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("documents")
              .getPublicUrl(fileName);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("documents") as any).insert({
              booking_id: booking.id,
              category: "photo",
              title: `Job Photo - ${booking.booking_number}`,
              file_url: urlData.publicUrl,
              file_name: photo.name,
              file_type: photo.type,
              file_size: photo.size,
              uploaded_by: user.id,
            });
          }
        }
      }
    }

    setLoading(false);
    router.refresh();
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: "",
        quantity: 1,
        unit_price_cents: 0,
      },
    ]);
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  };

  const isToday = booking.scheduled_date === new Date().toISOString().split("T")[0];
  const canStart = booking.status === "confirmed" && isToday;
  const canComplete = booking.status === "in_progress";
  const isCompleted = booking.status === "completed";

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/provider/jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{booking.services?.name}</h1>
            <Badge variant={isCompleted ? "default" : "secondary"}>
              {booking.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            #{booking.booking_number}
          </p>
        </div>
      </div>

      {/* Status Actions */}
      {!isCompleted && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 space-y-3">
            {booking.status === "confirmed" && (
              <>
                {booking.travel_status !== "on_my_way" && (
                  <Button
                    onClick={() => updateStatus(undefined, "on_my_way")}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Navigation className="mr-2 h-4 w-4" />
                    )}
                    On My Way
                  </Button>
                )}
                {booking.travel_status === "on_my_way" && (
                  <Button
                    onClick={() => updateStatus(undefined, "arrived")}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    I&apos;ve Arrived
                  </Button>
                )}
                {booking.travel_status === "arrived" && canStart && (
                  <Button
                    onClick={() => updateStatus("in_progress")}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Start Job
                  </Button>
                )}
              </>
            )}
            {canComplete && (
              <Button
                onClick={() => setShowInvoice(true)}
                className="w-full"
                variant={showInvoice ? "secondary" : "default"}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Job
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule & Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">{formatTime(booking.scheduled_time)}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-2 border-t">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{booking.service_address}</p>
              {booking.properties && (
                <p className="text-sm text-muted-foreground">
                  {booking.properties.city}, {booking.properties.state}
                </p>
              )}
            </div>
          </div>

          {booking.properties?.access_notes && (
            <div className="flex items-start gap-3 pt-2 border-t">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Access Notes</p>
                <p className="text-sm">{booking.properties.access_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">
              {booking.customers?.profiles?.full_name || "Customer"}
            </span>
          </div>
          {booking.customers?.profiles?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <a
                href={`tel:${booking.customers.profiles.phone}`}
                className="text-primary hover:underline"
              >
                {booking.customers.profiles.phone}
              </a>
            </div>
          )}
          {booking.customer_notes && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-1">Customer Notes</p>
              <p className="text-sm">{booking.customer_notes}</p>
            </div>
          )}
          <Button variant="outline" className="w-full mt-2" asChild>
            <Link href="/provider/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message Customer
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Invoice Editor (shown when completing) */}
      {(showInvoice || isCompleted) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Invoice
              </CardTitle>
              {!isCompleted && (
                <Button variant="ghost" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </div>
            <CardDescription>
              {isCompleted ? "Final invoice" : "Add line items for this job"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(item.id, "description", e.target.value)
                    }
                    disabled={isCompleted}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, "quantity", parseInt(e.target.value) || 0)
                      }
                      className="w-20"
                      disabled={isCompleted}
                    />
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={(item.unit_price_cents / 100).toFixed(2)}
                        onChange={(e) =>
                          updateLineItem(
                            item.id,
                            "unit_price_cents",
                            Math.round(parseFloat(e.target.value || "0") * 100)
                          )
                        }
                        className="pl-8"
                        disabled={isCompleted}
                      />
                    </div>
                  </div>
                </div>
                {!isCompleted && lineItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex justify-between pt-4 border-t font-semibold">
              <span>Total</span>
              <span>${(invoiceTotal / 100).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes & Photos (shown when completing or completed) */}
      {(showInvoice || isCompleted) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Notes & Photos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Completion Notes</Label>
              <Textarea
                placeholder="Describe the work completed..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={isCompleted}
              />
            </div>

            {!isCompleted && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Before/After Photos
                </Label>
                <FileUpload
                  value={photos}
                  onChange={setPhotos}
                  accept="image/*"
                  multiple
                  maxFiles={6}
                  label="Add job photos"
                  description="Before and after photos help document your work"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complete Button */}
      {showInvoice && !isCompleted && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t">
          <Button
            onClick={() => updateStatus("completed")}
            className="w-full"
            size="lg"
            disabled={loading || lineItems.every((i) => !i.description)}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Complete Job (${(invoiceTotal / 100).toFixed(2)})
          </Button>
        </div>
      )}
    </div>
  );
}
