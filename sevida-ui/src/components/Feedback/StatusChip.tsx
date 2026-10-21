import type { ReactNode } from 'react';
import { Chip, Tooltip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

export interface StatusChipProps extends Omit<ChipProps, 'color' | 'variant'> {
  label: string;
  /** Meaning of the status: success = done/active, warning = needs attention, danger = failed/overdue, info = FYI, neutral = inactive. */
  tone?: StatusTone;
  /** Plain-words explanation shown on hover, keyboard focus and tap. Use it when the label is a short form. */
  tip?: ReactNode;
}

/** A small coloured label for a record's status (Active, Overdue, In progress ...). */
export function StatusChip({ tone = 'neutral', tip, sx, ...rest }: StatusChipProps) {
  const { palette: p } = useTheme();
  // Same look as the Leap Metrics app: a filled label with dark text.
  const dark = 'rgba(0,0,0,0.87)';
  const colors: Record<StatusTone, { bg: string; fg: string }> = {
    success: { bg: p.tint.chip.success, fg: dark },
    warning: { bg: p.tint.chip.warning, fg: dark },
    danger: { bg: p.tint.chip.danger, fg: dark },
    info: { bg: p.tint.chip.info, fg: dark },
    primary: { bg: p.tint.primary, fg: p.primary.main },
    neutral: { bg: p.ink[100], fg: dark },
  };
  const c = colors[tone];
  const chip = (
    <Chip
      size="small"
      {...rest}
      tabIndex={tip ? 0 : rest.tabIndex}
      sx={{ bgcolor: c.bg, color: c.fg, fontSize: '.8125rem', cursor: tip ? 'help' : undefined, ...sx }}
    />
  );
  if (!tip) return chip;
  return (
    <Tooltip
      title={tip}
      arrow
      describeChild
      enterTouchDelay={0}
      leaveTouchDelay={6000}
      slotProps={{ tooltip: { sx: { maxWidth: 280, fontSize: '.8125rem', lineHeight: 1.45, p: 1.25 } } }}
    >
      {chip}
    </Tooltip>
  );
}
