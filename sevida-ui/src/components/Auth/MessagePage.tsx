import type { ReactNode } from 'react';
import { Box, CircularProgress, Stack } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import { Button } from '../Button/Button';
import { AuthLayout, AuthLink } from './AuthLayout';
import type { AuthPageBase } from './types';

type Tone = 'info' | 'success' | 'warning' | 'danger';

export function RoundIcon({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const colors = { info: ['tint.info', 'info.dark'], success: ['tint.success', 'success.dark'], warning: ['tint.warning', 'warning.dark'], danger: ['tint.danger', 'error.dark'] }[tone];
  return (
    <Box aria-hidden sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: colors[0], color: colors[1], '& svg': { fontSize: 28 } }}>
      {children}
    </Box>
  );
}

export interface MessagePageProps extends AuthPageBase {
  title: string;
  /** The explanation. */
  message?: ReactNode;
  tone?: Tone;
  /** Replace the default round icon. */
  icon?: ReactNode;
  /** Buttons and links under the message. */
  children?: ReactNode;
}

/**
 * A centred "one message, one or two buttons" page. All the status screens (check your email, session
 * expired, account locked, signed out ...) are this page with different words.
 */
export function MessagePage({ title, message, tone = 'info', icon, children, ...layout }: MessagePageProps) {
  return (
    <AuthLayout title={title} subtitle={message} icon={icon ?? <RoundIcon tone={tone}><MailOutlineIcon /></RoundIcon>} {...layout}>
      {children && <Stack spacing={1.5} alignItems="stretch">{children}</Stack>}
    </AuthLayout>
  );
}

/* ------------------------------------------------------------------ ready-made messages */

export interface CheckEmailPageProps extends AuthPageBase {
  /** The address the email went to. */
  email: string;
  /** Shows a "Resend email" button. */
  onResend?: () => Promise<void> | void;
  /** Shows "Back to sign in". */
  loginHref?: string;
  title?: string;
  /** Replaces the sentence under the title. */
  message?: ReactNode;
}

/** "We sent you an email." Used after forgot-password and after sign-up. */
export function CheckEmailPage({ email, onResend, loginHref, title = 'Check your email', message, linkComponent, ...layout }: CheckEmailPageProps) {
  return (
    <MessagePage
      title={title}
      tone="info"
      linkComponent={linkComponent}
      message={message ?? (<>We sent a link to <strong>{email}</strong>. It can take a few minutes. Check your spam folder if you do not see it.</>)}
      {...layout}
    >
      {onResend && (
        <Button variant="secondary" fullWidth onClick={() => void onResend()}>
          Resend email
        </Button>
      )}
      {loginHref && (
        <Box sx={{ textAlign: 'center', fontSize: '.875rem' }}>
          <AuthLink href={loginHref} linkComponent={linkComponent}>Back to sign in</AuthLink>
        </Box>
      )}
    </MessagePage>
  );
}

export interface SessionExpiredPageProps extends AuthPageBase {
  /** Where "Sign in again" goes. */
  loginHref?: string;
  onSignIn?: () => void;
}

/** Shown when someone was signed out for being idle. */
export function SessionExpiredPage({ loginHref, onSignIn, linkComponent, ...layout }: SessionExpiredPageProps) {
  return (
    <MessagePage title="Your session expired" tone="warning" icon={<RoundIcon tone="warning"><TimerOutlinedIcon /></RoundIcon>} message="For your security we sign you out after a period of no activity. Your work was not lost on the server. Sign in to continue." linkComponent={linkComponent} {...layout}>
      <Button fullWidth size="large" onClick={onSignIn} {...(loginHref ? { component: linkComponent ?? 'a', href: loginHref } : {})}>Sign in again</Button>
    </MessagePage>
  );
}

export interface AccountLockedPageProps extends AuthPageBase {
  /** When the account unlocks by itself, e.g. "in 15 minutes". */
  unlockInfo?: string;
  /** Shows a "Reset password" link. */
  forgotPasswordHref?: string;
  /** Shows "Contact your administrator" as plain text with this email. */
  supportEmail?: string;
}

/** Shown after too many wrong passwords. */
export function AccountLockedPage({ unlockInfo, forgotPasswordHref, supportEmail, linkComponent, ...layout }: AccountLockedPageProps) {
  return (
    <MessagePage
      title="Your account is locked"
      tone="danger"
      icon={<RoundIcon tone="danger"><LockOutlinedIcon /></RoundIcon>}
      message={<>There were too many unsuccessful sign-in attempts.{unlockInfo ? <> It will unlock automatically {unlockInfo}.</> : null} You can also reset your password now{supportEmail ? <>, or ask your administrator at <strong>{supportEmail}</strong></> : null}.</>}
      linkComponent={linkComponent}
      {...layout}
    >
      {forgotPasswordHref && (
        <Button fullWidth size="large" component={linkComponent ?? 'a'} href={forgotPasswordHref}>Reset password</Button>
      )}
    </MessagePage>
  );
}

export interface SignedOutPageProps extends AuthPageBase {
  loginHref?: string;
  onSignIn?: () => void;
}

/** "You have been signed out." Shown after choosing Sign out. */
export function SignedOutPage({ loginHref, onSignIn, linkComponent, ...layout }: SignedOutPageProps) {
  return (
    <MessagePage title="You are signed out" tone="success" icon={<RoundIcon tone="success"><LogoutIcon /></RoundIcon>} message="Thank you. You can close this window or sign in again." linkComponent={linkComponent} {...layout}>
      <Button variant="secondary" fullWidth onClick={onSignIn} {...(loginHref ? { component: linkComponent ?? 'a', href: loginHref } : {})}>Sign in again</Button>
    </MessagePage>
  );
}

export interface VerifyEmailPageProps extends AuthPageBase {
  /** 'verifying' while you check the link, then 'success' or 'failed'. */
  status: 'verifying' | 'success' | 'failed';
  /** Success: where "Continue" goes. */
  continueHref?: string;
  onContinue?: () => void;
  /** Failed: sends a new link. */
  onResend?: () => Promise<void> | void;
  email?: string;
}

/** The page behind the "Verify your email" link. Pass `status` from your own check. */
export function VerifyEmailPage({ status, continueHref, onContinue, onResend, email, linkComponent, ...layout }: VerifyEmailPageProps) {
  if (status === 'verifying') {
    return (
      <MessagePage title="Verifying your email…" tone="info" icon={<CircularProgress size={40} aria-label="Verifying" />} message="One moment please." linkComponent={linkComponent} {...layout} />
    );
  }
  if (status === 'success') {
    return (
      <MessagePage title="Email verified" tone="success" icon={<RoundIcon tone="success"><CheckCircleOutlineIcon /></RoundIcon>} message={<>{email ? <strong>{email}</strong> : 'Your email'} is confirmed. You can continue to the app.</>} linkComponent={linkComponent} {...layout}>
        <Button fullWidth size="large" onClick={onContinue} {...(continueHref ? { component: linkComponent ?? 'a', href: continueHref } : {})}>Continue</Button>
      </MessagePage>
    );
  }
  return (
    <MessagePage title="This link no longer works" tone="danger" icon={<RoundIcon tone="danger"><ErrorOutlineIcon /></RoundIcon>} message="The verification link has expired or was already used. We can send you a new one." linkComponent={linkComponent} {...layout}>
      {onResend && <Button fullWidth size="large" onClick={() => void onResend()}>Send a new link</Button>}
    </MessagePage>
  );
}

