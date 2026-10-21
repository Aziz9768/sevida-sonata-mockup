import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { Button } from '../Button/Button';
import { InfoBanner } from '../Feedback/InfoBanner';
import { TextField, CheckboxField } from '../Form/fields';
import { AuthLayout, AuthLink, OrDivider } from './AuthLayout';
import { NewPasswordFields, newPasswordErrors } from './NewPasswordFields';
import { useAuthSubmit, useShowErrors } from './authHooks';
import { isEmail } from './validators';
import type { PasswordPolicy } from './validators';
import type { AuthPageBase } from './types';

export interface SignUpValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface SignUpPageProps extends AuthPageBase {
  /** Create the account here. Throw an Error to show its message on the form (e.g. "That email is already registered."). */
  onSubmit: (values: SignUpValues) => Promise<void> | void;
  title?: string;
  subtitle?: ReactNode;
  passwordPolicy?: Partial<PasswordPolicy>;
  /** Shows "Already have an account? Sign in". */
  loginHref?: string;
  /** The words next to the "I agree" box, usually with links: <>I agree to the <a href="/terms">Terms</a></>. Leave out for no tick box. */
  termsLabel?: ReactNode;
  /** Optional single sign-on buttons, same as the sign-in page. */
  ssoSlot?: ReactNode;
}

/** Open sign-up: anyone can create an account. (For invite-only, use AcceptInvitationPage instead.) */
export function SignUpPage({
  onSubmit,
  title = 'Create your account',
  subtitle = 'It only takes a minute.',
  passwordPolicy,
  loginHref,
  termsLabel,
  ssoSlot,
  linkComponent,
  ...layout
}: SignUpPageProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const { submitting, error, run } = useAuthSubmit();
  const { show, touch, markSubmitted } = useShowErrors();

  const pw = newPasswordErrors(password, confirm, passwordPolicy);
  const errs = {
    firstName: firstName.trim() ? '' : 'Enter your first name.',
    lastName: lastName.trim() ? '' : 'Enter your last name.',
    email: !email.trim() ? 'Enter your email address.' : !isEmail(email) ? 'Enter a valid email address, like name@example.com.' : '',
    terms: termsLabel && !agreed ? 'Please agree to continue.' : '',
  };
  const hasErrors = Object.values(errs).some(Boolean) || !!pw.password || !!pw.confirm;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    markSubmitted();
    if (hasErrors) return;
    void run(() => onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password }));
  };

  return (
    <AuthLayout title={title} subtitle={subtitle} wide {...layout}>
      <Stack component="form" noValidate onSubmit={submit} spacing={2.25}>
        {error && <InfoBanner tone="danger">{error}</InfoBanner>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.25}>
          <TextField label="First name" autoComplete="given-name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch('firstName')} error={show('firstName') && !!errs.firstName} helperText={show('firstName') ? errs.firstName : undefined} fullWidth />
          <TextField label="Last name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch('lastName')} error={show('lastName') && !!errs.lastName} helperText={show('lastName') ? errs.lastName : undefined} fullWidth />
        </Stack>
        <TextField label="Email" type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => touch('email')} error={show('email') && !!errs.email} helperText={show('email') ? errs.email : undefined} />
        <NewPasswordFields
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
          policy={passwordPolicy}
          show={show}
          touch={touch}
        />
        {termsLabel && <CheckboxField label={termsLabel} checked={agreed} onChange={setAgreed} error={show('terms') && !!errs.terms} helperText={show('terms') ? errs.terms : undefined} />}
        <Button type="submit" fullWidth loading={submitting} size="large">
          Create account
        </Button>
        {ssoSlot && (
          <>
            <OrDivider />
            <Stack spacing={1}>{ssoSlot}</Stack>
          </>
        )}
        {loginHref && (
          <Box sx={{ textAlign: 'center', fontSize: '.875rem', color: 'ink.700' }}>
            Already have an account?{' '}
            <AuthLink href={loginHref} linkComponent={linkComponent}>
              Sign in
            </AuthLink>
          </Box>
        )}
      </Stack>
    </AuthLayout>
  );
}
