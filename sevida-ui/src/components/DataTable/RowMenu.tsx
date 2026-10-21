import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ListItemIcon, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { IconButton } from '../Button/Button';

export interface RowMenuItem {
  /** What the item says, e.g. "View evaluation details". */
  label: string;
  onClick: () => void;
  /** Small icon shown before the label. */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface RowMenuProps {
  /** Names the row for screen readers: "Actions for Breast Cancer Screening". */
  rowLabel: string;
  items: RowMenuItem[];
}

/**
 * The three-dot menu at the end of a table row. Pass it to DataTable's `rowActions`.
 * Every table uses this one, so actions always sit in the same place and look the same.
 * Put the most common action first.
 */
export function RowMenu({ rowLabel, items }: RowMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const id = useId();
  if (items.length === 0) return null;
  return (
    <>
      <IconButton
        size="small"
        aria-label={`Actions for ${rowLabel}`}
        aria-haspopup="menu"
        aria-controls={anchor ? id : undefined}
        aria-expanded={anchor ? true : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu id={id} anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} onClick={(e) => e.stopPropagation()}>
        {items.map((it) => (
          <MenuItem
            key={it.label}
            disabled={it.disabled}
            onClick={() => {
              setAnchor(null);
              it.onClick();
            }}
          >
            {it.icon && <ListItemIcon>{it.icon}</ListItemIcon>}
            {it.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
