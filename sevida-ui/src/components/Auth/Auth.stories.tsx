import type { Meta, StoryObj } from '@storybook/react-vite';
import { forwardRef, createContext, useContext, useState } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import MicrosoftIcon from '@mui/icons-material/Business';
import GoogleIcon from '@mui/icons-material/Google';
import { Button } from '../Button/Button';
import { ConfirmDialog } from '../Modal/ConfirmDialog';
import { SevidaThemeProvider } from '../../theme/SevidaThemeProvider';
import { LoginPage } from './LoginPage';
import { SignUpPage } from './SignUpPage';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';
import { TwoStepPage } from './TwoStepPage';
import { AcceptInvitationPage } from './AcceptInvitationPage';
import { ChangePasswordCard } from './ChangePasswordCard';
import { AccountLockedPage, CheckEmailPage, SessionExpiredPage, SignedOutPage, VerifyEmailPage } from './MessagePage';
import { NotFoundPage, NoAccessPage, ServerErrorPage } from './ErrorPage';

const DOCS = `
Every sign-in and account screen, ready to use. Each one is a **page** (a centred card on a plain background; on a phone the card
disappears and the form fills the screen). They do **no network calls**: you pass \`onSubmit\` and do your own sign-in. If \`onSubmit\`
throws \`new Error('Message')\`, that message appears on the form.

\`\`\`tsx
<LoginPage
  appName="Sonata"
  logo={<img src="/client-logo.svg" height={32} />}
  forgotPasswordHref="/forgot-password"
  signUpHref="/sign-up"        // leave out for invite-only clients
  onSubmit={async ({ email, password }) => {
    const res = await api.signIn(email, password);
    if (!res.ok) throw new Error('Email or password is incorrect.');
  }}
/>
\`\`\`

### Which screens exist

| Screen | Component |
|---|---|
| Sign in (with optional single sign-on buttons) | \`LoginPage\` |
| Create account (open sign-up) | \`SignUpPage\` |
| Create account from an invitation (invite-only) | \`AcceptInvitationPage\` |
| Forgot password, then "Check your email" | \`ForgotPasswordPage\` (+ \`CheckEmailPage\`) |
| Choose a new password (link from the email; also expired-link view) | \`ResetPasswordPage\` |
| Two-step code | \`TwoStepPage\` |
| Verify email link result | \`VerifyEmailPage\` |
| Session expired, Account locked, Signed out | \`SessionExpiredPage\`, \`AccountLockedPage\`, \`SignedOutPage\` |
| Change password (signed in) | \`ChangePasswordCard\` (a Card, not a page) |
| 404, 403, 500 | \`NotFoundPage\`, \`NoAccessPage\`, \`ServerErrorPage\` |

### Invite-only, open sign-up, or both

* **Invite-only:** do not pass \`signUpHref\` to \`LoginPage\`; use \`AcceptInvitationPage\` for the emailed link.
* **Open sign-up:** pass \`signUpHref\` and use \`SignUpPage\`.
* **Both:** use both. It is just a choice of which pages and links you switch on per client.

### Password rules

All password screens use the same rules (8+ characters, upper + lower case, a number). Change them per page:
\`passwordPolicy={{ minLength: 12, requireSymbol: true }}\`. The server must still check the password: the page only guides people.

### Links and routing

Pass \`linkComponent\` once (your router's link). Without it, plain \`<a href>\` links are used.

### Single sign-on

Pass \`ssoSlot={<Button variant="secondary" fullWidth>Continue with company login</Button>}\` to \`LoginPage\` / \`SignUpPage\`.
Nothing shows when it is left out.
`;

const meta: Meta = { title: 'Examples/Sign-in and accounts', parameters: { layout: 'fullscreen', docs: { description: { component: DOCS } } }, tags: ['autodocs'] };
export default meta;
type Story = StoryObj;

const wait = (ms = 700) => new Promise<void>((r) => setTimeout(r, ms));
const brand = { appName: 'Sonata', footer: <>© 2026 Your organisation · <a href="#privacy">Privacy</a> · <a href="#terms">Terms</a></> };
const terms = <>I agree to the <a href="#terms">Terms of use</a> and <a href="#privacy">Privacy notice</a></>;

/* ------------------------------------------------------------------ sign in */

export const SignIn: Story = {
  name: 'Sign in',
  render: () => (
    <LoginPage
      {...brand}
      forgotPasswordHref="#forgot"
      signUpHref="#signup"
      onSubmit={async ({ password }) => {
        await wait();
        if (password !== 'Welcome123') throw new Error('Email or password is incorrect. (Try the password Welcome123)');
      }}
    />
  ),
};

