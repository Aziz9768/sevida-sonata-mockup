import { Box, Typography } from '@mui/material';
import type { ChartTone } from './tones';

export interface FunnelStep {
  label: string;
  value: number;
  /** Small grey line under the label, e.g. the rule that took people out. */
  note?: string;
  tone?: ChartTone;
  /** What to call the people who dropped out at this step. Default "left out". */
  outLabel?: string;
}

export interface FunnelProps {
  steps: FunnelStep[];
  /** Read out by screen readers. */
  label: string;
}

const colorOf = (tone: ChartTone | undefined) => (!tone || tone === 'primary' ? 'primary.main' : tone === 'danger' ? 'error.main' : tone === 'neutral' ? 'ink.300' : `${tone}.main`);

/**
 * "Who is counted": a stack of bars that get shorter as rules take people out.
 * Each bar is sized against the first one. The note under a label explains the rule that applied.
 */
export function Funnel({ steps, label }: FunnelProps) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <Box role="list" aria-label={label} sx={{ display: 'grid', gap: 1.5 }}>
      {steps.map((s, i) => {
        const prev = i === 0 ? null : steps[i - 1].value;
        const out = prev === null ? 0 : prev - s.value;
        return (
          <Box key={s.label} role="listitem">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
              <Typography sx={{ fontSize: '.875rem', fontWeight: 600 }}>{s.label}</Typography>
              <Typography sx={{ fontSize: '.875rem', fontWeight: 700 }}>{s.value.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ height: 14, borderRadius: 1, bgcolor: 'surfaceAlt', overflow: 'hidden' }}>
              <Box sx={{ width: `${(s.value / top) * 100}%`, height: '100%', bgcolor: colorOf(s.tone ?? (i === steps.length - 1 ? 'success' : 'primary')), minWidth: s.value > 0 ? 3 : 0 }} />
            </Box>
            {(s.note || out > 0) && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                {out > 0 ? `${out.toLocaleString()} ${s.outLabel ?? 'left out'}. ` : ''}
                {s.note}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
