import { useId, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Button } from '../Button/Button';

export interface FileDropzoneProps {
  /** Called with the chosen files, from drag-and-drop or from the Browse button. */
  onFiles: (files: File[]) => void;
  /** Accepted types, same as the HTML `accept` attribute. Example: ".csv". */
  accept?: string;
  /** Allow more than one file. Default false. */
  multiple?: boolean;
  /** Main line. Default "Drag a file here". */
  title?: string;
  /** Small line under it, e.g. "CSV, UTF-8, up to 50 MB". */
  hint?: ReactNode;
  disabled?: boolean;
}

/** A drop area plus a "Browse" button. Works with mouse, touch and keyboard. */
export function FileDropzone({ onFiles, accept, multiple = false, title = 'Drag a file here', hint, disabled }: FileDropzoneProps) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onFiles(multiple ? Array.from(list) : [list[0]]);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled) take(e.dataTransfer.files);
  };

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      sx={{
        border: 2,
        borderStyle: 'dashed',
        borderColor: over ? 'secondary.main' : 'divider',
        bgcolor: over ? 'tint.secondary' : 'surfaceAlt',
        borderRadius: 2,
        px: 2,
        py: { xs: 3, sm: 4 },
        textAlign: 'center',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color .15s, border-color .15s',
      }}
    >
      <UploadFileOutlinedIcon sx={{ fontSize: 32, color: 'ink.500' }} aria-hidden />
      <Typography id={id} component="p" variant="subtitle1" sx={{ mt: 0.5 }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
          {hint}
        </Typography>
      )}
      <Box sx={{ mt: 1.5 }}>
        <Button variant="secondary" disabled={disabled} onClick={() => input.current?.click()}>
          Browse files
        </Button>
      </Box>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple} aria-labelledby={id} onChange={(e) => { take(e.target.files); e.target.value = ''; }} />
    </Box>
  );
}
