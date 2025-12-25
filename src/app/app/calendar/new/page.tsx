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
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Property, MaintenanceCategory, MaintenancePriority, MaintenanceFrequencyType, MaintenanceSkillLevel } from "@/types/database";

const categories: { value: MaintenanceCategory; label: string }[] = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliances" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "safety", label: "Safety" },
  { value: "other", label: "Other" },
];

const priorities: { value: MaintenancePriority; label: string }[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const frequencyTypes: { value: MaintenanceFrequencyType; label: string }[] = [
  { value: "one_time", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "seasonal", label: "Seasonal" },
  { value: "annual", label: "Annual" },
  { value: "multi_year", label: "Multi-Year" },
];

const skillLevels: { value: MaintenanceSkillLevel; label: string }[] = [
  { value: "diy", label: "DIY" },
  { value: "pro_recommended", label: "Pro Recommended" },
  { value: "pro_required", label: "Pro Required" },
];

export default function NewTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  // Get today's date for initial value (computed once)
  const defaultDueDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    property_id: "",
    category: "other" as MaintenanceCategory,
    priority: "normal" as MaintenancePriority,
    next_due_date: defaultDueDate,
    frequency_type: "one_time" as MaintenanceFrequencyType,
    frequency_interval: 1,
    skill_level: "diy" as MaintenanceSkillLevel,
    instructions: "",
    estimated_minutes: 30,
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
    setLoading(true);
    setError(null);

    if (!formData.property_id) {
      setError("Please select a property");
      setLoading(false);
      return;
    }

    if (!formData.title.trim()) {
      setError("Please enter a task title");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const insertData = {
      title: formData.title.trim(),
      description: formData.description || null,
      property_id: formData.property_id,
      category: formData.category,
      priority: formData.priority,
      next_due_date: formData.next_due_date,
      frequency_type: formData.frequency_type,
      frequency_interval: formData.frequency_interval,
      skill_level: formData.skill_level,
      instructions: formData.instructions || null,
      estimated_minutes: formData.estimated_minutes,
      status: "active",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task, error: createError } = await (supabase as any)
      .from("property_maintenance_tasks")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      setLoading(false);
      return;
    }

    router.push(`/app/calendar/${task.id}`);
  };

  const updateField = (field: string, value: string | number) => {
    // Handle numeric fields
    if (field === "estimated_minutes" || field === "frequency_interval") {
      setFormData((prev) => ({ ...prev, [field]: parseInt(value as string) || 1 }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/calendar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Task</h1>
          <p className="text-muted-foreground">
            Create a new maintenance task
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
            <CardDescription>
              Enter the details for your maintenance task
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Change HVAC filter"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                required
              />
            </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => updateField("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => updateField("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((pri) => (
                      <SelectItem key={pri.value} value={pri.value}>
                        {pri.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="next_due_date">Due Date *</Label>
                <Input
                  id="next_due_date"
                  type="date"
                  value={formData.next_due_date}
                  onChange={(e) => updateField("next_due_date", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency_type">Frequency</Label>
                <Select
                  value={formData.frequency_type}
                  onValueChange={(value) => updateField("frequency_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyTypes.map((freq) => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="skill_level">Skill Level</Label>
                <Select
                  value={formData.skill_level}
                  onValueChange={(value) => updateField("skill_level", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {skillLevels.map((skill) => (
                      <SelectItem key={skill.value} value={skill.value}>
                        {skill.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
                <Input
                  id="estimated_minutes"
                  type="number"
                  min="1"
                  value={formData.estimated_minutes}
                  onChange={(e) => updateField("estimated_minutes", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the task..."
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (optional)</Label>
              <Textarea
                id="instructions"
                placeholder="Step-by-step instructions..."
                value={formData.instructions}
                onChange={(e) => updateField("instructions", e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading || properties.length === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Task
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/calendar">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
