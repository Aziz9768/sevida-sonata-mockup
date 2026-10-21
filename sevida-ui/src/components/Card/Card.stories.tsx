import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '@mui/material';
import { Button } from '../Button/Button';
import { StatusChip } from '../Feedback/StatusChip';
import { Card } from './Card';
import { DetailGrid } from './DetailGrid';

const meta: Meta = { title: 'Components/Card', tags: ['!autodocs'] };
export default meta;

export const SectionCards: StoryObj = {
  name: 'Card with details',
  render: () => (
    <Stack spacing={2}>
      <Card title="Contact details" tooltip="Shown to the care team only" action={<Button variant="secondary">Edit</Button>} footer="Last updated 3 Oct 2026 by A. Rao">
        <DetailGrid
          items={[
            { label: 'Full name', value: 'Maria Lopez' },
            { label: 'Phone', value: '(555) 010-2231' },
            { label: 'Email', value: '' },
            { label: 'Status', value: <StatusChip tone="success" label="Active" /> },
            { label: 'Preferred language', value: 'Spanish' },
            { label: 'Address', value: '14 Elm Street, Springfield, IL 62701', full: true },
          ]}
        />
      </Card>
      <Card title="Notes" hint="Visible to everyone on the care team" action={<StatusChip tone="info" label="2 new" />}>
        Plain content goes straight inside the card.
      </Card>
    </Stack>
  ),
};
