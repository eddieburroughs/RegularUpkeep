"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Shield, UserMinus, Loader2 } from "lucide-react";

interface TeamMemberActionsProps {
  member: {
    id: string;
    role: string;
    profiles: {
      full_name: string | null;
    } | null;
  };
}

export function TeamMemberActions({ member }: TeamMemberActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleChangeRole = async (newRole: "manager" | "technician") => {
    if (newRole === member.role) return;

    setLoading(true);
    const supabase = createClient();

    await (supabase as any)
      .from("provider_members")
      .update({ role: newRole })
      .eq("id", member.id);

    setLoading(false);
    router.refresh();
  };

  const handleRemove = async () => {
    setLoading(true);
    const supabase = createClient();

    await (supabase as any)
      .from("provider_members")
      .update({ status: "inactive" })
      .eq("id", member.id);

    setShowRemoveDialog(false);
    setLoading(false);
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {member.role === "technician" && (
            <DropdownMenuItem onClick={() => handleChangeRole("manager")}>
              <Shield className="mr-2 h-4 w-4" />
              Promote to Manager
            </DropdownMenuItem>
          )}
          {member.role === "manager" && (
            <DropdownMenuItem onClick={() => handleChangeRole("technician")}>
              <Shield className="mr-2 h-4 w-4" />
              Demote to Technician
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowRemoveDialog(true)}
            className="text-red-600"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Remove from Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {member.profiles?.full_name || "this member"} from your team?
              They will no longer be able to view or work on your jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
