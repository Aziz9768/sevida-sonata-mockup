import { useState } from "react";
import { Box, Link, Stack, Typography } from "@mui/material";
import { Card } from "sevida-ui";
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
import { MemberIdsModalV3 } from "./MemberIdsV3";

/** One "Label: value" line, as the sheet's wireframe writes it. */
function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Typography component="div" sx={{ fontSize: ".875rem", lineHeight: 1.7, minWidth: 0 }}>
      <Box component="span" sx={{ color: "text.secondary" }}>
        {label}:
      </Box>{" "}
      <Box component="span" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>
        {children}
      </Box>
    </Typography>
  );
}

/**
 * Version 3 member header, exactly as the sheet's wireframe (Member Details Page tab) draws it:
 * Name, DOB, Tricare ID, Tricare Enrollment | Age, Genesis EHR ID + "See all IDs", Military Status | Expand,
 * then Open Care Gaps and Gap Data Last Updated. "Expand" opens a second block: Residential Address, Mailing Address,
 * Current Posting Location, Phone Number, Email, Marital Status, Race, Race Source, Ethnicity, Ethnicity Source.
 * Nothing else is in the header: no Gender, no print / export, no tiles.
 */
export function MemberHeaderV3({
  m,
  openGaps,
  updated,
}: {
  m: Member;
  openGaps: number;
  updated?: Date;
}) {
  const [expanded, setExpanded] = useState(false);
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
        <Box
          sx={{
            display: "grid",
            gap: { xs: 1.5, md: 4 },
            gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) minmax(0,1fr) 72px" },
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              component="h1"
              sx={{ overflowWrap: "anywhere", mb: 0.5 }}
            >
              {m.name}
            </Typography>
            <Line label="DOB">{fmtDate(m.dob)}</Line>
            <Line label="Tricare ID">{tricare.value}</Line>
            <Line label="Tricare Enrollment">{enrolled ? "Active" : "Inactive"}</Line>
          </Box>
          <Box sx={{ minWidth: 0, pt: { md: 0.5 } }}>
            <Line label="Age">{ageLabel(m.dob)}</Line>
            <Line label="Genesis EHR ID">
              {genesis.value}
              <Link
                component="button"
                type="button"
                underline="always"
                onClick={() => setIdsOpen(true)}
                sx={{ ml: 2, fontSize: ".8125rem", fontWeight: 500, verticalAlign: "baseline" }}
              >
                See all IDs
              </Link>
            </Line>
            <Line label="Military Status">{militaryV3(m)}</Line>
          </Box>
          <Box sx={{ justifySelf: { md: "end" } }}>
            <Link
              component="button"
              type="button"
              underline="always"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={() => setExpanded((v) => !v)}
              sx={{ fontSize: ".875rem", fontWeight: 500 }}
            >
              {expanded ? "Collapse" : "Expand"}
            </Link>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: { xs: 0.25, md: 4 },
            gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) minmax(0,1fr) 72px" },
          }}
        >
          <Line label="Open Care Gaps">{openGaps}</Line>
          <Line label="Gap Data Last Updated">{updated ? fmtDate(updated) : "Not received"}</Line>
        </Box>

        {expanded && (
          <Box
            id={detailsId}
            sx={{
              borderTop: 1,
              borderColor: "divider",
              pt: 1.5,
              display: "grid",
              gap: 0.5,
              columnGap: 4,
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            }}
          >
            <Line label="Residential Address">{p.residential}</Line>
            <Line label="Mailing Address">{p.mailing}</Line>
            <Box sx={{ gridColumn: { md: "1 / -1" } }}>
              <Line label="Current Posting Location">{p.posting}</Line>
            </Box>
            <Line label="Phone Number">{p.phone}</Line>
            <Line label="Email">{p.email}</Line>
            <Box sx={{ gridColumn: { md: "1 / -1" } }}>
              <Line label="Marital Status">{p.marital}</Line>
            </Box>
            <Line label="Race">{raceV3(m)}</Line>
            <Line label="Race Source">{m.raceSource}</Line>
            <Line label="Ethnicity">{ethnicityV3(m)}</Line>
            <Line label="Ethnicity Source">{m.raceSource}</Line>
            <Typography
              variant="caption"
              sx={{ gridColumn: "1 / -1", color: "text.secondary", mt: 1 }}
            >
              Sample data: the demo members have no email, marital status or posting location, so these are made up the same way every time.
            </Typography>
          </Box>
        )}
      </Stack>
      <MemberIdsModalV3 m={m} open={idsOpen} onClose={() => setIdsOpen(false)} />
    </Card>
  );
}
