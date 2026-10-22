import { Box, Stack, Typography } from "@mui/material";
import { Card, DetailGrid, StatCard } from "sevida-ui";
import { fmtDate, members } from "../../data";
import type { Member, MeasureCode } from "../../data";
import { tips } from "../../copy";
import { kpisFor, periodText, runInfo, secondRate } from "../../dashboardData";
import type { Kpis } from "../../dashboardData";

export type MemberView = "" | "Met" | "Gap";

export const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;
const share = (n: number, of: number) => (of ? (n / of) * 100 : 0);

export const cardGrid = (cols: number) => ({
  display: "grid",
  gap: 1.5,
  gridTemplateColumns: {
    xs: "repeat(2, minmax(0, 1fr))",
    sm: `repeat(${cols}, minmax(0, 1fr))`,
  },
  "& > *": { minWidth: 0 },
});

/**
 * The box on the left. It always shows the whole population for the year, so the numbers on the right
 * have something to be compared with. The filters do not change it, only the year does.
 */
export function BaselineCard({
  code,
  year,
}: {
  code: MeasureCode;
  year: number;
}) {
  const { initial, t } = kpisFor(code, members, year);
  return (
    <Card
      title="Whole population"
      tooltip="All members in the files for this year, with no filters. Use it to see how far the filtered numbers on the right are from the whole population. Only the measurement year changes it."
    >
      <DetailGrid
        columns={1}
        items={[
          {
            label: "Measurement period",
            value: periodText(year).replace(" to ", " – "),
          },
          { label: "Initial population", value: initial },
          { label: "Eligible", value: t.denominator },
          { label: "Excluded", value: t.excluded },
          {
            label: "Met",
            value: `${t.met} (${pct(share(t.met, t.denominator))})`,
          },
          {
            label: "Not met",
            value: `${t.gap} (${pct(share(t.gap, t.denominator))})`,
          },
        ]}
      />
    </Card>
  );
}

/** The KPI cards. They change with the filters. */
export function KpiCards({
  code,
  list,
  year,
  closed,
  view,
  onView,
}: {
  code: MeasureCode;
  list: Member[];
  year: number;
  /** Gaps closed since the last run, or null for a past year. */
  closed: number | null;
  /** Which members the list below shows: everyone, only Met, or only Not met. */
  view: MemberView;
  onView: (v: MemberView) => void;
}) {
  const k: Kpis = kpisFor(code, list, year);
  const t = k.t;
  const second = code === "GSD" ? secondRate(list, year) : null;
  return (
    <Card
      title="Results"
      hint="Change with the filters above. Click a card to list its members below."
      footer={
        closed !== null ? (
          <span>
            Gaps closed by staff since the last run ({fmtDate(runInfo().last)}):{" "}
            <strong>{closed}</strong>. They still count as Not met until the
            next run, then they become Met.
          </span>
        ) : undefined
      }
    >
      <Stack spacing={2}>
        <Box sx={cardGrid(3)}>
          <StatCard
            label="Initial population"
            value={k.initial}
            tip="Everyone who passes the filters, before the measure's rules are applied. Click to list them below."
            onClick={() => onView("")}
          />
          <StatCard
            label="Eligible"
            value={t.denominator}
            sub={t.review ? `${t.review} need review` : undefined}
            tip={tips.counted}
            onClick={() => onView("")}
          />
          <StatCard
            label="Excluded"
            value={t.excluded}
            tip={tips.excluded}
            onClick={() => onView("")}
          />
        </Box>
        <Box sx={cardGrid(4)}>
          <StatCard
            label="Met"
            value={t.met}
            tip={tips.met}
            active={view === "Met"}
            onClick={() => onView("Met")}
          />
          <StatCard
            label="Met %"
            value={pct(share(t.met, t.denominator))}
            tip={tips.rate}
            variant="highlight"
            active={view === "Met"}
            onClick={() => onView("Met")}
          />
          <StatCard
            label="Not met"
            value={t.gap}
            tip={tips.notMet}
            active={view === "Gap"}
            onClick={() => onView("Gap")}
          />
          <StatCard
            label="Not met %"
            value={pct(share(t.gap, t.denominator))}
            tip="Not met members divided by eligible members."
            active={view === "Gap"}
            onClick={() => onView("Gap")}
          />
        </Box>
        {second && (
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 700, fontSize: ".9375rem" }}>
              Second rate: HbA1c at or under 9%
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Glycemic status is reported as two rates. The cards above use
              HbA1c under 8%. Demo assumption: confirm the exact definition with
              the customer.
            </Typography>
            <Box sx={cardGrid(4)}>
              <StatCard label="Met" value={second.met} />
              <StatCard
                label="Met %"
                value={pct(second.rate)}
                variant="highlight"
              />
              <StatCard label="Not met" value={second.notMet} />
              <StatCard
                label="Not met %"
                value={pct(share(second.notMet, second.den))}
              />
            </Box>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
