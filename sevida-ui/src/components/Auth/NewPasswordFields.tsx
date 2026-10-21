import { Stack } from '@mui/material';
import { PasswordField } from '../Form/PasswordField';
import { PasswordRules } from './PasswordRules';
import { passwordIsValid } from './validators';
import type { PasswordPolicy } from './validators';

/** Error messages for a "new password + repeat it" pair. Empty string = fine. */
export function newPasswordErrors(password: string, confirm: string, policy?: Partial<PasswordPolicy>) {
  return {
    password: !password ? 'Choose a password.' : !passwordIsValid(password, policy) ? 'This password does not meet all the rules below.' : '',
    confirm: !confirm ? 'Type the password again.' : confirm !== password ? 'The two passwords do not match.' : '',
  };
}

export interface NewPasswordFieldsProps {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  policy?: Partial<PasswordPolicy>;
  /** Which errors may be shown now (see useShowErrors). */
  show: (key: 'password' | 'confirm') => boolean;
  touch: (key: 'password' | 'confirm') => void;
  passwordLabel?: string;
  autoFocus?: boolean;
}

/** "New password", the rules checklist, and "Confirm password". Used by sign up, reset, invitation and change password. */
export function NewPasswordFields({ password, confirm, onPasswordChange, onConfirmChange, policy, show, touch, passwordLabel = 'Password', autoFocus }: NewPasswordFieldsProps) {
  const errors = newPasswordErrors(password, confirm, policy);
  return (
    <Stack spacing={2.25}>
      <Stack spacing={1.25}>
        <PasswordField
          label={passwordLabel}
          autoComplete="new-password"
          autoFocus={autoFocus}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          onBlur={() => touch('password')}
          error={show('password') && !!errors.password}
          helperText={show('password') && errors.password ? errors.password : undefined}
        />
        <PasswordRules password={password} policy={policy} />
      </Stack>
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => onConfirmChange(e.target.value)}
        onBlur={() => touch('confirm')}
        error={show('confirm') && !!errors.confirm}
        helperText={show('confirm') && errors.confirm ? errors.confirm : undefined}
      />
    </Stack>
  );
}
