import { Box, Dialog, DialogActions, DialogContent, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ReactNode } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Buttons for the bottom bar, e.g. <Button>Save</Button>. On phones they stack, primary first. */
  actions?: ReactNode;
  /** Width on desktop. sm = 400px, md = 560px, lg = 800px. On phones every modal fills the screen. Default md. */
  size?: 'sm' | 'md' | 'lg';
  /** Block closing by clicking outside or pressing Esc (use while saving). Default false. */
  persistent?: boolean;
}

const WIDTH = { sm: 400, md: 560, lg: 800 } as const;

/**
 * A pop-up window with the standard coloured header band and a close button.
 * Fills the whole screen on phones so forms stay usable.
 */
export function Modal({ open, onClose, title, children, actions, size = 'md', persistent = false }: ModalProps) {
  const isMobile = useIsMobile();
  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (persistent && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
        onClose();
      }}
      fullScreen={isMobile}
      fullWidth
      maxWidth={false}
      aria-labelledby="sevida-modal-title"
      slotProps={{ paper: { sx: { maxWidth: isMobile ? undefined : WIDTH[size], borderRadius: isMobile ? 0 : undefined } } }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          m: isMobile ? 0 : 2,
          mb: isMobile ? 0 : 1.5,
          px: 2,
          py: 1,
          minHeight: 48,
          borderRadius: isMobile ? 0 : 1.5,
          bgcolor: 'primary.main',
          color: 'onPrimary.text',
        }}
      >
        <Typography id="sevida-modal-title" component="h2" sx={{ fontSize: '1rem', fontWeight: 700, color: 'inherit' }}>
          {title}
        </Typography>
        <IconButton aria-label="Close" onClick={onClose} sx={{ color: 'onPrimary.text', '&:hover': { bgcolor: 'onPrimary.hoverFill' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: 1.5 }}>{children}</DialogContent>
      {actions && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            gap: 1,
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            '& > :not(style) ~ :not(style)': { ml: { xs: 0, sm: 0 } },
            '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' } },
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
