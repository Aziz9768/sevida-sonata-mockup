import { Box, Stack, Typography } from '@mui/material';

export interface RateBarProps {
  /** The rate, 0 to 100. */
  value: number;
  /** Optional goal (0 to 100) drawn as a thin tick on the bar. */
  target?: number;
  /** Colour of the filled part. Default 'primary'. */
  tone?: 'primary' | 'success' | 'warning' | 'danger';
  /** Text read out by screen readers, e.g. "Breast cancer screening rate". */
  label: string;
  /** Show the number to the right of the bar. Default true. */
  showValue?: boolean;
  /** Decimals in the shown number. Default 0. */
  decimals?: number;
}

/**
 * A slim horizontal bar for a percentage: "how far along" or "what share met the goal".
 * Use it in tables and cards instead of drawing a chart.
 */
export function RateBar({ value, target, tone = 'primary', label, showValue = true, decimals = 0 }: RateBarProps) {
  const v = Math.max(0, Math.min(100, value));
  const color = tone === 'primary' ? 'primary.main' : tone === 'danger' ? 'error.main' : `${tone}.main`;
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 120 }}>
      <Box
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v)}
        sx={{ position: 'relative', flex: 1, height: 8, borderRadius: 4, bgcolor: 'surfaceAlt', overflow: 'visible' }}
      >
        <Box sx={{ width: `${v}%`, height: '100%', borderRadius: 4, bgcolor: color }} />
        {target !== undefined && (
          <Box
            aria-hidden
            title={`Goal ${target}%`}
            sx={{ position: 'absolute', top: -3, bottom: -3, left: `${Math.max(0, Math.min(100, target))}%`, width: 2, bgcolor: 'ink.700', borderRadius: 1 }}
          />
        )}
      </Box>
      {showValue && (
        <Typography component="span" sx={{ fontSize: '.875rem', fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
          {v.toFixed(decimals)}%
        </Typography>
      )}
    </Stack>
  );
}
