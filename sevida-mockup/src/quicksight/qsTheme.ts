// The QuickSight look, as a token sheet (guide 07, sections 1 to 3). Every colour comes from the Sonata tokens,
// so the QuickSight dashboard and the rest of Sonata share one palette. QuickSight rules this follows:
// Normal or Bold weights only, no shadows, square bars, tile gap and margin on/off only, one font from QuickSight's list.
import { tokens } from "sevida-ui";

const { ink, status, surface, brandDefaults } = tokens;

export const QS_FONT =
  '"Source Sans Pro", "Source Sans 3", system-ui, -apple-system, "Segoe UI", sans-serif';

export const qs = {
  font: QS_FONT,
  /** UIColorPalette */
  color: {
    primaryBackground: surface.card,
    primaryForeground: ink[900],
    secondaryBackground: surface.alt,
    secondaryForeground: ink[700],
    accent: brandDefaults.secondary,
    accentForeground: "#FFFFFF",
    mutedText: ink[500],
    border: ink[100],
    emptyFill: ink[100],
  },
  /** Fixed meaning colours, the same on every dashboard (guide 02, section 3). */
  meaning: {
    met: status.success.main,
    gap: status.warning.main,
    /** The gap colour for TEXT. Orange #ED6C02 is only 3.1 : 1 on white (needs 4.5 : 1). This is the guide's own placeholder, 5.0 : 1. Bars keep the orange. */
    gapText: "#B4541F",
    neutral: ink[400],
    target: ink[900],
    main: brandDefaults.primary,
  },
  /** Tile style (Sheet.Tile). */
  tile: { radius: 12, padding: 16, border: `1px solid ${ink[100]}` },
  /** Type scale (guide 03). Sizes in px, weights Normal (400) or Bold (700) only. */
  type: {
    sheetTitle: { size: 20, weight: 700 },
    visualTitle: { size: 14, weight: 700 },
    subtitle: { size: 12, weight: 400 },
    body: { size: 13, weight: 400 },
    small: { size: 11, weight: 400 },
    kpi: { size: 32, weight: 400 },
  },
  /** Grid. */
  columns: 36,
  controlColumns: 12,
  gap: 16,
  tone: {
    danger: {
      bg: status.danger.tint,
      border: status.danger.main,
      text: status.danger.dark,
    },
    warning: {
      bg: status.warning.tint,
      border: status.warning.main,
      text: status.warning.dark,
    },
    info: {
      bg: status.info.tint,
      border: status.info.main,
      text: status.info.dark,
    },
  },
} as const;
