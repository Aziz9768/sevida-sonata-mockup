import { useState } from "react";
import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Button } from "sevida-ui";
import { members } from "../data";
import { roles, useRole } from "../roles";

/** Demo only: one small button in the header. It opens a short list of roles; the whole app changes (menus, member lists, member sections). */
export function RolePicker() {
  const { role, setRole, visible } = useRole();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const scope =
    role.scope === "all"
      ? "All members"
      : role.scope === "none"
        ? "No members"
        : `${visible.length} of ${members.length} members`;
  return (
    <>
      <Tooltip title={`Demo only. ${role.purpose} ${scope}.`}>
        <Button
          variant="secondary"
          aria-haspopup="menu"
          aria-label={`View as ${role.label}, demo only`}
          onClick={(e) => setAnchor(e.currentTarget)}
          endIcon={<ExpandMoreIcon />}
        >
          {`View as: ${role.label}`}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 280 } } }}
      >
        {roles.map((r) => (
          <MenuItem
            key={r.id}
            selected={r.id === role.id}
            onClick={() => {
              setRole(r.id);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              {r.id === role.id && <CheckIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={r.label}
              secondary={r.purpose}
              slotProps={{
                secondary: { sx: { whiteSpace: "normal", maxWidth: 300 } },
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
