import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import type { BreadcrumbsProps } from './Breadcrumbs';
import { titleCase } from '../../utils/titleCase';

export interface PageContainerProps {
  /** Trail above the title. Leave out on a top-level page (it would only repeat the title). */
  breadcrumbs?: BreadcrumbsProps['crumbs'];
  renderLink?: BreadcrumbsProps['renderLink'];
  /** Small content at the far right of the breadcrumb line (for example "Data last updated"). */
  breadcrumbsEnd?: ReactNode;
  /** Page title. Leave out when the page's own content already shows the heading (e.g. a record header card). */
  title?: string;
  /** 'list' (default) is the normal page title. 'overview' is the bigger, bolder title for a dashboard only. */
  titleVariant?: 'list' | 'overview';
  /** Top-right buttons. They go below the title on phones. */
  actions?: ReactNode;
  /** Extra line under the title. */
  subtitle?: string;
  children: ReactNode;
}

/**
 * The frame every page uses: breadcrumb, title, action buttons, then the page's content.
 * It scrolls on its own so a sticky bottom bar and a fixed sidebar keep working.
 */
export function PageContainer({ breadcrumbs, renderLink, breadcrumbsEnd, title, titleVariant = 'list', actions, subtitle, children }: PageContainerProps) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'auto', bgcolor: 'background.default', px: { xs: 1.5, sm: 2.75 }, py: { xs: 1.5, sm: 2 } }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', columnGap: 2, rowGap: 0.5, flexWrap: 'wrap' }}>
          <Breadcrumbs crumbs={breadcrumbs} renderLink={renderLink} />
          {breadcrumbsEnd}
        </Box>
      )}
      {(title || actions) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'flex-start' }}
          justifyContent="space-between"
          spacing={{ xs: 1.25, sm: 2 }}
          sx={{ mb: 1.75 }}
        >
          <Box sx={{ minWidth: 0, flex: { sm: '1 1 0' } }}>
            {title && (
              <Typography variant={titleVariant === 'overview' ? 'h3' : 'h4'} component="h1" sx={{ overflowWrap: 'anywhere' }}>
                {titleCase(title)}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, flex: { sm: '0 0 auto' }, maxWidth: '100%', '& .MuiButton-root': { flex: { xs: '1 1 auto', sm: '0 0 auto' } } }}>
              {actions}
            </Stack>
          )}
        </Stack>
      )}
      {children}
    </Box>
  );
}
