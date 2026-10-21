import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { useIsMobile } from '../../hooks/useIsMobile';
import { shadow } from '../../theme/tokens';

interface BarAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface StickyActionBarProps {
  /** Left action (Back / Cancel). Pass null when there is nothing to offer. */
  secondary: BarAction | null;
  /** Right action (Save / Next). */
  primary: BarAction & { loading?: boolean };
  /** Optional middle action next to the main one, e.g. "Edit" between "Back" and "Save". Shown as an outlined button. */
  tertiary?: BarAction;
  /** Small text in the bar, e.g. "* Required". Sits between the left and right buttons (above them on phones). */
  note?: ReactNode;
}

/**
 * The "commit this form" bar pinned to the bottom of the page while the content scrolls.
 * On phones the buttons go full width, primary on top.
 */
export function StickyActionBar({ secondary, primary, tertiary, note }: StickyActionBarProps) {
  const isMobile = useIsMobile();
  const primaryBtn = (
    <Button key="p" fullWidth={isMobile} onClick={primary.onClick} disabled={primary.disabled} loading={primary.loading}>
      {primary.label}
    </Button>
  );
  const tertiaryBtn = tertiary ? (
    <Button key="t" variant="secondary" fullWidth={isMobile} onClick={tertiary.onClick} disabled={tertiary.disabled}>
      {tertiary.label}
    </Button>
  ) : null;
  const secondaryBtn = secondary ? (
    <Button key="s" variant="secondary" fullWidth={isMobile} onClick={secondary.onClick} disabled={secondary.disabled}>
      {secondary.label}
    </Button>
  ) : null;
  const noteEl = note ? (
    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: isMobile ? 'left' : 'center', flex: isMobile ? undefined : 1, px: isMobile ? 0 : 2 }}>
      {note}
    </Typography>
  ) : null;
  return (
    <Box
      sx={{
        position: 'sticky',
        bottom: 0,
        zIndex: 2,
        py: { xs: 1.25, sm: 1.75 },
        px: { xs: 1.5, sm: 2.5 },
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: `0 -6px 16px ${shadow.panel}`,
        display: 'flex',
        gap: 1,
        ...(isMobile ? { flexDirection: 'column' } : { justifyContent: 'space-between', alignItems: 'center' }),
      }}
    >
      {isMobile ? (
        <>
          {noteEl}
          {primaryBtn}
          {tertiaryBtn}
          {secondaryBtn}
        </>
      ) : (
        <>
          {secondaryBtn ?? <span />}
          {noteEl}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {tertiaryBtn}
            {primaryBtn}
          </Box>
        </>
      )}
    </Box>
  );
}
