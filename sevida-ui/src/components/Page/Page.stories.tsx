import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { Breadcrumbs } from './Breadcrumbs';
import { PageContainer } from './PageContainer';
import { StickyActionBar } from './StickyActionBar';

const meta: Meta = { title: 'Components/Page', parameters: { layout: 'fullscreen' }, tags: ['!autodocs'] };
export default meta;

export const BreadcrumbTrail: StoryObj = {
  name: 'Breadcrumbs',
  parameters: { layout: 'padded' },
  render: () => (
    <Breadcrumbs
      crumbs={[
        { label: 'Members', href: '#members' },
        { label: 'Maria Lopez', href: '#maria' },
        { label: 'Care plans', href: '#plans' },
        { label: 'Goal: Manage blood pressure' },
      ]}
    />
  ),
};

export const ListPage: StoryObj = {
  name: 'Page container',
  render: () => (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      <PageContainer
        breadcrumbs={[{ label: 'Members', href: '#' }, { label: 'Maria Lopez' }]}
        title="Maria Lopez"
        subtitle="Member ID 20481 · Care Manager: A. Rao"
        actions={
          <>
            <Button variant="secondary">Print</Button>
            <Button>Edit member</Button>
          </>
        }
      >
        <Card title="Overview">The page's content goes here. The header stacks above the buttons on phones.</Card>
      </PageContainer>
    </Box>
  ),
};

export const ActionBar: StoryObj = {
  name: 'Sticky action bar',
  render: () => (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      <PageContainer title="New assessment">
        <Box sx={{ height: 900 }}>
          <Card title="Questions">Scroll down: the bar below stays pinned to the bottom.</Card>
        </Box>
        <StickyActionBar secondary={{ label: 'Cancel', onClick: () => undefined }} primary={{ label: 'Save', onClick: () => undefined }} />
      </PageContainer>
    </Box>
  ),
};

export const ActionBarWithEdit: StoryObj = {
  name: 'Sticky action bar – Back / Edit / Save',
  render: () => (
    <Box sx={{ height: 260, display: 'flex', flexDirection: 'column' }}>
      <PageContainer>
        <Box sx={{ height: 400 }} />
        <StickyActionBar
          secondary={{ label: 'Back', onClick: () => undefined }}
          tertiary={{ label: 'Edit', onClick: () => undefined }}
          primary={{ label: 'Save', onClick: () => undefined, disabled: true }}
          note="* Required"
        />
      </PageContainer>
    </Box>
  ),
};
