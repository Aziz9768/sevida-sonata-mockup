// Made-up demo data and nav used only by the Storybook pages (not part of the library).
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import type { NavItem } from '../components/Sidebar/Sidebar';
import type { StatusTone } from '../components/Feedback/StatusChip';

export interface Member {
  id: string;
  name: string;
  program: string;
  careManager: string;
  status: 'Active' | 'Pending' | 'Inactive' | 'Overdue';
  lastContact: Date;
  openTasks: number;
  phone: string;
  email: string;
}

const names = ['Maria Lopez', 'James Carter', 'Aisha Khan', 'Liam O’Brien', 'Sofia Rossi', 'Noah Williams', 'Priya Nair', 'Daniel Kim', 'Grace Okafor', 'Ethan Brooks', 'Chloe Martin', 'Omar Haddad', 'Hannah Schmidt', 'Lucas Silva', 'Mei Tanaka', 'Isaac Cohen', 'Zara Ali', 'Owen Davis', 'Nora Jensen', 'Felix Moreau', 'Ana Torres', 'Ben Murphy', 'Yara Saleh', 'Theo Walker', 'Ivy Chen'];
const programs = ['Chronic Care', 'Maternal Health', 'Behavioral Health', 'Transitions of Care'];
const managers = ['A. Rao', 'S. Patel', 'J. Moreno', 'K. Lee'];
const statuses: Member['status'][] = ['Active', 'Active', 'Pending', 'Active', 'Overdue', 'Inactive'];

export const members: Member[] = names.map((name, i) => ({
  id: `M-${20481 + i}`,
  name,
  program: programs[i % programs.length],
  careManager: managers[(i * 3) % managers.length],
  status: statuses[i % statuses.length],
  lastContact: new Date(2026, 9, 1 + ((i * 5) % 28)),
  openTasks: (i * 7) % 9,
  phone: `(555) 01${String(10 + i).padStart(2, '0')}-${String(2000 + i * 37).slice(-4)}`,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.org`,
}));

export const statusTone: Record<Member['status'], StatusTone> = { Active: 'success', Pending: 'warning', Overdue: 'danger', Inactive: 'neutral' };

export const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <SpaceDashboardOutlinedIcon />, href: '#dashboard' },
  { key: 'members', label: 'Members', icon: <PeopleAltOutlinedIcon />, href: '#members' },
  {
    key: 'care',
    label: 'Care management',
    icon: <FlagOutlinedIcon />,
    children: [
      { key: 'assessments', label: 'Assessments', href: '#assessments' },
      { key: 'careplans', label: 'Care plans', href: '#careplans' },
      { key: 'tasks', label: 'Tasks', href: '#tasks' },
    ],
  },
  { key: 'referrals', label: 'Referrals', icon: <SwapHorizOutlinedIcon />, href: '#referrals' },
  { key: 'quality', label: 'Quality measures', icon: <FactCheckOutlinedIcon />, href: '#quality' },
  { key: 'reports', label: 'Reports', icon: <AssignmentOutlinedIcon />, href: '#reports' },
];

export const bottomNav: NavItem[] = [{ key: 'settings', label: 'Settings', icon: <SettingsOutlinedIcon />, href: '#settings' }];
