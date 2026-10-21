import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { InfoTip } from "sevida-ui";

/**
 * One label and value in a page header (member header, care gap summary). The label is small capitals;
 * the value is 13 / 500, smaller than the record name (16 / 600) and the body text (14).
 */
export function Field({
  label,
  help,
  children,
}: {
  label: string;
  /** Adds an (i) next to the label. */
  help?: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        component="div"
        sx={{
          fontSize: ".6875rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: ".05em",
          color: "text.secondary",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        {label}
        {help && (
          <InfoTip label={`What ${label.toLowerCase()} means`}>{help}</InfoTip>
        )}
      </Typography>
      <Typography
        component="div"
        sx={{ fontSize: ".8125rem", fontWeight: 500, lineHeight: 1.5 }}
      >
        {children}
      </Typography>
    </Box>
  );
}
