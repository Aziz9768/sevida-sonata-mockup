import { Box, Stack, Typography } from '@mui/material';
import type { ChartTone } from './tones';

export interface StackedBarSegment { label: string; value: number; tone: ChartTone }

export interface StackedBarProps {
  segments: StackedBarSegment[];
  /** Read out by screen readers. */
  label: string;
  /** Show the small legend with counts under the bar. Default true. */
  legend?: boolean;
  height?: number;
}

const colorOf = (tone: ChartTone) => (tone === 'primary' ? 'primary.main' : tone === 'danger' ? 'error.main' : tone === 'neutral' ? 'ink.300' : `${tone}.main`);

/** One bar split into parts (met / gap / left out). Shows how a group divides, not a trend. */
export function StackedBar({ segments, label, legend = true, height = 10 }: StackedBarProps) {
  const total = segments.reduce((n, s) => n + s.value, 0) || 1;
  return (
    <Box>
      <Box role="img" aria-label={`${label}: ${segments.map((s) => `${s.value} ${s.label}`).join(', ')}`} sx={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', bgcolor: 'surfaceAlt', gap: '2px' }}>
        {segments.filter((s) => s.value > 0).map((s) => (
          <Box key={s.label} sx={{ width: `${(s.value / total) * 100}%`, bgcolor: colorOf(s.tone) }} />
        ))}
      </Box>
      {legend && (
        <Stack direction="row" spacing={1.75} sx={{ mt: 0.75, flexWrap: 'wrap', rowGap: 0.25 }}>
          {segments.map((s) => (
            <Stack key={s.label} direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colorOf(s.tone) }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.value} {s.label}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}
