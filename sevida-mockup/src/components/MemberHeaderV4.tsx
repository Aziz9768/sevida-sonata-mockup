import { useState } from "react";
import { Box, Collapse, Divider, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Card, DetailGrid, IconButton, StatusChip } from "sevida-ui";
import { DEMO_NOW, enrollmentStatusOf, fmtDate } from "../data";
import type { Member } from "../data";
import {
  ageLabel,
  ethnicityV3,
  memberIdsOf,
  militaryV3,
  raceV3,
  sampleProfileOf,
} from "../v3Data";
import { Field } from "./Field";
import { MemberIdsModalV3 } from "./MemberIdsV3";

/**
 * Version 4 member header: the look of the original header (name, date of birth and status chip on top, a divider, small-capital
 * labels over values, a boxed expand button) filled with the fields the final sheet asks for:
 * Tricare ID, Age, Genesis EHR ID with "See all IDs", Military Status, Open Care Gaps, Gap Data Last Updated, and the expanded
 * block (Residential Address, Mailing Address, Current Posting Location, Phone Number, Email, Marital Status, Race, Race Source,
 * Ethnicity, Ethnicity Source). Same on the Member page and the Care Gap page.
 */
export function MemberHeaderV4({
  m,
  openGaps,
  updated,
  nameTo,
}: {
  m: Member;
  openGaps: number;
  updated?: Date;
  /** When set, the member name is a link to this path (used on the Care Gap page to go back to the Member page). */
  nameTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [idsOpen, setIdsOpen] = useState(false);
  const ids = memberIdsOf(m);
  const genesis = ids.find((i) => i.type === "Genesis EHR ID")!;
  const tricare = ids.find((i) => i.type === "Tricare ID")!;
  const enrolled = enrollmentStatusOf(m, DEMO_NOW).label === "Enrolled";
  const p = sampleProfileOf(m);
  const detailsId = `member-details-${m.id}`;

  return (
    <Card>
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="baseline"
          sx={{ flexWrap: "wrap", rowGap: 0.5, minWidth: 0 }}
        >
          <Typography variant="h6" component="h1" sx={{ overflowWrap: "anywhere" }}>
            {nameTo ? (
              <Link component={RouterLink} to={nameTo} variant="inherit" underline="hover" color="secondary">
                {m.name}
              </Link>
            ) : (
              m.name
            )}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            DOB {fmtDate(m.dob)}
          </Typography>
          <StatusChip
            tone={enrolled ? "success" : "neutral"}
            label={`Tricare Enrollment: ${enrolled ? "Active" : "Inactive"}`}
          />
          {m.dod && <StatusChip tone="neutral" label="Deceased" />}
        </Stack>

        <Divider />

        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                md: "repeat(3, minmax(0, 1fr))",
                lg: "repeat(6, minmax(0, 1fr))",
              },
            }}
          >
            <Field label="Tricare ID">{tricare.value}</Field>
            <Field label="Age">{ageLabel(m.dob)}</Field>
            <Field label="Genesis EHR ID">
              {genesis.value}
              <Link
                component="button"
                type="button"
                underline="always"
                onClick={() => setIdsOpen(true)}
                sx={{ display: "block", fontSize: ".8125rem", fontWeight: 500, textAlign: "left" }}
              >
                See all IDs
              </Link>
            </Field>
            <Field label="Military Status">{militaryV3(m)}</Field>
            <Field label="Open Care Gaps">{openGaps}</Field>
            <Field label="Gap Data Last Updated">
              {updated ? fmtDate(updated) : "Not received"}
            </Field>
          </Box>
          <Box
            sx={{
              alignSelf: "stretch",
              display: "flex",
              alignItems: "center",
              pl: 2,
              borderLeft: 1,
              borderColor: "divider",
            }}
          >
            <IconButton
              aria-label={open ? "Hide member details" : "Show all member details"}
              aria-expanded={open}
              aria-controls={detailsId}
              onClick={() => setOpen((v) => !v)}
              variant="boxed"
            >
              <KeyboardArrowDownIcon
                sx={{
                  transition: "transform .2s",
                  transform: open ? "rotate(180deg)" : "none",
                }}
              />
            </IconButton>
          </Box>
        </Stack>

        <Collapse in={open} unmountOnExit id={detailsId}>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Divider />
            <DetailGrid
              columns={4}
              items={[
                { label: "Residential Address", value: p.residential },
                { label: "Mailing Address", value: p.mailing },
                { label: "Current Posting Location", value: p.posting },
                { label: "Phone Number", value: p.phone },
                { label: "Email", value: p.email },
                { label: "Marital Status", value: p.marital },
                { label: "Race", value: raceV3(m) },
                { label: "Race Source", value: m.raceSource },
                { label: "Ethnicity", value: ethnicityV3(m) },
                { label: "Ethnicity Source", value: m.raceSource },
              ]}
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Sample data: the demo members have no email, marital status or posting location, so these are made up the same way every time.
            </Typography>
          </Stack>
        </Collapse>
      </Stack>
      <MemberIdsModalV3 m={m} open={idsOpen} onClose={() => setIdsOpen(false)} />
    </Card>
  );
}
