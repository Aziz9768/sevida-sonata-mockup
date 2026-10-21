import { useState } from 'react';
import { Box, Typography } from '@mui/material';

export interface BrandLogoProps {
  /** Product name shown next to the mark. Default "Sonata". */
  name?: string;
  /** Your real logo image (URL or imported file). Leave empty to show the placeholder mark. */
  src?: string;
  /** `onDark` for the dark sidebar, `onLight` for white pages. Default "onLight". */
  tone?: 'onDark' | 'onLight';
  /** Show only the mark, no name (collapsed sidebar). Default false. */
  markOnly?: boolean;
  /** Mark size in px. Default 28. */
  size?: number;
}

/**
 * Logo + product name. Until a real logo is supplied it shows a PLACEHOLDER mark
 * (a rounded square with the first letter), so layouts can be built and reviewed now.
 * Replace it by passing `src`, or pass your own element to the `logo` prop of Sidebar / AuthLayout.
 */
export function BrandLogo({ name = 'Sonata', src, tone = 'onLight', markOnly = false, size = 28 }: BrandLogoProps) {
  const dark = tone === 'onDark';
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      {src ? (
        <Box component="img" src={src} alt={markOnly ? name : ''} sx={{ width: size, height: size, objectFit: 'contain', flex: '0 0 auto' }} />
      ) : (
        <Box
          role={markOnly ? 'img' : undefined}
          aria-label={markOnly ? name : undefined}
          aria-hidden={markOnly ? undefined : true}
          title="Logo placeholder"
          sx={{
            width: size,
            height: size,
            flex: '0 0 auto',
            borderRadius: '8px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: dark ? 'onPrimary.accent' : 'primary.main',
            color: dark ? 'primary.dark' : 'onPrimary.text',
            fontWeight: 900,
            fontSize: size * 0.5,
            lineHeight: 1,
          }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </Box>
      )}
      {!markOnly && (
        <Typography component="span" noWrap sx={{ fontSize: '1.0625rem', fontWeight: 700, letterSpacing: '.01em', color: dark ? 'onPrimary.text' : 'primary.main' }}>
          {name}
        </Typography>
      )}
    </Box>
  );
}

export interface PoweredByProps {
  /** Who it is powered by. Default "Leap Metrics". */
  name?: string;
  /** Make the name a link. */
  href?: string;
  tone?: 'onDark' | 'onLight';
  /** Centre the text (default) or align left. */
  align?: 'center' | 'left';
  /** The company's logo (URL or imported file), shown before the text. If it cannot load, only the text is shown. */
  logoSrc?: string;
}

/** The small "Powered by Leap Metrics" line. Sidebar and the sign-in screens show it by default. */
export function PoweredBy({ name = 'Leap Metrics', href, tone = 'onLight', align = 'center', logoSrc }: PoweredByProps) {
  const dark = tone === 'onDark';
  const [broken, setBroken] = useState(false);
  return (
    <Typography component="div" sx={{ fontSize: '.75rem', textAlign: align, color: dark ? 'onPrimary.textSubtle' : 'ink.500', display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
      {logoSrc && !broken && (
        // A white tile keeps a dark logo readable on the dark sidebar.
        <Box sx={{ display: 'inline-flex', p: dark ? '2px' : 0, bgcolor: dark ? '#fff' : 'transparent', borderRadius: '5px', flex: '0 0 auto' }}>
          <Box component="img" src={logoSrc} alt="" onError={() => setBroken(true)} sx={{ width: 20, height: 20, objectFit: 'contain', display: 'block' }} />
        </Box>
      )}
      <span>
      Powered by{' '}
      <Box
        component={href ? 'a' : 'span'}
        {...(href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {})}
        sx={{ fontWeight: 700, color: dark ? 'onPrimary.text' : 'ink.700', textDecoration: 'none', '&:hover': href ? { textDecoration: 'underline' } : undefined }}
      >
        {name}
      </Box>
      </span>
    </Typography>
  );
}
