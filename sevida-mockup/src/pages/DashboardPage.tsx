import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { Button, PageContainer, Tabs } from "sevida-ui";
import { AdminTab } from "../components/dashboard/AdminTab";
import { DashboardFilters } from "../components/dashboard/DashboardFilters";
import { DisparityCharts } from "../components/dashboard/DisparityCharts";
import { ExportMenu } from "../components/dashboard/ExportMenu";
import { HowToModal } from "../components/dashboard/HowToModal";
import { InputsCard } from "../components/dashboard/InputsCard";
import { BaselineCard, KpiCards } from "../components/dashboard/KpiBlocks";
import type { MemberView } from "../components/dashboard/KpiBlocks";
import { MembersCard } from "../components/dashboard/MembersCard";
import { useRole } from "../roles";
import { RunInfo } from "../components/dashboard/RunInfo";
import { TrendCard } from "../components/dashboard/TrendCard";
import { filterLines, measureSheets } from "../components/dashboard/exportDoc";
import { useGaps } from "../careGaps";
import { CURRENT_YEAR, measureByCode, measureFor, measures } from "../data";
import {
  emptyFilters,
  facetOptions,
  filterMembers,
  periodText,
} from "../dashboardData";

/**
 * The dashboard, laid out like the Sigma wireframe. One tab per measure, plus Admin.
 * Top to bottom: title and what the measure counts, filters, then Results (with the whole-population box beside them),
 * the charts by group, the trend with its numbers, the list of members, and what went into the measure.
 */
export function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const { role, memberLists } = useRole();
  const isAdmin = params.get("tab") === "admin" && role.dataQuality;
  const code = (measureByCode(params.get("m") ?? "") ?? measures[0]).code;
  const [filters, setFilters] = useState(emptyFilters());
  const [how, setHow] = useState(false);
  const [view, setView] = useState<MemberView>("");
  const { gapsOf } = useGaps();
  const year = filters.year;
  const options = useMemo(() => facetOptions(), []);
  const list = useMemo(() => filterMembers(filters, code), [filters, code]);
  const def = measureFor(measureByCode(code)!, year);
  const closed =
    year !== CURRENT_YEAR
      ? null
      : list.filter((m) =>
          gapsOf(m).some((g) => g.def.code === code && g.status === "Closed"),
        ).length;

  // Clicking a card lists those members and brings the list into view.
  const pick = (v: MemberView) => {
    setView(v);
    requestAnimationFrame(() =>
      document
        .getElementById("dashboard-members")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const go = (k: string) => {
    setView("");
    const next = new URLSearchParams(params);
    if (k === "admin") {
      next.set("tab", "admin");
      next.delete("m");
    } else {
      next.delete("tab");
      next.set("m", k);
    }
    setParams(next, { replace: true });
  };

  const body = (
    <Stack spacing={2}>
      <DashboardFilters
        filters={filters}
        onApply={setFilters}
        options={options}
      />
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", textAlign: "center" }}
      >
        The Results, charts, trend and member list change with the filters
        above. The Whole population box does not.
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "300px minmax(0, 1fr)" },
          alignItems: "start",
        }}
      >
        <BaselineCard code={code} year={year} />
        <KpiCards
          code={code}
          list={list}
          year={year}
          closed={closed}
          view={view}
          onView={pick}
        />
      </Box>
      <DisparityCharts code={code} list={list} year={year} />
      <TrendCard code={code} list={list} />
      {memberLists && (
        <MembersCard
          code={code}
          list={list}
          year={year}
          view={view}
          onView={setView}
        />
      )}
      <InputsCard code={code} def={def} list={list} year={year} />
    </Stack>
  );

  return (
    <PageContainer
      title={isAdmin ? "Dashboard admin" : `${def.code} · ${def.name}`}
      titleVariant="overview"
      subtitle={
        isAdmin
          ? "Rows the loading step rejected or warned about, so the right file can be fixed and sent again."
          : `${def.population}. ${def.needs} Measurement period: ${periodText(year)}.`
      }
      actions={
        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ flexWrap: "wrap", rowGap: 1 }}
        >
          <RunInfo />
          {!isAdmin && (
            <>
              <ExportMenu
                fileName={`dashboard-${code}`}
                build={() => ({
                  title: `${def.name} (${def.code}) dashboard`,
                  lines: filterLines(filters),
                  sheets: measureSheets(code, list, filters),
                })}
              />
              <Button variant="secondary" onClick={() => setHow(true)}>
                How to use
              </Button>
            </>
          )}
        </Stack>
      }
    >
      <Tabs
        ariaLabel="Dashboards"
        value={isAdmin ? "admin" : code}
        onChange={go}
        items={[
          ...[...measures]
            .sort((a, b) => a.short.localeCompare(b.short))
            .map((m) => ({ key: m.code, label: m.short })),
          ...(role.dataQuality ? [{ key: "admin", label: "Admin" }] : []),
        ]}
      />
      {isAdmin ? <AdminTab /> : body}
      <HowToModal open={how} onClose={() => setHow(false)} />
    </PageContainer>
  );
}

export default DashboardPage;
