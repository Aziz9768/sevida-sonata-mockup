import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { accent, ink, radius, status, surface } from '../theme/tokens';
import { Button } from '../components/Button/Button';

const meta: Meta = { title: 'Foundations/Overview', parameters: { layout: 'padded' }, tags: ['!autodocs'] };
export default meta;

function Swatch({ name, value, dark }: { name: string; value: string; dark?: boolean }) {
  return (
    <Stack spacing={0.5} sx={{ width: { xs: 'calc(50% - 8px)', sm: 150 } }}>
      <Box sx={{ height: 56, borderRadius: 1, bgcolor: value, border: 1, borderColor: 'divider', display: 'flex', alignItems: 'flex-end', p: 0.75, color: dark ? '#fff' : '#000', fontSize: '.75rem' }}>{value}</Box>
      <Typography sx={{ fontSize: '.75rem', fontWeight: 700 }}>{name}</Typography>
    </Stack>
  );
}

export const Colors: StoryObj = {
  render: () => {
    const { palette: p } = useTheme();
    return (
      <Stack spacing={3}>
        <Typography variant="h4">Colours</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 680 }}>
          These are the colours of the Leap Metrics app. Components never pick their own colours: they read these from the theme, so a client can change the main colour once and everything follows
          (<code>createSevidaTheme({'{ primary: "#..." }'})</code>).
        </Typography>
        <Typography variant="h5">Brand</Typography>
        <Stack direction="row" flexWrap="wrap" gap={2}>
          <Swatch name="primary · structure" value={p.primary.main} dark />
          <Swatch name="primary.dark · sidebar, list table headers" value={p.primary.dark} dark />
          <Swatch name="secondary · links, action buttons, tabs" value={p.secondary.main} dark />
          <Swatch name="accent · active menu item" value={accent.light} />
          <Swatch name="accent · call-outs" value={accent.main} dark />
          <Swatch name="tint.primary" value={p.tint.primary} />
          <Swatch name="tint.band · record header" value={surface.band} />
        </Stack>
        <Typography variant="h5">Status</Typography>
        <Stack direction="row" flexWrap="wrap" gap={2}>
          {(['success', 'warning', 'danger', 'info'] as const).map((k) => (
            <Stack key={k} direction="row" gap={1}>
              <Swatch name={`${k} · main`} value={status[k].main} dark />
              <Swatch name={`${k} · tint`} value={status[k].tint} />
              <Swatch name={`${k} · chip`} value={status[k].chip} />
            </Stack>
          ))}
        </Stack>
        <Typography variant="h5">Greys and backgrounds</Typography>
        <Stack direction="row" flexWrap="wrap" gap={2}>
          {Object.entries(ink)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([k, v]) => (
              <Swatch key={k} name={`ink.${k}`} value={v} dark={Number(k) >= 400} />
            ))}
          <Swatch name="page / card (white)" value={p.background.paper} />
          <Swatch name="surfaceAlt · panels, rows" value={p.surfaceAlt} />
          <Swatch name="subtle" value={surface.subtle} />
          <Swatch name="border" value={surface.border} />
        </Stack>
      </Stack>
    );
  },
};

export const Typography_: StoryObj = {
  name: 'Typography',
  render: () => (
    <Stack spacing={1.5}>
      <Typography variant="h4">Type roles (Lato, same as the Leap Metrics app)</Typography>
      <Typography variant="h3">h3 · Overview page title (24 / 700)</Typography>
      <Typography variant="h4">h4 · List page title (18 / 400)</Typography>
      <Typography variant="h5">h5 · Card / section title (14 / 700)</Typography>
      <Typography variant="h6">h6 · Record name (16 / 600)</Typography>
      <Typography variant="subtitle2">subtitle2 · Field labels, table headings (14 / 500)</Typography>
      <Typography variant="body1">body1 · Normal text (14 / 400). Lato is bundled, so this works on a server with no internet.</Typography>
      <Typography variant="body2">body2 · Secondary text (13 / 400)</Typography>
      <Typography variant="caption">caption · Small notes, menu items (12 / 400)</Typography>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Button>Add New</Button>
        <Button variant="secondary">Save This View</Button>
        <Typography variant="caption">button · 13 / 400, first letter of each word in capitals (as in Leap)</Typography>
      </Stack>
    </Stack>
  ),
};

export const Spacing: StoryObj = {
  render: () => (
    <Stack spacing={2}>
      <Typography variant="h4">Spacing and corners</Typography>
      <Typography variant="body2" color="text.secondary">
        Spacing steps are multiples of 8px. Phones use the smaller step (xs), larger screens the bigger one (sm and up).
      </Typography>
      <Stack direction="row" gap={2} flexWrap="wrap">
        {Object.entries(radius).map(([k, v]) => (
          <Stack key={k} alignItems="center" spacing={0.5}>
            <Box sx={{ width: 72, height: 48, border: 2, borderColor: 'primary.main', borderRadius: `${v}px` }} />
            <Typography sx={{ fontSize: '.75rem' }}>
              {k} · {v}px
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  ),
};
