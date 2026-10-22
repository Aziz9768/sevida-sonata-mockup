import { Stack } from "@mui/material";
import { InfoBanner, PageContainer } from "sevida-ui";
import { MeasureTable } from "../components/MeasureTable";
import { members } from "../data";

export function MeasuresPage() {
  return (
    <PageContainer
      title="Quality Measures List"
      subtitle={`${members.length} members`}
    >
      <Stack spacing={2}>
        <MeasureTable />
        <InfoBanner tone="info" title="How these numbers are made">
          In the real product the measures run on NCQA's own logic (CQL) after
          the files are converted to FHIR. This demo applies a simplified
          version of the rules to made-up members, so treat the numbers as an
          illustration. The Measurement year filter switches between the current
          year and a past year. A past year is a demo copy of the 2026 records
          moved back one year. Open a measure to see who is counted and why.
        </InfoBanner>
      </Stack>
    </PageContainer>
  );
}
