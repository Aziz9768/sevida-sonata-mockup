import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface FormSectionProps {
  title?: string;
  description?: string;
  /** Columns on a wide screen. Always 2 on tablets at most and 1 on phones. Default 2. */
  columns?: 1 | 2 | 3 | 4;
  children: ReactNode;
}

/**
 * Lays form fields out in a responsive grid: up to `columns` per row on desktop, 2 on tablet, 1 on phone.
 * Wrap a field in <FormField span="full"> to make it use the whole row.
 */
export function FormSection({ title, description, columns = 2, children }: FormSectionProps) {
  return (
    <Box component="section" sx={{ mb: 2 }}>
      {title && (
        <Typography variant="h5" component="h3" sx={{ mb: description ? 0.25 : 1, color: 'primary.main' }}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {description}
        </Typography>
      )}
      <Box
        sx={{
          display: 'grid',
          columnGap: 2,
          rowGap: 1.5,
          alignItems: 'start',
          gridTemplateColumns: {
            xs: '1fr',
            sm: columns === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            md: `repeat(${columns}, minmax(0, 1fr))`,
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** One cell of a FormSection. Only needed to make a field span the full row. */
export function FormField({ span = 'one', children }: { span?: 'one' | 'full'; children: ReactNode }) {
  return <Box sx={{ minWidth: 0, gridColumn: span === 'full' ? '1 / -1' : undefined }}>{children}</Box>;
}
