import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, MenuItem, Stack } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton } from "sevida-ui";
import { CURRENT_YEAR } from "../data";
import { useVersion } from "../version";
import type { MeasureCode } from "../data";

/** A ⋮ menu of places to go for the member. The row itself (name, ID or a click on the row) opens the member, so there is no "View details" button. */
export function RowActions({
  id,
  name,
  year,
  gapCode,
}: {
  id: string;
  name: string;
  year?: number;
  /** On a list with one row per care gap: adds "Open this care gap", which goes to that gap's own page. */
  gapCode?: MeasureCode;
}) {
  const navigate = useNavigate();
  const v3 = useVersion().version.id >= 3;
  const v4 = useVersion().version.id >= 4;
  const [el, setEl] = useState<HTMLElement | null>(null);
  const go = (tab?: string, print?: boolean) => {
    setEl(null);
    const q = [
      tab ? `tab=${tab}` : "",
      // Opens the member and starts the print dialog for the one-page summary (FR-512).
      print ? "print=1" : "",
      year && year !== CURRENT_YEAR ? `year=${year}` : "",
    ]
      .filter(Boolean)
      .join("&");
    navigate(`/members/${id}${q ? `?${q}` : ""}`);
  };
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      sx={{ flexWrap: "nowrap" }}
    >
      <IconButton
        size="small"
        aria-label={`More actions for ${name}`}
        aria-haspopup="menu"
        onClick={(e) => setEl(e.currentTarget)}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={el} open={!!el} onClose={() => setEl(null)}>
        {gapCode && (
          <MenuItem
            onClick={() => {
              setEl(null);
              navigate(`/members/${id}/gaps/${gapCode}`);
            }}
          >
            Open this care gap ({v3 ? gapCode.replace(/-E$/, "") : gapCode})
          </MenuItem>
        )}
        {v3 ? (
          [
            ["gaps", "Care Gaps"],
            ...(v4 ? [["profile", "Profile"]] : []),
            ["claims", "Claims"],
            ["diagnoses", "Diagnoses"],
            ["labs", "Labs"],
            ["observations", "Observations"],
            ["procedures", "Procedures"],
            ["providers", "Providers"],
            ["visits", "Visits"],
          ].map(([tab, label]) => (
            <MenuItem key={tab} onClick={() => go(tab)}>
              {label}
            </MenuItem>
          ))
        ) : (
          [
            <MenuItem key="gaps" onClick={() => go("gaps")}>Care gaps</MenuItem>,
            <MenuItem key="claims" onClick={() => go("claims")}>Claims</MenuItem>,
            <MenuItem key="enrollment" onClick={() => go("enrollment")}>Enrollment</MenuItem>,
            <MenuItem key="profile" onClick={() => go("profile")}>Profile</MenuItem>,
          ]
        )}
        <MenuItem onClick={() => go(undefined, true)}>Print summary</MenuItem>
        <MenuItem
          onClick={() => {
            setEl(null);
            void navigator.clipboard?.writeText(id);
          }}
        >
          Copy member ID
        </MenuItem>
      </Menu>
    </Stack>
  );
}
