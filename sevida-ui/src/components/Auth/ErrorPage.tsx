import type { ElementType, ReactNode } from 'react';
import { BrandLogo, PoweredBy } from '../Brand/BrandLogo';
import { Box, Stack, Typography } from '@mui/material';
import { Button } from '../Button/Button';

export interface ErrorPageProps {
  /** The big number or word, e.g. "404". */
  code: string;
  title: string;
  message: ReactNode;
  /** Buttons under the message. */
  actions?: ReactNode;
  logo?: ReactNode;
  /** Extra detail for support, e.g. a reference id. Shown small and selectable. */
  reference?: string;
}

/** A full-page "something is not right" screen with a big code, a plain sentence and one or two buttons. */
export function ErrorPage({ code, title, message, actions, logo, reference }: ErrorPageProps) {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', px: 2.5, py: 6, bgcolor: 'background.paper' }}>
      <Stack alignItems="center" spacing={2} sx={{ maxWidth: 460, textAlign: 'center' }}>
        {logo ?? <BrandLogo />}
        <Typography aria-hidden sx={{ fontSize: { xs: '4.5rem', sm: '6rem' }, fontWeight: 700, lineHeight: 1, color: 'tint.primary', WebkitTextStroke: (t) => `2px ${t.palette.primary.main}` }}>
          {code}
        </Typography>
        <Typography variant="h3" component="h1" sx={{ color: 'primary.main' }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '1rem', color: 'ink.700', lineHeight: 1.55 }}>{message}</Typography>
        {actions && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ pt: 1, width: { xs: '100%', sm: 'auto' } }}>
            {actions}
          </Stack>
        )}
        {reference && (
          <Typography sx={{ fontSize: '.75rem', color: 'ink.500', userSelect: 'all' }}>Reference: {reference}</Typography>
        )}
        <Box sx={{ pt: 3 }}>
          <PoweredBy />
        </Box>
      </Stack>
    </Box>
  );
}

interface PresetBase {
  logo?: ReactNode;
  /** Where "Go to home" goes. */
  homeHref?: string;
  linkComponent?: ElementType;
}

export interface NotFoundPageProps extends PresetBase {
  /** Shows a "Go back" button. */
  onGoBack?: () => void;
}

/** 404: the address does not exist. */
export function NotFoundPage({ logo, homeHref, onGoBack, linkComponent }: NotFoundPageProps) {
  return (
    <ErrorPage
      code="404"
      logo={logo}
      title="We cannot find that page"
      message="The address may be mistyped, or the page may have moved or been removed."
      actions={
        <>
          {onGoBack && <Button variant="secondary" onClick={onGoBack}>Go back</Button>}
          {homeHref && <Button component={linkComponent ?? 'a'} href={homeHref}>Go to home</Button>}
        </>
      }
    />
  );
}

export interface NoAccessPageProps extends PresetBase {
  /** Who to ask, e.g. "your administrator". */
  contactText?: string;
  onSignOut?: () => void;
}

/** 403: signed in, but not allowed to see this. */
export function NoAccessPage({ logo, homeHref, contactText = 'your administrator', onSignOut, linkComponent }: NoAccessPageProps) {
  return (
    <ErrorPage
      code="403"
      logo={logo}
      title="You do not have access"
      message={<>Your account is not allowed to open this page. If you think it should be, ask {contactText} to give you access.</>}
      actions={
        <>
          {onSignOut && <Button variant="secondary" onClick={onSignOut}>Sign in as someone else</Button>}
          {homeHref && <Button component={linkComponent ?? 'a'} href={homeHref}>Go to home</Button>}
        </>
      }
    />
  );
}

export interface ServerErrorPageProps extends PresetBase {
  onRetry?: () => void;
  /** An id support can look up in the logs. */
  reference?: string;
}

/** 500: something broke on our side. */
export function ServerErrorPage({ logo, homeHref, onRetry, reference, linkComponent }: ServerErrorPageProps) {
  return (
    <ErrorPage
      code="500"
      logo={logo}
      title="Something went wrong"
      message="This is a problem on our side, not yours. Please try again. If it keeps happening, tell support and include the reference below."
      reference={reference}
      actions={
        <>
          {onRetry && <Button onClick={onRetry}>Try again</Button>}
          {homeHref && <Button variant="secondary" component={linkComponent ?? 'a'} href={homeHref}>Go to home</Button>}
        </>
      }
    />
  );
}
