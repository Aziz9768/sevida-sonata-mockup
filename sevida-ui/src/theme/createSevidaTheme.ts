import { alpha, createTheme, lighten } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { brandDefaults, breakpoints, ink, onPrimary, radius, spacingUnit, status, surface } from './tokens';

/** What a client / app is allowed to change. Everything else stays the same everywhere. */
export interface SevidaBrand {
  /** Main structure colour (sidebar, dialog headers, table headers, primary buttons). */
  primary?: string;
  /** Darker shade of primary (sidebar, main list headers). Worked out from `primary` when left out. */
  primaryDark?: string;
  /** Action / link colour. */
  secondary?: string;
  /** CSS font-family string. */
  fontFamily?: string;
  /** Font for table headers and cells. Default Roboto, as in the Leap Metrics app. Pass the same value as `fontFamily` for one font everywhere. */
  tableFontFamily?: string;
}

interface Tint {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  /** Light-blue band (record header, section strips). */
  band: string;
  /** Filled status-label colours (black text on them). */
  chip: { success: string; warning: string; danger: string; info: string };
}

declare module '@mui/material/styles' {
  interface Palette {
    /** Very light backgrounds matching each colour. */
    tint: Tint;
    /** Slightly off-white used for field backgrounds and striped areas. */
    surfaceAlt: string;
    /** Colours for content sitting on a primary-coloured surface. */
    onPrimary: typeof onPrimary;
    ink: typeof ink;
  }
  interface PaletteOptions {
    tint?: Tint;
    surfaceAlt?: string;
    onPrimary?: typeof onPrimary;
    ink?: typeof ink;
  }
}

