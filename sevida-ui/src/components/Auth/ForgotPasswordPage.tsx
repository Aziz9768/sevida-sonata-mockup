import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { Button } from '../Button/Button';
import { InfoBanner } from '../Feedback/InfoBanner';
import { TextField } from '../Form/fields';
import { AuthLayout, AuthLink } from './AuthLayout';
import { CheckEmailPage } from './MessagePage';
import { useAuthSubmit, useShowErrors } from './authHooks';
import { isEmail } from './validators';
import type { AuthPageBase } from './types';

export interface ForgotPasswordPageProps extends AuthPageBase {
  /**
   * Send the reset email here. Tip: show the same "check your email" result whether or not the address exists,
   * so strangers cannot find out who has an account.
   */
  onSubmit: (email: string) => Promise<void> | void;
  title?: string;
  subtitle?: ReactNode;
  loginHref?: string;
}

/** Asks for an email, sends the reset link, then switches to "Check your email". */
export function ForgotPasswordPage({
  onSubmit,
  title = 'Forgot your password?',
  subtitle = 'Enter the email you sign in with and we will send you a link to choose a new password.',
  loginHref,
  linkComponent,
  ...layout
}: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { submitting, error, run } = useAuthSubmit();
  const { show, touch, markSubmitted } = useShowErrors();
  const emailError = !email.trim() ? 'Enter your email address.' : !isEmail(email) ? 'Enter a valid email address, like name@example.com.' : '';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    markSubmitted();
    if (emailError) return;
    const ok = await run(() => onSubmit(email.trim()));
    if (ok) setSentTo(email.trim());
  };

  if (sentTo) {
    return <CheckEmailPage email={sentTo} loginHref={loginHref} linkComponent={linkComponent} onResend={() => onSubmit(sentTo)} {...layout} />;
  }

  return (
    <AuthLayout title={title} subtitle={subtitle} {...layout}>
      <Stack component="form" noValidate onSubmit={submit} spacing={2.25}>
        {error && <InfoBanner tone="danger">{error}</InfoBanner>}
        <TextField label="Email" type="email" autoComplete="email" autoFocus placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch('email')} error={show('email') && !!emailError} helperText={show('email') ? emailError : undefined} />
        <Button type="submit" fullWidth loading={submitting} size="large">
          Send reset link
        </Button>
        {loginHref && (
          <Box sx={{ textAlign: 'center', fontSize: '.875rem' }}>
            <AuthLink href={loginHref} linkComponent={linkComponent}>
              Back to sign in
            </AuthLink>
          </Box>
        )}
      </Stack>
    </AuthLayout>
  );
}
