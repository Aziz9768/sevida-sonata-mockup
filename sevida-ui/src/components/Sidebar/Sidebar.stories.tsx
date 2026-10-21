import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';
import { AppShell } from './AppShell';
import { PageContainer } from '../Page/PageContainer';
import { Card } from '../Card/Card';
import { IconButton } from '../Button/Button';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { navItems, bottomNav } from '../../stories/sampleData';

const meta: Meta = { title: 'Components/Sidebar', parameters: { layout: 'fullscreen' }, tags: ['!autodocs'] };
export default meta;

const user = { name: 'Aziz G.', subtitle: 'Supervisor', initials: 'AG' };

export const SidebarOnly: StoryObj = {
  name: 'Sidebar (open / collapsed)',
  render: () => {
    const [collapsed, setCollapsed] = useState(false);
    const [active, setActive] = useState('assessments');
    return (
      <Box sx={{ height: '100vh', display: 'flex' }}>
        <Sidebar items={navItems} bottomItems={bottomNav} activeKey={active} onNavigate={(i) => setActive(i.key)} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} user={user} />
      </Box>
    );
  },
};

export const Shell: StoryObj = {
  name: 'App shell (sidebar + header + page)',
  render: () => {
    const [active, setActive] = useState('members');
    return (
      <AppShell
        items={navItems}
        bottomItems={bottomNav}
        activeKey={active}
        onNavigate={(i) => setActive(i.key)}
        user={user}
        headerContent={
          <IconButton aria-label="Notifications">
            <NotificationsNoneOutlinedIcon />
          </IconButton>
        }
      >
        <PageContainer title="Members" subtitle="On a phone the sidebar becomes a menu button in the header.">
          <Card title="Page content">Open the Viewport menu in the toolbar and choose Phone to see the drawer.</Card>
        </PageContainer>
      </AppShell>
    );
  },
};
