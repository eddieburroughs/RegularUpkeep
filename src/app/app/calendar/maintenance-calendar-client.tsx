"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Droplets,
  Zap,
  Thermometer,
  Home,
  Leaf,
  Bug,
  Shield,
  Loader2,
  ListChecks,
  CalendarDays,
  Filter,
  Send,
  RefreshCw,
} from "lucide-react";
import type { PropertyMaintenanceTaskWithProperty, TaskListResponse } from "@/types/database";
import { formatDueDate, getFrequencyLabel, CATEGORIES, PRIORITIES, SKILL_LEVELS } from "@/lib/maintenance";
import { TaskDetailModal } from "./task-detail-modal";
import { RequestProviderDialog } from "./request-provider-dialog";

type Property = {
  id: string;
  nickname: string | null;
  address_line1: string;
  city: string;
  state: string;
};

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

const priorityColors: Record<string, string> = {
  urgent: "text-red-600",
  high: "text-orange-600",
  normal: "text-blue-600",
  low: "text-gray-600",
};

export function MaintenanceCalendarClient({ properties }: { properties: Property[] }) {
  const [tasks, setTasks] = useState<TaskListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("due");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Modal states
  const [selectedTask, setSelectedTask] = useState<PropertyMaintenanceTaskWithProperty | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Calendar state
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedProperty === "all"
        ? "/api/maintenance/tasks"
        : `/api/maintenance/tasks?property_id=${selectedProperty}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskSelect = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAllInTab = (taskList: PropertyMaintenanceTaskWithProperty[]) => {
    const newSelected = new Set(selectedTasks);
    const allSelected = taskList.every((t) => newSelected.has(t.id));

    if (allSelected) {
      taskList.forEach((t) => newSelected.delete(t.id));
    } else {
      taskList.forEach((t) => newSelected.add(t.id));
    }
    setSelectedTasks(newSelected);
  };

  const generatePlan = async (propertyId: string) => {
    try {
      const res = await fetch("/api/maintenance/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: propertyId }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Added ${data.count} maintenance tasks!`);
        fetchTasks();
      }
    } catch (error) {
      console.error("Failed to generate plan:", error);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      if (calendarMonth === 1) {
        setCalendarMonth(12);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
    } else {
      if (calendarMonth === 12) {
        setCalendarMonth(1);
        setCalendarYear(calendarYear + 1);
      } else {
        setCalendarMonth(calendarMonth + 1);
      }
    }
  };

  const allTasks = tasks ? [
    ...tasks.overdue,
    ...tasks.due_soon,
    ...tasks.upcoming,
  ] : [];

  const getSelectedTasksForRequest = () => {
    return allTasks.filter((t) => selectedTasks.has(t.id));
  };

  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Calendar</h1>
          <p className="text-muted-foreground">
            Track and manage your home maintenance tasks
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No Properties Found</p>
            <p className="text-muted-foreground mb-4">
              Add a property to start tracking maintenance tasks
            </p>
            <Button asChild>
              <a href="/app/properties/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Calendar</h1>
          <p className="text-muted-foreground">
            Track and manage your home maintenance tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.nickname || property.address_line1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchTasks}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {tasks && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={tasks.overdue.length > 0 ? "border-red-200 bg-red-50" : ""}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tasks.overdue.length > 0 ? "bg-red-100" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${tasks.overdue.length > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.overdue.length}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </CardContent>
          </Card>
          <Card className={tasks.due_soon.length > 0 ? "border-amber-200 bg-amber-50" : ""}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tasks.due_soon.length > 0 ? "bg-amber-100" : "bg-muted"}`}>
                <Clock className={`h-5 w-5 ${tasks.due_soon.length > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.due_soon.length}</p>
                <p className="text-sm text-muted-foreground">Due Soon</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.upcoming.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{tasks.completed.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <ListChecks className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Calendar
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {selectedTasks.size > 0 && (
            <Button onClick={() => setShowRequestDialog(true)}>
              <Send className="h-4 w-4 mr-2" />
              Request Provider ({selectedTasks.size})
            </Button>
          )}
          {selectedProperty !== "all" && (
            <Button variant="outline" onClick={() => generatePlan(selectedProperty)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Plan
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading tasks...</p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overdue" className="relative">
                  Overdue
                  {tasks && tasks.overdue.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                      {tasks.overdue.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="due">
                  Due Soon
                  {tasks && tasks.due_soon.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {tasks.due_soon.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="overdue" className="mt-0">
                <TaskList
                  tasks={tasks?.overdue || []}
                  selectedTasks={selectedTasks}
                  onSelect={handleTaskSelect}
                  onSelectAll={() => handleSelectAllInTab(tasks?.overdue || [])}
                  onTaskClick={setSelectedTask}
                  emptyMessage="No overdue tasks"
                  emptyIcon={CheckCircle2}
                />
              </TabsContent>
              <TabsContent value="due" className="mt-0">
                <TaskList
                  tasks={tasks?.due_soon || []}
                  selectedTasks={selectedTasks}
                  onSelect={handleTaskSelect}
                  onSelectAll={() => handleSelectAllInTab(tasks?.due_soon || [])}
                  onTaskClick={setSelectedTask}
                  emptyMessage="No tasks due this week"
                  emptyIcon={Clock}
                />
              </TabsContent>
              <TabsContent value="upcoming" className="mt-0">
                <TaskList
                  tasks={tasks?.upcoming || []}
                  selectedTasks={selectedTasks}
                  onSelect={handleTaskSelect}
                  onSelectAll={() => handleSelectAllInTab(tasks?.upcoming || [])}
                  onTaskClick={setSelectedTask}
                  emptyMessage="No upcoming tasks"
                  emptyIcon={Calendar}
                />
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
                <TaskList
                  tasks={tasks?.completed || []}
                  selectedTasks={selectedTasks}
                  onSelect={handleTaskSelect}
                  onSelectAll={() => handleSelectAllInTab(tasks?.completed || [])}
                  onTaskClick={setSelectedTask}
                  emptyMessage="No completed tasks"
                  emptyIcon={CheckCircle2}
                  showCompletedDate
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth("prev")}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {monthNames[calendarMonth === 1 ? 11 : calendarMonth - 2]}
            </Button>
            <CardTitle className="text-lg">
              {monthNames[calendarMonth - 1]} {calendarYear}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth("next")}>
              {monthNames[calendarMonth === 12 ? 0 : calendarMonth]}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <CalendarView
              tasks={allTasks}
              month={calendarMonth}
              year={calendarYear}
              onTaskClick={setSelectedTask}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty state for new users */}
      {!loading && tasks && allTasks.length === 0 && tasks.completed.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium mb-2">No Maintenance Tasks Yet</p>
            <p className="text-muted-foreground mb-4">
              Generate a maintenance plan to get started with regular home upkeep
            </p>
            {selectedProperty !== "all" ? (
              <Button onClick={() => generatePlan(selectedProperty)}>
                <Plus className="mr-2 h-4 w-4" />
                Generate Maintenance Plan
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a property above to generate a maintenance plan
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onComplete={() => {
            setSelectedTask(null);
            fetchTasks();
          }}
        />
      )}

      {/* Request Provider Dialog */}
      {showRequestDialog && (
        <RequestProviderDialog
          tasks={getSelectedTasksForRequest()}
          properties={properties}
          onClose={() => setShowRequestDialog(false)}
          onSuccess={() => {
            setShowRequestDialog(false);
            setSelectedTasks(new Set());
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}

// Task List Component
function TaskList({
  tasks,
  selectedTasks,
  onSelect,
  onSelectAll,
  onTaskClick,
  emptyMessage,
  emptyIcon: EmptyIcon,
  showCompletedDate = false,
}: {
  tasks: PropertyMaintenanceTaskWithProperty[];
  selectedTasks: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onTaskClick: (task: PropertyMaintenanceTaskWithProperty) => void;
  emptyMessage: string;
  emptyIcon: React.ComponentType<{ className?: string }>;
  showCompletedDate?: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <EmptyIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const allSelected = tasks.every((t) => selectedTasks.has(t.id));
  const someSelected = tasks.some((t) => selectedTasks.has(t.id)) && !allSelected;

  return (
    <div className="space-y-2">
      {/* Select all header */}
      <div className="flex items-center gap-3 px-3 py-2 bg-muted/50 rounded-lg">
        <Checkbox
          checked={allSelected}
          onCheckedChange={onSelectAll}
          className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
        />
        <span className="text-sm text-muted-foreground">
          {selectedTasks.size > 0
            ? `${selectedTasks.size} selected`
            : `${tasks.length} tasks`}
        </span>
      </div>

      {/* Task items */}
      {tasks.map((task) => {
        const CategoryIcon = categoryIcons[task.category] || Wrench;
        const skillLevel = SKILL_LEVELS.find((s) => s.value === task.skill_level);

        return (
          <div
            key={task.id}
            className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={selectedTasks.has(task.id)}
              onCheckedChange={(checked) => onSelect(task.id, !!checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              className="flex-1 flex items-center gap-3 text-left"
              onClick={() => onTaskClick(task)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background shrink-0">
                <CategoryIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {task.property && (
                    <span className="truncate">
                      {task.property.nickname || task.property.address_line1}
                    </span>
                  )}
                  <span>·</span>
                  <span>
                    {showCompletedDate && task.last_completed_at
                      ? `Completed ${new Date(task.last_completed_at).toLocaleDateString()}`
                      : formatDueDate(task.next_due_date)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge className={`${skillBadgeColors[task.skill_level]} border-0`}>
                  {skillLevel?.label || task.skill_level}
                </Badge>
                {task.priority === "urgent" && (
                  <Badge variant="destructive">Urgent</Badge>
                )}
                {task.priority === "high" && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    High
                  </Badge>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Calendar View Component
function CalendarView({
  tasks,
  month,
  year,
  onTaskClick,
}: {
  tasks: PropertyMaintenanceTaskWithProperty[];
  month: number;
  year: number;
  onTaskClick: (task: PropertyMaintenanceTaskWithProperty) => void;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Group tasks by date
  const tasksByDate: Record<string, PropertyMaintenanceTaskWithProperty[]> = {};
  tasks.forEach((task) => {
    if (task.next_due_date) {
      const date = task.next_due_date.split("T")[0];
      if (!tasksByDate[date]) {
        tasksByDate[date] = [];
      }
      tasksByDate[date].push(task);
    }
  });

  const days: Array<{ date: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Add empty cells for days before the first of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: "", dayNum: 0, isCurrentMonth: false });
  }

  // Add days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({ date, dayNum: i, isCurrentMonth: true });
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isToday = day.date === todayStr;
          const dayTasks = tasksByDate[day.date] || [];

          return (
            <div
              key={index}
              className={`min-h-[100px] p-1 border rounded-lg ${
                day.isCurrentMonth ? "bg-background" : "bg-muted/30"
              } ${isToday ? "border-primary" : "border-border"}`}
            >
              {day.isCurrentMonth && (
                <>
                  <div className={`text-sm font-medium mb-1 ${isToday ? "text-primary" : ""}`}>
                    {day.dayNum}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => {
                      const CategoryIcon = categoryIcons[task.category] || Wrench;
                      return (
                        <button
                          key={task.id}
                          onClick={() => onTaskClick(task)}
                          className="w-full text-left text-xs p-1 rounded bg-muted/50 hover:bg-muted truncate flex items-center gap-1"
                        >
                          <CategoryIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.title}</span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
