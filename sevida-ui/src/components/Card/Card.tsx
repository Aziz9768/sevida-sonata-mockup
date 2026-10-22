import { Paper, Stack, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { ReactNode } from 'react';
import { titleCase } from '../../utils/titleCase';

export interface CardProps {
  /** Card heading. Leave out for a plain surface with no header. */
  title?: string;
  /** Short grey text next to the title. */
  hint?: string;
  /** Longer explanation shown when hovering the (i) icon next to the title. */
  tooltip?: string;
  /** Top-right slot: a Button, a StatusChip, a menu. Wraps below the title on phones. */
  action?: ReactNode;
  /** Pinned strip at the bottom, e.g. "Last updated ...". */
  footer?: ReactNode;
  /** Remove the inner padding (use when the content is a table that should touch the edges). */
  flush?: boolean;
  children: ReactNode;
}

/**
 * The standard content box. Use one Card per topic (Contact details, Address, Billing ...)
 * so a long page reads as clear groups instead of one endless form.
 */
export function Card({ title, hint, tooltip, action, footer, flush = false, children }: CardProps) {
  const hasHeader = title || action;
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', borderColor: 'divider' }}>
      <Stack sx={{ p: flush ? 0 : { xs: 1.75, sm: 2.75 } }}>
        {hasHeader && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: { xs: 1.5, sm: 2.25 }, flexWrap: 'wrap', rowGap: 1, ...(flush && { px: { xs: 1.75, sm: 2.75 }, pt: { xs: 1.75, sm: 2.75 } }) }}
          >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
              {title && (
                <Typography variant="h5" component="h2" sx={{ color: 'primary.main' }}>
                  {titleCase(title)}
                </Typography>
              )}
              {tooltip && (
                <Tooltip title={tooltip} arrow>
                  <InfoOutlinedIcon aria-label={tooltip} sx={{ fontSize: 16, color: 'ink.300' }} />
                </Tooltip>
              )}
              {hint && (
                <Typography component="span" sx={{ fontSize: '.75rem', color: 'ink.500' }}>
                  {hint}
                </Typography>
              )}
            </Stack>
            {action}
          </Stack>
        )}
        {children}
      </Stack>
      {footer && (
        <Stack sx={{ px: { xs: 1.75, sm: 2.75 }, py: 1.25, borderTop: 1, borderColor: 'divider', bgcolor: 'surfaceAlt', fontSize: '.75rem', color: 'ink.500' }}>
          {footer}
        </Stack>
      )}
    </Paper>
  );
}
