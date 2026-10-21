import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Make this item use the whole row (long text, addresses). */
  full?: boolean;
}

export interface DetailGridProps {
  items: DetailItem[];
  /** Columns on a wide screen. It drops to 2 on tablets and 1 on phones by itself. Default 3. */
  columns?: 1 | 2 | 3 | 4;
}

/**
 * Read-only fields shown as label + value, laid out in a responsive grid.
 * Use it inside a Card to show one record's details (the "view" side of a form).
 * Empty values show an en dash so the grid never has holes.
 */
export function DetailGrid({ items, columns = 3 }: DetailGridProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: { xs: 1.75, sm: 2.25 },
        gridTemplateColumns: {
          xs: '1fr',
          sm: columns === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
          md: `repeat(${columns}, minmax(0, 1fr))`,
        },
      }}
    >
      {items.map((item, i) => (
        <Box key={`${item.label}-${i}`} sx={{ minWidth: 0, gridColumn: item.full ? '1 / -1' : undefined }}>
          <Typography sx={{ fontSize: '.75rem', fontWeight: 600, color: 'ink.500', textTransform: 'uppercase', letterSpacing: '.04em', lineHeight: 1.75 }}>
            {item.label}
          </Typography>
          <Typography component="div" sx={{ fontSize: '.875rem', fontWeight: 500, lineHeight: 1.5, color: 'text.primary', overflowWrap: 'anywhere' }}>
            {item.value === undefined || item.value === null || item.value === '' ? '–' : item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
