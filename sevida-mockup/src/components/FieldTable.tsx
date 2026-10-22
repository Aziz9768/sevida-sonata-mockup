import { useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { DataTable, StatusChip, SwitchField } from "sevida-ui";
import type { Column } from "sevida-ui";
import type { FieldRow } from "../recordFields";

const requiredLabel = { Yes: "Required", Conditional: "Conditional", No: "Optional" } as const;

/** Every field of a file for one row: name, value, and whether the file must have it. Blank cells are folded away until asked for. */
export function FieldTable({
  title,
  rows,
  note,
}: {
  title: string;
  rows: FieldRow[];
  note?: string;
}) {
  const [blanks, setBlanks] = useState(false);
  const filled = rows.filter((r) => r.value !== "");
  const shown = blanks ? rows : filled;
  const columns: Column<FieldRow>[] = [
    { key: "name", header: "Field", accessor: (r) => r.name, primary: true },
    {
      key: "value",
      header: "Value in the file",
      accessor: (r) => r.value || "(blank)",
      render: (r) =>
        r.value ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <span>{r.value}</span>
            {!r.real && (
              <StatusChip
                label="Sample"
                tone="neutral"
                tip="The demo data does not hold this value, so it is made up. In the real product it is the value from the file."
              />
            )}
          </Stack>
        ) : (
          <Typography component="span" sx={{ color: "text.secondary" }}>
            (blank)
          </Typography>
        ),
    },
    {
      key: "req",
      header: "In the spec",
      accessor: (r) => requiredLabel[r.required],
      nowrap: true,
    },
  ];
  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ flexWrap: "wrap", mb: 1, rowGap: 0.5 }}
      >
        <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
        {filled.length < rows.length && (
          <SwitchField
            label={`Show ${rows.length - filled.length} blank fields`}
            checked={blanks}
            onChange={setBlanks}
          />
        )}
      </Stack>
      {note && (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          {note}
        </Typography>
      )}
      <DataTable
        ariaLabel={title}
        columns={columns}
        rows={shown}
        getRowId={(r) => r.name}
        paginated={false}
        toolbar={false}
      />
    </Box>
  );
}
