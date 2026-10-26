import { useState } from "react";
import { Tooltip, Typography } from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { Button, DataTable, IconButton, Modal } from "sevida-ui";
import type { Column } from "sevida-ui";
import type { Member } from "../data";
import { memberIdsOf } from "../v3Data";
import type { MemberId } from "../v3Data";

/** A copy icon that says "Copied" for a moment after it is used. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Tooltip title={done ? "Copied" : "Copy"}>
      <IconButton
        size="small"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? (
          <CheckIcon fontSize="small" />
        ) : (
          <ContentCopyOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}

/** The pop-up with every ID of a member (ID Type, ID, Source, Copy icon). */
export function MemberIdsModalV3({
  m,
  open,
  onClose,
}: {
  m: Member;
  open: boolean;
  onClose: () => void;
}) {
  const ids = memberIdsOf(m);
  const columns: Column<MemberId>[] = [
    { key: "type", header: "ID Type", accessor: (r) => r.type, nowrap: true },
    {
      key: "value",
      header: "ID",
      accessor: (r) => r.value,
      nowrap: true,
      render: (r) => (
        <Typography component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {r.value}
        </Typography>
      ),
    },
    { key: "source", header: "Source", accessor: (r) => r.source },
    {
      key: "copy",
      header: "Copy",
      align: "center",
      width: 72,
      render: (r) => <CopyButton value={r.value} label={r.type} />,
    },
  ];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${m.name}: IDs`}
      size="md"
      actions={<Button onClick={onClose}>Close</Button>}
    >
      <DataTable
        ariaLabel={`IDs of ${m.name}`}
        columns={columns}
        rows={ids}
        getRowId={(r) => r.type}
        paginated={false}
        toolbar={false}
      />
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
        Sample data: only Member ID is real here. The other IDs are made up.
      </Typography>
    </Modal>
  );
}
