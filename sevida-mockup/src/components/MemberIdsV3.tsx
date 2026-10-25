import { useState } from "react";
import { Box, Link, Tooltip, Typography } from "@mui/material";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { Button, DataTable, IconButton, Modal } from "sevida-ui";
import type { Column } from "sevida-ui";
import type { Member } from "../data";
import { memberIdsOf } from "../v3Data";
import type { MemberId } from "../v3Data";
import { Field } from "./Field";

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

/**
 * Version 3 member header: a member can have several IDs. The first two show in the header (Tricare ID, Member ID);
 * "See more IDs" opens every ID in a table with a copy icon on each row.
 */
export function MemberIdsV3({ m }: { m: Member }) {
  const ids = memberIdsOf(m);
  const [open, setOpen] = useState(false);
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
    <>
      <Field label={ids[0].type}>{ids[0].value}</Field>
      <Box sx={{ display: "flex", alignItems: "flex-end", columnGap: 2, minWidth: 0 }}>
        <Field label={ids[1].type}>{ids[1].value}</Field>
        <Link
          component="button"
          type="button"
          underline="always"
          onClick={() => setOpen(true)}
          sx={{ fontSize: ".8125rem", fontWeight: 500, lineHeight: 1.5, whiteSpace: "nowrap" }}
        >
          See more IDs
        </Link>
      </Box>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${m.name}: IDs`}
        size="md"
        actions={<Button onClick={() => setOpen(false)}>Close</Button>}
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
    </>
  );
}
