import { useState } from "react";
import { Divider, Menu, MenuItem, Tooltip } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { IconButton, exportAs, exportFormatLabel } from "sevida-ui";
import type { ExportFormat, ExportSheet } from "sevida-ui";

/**
 * Printing the page as a PDF: the menu, header and filter drawer are left out and the page grows to its full length,
 * so the charts and tables all print (FR-709).
 */
const PRINT_CSS = `
@media print {
  nav, header, [data-no-print] { display: none !important; }
  html, body, #root, #root * { overflow: visible !important; max-height: none !important; }
  body { background: #fff !important; }
  main { height: auto !important; margin: 0 !important; }
  .MuiPaper-root, .MuiCard-root { break-inside: avoid; }
  @page { size: A4 landscape; margin: 10mm; }
}`;

/** The Export icon on a dashboard: pick Excel, PDF or CSV (the file holds what is on screen, with the filters that were applied), or the whole page as a PDF with its charts (one chart can also be saved as a picture from its own icon). */
export function ExportMenu({
  build,
  fileName,
}: {
  build: () => { title: string; lines?: string[]; sheets: ExportSheet[] };
  fileName: string;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (format: ExportFormat) => {
    setAnchor(null);
    setBusy(true);
    try {
      await exportAs(format, build(), fileName);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Tooltip title={busy ? "Exporting…" : "Export dashboard"}>
        <span>
          <IconButton
            aria-label={busy ? "Exporting…" : "Export dashboard"}
            aria-haspopup="menu"
            disabled={busy}
            onClick={(e) => setAnchor(e.currentTarget)}
            variant="boxed"
          >
            <FileDownloadOutlinedIcon />
          </IconButton>
        </span>
      </Tooltip>
      <style>{PRINT_CSS}</style>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {(["xlsx", "pdf", "csv"] as ExportFormat[]).map((f) => (
          <MenuItem key={f} onClick={() => void run(f)}>
            {exportFormatLabel[f]}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            // Let the menu close before the print window opens.
            window.setTimeout(() => window.print(), 150);
          }}
        >
          Whole page as PDF, with charts
        </MenuItem>
      </Menu>
    </>
  );
}
