import { Stack, Typography } from "@mui/material";
import { InfoTip } from "sevida-ui";
import { fmtDate } from "../../data";
import { fmtRun, runInfo } from "../../dashboardData";
import { useRun } from "../../runs";

/**
 * Top right of every dashboard: when the numbers were last calculated and when the next run is due.
 * Hover the (i) to see which source files were used and each file's latest date.
 */
export function RunInfo() {
  const info = runInfo();
  const { run } = useRun();
  return (
    <Stack spacing={0.25} sx={{ textAlign: { sm: "right" } }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        justifyContent={{ sm: "flex-end" }}
      >
        <Typography sx={{ fontSize: ".875rem", fontWeight: 700 }}>
          Last updated: {fmtRun(run.at)}
        </Typography>
        <InfoTip label="Source files behind this update">
          <Stack component="span" spacing={0.25} sx={{ display: "flex" }}>
            <strong>Source files used</strong>
            {info.sources.map((s) => (
              <span key={s.id}>
                {s.title} ({s.id}.csv): {fmtDate(s.receivedOn)}
              </span>
            ))}
          </Stack>
        </InfoTip>
      </Stack>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Next update: {fmtRun(info.next)} ({info.schedule.toLowerCase()})
      </Typography>
    </Stack>
  );
}
