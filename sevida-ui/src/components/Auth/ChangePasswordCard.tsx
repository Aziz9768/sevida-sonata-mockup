import { useState } from 'react';
import type { FormEvent } from 'react';
import { Stack } from '@mui/material';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { InfoBanner } from '../Feedback/InfoBanner';
import { PasswordField } from '../Form/PasswordField';
import { NewPasswordFields, newPasswordErrors } from './NewPasswordFields';
import { useAuthSubmit, useShowErrors } from './authHooks';
import type { PasswordPolicy } from './validators';

export interface ChangePasswordCardProps {
  /** Save here. Throw an Error("Your current password is not correct.") to show it. */
  onSubmit: (values: { currentPassword: string; newPassword: string }) => Promise<void> | void;
  passwordPolicy?: Partial<PasswordPolicy>;
  /** Heading of the card. */
  title?: string;
}

/** For a signed-in person on their profile / security page. Not a full page: drop it inside any page. */
export function ChangePasswordCard({ onSubmit, passwordPolicy, title = 'Change password' }: ChangePasswordCardProps) {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saved, setSaved] = useState(false);
  const { submitting, error, run } = useAuthSubmit();
  const { show, touch, markSubmitted } = useShowErrors();

  const pw = newPasswordErrors(password, confirm, passwordPolicy);
  const currentError = current ? '' : 'Enter your current password.';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    markSubmitted();
    if (currentError || pw.password || pw.confirm) return;
    if (await run(() => onSubmit({ currentPassword: current, newPassword: password }))) {
      setSaved(true);
      setCurrent('');
      setPassword('');
      setConfirm('');
    }
  };

  return (
    <Card title={title} hint="You will stay signed in on this device.">
      <Stack component="form" noValidate onSubmit={submit} spacing={2.25} sx={{ maxWidth: 440 }}>
        {saved && <InfoBanner tone="success" onClose={() => setSaved(false)}>Your password was changed.</InfoBanner>}
        {error && <InfoBanner tone="danger">{error}</InfoBanner>}
        <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} onBlur={() => touch('current')} error={show('current') && !!currentError} helperText={show('current') ? currentError : undefined} />
        <NewPasswordFields password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} policy={passwordPolicy} show={show} touch={touch} passwordLabel="New password" />
        <Stack direction="row" justifyContent={{ sm: 'flex-start' }}>
          <Button type="submit" loading={submitting} fullWidthOnMobile>
            Update password
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
