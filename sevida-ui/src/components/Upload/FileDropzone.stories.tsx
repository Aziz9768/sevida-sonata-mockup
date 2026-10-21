import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Typography } from '@mui/material';
import { FileDropzone } from './FileDropzone';

const meta: Meta<typeof FileDropzone> = {
  title: 'Components/FileDropzone',
  component: FileDropzone,
  parameters: {
    docs: { description: { component: 'Drop area for choosing a file. It only hands you the `File` objects through `onFiles`; reading or uploading them is up to the screen.' } },
  },
};
export default meta;

export const Default: StoryObj<typeof FileDropzone> = {
  render: () => {
    const [name, setName] = useState('');
    return (
      <>
        <FileDropzone accept=".csv" hint="CSV, comma-delimited, UTF-8" onFiles={(f) => setName(f[0].name)} />
        {name && <Typography sx={{ mt: 1 }}>Chosen: {name}</Typography>}
      </>
    );
  },
};

export const Disabled: StoryObj<typeof FileDropzone> = { render: () => <FileDropzone disabled onFiles={() => undefined} hint="Choose a file type first" /> };
