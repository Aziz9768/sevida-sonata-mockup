import { Stack, Typography } from "@mui/material";
import { Button, Modal } from "sevida-ui";

const items: [string, string][] = [
  [
    "Pick a measure",
    "Use the tabs at the top. Each measure has its own dashboard with the same layout. The filters stay when you switch tab.",
  ],
  [
    "Filters",
    "The filters are in one block under the title. Pick your filters, then press Apply. The measurement period is always the whole calendar year, January 1 to December 31. Results, charts, trend and member list change with them.",
  ],
  [
    "Whole population box",
    "It always shows everyone for the year, so you can see how far the filtered Results are from the whole.",
  ],
  [
    "Click a Results card",
    "Click Met, Not met or a percent card to list those members below. Click Initial population or Eligible to list everyone again.",
  ],
  [
    "Trend",
    "The trend has its own controls: Daily, Weekly, Monthly, Quarterly or Annual, a date range, and Compare with last year. The table on the left has the numbers behind the chart.",
  ],
  [
    "Star on a chart",
    "A group marked * has fewer than 10 eligible members. One member moves its rate by many points, so read it with care.",
  ],
  [
    "Member list",
    "Under the trend you see every member in the initial population for the filters. Select a member to open their record.",
  ],
  [
    "Export",
    "The Export icon at the top saves what you see, with the filters that are applied, as Excel, PDF or CSV. The small picture icon on a chart saves that one chart as an image.",
  ],
];

/** A short guide to using a dashboard. */
export function HowToModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to use this dashboard"
      actions={<Button onClick={onClose}>Close</Button>}
    >
      <Stack spacing={1.75}>
        {items.map(([h, t]) => (
          <Stack key={h} spacing={0.25}>
            <Typography sx={{ fontWeight: 700 }}>{h}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Modal>
  );
}
