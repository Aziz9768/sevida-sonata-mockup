export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Rules a new password must follow. Pass a partial one to any page to change the defaults. */
export interface PasswordPolicy {
  minLength: number;
  /** Needs at least one capital AND one lower-case letter. */
  requireMixedCase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

export const defaultPasswordPolicy: PasswordPolicy = {
  minLength: 8,
  requireMixedCase: true,
  requireNumber: true,
  requireSymbol: false,
};

export interface PasswordRuleResult {
  key: string;
  label: string;
  met: boolean;
}

/** Checks a password against the policy. One entry per rule, in the order they are shown. */
export function checkPassword(password: string, policy: Partial<PasswordPolicy> = {}): PasswordRuleResult[] {
  const p = { ...defaultPasswordPolicy, ...policy };
  const rules: PasswordRuleResult[] = [{ key: 'length', label: `At least ${p.minLength} characters`, met: password.length >= p.minLength }];
  if (p.requireMixedCase) rules.push({ key: 'case', label: 'An upper-case and a lower-case letter', met: /[a-z]/.test(password) && /[A-Z]/.test(password) });
  if (p.requireNumber) rules.push({ key: 'number', label: 'A number', met: /\d/.test(password) });
  if (p.requireSymbol) rules.push({ key: 'symbol', label: 'A symbol, like ! or #', met: /[^A-Za-z0-9\s]/.test(password) });
  return rules;
}

export const passwordIsValid = (password: string, policy?: Partial<PasswordPolicy>) => checkPassword(password, policy).every((r) => r.met);
