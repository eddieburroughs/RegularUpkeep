/**
 * Admin Fraud Review Page
 *
 * Lists referrals pending fraud review with AI-generated risk signals.
 * All actions require human confirmation - never auto-bans.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  XCircle,
} from "lucide-react";
import { FraudReviewList } from "@/components/admin/fraud-review-list";

type FraudReviewStats = {
  pending: number;
  approved: number;
  rejected: number;
  escalated: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
};

type FraudReviewStat = {
  id: string;
  status: string;
  ai_risk_score: number;
};

export default async function AdminFraudReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  // Fetch fraud review stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reviewsData } = await (supabase as any)
    .from("fraud_review_queue")
    .select("id, status, ai_risk_score");

  const reviews = (reviewsData || []) as FraudReviewStat[];

  const stats: FraudReviewStats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
  };

  reviews.forEach((r) => {
    // Status counts
    if (r.status === "pending") stats.pending++;
    else if (r.status === "approved") stats.approved++;
    else if (r.status === "rejected") stats.rejected++;
    else if (r.status === "escalated") stats.escalated++;

    // Risk level counts (only for pending)
    if (r.status === "pending") {
      if (r.ai_risk_score >= 61) stats.highRisk++;
      else if (r.ai_risk_score >= 31) stats.mediumRisk++;
      else stats.lowRisk++;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Fraud Review Queue
          </h1>
          <p className="text-muted-foreground">
            Review referrals flagged by AI for potential fraud signals
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending Review
            </CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              High Risk
            </CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.highRisk}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Approved
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              Rejected
            </CardDescription>
            <CardTitle className="text-2xl">{stats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pending Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm">High Risk (61-100): {stats.highRisk}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm">Medium Risk (31-60): {stats.mediumRisk}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm">Low Risk (0-30): {stats.lowRisk}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review List */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {stats.pending > 0 && (
              <Badge variant="secondary" className="ml-1">{stats.pending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="high_risk" className="gap-2">
            High Risk
            {stats.highRisk > 0 && (
              <Badge variant="destructive" className="ml-1">{stats.highRisk}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="escalated">Escalated</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <FraudReviewList status="pending" />
        </TabsContent>

        <TabsContent value="high_risk" className="mt-4">
          <FraudReviewList status="pending" riskFilter="high" />
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          <FraudReviewList status="approved" />
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          <FraudReviewList status="rejected" />
        </TabsContent>

        <TabsContent value="escalated" className="mt-4">
          <FraudReviewList status="escalated" />
        </TabsContent>
      </Tabs>

      {/* Important Notice */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Review Guidelines</h3>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>AI signals are advisory only - human judgment required for all decisions</li>
                <li>Never auto-reject based on AI score alone</li>
                <li>High-risk referrals may require additional investigation</li>
                <li>All decisions are logged for audit purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
