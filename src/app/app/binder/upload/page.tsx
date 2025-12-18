"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { ArrowLeft, Loader2, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import type { Property, DocumentCategory } from "@/types/database";

const documentCategories: { value: DocumentCategory; label: string }[] = [
  { value: "receipt", label: "Receipt" },
  { value: "warranty", label: "Warranty" },
  { value: "manual", label: "Manual" },
  { value: "inspection", label: "Inspection Report" },
  { value: "permit", label: "Permit" },
  { value: "insurance", label: "Insurance" },
  { value: "contract", label: "Contract" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
];

export default function BinderUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState({
    property_id: "",
    category: "" as DocumentCategory | "",
    title: "",
    description: "",
    document_date: "",
    expiry_date: "",
    amount: "",
  });

  useEffect(() => {
    async function loadProperties() {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("properties")
        .select("*")
        .order("nickname", { ascending: true });

      setProperties(data || []);
      if (data?.length === 1) {
        setFormData((prev) => ({ ...prev, property_id: data[0].id }));
      }
      setPropertiesLoading(false);
    }
    loadProperties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Please select a file to upload");
      return;
    }
    if (!formData.category) {
      setError("Please select a category");
      return;
    }
    if (!formData.title) {
      setError("Please enter a title");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to upload documents");
      setLoading(false);
      return;
    }

    try {
      const file = files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // Create document record
      const documentData = {
        property_id: formData.property_id || null,
        category: formData.category as DocumentCategory,
        title: formData.title,
        description: formData.description || null,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        document_date: formData.document_date || null,
        expiry_date: formData.expiry_date || null,
        amount_cents: formData.amount ? Math.round(parseFloat(formData.amount) * 100) : null,
        uploaded_by: user.id,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from("documents")
        .insert(documentData);

      if (insertError) {
        throw new Error(`Failed to save document: ${insertError.message}`);
      }

      router.push("/app/binder");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/binder">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upload Document</h1>
          <p className="text-muted-foreground">
            Add a document to your home binder
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
            <CardDescription>
              Upload receipts, warranties, manuals, and other important documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-2">
              <Label>File *</Label>
              <FileUpload
                value={files}
                onChange={setFiles}
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                maxSize={10 * 1024 * 1024}
                label="Upload a document"
                description="PDF, images, or office documents"
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., HVAC Warranty, Roof Inspection 2024"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => updateField("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {documentCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Property Selection */}
            <div className="space-y-2">
              <Label htmlFor="property_id">Property</Label>
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
                    <SelectValue placeholder="Select a property (optional)" />
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
                <p className="text-sm text-muted-foreground">
                  No properties found. Document will be saved without a property association.
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add any notes or details about this document..."
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Dates */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document_date">Document Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="document_date"
                    type="date"
                    className="pl-10"
                    value={formData.document_date}
                    onChange={(e) => updateField("document_date", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="expiry_date"
                    type="date"
                    className="pl-10"
                    value={formData.expiry_date}
                    onChange={(e) => updateField("expiry_date", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Amount (for receipts) */}
            {(formData.category === "receipt" || formData.category === "contract") && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-10"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => updateField("amount", e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || files.length === 0}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload Document
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/binder">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
