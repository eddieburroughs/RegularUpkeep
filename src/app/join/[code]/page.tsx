import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { JoinForm } from "./join-form";

type InviteWithProvider = {
  id: string;
  invite_code: string;
  role: string;
  email: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  providers: {
    id: string;
    business_name: string;
    logo_url: string | null;
  } | null;
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  // Get the invite with provider info
  const { data: invite } = await supabase
    .from("provider_invites")
    .select(`
      id,
      invite_code,
      role,
      email,
      expires_at,
      max_uses,
      use_count,
      is_active,
      providers:provider_id(id, business_name, logo_url)
    `)
    .eq("invite_code", code)
    .single() as { data: InviteWithProvider | null; error: unknown };

  // Validate invite
  if (!invite || !invite.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">
            This invite link is invalid or has been deactivated.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  // Check if expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invite Expired</h1>
          <p className="text-muted-foreground mb-6">
            This invite link has expired. Please ask for a new invite.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  // Check if max uses reached
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Invite Limit Reached</h1>
          <p className="text-muted-foreground mb-6">
            This invite link has been used the maximum number of times. Please ask for a new invite.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Go to homepage
          </Link>
        </div>
      </div>
    );
  }

  // Check if user is already logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // User is logged in - just join them to the provider
    return (
      <JoinForm
        invite={invite}
        provider={invite.providers!}
        isLoggedIn={true}
        userEmail={user.email || ""}
      />
    );
  }

  // User needs to sign up
  return (
    <JoinForm
      invite={invite}
      provider={invite.providers!}
      isLoggedIn={false}
      userEmail=""
    />
  );
}
