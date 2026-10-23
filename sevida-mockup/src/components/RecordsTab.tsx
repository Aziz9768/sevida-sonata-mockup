import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Card, titleCase } from "sevida-ui";
import { ClinicalTab, allRecords, groupOfRecord, recordGroupKeys, recordGroups } from "./ClinicalTab";
import type { RecordGroup, RecordTab } from "./ClinicalTab";
import { fmtDate, memberForYear, MY } from "../data";
import { getVersion } from "../version";
import type { Member } from "../data";

/** Order of the switch: everything first, then the kinds A to Z. */
export const recordTabOrder = (): RecordTab[] => [
  "all",
  ...recordGroupKeys().sort((a, b) =>
    recordGroups[a].label.localeCompare(recordGroups[b].label),
  ),
];
export const isRecordTab = (k: string | null): k is RecordTab =>
  !!k && (k === "all" || recordGroupKeys().includes(k as RecordGroup));

/** Version 2: every HbA1c value of the year, newest first (the Members list no longer shows the latest one). */
function A1cValues({ m, year }: { m: Member; year: number }) {
  const tests = memberForYear(m, year)
    .events.filter((e) => e.tag === "hba1c")
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return (
    <Card
      title="HbA1c values"
      hint="lab.csv"
      tooltip="Every HbA1c result of the measurement year, newest first. Above 9% is poor control. The full lab records are in the table below."
    >
      {tests.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>
          No HbA1c results were sent for this member this year.
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          {tests.map((e, i) => (
            <Typography key={i}>
              <b>{e.value !== undefined ? `${e.value}%` : "No value"}</b>
              {" on "}
              {fmtDate(e.date)}
              {i === 0 ? " (latest)" : ""}
              {e.status !== "final" ? ` · ${e.status}` : ""}
            </Typography>
          ))}
        </Stack>
      )}
    </Card>
  );
}

/**
 * One "Records" tab for everything the files hold about the member. The kinds sit in a switch inside it,
 * so the member page keeps five tabs. Each kind still has its own columns.
 * `hidden` holds the record kinds the signed-in role may not open (for example "claims").
 */
export function RecordsTab({
  m,
  year = MY,
  sub,
  onSub,
  hidden,
}: {
  m: Member;
  year?: number;
  sub: RecordTab;
  onSub: (k: RecordTab) => void;
  hidden: string[];
}) {
  const events = memberForYear(m, year).events;
  const count = (k: RecordTab) =>
    k === "all"
      ? events.length
      : events.filter((e) => groupOfRecord(e) === k).length;
  const shown = recordTabOrder().filter((k) => !hidden.includes(k));
  const current = shown.includes(sub) ? sub : shown[0];
  const label = (k: RecordTab) =>
    k === "all" ? allRecords.label : recordGroups[k].label;
  return (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={current}
        onChange={(_, k: RecordTab | null) => k && onSub(k)}
        aria-label="Kind of record"
        sx={{ flexWrap: "wrap", gap: 0.5, "& .MuiToggleButtonGroup-grouped": { borderRadius: 1, border: 1, borderColor: "divider", mx: 0 } }}
      >
        {shown.map((k) => (
          <ToggleButton
            key={k}
            value={k}
            sx={{ textTransform: "none", px: 1.5, gap: 0.75 }}
          >
            {titleCase(label(k))}
            <Box
              component="span"
              sx={{ fontSize: ".75rem", color: "text.secondary" }}
            >
              {count(k)}
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {current === "labs" && getVersion() === 2 && (
        <A1cValues m={m} year={year} />
      )}
      <ClinicalTab key={current} m={m} year={year} group={current} />
    </Stack>
  );
}
