import type { Theme } from '@mui/material/styles';

export type ChartTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/** The colour for a tone, taken from the theme so a client's branding carries through. */
export function toneColor(theme: Theme, tone: ChartTone): string {
  switch (tone) {
    case 'primary': return theme.palette.primary.main;
    case 'success': return theme.palette.success.main;
    case 'warning': return theme.palette.warning.main;
    case 'danger': return theme.palette.error.main;
    default: return theme.palette.ink[300];
  }
}
