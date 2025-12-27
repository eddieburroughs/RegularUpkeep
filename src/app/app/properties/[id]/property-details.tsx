"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Pencil, Trash2, Home, MapPin, Calendar, Wrench, Clock, Settings2 } from "lucide-react";
import Link from "next/link";
import type { Property, PropertyType, MaintenanceTask } from "@/types/database";
import { PropertySystems } from "@/components/app/property-systems";

const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "single_family", label: "Single Family Home" },
  { value: "condo", label: "Condominium" },
  { value: "townhouse", label: "Townhouse" },
  { value: "apartment", label: "Apartment" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "commercial", label: "Commercial" },
];

const propertyTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  condo: "Condo",
  townhouse: "Townhouse",
  apartment: "Apartment",
  multi_family: "Multi-Family",
  commercial: "Commercial",
};

const usStates = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

type TaskWithStatus = Pick<MaintenanceTask, "id" | "name" | "due_date" | "status" | "category">;

interface PropertyDetailsProps {
  property: Property;
  tasks: TaskWithStatus[];
  bookings: {
    id: string;
    status: string;
    scheduled_date: string;
    services: { name: string } | null;
    providers: { business_name: string } | null;
  }[];
}

export function PropertyDetails({ property, tasks, bookings }: PropertyDetailsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    nickname: property.nickname || "",
    property_type: property.property_type,
    address_line1: property.address_line1,
    address_line2: property.address_line2 || "",
    city: property.city,
    state: property.state,
    postal_code: property.postal_code,
    year_built: property.year_built?.toString() || "",
    square_footage: property.square_footage?.toString() || "",
    bedrooms: property.bedrooms?.toString() || "",
    bathrooms: property.bathrooms?.toString() || "",
    notes: property.notes || "",
    access_notes: property.access_notes || "",
    utility_shutoff_notes: property.utility_shutoff_notes || "",
  });

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const updateData = {
      nickname: formData.nickname || null,
      property_type: formData.property_type as PropertyType,
      address_line1: formData.address_line1,
      address_line2: formData.address_line2 || null,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      year_built: formData.year_built ? parseInt(formData.year_built) : null,
      square_footage: formData.square_footage ? parseInt(formData.square_footage) : null,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
      notes: formData.notes || null,
      access_notes: formData.access_notes || null,
      utility_shutoff_notes: formData.utility_shutoff_notes || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("properties")
      .update(updateData)
      .eq("id", property.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from("properties")
      .delete()
      .eq("id", property.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleteLoading(false);
      return;
    }

    router.push("/app/properties");
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    scheduled: "outline",
    upcoming: "secondary",
    due: "default",
    overdue: "destructive",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/properties">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {property.nickname || property.address_line1}
            </h1>
            <p className="text-muted-foreground">
              {propertyTypeLabels[property.property_type]}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Property</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this property? This action cannot be undone.
                      All associated tasks, documents, and history will be permanently removed.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteLoading}
                    >
                      {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete Property
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Property Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>
                {isEditing ? "Update your property information" : "View property information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nickname">Property Nickname</Label>
                      <Input
                        id="nickname"
                        value={formData.nickname}
                        onChange={(e) => updateField("nickname", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="property_type">Property Type</Label>
                      <Select
                        value={formData.property_type}
                        onValueChange={(value) => updateField("property_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {propertyTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line1">Street Address</Label>
                    <Input
                      id="address_line1"
                      value={formData.address_line1}
                      onChange={(e) => updateField("address_line1", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address_line2">Apt/Suite/Unit</Label>
                    <Input
                      id="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => updateField("address_line2", e.target.value)}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => updateField("state", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {usStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal_code">ZIP Code</Label>
                      <Input
                        id="postal_code"
                        value={formData.postal_code}
                        onChange={(e) => updateField("postal_code", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="year_built">Year Built</Label>
                      <Input
                        id="year_built"
                        type="number"
                        value={formData.year_built}
                        onChange={(e) => updateField("year_built", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="square_footage">Square Feet</Label>
                      <Input
                        id="square_footage"
                        type="number"
                        value={formData.square_footage}
                        onChange={(e) => updateField("square_footage", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bedrooms">Bedrooms</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        value={formData.bedrooms}
                        onChange={(e) => updateField("bedrooms", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bathrooms">Bathrooms</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        step="0.5"
                        value={formData.bathrooms}
                        onChange={(e) => updateField("bathrooms", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="access_notes">Access Notes</Label>
                    <Textarea
                      id="access_notes"
                      placeholder="Gate codes, key locations, etc."
                      value={formData.access_notes}
                      onChange={(e) => updateField("access_notes", e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="utility_shutoff_notes">Utility Shutoff Notes</Label>
                    <Textarea
                      id="utility_shutoff_notes"
                      placeholder="Water main location, electrical panel, gas shutoff, etc."
                      value={formData.utility_shutoff_notes}
                      onChange={(e) => updateField("utility_shutoff_notes", e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSave} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{property.address_line1}</p>
                      {property.address_line2 && <p>{property.address_line2}</p>}
                      <p className="text-muted-foreground">
                        {property.city}, {property.state} {property.postal_code}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-4 text-sm">
                    {property.year_built && (
                      <div>
                        <p className="text-muted-foreground">Year Built</p>
                        <p className="font-medium">{property.year_built}</p>
                      </div>
                    )}
                    {property.square_footage && (
                      <div>
                        <p className="text-muted-foreground">Square Feet</p>
                        <p className="font-medium">{property.square_footage.toLocaleString()}</p>
                      </div>
                    )}
                    {property.bedrooms && (
                      <div>
                        <p className="text-muted-foreground">Bedrooms</p>
                        <p className="font-medium">{property.bedrooms}</p>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div>
                        <p className="text-muted-foreground">Bathrooms</p>
                        <p className="font-medium">{property.bathrooms}</p>
                      </div>
                    )}
                  </div>

                  {property.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{property.notes}</p>
                    </div>
                  )}

                  {property.access_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Access Notes</p>
                      <p className="text-sm">{property.access_notes}</p>
                    </div>
                  )}

                  {property.utility_shutoff_notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Utility Shutoff Notes</p>
                      <p className="text-sm">{property.utility_shutoff_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Systems Card */}
          <PropertySystems propertyId={property.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Upcoming Tasks</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/calendar">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                        <span>{task.name}</span>
                      </div>
                      <Badge variant={statusColors[task.status] || "outline"}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming tasks
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recent Bookings</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/requests">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/app/bookings/${booking.id}`}
                      className="flex items-center justify-between text-sm hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                    >
                      <div>
                        <p className="font-medium">{booking.services?.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {booking.providers?.business_name}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {booking.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent bookings
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/app/requests/new">
                  <Clock className="mr-2 h-4 w-4" />
                  Request Service
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/app/binder">
                  <Home className="mr-2 h-4 w-4" />
                  View Binder
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/app/calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  Maintenance Calendar
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const systemsCard = document.querySelector('[data-systems-card]');
                  systemsCard?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Manage Systems
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
