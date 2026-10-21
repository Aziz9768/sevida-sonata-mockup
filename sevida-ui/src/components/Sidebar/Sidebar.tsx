import { useEffect, useState } from 'react';
import type { ElementType, ReactNode, MouseEvent } from 'react';
import { Avatar, Box, Collapse, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { layout } from '../../theme/tokens';
import { BrandLogo, PoweredBy } from '../Brand/BrandLogo';

export interface NavItem {
  /** Unique id. `activeKey` is matched against this. */
  key: string;
  label: string;
  /** An MUI icon element, e.g. <PeopleAltOutlinedIcon />. */
  icon?: ReactNode;
  /** Where the item goes. Items with `children` are groups and need no href. */
  href?: string;
  onClick?: () => void;
  /** Makes this item a group that expands to show these. One level only. */
  children?: NavItem[];
}

export interface SidebarUser {
  name: string;
  /** Second line, e.g. a role. */
  subtitle?: string;
  /** 1-2 letters shown in the avatar. */
  initials: string;
}

export interface SidebarProps {
  items: NavItem[];
  /** Items pinned to the bottom (Settings, Admin). */
  bottomItems?: NavItem[];
  /** `key` of the page currently open. Its group opens automatically. */
  activeKey?: string;
  /** Called when any item is chosen (use it to close the phone drawer or to route). */
  onNavigate?: (item: NavItem) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Product name shown beside the logo. Default "Sonata". */
  brandName?: string;
  /** Wide logo for the open sidebar. Default: a placeholder mark + `brandName`. */
  logo?: ReactNode;
  /** Small logo / mark for the collapsed sidebar. Default: the placeholder mark. */
  logoCollapsed?: ReactNode;
  /** The line at the very bottom. Default "Powered by Leap Metrics". Pass `false` to hide it. */
  poweredBy?: ReactNode | false;
  user?: SidebarUser;
  /** Shows a "Sign out" button next to the user. Called when it is pressed. */
  onSignOut?: () => void;
  /**
   * The component used for links so clicks don't reload the page. Give it your router's link
   * wrapped to accept `href`. If omitted, plain <a href> is used.
   */
  linkComponent?: ElementType;
  /** Set by the app shell when the sidebar is shown inside the phone drawer. Swaps the collapse arrow for a close button. */
  mobile?: boolean;
  onCloseMobile?: () => void;
}

function containsKey(item: NavItem, key?: string): boolean {
  return !!key && (item.key === key || !!item.children?.some((c) => c.key === key));
}

/**
 * The main navigation: a full-height coloured panel with logo, links, groups, bottom links and
 * the signed-in user. It can collapse to icons only. On phones AppShell puts it in a slide-in drawer.
 */
export function Sidebar({
  items,
  bottomItems = [],
  activeKey,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  brandName = 'Sonata',
  logo,
  logoCollapsed,
  poweredBy,
  user,
  onSignOut,
  linkComponent,
  mobile = false,
  onCloseMobile,
}: SidebarProps) {
  const rail = collapsed && !mobile; // icon-only mode (desktop only)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(items.filter((i) => containsKey(i, activeKey)).map((i) => i.key)));
  const [flyout, setFlyout] = useState<{ anchor: HTMLElement; item: NavItem } | null>(null);

  // Keep the active page's group open after navigation.
  useEffect(() => {
    const g = items.find((i) => i.children && containsKey(i, activeKey));
    if (g) setOpenGroups((prev) => (prev.has(g.key) ? prev : new Set(prev).add(g.key)));
  }, [activeKey, items]);

  const choose = (item: NavItem) => {
    item.onClick?.();
    onNavigate?.(item);
    setFlyout(null);
  };

  const rowSx = (active: boolean, nested = false) => ({
    mx: 1,
    mb: 0.25,
    borderRadius: 1,
    minHeight: 40,
    pl: nested ? 4.5 : 1.5,
    pr: 1.5,
    color: active ? 'onPrimary.accent' : 'onPrimary.text',
    bgcolor: active ? 'onPrimary.activeFill' : 'transparent',
    position: 'relative' as const,
    justifyContent: rail ? 'center' : 'flex-start',
    '&:hover': { bgcolor: 'onPrimary.hoverFill', color: 'onPrimary.text' },
    '&.Mui-focusVisible': { outline: '2px solid #fff', outlineOffset: -2 },
    ...(active && { '&::before': { content: '""', position: 'absolute', left: -8, top: 8, bottom: 8, width: 3, borderRadius: 2, bgcolor: 'onPrimary.accent' } }),
  });

  const linkProps = (item: NavItem) => (item.href ? { component: linkComponent ?? 'a', href: item.href } : {});

  const renderLeaf = (item: NavItem, nested = false) => {
    const active = item.key === activeKey;
    const button = (
      <ListItemButton
        key={item.key}
        {...linkProps(item)}
        onClick={() => choose(item)}
        aria-current={active ? 'page' : undefined}
        sx={rowSx(active, nested)}
      >
        {item.icon && !nested && (
          <ListItemIcon sx={{ minWidth: rail ? 0 : 34, color: 'inherit', '& svg': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
        )}
        {!rail && <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '.75rem', fontWeight: 400, lineHeight: 1.17, color: 'inherit' } } }} />}
      </ListItemButton>
    );
    return rail ? (
      <Tooltip key={item.key} title={item.label} placement="right" arrow>
        {button}
      </Tooltip>
    ) : (
      button
    );
  };

  const renderEntry = (item: NavItem) => {
    if (!item.children) return renderLeaf(item);
    const groupActive = containsKey(item, activeKey);
    const open = openGroups.has(item.key);

    if (rail) {
      return (
        <Tooltip key={item.key} title={item.label} placement="right" arrow>
          <ListItemButton
            aria-haspopup="menu"
            aria-label={item.label}
            onClick={(e: MouseEvent<HTMLElement>) => setFlyout({ anchor: e.currentTarget, item })}
            sx={rowSx(groupActive)}
          >
            <ListItemIcon sx={{ minWidth: 0, color: 'inherit', '& svg': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
          </ListItemButton>
        </Tooltip>
      );
    }
    return (
      <Box key={item.key}>
        <ListItemButton
          onClick={() => setOpenGroups((prev) => { const n = new Set(prev); if (n.has(item.key)) n.delete(item.key); else n.add(item.key); return n; })}
          aria-expanded={open}
          sx={{ ...rowSx(false), color: groupActive ? 'onPrimary.accent' : 'onPrimary.text' }}
        >
          {item.icon && <ListItemIcon sx={{ minWidth: 34, color: 'inherit', '& svg': { fontSize: 20 } }}>{item.icon}</ListItemIcon>}
          <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: '.75rem', fontWeight: 400, lineHeight: 1.17, color: 'inherit' } } }} />
          <ExpandMoreIcon sx={{ fontSize: 18, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }} />
        </ListItemButton>
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding component="div">{item.children.map((c) => renderLeaf(c, true))}</List>
        </Collapse>
      </Box>
    );
  };

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width: mobile ? '100%' : rail ? layout.sidebarWidthCollapsed : layout.sidebarWidth,
        flex: '0 0 auto',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'primary.dark',
        color: 'onPrimary.text',
        transition: 'width 160ms ease',
        overflow: 'hidden',
      }}
    >
      {/* top: logo + collapse / close */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={rail ? 'center' : 'space-between'}
        sx={{ minHeight: layout.headerHeight, px: rail ? 0 : 2, borderBottom: 1, borderColor: 'onPrimary.divider', flex: '0 0 auto' }}
      >
        {!rail && <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>{logo ?? <BrandLogo name={brandName} tone="onDark" />}</Box>}
        {rail && <Box sx={{ display: 'flex', alignItems: 'center' }}>{logoCollapsed ?? <BrandLogo name={brandName} tone="onDark" markOnly />}</Box>}
        {mobile ? (
          <IconButton aria-label="Close menu" onClick={onCloseMobile} sx={{ color: 'onPrimary.text' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : (
          onToggleCollapsed &&
          !rail && (
            <IconButton aria-label="Collapse sidebar" onClick={onToggleCollapsed} sx={{ color: 'onPrimary.textMuted' }}>
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
          )
        )}
      </Stack>
      {rail && onToggleCollapsed && (
        <Tooltip title="Expand sidebar" placement="right" arrow>
          <IconButton aria-label="Expand sidebar" onClick={onToggleCollapsed} sx={{ color: 'onPrimary.textMuted', alignSelf: 'center', mt: 1 }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* links */}
      <List component="nav" aria-label="Main" disablePadding sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pt: 1.5 }}>
        {items.map(renderEntry)}
      </List>

      {/* bottom links + user */}
      {bottomItems.length > 0 && (
        <List component="nav" aria-label="Secondary" disablePadding sx={{ borderTop: 1, borderColor: 'onPrimary.divider', pt: 1, pb: 0.5, flex: '0 0 auto' }}>
          {bottomItems.map(renderEntry)}
        </List>
      )}
      {user && (
        <Stack
          direction={rail ? 'column' : 'row'}
          alignItems="center"
          spacing={rail ? 0.75 : 1.25}
          sx={{ borderTop: 1, borderColor: 'onPrimary.divider', p: 1.5, justifyContent: rail ? 'center' : 'flex-start', flex: '0 0 auto' }}
        >
          <Tooltip title={rail ? user.name : ''} placement="right" arrow>
            <Avatar sx={{ width: 32, height: 32, fontSize: '.75rem', fontWeight: 700, bgcolor: 'onPrimary.activeFill', color: 'onPrimary.text' }}>{user.initials}</Avatar>
          </Tooltip>
          {!rail && (
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: '.75rem', lineHeight: 1.5, color: 'onPrimary.text' }}>
                {user.name}
              </Typography>
              {user.subtitle && (
                <Typography noWrap sx={{ fontSize: '.75rem', color: 'onPrimary.textSubtle' }}>
                  {user.subtitle}
                </Typography>
              )}
            </Box>
          )}
          {onSignOut && (
            <Tooltip title="Sign out" placement={rail ? 'right' : 'top'} arrow>
              <IconButton aria-label="Sign out" onClick={onSignOut} sx={{ color: 'onPrimary.textMuted', '&:hover': { color: 'onPrimary.text', bgcolor: 'onPrimary.hoverFill' }, '&.Mui-focusVisible': { outline: '2px solid #fff' } }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}

      {/* "Powered by" line (hidden when the sidebar is icons only) */}
      {!rail && poweredBy !== false && (
        <Box sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'onPrimary.divider', flex: '0 0 auto' }}>
          {poweredBy ?? <PoweredBy tone="onDark" align="left" />}
        </Box>
      )}

      {/* collapsed-mode flyout for groups */}
      <Menu
        anchorEl={flyout?.anchor}
        open={!!flyout}
        onClose={() => setFlyout(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 180, ml: 0.5 } } }}
      >
        {flyout?.item.children?.map((c) => (
          <MenuItem
            key={c.key}
            selected={c.key === activeKey}
            onClick={() => choose(c)}
            {...(c.href ? { component: linkComponent ?? 'a', href: c.href } : {})}
            sx={{ fontSize: '.8125rem' }}
          >
            {c.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
