import { Stack, Typography } from "@mui/material";
import { Card, DetailGrid, InfoBanner } from "sevida-ui";
import type { DetailItem } from "sevida-ui";
import { TableLink } from "./TableLink";
import { groupOfRecord, recordGroups } from "./ClinicalTab";
import {
  impactsOf,
  lastQualifying,
  recordKey,
  unmappedEvents,
} from "../careGaps";
import {
  MY,
  fmtDate,
  memberForYear,
  providerOf,
  resultsFor,
  sourceSystemOf,
} from "../data";
import type { MeasureCode, Member } from "../data";

/**
 * The exact record behind a measure result, in the same box whether it met the measure, failed it or caused an exclusion.
 * When nothing counted, it shows the closest record on file and says why it did not count.
 */
export function RecordBox({
  m: base,
  code,
  year = MY,
}: {
  m: Member;
  code: MeasureCode;
  year?: number;
}) {
  const m = memberForYear(base, year);
  const r = resultsFor(base, year)[code];
  const failing = r.state === "Gap" || r.state === "Review";
  const closest =
    !r.evidence && failing ? lastQualifying(m, code, year) : undefined;
  const e = r.evidence ?? closest;
  const unmapped = failing ? unmappedEvents(m, code) : [];
  const title =
    r.state === "Met"
      ? "Record that met the measure"
      : r.state === "Excluded"
        ? e
          ? "Record that caused the exclusion"
          : "Why the member is excluded"
        : failing
          ? r.evidence
            ? "Record that did not meet the measure"
            : closest
              ? "Closest record on file (did not count)"
              : "Record behind this result"
          : "Record behind this result";
  const impact = e
    ? impactsOf(base, e, year).find((i) => i.code === code)
    : undefined;
  const why =
    r.state === "Met"
      ? null
      : r.evidence
        ? `${r.reason.replace(/\.$/, "")}.`
        : (impact?.text ?? null);
  const rows: DetailItem[] = e
    ? [
        { label: "Service date", value: fmtDate(e.date) },
        { label: "Record type", value: e.kind },
        { label: "Code", value: `${e.code} (${e.system})` },
        {
          label: "Result value",
          value:
            e.tag === "hba1c"
              ? e.value !== undefined
                ? `${e.value}%`
                : "No value sent"
              : null,
        },
        { label: "Provider", value: providerOf(e) },
        { label: "Source system", value: sourceSystemOf(e) },
        { label: "Source file", value: `${e.file}.csv` },
        { label: "Status", value: e.status },
        { label: "What it shows", value: e.text, full: true },
        ...(why
          ? [
              {
                label:
                  r.state === "Excluded"
                    ? "Why it excludes the member"
                    : "Why it did not meet the measure",
                value: why,
                full: true,
              },
            ]
          : []),
      ].filter((x) => x.value !== null)
    : [];
  const excludedStep = r.steps.find((s) => s.outcome === "excluded");
  return (
    <Card title={title}>
      <Stack spacing={2}>
        {e ? (
          <>
            <DetailGrid columns={3} items={rows} />
            <div>
              <TableLink
                to={`/members/${m.id}?tab=${groupOfRecord(e)}&record=${encodeURIComponent(recordKey(e))}${year === MY ? "" : `&year=${year}`}`}
              >
                View this record in {recordGroups[groupOfRecord(e)].label}
              </TableLink>
            </div>
          </>
        ) : (
          <Typography sx={{ color: "text.secondary" }}>
            {r.state === "Excluded" && excludedStep
              ? `This result came from an exclusion, not from a service record: ${excludedStep.detail}.`
              : `No qualifying record was found in the available data for ${m.name} in this measurement period.`}
          </Typography>
        )}
        {unmapped.length > 0 && (
          <InfoBanner tone="warning">
            <strong>
              A record looks related but its code is not mapped to this measure,
              so it did not count.
            </strong>{" "}
            {unmapped
              .map(
                (u) =>
                  `${u.code} (${u.system}) on ${fmtDate(u.date)}: ${u.text}`,
              )
              .join("; ")}
            . Ask the data team whether this code should count.
          </InfoBanner>
        )}
      </Stack>
    </Card>
  );
}
