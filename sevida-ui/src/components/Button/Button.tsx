import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import MuiButton from '@mui/material/Button';
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import MuiIconButton from '@mui/material/IconButton';
import type { IconButtonProps as MuiIconButtonProps } from '@mui/material/IconButton';
import { useIsMobile } from '../../hooks/useIsMobile';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'color'> {
  /**
   * primary   = the main action on a screen (filled)
   * secondary = a safe alternative such as Cancel or Back (outlined)
   * tertiary  = a low-key action such as "Clear filters" (text only)
   * danger    = an action that deletes or deactivates (filled red)
   */
  variant?: ButtonVariant;
  /** Show a spinner and block clicks while a save or request is running. */
  loading?: boolean;
  /** Make the button full width on phones only. Default false. */
  fullWidthOnMobile?: boolean;
  children: ReactNode;
}

const MAP: Record<ButtonVariant, Pick<MuiButtonProps, 'variant' | 'color'>> = {
  // Same as the Leap Metrics app: filled buttons are the blue action colour, outlined buttons are indigo.
  primary: { variant: 'contained', color: 'secondary' },
  secondary: { variant: 'outlined', color: 'primary' },
  tertiary: { variant: 'text', color: 'secondary' },
  danger: { variant: 'contained', color: 'error' },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', fullWidthOnMobile = false, fullWidth, ...rest },
  ref
) {
  const isMobile = useIsMobile();
  return <MuiButton ref={ref} {...MAP[variant]} fullWidth={fullWidth ?? (fullWidthOnMobile && isMobile)} {...rest} />;
});

export interface IconButtonProps extends Omit<MuiIconButtonProps, 'aria-label'> {
  /** Required: a button with only an icon has no text, so screen readers need this. */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(props, ref) {
  return <MuiIconButton ref={ref} {...props} />;
});