export const SignInWithSingleSignOn: Story = {
  name: 'Sign in, with single sign-on buttons',
  render: () => (
    <LoginPage
      {...brand}
      forgotPasswordHref="#forgot"
      ssoSlot={
        <>
          <Button variant="secondary" fullWidth startIcon={<MicrosoftIcon />}>Continue with Microsoft</Button>
          <Button variant="secondary" fullWidth startIcon={<GoogleIcon />}>Continue with Google</Button>
        </>
      }
      onSubmit={() => wait()}
    />
  ),
};

export const SignInInviteOnly: Story = {
  name: 'Sign in, invite-only client (no sign-up link)',
  render: () => <LoginPage {...brand} forgotPasswordHref="#forgot" notice={{ tone: 'warning', text: 'You were signed out because you were inactive for 15 minutes.' }} onSubmit={() => wait()} />,
};

export const SignInPhone: Story = {
  name: 'Sign in, on a phone',
  parameters: { viewport: { defaultViewport: 'phone' } },
  render: () => <LoginPage {...brand} forgotPasswordHref="#forgot" signUpHref="#signup" onSubmit={() => wait()} />,
};

export const SignInOtherBrand: Story = {
  name: 'Sign in, re-branded for another client',
  render: () => (
    <SevidaThemeProvider brand={{ primary: '#0B5D5B', secondary: '#1B7F9E' }}>
      <LoginPage
        appName="Harbor Health Portal"
        logo={<Box aria-hidden sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>H</Box>}
        footer="© 2026 Harbor Health"
        forgotPasswordHref="#forgot"
        signUpHref="#signup"
        onSubmit={() => wait()}
      />
    </SevidaThemeProvider>
  ),
};

/* ------------------------------------------------------------------ create account */

export const SignUp: Story = {
  name: 'Sign up (open)',
  render: () => (
    <SignUpPage
      {...brand}
      loginHref="#login"
      termsLabel={terms}
      onSubmit={async ({ email }) => {
        await wait();
        if (email.startsWith('taken')) throw new Error('That email is already registered. Try signing in instead.');
      }}
    />
  ),
};

export const InvitationAccept: Story = {
  name: 'Accept invitation (invite-only)',
  render: () => (
    <AcceptInvitationPage {...brand} email="maria.lopez@example.org" invitedBy="Priya Shah" organization="Riverside Care Team" defaultFirstName="Maria" termsLabel={terms} onSubmit={() => wait()} />
  ),
};

export const InvitationExpired: Story = {
  name: 'Invitation expired',
  render: () => <AcceptInvitationPage {...brand} expired email="maria.lopez@example.org" onSubmit={() => undefined} />,
};

/* ------------------------------------------------------------------ passwords */

export const ForgotPassword: Story = {
  name: 'Forgot password',
  render: () => <ForgotPasswordPage {...brand} loginHref="#login" onSubmit={() => wait()} />,
};

export const CheckYourEmail: Story = {
  name: 'Check your email',
  render: () => <CheckEmailPage {...brand} email="maria.lopez@example.org" loginHref="#login" onResend={() => wait()} />,
};

export const ResetPassword: Story = {
  name: 'Reset password (new password)',
  render: () => <ResetPasswordPage {...brand} loginHref="#login" onSubmit={() => wait()} />,
};

export const ResetLinkExpired: Story = {
  name: 'Reset link expired',
  render: () => <ResetPasswordPage {...brand} linkExpired forgotPasswordHref="#forgot" onSubmit={() => undefined} />,
};

export const StrongerRules: Story = {
  name: 'Reset password, stricter rules',
  render: () => <ResetPasswordPage {...brand} passwordPolicy={{ minLength: 12, requireSymbol: true }} onSubmit={() => wait()} />,
};

export const ChangePassword: Story = {
  name: 'Change password (signed in)',
  parameters: { layout: 'padded' },
  render: () => (
    <Box sx={{ maxWidth: 720 }}>
      <ChangePasswordCard
        onSubmit={async ({ currentPassword }) => {
          await wait();
          if (currentPassword !== 'Welcome123') throw new Error('Your current password is not correct. (Try Welcome123)');
        }}
      />
    </Box>
  ),
};

/* ------------------------------------------------------------------ two-step + status */

export const TwoStep: Story = {
  name: 'Two-step verification',
  render: () => (
    <TwoStepPage
      {...brand}
      sentTo="the number ending 42"
      allowTrustDevice
      onBack={() => undefined}
      onResend={() => wait()}
      resendSeconds={10}
      onSubmit={async ({ code }) => {
        await wait();
        if (code !== '123456') throw new Error('That code is not right. (Try 123456)');
      }}
    />
  ),
};

export const TwoStepAuthenticator: Story = {
  name: 'Two-step, authenticator app',
  render: () => <TwoStepPage {...brand} onBack={() => undefined} onSubmit={() => wait()} />,
};

