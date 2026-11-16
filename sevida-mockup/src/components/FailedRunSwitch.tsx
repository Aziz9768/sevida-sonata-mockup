import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { setFailedLatestDemo, useFailedLatestDemo } from "../runs";

/** Version 16 demo switch, at the bottom of the Version menu: pretend the newest nightly run failed, to see the notice in the dashboard header. */
export function FailedRunSwitch() {
  const on = useFailedLatestDemo();
  return (
    <MenuItem role="menuitemcheckbox" aria-checked={on} onClick={() => setFailedLatestDemo(!on)} sx={{ borderTop: "1px solid", borderColor: "divider", mt: 0.5 }}>
      <ListItemIcon>{on && <CheckIcon fontSize="small" />}</ListItemIcon>
      <ListItemText
        primary="Show a failed latest run"
        secondary="Demo switch: the newest nightly run did not finish. The dashboards say so and keep the last complete run's results."
        slotProps={{ secondary: { sx: { whiteSpace: "normal", maxWidth: 340 } } }}
      />
    </MenuItem>
  );
}
