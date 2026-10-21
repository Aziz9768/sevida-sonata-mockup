import { Box, Typography, useTheme } from '@mui/material';
import type { ReactNode } from 'react';
import { toneColor } from './tones';
import type { ChartTone } from './tones';

export interface RingGaugeProps {
  /** The rate, 0 to 100. */
  value: number;
  /** Goal (0 to 100), drawn as a small tick on the ring. */
  target?: number;
  tone?: ChartTone;
  /** Outer size in px. Default 112. */
  size?: number;
  /** Read out by screen readers, e.g. "Well-care visits rate". */
  label: string;
  /** What to show in the middle. Default: the rate with a % sign. */
  children?: ReactNode;
}

/** A ring that fills to a percentage, with an optional goal tick. Use it for "how far are we" on one number. */
export function RingGauge({ value, target, tone = 'primary', size = 112, label, children }: RingGaugeProps) {
  const theme = useTheme();
  const v = Math.max(0, Math.min(100, value));
  const stroke = Math.max(8, Math.round(size / 11));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const angle = target === undefined ? 0 : (Math.max(0, Math.min(100, target)) / 100) * 2 * Math.PI - Math.PI / 2;
  const tick = (len: number) => ({ x: c + len * Math.cos(angle), y: c + len * Math.sin(angle) });
  const a = tick(r - stroke / 2 - 2);
  const b = tick(r + stroke / 2 + 2);
  return (
    <Box
      role="img"
      aria-label={`${label}: ${Math.round(v)}%${target !== undefined ? `, goal ${target}%` : ''}`}
      sx={{ position: 'relative', width: size, height: size, flex: 'none' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={c} cy={c} r={r} fill="none" stroke={theme.palette.surfaceAlt} strokeWidth={stroke} />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={toneColor(theme, tone)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * circ} ${circ}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
        {target !== undefined && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={theme.palette.ink[700]} strokeWidth={2.5} strokeLinecap="round" />}
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        {children ?? <Typography sx={{ fontSize: size / 4.2, fontWeight: 700, lineHeight: 1 }}>{Math.round(v)}%</Typography>}
      </Box>
    </Box>
  );
}
