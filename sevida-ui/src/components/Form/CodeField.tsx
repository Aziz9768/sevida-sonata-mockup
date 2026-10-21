import { useRef } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { Box, FormHelperText, FormLabel, Stack } from '@mui/material';

export interface CodeFieldProps {
  /** What the person has typed so far (digits only). */
  value: string;
  onChange: (value: string) => void;
  /** Number of boxes. Default 6. */
  length?: number;
  label?: string;
  error?: boolean;
  helperText?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * One box per digit, for the code sent by text or an authenticator app.
 * Typing moves to the next box, Backspace to the previous one, and pasting a whole code fills every box.
 */
export function CodeField({ value, onChange, length = 6, label = 'Verification code', error, helperText, autoFocus, disabled }: CodeFieldProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const focus = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const setDigit = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focus(pasted.length >= length ? length - 1 : pasted.length);
  };

  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i]) {
      e.preventDefault();
      if (i > 0) {
        setDigit(i - 1, '');
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft') focus(i - 1);
    else if (e.key === 'ArrowRight') focus(i + 1);
  };

  return (
    <Box role="group" aria-label={label}>
      <FormLabel error={error} sx={{ display: 'block', fontSize: '.8125rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
        {label}
      </FormLabel>
      <Stack direction="row" spacing={{ xs: 0.75, sm: 1 }} justifyContent={{ xs: 'space-between', sm: 'flex-start' }}>
        {digits.map((d, i) => (
          <Box
            key={i}
            component="input"
            ref={(el: HTMLInputElement | null) => {
              refs.current[i] = el;
            }}
            value={d}
            disabled={disabled}
            autoFocus={autoFocus && i === 0}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={error || undefined}
            onFocus={(e) => e.currentTarget.select()}
            onPaste={onPaste}
            onKeyDown={onKeyDown(i)}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(-1);
              setDigit(i, v);
              if (v) focus(i + 1);
            }}
            sx={{
              width: { xs: 'auto', sm: 48 },
              flex: { xs: '1 1 0', sm: '0 0 auto' },
              minWidth: 0,
              maxWidth: { xs: 56, sm: 48 },
              height: { xs: 52, sm: 56 },
              textAlign: 'center',
              fontFamily: 'inherit',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'text.primary',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: error ? 'error.main' : 'ink.300',
              borderRadius: 1.5,
              outline: 'none',
              '&:focus': { borderColor: 'primary.main', boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}33` },
              '&:disabled': { bgcolor: 'surfaceAlt' },
            }}
          />
        ))}
      </Stack>
      {helperText && <FormHelperText error={error}>{helperText}</FormHelperText>}
    </Box>
  );
}
