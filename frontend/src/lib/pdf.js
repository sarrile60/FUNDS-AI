import jsPDF from "jspdf";

// Generate a clean professional PDF from text content
export function downloadReportPDF({ title, content, caseRef }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const usableW = pageW - margin * 2;

  // Header bar
  doc.setFillColor(8, 16, 38);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor(95, 227, 201);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AI-FUNDS", margin, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(159, 176, 204);
  doc.text("Fund tracing & professional dossier — Italia", margin, 52);
  if (caseRef) {
    doc.setTextColor(230, 237, 247);
    doc.text(`Caso: ${caseRef}`, pageW - margin, 36, { align: "right" });
  }

  // Title
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, margin, 100);

  doc.setDrawColor(220, 220, 230);
  doc.line(margin, 110, pageW - margin, 110);

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(40, 40, 50);
  const lines = doc.splitTextToSize(content, usableW);
  let y = 128;
  const lineH = 14;
  for (const line of lines) {
    if (y > pageH - 60) {
      addFooter(doc, margin, pageW, pageH);
      doc.addPage();
      y = 60;
    }
    doc.text(line, margin, y);
    y += lineH;
  }
  addFooter(doc, margin, pageW, pageH);

  const safe = title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60);
  doc.save(`AI-FUNDS_${safe}_${caseRef || "report"}.pdf`);
}

function addFooter(doc, margin, pageW, pageH) {
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text(
    "AI-FUNDS non è affiliato a CONSOB, Banca d'Italia, Polizia Postale, Poste Italiane o autorità pubbliche. " +
    "Le analisi sono preliminari. Il recupero non è garantito. AI-FUNDS non fornisce consulenza legale.",
    margin, pageH - 24, { maxWidth: pageW - margin * 2 }
  );
}
