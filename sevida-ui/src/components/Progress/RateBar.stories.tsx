import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from '@mui/material';
import { RateBar } from './RateBar';

const meta: Meta<typeof RateBar> = {
  title: 'Components/RateBar',
  component: RateBar,
  parameters: {
    docs: { description: { component: 'A slim bar for one percentage. Give it a `label` for screen readers. Add `target` to draw the goal as a tick. Use it inside tables and cards, not as a chart.' } },
  },
};
export default meta;

export const Default: StoryObj<typeof RateBar> = { args: { value: 64, label: 'Screening rate' } };

export const WithGoal: StoryObj<typeof RateBar> = {
  render: () => (
    <Stack spacing={2} sx={{ maxWidth: 360 }}>
      <RateBar value={72} target={70} tone="success" label="Above goal" />
      <RateBar value={58} target={70} tone="warning" label="Below goal" />
      <RateBar value={31} target={70} tone="danger" label="Far below goal" />
    </Stack>
  ),
};

export const WithDecimals: StoryObj<typeof RateBar> = { args: { value: 63.6, decimals: 1, label: 'Rate with one decimal' } };
