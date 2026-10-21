import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { AppShell } from '../components/Sidebar/AppShell';
import { PageContainer } from '../components/Page/PageContainer';
import { DataTable } from '../components/DataTable/DataTable';
import type { Column } from '../components/DataTable/DataTable';
import { StatusChip } from '../components/Feedback/StatusChip';
import { InfoBanner } from '../components/Feedback/InfoBanner';
import { Button, IconButton } from '../components/Button/Button';
import { Modal } from '../components/Modal/Modal';
import { ConfirmDialog } from '../components/Modal/ConfirmDialog';
import { TextField, SelectField } from '../components/Form/fields';
import { FormSection } from '../components/Form/FormSection';
import { members as allMembers, statusTone, navItems, bottomNav } from './sampleData';
import type { Member } from './sampleData';

const meta: Meta = { title: 'Examples/Members list page', parameters: { layout: 'fullscreen' }, tags: ['!autodocs'] };
export default meta;

export const MembersPage: StoryObj = {
  name: 'Members list (everything together)',
  render: () => {
    const [adding, setAdding] = useState(false);
    const [toDeactivate, setToDeactivate] = useState<Member | null>(null);
    const [program, setProgram] = useState('');
    const count = (s: Member['status']) => allMembers.filter((m) => m.status === s).length;

    const columns: Column<Member>[] = [
      { key: 'name', header: 'Member', accessor: (m) => m.name, sortable: true, primary: true, filter: { type: 'text' } },
      { key: 'program', header: 'Program', accessor: (m) => m.program, sortable: true, filter: { type: 'multiselect', options: ['Chronic Care', 'Maternal Health', 'Behavioral Health', 'Transitions of Care'].map((v) => ({ value: v, label: v })) } },
      { key: 'cm', header: 'Care manager', accessor: (m) => m.careManager, sortable: true, hideOnMobile: true, hideBelow: 'md', filter: { type: 'select', options: ['A. Rao', 'S. Patel', 'J. Moreno', 'K. Lee'].map((v) => ({ value: v, label: v })) } },
      { key: 'status', header: 'Status', accessor: (m) => m.status, sortable: true, filter: { type: 'select', options: ['Active', 'Pending', 'Overdue', 'Inactive'].map((v) => ({ value: v, label: v })) }, render: (m) => <StatusChip tone={statusTone[m.status]} label={m.status} /> },
      { key: 'last', header: 'Last contact', accessor: (m) => m.lastContact, sortable: true, nowrap: true, filter: { type: 'dateRange' } },
    ];

    return (
      <AppShell
        items={navItems}
        bottomItems={bottomNav}
        activeKey="members"
        user={{ name: 'Aziz G.', subtitle: 'Supervisor', initials: 'AG' }}
        headerContent={<IconButton aria-label="Notifications"><NotificationsNoneOutlinedIcon /></IconButton>}
      >
        <PageContainer title="Members" actions={<Button startIcon={<AddIcon />} onClick={() => setAdding(true)}>Add member</Button>}>
          <Stack spacing={2}>
            <InfoBanner tone="warning" title={`${count('Overdue')} members have overdue contacts`}>Reach out this week to stay within program rules.</InfoBanner>
            <DataTable ariaLabel="Members" columns={columns} rows={allMembers} getRowId={(m) => m.id} defaultSort={{ key: 'name', direction: 'asc' }} onRowClick={() => undefined}
                rowActions={(m) => <Button variant="tertiary" onClick={() => setToDeactivate(m)}>Deactivate</Button>} />
          </Stack>
        </PageContainer>

        <Modal open={adding} onClose={() => setAdding(false)} title="Add member" actions={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={() => setAdding(false)}>Add member</Button></>}>
          <FormSection columns={1}>
            <TextField label="Full name" required />
            <SelectField label="Program" value={program} onChange={setProgram} options={[{ value: 'chronic', label: 'Chronic Care' }, { value: 'maternal', label: 'Maternal Health' }]} />
          </FormSection>
        </Modal>
        <ConfirmDialog open={!!toDeactivate} tone="danger" title="Deactivate member?" message={`${toDeactivate?.name ?? ''} will stop receiving tasks.`} confirmLabel="Deactivate" onCancel={() => setToDeactivate(null)} onConfirm={() => setToDeactivate(null)} />
      </AppShell>
    );
  },
};
