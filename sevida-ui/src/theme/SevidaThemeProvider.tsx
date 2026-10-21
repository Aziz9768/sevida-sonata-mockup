import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { createSevidaTheme } from './createSevidaTheme';
import type { SevidaBrand } from './createSevidaTheme';

export interface SevidaThemeProviderProps {
  /** Client / app branding. Leave out for the standard Sevida look. */
  brand?: SevidaBrand;
  /** Set false to skip the page-level resets (use when the host app already has them). Default true. */
  baseline?: boolean;
  children: ReactNode;
}

/**
 * Wrap an app (or just one screen of an existing app) in this once. Every component in the
 * library reads its colours, fonts and sizes from the theme this provides.
 */
export function SevidaThemeProvider({ brand, baseline = true, children }: SevidaThemeProviderProps) {
  const theme = useMemo(() => createSevidaTheme(brand), [brand?.primary, brand?.primaryDark, brand?.secondary, brand?.fontFamily, brand?.tableFontFamily]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ThemeProvider theme={theme}>
      {baseline && <CssBaseline />}
      {children}
    </ThemeProvider>
  );
}
