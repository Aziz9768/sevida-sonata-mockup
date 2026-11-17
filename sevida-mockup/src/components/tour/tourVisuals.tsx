import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CheckBoxRoundedIcon from "@mui/icons-material/CheckBoxRounded";
import CheckBoxOutlineBlankRoundedIcon from "@mui/icons-material/CheckBoxOutlineBlankRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import { GapStatusChip } from "../GapStatusChip";

/**
 * Version 16: the small pictures on the tour cards.
 * Each one is a drawing of the real control or the real value, built from the same colours, chips and icons as the screen,
 * so what the person sees on the card is what they will find on the page. They are decoration only: the card text says the same thing.
 */
export type VisualId =
  | "measureTabs"
  | "dataRun"
  | "pcmSearch"
  | "clearFilters"
  | "gapTabs"
  | "filters"
  | "columns"
  | "savedViews"
  | "priority"
  | "openGap"
  | "memberHeader"
  | "detailTabs"
  | "gapSummary"
  | "whyOpen"
  | "howToClose"
  | "openGapsCount"
  | "openMember"
  | "recordTabs"
  | "sortTable";

const INK = "text.primary";
const MUTED = "text.secondary";

/** The grey panel every picture sits on. */
function Stage({ children, side }: { children: ReactNode; side?: "filters" | "columns" }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: "relative",
        pr: side ? 6 : 1.5,
        bgcolor: "grey.100",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        px: 1.5,
        py: 1.25,
        mb: 1.5,
        minHeight: 84,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 0.75,
        overflow: "hidden",
      }}
    >
      {children}
      {side && (
        <Box sx={{ position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 0.5 }}>
          {(["columns", "filters"] as const).map((t) => (
            <Box
              key={t}
              sx={{
                writingMode: "vertical-rl",
                transform: "rotate(180deg)",
                px: 0.5,
                py: 0.75,
                fontSize: ".625rem",
                fontWeight: 600,
                textTransform: "capitalize",
                borderRadius: "4px",
                border: "1px solid",
                borderColor: side === t ? "secondary.main" : "divider",
                bgcolor: "background.paper",
                color: side === t ? "secondary.main" : MUTED,
                boxShadow: side === t ? "0 0 0 3px rgba(80,90,200,.18)" : "none",
              }}
            >
              {t}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

const Cap = ({ children }: { children: ReactNode }) => (
  <Typography sx={{ fontSize: ".6875rem", color: MUTED, lineHeight: 1.3 }}>{children}</Typography>
);

/** A row of tabs; `on` is the one that is open, `n` the optional count. */
function Tabs({ items, on }: { items: Array<[string, number?]>; on: number }) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
      {items.map(([t, n], k) => (
        <Box
          key={t}
          sx={{
            pb: 0.5,
            fontSize: ".75rem",
            fontWeight: k === on ? 700 : 500,
            color: k === on ? "secondary.main" : MUTED,
            borderBottom: "2px solid",
            borderColor: k === on ? "secondary.main" : "transparent",
            mb: "-1px",
            whiteSpace: "nowrap",
          }}
        >
          {t}
          {n !== undefined && ` (${n})`}
        </Box>
      ))}
    </Box>
  );
}

/** A square icon button like the ones in the table toolbar; `hot` marks the one the step is about. */
function IconBtn({ children, hot }: { children: ReactNode; hot?: boolean }) {
  return (
    <Box
      sx={{
        width: 30,
        height: 30,
        borderRadius: "6px",
        border: "1px solid",
        borderColor: hot ? "secondary.main" : "divider",
        bgcolor: "background.paper",
        color: hot ? "secondary.main" : MUTED,
        boxShadow: hot ? "0 0 0 3px rgba(80,90,200,.18)" : "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </Box>
  );
}

function Toolbar({ hot }: { hot?: "views" }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ flex: 1, height: 30, borderRadius: "6px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", display: "flex", alignItems: "center", px: 0.75, color: MUTED, gap: 0.5 }}>
        <SearchRoundedIcon sx={{ fontSize: 16 }} />
        <Typography sx={{ fontSize: ".6875rem" }}>Search</Typography>
      </Box>
      <IconBtn hot={hot === "views"}>
        <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
      </IconBtn>
      <IconBtn>
        <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
      </IconBtn>
    </Box>
  );
}

const Pill = ({ children, tone }: { children: ReactNode; tone?: "on" }) => (
  <Box
    sx={{
      display: "inline-flex",
      alignItems: "center",
      px: 1,
      height: 22,
      borderRadius: "11px",
      fontSize: ".6875rem",
      fontWeight: 600,
      border: "1px solid",
      borderColor: tone === "on" ? "secondary.main" : "divider",
      bgcolor: tone === "on" ? "rgba(80,90,200,.10)" : "background.paper",
      color: tone === "on" ? "secondary.main" : INK,
    }}
  >
    {children}
  </Box>
);

const Line = ({ w, bold }: { w: number | string; bold?: boolean }) => (
  <Box sx={{ height: bold ? 8 : 6, width: w, borderRadius: 3, bgcolor: bold ? "grey.500" : "grey.300" }} />
);

export const VISUALS: Record<VisualId, () => ReactNode> = {
  measureTabs: () => (
    <Stage>
      <Tabs items={[["Overview"], ["BCS"], ["CCS"], ["COL"], ["GSD"], ["WCV"]]} on={0} />
      <Cap>Overview shows every measure. Each measure tab shows just that one.</Cap>
    </Stage>
  ),
  dataRun: () => (
    <Stage>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 32, px: 1, borderRadius: "6px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Typography sx={{ fontSize: ".75rem", fontWeight: 600 }}>Run 10/16/2026, 2:00 AM (latest)</Typography>
        <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: MUTED }} />
      </Box>
      <Cap>Older runs are listed under the latest one.</Cap>
    </Stage>
  ),
  pcmSearch: () => (
    <Stage>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: 32, px: 1, borderRadius: "6px", border: "1px solid", borderColor: "secondary.main", bgcolor: "background.paper", boxShadow: "0 0 0 3px rgba(80,90,200,.14)" }}>
        <SearchRoundedIcon sx={{ fontSize: 16, color: MUTED }} />
        <Typography sx={{ fontSize: ".75rem" }}>Mitchell or 1000000905</Typography>
      </Box>
      <Cap>Name or NPI. Every number and chart follows this one care manager.</Cap>
    </Stage>
  ),
  clearFilters: () => (
    <Stage>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
        <Pill tone="on">Year: 2026</Pill>
        <Pill tone="on">Run: 10/16</Pill>
        <Pill tone="on">PCM: Mitchell</Pill>
        <Box sx={{ ml: "auto", fontSize: ".75rem", fontWeight: 600, color: "secondary.main", textDecoration: "underline" }}>Clear All Filters</Box>
      </Box>
      <Cap>One click puts every filter back to its first value.</Cap>
    </Stage>
  ),
  gapTabs: () => (
    <Stage>
      <Tabs items={[["All Gaps"], ["BCS"], ["CCS"], ["COL"], ["GSD"], ["WCV"]]} on={1} />
      <Cap>BCS is open, so the list holds only breast cancer screening gaps.</Cap>
    </Stage>
  ),
  filters: () => (
    <Stage side="filters">
      <Typography sx={{ fontSize: ".6875rem", fontWeight: 700 }}>Filters</Typography>
      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        <Pill tone="on">Gap Status: Open</Pill>
        <Pill tone="on">Priority: High</Pill>
        <Pill tone="on">Age: 50 to 74</Pill>
      </Box>
      <Cap>Each filter you add narrows the list further.</Cap>
    </Stage>
  ),
  columns: () => (
    <Stage side="columns">
      <Typography sx={{ fontSize: ".6875rem", fontWeight: 700 }}>Columns</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.25 }}>
        {[
          ["Member Name", true],
          ["Priority", true],
          ["Gap Source", false],
          ["Closure Source", false],
        ].map(([n, on]) => (
          <Box key={String(n)} sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: ".6875rem", color: on ? INK : MUTED }}>
            {on ? <CheckBoxRoundedIcon sx={{ fontSize: 16, color: "secondary.main" }} /> : <CheckBoxOutlineBlankRoundedIcon sx={{ fontSize: 16 }} />}
            {String(n)}
          </Box>
        ))}
      </Box>
    </Stage>
  ),
  savedViews: () => (
    <Stage>
      <Toolbar hot="views" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
        <Typography sx={{ fontSize: ".6875rem", fontWeight: 700 }}>My views</Typography>
        <Typography sx={{ fontSize: ".6875rem", color: INK }}>High priority, due this month</Typography>
        <Typography sx={{ fontSize: ".6875rem", color: INK }}>Women 50 to 74, open gaps</Typography>
      </Box>
    </Stage>
  ),
  priority: () => (
    <Stage>
      <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.5 }}>
        <Typography sx={{ fontSize: ".6875rem", color: MUTED }}>Priority</Typography>
        <Typography sx={{ fontSize: ".6875rem", color: MUTED }}>Days left to the due date</Typography>
        {(
          [
            ["High", "30 or fewer", "12 days left"],
            ["Medium", "31 to 60", "45 days left"],
            ["Low", "More than 60", "80 days left"],
          ] as const
        ).map(([p, r, e]) => (
          <Box key={p} sx={{ display: "contents" }}>
            <Typography sx={{ fontSize: ".75rem", fontWeight: 700 }}>{p}</Typography>
            <Typography sx={{ fontSize: ".75rem" }}>
              {r} <Box component="span" sx={{ color: MUTED }}>(for example {e})</Box>
            </Typography>
          </Box>
        ))}
      </Box>
    </Stage>
  ),
  openGap: () => (
    <Stage>
      <Box sx={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 1, alignItems: "center" }}>
        <Typography sx={{ fontSize: ".75rem", color: MUTED }}>Member</Typography>
        <Typography sx={{ fontSize: ".75rem", color: MUTED }}>Gap</Typography>
        <Typography sx={{ fontSize: ".8125rem", color: "primary.main", textDecoration: "underline" }}>Emma S Brooks</Typography>
        <Typography sx={{ fontSize: ".8125rem", color: "primary.main", textDecoration: "underline" }}>BCS - Breast Cancer Screening</Typography>
      </Box>
      <Cap>The member name opens the member. The gap name opens the gap.</Cap>
    </Stage>
  ),
  memberHeader: () => (
    <Stage>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography sx={{ fontSize: ".8125rem", fontWeight: 700 }}>Emma S Brooks</Typography>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, fontSize: ".6875rem", color: "secondary.main", fontWeight: 600 }}>
          All details <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.25 }}>
        <Cap>Member ID: 13032237363</Cap>
        <Cap>Care manager: Mitchell, James</Cap>
        <Cap>Clinic: Family Medicine</Cap>
        <Cap>Enrollment: Active</Cap>
      </Box>
    </Stage>
  ),
  detailTabs: () => (
    <Stage>
      <Tabs items={[["Overview"], ["Evidence"], ["History"]]} on={0} />
      <Cap>Overview explains the gap. Evidence holds the records. History lists every change.</Cap>
    </Stage>
  ),
  gapSummary: () => (
    <Stage>
      <Box sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 1.5, rowGap: 0.5, alignItems: "center" }}>
        <Cap>Status</Cap>
        <Box>
          <GapStatusChip closed={false} />
        </Box>
        <Cap>Priority</Cap>
        <Typography sx={{ fontSize: ".75rem", fontWeight: 600 }}>High</Typography>
        <Cap>Days Remaining</Cap>
        <Typography sx={{ fontSize: ".75rem", fontWeight: 600 }}>26 Days</Typography>
        <Cap>Due date</Cap>
        <Typography sx={{ fontSize: ".75rem", fontWeight: 600 }}>11/11/2026</Typography>
      </Box>
    </Stage>
  ),
  whyOpen: () => (
    <Stage>
      <Typography sx={{ fontSize: ".75rem", color: INK }}>No well-care visit found between Jan 1, 2026 and Oct 16, 2026. No well-care visit on record.</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: ".6875rem", color: "primary.main", textDecoration: "underline" }}>
        See the records on the Evidence tab.
      </Box>
    </Stage>
  ),
  howToClose: () => (
    <Stage>
      <Typography sx={{ fontSize: ".75rem", color: INK }}>Schedule a well-care visit with a primary care provider before the due date.</Typography>
    </Stage>
  ),
  openGapsCount: () => (
    <Stage>
      <Box sx={{ display: "grid", gridTemplateColumns: "1.3fr auto", gap: 1, alignItems: "center" }}>
        <Typography sx={{ fontSize: ".6875rem", color: MUTED }}>Member</Typography>
        <Typography sx={{ fontSize: ".6875rem", color: MUTED }}># Open Gaps</Typography>
        <Typography sx={{ fontSize: ".75rem" }}>Emma S Brooks</Typography>
        <Typography sx={{ fontSize: ".8125rem", color: "primary.main", textDecoration: "underline", fontWeight: 600, textAlign: "center" }}>3</Typography>
        <Typography sx={{ fontSize: ".75rem" }}>Fatima W Nair</Typography>
        <Typography sx={{ fontSize: ".8125rem", color: "primary.main", textDecoration: "underline", fontWeight: 600, textAlign: "center" }}>1</Typography>
      </Box>
    </Stage>
  ),
  openMember: () => (
    <Stage>
      <Typography sx={{ fontSize: ".8125rem", color: "primary.main", textDecoration: "underline" }}>Emma S Brooks</Typography>
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
        {["Care Gaps", "Claims", "Labs", "Medications", "Providers"].map((t) => (
          <Pill key={t}>{t}</Pill>
        ))}
      </Box>
    </Stage>
  ),
  recordTabs: () => (
    <Stage>
      <Tabs items={[["Care Gaps", 3], ["Claims", 24], ["Diagnoses", 9], ["Labs", 12]]} on={0} />
      <Cap>The number is how many records the tab holds.</Cap>
    </Stage>
  ),
  sortTable: () => (
    <Stage>
      <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0.75, alignItems: "center" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, fontSize: ".75rem", fontWeight: 700 }}>
          Date <ArrowUpwardRoundedIcon sx={{ fontSize: 14, color: "secondary.main" }} />
          <Box sx={{ ml: 0.5, width: 14, height: 14, borderRadius: "50%", border: "1px solid", borderColor: MUTED, color: MUTED, fontSize: ".5625rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            i
          </Box>
        </Box>
        <Typography sx={{ fontSize: ".75rem", fontWeight: 700 }}>Result</Typography>
        <Line w="70%" />
        <Line w="50%" />
        <Line w="60%" />
        <Line w="40%" />
      </Box>
    </Stage>
  ),
};
