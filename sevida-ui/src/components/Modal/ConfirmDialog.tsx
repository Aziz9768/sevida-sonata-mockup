import { Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { Modal } from './Modal';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will happen. Say it plainly: "This member will no longer receive tasks." */
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' makes the confirm button red. Use it for delete / deactivate. Default 'primary'. */
  tone?: 'primary' | 'danger';
  /** Disables the buttons and shows a spinner while the action runs. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** "Are you sure?" pop-up. Use it before ANY status change or delete. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      persistent={loading}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Typography component="div" sx={{ fontSize: '.875rem', fontWeight: 400, color: 'text.secondary', lineHeight: 1.5 }}>
        {message}
      </Typography>
    </Modal>
  );
}
