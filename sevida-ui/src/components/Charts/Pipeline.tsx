import { Box, ButtonBase, Typography, useTheme } from '@mui/material';
import { toneColor } from './tones';
import type { ChartTone } from './tones';

export interface PipelineStep {
  /** Short step name, e.g. "Files received". */
  label: string;
  /** The big number or short value. */
  value: string;
  /** One line under the value. */
  caption: string;
  tone?: ChartTone;
  /** Makes the whole step a button. */
  onClick?: () => void;
}

export interface PipelineProps {
  steps: PipelineStep[];
  /** Read out by screen readers. */
  label: string;
}

/**
 * A left-to-right journey: each step has a number badge, a value and a caption, joined by arrows.
 * Use it to show how something moves through the product (files in, checked, calculated, acted on).
 * Steps stack on a phone.
 */
export function Pipeline({ steps, label }: PipelineProps) {
  const theme = useTheme();
  return (
    <Box
      component="ol"
      aria-label={label}
      sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: { xs: 1, md: 0 }, gridTemplateColumns: { xs: '1fr', md: `repeat(${steps.length}, 1fr)` } }}
    >
      {steps.map((s, i) => {
        const color = toneColor(theme, s.tone ?? 'primary');
        const body = (
          <Box sx={{ textAlign: 'left', width: '100%', p: 1.75, pr: { md: 3.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
              <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: color, color: 'common.white', display: 'grid', placeItems: 'center', fontSize: '.75rem', fontWeight: 700, flex: 'none' }}>{i + 1}</Box>
              <Typography sx={{ fontSize: '.8125rem', fontWeight: 600, color: 'ink.700' }}>{s.label}</Typography>
            </Box>
            <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.15 }}>{s.value}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>{s.caption}</Typography>
          </Box>
        );
        return (
          <Box
            key={s.label}
            component="li"
            sx={{
              position: 'relative',
              bgcolor: 'surfaceAlt',
              borderRadius: { xs: 1.5, md: 0 },
              borderTopLeftRadius: { md: i === 0 ? 8 : 0 },
              borderBottomLeftRadius: { md: i === 0 ? 8 : 0 },
              borderTopRightRadius: { md: i === steps.length - 1 ? 8 : 0 },
              borderBottomRightRadius: { md: i === steps.length - 1 ? 8 : 0 },
              borderRight: { md: i === steps.length - 1 ? 0 : 2 },
              borderColor: 'background.paper',
              borderTop: 3,
              borderTopStyle: 'solid',
              borderTopColor: color,
              // little arrow notch between steps
              '&::after': {
                display: { xs: 'none', md: i === steps.length - 1 ? 'none' : 'block' },
                content: '""',
                position: 'absolute',
                top: '50%',
                right: -9,
                width: 16,
                height: 16,
                bgcolor: 'surfaceAlt',
                borderTop: 2,
                borderRight: 2,
                borderColor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 1,
              },
            }}
          >
            {s.onClick ? (
              <ButtonBase onClick={s.onClick} sx={{ display: 'block', width: '100%', borderRadius: 'inherit', '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'secondary.main', outlineOffset: -2 } }}>
                {body}
              </ButtonBase>
            ) : (
              body
            )}
          </Box>
        );
      })}
    </Box>
  );
}
