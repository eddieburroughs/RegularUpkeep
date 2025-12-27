"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Loader2, Plus, Pencil, Trash2, Fan, Droplets, Zap, Flame,
  ThermometerSun, Home, Wrench, ShieldCheck, Car, Leaf, Sun, CircleDot
} from "lucide-react";
import type { SystemType, SystemCondition } from "@/types/database";

interface PropertySystem {
  id: string;
  property_id: string;
  system_type: SystemType;
  name: string;
  location: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  filter_size: string | null;
  filter_type: string | null;
  refrigerant_type: string | null;
  tonnage: number | null;
  btu_rating: number | null;
  tank_size_gallons: number | null;
  fuel_type: string | null;
  install_date: string | null;
  manufacture_date: string | null;
  warranty_expiry: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  condition: SystemCondition;
  is_active: boolean;
  notes: string | null;
  photo_url: string | null;
  manual_url: string | null;
  warranty_doc_url: string | null;
  created_at: string;
  updated_at: string;
}

interface PropertySystemsProps {
  propertyId: string;
}

const systemTypes: { value: SystemType; label: string; icon: React.ReactNode }[] = [
  { value: "hvac", label: "HVAC (Combined)", icon: <Fan className="h-4 w-4" /> },
  { value: "heating", label: "Heating", icon: <Flame className="h-4 w-4" /> },
  { value: "cooling", label: "Cooling/AC", icon: <ThermometerSun className="h-4 w-4" /> },
  { value: "water_heater", label: "Water Heater", icon: <Droplets className="h-4 w-4" /> },
  { value: "electrical", label: "Electrical", icon: <Zap className="h-4 w-4" /> },
  { value: "plumbing", label: "Plumbing", icon: <Droplets className="h-4 w-4" /> },
  { value: "roof", label: "Roof", icon: <Home className="h-4 w-4" /> },
  { value: "appliance", label: "Appliance", icon: <Wrench className="h-4 w-4" /> },
  { value: "pool_spa", label: "Pool/Spa", icon: <Droplets className="h-4 w-4" /> },
  { value: "security", label: "Security", icon: <ShieldCheck className="h-4 w-4" /> },
  { value: "garage", label: "Garage Door", icon: <Car className="h-4 w-4" /> },
  { value: "irrigation", label: "Irrigation", icon: <Leaf className="h-4 w-4" /> },
  { value: "solar", label: "Solar", icon: <Sun className="h-4 w-4" /> },
  { value: "septic", label: "Septic", icon: <CircleDot className="h-4 w-4" /> },
  { value: "well", label: "Well", icon: <Droplets className="h-4 w-4" /> },
  { value: "fireplace", label: "Fireplace", icon: <Flame className="h-4 w-4" /> },
  { value: "other", label: "Other", icon: <Wrench className="h-4 w-4" /> },
];

const conditionOptions: { value: SystemCondition; label: string; color: string }[] = [
  { value: "excellent", label: "Excellent", color: "bg-green-500" },
  { value: "good", label: "Good", color: "bg-blue-500" },
  { value: "fair", label: "Fair", color: "bg-yellow-500" },
  { value: "poor", label: "Poor", color: "bg-red-500" },
  { value: "unknown", label: "Unknown", color: "bg-gray-400" },
];

const fuelTypes = ["Gas", "Electric", "Propane", "Solar", "Heat Pump", "Oil", "Wood"];

const emptyFormData = {
  system_type: "hvac" as SystemType,
  name: "",
  location: "",
  brand: "",
  model: "",
  serial_number: "",
  filter_size: "",
  filter_type: "",
  refrigerant_type: "",
  tonnage: "",
  btu_rating: "",
  tank_size_gallons: "",
  fuel_type: "",
  install_date: "",
  manufacture_date: "",
  warranty_expiry: "",
  last_service_date: "",
  next_service_date: "",
  condition: "unknown" as SystemCondition,
  notes: "",
};

