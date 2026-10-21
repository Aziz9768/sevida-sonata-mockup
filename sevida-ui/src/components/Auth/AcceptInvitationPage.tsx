import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Stack } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Button } from '../Button/Button';
import { InfoBanner } from '../Feedback/InfoBanner';
import { TextField, CheckboxField } from '../Form/fields';
import { AuthLayout } from './AuthLayout';
import { MessagePage, RoundIcon } from './MessagePage';
import { NewPasswordFields, newPasswordErrors } from './NewPasswordFields';
import { useAuthSubmit, useShowErrors } from './authHooks';
import type { PasswordPolicy } from './validators';
import type { AuthPageBase } from './types';

export interface AcceptInvitationValues {
  firstName: string;
  lastName: string;
  password: string;
}

export interface AcceptInvitationPageProps extends AuthPageBase {
  /** The address the invitation was sent to (shown, cannot be changed). */
  email: string;
  /** Who invited them, e.g. "Priya Shah". */
  invitedBy?: string;
  /** Which organisation or program they were invited to. */
  organization?: string;
  /** Names to start with, if the admin already typed them. */
  defaultFirstName?: string;
  defaultLastName?: string;
  /** Create the account here. Throw an Error to show a message. */
  onSubmit: (values: AcceptInvitationValues) => Promise<void> | void;
  passwordPolicy?: Partial<PasswordPolicy>;
  termsLabel?: ReactNode;
  /** True when the invitation is old or was cancelled. Shows "ask for a new invitation". */
  expired?: boolean;
  /** Who to contact when expired, e.g. "your administrator". */
  contactText?: string;
}

/** Invite-only accounts: the person opens the emailed link, confirms their name and chooses a password. */
export function AcceptInvitationPage({
  email,
  invitedBy,
  organization,
  defaultFirstName = '',
  defaultLastName = '',
  onSubmit,
  passwordPolicy,
  termsLabel,
  expired = false,
  contactText = 'your administrator',
  linkComponent,
  ...layout
}: AcceptInvitationPageProps) {
  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const { submitting, error, run } = useAuthSubmit();
  const { show, touch, markSubmitted } = useShowErrors();

  if (expired) {
    return (
      <MessagePage title="This invitation is no longer valid" tone="danger" icon={<RoundIcon tone="danger"><ErrorOutlineIcon /></RoundIcon>} message={<>Invitations expire after a while or can be cancelled. Please ask {contactText} to send you a new one.</>} linkComponent={linkComponent} {...layout} />
    );
  }

  const pw = newPasswordErrors(password, confirm, passwordPolicy);
  const errs = {
    firstName: firstName.trim() ? '' : 'Enter your first name.',
    lastName: lastName.trim() ? '' : 'Enter your last name.',
    terms: termsLabel && !agreed ? 'Please agree to continue.' : '',
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    markSubmitted();
    if (Object.values(errs).some(Boolean) || pw.password || pw.confirm) return;
    void run(() => onSubmit({ firstName: firstName.trim(), lastName: lastName.trim(), password }));
  };

  const who = [invitedBy && `${invitedBy} invited you`, organization && `to join ${organization}`].filter(Boolean).join(' ');

  return (
    <AuthLayout
      title="Set up your account"
      subtitle={<>{who ? `${who}. ` : ''}Confirm your details and choose a password.</>}
      wide
      {...layout}
    >
      <Stack component="form" noValidate onSubmit={submit} spacing={2.25}>
        {error && <InfoBanner tone="danger">{error}</InfoBanner>}
        <TextField label="Email" value={email} disabled helperText="This is the address your invitation was sent to." />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.25}>
          <TextField label="First name" autoComplete="given-name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={() => touch('firstName')} error={show('firstName') && !!errs.firstName} helperText={show('firstName') ? errs.firstName : undefined} fullWidth />
          <TextField label="Last name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={() => touch('lastName')} error={show('lastName') && !!errs.lastName} helperText={show('lastName') ? errs.lastName : undefined} fullWidth />
        </Stack>
        <NewPasswordFields password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} policy={passwordPolicy} show={show} touch={touch} />
        {termsLabel && <CheckboxField label={termsLabel} checked={agreed} onChange={setAgreed} error={show('terms') && !!errs.terms} helperText={show('terms') ? errs.terms : undefined} />}
        <Button type="submit" fullWidth loading={submitting} size="large">
          Create account
        </Button>
      </Stack>
    </AuthLayout>
  );
}
