import { useRef } from "react";
import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { BarChart, Card } from "sevida-ui";
import type { BarDatum } from "sevida-ui";
import type { Member, MeasureCode } from "../../data";
import { SMALL_GROUP } from "../../insights";
import { dimensionLabel, groupRates } from "../../dashboardData";
import type { Dimension } from "../../dashboardData";
import { ChartImageButton } from "./ChartImageButton";

const DIMS: Dimension[] = ["race", "ethnicity", "ageGroup", "sex", "provider"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A chart card with a "download as image" icon in its header. */
export function ChartCard({
  title,
  fileName,
  footer,
  children,
}: {
  title: string;
  fileName: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  return (
    <Card
      title={title}
      footer={footer}
      action={
        <ChartImageButton target={box} title={title} fileName={fileName} />
      }
    >
      <Box ref={box}>{children}</Box>
    </Card>
  );
}

/** One bar chart per way of splitting the members: Met % for each group. Under each name: met of eligible. A star marks a group with fewer than 10 eligible members. */
export function DisparityCharts({
  code,
  list,
  year,
}: {
  code: MeasureCode;
  list: Member[];
  year: number;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
      }}
    >
      {DIMS.map((dim) => {
        const rows = groupRates(code, list, year, dim);
        const small = rows.some((r) => r.t.denominator < SMALL_GROUP);
        const data: BarDatum[] = rows.map((r) => ({
          label: r.group,
          value: r.t.rate,
          note: `${r.t.met} of ${r.t.denominator}${r.t.denominator < SMALL_GROUP ? " *" : ""}`,
        }));
        return (
          <ChartCard
            key={dim}
            title={`Met % by ${dimensionLabel[dim]}`}
            fileName={`${code}-met-by-${dim}`}
            footer={
              small ? (
                <span>
                  * Fewer than {SMALL_GROUP} eligible members. One member can
                  move the rate by many points, so read it with care.
                </span>
              ) : undefined
            }
          >
            {data.length < 2 ? (
              <Box sx={{ color: "text.secondary", fontSize: ".875rem" }}>
                {data.length === 0
                  ? "Nobody is eligible for these filters."
                  : `Only one group, so there is nothing to compare: ${cap(rows[0].group)} ${Math.round(rows[0].t.rate)}% (${rows[0].t.met} of ${rows[0].t.denominator}).`}
              </Box>
            ) : (
              <BarChart
                data={data}
                label={`Met percent of ${code} by ${dimensionLabel[dim]}`}
                valueLabel="Met (%)"
              />
            )}
          </ChartCard>
        );
      })}
    </Box>
  );
}
