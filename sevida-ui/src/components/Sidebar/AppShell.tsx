import { useState } from 'react';
import type { ReactNode } from 'react';
import { Box, Drawer } from '@mui/material';
import { Sidebar } from './Sidebar';
import type { SidebarProps } from './Sidebar';
import { AppHeader } from './AppHeader';
import { useIsMobile } from '../../hooks/useIsMobile';
import { layout } from '../../theme/tokens';

export interface AppShellProps extends Omit<SidebarProps, 'collapsed' | 'onToggleCollapsed' | 'mobile' | 'onCloseMobile'> {
  /** Text in the header bar. */
  headerTitle?: string;
  /** Right side of the header bar (search, bell, help...). */
  headerContent?: ReactNode;
  /** Start with the sidebar collapsed to icons. Default false. */
  defaultCollapsed?: boolean;
  /** The page. Usually a <PageContainer>. */
  children: ReactNode;
}

/**
 * The whole app frame: sidebar + header + page area.
 * Desktop/tablet: a permanent sidebar that can collapse to icons.
 * Phone: no sidebar; a menu button in the header opens it as a slide-in drawer.
 */
export function AppShell({ headerTitle, headerContent, defaultCollapsed = false, children, onNavigate, ...sidebar }: AppShellProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    // 100dvh follows the real visible height on phones (the browser bar shows and hides).
    <Box sx={{ display: 'flex', height: '100vh', '@supports (height: 100dvh)': { height: '100dvh' }, bgcolor: 'background.default' }}>
      {!isMobile && <Sidebar {...sidebar} onNavigate={onNavigate} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />}
      {isMobile && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{ paper: { sx: { width: layout.sidebarWidth + 40, maxWidth: '85vw', border: 'none' } } }}
        >
          <Sidebar
            {...sidebar}
            collapsed={false}
            mobile
            onCloseMobile={() => setDrawerOpen(false)}
            onNavigate={(item) => {
              setDrawerOpen(false);
              onNavigate?.(item);
            }}
          />
        </Drawer>
      )}
      {/* minHeight/minWidth 0 let this column shrink so the page area (not the whole window) scrolls. */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
        <AppHeader title={headerTitle} onMenuClick={isMobile ? () => setDrawerOpen(true) : undefined}>
          {headerContent}
        </AppHeader>
        <Box component="main" id="main-content" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
