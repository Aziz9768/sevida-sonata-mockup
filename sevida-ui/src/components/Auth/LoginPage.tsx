import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { Button } from '../Button/Button';
import { InfoBanner } from '../Feedback/InfoBanner';
import { TextField, CheckboxField } from '../Form/fields';
import { PasswordField } from '../Form/PasswordField';
import { AuthLayout, AuthLink, OrDivider } from './AuthLayout';
import { useAuthSubmit, useShowErrors } from './authHooks';
import { isEmail } from './validators';
import type { AuthPageBase } from './types';

export interface LoginValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginPageProps extends AuthPageBase {
  /**
   * Called with what the person typed. Do your sign-in here.
   * Throw an Error (for example `throw new Error('Email or password is incorrect.')`) to show that message on the form.
   */
  onSubmit: (values: LoginValues) => Promise<void> | void;
  title?: string;
  subtitle?: ReactNode;
  /** Fill the email box (e.g. from the invitation link). */
  defaultEmail?: string;
  /** What people type to identify themselves: an `email` (default, checked as an email address) or a plain `username`. With `username`, the value still arrives as `email` in `onSubmit`. */
  identifier?: 'email' | 'username';
  /** Show the "Forgot password?" link. */
  forgotPasswordHref?: string;
  /** Show "Create an account". Leave out when your client uses invite-only accounts. */
  signUpHref?: string;
  /** Show the "Keep me signed in" tick box. Default true. */
  showRememberMe?: boolean;
  /**
   * Optional single sign-on area (for example Microsoft or company-login buttons).
   * Shown under the form with an "or" line. Nothing is shown when left out.
   */
  ssoSlot?: ReactNode;
  /** A message from outside the form, e.g. "You have been signed out for inactivity." */
  notice?: { tone: 'info' | 'success' | 'warning' | 'danger'; text: string };
}

/** Email + password sign-in. */
export function LoginPage({
  onSubmit,
  title = 'Sign in',
  subtitle = 'Welcome back. Enter your details to continue.',
  defaultEmail = '',
  identifier = 'email',
  forgotPasswordHref,
  signUpHref,
  showRememberMe = true,
  ssoSlot,
  notice,
  linkComponent,
  ...layout
}: LoginPageProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { submitting, error, run } = useAuthSubmit();
  const { show, touch, markSubmitted } = useShowErrors();

  const isUsername = identifier === 'username';
  const emailError = !email.trim()
    ? isUsername ? 'Enter your username.' : 'Enter your email address.'
    : !isUsername && !isEmail(email) ? 'Enter a valid email address, like name@example.com.' : '';
  const passwordError = !password ? 'Enter your password.' : '';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    markSubmitted();
    if (emailError || passwordError) return;
    void run(() => onSubmit({ email: email.trim(), password, rememberMe }));
  };

  return (
    <AuthLayout title={title} subtitle={subtitle} {...layout}>
      <Stack component="form" noValidate onSubmit={submit} spacing={2.25}>
        {notice && <InfoBanner tone={notice.tone}>{notice.text}</InfoBanner>}
        {error && <InfoBanner tone="danger">{error}</InfoBanner>}
        <TextField
          label={isUsername ? 'Username' : 'Email'}
          type={isUsername ? 'text' : 'email'}
          autoComplete="username"
          autoFocus
          placeholder={isUsername ? 'Your username' : 'name@example.com'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => touch('email')}
          error={show('email') && !!emailError}
          helperText={show('email') ? emailError : undefined}
        />
        <Box>
          <PasswordField
            label="Password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => touch('password')}
            error={show('password') && !!passwordError}
            helperText={show('password') ? passwordError : undefined}
          />
        </Box>
        {(showRememberMe || forgotPasswordHref) && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', rowGap: 0.5, mt: -0.5, fontSize: '.8125rem' }}>
            {showRememberMe ? <CheckboxField label="Keep me signed in" checked={rememberMe} onChange={setRememberMe} /> : <span />}
            <AuthLink href={forgotPasswordHref} linkComponent={linkComponent}>
              Forgot password?
            </AuthLink>
          </Stack>
        )}
        <Button type="submit" fullWidth loading={submitting} size="large">
          Sign in
        </Button>
        {ssoSlot && (
          <>
            <OrDivider />
            <Stack spacing={1}>{ssoSlot}</Stack>
          </>
        )}
        {signUpHref && (
          <Box sx={{ textAlign: 'center', fontSize: '.875rem', color: 'ink.700' }}>
            New here?{' '}
            <AuthLink href={signUpHref} linkComponent={linkComponent}>
              Create an account
            </AuthLink>
          </Box>
        )}
      </Stack>
    </AuthLayout>
  );
}
