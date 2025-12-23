import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TaskDetails } from "./task-details";
import type { MaintenanceTask, Property } from "@/types/database";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Get the task with property info
  const { data: task, error } = await supabase
    .from("maintenance_tasks")
    .select("*, properties(*)")
    .eq("id", id)
    .single();

  if (error || !task) {
    notFound();
  }

  return (
    <TaskDetails
      task={task as MaintenanceTask & { properties: Property | null }}
    />
  );
}
