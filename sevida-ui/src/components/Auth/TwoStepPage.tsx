import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { Button } from '../Button/Button';
import { InfoBanner } from '../Feedback/InfoBanner';
import { CheckboxField } from '../Form/fields';
import { CodeField } from '../Form/CodeField';
import { AuthLayout, AuthLink } from './AuthLayout';
import { useAuthSubmit } from './authHooks';
import type { AuthPageBase } from './types';

export interface TwoStepPageProps extends AuthPageBase {
  /** Check the code here. Throw an Error("That code is not right.") to show it under the boxes. */
  onSubmit: (values: { code: string; trustDevice: boolean }) => Promise<void> | void;
  /** Send a new code. Shows a "Resend code" button that waits `resendSeconds` between uses. Leave out for authenticator-app codes. */
  onResend?: () => Promise<void> | void;
  resendSeconds?: number;
  /** Where the code went, e.g. "a•••@example.com" or "the number ending 42". Leave out for an authenticator app. */
  sentTo?: string;
  codeLength?: number;
  /** Shows the "Do not ask again on this device" tick box. */
  allowTrustDevice?: boolean;
  /** Shows "Use a different account". */
  backHref?: string;
  onBack?: () => void;
  title?: string;
  subtitle?: ReactNode;
}

/** Second step of sign-in: type the code from a text, email or authenticator app. */
export function TwoStepPage({
  onSubmit,
  onResend,
  resendSeconds = 30,
  sentTo,
  codeLength = 6,
  allowTrustDevice = false,
  backHref,
  onBack,
  title = 'Two-step verification',
  subtitle,
  linkComponent,
  ...layout
}: TwoStepPageProps) {
  const [code, setCode] = useState('');
  const [trust, setTrust] = useState(false);
  const [wrongLength, setWrongLength] = useState(false);
  const [wait, setWait] = useState(resendSeconds);
  const [resent, setResent] = useState(false);
  const { submitting, error, run } = useAuthSubmit();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (code.length < codeLength) return setWrongLength(true);
    setWrongLength(false);
    void run(() => onSubmit({ code, trustDevice: trust }));
  };

  const resend = async () => {
    setResent(false);
    await onResend?.();
    setResent(true);
    setWait(resendSeconds);
  };

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle ?? (sentTo ? <>Enter the {codeLength}-digit code we sent to <strong>{sentTo}</strong>.</> : `Enter the ${codeLength}-digit code from your authenticator app.`)}
      {...layout}
    >
      <Stack component="form" noValidate onSubmit={submit} spacing={2.25}>
        {resent && !error && <InfoBanner tone="success" onClose={() => setResent(false)}>A new code is on its way.</InfoBanner>}
        <CodeField
          value={code}
          onChange={(v) => {
            setCode(v);
            setWrongLength(false);
          }}
          length={codeLength}
          autoFocus
          error={!!error || wrongLength}
          helperText={error ?? (wrongLength ? `Enter all ${codeLength} digits.` : undefined)}
        />
        {allowTrustDevice && <CheckboxField label="Do not ask again on this device for 30 days" checked={trust} onChange={setTrust} />}
        <Button type="submit" fullWidth loading={submitting} size="large">
          Verify
        </Button>
        <Stack alignItems="center" spacing={1} sx={{ fontSize: '.875rem', color: 'ink.700' }}>
          {onResend && (
            <Box>
              Did not get a code?{' '}
              {wait > 0 ? (
                <Box component="span" sx={{ color: 'ink.500' }}>Resend in {wait}s</Box>
              ) : (
                <AuthLink onClick={() => void resend()}>Resend code</AuthLink>
              )}
            </Box>
          )}
          <AuthLink href={backHref} onClick={onBack} linkComponent={linkComponent}>
            Use a different account
          </AuthLink>
        </Stack>
      </Stack>
    </AuthLayout>
  );
}
