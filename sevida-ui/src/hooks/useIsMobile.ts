import { useMediaQuery, useTheme } from '@mui/material';

/**
 * True below 600px (the "phone" cut-off). Use it only when a component needs a different
 * STRUCTURE on a phone (table -> card list, sidebar -> drawer). For plain spacing or column
 * changes, use a responsive `sx` value instead, which is pure CSS.
 */
export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}
