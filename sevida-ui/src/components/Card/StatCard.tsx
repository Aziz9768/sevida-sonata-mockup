import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { InfoTip } from "../Feedback/InfoTip";

export interface StatCardProps {
  /** The big number or text. */
  value: ReactNode;
  /** What the number is. */
  label: string;
  /** Small extra line under the label (e.g. "+4 this week"). */
  sub?: string;
  /** 'highlight' is a filled version for a total at the end of a row. */
  variant?: "default" | "highlight";
  /** Pass to make the card clickable like a filter tab. */
  onClick?: () => void;
  /** Marks a clickable card as the selected one. */
  active?: boolean;
  /** Plain-language explanation of the number. Shows an (i) next to the label. */
  tip?: string;
}

/** One at-a-glance number. Put several in a row for a summary strip. */
export function StatCard({
  value,
  label,
  sub,
  variant = "default",
  onClick,
  active = false,
  tip,
}: StatCardProps) {
  const highlight = variant === "highlight";
  const clickable = !!onClick;
  return (
    <Box
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={clickable ? active : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      sx={{
        flex: "1 1 128px",
        minWidth: 108,
        border: 1,
        borderColor: highlight
          ? "primary.main"
          : active
            ? "primary.main"
            : "divider",
        borderRadius: 1.5,
        bgcolor: highlight
          ? "primary.main"
          : active
            ? "tint.primary"
            : "surfaceAlt",
        px: 1.5,
        py: 1.25,
        cursor: clickable ? "pointer" : "default",
        transition: "background-color 120ms ease, border-color 120ms ease",
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "secondary.main",
          outlineOffset: 2,
        },
        ...(clickable &&
          !highlight && { "&:hover": { bgcolor: "tint.primary" } }),
      }}
    >
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: "1.5rem",
          lineHeight: 1.1,
          fontVariantNumeric: "tabular-nums",
          color: highlight ? "onPrimary.text" : "primary.main",
        }}
      >
        {value}
      </Typography>
      <Typography
        component="div"
        sx={{
          fontSize: ".75rem",
          fontWeight: 600,
          mt: 0.4,
          color: highlight ? "onPrimary.textMuted" : "ink.500",
          display: "flex",
          alignItems: "center",
          gap: 0.25,
        }}
      >
        {label}
        {tip && (
          <InfoTip label={`About ${label}`} onDark={highlight} size={14}>
            {tip}
          </InfoTip>
        )}
      </Typography>
      {sub && (
        <Typography
          sx={{
            fontSize: ".75rem",
            mt: 0.15,
            color: highlight ? "onPrimary.textSubtle" : "ink.300",
          }}
        >
          {sub}
        </Typography>
      )}
    </Box>
  );
}
