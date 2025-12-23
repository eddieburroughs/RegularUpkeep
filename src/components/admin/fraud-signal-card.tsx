"use client";

/**
 * Fraud Signal Card Component
 *
 * Displays fraud signals for a referral with risk score and flags.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Clock,
  Users,
  Mail,
  CreditCard,
  MapPin,
  Smartphone,
} from "lucide-react";

type FraudSignal = {
  flag: string;
  reason: string;
  severity: "high" | "medium" | "low";
};

interface FraudSignalCardProps {
  riskScore: number;
  signals: FraudSignal[];
  recommendation: string;
}

function getRiskColor(score: number): string {
  if (score >= 61) return "text-red-600";
  if (score >= 31) return "text-yellow-600";
  return "text-green-600";
}

function getRiskBg(score: number): string {
  if (score >= 61) return "bg-red-500";
  if (score >= 31) return "bg-yellow-500";
  return "bg-green-500";
}

function getSignalIcon(flag: string) {
  const lowerFlag = flag.toLowerCase();
  if (lowerFlag.includes("email")) return <Mail className="h-4 w-4" />;
  if (lowerFlag.includes("ip") || lowerFlag.includes("device")) return <Smartphone className="h-4 w-4" />;
  if (lowerFlag.includes("payment") || lowerFlag.includes("card")) return <CreditCard className="h-4 w-4" />;
  if (lowerFlag.includes("address")) return <MapPin className="h-4 w-4" />;
  if (lowerFlag.includes("cluster") || lowerFlag.includes("referral")) return <Users className="h-4 w-4" />;
  if (lowerFlag.includes("time") || lowerFlag.includes("velocity")) return <Clock className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-700 border-red-300";
    case "medium":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "low":
      return "bg-blue-100 text-blue-700 border-blue-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

export function FraudSignalCard({ riskScore, signals, recommendation }: FraudSignalCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Fraud Signals
          </span>
          <span className={`text-2xl font-bold ${getRiskColor(riskScore)}`}>
            {riskScore}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Score Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Risk Score</span>
            <span className={`font-medium ${getRiskColor(riskScore)}`}>
              {riskScore >= 61 ? "High Risk" : riskScore >= 31 ? "Medium Risk" : "Low Risk"}
            </span>
          </div>
          <Progress value={riskScore} className={getRiskBg(riskScore)} />
        </div>

        {/* Recommendation */}
        <div className="p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">AI Recommendation: </span>
          <Badge
            variant="outline"
            className={
              recommendation === "approve"
                ? "bg-green-100 text-green-700 border-green-300"
                : recommendation === "reject"
                ? "bg-red-100 text-red-700 border-red-300"
                : "bg-yellow-100 text-yellow-700 border-yellow-300"
            }
          >
            {recommendation.charAt(0).toUpperCase() + recommendation.slice(1)}
          </Badge>
        </div>

        {/* Signals List */}
        {signals && signals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Detected Signals</h4>
            {signals.map((signal, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${getSeverityColor(signal.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getSignalIcon(signal.flag)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{signal.flag}</span>
                      <Badge variant="outline" className="text-xs">
                        {signal.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {signal.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(!signals || signals.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No specific fraud signals detected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
