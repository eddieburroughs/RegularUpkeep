"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUpload } from "@/components/ui/file-upload";
import { ArrowLeft, Loader2, Calendar, Clock, Camera } from "lucide-react";
import Link from "next/link";
import type { Property } from "@/types/database";

type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  duration_minutes: number | null;
  provider_id: string;
  providers: { business_name: string } | null;
};

const serviceCategories = [
  { value: "hvac", label: "HVAC / Heating & Cooling" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliance Repair" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "cleaning", label: "Cleaning" },
  { value: "handyman", label: "General Handyman" },
  { value: "other", label: "Other" },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  const [photos, setPhotos] = useState<File[]>([]);

  // Get tomorrow's date for initial value (computed once)
  const defaultScheduledDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const [formData, setFormData] = useState({
    property_id: "",
    category: "",
    service_id: "",
    description: "",
    scheduled_date: defaultScheduledDate,
    scheduled_time: "09:00",
    priority: "normal",
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Load properties
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: propertiesData } = await (supabase as any)
        .from("properties")
        .select("*")
        .order("nickname", { ascending: true });

      setProperties(propertiesData || []);
      if (propertiesData?.length === 1) {
        setFormData((prev) => ({ ...prev, property_id: propertiesData[0].id }));
      }
      setPropertiesLoading(false);

      // Load services (available in the area)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: servicesData } = await (supabase as any)
        .from("services")
        .select("id, name, description, base_price, duration_minutes, provider_id, providers(business_name)")
        .eq("is_active", true)
        .order("name", { ascending: true });

      setServices(servicesData || []);
    }
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to submit a request");
      setLoading(false);
      return;
    }

    // Get user's customer record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customer } = await (supabase as any)
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!customer) {
      // Create customer record if it doesn't exist
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newCustomer, error: customerError } = await (supabase as any)
        .from("customers")
        .insert({ profile_id: user.id })
        .select()
        .single();

      if (customerError) {
        setError("Failed to create customer profile");
        setLoading(false);
        return;
      }
    }

    const customerId = customer?.id;
    const selectedService = services.find((s) => s.id === formData.service_id);
    const selectedProperty = properties.find((p) => p.id === formData.property_id);

    if (!selectedService || !selectedProperty) {
      setError("Please select a service and property");
      setLoading(false);
      return;
    }

    const bookingData = {
      customer_id: customerId || user.id,
      provider_id: selectedService.provider_id,
      service_id: formData.service_id,
      property_id: formData.property_id,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time,
      service_address: `${selectedProperty.address_line1}, ${selectedProperty.city}, ${selectedProperty.state} ${selectedProperty.postal_code}`,
      base_price: selectedService.base_price,
      total_amount: selectedService.base_price,
      customer_notes: formData.description || null,
      priority: formData.priority,
      status: "pending",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: booking, error: createError } = await (supabase as any)
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    // Upload photos if any
    if (photos.length > 0) {
      for (const photo of photos) {
        try {
          const fileExt = photo.name.split(".").pop();
          const fileName = `${user.id}/${booking.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("documents")
            .upload(fileName, photo);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("documents")
              .getPublicUrl(fileName);

            // Save as document associated with booking
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from("documents").insert({
              booking_id: booking.id,
              property_id: formData.property_id,
              category: "photo",
              title: `Request Photo - ${photo.name}`,
              file_url: urlData.publicUrl,
              file_name: photo.name,
              file_type: photo.type,
              file_size: photo.size,
              uploaded_by: user.id,
            });
          }
        } catch {
          // Continue even if photo upload fails
          console.error("Failed to upload photo");
        }
      }
    }

    router.push(`/app/requests/${booking.id}`);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const filteredServices = formData.category
    ? services.filter((s) => s.name.toLowerCase().includes(formData.category.toLowerCase()))
    : services;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Service Request</h1>
          <p className="text-muted-foreground">
            Request a service from our network of providers
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Request Details</CardTitle>
            <CardDescription>
              Tell us what you need help with
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {/* Property Selection */}
            <div className="space-y-2">
              <Label htmlFor="property_id">Property *</Label>
              {propertiesLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading properties...
                </div>
              ) : properties.length > 0 ? (
                <Select
                  value={formData.property_id}
                  onValueChange={(value) => updateField("property_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.nickname || property.address_line1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No properties found.{" "}
                  <Link href="/app/properties/new" className="text-primary hover:underline">
                    Add a property first
                  </Link>
                </div>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="category">Service Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {serviceCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Service Selection */}
            {services.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="service_id">Service *</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) => updateField("service_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{service.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ${(service.base_price / 100).toFixed(2)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.service_id && (
                  <p className="text-sm text-muted-foreground">
                    Provider: {services.find((s) => s.id === formData.service_id)?.providers?.business_name}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what you need help with..."
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photos (optional)
              </Label>
              <FileUpload
                value={photos}
                onChange={setPhotos}
                accept="image/*"
                multiple
                maxFiles={5}
                maxSize={10 * 1024 * 1024}
                label="Add photos of the issue"
                description="Photos help providers understand the problem"
              />
            </div>

            {/* Date & Time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Preferred Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduled_date"
                    type="date"
                    className="pl-10"
                    value={formData.scheduled_date}
                    onChange={(e) => updateField("scheduled_date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_time">Preferred Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduled_time"
                    type="time"
                    className="pl-10"
                    value={formData.scheduled_time}
                    onChange={(e) => updateField("scheduled_time", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <Label>Priority</Label>
              <RadioGroup
                value={formData.priority}
                onValueChange={(value) => updateField("priority", value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="cursor-pointer">Low</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="normal" id="normal" />
                  <Label htmlFor="normal" className="cursor-pointer">Normal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="cursor-pointer">High</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="urgent" id="urgent" />
                  <Label htmlFor="urgent" className="cursor-pointer text-red-600">Urgent</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || properties.length === 0 || !formData.service_id}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/requests">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
