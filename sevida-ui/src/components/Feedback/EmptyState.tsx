import { Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Replace the default icon. */
  icon?: ReactNode;
  /** Usually a Button, e.g. "Add member". */
  action?: ReactNode;
}

/** Shown when a list, table or section has nothing to display yet. */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Stack alignItems="center" textAlign="center" spacing={1} sx={{ py: { xs: 4, sm: 6 }, px: 2 }}>
      <Stack sx={{ color: 'ink.300', '& svg': { fontSize: 40 } }}>{icon ?? <InboxOutlinedIcon />}</Stack>
      <Typography variant="h5" sx={{ fontSize: '1rem' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Stack sx={{ pt: 1 }}>{action}</Stack>}
    </Stack>
  );
}
