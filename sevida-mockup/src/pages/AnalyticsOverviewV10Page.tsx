import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Box, Breadcrumbs, Link, Typography } from "@mui/material";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Tabs } from "sevida-ui";
import { useDocumentTitle } from "../components/analytics/AnalyticsBits";
import { V3_GAP_LABEL, gapShort } from "../v3Data";
import type { MeasureCode } from "../data";

/**
 * Version 10 Overview: the Analytics page exactly as Sonata has it today (sonataweb.dev.leapmetrics.io/m/analytics).
 * Breadcrumb, "Analytics & Dashboards" heading, one tab per dashboard, then a card with a plain list: Measure and
 * What it measures. No numbers, controls or charts here. The numbers live inside each measure's own dashboard.
 * The descriptions are Sonata's own words, copied as they read there.
 *
 * Sizes and colours are measured from the live Sonata page (16px body text, 18px heading, 14px tabs and table text,
 * 20px card title, 64px rows). Keep them as plain values here so this page stays a true copy.
 */
const SONATA = {
  link: "rgb(62, 95, 202)",
  purple: "rgb(72, 69, 129)",
  headerBg: "rgb(39, 36, 96)",
  text: "rgba(0, 0, 0, 0.87)",
  muted: "rgba(0, 0, 0, 0.6)",
};

const ROWS: { code: MeasureCode; what: string }[] = [
  {
    code: "BCS-E",
    what: "The share of women in the recommended age range who had a mammogram to screen for breast cancer within the look-back period.",
  },
  {
    code: "CCS-E",
    what: "The share of women in the recommended age range who were screened for cervical cancer.",
  },
  {
    code: "COL-E",
    what: "The share of members in the recommended age range who had an appropriate screening for colorectal cancer.",
  },
  {
    code: "GSD",
    what: "How well blood sugar is controlled in members ages 18 to 75 with diabetes, based on their most recent glycemic status test (HbA1c or GMI) during the measurement year.",
  },
  {
    code: "WCV",
    what: "The share of members ages 3 to 21 who had at least one comprehensive well-care visit with a primary care provider or an OB/GYN during the measurement year.",
  },
];

const TAB_ITEMS = [
  { key: "overview", label: "Overview" },
  ...ROWS.map((r) => ({
    key: gapShort(r.code),
    label: gapShort(r.code),
    tip: V3_GAP_LABEL[r.code],
  })),
];

export function AnalyticsOverviewV10Page() {
  useDocumentTitle("Overview, Analytics");
  const nav = useNavigate();
  const openMeasure = (code: string) => nav(`/quicksight?m=${gapShort(code)}`);

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "auto",
        bgcolor: "background.default",
        px: { xs: 1.5, sm: 2.75 },
        py: { xs: 1.5, sm: 2 },
        fontSize: 16,
      }}
    >
      <Breadcrumbs
        aria-label="Breadcrumb"
        separator={<NavigateNextIcon sx={{ fontSize: 20 }} />}
        sx={{
          mb: 3,
          fontSize: 16,
          "& .MuiBreadcrumbs-li, & a, & p": { fontSize: 16, lineHeight: "24px" },
        }}
      >
        <Link
          component={RouterLink}
          to="/"
          underline="hover"
          sx={{ color: "rgb(40, 40, 40)" }}
        >
          Home
        </Link>
        <Typography
          component="p"
          aria-current="page"
          sx={{ color: SONATA.link }}
        >
          Analytics
        </Typography>
      </Breadcrumbs>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, pb: 0.75 }}>
          <AssessmentOutlinedIcon sx={{ color: SONATA.purple, fontSize: 24 }} />
          <Typography
            component="h1"
            sx={{
              fontSize: 18,
              fontWeight: 400,
              lineHeight: "22px",
              color: SONATA.text,
            }}
          >
            Analytics &amp; Dashboards
          </Typography>
        </Box>
        <Box
          sx={{ width: 54, height: 2, bgcolor: SONATA.purple, borderRadius: 1 }}
        />
      </Box>

      <Box
        sx={{
          "& .MuiTab-root": {
            fontSize: 14,
            fontWeight: 400,
            px: 2,
            py: 1.5,
            minHeight: 48,
            minWidth: 90,
            textTransform: "none",
            color: SONATA.muted,
          },
          "& .MuiTab-root.Mui-selected": { color: SONATA.purple },
          "& .MuiTabs-indicator": { backgroundColor: SONATA.purple },
          "& .MuiTabs-root": { minHeight: 48 },
        }}
      >
        <Tabs
          ariaLabel="Analytics dashboards"
          items={TAB_ITEMS}
          value="overview"
          gap={false}
          onChange={(k) => {
            if (k !== "overview") openMeasure(k);
          }}
        />
      </Box>

      <Box
        sx={{
          mt: "9px",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontSize: 20,
              fontWeight: 400,
              lineHeight: "32px",
              color: SONATA.text,
            }}
          >
            Overview
          </Typography>
        </Box>
        <Typography
          sx={{
            px: 2,
            pb: 2,
            fontSize: 16,
            lineHeight: "24px",
            color: SONATA.muted,
          }}
        >
          The quality measures we report on. Open a measure to see its
          dashboard.
        </Typography>
        <Box
          component="table"
          aria-label="Quality measures"
          sx={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            // The header colour is painted once behind the whole table. Painting it per cell leaves faint
            // seams between cells when a column edge falls on a fraction of a pixel (150% screens).
            background: `linear-gradient(${SONATA.headerBg}, ${SONATA.headerBg}) top / 100% 72px no-repeat`,
            tableLayout: "fixed",
            "& th, & td": { textAlign: "left", verticalAlign: "middle" },
            "& th": { border: 0 },
          }}
        >
          <Box component="colgroup">
            <col style={{ width: 48 }} />
            <col style={{ width: "28%" }} />
            <col />
          </Box>
          <Box component="thead">
            <Box component="tr" sx={{ height: 72 }}>
              <Box component="th" scope="col" aria-label="Icon" />
              <Box
                component="th"
                scope="col"
                sx={{
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  p: "12px",
                }}
              >
                Measure
              </Box>
              <Box
                component="th"
                scope="col"
                sx={{
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  p: "12px 16px",
                }}
              >
                What it measures
              </Box>
            </Box>
          </Box>
          <Box component="tbody">
            {ROWS.map((r) => (
              <Box
                component="tr"
                key={r.code}
                sx={{
                  height: 64,
                  "& td": { borderBottom: 1, borderColor: "divider" },
                  "&:last-of-type td": { borderBottom: 0 },
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box component="td" sx={{ p: "6px 0 6px 16px" }}>
                  <InsightsOutlinedIcon
                    sx={{ color: SONATA.link, fontSize: 24, display: "block" }}
                  />
                </Box>
                <Box component="td" sx={{ p: "6px 16px 6px 16px" }}>
                  <Link
                    component={RouterLink}
                    to={`/quicksight?m=${gapShort(r.code)}`}
                    underline="always"
                    sx={{ color: SONATA.link, fontSize: 14, fontWeight: 500 }}
                  >
                    {V3_GAP_LABEL[r.code]}
                  </Link>
                </Box>
                <Box
                  component="td"
                  sx={{
                    p: "6px 16px",
                    fontSize: 14,
                    lineHeight: "20px",
                    color: SONATA.text,
                  }}
                >
                  {r.what}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default AnalyticsOverviewV10Page;
