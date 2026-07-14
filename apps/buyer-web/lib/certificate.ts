import { jsPDF } from "jspdf";
import type { ApiRetirement } from "./api";

// Renders the retirement certificate as a real PDF and triggers the download.
// Everything printed comes from the stored record — the same cert id and tx
// hash that live in the database and (when anchored) on-chain.
export function downloadCertificatePdf(rec: ApiRetirement) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;
  const cx = W / 2;

  const ink = "#1c2420";
  const soft = "#5c6b63";
  const brand = "#1e7a4f";

  // canvas + double border
  doc.setFillColor("#f7faf8");
  doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(brand);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.3);
  doc.rect(13, 13, W - 26, H - 26);

  doc.setTextColor(brand);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PRIVE EXCHANGE", cx, 30, { align: "center", charSpace: 1.5 });

  doc.setTextColor(ink);
  doc.setFontSize(26);
  doc.text("Certificate of Carbon Retirement", cx, 45, { align: "center" });

  doc.setDrawColor(brand);
  doc.setLineWidth(0.5);
  doc.line(cx - 40, 51, cx + 40, 51);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(soft);
  doc.text("This certifies that", cx, 64, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(ink);
  doc.text(rec.beneficiary, cx, 74, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(soft);
  doc.text("has permanently retired", cx, 84, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(brand);
  doc.text(`${rec.qty.toLocaleString("en-US", { maximumFractionDigits: 2 })} tCO2e`, cx, 99, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(ink);
  doc.text(`${rec.name} (${rec.symbol})`, cx, 109, { align: "center" });

  const anchored = !!rec.txHash;
  doc.setFontSize(9.5);
  doc.setTextColor(soft);
  doc.text(
    anchored
      ? "The underlying credits were burned on-chain and this certificate is bound to a soulbound NFT."
      : "Recorded on the Prive ledger; on-chain anchoring pending.",
    cx,
    120,
    { align: "center" },
  );

  // record block
  const rows: [string, string][] = [
    ["Certificate ID", rec.certId],
    ["Retired on", new Date(rec.time).toUTCString()],
    ["Status", rec.status],
  ];
  if (anchored) rows.push(["Transaction hash", rec.txHash]);

  let y = 138;
  doc.setFontSize(10);
  for (const [k, v] of rows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(soft);
    doc.text(k, cx - 70, y);
    doc.setFont("courier", "normal");
    doc.setTextColor(ink);
    doc.text(v, cx - 22, y);
    y += 8;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(soft);
  doc.text(
    "Retirement is permanent and irreversible. Verify this record in the Prive Transparency Explorer.",
    cx,
    H - 22,
    { align: "center" },
  );

  doc.save(`${rec.certId}.pdf`);
}
