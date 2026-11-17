import { useRef, useState } from "react";
import { Button, Divider, ListItemText, Menu, MenuItem } from "@mui/material";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { useTour } from "./TourProvider";
import { TOURS } from "./tourSteps";

/**
 * Version 16: the Guide button in the top bar. It shows only on a screen that has a tour.
 * "Take the tour of this screen" opens the tour at once. "Show tours again on first visit" is for demos: it forgets what was seen.
 */
export function GuideButton() {
  const { screen, start, resetSeen, setReturnFocus } = useTour();
  const ref = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!screen) return null;
  const closeMenu = () => setAnchor(null);
  return (
    <>
      <Button
        ref={ref}
        variant="outlined"
        size="small"
        startIcon={<HelpOutlineRoundedIcon />}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(e) => {
          setReturnFocus(ref.current);
          setAnchor(e.currentTarget);
        }}
        sx={{ textTransform: "none", whiteSpace: "nowrap", height: 40 }}
      >
        Guide
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            closeMenu();
            // After the menu has closed, so the tour does not start under it.
            setTimeout(start, 150);
          }}
        >
          <ListItemText primary={`Take the tour of ${TOURS[screen].label}`} />
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            resetSeen();
            closeMenu();
          }}
        >
          <ListItemText primary="Show tours again on first visit" secondary="Every screen opens its tour once more" />
        </MenuItem>
      </Menu>
    </>
  );
}
