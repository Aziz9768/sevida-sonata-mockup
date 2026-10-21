import { Box, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { checkPassword } from './validators';
import type { PasswordPolicy } from './validators';

export interface PasswordRulesProps {
  password: string;
  policy?: Partial<PasswordPolicy>;
}

/** A small checklist under a new-password box: each rule turns green as it is met. */
export function PasswordRules({ password, policy }: PasswordRulesProps) {
  const rules = checkPassword(password, policy);
  const met = rules.filter((r) => r.met).length;
  return (
    <Box aria-live="polite">
      <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'divider', overflow: 'hidden', mb: 1 }} aria-hidden>
        <Box sx={{ height: '100%', width: `${(met / rules.length) * 100}%`, bgcolor: met === rules.length ? 'success.main' : 'warning.main', transition: 'width .2s' }} />
      </Box>
      <Stack component="ul" spacing={0.25} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {rules.map((r) => (
          <Stack component="li" key={r.key} direction="row" alignItems="center" spacing={0.75}>
            {r.met ? <CheckCircleIcon sx={{ fontSize: 15, color: 'success.main' }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 15, color: 'ink.300' }} />}
            <Typography sx={{ fontSize: '.75rem', color: r.met ? 'success.dark' : 'ink.500', fontWeight: r.met ? 600 : 500 }}>
              {r.label}
              <Box component="span" sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', whiteSpace: 'nowrap', clip: 'rect(0 0 0 0)' }}>
                {r.met ? ' (done)' : ' (not yet)'}
              </Box>
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
