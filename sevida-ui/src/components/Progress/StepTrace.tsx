import { Box, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { ReactNode } from 'react';

export type StepTone = 'success' | 'warning' | 'danger' | 'neutral' | 'muted';

export interface TraceItem {
  /** What was checked, e.g. "Enrolled all year". */
  label: string;
  /** What was found, in a sentence. */
  detail: string;
  /** Short word shown beside the label, e.g. "Passed", "Excluded". Colour is never the only signal. */
  statusLabel: string;
  tone: StepTone;
  /** Where the answer came from, e.g. the file names. */
  source?: ReactNode;
}

export interface StepTraceProps {
  steps: TraceItem[];
  /** Read out by screen readers, e.g. "How BCS-E was decided for Mei Tanaka". */
  label: string;
}

const icons = {
  success: <CheckCircleOutlineIcon fontSize="small" color="success" aria-hidden />,
  warning: <ReportProblemOutlinedIcon fontSize="small" color="warning" aria-hidden />,
  danger: <ErrorOutlineIcon fontSize="small" color="error" aria-hidden />,
  neutral: <RemoveCircleOutlineIcon fontSize="small" sx={{ color: 'ink.500' }} aria-hidden />,
  muted: <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'ink.300' }} aria-hidden />,
} as const;

/**
 * "How was this decided": the checks in the order they were made, each with what was found and which data it came from.
 * Later checks that were never reached stay greyed out, so the reader sees where the decision stopped.
 */
export function StepTrace({ steps, label }: StepTraceProps) {
  return (
    <Box component="ol" aria-label={label} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {steps.map((s, i) => (
        <Box key={s.label + i} component="li" sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', columnGap: 1.25, pb: i === steps.length - 1 ? 0 : 1.75, position: 'relative' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {icons[s.tone]}
            {i < steps.length - 1 && <Box aria-hidden sx={{ flex: 1, width: 2, bgcolor: 'divider', mt: 0.5 }} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '.875rem', fontWeight: 700 }}>{s.label}</Typography>
              <Typography variant="caption" sx={{ color: 'ink.700', fontWeight: 600 }}>{s.statusLabel}</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: s.tone === 'muted' ? 'text.secondary' : 'text.primary' }}>{s.detail}</Typography>
            {s.source && (
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                Source: {s.source}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
