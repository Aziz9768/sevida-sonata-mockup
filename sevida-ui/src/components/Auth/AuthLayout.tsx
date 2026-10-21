import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import type { ElementType, ReactNode } from 'react';
import { BrandLogo, PoweredBy } from '../Brand/BrandLogo';

export interface AuthLayoutProps {
  /** Your logo (an <img> or an SVG). Shown above the card. Default: a placeholder mark + `appName`; with your own logo the name is shown only if you pass `appName`. */
  logo?: ReactNode;
  /** Product name. Shown next to the logo, and as the page's accessible name. Default "Sonata" (with the placeholder logo). */
  appName?: string;
  title: string;
  subtitle?: ReactNode;
  /** A round icon shown above the title (used by message pages). */
  icon?: ReactNode;
  /** Make the card wider (for forms with two columns of fields). Default false. */
  wide?: boolean;
  /** Below the card: "© Client name · Privacy · Terms". */
  footer?: ReactNode;
  /** Line under the card. Default "Powered by Leap Metrics". Pass `false` to hide it. */
  poweredBy?: ReactNode | false;
  children: ReactNode;
}

/**
 * The frame every sign-in screen sits in: a card centred on a plain background.
 * On a phone the card disappears and the form uses the whole screen, so nothing is cramped.
 * To re-brand for a client: pass their `logo` and `appName`, and set the theme colours (SevidaThemeProvider `brand`).
 */
export function AuthLayout({ logo, appName, title, subtitle, icon, wide = false, footer, poweredBy, children }: AuthLayoutProps) {
  return (
    <Box
      component="main"
      aria-label={appName}
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: { xs: 'flex-start', sm: 'center' },
        px: { xs: 0, sm: 2 },
        py: { xs: 0, sm: 5 },
        bgcolor: { xs: 'background.paper', sm: 'surfaceAlt' },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: wide ? 560 : 440, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        <Stack direction="row" alignItems="center" justifyContent="center" sx={{ mb: { xs: 1, sm: 3 }, mt: { xs: 4, sm: 0 }, minHeight: 40 }}>
          {logo ? (
            <Stack direction="row" alignItems="center" spacing={1.25}>
              {logo}
              {appName && (
                <Typography component="span" sx={{ fontSize: '1.0625rem', fontWeight: 700, color: 'primary.main' }}>
                  {appName}
                </Typography>
              )}
            </Stack>
          ) : (
            <BrandLogo name={appName ?? 'Sonata'} size={32} />
          )}
        </Stack>
        <Paper
          elevation={0}
          sx={{
            borderWidth: { xs: 0, sm: 1 },
            borderStyle: 'solid',
            borderColor: 'divider',
            borderRadius: { xs: 0, sm: 2 },
            boxShadow: { xs: 'none', sm: '0 4px 20px rgba(30,30,60,0.06)' },
            p: { xs: 2.5, sm: 4 },
          }}
        >
          <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Stack spacing={1} alignItems={icon ? 'center' : 'flex-start'} sx={{ textAlign: icon ? 'center' : 'left' }}>
              {icon}
              <Typography variant="h3" component="h1" sx={{ color: 'primary.main' }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography component="div" sx={{ fontSize: '.875rem', color: 'ink.700', lineHeight: 1.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Stack>
            {children}
          </Stack>
        </Paper>
        {footer && (
          <Box sx={{ mt: 2.5, px: 2.5, textAlign: 'center', fontSize: '.75rem', color: 'ink.500', '& a': { color: 'secondary.main' } }}>{footer}</Box>
        )}
        {poweredBy !== false && <Box sx={{ mt: footer ? 1 : 2.5, px: 2.5, pb: { xs: 3, sm: 0 } }}>{poweredBy ?? <PoweredBy />}</Box>}
      </Box>
    </Box>
  );
}

/** A text link that works with any router (see `linkComponent`). Renders nothing without an `href`. */
export function AuthLink({ href, linkComponent, onClick, children }: { href?: string; linkComponent?: ElementType; onClick?: () => void; children: ReactNode }) {
  if (!href && !onClick) return null;
  return (
    <Link
      {...(href ? { component: linkComponent ?? 'a', href } : { component: 'button', type: 'button' })}
      onClick={onClick}
      underline="hover"
      sx={{ fontSize: 'inherit', fontWeight: 600, color: 'secondary.main', cursor: 'pointer', font: 'inherit', p: 0, border: 0, bgcolor: 'transparent', verticalAlign: 'baseline' }}
    >
      {children}
    </Link>
  );
}

/** A thin line with "or" in the middle, between the form and the single sign-on buttons. */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} role="separator" aria-label={label}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      <Typography sx={{ fontSize: '.75rem', color: 'ink.500', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
    </Stack>
  );
}