export function createSevidaTheme(brand: SevidaBrand = {}): Theme {
  const primary = brand.primary ?? brandDefaults.primary;
  const secondary = brand.secondary ?? brandDefaults.secondary;
  const fontFamily = brand.fontFamily ?? brandDefaults.fontFamily;
  const tableFontFamily = brand.tableFontFamily ?? brandDefaults.tableFontFamily;

  const base = createTheme({
    breakpoints: { values: { ...breakpoints } },
    spacing: spacingUnit,
    shape: { borderRadius: radius.md },
    palette: {
      primary: { main: primary, ...(brand.primaryDark ? { dark: brand.primaryDark } : brand.primary ? {} : { dark: brandDefaults.primaryDark }) },
      secondary: { main: secondary },
      success: { main: status.success.main, dark: status.success.dark, light: status.success.tint },
      warning: { main: status.warning.main, dark: status.warning.dark, light: status.warning.tint },
      error: { main: status.danger.main, dark: status.danger.dark, light: status.danger.tint },
      info: { main: status.info.main, dark: status.info.dark, light: status.info.tint },
      background: { default: surface.page, paper: surface.card },
      text: { primary: ink[900], secondary: ink[500], disabled: ink[300] },
      divider: surface.border,
      surfaceAlt: surface.alt,
      onPrimary,
      ink,
      tint: {
        primary: lighten(primary, 0.9),
        secondary: lighten(secondary, 0.9),
        success: status.success.tint,
        warning: status.warning.tint,
        danger: status.danger.tint,
        info: status.info.tint,
        band: surface.band,
        chip: { success: status.success.chip, warning: status.warning.chip, danger: status.danger.chip, info: status.info.chip },
      },
    },
    typography: {
      fontFamily,
      // Same sizes and weights as the Leap Metrics app: body 14, page title 24 bold, list title 18, card title 14 bold, buttons 13.
      htmlFontSize: 16,
      fontSize: 14,
      h1: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.167 },
      h2: { fontWeight: 400, fontSize: '1.125rem', lineHeight: 1.2 },
      h3: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.167 }, // Overview page title (24 / 700)
      h4: { fontWeight: 400, fontSize: '1.125rem', lineHeight: 1.2 }, // List page title (18 / 400)
      h5: { fontWeight: 700, fontSize: '.875rem', lineHeight: 1.167 }, // Card / section title (14 / 700)
      h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.3 }, // Record name (16 / 600)
      subtitle1: { fontWeight: 600, fontSize: '1rem' },
      subtitle2: { fontWeight: 500, fontSize: '.875rem' }, // Labels, table headings (14 / 500)
      body1: { fontSize: '.875rem', fontWeight: 400, lineHeight: 1.5 }, // Normal text (14 / 400)
      body2: { fontSize: '.8125rem', fontWeight: 400, lineHeight: 1.5 }, // 13
      caption: { fontSize: '.75rem', fontWeight: 400 }, // 12
      button: { textTransform: 'capitalize', fontWeight: 400, letterSpacing: 'normal', fontSize: '.8125rem' }, // 13 / 400, not capitals
    },
  });

  const p = base.palette;

  return createTheme(base, {
    components: {
      MuiCssBaseline: { styleOverrides: { body: { backgroundColor: p.background.default } } },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: { borderRadius: radius.sm, paddingInline: 18, paddingBlock: 8.5, boxShadow: 'none', lineHeight: 1.75 },
          outlined: { paddingBlock: 7.5 },
        },
      },
      MuiIconButton: { defaultProps: { size: 'small' } },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        defaultProps: { notched: false },
        styleOverrides: {
          root: {
            borderRadius: radius.sm,
            fontSize: '.875rem',
            background: p.background.paper,
            // Disabled / read-only look: soft grey box but the value stays readable (used for "view" mode of a form).
            '&.Mui-disabled': { background: p.surfaceAlt },
            '&.Mui-disabled .MuiOutlinedInput-input, &.Mui-disabled .MuiSelect-select': { WebkitTextFillColor: p.ink[700] },
          },
          input: { paddingTop: 10, paddingBottom: 10 },
          // The label sits ABOVE the field, so the border needs no cut-out for it.
          notchedOutline: { top: 0, '& legend': { display: 'none' } },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { position: 'static', transform: 'none', fontSize: '.875rem', fontWeight: 500, color: p.ink[700], marginBottom: 4, '&.Mui-disabled': { color: p.ink[500] } },
        },
      },
      MuiFormControl: { styleOverrides: { root: { marginTop: 0, marginBottom: 0 } } },
      MuiFormHelperText: { styleOverrides: { root: { fontSize: '.75rem', marginLeft: 2, marginTop: 3 } } },
      MuiAutocomplete: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall': { paddingTop: 0, paddingBottom: 0 },
            '& .MuiOutlinedInput-root.MuiInputBase-sizeSmall.MuiAutocomplete-inputRoot .MuiAutocomplete-input': {
              paddingTop: 10,
              paddingBottom: 10,
            },
          },
        },
      },
      MuiCheckbox: { defaultProps: { size: 'small' } },
      MuiRadio: { defaultProps: { size: 'small' } },
      MuiSwitch: { defaultProps: { size: 'small' } },
      MuiChip: { defaultProps: { size: 'small' }, styleOverrides: { root: { borderRadius: 16, fontWeight: 400, lineHeight: 1, letterSpacing: '0.01071em' } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTableCell: {
        styleOverrides: { root: { fontFamily: tableFontFamily, fontSize: '.875rem', fontWeight: 400, lineHeight: 1.4, letterSpacing: '0.01071em', color: 'rgba(0, 0, 0, 0.87)', padding: '8px 10px', borderColor: p.divider } },
        variants: [
          {
            props: { variant: 'head' },
            style: {
              fontSize: '.875rem',
              textTransform: 'none',
              color: p.ink[900],
              fontWeight: 500,
              lineHeight: '24px',
              padding: '12px 12px',
              '&.MuiTableCell-paddingCheckbox': { padding: '0 0 0 4px' },
            },
          },
        ],
      },
      MuiTabs: { styleOverrides: { root: { minHeight: 36 } } },
      MuiTab: {
        styleOverrides: {
          root: { minHeight: 36, textTransform: 'none', fontWeight: 400, fontSize: '.8125rem', padding: '8px 4px', marginRight: 22, minWidth: 0 },
        },
      },
      MuiAlert: { styleOverrides: { root: { borderRadius: radius.md } } },
      MuiTooltip: { styleOverrides: { tooltip: { fontSize: '.75rem' } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: radius.lg } } },
      MuiMenu: { styleOverrides: { paper: { boxShadow: `0 8px 24px ${alpha('#0F172A', 0.14)}` } } },
    },
  });
}
