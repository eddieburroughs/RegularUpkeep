"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileUpload } from "@/components/ui/file-upload";
import {
  ArrowRight,
  Loader2,
  Shield,
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Upload,
} from "lucide-react";

type DocType = "insurance" | "license";

interface UploadedDoc {
  type: DocType;
  fileName: string;
  fileUrl: string;
  status: "pending" | "verified";
}

const requiredDocs = [
  {
    type: "insurance" as DocType,
    label: "Liability Insurance",
    description: "Certificate of Insurance or proof of coverage",
    icon: Shield,
  },
  {
    type: "license" as DocType,
    label: "Business License",
    description: "State or local business license (if applicable)",
    icon: FileCheck,
  },
];

export default function ProviderDocsPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [provider, setProvider] = useState<{ id: string; verification_status: string } | null>(null);
  const [files, setFiles] = useState<Record<DocType, File[]>>({
    insurance: [],
    license: [],
  });

  useEffect(() => {
    const loadProvider = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/provider/onboarding/signup");
        return;
      }

      const { data } = await supabase
        .from("providers")
        .select("id, verification_status")
        .eq("profile_id", user.id)
        .single() as { data: { id: string; verification_status: string } | null };

      if (!data) {
        router.push("/provider/onboarding/signup");
        return;
      }

      setProvider(data);

      // Load existing docs
      type DocRecord = { category: string; file_name: string; file_url: string };
      const { data: docs } = await supabase
        .from("documents")
        .select("category, file_name, file_url")
        .eq("uploaded_by", user.id)
        .in("category", ["insurance", "permit"]) as { data: DocRecord[] | null };

      if (docs) {
        setUploadedDocs(
          docs.map((doc) => ({
            type: doc.category === "permit" ? "license" as DocType : "insurance" as DocType,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            status: "pending" as const,
          }))
        );
      }
    };

    loadProvider();
  }, [router]);

  const handleUpload = async (docType: DocType) => {
    const file = files[docType][0];
    if (!file || !provider) return;

    setUploading(docType);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `providers/${provider.id}/${docType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(fileName);

      // Save document record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("documents") as any).insert({
        category: docType === "license" ? "permit" : "insurance",
        title: `Provider ${docType === "insurance" ? "Insurance Certificate" : "Business License"}`,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
        visibility: "private",
      });

      // Update provider verification status to pending
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("providers") as any)
        .update({ verification_status: "pending" })
        .eq("id", provider.id);

      setUploadedDocs((prev) => [
        ...prev.filter((d) => d.type !== docType),
        {
          type: docType,
          fileName: file.name,
          fileUrl: urlData.publicUrl,
          status: "pending",
        },
      ]);

      setFiles((prev) => ({ ...prev, [docType]: [] }));
    } catch (error) {
      console.error("Upload error:", error);
    }

    setUploading(null);
  };

  const handleContinue = () => {
    router.push("/provider/jobs");
  };

  const getDocStatus = (docType: DocType) => {
    return uploadedDocs.find((d) => d.type === docType);
  };

  const hasAllDocs = requiredDocs.every((doc) => getDocStatus(doc.type));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Verify Your Business</h1>
        <p className="text-muted-foreground">
          Upload your business documents to get verified
        </p>
      </div>

      {/* Verification Status */}
      <Card className={
        provider?.verification_status === "verified"
          ? "border-green-200 bg-green-50"
          : provider?.verification_status === "pending"
          ? "border-amber-200 bg-amber-50"
          : "border-muted"
      }>
        <CardContent className="flex items-center gap-4 py-4">
          {provider?.verification_status === "verified" ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Verified</p>
                <p className="text-sm text-green-700">Your account is verified</p>
              </div>
            </>
          ) : provider?.verification_status === "pending" ? (
            <>
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Pending Review</p>
                <p className="text-sm text-amber-700">
                  We&apos;re reviewing your documents (1-2 business days)
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Unverified</p>
                <p className="text-sm text-muted-foreground">
                  Upload documents below to get verified
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Document Uploads */}
      <div className="space-y-4">
        {requiredDocs.map((doc) => {
          const uploaded = getDocStatus(doc.type);

          return (
            <Card key={doc.type}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <doc.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{doc.label}</CardTitle>
                      <CardDescription>{doc.description}</CardDescription>
                    </div>
                  </div>
                  {uploaded && (
                    <Badge variant={uploaded.status === "verified" ? "default" : "secondary"}>
                      {uploaded.status === "verified" ? "Verified" : "Uploaded"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {uploaded ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileCheck className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium truncate flex-1">
                      {uploaded.fileName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedDocs((prev) => prev.filter((d) => d.type !== doc.type))}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FileUpload
                      value={files[doc.type]}
                      onChange={(f) => setFiles((prev) => ({ ...prev, [doc.type]: f }))}
                      accept="image/*,application/pdf"
                      maxSize={10 * 1024 * 1024}
                      label={`Upload ${doc.label}`}
                      description="PDF or image, max 10MB"
                    />
                    {files[doc.type].length > 0 && (
                      <Button
                        onClick={() => handleUpload(doc.type)}
                        disabled={uploading === doc.type}
                        className="w-full"
                      >
                        {uploading === doc.type ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          "Upload Document"
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          className="w-full"
          size="lg"
        >
          {hasAllDocs ? "Continue to Dashboard" : "Skip for Now"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        {!hasAllDocs && (
          <p className="text-center text-sm text-muted-foreground">
            You can upload documents later from your profile
          </p>
        )}
      </div>
    </div>
  );
}
