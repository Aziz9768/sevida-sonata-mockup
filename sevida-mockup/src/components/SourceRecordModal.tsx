import { Stack, Typography } from "@mui/material";
import { Button, DetailGrid, Modal, StatusChip } from "sevida-ui";
import { arrivedOn, impactsOf } from "../careGaps";
import { MY, fmtDate, providerName } from "../data";
import type { Evt, Member } from "../data";
import { TableLink } from "./TableLink";

const outcomeTone = {
  decided: "success",
  counted: "primary",
  "not counted": "warning",
  context: "neutral",
} as const;

/** One record from the files: where it came from, when it happened, when it arrived, and what it did to each measure. */
export function SourceRecordModal({
  m,
  e,
  onClose,
  year = MY,
}: {
  m: Member;
  e: Evt | null;
  onClose: () => void;
  year?: number;
}) {
  const impacts = e ? impactsOf(m, e, year) : [];
  const arrived = e ? arrivedOn(e) : undefined;
  return (
    <Modal
      open={!!e}
      onClose={onClose}
      title="Source record"
      size="lg"
      actions={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {e && (
        <Stack spacing={2.5}>
          <DetailGrid
            columns={3}
            items={[
              { label: "Service date", value: fmtDate(e.date) },
              {
                label: "Last updated",
                value: arrived
                  ? `${fmtDate(arrived)} (file received in Sonata)`
                  : "Not received",
              },
              {
                label: "Date identified (proposed field)",
                value: e.identifiedOn ? fmtDate(e.identifiedOn) : "–",
              },
              { label: "Status in the file", value: e.status },
              { label: "What", value: e.text, full: true },
              { label: "Code", value: `${e.code} (${e.system})` },
              { label: "Provider", value: providerName(e.provider) },
              { label: "Type", value: e.kind },
              { label: "Source file", value: `${e.file}.csv` },
              {
                label: "Data type",
                value: e.supplemental
                  ? "Supplemental (clinical source)"
                  : "Administrative (claim)",
              },
              ...(e.value !== undefined
                ? [{ label: "Result", value: `${e.value}%` }]
                : []),
            ]}
          />
          <div>
            <Typography
              variant="h6"
              component="h3"
              sx={{ color: "primary.main", mb: 1 }}
            >
              How it affected the measures
            </Typography>
            {impacts.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>
                None of the five measures read this kind of record.
              </Typography>
            ) : (
              <Stack
                component="ul"
                spacing={1.5}
                sx={{ m: 0, p: 0, listStyle: "none" }}
              >
                {impacts.map((i) => (
                  <Stack
                    component="li"
                    key={i.code}
                    direction="row"
                    spacing={1.5}
                    alignItems="flex-start"
                  >
                    <StatusChip
                      tone={outcomeTone[i.outcome]}
                      label={
                        i.outcome === "decided"
                          ? "Decided result"
                          : i.outcome === "counted"
                            ? "Counted"
                            : i.outcome === "not counted"
                              ? "Did not count"
                              : "Context"
                      }
                    />
                    <div>
                      <Typography sx={{ fontWeight: 700 }}>
                        <TableLink to={`/members/${m.id}?tab=measures`}>
                          {i.def.name}
                        </TableLink>{" "}
                        ({i.code})
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        {i.text}
                      </Typography>
                    </div>
                  </Stack>
                ))}
              </Stack>
            )}
          </div>
        </Stack>
      )}
    </Modal>
  );
}
