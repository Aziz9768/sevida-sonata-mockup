import { usDate } from "./filters";

/** One table of text and numbers for a file: a heading row and the rows under it. */
export interface ExportSheet {
  /** Sheet tab name in Excel, and the heading above the table in a PDF. */
  name: string;
  head: string[];
  body: Array<Array<string | number | Date | null | undefined>>;
}

export type ExportFormat = "csv" | "xlsx" | "pdf";

export const exportFormatLabel: Record<ExportFormat, string> = {
  csv: "CSV (.csv)",
  xlsx: "Excel (.xlsx)",
  pdf: "PDF (.pdf)",
};

/** Plain text for one cell: dates as MM/DD/YYYY, empty as nothing. */
const text = (v: unknown): string =>
  v == null ? "" : v instanceof Date ? usDate(v) : String(v);

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const quote = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function downloadCsv(sheet: ExportSheet, fileName: string) {
  const lines = [
    sheet.head.map(quote).join(","),
    ...sheet.body.map((r) => r.map((c) => quote(text(c))).join(",")),
  ];
  // The leading mark lets Excel read accents correctly.
  saveBlob(
    new Blob(["﻿" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
    `${fileName}.csv`,
  );
}

/** A real Excel file: bold heading row, dates as dates (so they sort), numbers as numbers. One tab per sheet. */
export async function downloadXlsx(sheets: ExportSheet[], fileName: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const cell = (v: unknown) =>
    v instanceof Date
      ? {
          // Excel keeps a date with no time zone. Use the day as the person sees it, at midnight UTC, so it never shifts a day.
          value: new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate())),
          format: "mm/dd/yyyy",
        }
      : typeof v === "number"
        ? { value: v }
        : { value: text(v) };
  const data = sheets.map((s) => {
    const widths = s.head.map((h, i) =>
      Math.min(
        50,
        Math.max(
          h.length,
          ...s.body.slice(0, 200).map((r) => text(r[i]).length),
          8,
        ) + 2,
      ),
    );
    return {
      // Excel limits a tab name to 31 characters and a few symbols.
      sheet: s.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet",
      data: [
        s.head.map((h) => ({ value: h, fontWeight: "bold" as const })),
        ...s.body.map((r) => r.map(cell)),
      ],
      columns: widths.map((width) => ({ width })),
      stickyRowsCount: 1,
    };
  });
  // The library's own types are strict about each cell kind; the cells above are always valid.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeXlsxFile(data as any).toFile(`${fileName}.xlsx`);
}

/**
 * A PDF with a title, optional lines of text under it, then each sheet as a table with its name as a heading.
 * Wide tables get a smaller font and a bigger page so the columns stay readable.
 */
export async function downloadPdf(
  doc: {
    title: string;
    /** Short lines under the title, for example the date or the filters used. */
    lines?: string[];
    sheets: ExportSheet[];
  },
  fileName: string,
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const widest = Math.max(...doc.sheets.map((s) => s.head.length));
  const format = widest > 14 ? "a3" : "a4";
  const landscape = widest > 5;
  const pdf = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "pt",
    format,
  });
  const margin = 32;
  let y = margin;
  pdf.setFontSize(16);
  pdf.text(doc.title, margin, y + 8);
  y += 26;
  pdf.setFontSize(9);
  pdf.setTextColor(90);
  for (const line of doc.lines ?? []) {
    pdf.text(line, margin, y + 4);
    y += 13;
  }
  pdf.setTextColor(0);
  y += 6;
  const fontSize = widest > 18 ? 6 : widest > 10 ? 7 : 8.5;
  for (const s of doc.sheets) {
    if (doc.sheets.length > 1 || s.name) {
      pdf.setFontSize(11);
      pdf.text(s.name, margin, y + 6);
      y += 12;
    }
    autoTable(pdf, {
      startY: y,
      head: [s.head],
      body: s.body.map((r) => r.map(text)),
      margin: { left: margin, right: margin, bottom: 36 },
      styles: { fontSize, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [29, 29, 96], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 248] },
      didDrawPage: () => {
        const h = pdf.internal.pageSize.getHeight();
        pdf.setFontSize(8);
        pdf.setTextColor(120);
        pdf.text(`Page ${pdf.getNumberOfPages()}`, margin, h - 16);
        pdf.setTextColor(0);
      },
    });
    y =
      (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 18;
  }
  pdf.save(`${fileName}.pdf`);
}

/** Download the same sheets as CSV (first sheet only), Excel or PDF. */
export async function exportAs(
  format: ExportFormat,
  doc: { title: string; lines?: string[]; sheets: ExportSheet[] },
  fileName: string,
) {
  if (format === "csv") downloadCsv(doc.sheets[0], fileName);
  else if (format === "xlsx") await downloadXlsx(doc.sheets, fileName);
  else await downloadPdf(doc, fileName);
}
