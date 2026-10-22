import type { ReactNode } from 'react';
import { Box, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export interface InfoTipProps {
  /** The explanation. Keep it to one or two short sentences, in plain words. */
  children: ReactNode;
  /** What the (i) is about, for screen readers: "About Counted members". */
  label: string;
  /** Use on a dark surface such as a table heading. */
  onDark?: boolean;
  size?: number;
}

const tipSx = { maxWidth: 280, fontSize: '.8125rem', lineHeight: 1.45, p: 1.25 } as const;

/**
 * A small (i) button that explains a word, a number or a column in plain language.
 * It opens on hover, on keyboard focus and on tap, and closes with Escape.
 * Use it next to any heading, number or short form a new user might not know.
 */
export function InfoTip({ children, label, onDark = false, size = 16 }: InfoTipProps) {
  return (
    <Tooltip title={children} arrow enterTouchDelay={0} leaveTouchDelay={6000} slotProps={{ tooltip: { sx: tipSx } }}>
      <Box
        component="button"
        type="button"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0.25,
          m: 0,
          border: 0,
          borderRadius: '50%',
          bgcolor: 'transparent',
          cursor: 'help',
          color: onDark ? 'onPrimary.textMuted' : 'ink.500',
          verticalAlign: 'middle',
          flex: '0 0 auto',
          '&:hover': { color: onDark ? 'onPrimary.text' : 'primary.main' },
          '&:focus-visible': { outline: '2px solid', outlineColor: onDark ? '#fff' : 'secondary.main', outlineOffset: 1 },
        }}
      >
        <InfoOutlinedIcon aria-hidden sx={{ fontSize: size }} />
      </Box>
    </Tooltip>
  );
}

export interface TermProps {
  /** What the short form means. */
  tip: ReactNode;
  /** The short form as shown in the text, e.g. "HEDIS". */
  children: ReactNode;
  label?: string;
}

/**
 * A short form or technical word inside a sentence, with a dotted underline.
 * Hover, focus or tap it to read what it means.
 */
export function Term({ tip, children, label }: TermProps) {
  return (
    <Tooltip title={tip} arrow enterTouchDelay={0} leaveTouchDelay={6000} slotProps={{ tooltip: { sx: tipSx } }}>
      <Box
        component="button"
        type="button"
        aria-label={label}
        sx={{
          p: 0,
          m: 0,
          border: 0,
          bgcolor: 'transparent',
          font: 'inherit',
          color: 'inherit',
          cursor: 'help',
          // A button centers its text by default; the term sits inside running text or a table cell, so it follows the cell.
          textAlign: 'inherit',
          textDecoration: 'underline dotted',
          textUnderlineOffset: 3,
          '&:focus-visible': { outline: '2px solid', outlineColor: 'secondary.main', outlineOffset: 2, borderRadius: 0.5 },
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}
