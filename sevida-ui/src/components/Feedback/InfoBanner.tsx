import { Box, IconButton, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export interface InfoBannerProps {
  tone?: BannerTone;
  /** Optional bold first line. */
  title?: string;
  children: ReactNode;
  /** A button or link shown on the right (below the text on phones). */
  action?: ReactNode;
  /** Pass to show a close (x) button. */
  onClose?: () => void;
}

/** A full-width message bar for notes, warnings and errors that belong to the whole page or card. */
export function InfoBanner({ tone = 'info', title, children, action, onClose }: InfoBannerProps) {
  const { palette: p } = useTheme();
  const styles = {
    info: { bg: p.tint.info, border: p.info.light, fg: p.info.dark, Icon: InfoOutlinedIcon },
    success: { bg: p.tint.success, border: p.success.main, fg: p.success.dark, Icon: CheckCircleOutlineIcon },
    warning: { bg: p.tint.warning, border: p.warning.main, fg: p.warning.dark, Icon: WarningAmberOutlinedIcon },
    danger: { bg: p.tint.danger, border: p.error.main, fg: p.error.dark, Icon: WarningAmberOutlinedIcon },
  }[tone];
  const { Icon } = styles;
  return (
    <Stack
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ bgcolor: styles.bg, border: `1px solid ${styles.border}`, borderRadius: 1.5, px: 1.75, py: 1.1, color: styles.fg }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ minWidth: 0 }}>
        <Icon sx={{ fontSize: 18, mt: 0.2, flex: '0 0 auto' }} />
        <Box sx={{ minWidth: 0 }}>
          {title && <Typography sx={{ fontWeight: 700, fontSize: '.8125rem' }}>{title}</Typography>}
          <Typography component="div" sx={{ fontSize: '.8125rem', fontWeight: 500, color: 'inherit' }}>
            {children}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flex: '0 0 auto' }}>
        {action}
        {onClose && (
          <IconButton size="small" aria-label="Dismiss" onClick={onClose} sx={{ color: 'inherit' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
    </Stack>
  );
}