export const SessionExpired: Story = { name: 'Session expired', render: () => <SessionExpiredPage {...brand} loginHref="#login" /> };
export const AccountLocked: Story = { name: 'Account locked', render: () => <AccountLockedPage {...brand} unlockInfo="in 15 minutes" forgotPasswordHref="#forgot" supportEmail="support@example.org" /> };
export const SignedOut: Story = { name: 'Signed out', render: () => <SignedOutPage {...brand} loginHref="#login" /> };
export const VerifyEmailWorking: Story = { name: 'Verify email: checking', render: () => <VerifyEmailPage {...brand} status="verifying" /> };
export const VerifyEmailDone: Story = { name: 'Verify email: done', render: () => <VerifyEmailPage {...brand} status="success" email="maria.lopez@example.org" continueHref="#app" /> };
export const VerifyEmailFailed: Story = { name: 'Verify email: link expired', render: () => <VerifyEmailPage {...brand} status="failed" onResend={() => wait()} /> };

/* ------------------------------------------------------------------ error pages */

export const Error404: Story = { name: '404 Not found', render: () => <NotFoundPage homeHref="#home" onGoBack={() => undefined} /> };
export const Error403: Story = { name: '403 No access', render: () => <NoAccessPage homeHref="#home" onSignOut={() => undefined} /> };
export const Error500: Story = { name: '500 Something went wrong', render: () => <ServerErrorPage homeHref="#home" onRetry={() => undefined} reference="7F3A-91C2" /> };

/* ------------------------------------------------------------------ clickable flow */

const Nav = createContext<(screen: string) => void>(() => undefined);
/** Demo router link: "#signup" switches the screen. In a real app use your router's link. */
const FlowLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(function FlowLink({ href = '', onClick, ...rest }, ref) {
  const go = useContext(Nav);
  return (
    <a
      ref={ref}
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        e.preventDefault();
        go(href.replace('#', ''));
      }}
    />
  );
});

function Flow() {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [confirmOut, setConfirmOut] = useState(false);
  const common = { ...brand, linkComponent: FlowLink };
  const body = (() => {
    switch (screen) {
      case 'signup':
        return <SignUpPage {...common} loginHref="#login" termsLabel={terms} onSubmit={async ({ email: e }) => { await wait(); setEmail(e); setScreen('verify'); }} />;
      case 'verify':
        return <CheckEmailPage {...common} email={email || 'you@example.org'} loginHref="#login" onResend={() => wait()} />;
      case 'forgot':
        return <ForgotPasswordPage {...common} loginHref="#login" onSubmit={() => wait()} />;
      case 'reset':
        return <ResetPasswordPage {...common} loginHref="#login" onSubmit={() => wait()} />;
      case 'twostep':
        return <TwoStepPage {...common} sentTo="the number ending 42" onResend={() => wait()} resendSeconds={5} backHref="#login" onSubmit={async ({ code }) => { await wait(); if (code !== '123456') throw new Error('That code is not right. (Try 123456)'); setScreen('app'); }} />;
      case 'app':
        return (
          <Box sx={{ minHeight: '100dvh', p: { xs: 2, sm: 4 }, bgcolor: 'surfaceAlt' }}>
            <Stack spacing={2.5} sx={{ maxWidth: 720, mx: 'auto' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h3" component="h1" sx={{ color: 'primary.main' }}>You are signed in</Typography>
                <Button variant="secondary" onClick={() => setConfirmOut(true)}>Sign out</Button>
              </Stack>
              <ChangePasswordCard onSubmit={() => wait()} />
            </Stack>
            <ConfirmDialog open={confirmOut} title="Sign out?" message="You will need to sign in again to continue." confirmLabel="Sign out" onCancel={() => setConfirmOut(false)} onConfirm={() => { setConfirmOut(false); setScreen('signedout'); }} />
          </Box>
        );
      case 'signedout':
        return <SignedOutPage {...common} loginHref="#login" />;
      default:
        return (
          <LoginPage
            {...common}
            forgotPasswordHref="#forgot"
            signUpHref="#signup"
            onSubmit={async ({ password }) => {
              await wait();
              if (password !== 'Welcome123') throw new Error('Email or password is incorrect. (Try the password Welcome123)');
              setScreen('twostep');
            }}
          />
        );
    }
  })();
  return <Nav.Provider value={setScreen}>{body}</Nav.Provider>;
}

export const ClickThroughFlow: Story = {
  name: 'Click-through: sign in → code → app → sign out',
  parameters: { docs: { description: { story: 'Try it: password **Welcome123**, then code **123456**. Also try Forgot password and Create an account.' } } },
  render: () => <Flow />,
};
