"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Loader2, Settings, SkipForward } from "lucide-react";

const heatingTypes = [
  { value: "forced_air", label: "Forced Air (Furnace)" },
  { value: "heat_pump", label: "Heat Pump" },
  { value: "boiler", label: "Boiler / Radiator" },
  { value: "electric", label: "Electric Baseboard" },
  { value: "none", label: "No Heating" },
];

const coolingTypes = [
  { value: "central_ac", label: "Central Air Conditioning" },
  { value: "heat_pump", label: "Heat Pump" },
  { value: "window_units", label: "Window Units" },
  { value: "mini_split", label: "Mini-Split / Ductless" },
  { value: "none", label: "No Cooling" },
];

const waterHeaterTypes = [
  { value: "tank_gas", label: "Gas Tank" },
  { value: "tank_electric", label: "Electric Tank" },
  { value: "tankless_gas", label: "Tankless Gas" },
  { value: "tankless_electric", label: "Tankless Electric" },
  { value: "heat_pump", label: "Heat Pump Water Heater" },
];

const roofTypes = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal" },
  { value: "tile", label: "Tile" },
  { value: "flat", label: "Flat / Built-up" },
  { value: "wood", label: "Wood Shake" },
];

export default function SystemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    heating: "",
    cooling: "",
    water_heater: "",
    roof_type: "",
  });

  useEffect(() => {
    const storedId = sessionStorage.getItem("onboarding_property_id");
    if (!storedId) {
      router.push("/onboarding/home-details");
      return;
    }
    // Initialize property ID from session storage (intentional initialization pattern)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPropertyId(storedId);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;

    setLoading(true);

    const supabase = createClient();

    // Store systems info in the notes field as structured text
    const systemsInfo = [
      formData.heating && `Heating: ${heatingTypes.find(h => h.value === formData.heating)?.label}`,
      formData.cooling && `Cooling: ${coolingTypes.find(c => c.value === formData.cooling)?.label}`,
      formData.water_heater && `Water Heater: ${waterHeaterTypes.find(w => w.value === formData.water_heater)?.label}`,
      formData.roof_type && `Roof: ${roofTypes.find(r => r.value === formData.roof_type)?.label}`,
    ].filter(Boolean).join("\n");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("properties")
      .update({
        notes: systemsInfo || null,
        utility_shutoff_notes: JSON.stringify({
          heating: formData.heating,
          cooling: formData.cooling,
          water_heater: formData.water_heater,
          roof_type: formData.roof_type,
        })
      })
      .eq("id", propertyId);

    router.push("/onboarding/plan-preview");
  };

  const handleSkip = () => {
    router.push("/onboarding/plan-preview");
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/onboarding/home-details">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">Step 2 of 3</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Home Systems</h1>
            <p className="text-muted-foreground">
              Help us understand your home&apos;s major systems (optional)
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Systems & Appliances</CardTitle>
            <CardDescription>
              This helps us recommend the right maintenance schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Heating */}
            <div className="space-y-2">
              <Label htmlFor="heating">Heating System</Label>
              <Select
                value={formData.heating}
                onValueChange={(value) => updateField("heating", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select heating type" />
                </SelectTrigger>
                <SelectContent>
                  {heatingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cooling */}
            <div className="space-y-2">
              <Label htmlFor="cooling">Cooling System</Label>
              <Select
                value={formData.cooling}
                onValueChange={(value) => updateField("cooling", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cooling type" />
                </SelectTrigger>
                <SelectContent>
                  {coolingTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Water Heater */}
            <div className="space-y-2">
              <Label htmlFor="water_heater">Water Heater</Label>
              <Select
                value={formData.water_heater}
                onValueChange={(value) => updateField("water_heater", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select water heater type" />
                </SelectTrigger>
                <SelectContent>
                  {waterHeaterTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Roof */}
            <div className="space-y-2">
              <Label htmlFor="roof_type">Roof Type</Label>
              <Select
                value={formData.roof_type}
                onValueChange={(value) => updateField("roof_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select roof type" />
                </SelectTrigger>
                <SelectContent>
                  {roofTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleSkip}>
                <SkipForward className="mr-2 h-4 w-4" />
                Skip for now
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2">
        <div className="h-2 w-8 rounded-full bg-muted" />
        <div className="h-2 w-8 rounded-full bg-muted" />
        <div className="h-2 w-8 rounded-full bg-primary" />
        <div className="h-2 w-8 rounded-full bg-muted" />
      </div>
    </div>
  );
}
