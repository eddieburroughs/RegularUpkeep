"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Wrench,
  Droplets,
  Zap,
  Thermometer,
  Home,
  Leaf,
  Bug,
  Shield,
} from "lucide-react";
import type { MaintenanceTaskTemplate, MaintenanceFrequencyType, MaintenanceSkillLevel, MaintenanceCategory, MaintenancePriority, MaintenanceDefaultAssignee } from "@/types/database";
import { CATEGORIES, PRIORITIES, SKILL_LEVELS, FREQUENCY_TYPES } from "@/lib/maintenance";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hvac: Thermometer,
  plumbing: Droplets,
  electrical: Zap,
  appliances: Home,
  exterior: Home,
  interior: Home,
  landscaping: Leaf,
  pest_control: Bug,
  safety: Shield,
  other: Wrench,
};

const skillBadgeColors: Record<string, string> = {
  diy: "bg-green-100 text-green-800",
  pro_recommended: "bg-amber-100 text-amber-800",
  pro_required: "bg-red-100 text-red-800",
};

export function TemplatesManagerClient() {
  const [templates, setTemplates] = useState<MaintenanceTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MaintenanceTaskTemplate | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter((template) => {
    // Filter by active status
    if (!showInactive && !template.is_active) return false;

    // Filter by category
    if (categoryFilter !== "all" && template.category !== categoryFilter) return false;

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        template.title.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.tags?.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  // Group by category for display
  const groupedByCategory = filteredTemplates.reduce((acc, template) => {
    const cat = template.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, MaintenanceTaskTemplate[]>);

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this template? It will be hidden from new plans.")) return;

    try {
      const res = await fetch(`/api/admin/maintenance-templates/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to archive:", error);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/maintenance-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to toggle:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Templates</h1>
          <p className="text-muted-foreground">
            Manage the master list of maintenance tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTemplates}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold">{templates.filter((t) => t.is_active).length}</p>
            <p className="text-sm text-muted-foreground">Active Templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold">{templates.filter((t) => !t.is_active).length}</p>
            <p className="text-sm text-muted-foreground">Archived</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold">
              {templates.filter((t) => t.skill_level === "pro_required").length}
            </p>
            <p className="text-sm text-muted-foreground">Pro Required</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-2xl font-bold">
              {new Set(templates.map((t) => t.category)).size}
            </p>
            <p className="text-sm text-muted-foreground">Categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm">
                Show Archived
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading templates...</p>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No templates found</p>
            <p className="text-muted-foreground mb-4">
              {search || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Create your first maintenance template"}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByCategory).map(([category, categoryTemplates]) => {
          const catInfo = CATEGORIES.find((c) => c.value === category);
          const CategoryIcon = categoryIcons[category] || Wrench;

          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CategoryIcon className="h-5 w-5" />
                  {catInfo?.label || category}
                  <Badge variant="outline" className="ml-2">
                    {categoryTemplates.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Task</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Skill Level</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryTemplates.map((template) => (
                      <TableRow key={template.id} className={!template.is_active ? "opacity-50" : ""}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{template.title}</p>
                            {template.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {template.frequency_type.replace("_", " ")}
                            {template.frequency_interval > 1 && ` (${template.frequency_interval})`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${skillBadgeColors[template.skill_level]} border-0`}>
                            {SKILL_LEVELS.find((s) => s.value === template.skill_level)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize">{template.priority}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Archived"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleActive(template.id, !template.is_active)}
                              >
                                {template.is_active ? (
                                  <>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Restore
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTemplate) && (
        <TemplateFormModal
          template={editingTemplate}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
            fetchTemplates();
          }}
        />
      )}
    </div>
  );
}

// Template Form Modal
function TemplateFormModal({
  template,
  onClose,
  onSuccess,
}: {
  template: MaintenanceTaskTemplate | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: template?.title || "",
    description: template?.description || "",
    category: template?.category || "other",
    frequency_type: template?.frequency_type || "annual",
    frequency_interval: template?.frequency_interval || 1,
    suggested_months: template?.suggested_months?.join(", ") || "",
    priority: template?.priority || "normal",
    estimated_minutes: template?.estimated_minutes || 30,
    skill_level: template?.skill_level || "diy",
    tags: template?.tags?.join(", ") || "",
    default_assignee: template?.default_assignee || "homeowner",
    instructions: template?.instructions || "",
    pro_tips: template?.pro_tips || "",
    warning_notes: template?.warning_notes || "",
  });

  const handleSubmit = async () => {
    if (!formData.title || !formData.category) {
      alert("Title and category are required");
      return;
    }

    setLoading(true);
    try {
      const body = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        frequency_type: formData.frequency_type,
        frequency_interval: formData.frequency_interval,
        suggested_months: formData.suggested_months
          ? formData.suggested_months.split(",").map((m) => parseInt(m.trim())).filter(Boolean)
          : null,
        priority: formData.priority,
        estimated_minutes: formData.estimated_minutes,
        skill_level: formData.skill_level,
        tags: formData.tags
          ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        default_assignee: formData.default_assignee,
        instructions: formData.instructions || null,
        pro_tips: formData.pro_tips || null,
        warning_notes: formData.warning_notes || null,
      };

      const url = template
        ? `/api/admin/maintenance-templates/${template.id}`
        : "/api/admin/maintenance-templates";

      const res = await fetch(url, {
        method: template ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save template");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {template
              ? "Update the maintenance task template"
              : "Create a new maintenance task template"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Test Smoke Detectors"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the task"
                rows={2}
              />
            </div>
          </div>

          {/* Category and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData({ ...formData, category: v as MaintenanceCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequency Type</Label>
              <Select
                value={formData.frequency_type}
                onValueChange={(v) => setFormData({ ...formData, frequency_type: v as MaintenanceFrequencyType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_TYPES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Interval</Label>
              <Input
                id="interval"
                type="number"
                min="1"
                value={formData.frequency_interval}
                onChange={(e) =>
                  setFormData({ ...formData, frequency_interval: parseInt(e.target.value) || 1 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="months">Suggested Months</Label>
              <Input
                id="months"
                value={formData.suggested_months}
                onChange={(e) => setFormData({ ...formData, suggested_months: e.target.value })}
                placeholder="e.g., 3, 4, 5"
              />
              <p className="text-xs text-muted-foreground">Comma-separated month numbers (1-12)</p>
            </div>
          </div>

          {/* Priority and Skill Level */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v as MaintenancePriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Skill Level</Label>
              <Select
                value={formData.skill_level}
                onValueChange={(v) => setFormData({ ...formData, skill_level: v as MaintenanceSkillLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_LEVELS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutes">Est. Minutes</Label>
              <Input
                id="minutes"
                type="number"
                min="1"
                value={formData.estimated_minutes}
                onChange={(e) =>
                  setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) || 30 })
                }
              />
            </div>
          </div>

          {/* Tags and Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., safety, fire, annual"
              />
              <p className="text-xs text-muted-foreground">Comma-separated tags</p>
            </div>

            <div className="space-y-2">
              <Label>Default Assignee</Label>
              <Select
                value={formData.default_assignee}
                onValueChange={(v) => setFormData({ ...formData, default_assignee: v as MaintenanceDefaultAssignee })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homeowner">Homeowner</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Step-by-step instructions"
              rows={4}
            />
          </div>

          {/* Pro Tips */}
          <div className="space-y-2">
            <Label htmlFor="tips">Pro Tips</Label>
            <Textarea
              id="tips"
              value={formData.pro_tips}
              onChange={(e) => setFormData({ ...formData, pro_tips: e.target.value })}
              placeholder="Helpful tips for completing this task"
              rows={2}
            />
          </div>

          {/* Warning Notes */}
          <div className="space-y-2">
            <Label htmlFor="warning">Safety / Warning Notes</Label>
            <Textarea
              id="warning"
              value={formData.warning_notes}
              onChange={(e) => setFormData({ ...formData, warning_notes: e.target.value })}
              placeholder="Important safety warnings"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
