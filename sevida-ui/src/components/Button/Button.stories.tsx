import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, IconButton } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Save changes', variant: 'primary' },
  argTypes: { variant: { control: 'radio', options: ['primary', 'secondary', 'tertiary', 'danger'] } },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Playground: Story = {};

export const AllVariants: Story = {
  render: () => (
    <Stack direction="row" gap={1.5} flexWrap="wrap">
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="danger">Danger</Button>
    </Stack>
  ),
};

export const WithIconAndStates: Story = {
  render: () => (
    <Stack direction="row" gap={1.5} flexWrap="wrap" alignItems="center">
      <Button startIcon={<AddIcon />}>Add member</Button>
      <Button loading>Saving</Button>
      <Button disabled>Disabled</Button>
      <IconButton aria-label="Edit">
        <EditOutlinedIcon fontSize="small" />
      </IconButton>
    </Stack>
  ),
};

export const FullWidthOnPhone: Story = {
  name: 'Full width on phone',
  args: { fullWidthOnMobile: true, children: 'Continue' },
  parameters: { viewport: { defaultViewport: 'phone' } },
};
