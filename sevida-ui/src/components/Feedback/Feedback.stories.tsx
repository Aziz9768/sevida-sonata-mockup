import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Button } from '../Button/Button';
import { StatusChip } from './StatusChip';
import { InfoBanner } from './InfoBanner';
import { EmptyState } from './EmptyState';
import { InfoTip, Term } from './InfoTip';

const meta: Meta = { title: 'Components/Feedback', tags: ['!autodocs'] };
export default meta;

export const StatusChips: StoryObj = {
  render: () => (
    <Stack direction="row" gap={1} flexWrap="wrap">
      <StatusChip tone="success" label="Active" />
      <StatusChip tone="warning" label="Pending" />
      <StatusChip tone="danger" label="Overdue" />
      <StatusChip tone="info" label="In review" />
      <StatusChip tone="primary" label="Assigned" />
      <StatusChip tone="neutral" label="Inactive" />
    </Stack>
  ),
};

/** A short form on a chip: hover, focus or tap it to read what it means. */
export const StatusChipWithTip: StoryObj = {
  render: () => (
    <Stack direction="row" gap={1} flexWrap="wrap">
      <StatusChip tone="primary" label="WCV" tip="Child and Adolescent Well-Care Visits" />
      <StatusChip tone="primary" label="BCS-E" tip="Breast Cancer Screening (ECDS)" />
    </Stack>
  ),
};

export const Banners: StoryObj = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <Stack spacing={1.5}>
        <InfoBanner>Assessments are saved automatically every 30 seconds.</InfoBanner>
        <InfoBanner tone="success" title="Referral sent">The receiving team has been notified.</InfoBanner>
        <InfoBanner tone="warning" title="Consent expires soon" action={<Button variant="tertiary">Review</Button>}>
          This member's consent ends in 7 days.
        </InfoBanner>
        {open && (
          <InfoBanner tone="danger" title="Could not save" onClose={() => setOpen(false)}>
            Check your connection and try again.
          </InfoBanner>
        )}
      </Stack>
    );
  },
};

export const Empty: StoryObj = {
  render: () => <EmptyState title="No referrals yet" description="Referrals you create or receive will show up here." action={<Button>Add referral</Button>} />,
};

export const InfoTips: StoryObj = {
  name: 'InfoTip and Term',
  render: () => (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 520 }}>
      <Typography>
        Counted members <InfoTip label="About Counted members">People who are in this measure and were not excluded. The rate is worked out from them.</InfoTip>
      </Typography>
      <Typography>
        Results follow <Term tip="Healthcare Effectiveness Data and Information Set: the quality measures most US health plans report each year.">HEDIS</Term> rules.
      </Typography>
    </Box>
  ),
};
