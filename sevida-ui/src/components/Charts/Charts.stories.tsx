import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Typography } from '@mui/material';
import { BarChart } from './BarChart';
import { Funnel } from './Funnel';
import { LineChart } from './LineChart';
import { Pipeline } from './Pipeline';
import { RingGauge } from './RingGauge';
import { StackedBar } from './StackedBar';

const meta: Meta = {
  title: 'Components/Charts',
  parameters: { docs: { description: { component: 'Small, readable visuals drawn in theme colours: RingGauge (one rate against a goal), LineChart (trend), Funnel (who is counted), Pipeline (a journey in steps), StackedBar (how a group divides). No chart library needed.' } } },
};
export default meta;

export const Ring: StoryObj = {
  render: () => (
    <Box sx={{ display: 'flex', gap: 3 }}>
      <RingGauge value={72} target={70} tone="success" label="Above goal" />
      <RingGauge value={58} target={70} tone="warning" label="Below goal" />
      <RingGauge value={31} target={70} tone="danger" label="Far below goal">
        <Box><Typography sx={{ fontWeight: 700, fontSize: '1.5rem' }}>31%</Typography><Typography variant="caption">goal 70%</Typography></Box>
      </RingGauge>
    </Box>
  ),
};

export const Trend: StoryObj = {
  render: () => (
    <Box sx={{ maxWidth: 560 }}>
      <LineChart label="Rate by month" labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']} target={60} series={[{ name: 'Well-care visits', values: [12, 21, 30, 38, 44, 49], tone: 'warning' }]} />
    </Box>
  ),
};

export const Counted: StoryObj = {
  render: () => (
    <Box sx={{ maxWidth: 420 }}>
      <Funnel label="Who is counted" steps={[
        { label: 'All members', value: 100 },
        { label: 'In the age and sex group', value: 58, note: 'Women age 42–74' },
        { label: 'Counted in the rate', value: 54, note: 'Hospice, death and surgery exclusions applied' },
        { label: 'Met', value: 49 },
      ]} />
    </Box>
  ),
};

export const Journey: StoryObj = {
  render: () => (
    <Pipeline label="From files to results" steps={[
      { label: 'Files received', value: '14 of 16', caption: '1 not received', tone: 'warning' },
      { label: 'Checked', value: '1 rejected', caption: '3 accepted with warnings', tone: 'danger' },
      { label: 'Measures calculated', value: '5', caption: 'from 100 members', tone: 'primary' },
      { label: 'Gaps to close', value: '112', caption: '73 members', tone: 'success' },
    ]} />
  ),
};

export const Split: StoryObj = {
  render: () => (
    <Box sx={{ maxWidth: 360 }}>
      <StackedBar label="Results" segments={[{ label: 'met', value: 49, tone: 'success' }, { label: 'gap', value: 24, tone: 'warning' }, { label: 'left out', value: 3, tone: 'neutral' }]} />
    </Box>
  ),
};

export const Bars: StoryObj = {
  render: () => (
    <Box sx={{ maxWidth: 560 }}>
      <BarChart label="Rate by product line" target={65} data={[
        { label: 'Commercial', value: 72, tone: 'success', note: '18 of 25' },
        { label: 'Exchange', value: 58, tone: 'warning', note: '7 of 12' },
        { label: 'Medicaid', value: 44, tone: 'danger', note: '11 of 25' },
        { label: 'Medicare', value: 66, tone: 'success', note: '20 of 30' },
      ]} />
    </Box>
  ),
};
