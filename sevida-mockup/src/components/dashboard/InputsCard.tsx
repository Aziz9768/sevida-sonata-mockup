import { Box, Stack } from "@mui/material";
import { Card, DataTable, DetailGrid, InfoBanner, StatusChip } from "sevida-ui";
import type { Column } from "sevida-ui";
import { fmtDate, fileStatusTone } from "../../data";
import type { Member, MeasureCode, MeasureDef } from "../../data";
import { inputsFor, leftOutFor, periodText } from "../../dashboardData";
import type { InputRow, LeftOut } from "../../dashboardData";
import { TableLink } from "../TableLink";

const inputColumns: Column<InputRow>[] = [
  {
    key: "file",
    header: "File",
    accessor: (r) => r.title,
    primary: true,
    render: (r) => `${r.title} (${r.file.id}.csv)`,
  },
  {
    key: "status",
    header: "Status",
    accessor: (r) => r.file.status,
    render: (r) => (
      <StatusChip
        label={r.file.status}
        tone={fileStatusTone[r.file.status]}
        tip={r.file.note}
      />
    ),
  },
  {
    key: "received",
    header: "Latest file date",
    accessor: (r) => r.file.receivedOn?.getTime() ?? 0,
    render: (r) => (r.file.receivedOn ? fmtDate(r.file.receivedOn) : "–"),
    nowrap: true,
  },
  {
    key: "used",
    header: "Rows used",
    accessor: (r) => r.rowsUsed,
    align: "right",
    help: "Rows from this file that reached the measure.",
  },
  {
    key: "rejected",
    header: "Rows rejected",
    accessor: (r) => r.rejected,
    align: "right",
    help: "Rows from this file that were rejected. See the Admin tab for each row and the reason.",
  },
];

const leftOutColumns: Column<LeftOut>[] = [
  { key: "reason", header: "Reason", accessor: (r) => r.reason, primary: true },
  {
    key: "kind",
    header: "Type",
    accessor: (r) => r.kind,
    render: (r) => (
      <StatusChip
        label={r.kind}
        tone={r.kind === "Excluded" ? "warning" : "neutral"}
        tip={
          r.kind === "Excluded"
            ? "In the measure, but taken out of the rate by a rule."
            : "Not in the measure at all, for example because of age."
        }
      />
    ),
  },
  {
    key: "count",
    header: "Members",
    accessor: (r) => r.count,
    align: "right",
  },
];

/** What went into the measure: the files, the members who were left out and why, and a short summary of the calculation. */
export function InputsCard({
  code,
  def,
  list,
  year,
}: {
  code: MeasureCode;
  def: MeasureDef;
  list: Member[];
  year: number;
}) {
  const inputs = inputsFor(code);
  const left = leftOutFor(code, list, year);
  return (
    <Stack spacing={2}>
      <Card
        title="What went into this measure"
        tooltip="The data files this measure reads. A rejected or missing file can make the rate too low."
        flush
      >
        <DataTable
          ariaLabel={`Files used by ${code}`}
          columns={inputColumns}
          rows={inputs}
          getRowId={(r) => r.file.id}
          paginated={false}
          toolbar={false}
        />
      </Card>
      <Card
        title="Members left out and why"
        tooltip="Members for the filters you picked who are not in the rate: excluded by a rule, or not in the measure at all."
        flush
      >
        {left.length ? (
          <DataTable
            ariaLabel={`Members left out of ${code}`}
            columns={leftOutColumns}
            rows={left}
            getRowId={(r) => `${r.kind}|${r.reason}`}
            paginated={false}
            toolbar={false}
          />
        ) : (
          <Box sx={{ p: 2.75, color: "text.secondary", fontSize: ".875rem" }}>
            Nobody is left out for these filters.
          </Box>
        )}
      </Card>
      <Card
        title="Everything that affects this calculation"
        tooltip="A quick check of the measure: the period, who is counted, who is left out, the rules, the files and the formula. The full specification is one click away."
      >
        <Stack spacing={2}>
          <DetailGrid
            columns={2}
            items={[
              {
                label: "Measurement period",
                value: periodText(year).replace(" to ", " – "),
              },
              { label: "Eligible population", value: def.population },
              { label: "Age rule", value: def.ageRule },
              { label: "Met when", value: def.needs },
              {
                label: "Excluded or not in the measure",
                value: left.length
                  ? left.map((r) => `${r.reason} (${r.count})`).join("; ")
                  : "Nobody for these filters",
              },
              {
                label: "Files read",
                value: inputs
                  .map(
                    (i) =>
                      `${i.title}${i.file.receivedOn ? ` (${fmtDate(i.file.receivedOn)})` : " (not received)"}`,
                  )
                  .join("; "),
              },
              {
                label: "Rate",
                value:
                  "Met members divided by eligible members. Excluded members and members not in the measure are not counted.",
              },
              {
                label: "Rules applied",
                value: (
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {def.rules.map((r) => (
                      <li key={r.text}>{r.text}</li>
                    ))}
                  </Box>
                ),
              },
            ]}
          />
          <Box>
            <TableLink to={`/measures/${code}?tab=how`}>
              Read the full specification
            </TableLink>
          </Box>
        </Stack>
      </Card>
      {inputs.some(
        (i) => i.rejected > 0 || i.file.status === "Not received",
      ) && (
        <InfoBanner tone="warning">
          A file this measure reads was rejected or has not arrived, so the rate
          may be too low until it is fixed. See the Admin tab.
        </InfoBanner>
      )}
    </Stack>
  );
}