export function PropertySystems({ propertyId }: PropertySystemsProps) {
  const [systems, setSystems] = useState<PropertySystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<PropertySystem | null>(null);
  const [deletingSystem, setDeletingSystem] = useState<PropertySystem | null>(null);
  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    fetchSystems();
  }, [propertyId]);

  const fetchSystems = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/properties/${propertyId}/systems`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch systems");
      }

      setSystems(data.systems || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch systems");
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = () => {
    setEditingSystem(null);
    setFormData(emptyFormData);
    setDialogOpen(true);
  };

  const openEditDialog = (system: PropertySystem) => {
    setEditingSystem(system);
    setFormData({
      system_type: system.system_type,
      name: system.name,
      location: system.location || "",
      brand: system.brand || "",
      model: system.model || "",
      serial_number: system.serial_number || "",
      filter_size: system.filter_size || "",
      filter_type: system.filter_type || "",
      refrigerant_type: system.refrigerant_type || "",
      tonnage: system.tonnage?.toString() || "",
      btu_rating: system.btu_rating?.toString() || "",
      tank_size_gallons: system.tank_size_gallons?.toString() || "",
      fuel_type: system.fuel_type || "",
      install_date: system.install_date || "",
      manufacture_date: system.manufacture_date || "",
      warranty_expiry: system.warranty_expiry || "",
      last_service_date: system.last_service_date || "",
      next_service_date: system.next_service_date || "",
      condition: system.condition,
      notes: system.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        system_type: formData.system_type,
        name: formData.name.trim(),
        location: formData.location.trim() || null,
        brand: formData.brand.trim() || null,
        model: formData.model.trim() || null,
        serial_number: formData.serial_number.trim() || null,
        filter_size: formData.filter_size.trim() || null,
        filter_type: formData.filter_type.trim() || null,
        refrigerant_type: formData.refrigerant_type.trim() || null,
        tonnage: formData.tonnage ? parseFloat(formData.tonnage) : null,
        btu_rating: formData.btu_rating ? parseInt(formData.btu_rating) : null,
        tank_size_gallons: formData.tank_size_gallons ? parseInt(formData.tank_size_gallons) : null,
        fuel_type: formData.fuel_type || null,
        install_date: formData.install_date || null,
        manufacture_date: formData.manufacture_date || null,
        warranty_expiry: formData.warranty_expiry || null,
        last_service_date: formData.last_service_date || null,
        next_service_date: formData.next_service_date || null,
        condition: formData.condition,
        notes: formData.notes.trim() || null,
      };

      const url = editingSystem
        ? `/api/properties/${propertyId}/systems/${editingSystem.id}`
        : `/api/properties/${propertyId}/systems`;

      const res = await fetch(url, {
        method: editingSystem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save system");
      }

      setDialogOpen(false);
      fetchSystems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save system");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSystem) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/properties/${propertyId}/systems/${deletingSystem.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete system");
      }

      setDeleteDialogOpen(false);
      setDeletingSystem(null);
      fetchSystems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete system");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getSystemIcon = (type: SystemType) => {
    const found = systemTypes.find((t) => t.value === type);
    return found?.icon || <Wrench className="h-4 w-4" />;
  };

  const getConditionBadge = (condition: SystemCondition) => {
    const found = conditionOptions.find((c) => c.value === condition);
    const variant = condition === "excellent" || condition === "good"
      ? "default"
      : condition === "fair"
        ? "secondary"
        : condition === "poor"
          ? "destructive"
          : "outline";
    return <Badge variant={variant}>{found?.label || condition}</Badge>;
  };

  const isHvacType = ["hvac", "heating", "cooling"].includes(formData.system_type);
  const isWaterHeater = formData.system_type === "water_heater";

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-systems-card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Home Systems</CardTitle>
              <CardDescription>
                HVAC, water heater, appliances, and other equipment
              </CardDescription>
            </div>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add System
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          {systems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No systems added yet</p>
              <p className="text-sm">Add your HVAC, water heater, and other equipment to track maintenance</p>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {systems.map((system) => (
                <AccordionItem key={system.id} value={system.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="text-muted-foreground">
                        {getSystemIcon(system.system_type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{system.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {system.brand} {system.model}
                          {system.location && ` - ${system.location}`}
                        </p>
                      </div>
                      {getConditionBadge(system.condition)}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-7 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3 text-sm">
                        {system.serial_number && (
                          <div>
                            <p className="text-muted-foreground">Serial Number</p>
                            <p className="font-mono">{system.serial_number}</p>
                          </div>
                        )}
                        {system.filter_size && (
                          <div>
                            <p className="text-muted-foreground">Filter Size</p>
                            <p>{system.filter_size}</p>
                          </div>
                        )}
                        {system.filter_type && (
                          <div>
                            <p className="text-muted-foreground">Filter Type</p>
                            <p>{system.filter_type}</p>
                          </div>
                        )}
                        {system.tonnage && (
                          <div>
                            <p className="text-muted-foreground">Tonnage</p>
                            <p>{system.tonnage} tons</p>
                          </div>
                        )}
                        {system.btu_rating && (
                          <div>
                            <p className="text-muted-foreground">BTU Rating</p>
                            <p>{system.btu_rating.toLocaleString()} BTU</p>
                          </div>
                        )}
                        {system.refrigerant_type && (
                          <div>
                            <p className="text-muted-foreground">Refrigerant</p>
                            <p>{system.refrigerant_type}</p>
                          </div>
                        )}
                        {system.tank_size_gallons && (
                          <div>
                            <p className="text-muted-foreground">Tank Size</p>
                            <p>{system.tank_size_gallons} gallons</p>
                          </div>
                        )}
                        {system.fuel_type && (
                          <div>
                            <p className="text-muted-foreground">Fuel Type</p>
                            <p>{system.fuel_type}</p>
                          </div>
                        )}
                        {system.install_date && (
                          <div>
                            <p className="text-muted-foreground">Install Date</p>
                            <p>{new Date(system.install_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {system.warranty_expiry && (
                          <div>
                            <p className="text-muted-foreground">Warranty Expires</p>
                            <p>{new Date(system.warranty_expiry).toLocaleDateString()}</p>
                          </div>
                        )}
                        {system.last_service_date && (
                          <div>
                            <p className="text-muted-foreground">Last Service</p>
                            <p>{new Date(system.last_service_date).toLocaleDateString()}</p>
                          </div>
                        )}
                        {system.next_service_date && (
                          <div>
                            <p className="text-muted-foreground">Next Service</p>
                            <p>{new Date(system.next_service_date).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>

                      {system.notes && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Notes</p>
                          <p className="text-sm">{system.notes}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(system)}
                        >
                          <Pencil className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setDeletingSystem(system);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSystem ? "Edit System" : "Add New System"}
            </DialogTitle>
            <DialogDescription>
              Enter the details of your home system or equipment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="system_type">System Type *</Label>
                <Select
                  value={formData.system_type}
                  onValueChange={(value) => updateField("system_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {systemTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main HVAC, Upstairs AC"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Basement, Attic, Garage"
                  value={formData.location}
                  onChange={(e) => updateField("location", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => updateField("condition", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  placeholder="e.g., Carrier, Rheem"
                  value={formData.brand}
                  onChange={(e) => updateField("brand", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model Number</Label>
                <Input
                  id="model"
                  placeholder="Model #"
                  value={formData.model}
                  onChange={(e) => updateField("model", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  placeholder="Serial #"
                  value={formData.serial_number}
                  onChange={(e) => updateField("serial_number", e.target.value)}
                />
              </div>
            </div>

            {/* HVAC-specific fields */}
            {isHvacType && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="filter_size">Filter Size</Label>
                    <Input
                      id="filter_size"
                      placeholder="e.g., 20x25x1, 16x20x4"
                      value={formData.filter_size}
                      onChange={(e) => updateField("filter_size", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filter_type">Filter Type</Label>
                    <Input
                      id="filter_type"
                      placeholder="e.g., MERV 13, HEPA"
                      value={formData.filter_type}
                      onChange={(e) => updateField("filter_type", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="tonnage">Tonnage</Label>
                    <Input
                      id="tonnage"
                      type="number"
                      step="0.5"
                      placeholder="e.g., 2.5, 3.0"
                      value={formData.tonnage}
                      onChange={(e) => updateField("tonnage", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="btu_rating">BTU Rating</Label>
                    <Input
                      id="btu_rating"
                      type="number"
                      placeholder="e.g., 60000"
                      value={formData.btu_rating}
                      onChange={(e) => updateField("btu_rating", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="refrigerant_type">Refrigerant Type</Label>
                    <Input
                      id="refrigerant_type"
                      placeholder="e.g., R-410A, R-22"
                      value={formData.refrigerant_type}
                      onChange={(e) => updateField("refrigerant_type", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Water Heater specific fields */}
            {isWaterHeater && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tank_size_gallons">Tank Size (gallons)</Label>
                  <Input
                    id="tank_size_gallons"
                    type="number"
                    placeholder="e.g., 40, 50, 80"
                    value={formData.tank_size_gallons}
                    onChange={(e) => updateField("tank_size_gallons", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Fuel Type</Label>
                  <Select
                    value={formData.fuel_type}
                    onValueChange={(value) => updateField("fuel_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.map((fuel) => (
                        <SelectItem key={fuel} value={fuel}>
                          {fuel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Date fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="install_date">Install Date</Label>
                <Input
                  id="install_date"
                  type="date"
                  value={formData.install_date}
                  onChange={(e) => updateField("install_date", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                <Input
                  id="warranty_expiry"
                  type="date"
                  value={formData.warranty_expiry}
                  onChange={(e) => updateField("warranty_expiry", e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="last_service_date">Last Service Date</Label>
                <Input
                  id="last_service_date"
                  type="date"
                  value={formData.last_service_date}
                  onChange={(e) => updateField("last_service_date", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="next_service_date">Next Service Date</Label>
                <Input
                  id="next_service_date"
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => updateField("next_service_date", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this system..."
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSystem ? "Save Changes" : "Add System"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete System</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingSystem?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete System
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
