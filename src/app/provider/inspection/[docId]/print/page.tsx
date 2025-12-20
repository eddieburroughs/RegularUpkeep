import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { INSPECTION_SECTIONS, INSPECTION_TYPE_LABELS, type InspectionMeta, type FindingStatus } from "@/types/inspection";
import { PrintTrigger } from "./print-trigger";

type InspectionDocument = {
  id: string;
  title: string;
  description: string | null;
  document_date: string | null;
  created_at: string;
  meta: InspectionMeta;
  properties: {
    id: string;
    nickname: string | null;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
  } | null;
};

const statusLabels: Record<FindingStatus, string> = {
  pass: "PASS",
  attention: "NEEDS ATTENTION",
  urgent: "URGENT",
  na: "N/A",
};

const statusColors: Record<FindingStatus, string> = {
  pass: "#16a34a",
  attention: "#d97706",
  urgent: "#dc2626",
  na: "#6b7280",
};

export default async function InspectionPrintPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const supabase = await createClient();

  // Fetch the inspection document
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, title, description, document_date, created_at, meta, properties(id, nickname, address_line1, city, state, postal_code)")
    .eq("id", docId)
    .eq("category", "inspection")
    .single() as { data: InspectionDocument | null; error: unknown };

  if (error || !doc || !doc.meta) {
    notFound();
  }

  const meta = doc.meta as InspectionMeta;
  const sections = INSPECTION_SECTIONS[meta.type];
  const property = doc.properties;

  const inspectionDate = new Date(meta.completedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const inspectionTime = new Date(meta.completedAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
        }
        @page {
          margin: 0.75in;
          size: letter;
        }
      `}</style>

      <PrintTrigger />

      <div className="min-h-screen bg-white text-black font-sans" style={{ maxWidth: "8.5in", margin: "0 auto", padding: "0.5in" }}>
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HOME INSPECTION REPORT</h1>
              <p className="text-sm text-gray-600 mt-1">{INSPECTION_TYPE_LABELS[meta.type].label}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">RegularUpkeep</p>
              <p className="text-xs text-gray-500">regularupkeep.com</p>
            </div>
          </div>
        </div>

        {/* Property & Date Info */}
        <div className="grid grid-cols-2 gap-8 mb-6 avoid-break">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Property</h2>
            <p className="font-medium">{property?.nickname || property?.address_line1}</p>
            <p className="text-sm text-gray-600">
              {property?.address_line1}
              {property?.city && `, ${property.city}, ${property.state} ${property.postal_code}`}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Inspection Date</h2>
            <p className="font-medium">{inspectionDate}</p>
            <p className="text-sm text-gray-600">{inspectionTime}</p>
          </div>
        </div>

        {/* Summary Box */}
        <div className="border-2 border-gray-300 rounded-lg p-4 mb-6 avoid-break" style={{ backgroundColor: "#f9fafb" }}>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Inspection Summary</h2>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold" style={{ color: statusColors.pass }}>{meta.summary.pass}</p>
              <p className="text-xs text-gray-600">Pass</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: statusColors.attention }}>{meta.summary.attention}</p>
              <p className="text-xs text-gray-600">Needs Attention</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: statusColors.urgent }}>{meta.summary.urgent}</p>
              <p className="text-xs text-gray-600">Urgent</p>
            </div>
            <div>
              <p className="text-3xl font-bold" style={{ color: statusColors.na }}>{meta.summary.na}</p>
              <p className="text-xs text-gray-600">N/A</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-300 text-center">
            <p className="text-sm text-gray-600">
              <span className="font-medium">{meta.summary.total}</span> items inspected
            </p>
          </div>
        </div>

        {/* Urgent Issues - if any */}
        {meta.summary.urgent > 0 && (
          <div className="mb-6 avoid-break">
            <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: statusColors.urgent }}>
              <div className="px-4 py-2" style={{ backgroundColor: "#fef2f2" }}>
                <h2 className="font-semibold" style={{ color: statusColors.urgent }}>
                  ⚠ URGENT ISSUES REQUIRING IMMEDIATE ATTENTION
                </h2>
              </div>
              <div className="p-4">
                {Object.entries(meta.sections).map(([sectionKey, items]) => {
                  const sectionDef = sections.find(s => s.key === sectionKey);
                  return Object.entries(items)
                    .filter(([, finding]) => finding.status === "urgent")
                    .map(([itemKey, finding]) => {
                      const itemDef = sectionDef?.items.find(i => i.key === itemKey);
                      return (
                        <div key={`${sectionKey}-${itemKey}`} className="mb-3 last:mb-0">
                          <p className="font-medium">{itemDef?.label || itemKey}</p>
                          <p className="text-sm text-gray-600">{sectionDef?.label}</p>
                          {finding.notes && (
                            <p className="text-sm mt-1 pl-3 border-l-2" style={{ borderColor: statusColors.urgent }}>
                              {finding.notes}
                            </p>
                          )}
                        </div>
                      );
                    });
                })}
              </div>
            </div>
          </div>
        )}

        {/* Needs Attention - if any */}
        {meta.summary.attention > 0 && (
          <div className="mb-6 avoid-break">
            <div className="border-2 rounded-lg overflow-hidden" style={{ borderColor: statusColors.attention }}>
              <div className="px-4 py-2" style={{ backgroundColor: "#fffbeb" }}>
                <h2 className="font-semibold" style={{ color: statusColors.attention }}>
                  ⚡ ITEMS NEEDING ATTENTION
                </h2>
              </div>
              <div className="p-4">
                {Object.entries(meta.sections).map(([sectionKey, items]) => {
                  const sectionDef = sections.find(s => s.key === sectionKey);
                  return Object.entries(items)
                    .filter(([, finding]) => finding.status === "attention")
                    .map(([itemKey, finding]) => {
                      const itemDef = sectionDef?.items.find(i => i.key === itemKey);
                      return (
                        <div key={`${sectionKey}-${itemKey}`} className="mb-3 last:mb-0">
                          <p className="font-medium">{itemDef?.label || itemKey}</p>
                          <p className="text-sm text-gray-600">{sectionDef?.label}</p>
                          {finding.notes && (
                            <p className="text-sm mt-1 pl-3 border-l-2" style={{ borderColor: statusColors.attention }}>
                              {finding.notes}
                            </p>
                          )}
                        </div>
                      );
                    });
                })}
              </div>
            </div>
          </div>
        )}

        {/* Detailed Findings by Section */}
        <div className="page-break" />
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-300 pb-2 mb-4">
          Detailed Inspection Results
        </h2>

        {sections.map((section) => {
          const sectionFindings = meta.sections[section.key] || {};
          if (Object.keys(sectionFindings).length === 0) return null;

          return (
            <div key={section.key} className="mb-6 avoid-break">
              <h3 className="font-semibold text-gray-700 bg-gray-100 px-3 py-2 rounded">
                {section.label}
              </h3>
              <table className="w-full mt-2 text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Item</th>
                    <th className="text-center py-2 font-medium text-gray-600 w-32">Status</th>
                    <th className="text-left py-2 font-medium text-gray-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {section.items.map((item) => {
                    const finding = sectionFindings[item.key];
                    if (!finding) return null;

                    return (
                      <tr key={item.key} className="border-b border-gray-100">
                        <td className="py-2">{item.label}</td>
                        <td className="py-2 text-center">
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: finding.status === "pass" ? "#dcfce7"
                                : finding.status === "attention" ? "#fef3c7"
                                : finding.status === "urgent" ? "#fee2e2"
                                : "#f3f4f6",
                              color: statusColors[finding.status],
                            }}
                          >
                            {statusLabels[finding.status]}
                          </span>
                        </td>
                        <td className="py-2 text-gray-600">{finding.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
          <p>This inspection report was generated by RegularUpkeep on {inspectionDate}.</p>
          <p className="mt-1">
            This report is for informational purposes only and does not constitute a professional home inspection.
            For insurance claims or real estate transactions, please consult a licensed inspector.
          </p>
          <p className="mt-2 font-medium">Document ID: {docId}</p>
        </div>
      </div>

      {/* Print Button - only visible on screen */}
      <div className="no-print fixed bottom-4 right-4 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          Print Report
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </>
  );
}
