import { useState } from "react";
import type { RefObject } from "react";
import { Tooltip, useTheme } from "@mui/material";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { IconButton } from "sevida-ui";

/** Draws the chart's SVG, with a title above it, on a white canvas and saves it as a PNG. */
async function savePng(
  box: HTMLElement,
  title: string,
  fileName: string,
  ink: string,
  paper: string,
  font: string,
) {
  const svg = box.querySelector("svg");
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const w = Math.ceil(rect.width);
  const h = Math.ceil(rect.height);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error("Could not draw the chart."));
      img.src = url;
    });
    const scale = 2;
    const head = 44;
    const canvas = document.createElement("canvas");
    canvas.width = (w + 32) * scale;
    canvas.height = (h + head + 16) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w + 32, h + head + 16);
    ctx.fillStyle = ink;
    ctx.font = `700 16px ${font}`;
    ctx.fillText(title, 16, 28);
    ctx.drawImage(img, 16, head, w, h);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${fileName}.png`;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A small icon in a chart card's header: downloads that one chart as a picture (FR-709.2). */
export function ChartImageButton({
  target,
  title,
  fileName,
}: {
  /** The box that holds the chart. */
  target: RefObject<HTMLElement | null>;
  title: string;
  fileName: string;
}) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const label = `Download "${title}" as an image`;
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          disabled={busy}
          variant="boxed"
          onClick={async () => {
            if (!target.current) return;
            setBusy(true);
            try {
              await savePng(
                target.current,
                title,
                fileName,
                theme.palette.ink[900],
                theme.palette.background.paper,
                theme.typography.fontFamily ?? "sans-serif",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <ImageOutlinedIcon />
        </IconButton>
      </span>
    </Tooltip>
  );
}
