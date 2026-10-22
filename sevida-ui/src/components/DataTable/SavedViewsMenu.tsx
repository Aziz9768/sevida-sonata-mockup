import { useState } from "react";
import {
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Radio,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import CheckIcon from "@mui/icons-material/Check";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Button, IconButton } from "../Button/Button";
import { TextField } from "../Form/fields";
import { Modal } from "../Modal/Modal";
import type { SavedView } from "./savedViews";
import type { SavedViewsApi } from "./useSavedViews";

export interface SavedViewsMenuProps {
  api: SavedViewsApi;
  /** The table's filters and columns are different from the view that is on (or from the built-in Default when none is on). */
  dirty: boolean;
  onApplyDefault: () => void;
  onApplyView: (view: SavedView) => void;
  /** Save what is on screen: over the view that is on (`id` given) or as a new one. */
  onSave: (name: string, id?: string) => void;
}

/**
 * The eye icon in the table toolbar: pick a saved view, save the current one, manage them.
 * A Save icon appears next to it only when something has changed since the view was applied.
 */
export function SavedViewsMenu({
  api,
  dirty,
  onApplyDefault,
  onApplyView,
  onSave,
}: SavedViewsMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { views, active, activeId, defaultId } = api;
  const label = active ? active.name : "Default";
  const myDefault = views.find((v) => v.id === defaultId) ?? null;

  const closeMenu = () => setAnchor(null);
  const openSave = () => {
    setName("");
    setSaveOpen(true);
    closeMenu();
  };
  const saveAsNew = () => {
    const n = name.trim();
    if (!n) return;
    onSave(n);
    setSaveOpen(false);
  };
  const openManage = () => {
    setDrafts(Object.fromEntries(views.map((v) => [v.id, v.name])));
    setManageOpen(true);
    closeMenu();
  };
  const commitRename = (id: string) => {
    const next = (drafts[id] ?? "").trim();
    const current = views.find((v) => v.id === id);
    if (next && current && next !== current.name) api.rename(id, next);
  };

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ flex: "0 0 auto" }}
      >
        <Tooltip
          title={`Saved views: ${label}${dirty ? " (unsaved changes)" : ""}`}
        >
          <IconButton
            variant="boxed"
            aria-label={`Saved views, ${label}`}
            onClick={(e) => setAnchor(e.currentTarget)}
          >
            <VisibilityOutlinedIcon />
          </IconButton>
        </Tooltip>
        {dirty && (
          <Tooltip title="Save this view: update it, or save it as a new view">
            <IconButton
              variant="boxed"
              aria-label="Save view"
              onClick={openSave}
            >
              <SaveOutlinedIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}
      >
        <MenuItem
          onClick={() => {
            onApplyDefault();
            closeMenu();
          }}
        >
          {activeId === null && (
            <ListItemIcon>
              <CheckIcon sx={{ fontSize: 17 }} />
            </ListItemIcon>
          )}
          <ListItemText inset={activeId !== null}>
            Reset to Default
          </ListItemText>
        </MenuItem>
        {myDefault && (
          <MenuItem
            onClick={() => {
              onApplyView(myDefault);
              closeMenu();
            }}
          >
            <ListItemIcon>
              <RestartAltIcon sx={{ fontSize: 17 }} />
            </ListItemIcon>
            <ListItemText>Reset to My View</ListItemText>
          </MenuItem>
        )}
        {views.length > 0 && <Divider />}
        {views.map((v) => (
          <MenuItem
            key={v.id}
            onClick={() => {
              onApplyView(v);
              closeMenu();
            }}
          >
            {activeId === v.id && (
              <ListItemIcon>
                <CheckIcon sx={{ fontSize: 17 }} />
              </ListItemIcon>
            )}
            <ListItemText
              inset={activeId !== v.id}
              sx={{
                "& .MuiListItemText-primary": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              }}
            >
              {v.name}
              {defaultId === v.id && (
                <Typography
                  component="span"
                  sx={{ fontSize: ".6875rem", color: "ink.300", ml: 0.75 }}
                >
                  (opens by default)
                </Typography>
              )}
            </ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={openSave}>
          <ListItemIcon>
            <SaveOutlinedIcon sx={{ fontSize: 17 }} />
          </ListItemIcon>
          <ListItemText>Save Current View…</ListItemText>
        </MenuItem>
        <MenuItem onClick={openManage}>
          <ListItemIcon>
            <SettingsOutlinedIcon sx={{ fontSize: 17 }} />
          </ListItemIcon>
          <ListItemText>Manage views…</ListItemText>
        </MenuItem>
      </Menu>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save view"
        size="sm"
        actions={
          <>
            <Button variant="tertiary" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name.trim()} onClick={saveAsNew}>
              Save as New View
            </Button>
          </>
        }
      >
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            A view keeps the filters, the columns (order, hidden, pinned) and
            the sort. It does not keep the search text or column widths.
          </Typography>
          {active && (
            <Box>
              <Button
                fullWidth
                onClick={() => {
                  onSave(active.name, active.id);
                  setSaveOpen(false);
                }}
              >
                Update “{active.name}”
              </Button>
              <Typography
                sx={{ fontSize: ".75rem", color: "ink.500", mt: 1.5 }}
              >
                Or save as a new view:
              </Typography>
            </Box>
          )}
          <TextField
            autoFocus={!active}
            label="View name"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveAsNew();
            }}
            placeholder="e.g. Gaps in more than one measure"
            helperText="The view you save opens the next time you visit this table. Change that in Manage views."
          />
        </Stack>
      </Modal>

      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Manage views"
        actions={<Button onClick={() => setManageOpen(false)}>Done</Button>}
      >
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>
          Pick which view opens by default. Rename or delete a saved view below.
        </Typography>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip
              title={
                defaultId === null
                  ? "Opens by default"
                  : "Make this the view that opens by default"
              }
            >
              <Radio
                size="small"
                checked={defaultId === null}
                onChange={() => api.setDefault(null)}
                inputProps={{ "aria-label": "Default opens by default" }}
              />
            </Tooltip>
            <Typography sx={{ flex: 1, fontWeight: 600 }}>Default</Typography>
          </Stack>
          {views.map((v) => (
            <Stack key={v.id} direction="row" alignItems="center" spacing={1}>
              <Tooltip
                title={
                  defaultId === v.id
                    ? "Opens by default"
                    : "Make this the view that opens by default"
                }
              >
                <Radio
                  size="small"
                  checked={defaultId === v.id}
                  onChange={() => api.setDefault(v.id)}
                  inputProps={{ "aria-label": `${v.name} opens by default` }}
                />
              </Tooltip>
              <TextField
                size="small"
                value={drafts[v.id] ?? v.name}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [v.id]: e.target.value }))
                }
                onBlur={() => commitRename(v.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                slotProps={{ htmlInput: { "aria-label": `Name of ${v.name}` } }}
                sx={{ flex: 1 }}
              />
              <Tooltip title="Delete view">
                <IconButton
                  size="small"
                  aria-label={`Delete ${v.name}`}
                  onClick={() => api.remove(v.id)}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
          {views.length === 0 && (
            <Typography
              variant="body2"
              sx={{ color: "ink.300", fontStyle: "italic", py: 1 }}
            >
              No saved views yet. Change a filter, then use “Save current
              view…”.
            </Typography>
          )}
        </Stack>
      </Modal>
    </>
  );
}
