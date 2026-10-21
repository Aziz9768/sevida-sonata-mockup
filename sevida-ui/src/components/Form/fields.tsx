import { forwardRef, useId } from 'react';
import type { ReactNode } from 'react';
import {
  Autocomplete,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Switch,
  TextField as MuiTextField,
} from '@mui/material';
import type { TextFieldProps as MuiTextFieldProps } from '@mui/material';
import { useIsMobile } from '../../hooks/useIsMobile';

/* ------------------------------------------------------------------ TextField */

export type TextFieldProps = Omit<MuiTextFieldProps, 'variant'> & {
  /** Maximum characters. Shows a "12 / 200" counter and stops typing at the limit. */
  maxLength?: number;
};

/** One-line (or multi-line with `multiline`) text input. The label always sits ABOVE the box. */
export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(function TextField({ maxLength, helperText, value, slotProps, ...rest }, ref) {
  const length = typeof value === 'string' ? value.length : 0;
  const help =
    maxLength !== undefined ? (
      <>
        {helperText}
        {helperText ? ' · ' : ''}
        {length} / {maxLength}
      </>
    ) : (
      helperText
    );
  return (
    <MuiTextField
      ref={ref}
      variant="outlined"
      value={value}
      helperText={help}
      // The label always sits above the box, so it is always "shrunk"; this also keeps placeholders visible.
      slotProps={{ inputLabel: { shrink: true }, ...slotProps, htmlInput: { maxLength, ...(slotProps as { htmlInput?: object } | undefined)?.htmlInput } }}
      {...rest}
    />
  );
});

/* ------------------------------------------------------------------ DateField */

export type DateFieldProps = Omit<TextFieldProps, 'type' | 'maxLength'>;

/** A date picker using the browser's own date control (works on every phone). Value is "YYYY-MM-DD". */
export const DateField = forwardRef<HTMLDivElement, DateFieldProps>(function DateField({ slotProps, ...rest }, ref) {
  return <TextField ref={ref} type="date" slotProps={{ ...slotProps, inputLabel: { shrink: true } }} {...rest} />;
});

/* ------------------------------------------------------------------ SelectField */

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<TextFieldProps, 'select' | 'children' | 'maxLength' | 'onChange' | 'value'> {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  /** Grey text shown while nothing is chosen. */
  placeholder?: string;
}

/** A drop-down list. */
export function SelectField({ options, value, onChange, placeholder = 'Select…', slotProps, ...rest }: SelectFieldProps) {
  return (
    <TextField
      select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        ...slotProps,
        select: {
          displayEmpty: true,
          renderValue: (v: unknown) => {
            const found = options.find((o) => o.value === v);
            return found ? found.label : <span style={{ opacity: 0.55 }}>{placeholder}</span>;
          },
        },
      }}
      {...rest}
    >
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/* ------------------------------------------------------------------ AutocompleteField */

interface AutocompleteBase {
  label: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: ReactNode;
}
export type AutocompleteFieldProps =
  | (AutocompleteBase & { multiple?: false; value: string | null; onChange: (value: string | null) => void })
  | (AutocompleteBase & { multiple: true; value: string[]; onChange: (value: string[]) => void });

/** A type-to-search list. Use it when a plain drop-down would have too many options. Add `multiple` to pick several. */
export function AutocompleteField(props: AutocompleteFieldProps) {
  const { label, options, placeholder, required, disabled, error, helperText } = props;
  const byValue = (v: string) => options.find((o) => o.value === v) ?? { value: v, label: v };
  const input = (params: Parameters<NonNullable<React.ComponentProps<typeof Autocomplete>['renderInput']>>[0]) => (
    <MuiTextField {...params} label={label} placeholder={placeholder} required={required} error={error} helperText={helperText} InputLabelProps={{ ...params.InputLabelProps, shrink: true }} />
  );
  if (props.multiple) {
    return (
      <Autocomplete
        multiple
        disabled={disabled}
        options={options}
        value={props.value.map(byValue)}
        onChange={(_, v) => props.onChange(v.map((o) => o.value))}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        getOptionDisabled={(o) => !!o.disabled}
        renderInput={input}
      />
    );
  }
  return (
    <Autocomplete
      disabled={disabled}
      options={options}
      value={props.value === null ? null : byValue(props.value)}
      onChange={(_, v) => props.onChange(v ? v.value : null)}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      getOptionDisabled={(o) => !!o.disabled}
      renderInput={input}
    />
  );
}

/* ------------------------------------------------------------------ Checkbox / Switch / Radio */

interface ToggleBase {
  label: ReactNode;
  helperText?: ReactNode;
  error?: boolean;
  disabled?: boolean;
}

export function CheckboxField({ label, helperText, error, disabled, checked, onChange }: ToggleBase & { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <FormControl error={error} disabled={disabled}>
      <FormControlLabel
        control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={label}
        slotProps={{ typography: { sx: { fontSize: '.875rem', fontWeight: 500 } } }}
      />
      {helperText && <FormHelperText sx={{ mt: -0.5, ml: 4 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
}

export function SwitchField({ label, helperText, error, disabled, checked, onChange }: ToggleBase & { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <FormControl error={error} disabled={disabled}>
      <FormControlLabel
        control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />}
        label={label}
        slotProps={{ typography: { sx: { fontSize: '.875rem', fontWeight: 500 } } }}
      />
      {helperText && <FormHelperText sx={{ mt: -0.5, ml: 6 }}>{helperText}</FormHelperText>}
    </FormControl>
  );
}

export interface RadioGroupFieldProps extends Omit<ToggleBase, 'label'> {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** Lay the choices side by side. They always stack on phones. Default false. */
  row?: boolean;
}

/** A group of "choose one" options. */
export function RadioGroupField({ label, options, value, onChange, helperText, error, disabled, required, row = false }: RadioGroupFieldProps) {
  const isMobile = useIsMobile();
  const labelId = useId();
  return (
    <FormControl error={error} disabled={disabled} required={required}>
      <FormLabel id={labelId} sx={{ fontSize: '.8125rem', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
        {label}
      </FormLabel>
      <RadioGroup aria-labelledby={labelId} value={value} onChange={(e) => onChange(e.target.value)} row={row && !isMobile}>
        {options.map((o) => (
          <FormControlLabel
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            control={<Radio />}
            label={o.label}
            slotProps={{ typography: { sx: { fontSize: '.875rem', fontWeight: 500 } } }}
          />
        ))}
      </RadioGroup>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
