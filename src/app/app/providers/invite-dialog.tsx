"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2, MessageSquare, Mail, Link as LinkIcon, Star, MapPin, Copy, Check, AlertCircle } from "lucide-react";

type ProviderResult = {
  id: string;
  place_id: string;
  name: string;
  primary_service: string;
  rating: number | null;
  user_ratings_total: number | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  distance_miles: number;
};

type PropertyData = {
  id: string;
  nickname: string | null;
  address_line1: string;
  city: string;
  state: string;
};

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ProviderResult;
  property: PropertyData;
  serviceType: string;
}

export function InviteDialog({
  open,
  onOpenChange,
  provider,
  property,
  serviceType,
}: InviteDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sendVia, setSendVia] = useState<"sms" | "email" | "link">(
    provider.phone ? "sms" : "link"
  );
  const [phone, setPhone] = useState(provider.phone || "");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/providers/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerLeadId: provider.id,
          propertyId: property.id,
          serviceType,
          sendVia,
          sendTo: sendVia === "sms" ? phone : sendVia === "email" ? email : undefined,
          message: message || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || "Failed to send invite");
        return;
      }

      setInviteUrl(data.inviteUrl);
      setErrorMessage(null);

      if (sendVia === "link") {
        setSuccessMessage("Invite created! Copy the link below to share.");
      } else {
        setSuccessMessage(data.message || `Invite sent to ${provider.name}`);
        setTimeout(() => onOpenChange(false), 2000);
      }
    } catch (err) {
      setErrorMessage("An error occurred while sending the invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInviteUrl(null);
    setCopied(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Provider</DialogTitle>
          <DialogDescription>
            Send an invitation to {provider.name} to join RegularUpkeep
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error/Success Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              {successMessage}
            </div>
          )}

          {/* Provider Info */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="font-medium">{provider.name}</p>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {provider.rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {provider.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {provider.distance_miles.toFixed(1)} mi away
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              For {serviceType.replace("_", " ")} at{" "}
              {property.nickname || property.address_line1}
            </p>
          </div>

          {inviteUrl ? (
            /* Show invite link after creation */
            <div className="space-y-3">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="flex-1" />
                <Button variant="outline" onClick={handleCopyLink}>
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the provider. It expires in 30 days.
              </p>
            </div>
          ) : (
            /* Invite form */
            <>
              <div className="space-y-2">
                <Label>Send Via</Label>
                <Select
                  value={sendVia}
                  onValueChange={(v) => setSendVia(v as "sms" | "email" | "link")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms" disabled={!provider.phone}>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS {!provider.phone && "(no phone available)"}
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="link">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Get Link Only
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {sendVia === "sms" && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              )}

              {sendVia === "email" && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="provider@example.com"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">
                  Personal Message{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi! I'd love to work with you on my home maintenance..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {inviteUrl ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  (sendVia === "sms" && !phone) ||
                  (sendVia === "email" && !email)
                }
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : sendVia === "link" ? (
                  "Create Invite Link"
                ) : (
                  "Send Invite"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
