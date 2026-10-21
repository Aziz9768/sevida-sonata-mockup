/**
 * Design tokens: the ONE place the look is defined.
 *
 * Everything here is neutral and product-level (no client names). A client's own branding is
 * applied on top through `createSevidaTheme({ primary, secondary, fontFamily })`, so a client
 * can have a different main colour or font without anyone editing a component.
 *
 * Colours and type follow the Leap Metrics app (Lato, indigo + dark navy structure colours, blue action colour).
 */

export const brandDefaults = {
  /** Structure colour: sidebar inner list, dialog headers, table headers, primary buttons. */
  primary: '#484581',
  /** Darker shade of the structure colour: the sidebar itself and the header of main list tables. */
  primaryDark: '#272460',
  /** Action / link colour (links, filled action buttons, tabs). */
  secondary: '#3E5FCA',
  fontFamily: '"Lato", system-ui, -apple-system, "Segoe UI", sans-serif',
  /**
   * Font inside table headers and table cells. The Leap Metrics app shows these in Roboto (MUI's default),
   * while the rest of the page is Lato. Set `tableFontFamily` to the Lato stack above to make tables Lato too.
   */
  tableFontFamily: '"Roboto", Helvetica, Arial, sans-serif',
} as const;

/** Orange accent: the active menu item on the dark sidebar, "new" / "guide" call-outs. */
export const accent = { main: '#F97316', light: '#FBAA51' } as const;

/**
 * Status colours, same as the Leap Metrics app (MUI's standard status colours).
 * `main` = icons and borders, `dark` = text on the light `tint`, `chip` = the filled status label (text on it is black).
 */
export const status = {
  success: { main: '#2E7D32', dark: '#1E4620', tint: '#EDF7ED', chip: '#81C784' },
  warning: { main: '#ED6C02', dark: '#663C00', tint: '#FFF4E5', chip: '#FFCC80' },
  danger: { main: '#D32F2F', dark: '#5F2120', tint: '#FDEDED', chip: '#EF5350' },
  info: { main: '#1976D2', dark: '#0D3C61', tint: '#E8F4FD', chip: '#90CAF9' },
} as const;

/** Greys for text, borders and backgrounds (the greys used across the Leap Metrics app). */
export const ink = {
  /** Body text. */
  900: '#212529',
  /** Field labels, strong secondary text. */
  700: '#374151',
  /** Secondary text, captions. */
  500: '#666666',
  /** Cool grey for rarely used meta text. */
  400: '#64748B',
  /** Disabled text, placeholder icons. */
  300: '#BDBDBD',
  /** Lines and borders. */
  100: '#E0E0E0',
} as const;

export const surface = {
  /** App background. */
  page: '#FFFFFF',
  card: '#FFFFFF',
  /** Light grey panels, striped rows, filled areas. */
  alt: '#F3F4F6',
  /** Even lighter cool grey. */
  subtle: '#F8FAFC',
  /** Light-blue band: record header, section strips. */
  band: '#D1E0F4',
  border: '#E0E0E0',
} as const;

/** Text/divider colours for content that sits on a primary-coloured surface (e.g. the sidebar). */
export const onPrimary = {
  text: '#FFFFFF',
  /** The active menu item. */
  accent: '#FBAA51',
  textMuted: '#DAD9EC',
  textSubtle: '#ABA9D0',
  divider: 'rgba(255,255,255,0.16)',
  hoverFill: 'rgba(255,255,255,0.08)',
  activeFill: 'rgba(255,255,255,0.14)',
} as const;

export const radius = { sm: 4, md: 6, lg: 12, pill: 999 } as const;

/** 8px base unit. */
export const spacingUnit = 8;

export const layout = {
  headerHeight: 52,
  sidebarWidth: 232,
  sidebarWidthCollapsed: 64,
} as const;

export const shadow = {
  /** A panel floating above the page (sticky action bar). */
  panel: 'rgba(15, 23, 42, 0.08)',
  /** A menu or flyout. */
  flyout: '0 10px 28px rgba(15, 23, 42, 0.18)',
} as const;

/** Breakpoints in px. `sm` (600) is the one "phone" cut-off. */
export const breakpoints = { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } as const;
