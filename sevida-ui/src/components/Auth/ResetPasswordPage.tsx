import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Button } from '../Button/Button';
import { InfoBanner } from '../Feedback/InfoBanner';
import { AuthLayout } from './AuthLayout';
import { MessagePage, RoundIcon } from './MessagePage';
import { NewPasswordFields, newPasswordErrors } from './NewPasswordFields';
import { useAuthSubmit, useShowErrors } from './authHooks';
import type { PasswordPolicy } from './validators';
import type { AuthPageBase } from './types';

export interface ResetPasswordPageProps extends AuthPageBase {
  /** Save the new password here. Throw an Error to show a message. */
  onSubmit: (password: string) => Promise<void> | void;
  passwordPolicy?: Partial<PasswordPolicy>;
  /** Set to true when the link in the email is expired or already used. Shows a "request a new link" page instead of the form. */
  linkExpired?: boolean;
  /** Where "Request a new link" goes. */
  forgotPasswordHref?: string;
  /** Where "Sign in" goes after the password is changed. */
  loginHref?: string;
  title?: string;
  subtitle?: ReactNode;
}

/** The page behind the link in the reset email. */
export function ResetPasswordPage({
  onSubmit,
  passwordPolicy,
  linkExpired = false,
  forgotPasswordHref,
  loginHref,
  title = 'Choose a new password',
  subtitle = 'Pick something you have not used before.',
  linkComponent,
  ...layout
}: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const { submitting, error, run } = useAuthSubmit();
  const { show, touch, markSubmitted } = useShowErrors();

  if (linkExpired) {
    return (
      <MessagePage title="This link no longer works" tone="danger" icon={<RoundIcon tone="danger"><ErrorOutlineIcon /></RoundIcon>} message="Reset links expire after a short time and can be used only once. Request a new one and try again." linkComponent={linkComponent} {...layout}>
        {forgotPasswordHref && (
          <Button fullWidth size="large" component={linkComponent ?? 'a'} href={forgotPasswordHref}>
            Request a new link
          </Button>
        )}
      </MessagePage>
    );
  }

  if (done) {
    return (
      <MessagePage title="Password updated" tone="success" icon={<RoundIcon tone="success"><CheckCircleOutlineIcon /></RoundIcon>} message="You can now sign in with your new password." linkComponent={linkComponent} {...layout}>
        {loginHref && (
          <Button fullWidth size="large" component={linkComponent ?? 'a'} href={loginHref}>
            Sign in
          </Button>
        )}
      </MessagePage>
    );
  }

  const errs = newPasswordErrors(password, confirm, passwordPolicy);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    markSubmitted();
    if (errs.password || errs.confirm) return;
    if (await run(() => onSubmit(password))) setDone(true);
  };

  return (
    <AuthLayout title={title} subtitle={subtitle} {...layout}>
      <Stack component="form" noValidate onSubmit={submit} spacing={2.25}>
        {error && <InfoBanner tone="danger">{error}</InfoBanner>}
        <NewPasswordFields password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} policy={passwordPolicy} show={show} touch={touch} passwordLabel="New password" autoFocus />
        <Button type="submit" fullWidth loading={submitting} size="large">
          Update password
        </Button>
      </Stack>
    </AuthLayout>
  );
}
