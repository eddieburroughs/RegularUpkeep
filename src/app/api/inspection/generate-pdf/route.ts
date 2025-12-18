import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { INSPECTION_SECTIONS, INSPECTION_TYPE_LABELS, type InspectionMeta, type FindingStatus } from "@/types/inspection";

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
  attention: "ATTENTION",
  urgent: "URGENT",
  na: "N/A",
};

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("docId");

    if (!docId) {
      return NextResponse.json({ error: "Missing docId" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the inspection document
    const { data: doc, error } = await supabase
      .from("documents")
      .select("id, title, description, document_date, created_at, meta, properties(id, nickname, address_line1, city, state, postal_code)")
      .eq("id", docId)
      .eq("category", "inspection")
      .single() as { data: InspectionDocument | null; error: unknown };

    if (error || !doc || !doc.meta) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const meta = doc.meta as InspectionMeta;
    const sections = INSPECTION_SECTIONS[meta.type];
    const property = doc.properties;

    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 612; // Letter size
    const pageHeight = 792;
    const margin = 50;
    const lineHeight = 14;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawText = (text: string, x: number, yPos: number, options: { font?: typeof font; size?: number; color?: [number, number, number] } = {}) => {
      const { font: f = font, size = 10, color = [0, 0, 0] } = options;
      page.drawText(text, {
        x,
        y: yPos,
        size,
        font: f,
        color: rgb(color[0], color[1], color[2]),
      });
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
    };

    const checkNewPage = (neededHeight: number) => {
      if (y - neededHeight < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    // Header
    drawText("HOME INSPECTION REPORT", margin, y, { font: fontBold, size: 18 });
    y -= 20;
    drawText(INSPECTION_TYPE_LABELS[meta.type].label, margin, y, { size: 11, color: [0.4, 0.4, 0.4] });
    y -= 15;
    drawText("RegularUpkeep", pageWidth - margin - 80, y + 15, { size: 9, color: [0.5, 0.5, 0.5] });

    // Line separator
    y -= 10;
    drawLine(margin, y, pageWidth - margin, y);
    y -= 25;

    // Property Info
    drawText("PROPERTY", margin, y, { font: fontBold, size: 9, color: [0.4, 0.4, 0.4] });
    y -= lineHeight;
    drawText(property?.nickname || property?.address_line1 || "Unknown", margin, y, { font: fontBold, size: 11 });
    y -= lineHeight;
    if (property) {
      drawText(`${property.address_line1}, ${property.city}, ${property.state} ${property.postal_code}`, margin, y, { size: 9, color: [0.4, 0.4, 0.4] });
    }

    // Inspection Date
    const inspectionDate = new Date(meta.completedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    drawText("INSPECTION DATE", pageWidth / 2, y + lineHeight * 2, { font: fontBold, size: 9, color: [0.4, 0.4, 0.4] });
    drawText(inspectionDate, pageWidth / 2, y + lineHeight, { font: fontBold, size: 11 });

    y -= 35;

    // Summary Box
    const boxHeight = 70;
    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: pageWidth - margin * 2,
      height: boxHeight,
      color: rgb(0.96, 0.97, 0.98),
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    drawText("INSPECTION SUMMARY", margin + 15, y - 15, { font: fontBold, size: 9, color: [0.4, 0.4, 0.4] });

    const summaryY = y - 45;
    const colWidth = (pageWidth - margin * 2 - 30) / 4;

    // Pass
    drawText(meta.summary.pass.toString(), margin + 15, summaryY, { font: fontBold, size: 20, color: [0.09, 0.64, 0.26] });
    drawText("Pass", margin + 15, summaryY - 15, { size: 9, color: [0.4, 0.4, 0.4] });

    // Attention
    drawText(meta.summary.attention.toString(), margin + 15 + colWidth, summaryY, { font: fontBold, size: 20, color: [0.85, 0.47, 0.02] });
    drawText("Attention", margin + 15 + colWidth, summaryY - 15, { size: 9, color: [0.4, 0.4, 0.4] });

    // Urgent
    drawText(meta.summary.urgent.toString(), margin + 15 + colWidth * 2, summaryY, { font: fontBold, size: 20, color: [0.86, 0.15, 0.15] });
    drawText("Urgent", margin + 15 + colWidth * 2, summaryY - 15, { size: 9, color: [0.4, 0.4, 0.4] });

    // N/A
    drawText(meta.summary.na.toString(), margin + 15 + colWidth * 3, summaryY, { font: fontBold, size: 20, color: [0.42, 0.42, 0.42] });
    drawText("N/A", margin + 15 + colWidth * 3, summaryY - 15, { size: 9, color: [0.4, 0.4, 0.4] });

    y -= boxHeight + 30;

    // Urgent Issues
    if (meta.summary.urgent > 0) {
      checkNewPage(100);

      drawText("URGENT ISSUES", margin, y, { font: fontBold, size: 11, color: [0.86, 0.15, 0.15] });
      y -= 5;
      drawLine(margin, y, pageWidth - margin, y);
      y -= 15;

      Object.entries(meta.sections).forEach(([sectionKey, items]) => {
        const sectionDef = sections.find(s => s.key === sectionKey);
        Object.entries(items)
          .filter(([, finding]) => finding.status === "urgent")
          .forEach(([itemKey, finding]) => {
            checkNewPage(40);
            const itemDef = sectionDef?.items.find(i => i.key === itemKey);
            drawText(`• ${itemDef?.label || itemKey}`, margin + 10, y, { font: fontBold, size: 10 });
            y -= lineHeight;
            drawText(`  ${sectionDef?.label || sectionKey}`, margin + 10, y, { size: 9, color: [0.5, 0.5, 0.5] });
            y -= lineHeight;
            if (finding.notes) {
              const noteLines = wrapText(finding.notes, 80);
              noteLines.forEach(line => {
                drawText(`  ${line}`, margin + 10, y, { size: 9, color: [0.3, 0.3, 0.3] });
                y -= lineHeight;
              });
            }
            y -= 5;
          });
      });

      y -= 15;
    }

    // Attention Items
    if (meta.summary.attention > 0) {
      checkNewPage(100);

      drawText("ITEMS NEEDING ATTENTION", margin, y, { font: fontBold, size: 11, color: [0.85, 0.47, 0.02] });
      y -= 5;
      drawLine(margin, y, pageWidth - margin, y);
      y -= 15;

      Object.entries(meta.sections).forEach(([sectionKey, items]) => {
        const sectionDef = sections.find(s => s.key === sectionKey);
        Object.entries(items)
          .filter(([, finding]) => finding.status === "attention")
          .forEach(([itemKey, finding]) => {
            checkNewPage(40);
            const itemDef = sectionDef?.items.find(i => i.key === itemKey);
            drawText(`• ${itemDef?.label || itemKey}`, margin + 10, y, { font: fontBold, size: 10 });
            y -= lineHeight;
            drawText(`  ${sectionDef?.label || sectionKey}`, margin + 10, y, { size: 9, color: [0.5, 0.5, 0.5] });
            y -= lineHeight;
            if (finding.notes) {
              const noteLines = wrapText(finding.notes, 80);
              noteLines.forEach(line => {
                drawText(`  ${line}`, margin + 10, y, { size: 9, color: [0.3, 0.3, 0.3] });
                y -= lineHeight;
              });
            }
            y -= 5;
          });
      });

      y -= 15;
    }

    // Detailed Results
    checkNewPage(50);
    drawText("DETAILED INSPECTION RESULTS", margin, y, { font: fontBold, size: 11 });
    y -= 5;
    drawLine(margin, y, pageWidth - margin, y);
    y -= 20;

    sections.forEach(section => {
      const sectionFindings = meta.sections[section.key] || {};
      if (Object.keys(sectionFindings).length === 0) return;

      checkNewPage(60);

      // Section header
      page.drawRectangle({
        x: margin,
        y: y - 15,
        width: pageWidth - margin * 2,
        height: 20,
        color: rgb(0.94, 0.94, 0.94),
      });
      drawText(section.label, margin + 10, y - 10, { font: fontBold, size: 10 });
      y -= 30;

      section.items.forEach(item => {
        const finding = sectionFindings[item.key];
        if (!finding) return;

        checkNewPage(25);

        drawText(item.label, margin + 10, y, { size: 9 });

        // Status badge
        const statusColor: [number, number, number] = finding.status === "pass" ? [0.09, 0.64, 0.26]
          : finding.status === "attention" ? [0.85, 0.47, 0.02]
          : finding.status === "urgent" ? [0.86, 0.15, 0.15]
          : [0.42, 0.42, 0.42];

        drawText(statusLabels[finding.status], margin + 200, y, { font: fontBold, size: 8, color: statusColor });

        // Notes
        if (finding.notes) {
          const truncatedNote = finding.notes.length > 50 ? finding.notes.substring(0, 50) + "..." : finding.notes;
          drawText(truncatedNote, margin + 280, y, { size: 8, color: [0.5, 0.5, 0.5] });
        }

        y -= lineHeight + 5;
      });

      y -= 10;
    });

    // Footer
    checkNewPage(60);
    y = margin + 30;
    drawLine(margin, y, pageWidth - margin, y);
    y -= 15;
    drawText("This report was generated by RegularUpkeep. For informational purposes only.", margin, y, { size: 8, color: [0.5, 0.5, 0.5] });
    y -= 12;
    drawText(`Document ID: ${docId}`, margin, y, { size: 8, color: [0.5, 0.5, 0.5] });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Upload to storage
    const storagePath = `inspections/${docId}/exports/inspection.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Continue anyway - we'll return the PDF directly
    }

    // Update document meta with export info
    const updatedMeta = {
      ...meta,
      export: {
        pdf_storage_path: storagePath,
        pdf_generated_at: new Date().toISOString(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("documents") as any)
      .update({ meta: updatedMeta })
      .eq("id", docId);

    // Get signed URL for download
    const { data: urlData } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (urlData?.signedUrl) {
      return NextResponse.json({ downloadUrl: urlData.signedUrl });
    }

    // Fallback: return PDF directly
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="inspection-${docId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach(word => {
    if ((currentLine + " " + word).trim().length <= maxChars) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}
