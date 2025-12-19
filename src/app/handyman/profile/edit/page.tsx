"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Loader2,
  User,
  Phone,
  DollarSign,
  Save,
} from "lucide-react";

const skillOptions = [
  { value: "general_repairs", label: "General Repairs" },
  { value: "plumbing_basic", label: "Basic Plumbing" },
  { value: "electrical_basic", label: "Basic Electrical" },
  { value: "painting", label: "Painting" },
  { value: "drywall", label: "Drywall Repair" },
  { value: "carpentry", label: "Carpentry" },
  { value: "appliance_repair", label: "Appliance Repair" },
  { value: "hvac_basic", label: "Basic HVAC" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pressure_washing", label: "Pressure Washing" },
  { value: "gutter_cleaning", label: "Gutter Cleaning" },
  { value: "furniture_assembly", label: "Furniture Assembly" },
];

export default function EditHandymanProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [handymanId, setHandymanId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    hourly_rate: "",
    skills: [] as string[],
  });

  useEffect(() => {
    const loadHandyman = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirectTo=/handyman/profile/edit");
        return;
      }

      setUserId(user.id);

      type HandymanData = {
        id: string;
        bio: string | null;
        skills: string[] | null;
        hourly_rate: number | null;
        profiles: {
          full_name: string | null;
          phone: string | null;
        } | null;
      };

      const { data: handyman } = await supabase
        .from("handymen")
        .select("id, bio, skills, hourly_rate, profiles(full_name, phone)")
        .eq("profile_id", user.id)
        .single() as { data: HandymanData | null };

      if (!handyman) {
        router.push("/handyman/onboarding/signup");
        return;
      }

      setHandymanId(handyman.id);
      setFormData({
        full_name: handyman.profiles?.full_name || "",
        phone: handyman.profiles?.phone || "",
        bio: handyman.bio || "",
        hourly_rate: handyman.hourly_rate ? String(handyman.hourly_rate) : "",
        skills: handyman.skills || [],
      });
      setLoading(false);
    };

    loadHandyman();
  }, [router]);

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handymanId || !userId) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();

    // Update handyman record
    const { error: handymanError } = await (supabase.from("handymen") as any)
      .update({
        bio: formData.bio || null,
        skills: formData.skills,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      })
      .eq("id", handymanId);

    if (handymanError) {
      setError(handymanError.message);
      setSaving(false);
      return;
    }

    // Update profile
    const { error: profileError } = await (supabase.from("profiles") as any)
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
      })
      .eq("id", userId);

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    setTimeout(() => {
      router.push("/handyman/profile");
    }, 1500);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/handyman/profile">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
            Profile updated successfully! Redirecting...
          </div>
        )}

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
            <CardDescription>
              Your contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  placeholder="John Smith"
                  value={formData.full_name}
                  onChange={(e) => updateField("full_name", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
            <CardDescription>
              Select all the services you can provide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {skillOptions.map((skill) => (
                <div
                  key={skill.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.skills.includes(skill.value)
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => handleSkillToggle(skill.value)}
                >
                  <Checkbox
                    checked={formData.skills.includes(skill.value)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => handleSkillToggle(skill.value)}
                  />
                  <span className="text-sm font-medium">{skill.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rate & Bio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rate & About</CardTitle>
            <CardDescription>
              Help customers learn about you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hourly_rate"
                  type="number"
                  placeholder="35"
                  value={formData.hourly_rate}
                  onChange={(e) => updateField("hourly_rate", e.target.value)}
                  className="pl-10"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">About You</Label>
              <Textarea
                id="bio"
                placeholder="Tell customers about your experience and what makes you great at what you do..."
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </form>
    </div>
  );
}
