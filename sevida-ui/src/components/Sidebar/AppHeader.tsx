import { Box, IconButton, Stack, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import type { ReactNode } from 'react';
import { layout } from '../../theme/tokens';

export interface AppHeaderProps {
  /** Shows a menu (hamburger) button. AppShell sets this on phones only. */
  onMenuClick?: () => void;
  /** Left text, e.g. the app or site name. */
  title?: string;
  /** Right side: search, notification bell, help... */
  children?: ReactNode;
}

/** The slim white bar above the page content. */
export function AppHeader({ onMenuClick, title, children }: AppHeaderProps) {
  return (
    <Stack
      component="header"
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ minHeight: layout.headerHeight, px: { xs: 1, sm: 2.75 }, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flex: '0 0 auto' }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        {onMenuClick && (
          <IconButton aria-label="Open menu" onClick={onMenuClick}>
            <MenuIcon />
          </IconButton>
        )}
        {title && (
          <Typography noWrap sx={{ fontWeight: 700, fontSize: '1rem', color: 'primary.main' }}>
            {title}
          </Typography>
        )}
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{children}</Box>
    </Stack>
  );
}
