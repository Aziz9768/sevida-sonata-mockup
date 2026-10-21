import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Tabs } from './Tabs';
import { Card } from '../Card/Card';

const meta: Meta<typeof Tabs> = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          'Page sections as tabs. Give each item a `key`, a `label` and its `content`. It works on its own, or pass `value` + `onChange` to control it (for example to keep the open tab in the address bar). On a phone the row scrolls sideways.',
      },
    },
  },
};
export default meta;

const items = [
  { key: 'overview', label: 'Overview', content: <Card title="Overview">Summary of the member.</Card> },
  { key: 'plan', label: 'Care plan', content: <Card title="Care plan">Goals and interventions.</Card> },
  { key: 'tasks', label: 'Tasks', count: 4, content: <Card title="Tasks">Four open tasks.</Card> },
  { key: 'notes', label: 'Notes', content: <Card title="Notes">Service notes.</Card> },
  { key: 'docs', label: 'Documents', disabled: true },
];

export const Default: StoryObj<typeof Tabs> = { render: () => <Tabs ariaLabel="Member sections" items={items} /> };

export const Controlled: StoryObj<typeof Tabs> = {
  render: () => {
    const [v, setV] = useState('plan');
    return (
      <>
        <p style={{ fontSize: 13 }}>Open tab: <b>{v}</b></p>
        <Tabs ariaLabel="Member sections" items={items} value={v} onChange={setV} />
      </>
    );
  },
};

export const ManyTabsOnAPhone: StoryObj<typeof Tabs> = {
  name: 'Many tabs (scrolls on a phone)',
  render: () => (
    <Tabs
      ariaLabel="Member sections"
      items={['Overview', 'Demographics', 'Care team', 'Care plan', 'Tasks', 'Assessments', 'Notes', 'Documents'].map((l) => ({ key: l, label: l, content: <Card title={l}>Content for {l}.</Card> }))}
    />
  ),
};
