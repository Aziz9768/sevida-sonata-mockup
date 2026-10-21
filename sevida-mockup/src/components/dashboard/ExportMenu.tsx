import { useState } from "react";
import { Menu, MenuItem, Tooltip } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { IconButton, exportAs, exportFormatLabel } from "sevida-ui";
import type { ExportFormat, ExportSheet } from "sevida-ui";

/** The Export icon on a dashboard: pick Excel, PDF or CSV. The file holds what is on screen, with the filters that were applied. */
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
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              color: "primary.main",
            }}
          >
            <FileDownloadOutlinedIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {(["xlsx", "pdf", "csv"] as ExportFormat[]).map((f) => (
          <MenuItem key={f} onClick={() => void run(f)}>
            {exportFormatLabel[f]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
