"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ConfigTypeMap } from "@/lib/config/admin-config";

interface ConfigEditorProps {
  initialConfig: ConfigTypeMap;
}

const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const parseCents = (value: string) => Math.round(parseFloat(value) * 100) || 0;

export function ConfigEditor({ initialConfig }: ConfigEditorProps) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveConfig = async (key: keyof ConfigTypeMap) => {
    setSaving(key);
    setError(null);
    setSaved(null);

    try {
      const response = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: config[key] }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save");
      }

      setSaved(key);
      setTimeout(() => setSaved(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Tabs defaultValue="pricing" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pricing">Pricing</TabsTrigger>
        <TabsTrigger value="fees">Fees</TabsTrigger>
        <TabsTrigger value="providers">Providers</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
      </TabsList>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* PRICING TAB */}
      <TabsContent value="pricing" className="space-y-4">
        {/* Homeowner Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Homeowner Subscription Pricing</CardTitle>
            <CardDescription>
              Monthly fees for homeowners based on number of homes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Free Homes Limit</Label>
                <Input
                  type="number"
                  value={config.homeowner_pricing.free_homes_limit}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      homeowner_pricing: {
                        ...config.homeowner_pricing,
                        free_homes_limit: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Number of free homes before charging
                </p>
              </div>
              <div className="space-y-2">
                <Label>Additional Home ($/month)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(config.homeowner_pricing.additional_home_monthly_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      homeowner_pricing: {
                        ...config.homeowner_pricing,
                        additional_home_monthly_cents: parseCents(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tenant Access ($/month)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(config.homeowner_pricing.tenant_access_monthly_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      homeowner_pricing: {
                        ...config.homeowner_pricing,
                        tenant_access_monthly_cents: parseCents(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sponsor-Free Experience ($/year)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(config.homeowner_pricing.sponsor_free_yearly_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      homeowner_pricing: {
                        ...config.homeowner_pricing,
                        sponsor_free_yearly_cents: parseCents(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => saveConfig("homeowner_pricing")}
                disabled={saving === "homeowner_pricing"}
              >
                {saving === "homeowner_pricing" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "homeowner_pricing" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Pricing
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sponsor Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sponsor Pricing</CardTitle>
            <CardDescription>Pricing for sponsor tile placements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local Sponsor ($/year)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(config.sponsor_pricing.local_sponsor_yearly_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sponsor_pricing: {
                        ...config.sponsor_pricing,
                        local_sponsor_yearly_cents: parseCents(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tiles Per Territory</Label>
                <Input
                  type="number"
                  value={config.sponsor_pricing.tiles_per_territory}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      sponsor_pricing: {
                        ...config.sponsor_pricing,
                        tiles_per_territory: parseInt(e.target.value) || 3,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => saveConfig("sponsor_pricing")}
                disabled={saving === "sponsor_pricing"}
              >
                {saving === "sponsor_pricing" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "sponsor_pricing" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* FEES TAB */}
      <TabsContent value="fees" className="space-y-4">
        {/* Diagnostic Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diagnostic Fees by Category</CardTitle>
            <CardDescription>
              Upfront diagnostic fees charged before service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(config.diagnostic_fees).map(([category, fee]) => (
                <AccordionItem key={category} value={category}>
                  <AccordionTrigger className="capitalize">
                    <div className="flex items-center gap-2">
                      {category.replace("_", " ")}
                      <Badge variant="outline">{formatCents(fee.fee_cents)}</Badge>
                      {fee.creditable && (
                        <Badge variant="secondary" className="text-xs">
                          Creditable
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label>Fee Amount ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(fee.fee_cents / 100).toFixed(2)}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              diagnostic_fees: {
                                ...config.diagnostic_fees,
                                [category]: {
                                  ...fee,
                                  fee_cents: parseCents(e.target.value),
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Creditable to Final Invoice</Label>
                        <div className="flex items-center gap-2 pt-2">
                          <Switch
                            checked={fee.creditable}
                            onCheckedChange={(checked) =>
                              setConfig({
                                ...config,
                                diagnostic_fees: {
                                  ...config.diagnostic_fees,
                                  [category]: { ...fee, creditable: checked },
                                },
                              })
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            {fee.creditable ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => saveConfig("diagnostic_fees")}
                disabled={saving === "diagnostic_fees"}
              >
                {saving === "diagnostic_fees" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "diagnostic_fees" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Diagnostic Fees
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Platform Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Homeowner Platform Fees</CardTitle>
            <CardDescription>
              Tiered fees charged to homeowners per completed job
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {config.homeowner_platform_fees.tiers.map((tier, index) => (
                <div key={index} className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Min Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(tier.min_cents / 100).toFixed(2)}
                      onChange={(e) => {
                        const tiers = [...config.homeowner_platform_fees.tiers];
                        tiers[index] = { ...tier, min_cents: parseCents(e.target.value) };
                        setConfig({
                          ...config,
                          homeowner_platform_fees: {
                            ...config.homeowner_platform_fees,
                            tiers,
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(tier.max_cents / 100).toFixed(2)}
                      onChange={(e) => {
                        const tiers = [...config.homeowner_platform_fees.tiers];
                        tiers[index] = { ...tier, max_cents: parseCents(e.target.value) };
                        setConfig({
                          ...config,
                          homeowner_platform_fees: {
                            ...config.homeowner_platform_fees,
                            tiers,
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={(tier.fee_cents / 100).toFixed(2)}
                      onChange={(e) => {
                        const tiers = [...config.homeowner_platform_fees.tiers];
                        tiers[index] = { ...tier, fee_cents: parseCents(e.target.value) };
                        setConfig({
                          ...config,
                          homeowner_platform_fees: {
                            ...config.homeowner_platform_fees,
                            tiers,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Fee Cap ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={(config.homeowner_platform_fees.cap_cents / 100).toFixed(2)}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    homeowner_platform_fees: {
                      ...config.homeowner_platform_fees,
                      cap_cents: parseCents(e.target.value),
                    },
                  })
                }
                className="max-w-xs"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => saveConfig("homeowner_platform_fees")}
                disabled={saving === "homeowner_platform_fees"}
              >
                {saving === "homeowner_platform_fees" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "homeowner_platform_fees" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Platform Fees
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Provider Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provider Fees</CardTitle>
            <CardDescription>
              Fees charged to providers per completed job
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.provider_fees.percentage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      provider_fees: {
                        ...config.provider_fees,
                        percentage: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Minimum Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={(config.provider_fees.minimum_cents / 100).toFixed(2)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      provider_fees: {
                        ...config.provider_fees,
                        minimum_cents: parseCents(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => saveConfig("provider_fees")}
                disabled={saving === "provider_fees"}
              >
                {saving === "provider_fees" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "provider_fees" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* PROVIDERS TAB */}
      <TabsContent value="providers" className="space-y-4">
        {/* Provider Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provider Tier Pricing</CardTitle>
            <CardDescription>
              Monthly subscription pricing for Verified and Preferred tiers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium">Verified Tier</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(config.provider_tiers.verified.monthly_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        provider_tiers: {
                          ...config.provider_tiers,
                          verified: {
                            ...config.provider_tiers.verified,
                            monthly_cents: parseCents(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Requirements</Label>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {config.provider_tiers.verified.requirements.map((req) => (
                      <Badge key={req} variant="secondary" className="capitalize">
                        {req.replace("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Preferred Tier</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={(config.provider_tiers.preferred.monthly_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        provider_tiers: {
                          ...config.provider_tiers,
                          preferred: {
                            ...config.provider_tiers.preferred,
                            monthly_cents: parseCents(e.target.value),
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Rating</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.provider_tiers.preferred.performance_thresholds.min_rating}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        provider_tiers: {
                          ...config.provider_tiers,
                          preferred: {
                            ...config.provider_tiers.preferred,
                            performance_thresholds: {
                              ...config.provider_tiers.preferred.performance_thresholds,
                              min_rating: parseFloat(e.target.value) || 0,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Completed Jobs</Label>
                  <Input
                    type="number"
                    value={config.provider_tiers.preferred.performance_thresholds.min_completed_jobs}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        provider_tiers: {
                          ...config.provider_tiers,
                          preferred: {
                            ...config.provider_tiers.preferred,
                            performance_thresholds: {
                              ...config.provider_tiers.preferred.performance_thresholds,
                              min_completed_jobs: parseInt(e.target.value) || 0,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Dispute Rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={config.provider_tiers.preferred.performance_thresholds.max_dispute_rate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        provider_tiers: {
                          ...config.provider_tiers,
                          preferred: {
                            ...config.provider_tiers.preferred,
                            performance_thresholds: {
                              ...config.provider_tiers.preferred.performance_thresholds,
                              max_dispute_rate: parseFloat(e.target.value) || 0,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Response Time (hours)</Label>
                  <Input
                    type="number"
                    value={config.provider_tiers.preferred.performance_thresholds.min_response_time_hours}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        provider_tiers: {
                          ...config.provider_tiers,
                          preferred: {
                            ...config.provider_tiers.preferred,
                            performance_thresholds: {
                              ...config.provider_tiers.preferred.performance_thresholds,
                              min_response_time_hours: parseInt(e.target.value) || 0,
                            },
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => saveConfig("provider_tiers")}
                disabled={saving === "provider_tiers"}
              >
                {saving === "provider_tiers" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "provider_tiers" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Tier Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Marketplace Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Marketplace Payment Settings</CardTitle>
            <CardDescription>
              Configure estimate buffers, auto-approval, and dispute windows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estimate Buffer (%)</Label>
                <Input
                  type="number"
                  value={config.marketplace_payments.estimate_buffer_percentage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      marketplace_payments: {
                        ...config.marketplace_payments,
                        estimate_buffer_percentage: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Extra % authorized on estimate approval
                </p>
              </div>
              <div className="space-y-2">
                <Label>Change Order Threshold (%)</Label>
                <Input
                  type="number"
                  value={config.marketplace_payments.change_order_threshold_percentage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      marketplace_payments: {
                        ...config.marketplace_payments,
                        change_order_threshold_percentage: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Auto-Approve After (hours)</Label>
                <Input
                  type="number"
                  value={config.marketplace_payments.auto_approve_hours}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      marketplace_payments: {
                        ...config.marketplace_payments,
                        auto_approve_hours: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Dispute Window (hours)</Label>
                <Input
                  type="number"
                  value={config.marketplace_payments.dispute_window_hours}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      marketplace_payments: {
                        ...config.marketplace_payments,
                        dispute_window_hours: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => saveConfig("marketplace_payments")}
                disabled={saving === "marketplace_payments"}
              >
                {saving === "marketplace_payments" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "marketplace_payments" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* FEATURES TAB */}
      <TabsContent value="features" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Feature Flags</CardTitle>
            <CardDescription>
              Enable or disable platform features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(config.feature_flags).map(([flag, enabled]) => (
              <div
                key={flag}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium capitalize">
                    {flag.replace(/_/g, " ")}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      feature_flags: {
                        ...config.feature_flags,
                        [flag]: checked,
                      },
                    })
                  }
                />
              </div>
            ))}
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => saveConfig("feature_flags")}
                disabled={saving === "feature_flags"}
              >
                {saving === "feature_flags" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "feature_flags" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Feature Flags
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Realtor Referral */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Realtor Referral Program</CardTitle>
            <CardDescription>
              Settings for the realtor referral incentive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qualified Homeowners Threshold</Label>
                <Input
                  type="number"
                  value={config.realtor_referral.qualified_homeowners_threshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      realtor_referral: {
                        ...config.realtor_referral,
                        qualified_homeowners_threshold: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Days Active (anti-fraud)</Label>
                <Input
                  type="number"
                  value={config.realtor_referral.anti_fraud.min_days_active}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      realtor_referral: {
                        ...config.realtor_referral,
                        anti_fraud: {
                          ...config.realtor_referral.anti_fraud,
                          min_days_active: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Min Properties (anti-fraud)</Label>
                <Input
                  type="number"
                  value={config.realtor_referral.anti_fraud.min_properties}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      realtor_referral: {
                        ...config.realtor_referral,
                        anti_fraud: {
                          ...config.realtor_referral.anti_fraud,
                          min_properties: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Require Verified Email</Label>
                <div className="pt-2">
                  <Switch
                    checked={config.realtor_referral.anti_fraud.require_verified_email}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        realtor_referral: {
                          ...config.realtor_referral,
                          anti_fraud: {
                            ...config.realtor_referral.anti_fraud,
                            require_verified_email: checked,
                          },
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => saveConfig("realtor_referral")}
                disabled={saving === "realtor_referral"}
              >
                {saving === "realtor_referral" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : saved === "realtor_referral" ? (
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
