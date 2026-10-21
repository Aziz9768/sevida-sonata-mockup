import { forwardRef, useState } from 'react';
import { InputAdornment } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { IconButton } from '../Button/Button';
import { TextField } from './fields';
import type { TextFieldProps } from './fields';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'multiline' | 'select' | 'maxLength'>;

/**
 * A password box with a Show / Hide eye button. The label sits above the box like every other field.
 * Set `autoComplete` to "current-password" when signing in and "new-password" when choosing one,
 * so browsers and password managers behave.
 */
export const PasswordField = forwardRef<HTMLDivElement, PasswordFieldProps>(function PasswordField({ slotProps, ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      ref={ref}
      type={visible ? 'text' : 'password'}
      slotProps={{
        ...slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={() => setVisible((v) => !v)} edge="end" size="small">
                {visible ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      {...rest}
    />
  );
});
