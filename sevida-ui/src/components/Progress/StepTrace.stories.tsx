import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { StepTrace } from './StepTrace';

const meta: Meta<typeof StepTrace> = {
  title: 'Components/StepTrace',
  component: StepTrace,
  parameters: { docs: { description: { component: 'Shows how a decision was made: each check in order, what was found, and where the data came from. Checks never reached are greyed out.' } } },
};
export default meta;

export const Met: StoryObj<typeof StepTrace> = {
  render: () => (
    <Box sx={{ maxWidth: 560 }}>
      <StepTrace label="How BCS-E was decided" steps={[
        { label: 'Age and sex', statusLabel: 'Passed', tone: 'success', detail: 'Female, age 52 on Dec 31 (rule: 42–74)', source: 'member-gm.csv' },
        { label: 'Died or in hospice', statusLabel: 'Passed', tone: 'success', detail: 'No death or hospice on record', source: 'member-gm.csv, medicare-status.csv' },
        { label: 'Enrolled all year', statusLabel: 'Passed', tone: 'success', detail: 'Enrolled all year, no gap', source: 'member-en.csv' },
        { label: 'Other exclusions', statusLabel: 'Passed', tone: 'success', detail: 'No other exclusion found', source: 'diag.csv, proc.csv' },
        { label: 'Mammogram', statusLabel: 'Met', tone: 'success', detail: 'Mammogram on 3/2/2025', source: 'proc.csv' },
      ]} />
    </Box>
  ),
};

export const Excluded: StoryObj<typeof StepTrace> = {
  render: () => (
    <Box sx={{ maxWidth: 560 }}>
      <StepTrace label="How BCS-E was decided" steps={[
        { label: 'Age and sex', statusLabel: 'Passed', tone: 'success', detail: 'Female, age 45', source: 'member-gm.csv' },
        { label: 'Died or in hospice', statusLabel: 'Passed', tone: 'success', detail: 'No death or hospice on record' },
        { label: 'Enrolled all year', statusLabel: 'Passed', tone: 'success', detail: 'Enrolled all year, no gap' },
        { label: 'Other exclusions', statusLabel: 'Excluded', tone: 'neutral', detail: 'Mastectomy on both breasts', source: 'proc.csv' },
        { label: 'Mammogram', statusLabel: 'Not checked', tone: 'muted', detail: 'Not needed once a member is excluded' },
      ]} />
    </Box>
  ),
};
