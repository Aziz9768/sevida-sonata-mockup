import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Stack } from '@mui/material';
import { Button } from '../Button/Button';
import { TextField, SelectField } from '../Form/fields';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';

const meta: Meta = { title: 'Components/Modal', tags: ['!autodocs'] };
export default meta;

export const FormModal: StoryObj = {
  name: 'Modal with a form',
  render: () => {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState('');
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Add care team member"
          actions={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => setOpen(false)}>Add</Button>
            </>
          }
        >
          <Stack spacing={2}>
            <TextField label="Full name" required />
            <SelectField label="Role" value={role} onChange={setRole} options={[{ value: 'cm', label: 'Care Manager' }, { value: 'sup', label: 'Supervisor' }]} />
          </Stack>
        </Modal>
      </>
    );
  },
};

export const Confirm: StoryObj = {
  name: 'Confirm dialog',
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setOpen(true)}>Deactivate member</Button>
        <ConfirmDialog
          open={open}
          tone="danger"
          title="Deactivate this member?"
          message="Maria Lopez will stop receiving tasks and appear as Inactive. You can reactivate her later."
          confirmLabel="Deactivate"
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      </>
    );
  },
};
