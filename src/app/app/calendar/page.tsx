import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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
} from "lucide-react";
import type { MaintenanceCategory, MaintenanceStatus, MaintenancePriority } from "@/types/database";

type TaskWithProperty = {
  id: string;
  name: string;
  description: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  due_date: string;
  due_time: string | null;
  properties: { id: string; nickname: string | null; address_line1: string } | null;
};

const categoryIcons: Record<MaintenanceCategory, React.ComponentType<{ className?: string }>> = {
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

const categoryLabels: Record<MaintenanceCategory, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliances: "Appliances",
  exterior: "Exterior",
  interior: "Interior",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
  safety: "Safety",
  other: "Other",
};

const statusColors: Record<MaintenanceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "outline",
  upcoming: "secondary",
  due: "default",
  overdue: "destructive",
  in_progress: "secondary",
  completed: "outline",
  skipped: "outline",
  cancelled: "outline",
};

const priorityLabels: Record<MaintenancePriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get current month/year from search params or use current date
  const today = new Date();
  const currentMonth = params.month ? parseInt(params.month) : today.getMonth() + 1;
  const currentYear = params.year ? parseInt(params.year) : today.getFullYear();

  // Calculate date range for the month
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0);
  const startDate = startOfMonth.toISOString().split("T")[0];
  const endDate = endOfMonth.toISOString().split("T")[0];

  // Get tasks for this month
  const { data: tasks } = await supabase
    .from("maintenance_tasks")
    .select("id, name, description, category, priority, status, due_date, due_time, properties(id, nickname, address_line1)")
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .order("due_date", { ascending: true })
    .order("priority", { ascending: true }) as { data: TaskWithProperty[] | null };

  // Group tasks by date
  const tasksByDate: Record<string, TaskWithProperty[]> = {};
  tasks?.forEach((task) => {
    if (!tasksByDate[task.due_date]) {
      tasksByDate[task.due_date] = [];
    }
    tasksByDate[task.due_date].push(task);
  });

  // Get task counts by status
  const overdueTasks = tasks?.filter((t) => t.status === "overdue").length || 0;
  const dueTasks = tasks?.filter((t) => t.status === "due").length || 0;
  const upcomingTasks = tasks?.filter((t) => t.status === "upcoming" || t.status === "scheduled").length || 0;
  const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;

  // Navigation months
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance Calendar</h1>
          <p className="text-muted-foreground">
            Track and manage your home maintenance tasks
          </p>
        </div>
        <Button asChild>
          <Link href="/app/calendar/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={overdueTasks > 0 ? "border-red-200 bg-red-50" : ""}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${overdueTasks > 0 ? "bg-red-100" : "bg-muted"}`}>
              <AlertTriangle className={`h-5 w-5 ${overdueTasks > 0 ? "text-red-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueTasks}</p>
              <p className="text-sm text-muted-foreground">Overdue</p>
            </div>
          </CardContent>
        </Card>
        <Card className={dueTasks > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${dueTasks > 0 ? "bg-amber-100" : "bg-muted"}`}>
              <Clock className={`h-5 w-5 ${dueTasks > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{dueTasks}</p>
              <p className="text-sm text-muted-foreground">Due Now</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingTasks}</p>
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
              <p className="text-2xl font-bold">{completedTasks}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/app/calendar?month=${prevMonth}&year=${prevYear}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {monthNames[prevMonth - 1]}
            </Link>
          </Button>
          <CardTitle className="text-lg">
            {monthNames[currentMonth - 1]} {currentYear}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/app/calendar?month=${nextMonth}&year=${nextYear}`}>
              {monthNames[nextMonth - 1]}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {tasks && tasks.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(tasksByDate).map(([date, dateTasks]) => {
                const dateObj = new Date(date + "T00:00:00");
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                const dayNum = dateObj.getDate();
                const isToday = date === today.toISOString().split("T")[0];

                return (
                  <div key={date} className="flex gap-4">
                    <div className={`flex flex-col items-center justify-start pt-2 w-16 shrink-0 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      <span className="text-xs uppercase">{dayName.slice(0, 3)}</span>
                      <span className={`text-2xl font-bold ${isToday ? "bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center" : ""}`}>
                        {dayNum}
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {dateTasks.map((task) => {
                        const CategoryIcon = categoryIcons[task.category] || Wrench;
                        return (
                          <Link
                            key={task.id}
                            href={`/app/calendar/${task.id}`}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background">
                                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{task.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {task.properties?.nickname || task.properties?.address_line1}
                                  {task.due_time && ` · ${task.due_time}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.priority === "urgent" && (
                                <Badge variant="destructive">Urgent</Badge>
                              )}
                              <Badge variant={statusColors[task.status]}>
                                {task.status.replace("_", " ")}
                              </Badge>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">No tasks this month</p>
              <p className="text-sm mb-4">Add maintenance tasks to keep your home in top shape</p>
              <Button asChild>
                <Link href="/app/calendar/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Task
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
