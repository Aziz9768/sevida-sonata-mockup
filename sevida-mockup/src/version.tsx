import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Button } from "sevida-ui";

/**
 * Versions of the mockup. Each one keeps its own look, so the team can switch between them and compare.
 * To add a version: add a row here (with its date), then read `useVersion().id` where the screens differ.
 * Never edit the behaviour of an older version: version 1 stays exactly as it was on its date.
 */
export type VersionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;
export interface VersionInfo {
  id: VersionId;
  name: string;
  /** The day this version was frozen or created, as YYYY-MM-DD. */
  date: string;
  /** One line shown under the name in the dropdown. */
  summary: string;
  /** The list of changes compared with the version before it. */
  changes: string[];
}

export const VERSIONS: VersionInfo[] = [
  {
    id: 1,
    name: "Version 1",
    date: "2026-10-23",
    summary: "The mockup as it was before the member table change list.",
    changes: ["The starting point. Nothing changed."],
  },
  {
    id: 2,
    name: "Version 2",
    date: "2026-10-23",
    summary:
      "Member search column updates from the 10/22 call (Jira LPP-16069): slimmer Members list, grouped columns, a leaner sidebar.",
    changes: [
      "Members list: Insurance Number is now Subscriber ID, Sex is now Gender, Gaps is now Gap Measures, Gap Identified is now Gap Identified Date (one date for each gap measure).",
      "Members list: removed First Name, Last Name, Spoken Language, Age Group, Primary Care Provider, Care Team, Care Manager, State, County, Military Status, Closed Gaps, Evidence Date, Evidence, Diagnosis, Measure Results, Latest HbA1c, Next Appointment, Last Contact, Contact Result and Last Updated (Age Status was removed too).",
      "Members list: Race and Ethnicity are shown, with new Race Source and Ethnicity Source columns. New HEDIS Measures Eligibility column. Missing Evidence is kept as is.",
      "Members list: columns are grouped under Demographics and Care Gaps, A to Z in each group (in the table and in the Columns panel).",
      "Members list: Excluded From column removed. It moves to a new Excluded From tab on the Member page (each measure the member is excluded from and why).",
      "Member page: Diagnosis codes card on the Measures tab. HbA1c values (all of them) at the top of the Labs sub-tab. New Observation (Procedure) sub-tab under Records.",
      "Sidebar: Access Log and Analytics Option 2 are hidden, and Quality Measure Analytics is now called Analytics.",
    ],
  },
  {
    id: 3,
    name: "Version 3",
    date: "2026-10-25",
    summary:
      "Built strictly from the final requirements sheet: Care Gaps first, a slim Members list, new Member page tabs, Analytics split by measure.",
    changes: [
      "Follows the final Google Sheet row by row. Anything the sheet does not mention is removed. The details are in Sevida-V3-gap-analysis.xlsx.",
      "Sidebar: Analytics (Overview, BCS, CCS, COL, GSD, WCV), then Care Gaps, then Members. Care Gaps opens first.",
      "Members list: Member Name, Tricare ID, Age, Gender, Gap Name(s) (the sheet says Open Gap(s), renamed because it read the same as # Open Gaps), # Open Gaps, Gap Identified Date. Other fields are in the Columns panel or only in filters. Age shows days, months or years. Age Min / Age Max filters, a fixed Age Range filter, and four demo young children.",
      "Member page: the header follows the sheet's wireframe (name, DOB, Tricare ID, Tricare Enrollment, Age, Genesis EHR ID with See all IDs, Military Status, Open Care Gaps, Gap Data Last Updated, and an Expand block with addresses, phone, email, marital status, race and ethnicity). The same header is on the Care Gap page. Care Gaps first, then Claims, Diagnoses, Labs, Observations, Procedures, Providers and Visits. Every member has records in every tab (the files' records plus routine demo records). The Care Gaps tab lists each gap with its identified and closed dates and explanations.",
      "Care Gaps list: one row per gap with a Gap Status filter (Open by default), # Open Gaps, Missing Evidence, Due Date, and the member list filters. Genesis EHR ID is a hidden column on Members and Care Gaps (sample data). Every displayed column sorts, except Actions.",
      "Care Gap page: Overview (why the gap is open, who is considered, what is left, due date) and Evidence (records found in the files). No actions, follow-up, history or closing.",
      "Measure rules: breast screening starts at 52 and also excludes a one-sided mastectomy, gender-affirming chest surgery, and age 66+ in an I-SNP or long-term institution. Cervical screening counts a high-risk HPV test and excludes palliative care. Colorectal screening excludes age 66+ in an I-SNP or long-term institution. Diabetes blood sugar uses the lowest final HbA1c. These change the Version 3 numbers only.",
      "Dashboards: Overview has a Gap in more than one measure filter. The period shows year to date. Trend range is picked per granularity. GSD shows total, over 8% and over 9%. Gender and # Open Gaps replace Sex and Open care gaps. Requirement tags are hidden.",
      "Admin: Rejected Rows by Reason, the Succeeded on retry and Failed on retry file load statuses, and a Nightly Run History Trend.",
      "Filters: Members, Care Gaps and the dashboards share the same facets and values (Gender, Age Range, Age Min / Max, Military Status with nine values, Race and Ethnicity with None, # Open Gaps with an operator). Every member has a military status.",
      "Consistency pass: the dashboards use the same names as the lists (BCS - Breast Cancer Screening, Date of Birth, Military Status, Age Range, Gender, # Open Gaps, Tricare ID search). Dashboard member counts, # Open Gaps and the Care Gaps list agree. The Care Gaps tab on a member lists earlier years with the status of the same gap this year.",
      "Not built: the 31 sheet rows marked Later (including the long Claims field list), and rows that are open questions or platform checks (listed in the gap analysis).",
    ],
  },
  {
    id: 4,
    name: "Version 4",
    date: "2026-10-26",
    summary:
      "Version 3 with Missing Evidence renamed to Recommended Actions, the Profile tab back on the Member page, and Closed Gaps / Gap Closed On columns.",
    changes: [
      "Everything else is the same as Version 3.",
      "Care Gaps list and Care Gap page: the Missing Evidence column / field is now called Recommended Actions (in the table, the Columns panel and the Care Gap Summary). The values are unchanged.",
      "Member page: the Profile tab is back as a sub tab (contact information, primary care provider, language, disability, race and ethnicity detail). It sits right after Care Gaps. Care Gaps is still the tab that opens first.",
      "Care Gaps list: Gap Status (Open / Closed) is now a column, shown by default right after Open Gap, as well as a filter. In Version 3 it was a filter only.",
      "Member header (Member page and Care Gap page): the original look is back (name, date of birth and enrollment chip on top, small-capital labels over values, a boxed expand button), with the sheet's fields: Tricare ID, Age, Genesis EHR ID with See all IDs, Military Status, Open Care Gaps, Gap Data Last Updated, and the address block when expanded.",
      "Care Gap page: the member name in the header is a link to the Member page.",
      "Care Gaps list: the gap name is a link that opens that care gap's page.",
      "Members list: new Closed Gaps column (the measures already closed, as chips). Gap Closed Date is now called Gap Closed On, on the Members list (column and date filter) and the Care Gaps list. Both are in the Columns panel, hidden by default.",
    ],
  },
  {
    id: 5,
    name: "Version 5",
    date: "2026-10-30",
    summary:
      "Version 4 with Analytics redesigned from the UX report: a scorecard Overview, one frame for every dashboard, 12 demo dashboards in 3 groups.",
    changes: [
      "Everything outside Analytics is the same as Version 4. Versions 1 to 4 keep their own Analytics pages.",
      "Sidebar: Analytics has Overview plus one entry per group (Preventive Screening, Chronic Condition Care, Child and Adolescent Health). The dashboards of a group are tabs inside it. The groups and tabs are drawn from one list in the code (analyticsRegistry.ts), so a new dashboard or a new group is one new row.",
      "Overview is a scorecard: one row per dashboard with the result, members counted (n), whether higher or lower is better, the change since last year (in words and an arrow), the benchmark, the status (a word and an icon, never colour alone) and the last updated date. Sortable, searchable and filterable, with a group level on top and the furthest-from-benchmark measure named in the first card.",
      "Every dashboard has the same frame in the same order: title once, one sentence with the age range, last updated, group tabs, one filter row (Age Range, Gap Status, Gender, Measurement Year, A to Z, same names as the app, working at once), a line that says which filters are on with one Reset, summary tiles, charts, member list.",
      "Every percentage shows its group size (n). Groups under 30 members are flagged Small group with a word and an icon. Every measure says Higher is better or Lower is better (GSD is lower).",
      "One page scroll, no scroll bars inside, no cut-off text, and the layout stacks to one column in a half-width window.",
      "Help is in one place (How to read this): plain words first, the HEDIS term second, the same words as the (i) icons. A loading skeleton shows while a dashboard draws. Copy link keeps the filters. Export and print are in one menu. Each page has its own browser tab title. A wrong address shows a Not Found page with links.",
      "Build notes: each part of the page is tagged Works with the embed (QuickSight can draw it) or Needs custom build (Sonata builds it). Use Hide build notes in the page header to turn the tags off.",
      "Demo: 12 dashboards in 3 groups. The five real measures (BCS, CCS, COL, GSD, WCV) read the demo members. The other seven (CHL, CBP, KED, SPC, CIS, IMA, LSC) use made-up repeatable numbers and have no member list. The benchmarks are demo values.",
      "Not built: role-based views, saved views, and care manager, team or provider filters (the data does not hold them yet).",
    ],
  },
  {
    id: 6,
    name: "Version 6",
    date: "2026-10-30",
    summary:
      "The same UX fixes as Version 5, but everything inside the dashboard uses only the QuickSight style guide. Nothing from the Sonata component set is drawn inside the dashboard box.",
    changes: [
      "Everything outside Analytics is the same as Version 5. Versions 1 to 5 keep their own Analytics pages.",
      "Inside the dashboard box only the QuickSight kit is used: toolbar, sheet tabs, one controls bar, KPI tiles, column chart, horizontal bar chart with a benchmark line, table visual, text box. Normal and Bold weights only, no shadows, no new colours, no new buttons. No Sonata cards, chips, tables or modals inside the box.",
      "Outside the box the app still owns: the sidebar, the page title and breadcrumb, the browser tab title, the loading skeleton, the Not Found page and the Copy link button.",
      "Overview: one sheet with the controls bar (Group, Measurement Year, Status, A to Z), a text box that says which filters are on, four KPI tiles, a Points From Benchmark column chart and the Scorecard as a table visual. Click a bar or a row to open that dashboard. Help is its own sheet.",
      "Every dashboard: the dashboards of a group are the sheet tabs (up to 7), plus a Help sheet. Same controls bar order on every dashboard (Age Range, Gap Status, Gender, Measurement Year). A text box says which filters are on. Reset is the toolbar Reset.",
      "Status is a symbol and a word inside coloured text (✔ Meets, ! Near, ✖ Misses) because QuickSight cannot draw a chip. Change since last year is an arrow and words. Higher is better or Lower is better is a line of text on the main KPI.",
      "Every percentage has its group size (n). Small groups (under 30) get a grey bar and the words small group, because a Sonata chip is not allowed. The benchmark is a dashed line on the charts.",
      "One page scroll. Tables show the full height with the first 25 members and Export to CSV in the visual menu, so there is no scroll bar inside the box. Chart labels are given enough room so nothing is cut with an ellipsis.",
      "Open questions for the QuickSight developers are tagged Ask Q31 to Q34 (symbol and word status from a calculated field, hiding the embed's own Filter button, keeping the controls in the page address so Copy link keeps them, full height tables). Use Hide questions for developers to turn the tags off.",
      "Demo: the same 12 dashboards and numbers as Version 5.",
    ],
  },
  {
    id: 7,
    name: "Version 7",
    date: "2026-11-02",
    summary:
      "Version 4 dashboard (the one built from the requirements sheet and the QuickSight style guide), updated for the Madigan Analytics stories in Jira (LPP-15925). No benchmarks.",
    changes: [
      "Everything is the same as Version 4 except the Analytics dashboard changes below. Versions 5 and 6 (the Analytics redesign experiments) stay as they are.",
      "Benchmarks removed: no benchmark line on the charts, no benchmark words in the help. Madigan confirmed NCQA benchmarks are out of scope.",
      "Key Metrics (LPP-16237) use the story names: Members Evaluated, Initial Population, Total Eligible Population, Excluded Population, Population Meeting Measure (count and %), Population Not Meeting Measure (count and %).",
      "Measurement Period Summary (LPP-16236): the cards that follow the filters have that title. The fixed Eligible Population Baseline Summary stays on the left.",
      "Measure Run History (LPP-16238): a table of the latest runs (up to 10) on each measure dashboard (Measure, Measurement Start, Measurement End, Run Date & Time, Total Numerator, Total Denominator, Total Period, Change vs Previous).",
      "Trends (LPP-16239): the chart is titled Trends for (Measure Name). Daily, Weekly, Monthly, Quarterly and Annual, plus Custom (pick a From and a To date). Monthly opens at the prior 18 months and quarterly at 24 months. Counts met and % met. Through the most recent run date. Compare With Last Year stays. A seasonal view (one line per year) is not built.",
      "Filters: Measurement Year, Gender, Age Range (pick from the age groups), Age Min and Age Max (type numbers), Race, Ethnicity, Gap Status (Closed, Excluded, Needs review, Open) and more, as in Version 4. The Provider filter and the provider chart are left out for now (they need a member-to-provider file from Madigan).",
      "Help sheet updated for the new names. Admin sheet checked against the requirements sheet (FR-710): titles and column names now match (File Loads: Successes and Failures, Rejected Row Detail, Potential Measure(s) Affected, Member Matching, Calculation Settings in Use). The two stretch items are now built: Missing Required Fields by Data Type (FR-710.13) and Measure Impact of Incomplete Data (FR-710.18). Rejected Row Detail reads in three steps (artifact, source table, what is wrong), a Measurement Period and Last Updated line sits at the top of Admin, a file that failed three times says why, no table scrolls inside its box, and the how-to guide is at the bottom of Admin (FR-702.10). Not built: clicking a KPI card to open a filtered view (707.1) and PDF export (709.2) wait on QuickSight.",
      "Explanation and Recommended Action (LPP-16073) beside each result: a table on the Overview, and two tiles on each measure dashboard, with the run date and data-as-of date. The words are placeholders and every box is tagged Example text, because it is not decided yet whether they come from AI insights or fixed text.",
      "The app opens on Analytics (the Overview) after sign-in, for people who can see Analytics. UX test fixes (from the Analytics UI issues sheet): chart names are never cut (they widen and wrap); the Trend Numbers table shows all rows with no scroll bar; the trend chart uses a 0 to 100% axis in even steps with the % sign, and the end value is no longer clipped; Age Min and Age Max have hint text; Age Range lists only the ranges that apply to the measure, with ranges that do not overlap, in age order; the multi-choice filters look like the others; all chart rows split at the same place (12 and 24 of 36 columns); a wrong measure address or unknown address shows a Page Not Found page; Explanation and Recommended Action are separate tiles (a table on the Overview), as QuickSight draws them.",
      "Lucid design, round 1 (Srini Gorty's rough design): a Primary Care Manager filter (search by name or NPI, A to Z; twelve sample managers with made-up NPIs), the Measurement Start and End under the year, an About This Measure block that collapses (eligible population, numerator, exclusions, and a note that counts are distinct members), Last Updated and Next Refresh in the long date style, four cards a row, row one compared with last year, row two compared with the last completed month and the same month a year earlier, with numbers and percents on the bars. Same layout on every measure.",
      "Lucid design, round 2: the trend is stacked Open and Closed gap bars for each month end (the current month is month to date) with the compliance rate as a line; Compare With Last Year still shows the old line chart. Top n Open Gaps and Top n Closed Gaps by Primary Care Manager (n is 5, 10 or 15, default 10). Gaps by Age Range, Ethnicity and Race show open and closed members side by side with the percent closed; Gender is a donut. Closed is blue and open is orange because green and orange are hard to tell apart for people with red-green colour blindness. The old Met % by group charts are replaced in Version 7.",
      "Lucid design, round 3: the Details sheet is now Member Details, with Population, Tricare ID and Member Name controls. Click a member row to see that member's Explanation (each check the measure ran) and Recommendation (status, priority, action, why) under the list. The recommendation words are example text until the AI insights test is done. Measure Run History moved from Overview to Admin, with Run #, Measurement Start and End, Members Evaluated, Initial Population, Total Eligible, Excluded, Numerator (Closed), Rate, Change vs Previous and Closed change.",
      "Lucid design, final check: Measurement Start and End read like 1st Jan 2026. The first-row card notes use the design's wording. The trend is titled Open vs Closed Gaps Trend (Monthly, Weekly and so on). Manager charts show Dr. and the NPI, and the filter shows Name - NPI. The gap charts run Age, Race, Ethnicity, Gender. Measure Run History uses the design's headers (Run Date/Time, BCS Rate (%)) and drops the Measure column. The member table runs Tricare ID, First Name, Last Name, Date of Birth, Age (years), Gender, Race, Ethnicity, Primary Care Manager, and a name opens the member page. The Explanation shows MET and True the way the design does.",
      "Lucid design, names and ages: the cards use the chart's names: Member Population, Initial Population, Eligible Population, Excluded Population, then BCS Met Count, BCS Met Rate, BCS Not Met Count, BCS Not Met Rate (the measure code changes with the measure). Breast cancer screening now covers ages 42 to 74 for 2026 (50 to 74 for 2025), as the chart and NCQA say; earlier versions keep 52 to 74 from the requirements sheet. The Age Range filter, the age chart and the member table use ten-year bands that cover the ages of the measure, for example 40-49, 50-59, 60-69, 70-74.",
      "Sheets: version 7 shows three tabs, Overview, Members and Admin, as the Lucid chart does. The Details sheet is called Members. The Data and Help sheets are not shown; the how-to guide is at the bottom of Admin.",
      "# Open Gaps filter is one dropdown with ready choices: Any, No open gaps, 1, 2, 3, 4 open gaps, 1 or more, 2 or more, 3 or more. Nothing to type. Age Min and Age Max are one dropdown each (Any, then each whole year of the measure, for example 24 to 64 years for CCS), with Age Min first.",
      "Each page has its own browser tab title, and a loading skeleton shows while a dashboard draws.",
      "Decided: Measurement Period Summary is the cards that follow the filters. Not built: KPI-card click to open the member list and PDF export (both depend on what QuickSight can do). The Race, Ethnicity, Age Group, Gender and Member Population Table stories have no description in Jira yet, so those charts and the member list stay as Version 4 has them.",
    ],
  },
  {
    id: 8,
    name: "Version 8",
    date: "2026-11-03",
    summary:
      "Version 7 redrawn with only what Amazon Quick Sight can build, plus the application screens (Care Gaps, Care Gap Details, Members, Member page) aligned to Jira tickets LPP-16144 to LPP-16163.",
    changes: [
      "Application screens follow the Jira tickets. Care Gaps list (LPP-16144): Gap Name, Gap Closed Date and Due Date as N/A when closed, Recommended Actions and Gap Considerations as AI text with a ...see more link, Open in red, all gaps shown newest first, the ticket's info-icon text, tab hover names.",
      "Care Gap Details (LPP-16153, 16227, 16228, 16229): breadcrumb and title, summary fields, Gap Considerations / How To Close The Gap, a Source column in Evidence, and a new History tab.",
      "Members list (LPP-16069, 10/22 call notes): Members (#) title, Gap Name(s) help text, Gender, hidden optional columns HEDIS Measures Eligibility and Recommended Actions, no Military Status column. Member header (LPP-16072): Tricare ID with See All IDs, Age, Gender, Open Care Gaps, Measures Met, Gap Data Last Updated, and Contact, Demographics and Payer blocks; Print menu only for roles with all-member or caseload scope.",
      "Member tabs (LPP-16154 to 16163): Care Gaps, Profile, Claims, Diagnoses, Encounters, Immunizations, Labs, Medications, Observations, Procedures, Providers. Each is List of X (#), newest first (Providers A to Z), searches the fields its ticket names, locks the ticket columns and offers the rest in the Columns panel. Provider names read Last, First. Empty values read --. Measure cells link to the care gap. Providers' Related Records links open that tab for the provider. IDs, created and updated dates, amounts and places of service are sample values (each tab says so).",
      "Open items from the tickets are not decided in code: Gap Name(s) vs Gap Measures wording, Excluded From and Missing Evidence columns, one empty-value mark for the app, the Diagnosis Flag column.",
      "Same numbers and same tabs as Version 7. Everything is redrawn so each part can be built in Quick Sight, and no data is removed. Version 7 stays as it was.",
      "Lucid alignment (second pass). Page title reads HEDIS Care Gaps Dashboard - Breast Cancer Screening (BCS). About this measure (HEDIS BCS) is a collapsible box, closed when the page opens, with the Lucid wording for Eligible population, Numerator and Exclusions (BCS only; the other measures keep their wording). Quick Sight text boxes cannot collapse: ask the Quick Sight team. One line gives Measurement period, Last Updated and Next Refresh. Measurement Start and Measurement End are in an info tooltip on the Measurement Year filter, not printed under it.",
      "Filters follow the Lucid order: Measurement Year, Primary Care Manager, Age Range, Race, Ethnicity, Gender. Exactly these six and no more: Results as of Run, Member, Gap Status and # Open Gaps are hidden (the latest run is used; Version 7 still has them). Age Range is the only age filter (no Age Min or Age Max). Overview filters show no info icon, as in Lucid.",
      "Members tab: only Population, Tricare ID and Member Name (the date, run, state, county and other filters are hidden; the year follows the Overview), all three are menus with All and keep the info icon. Primary Care Manager reads Dr. Name (NPI: ...). The Explanation table has two columns, Item and Value, and for BCS lists Tricare ID, Member Name, Outcome, BCS, Is continuously enrolled, Hospice, Palliative care, Advanced illness and frailty, Mastectomy history and Gender-affirming chest surgery history.",
      "KPI cards: each card is one KPI visual (title, description as subtitle, big number, one comparison with the percent and an arrow) with a separate small bar chart under it, placed on top of the KPI in the free-form layout. A Quick Sight KPI can hold only one comparison and one progress bar or sparkline, so the bars are their own visual.",
      "Second comparison: the KPI compares with one value (the last completed month on the second row, last year on the first row). The other comparison (same month a year earlier) is in the bar chart: its bar shows the value and its name carries the change, for example Prev. year Sep 2025, +13.8 pts ▲.",
      "Comparison wording follows Lucid: vs 2025 16.2K (+13.6% ▲). Counts of 1,000 or more read 18.4K. Row 1 arrows: green for up on Member, Initial and Eligible Population; red for up on Excluded. Descriptions use the Lucid wording. Quick Sight has no custom comparison text, so the year in the text is only partly doable.",
      "Open vs Closed Gaps Trend: a stacked bar and line (combo) chart, as in Lucid. Opens on the last 12 months. Y axis Member Count (count), x axis Month with labels like Jan 2026. Each bar segment shows the count and the percent (Lucid); Quick Sight normally shows one value per label, so check this one. The compliance rate is labelled on every point of the line.",
      "Gap charts follow Lucid: four charts in one row (Age Range, Race, Ethnicity, Gender), titled like BCS Gaps by Age Range. Age Range, Race and Ethnicity are clustered columns, Open (red) beside Closed (green), y axis Member Count (count), long names cut with the full name in the hover tooltip. Gender is a donut with data labels and a legend. Kept from the earlier pass: Top n Managers stacked bars with totals, Met and Not Met bars, Baseline Summary and Everything That Affects This Calculation.",
      "Explanation and Recommended Action are filled with live data, as Quick Sight custom insights (text, fields, calculations): the rate and counts, the population, the change versus last month and the same month last year, the benchmark gap, the lowest rate by age range, gender, race and ethnicity, the managers with the most open gaps and the age range with the most open gaps. They follow the controls.",
    ],
  },
  {
    id: 9,
    name: "Version 9",
    date: "2026-11-04",
    summary:
      "Version 8 plus the dashboard review feedback: Population names and hover text, searchable member filters, cards removed, Timeframe (Annual, Quarterly, Monthly) with a population table.",
    changes: [
      "Everything in Version 8 stays. Version 8 is as it was before this review.",
      "Dashboard review changes (Overview and Members). Population filter: Member Population, Met Population and Not Met Population, with the tile descriptions on hover. The tiles and table columns use the same names, so the filter and the cards match. Tricare ID and Member Name are type-to-search. Removed: Eligible Population Baseline Summary, Explanation, Recommended Action, Met and Not Met and Compare With Last Year. Everything That Affects This Calculation now sits inside About this measure. The Primary Care Manager charts have the new one-line descriptions plus the old Recommended Action advice (reach, age range, outreach, goal) written live.",
      "Timeframe replaces Show by and Date Range: Annual (5 years: 2022 to 2026 year to date), Quarterly (9 rolling quarters, Q3 2024 to Q3 2026) and Monthly (24 rolling months, Oct 2024 to Sep 2026, the last completed month). Each has the chart and a table of the population counts. The demo files hold 2025 and 2026 only, so earlier periods are sample numbers, marked with a star. The sample numbers are built to behave like real data: each year starts low in January, climbs month by month (a little faster at year end) and starts again the next January; each year ends a little lower the further back it goes; populations grow about 5% a year. In 2025 and 2026 the files stop having new evidence before the period ends, so it is spread across the period, and the year-end numbers are unchanged. The cards that compare with last month and last year use the same numbers.",
      "Overview page (All Measures): the table of measures comes first, with an Open link on every row (a table cell can be a link in QuickSight; a card cannot). The text box at the top is gone: the measurement period is in the info icon of Measurement Year. The Members tile is now Member Population, with the same hover text as the measure dashboard. Clicking a bar or a row still works. Each measure dashboard has a breadcrumb, Analytics / Overview / BCS, to go back.",
      "Less space on the measure dashboard: the two note lines are one line (the sentence about the cards is in About this measure). Timeframe sits inside the trend chart tile and Top N Managers inside both Top 10 tiles, instead of their own boxes. The suggested focus is one line that opens to the full advice. Two items are questions for the QuickSight team (Ask Q35): a control inside a chart tile, and a collapsible text box.",
    ],
  },
  {
    id: 10,
    name: "Version 10",
    date: "2026-11-05",
    summary:
      "Version 9 with the Overview page replaced by the Sonata Analytics page as it is today: a plain list of the measures with what each one measures.",
    changes: [
      "Everything in Version 9 stays. Version 9 is as it was.",
      "Overview page now matches Sonata (sonataweb.dev.leapmetrics.io/m/analytics): Home > Analytics breadcrumb, the Analytics & Dashboards heading, a tab row (Overview, BCS, CCS, COL, GSD, WCV), and one card titled Overview with a two-column list, Measure and What it measures. Each measure name is a link to that measure's dashboard, and each tab opens it too. The descriptions are Sonata's own words.",
      "Removed from the Overview in this version: the controls (Measurement Year, Results as of Run, Gap in More Than One Measure), the numbers table, the four tiles and the two charts. The numbers stay inside each measure's dashboard. Version 9 still has them.",
      "All five measure dashboards (Analytics > BCS, CCS, COL, GSD, WCV) are now drawn as the Lucid chart: HEDIS Care Gaps Dashboard - <measure name>. Three tabs: Overview, Member Details and Admin. BCS is the Lucid original; the other four use the same layout, with the measure's own names, numbers and definition text. That wording comes from the existing mockup text, so please review it per measure.",
      "BCS Overview: the HEDIS version box (2026, Measurement Start and End) and the Last Updated / Next Refresh box, the collapsible About this measure, five controls (Primary Care Manager, Age Range, Race, Ethnicity, Gender), eight cards each with a Prior Month comparison, a Trend Timeframe control (Annual, Quarterly, Monthly) with the Lucid descriptions on hover, the trend chart for the timeframe (Annual: Met Count bars and Met Rate line; Quarterly and Monthly: one Met Rate line per year), Top n Open Gaps and Top n Closed Gaps by Primary Care Manager, and BCS Gaps by Age Range, Race, Ethnicity and Gender. Only the latest year is shown, so there is no Measurement Year control.",
      "BCS Member Details: a Population control and one Search box (member name or Tricare ID, replacing the two separate Tricare ID and Member Name dropdowns), the Member Detail Table, and the Explanation and Recommendation of the member you click. BCS Admin: the Measurement Run History.",
      "Removed from the BCS dashboard in this version because the Lucid chart does not have them: the QuickSight Reset / Export / Bookmarks / Share bar, the Controls header, Measurement Year, Results as of Run, the Population Counts table, Suggested focus, the tile descriptions under the Top n charts and the small-group notes.",
    ],
  },
  {
    id: 11,
    name: "Version 11",
    date: "2026-11-10",
    summary:
      "Version 10 with the application screens brought in line with the requirement tickets and Mansi's new column-selector standard. The measure dashboards are untouched.",
    changes: [
      "Everything in Version 10 stays. Version 10 is as it was. The five measure dashboards are not changed.",
      "Members list (LPP-16069, 16070, 16306, 16307): default columns are Member Name, Tricare ID, Date of Birth, Age, Sex, Military Status, Primary Care Manager, # Open Gaps, Open Gaps and Earliest Gap Due Date. The Columns panel has four groups in table order (Identifiers, Demographics, Care Team & Engagement, Care Gaps), the columns inside each group follow the table order, and there is a search box at the top. Search runs when you press Enter. In the Filters panel Apply comes first, then Clear Filters.",
      "Care Gaps list (LPP-16205 to 16245): one selector, four groups in table order, with a search box. Member Name has a chip when a member has more than one open gap. Demographic, care-team and gap columns follow the Application Tables sheet.",
      "Member page: SEX replaces Gender in the header, and the Open Care Gaps number opens the Care Gaps tab. The Profile tab is gone and Enrollment is the last tab. The record tabs show their default columns only (no Columns button), in the ticket's order and names. Last Updated is a default column on Claims only. Immunizations searches by Vaccination, Labs show reference ranges with an en dash and the LOINC code with its description, Medications show the NDC with hyphens, and Providers show Entity Type as I or O and Related Records as a comma-separated list. The expanded header follows LPP-16072: Contact (Phone Number, Address, Parent/Guardian/Caretaker), Demographics (with Hospice, Long-Term Institutional Status and Low Income Subsidy) and Payer Information.",
      "Member page, Care Gaps tab: Gap Name (Measurement Year), Gap Status, Gap Identified Date, Priority, Due Date, Recommended Action, Primary Care Manager, Gap Closed Date, Gap Evidence; sorted by gap name, then newest identification date.",
      "Sidebar: takes the Sonata look (same colours as the Leap Metrics app): links on the lighter indigo panel with a rounded top-right corner, and the open page in orange text only. Collapse, expand and all menu options are unchanged.",
      "Care Gap page: the first breadcrumb reads Care Gaps List. The summary adds Priority, Primary Care Manager and Gap Evidence. Time left reads 'X Days (MM/DD/YYYY)'. The placeholder text is gone, and a closed gap reads 'Why the Gap Is Closed'. The GSD wording is a draft to confirm. Summary and Overview use the ticket's labels (Recommended Action, Time Left with Due Date). Evidence lists Service Date, Gap Name and Evidence, and History adds Priority and Primary Care Manager (LPP-16227 to 16229).",
    ],
  },
  {
    id: 12,
    name: "Version 12",
    date: "2026-11-11",
    summary:
      "Version 11 with the dashboards matched to the new Balsamiq board (Analytics - Quality Measures): one tab bar, a real Overview dashboard, and the BCS layout on every measure.",
    changes: [
      "Everything in Version 11 stays. Version 11 and older are as they were. Only the Analytics dashboards change, plus the extra demo members, and Race and Ethnicity on the Members list now use the same values as the dashboards (with Unknown and Declined, no None).",
      "One tab bar on every dashboard page: Overview, BCS, CCS, COL, GSD, WCV, Inputs, Admin. Member Details is gone as a tab: the members table is now on the Overview. Inputs is a new tab (the board has the label but no screen yet, so it lists the files each measure reads). Admin is unchanged.",
      "Overview is now a dashboard, not a measure list: header boxes (Measure Year, run dates), filters (Primary Care Manager, Military Status, Population, Clear All Filters), four tiles (Member Population, Members With Open Gaps, Total Open Gaps, Total Gaps Closed) each with its prior month (the tiles count the measure runs), Closed Gap Rate and Open Gaps By Measure charts, and the Members table (16 columns, search by name or Tricare ID). The table's # Open Gaps, # Closed Gaps and Gaps columns follow the Members list, so they can differ from the run-based tiles.",
      "Measure page (BCS, and the same layout for CCS, COL, GSD and WCV): title 'HEDIS Care Gaps - ...' without 'Dashboard'; two header boxes (also on the Overview) side by side, each fact with its label on top and the value below and a thin line between facts (MEASUREMENT YEAR, Measurement Start, Measurement End | Data as Of (Run Date), Dashboard Next Update); About This Measure is collapsed when the page opens (click to expand and collapse, as in Version 11) with a Source files line and a date for each file.",
      "Measure page filters: Primary Care Manager (search by name or NPI, with Unassigned), Military Status, Population (Initial, Excluded, Eligible by default, Closed Gaps, Open Gaps), Age Range (pick ranges or type min / max in two small boxes beside it), Sex, Race and Ethnicity (with Unknown and Declined, no None), and Clear All Filters.",
      "Measure page tiles: six, in two rows of three (Initial Population, Excluded Population, Eligible Population / Closed Gaps Count, Measure Rate, Open Gaps Count) with the board's descriptions. The rate tile shows its change in points. Member Population and Not Met Rate are gone from this page.",
      "Trend: Annual is stacked Closed and Open bars with count and % (2022 to 2026 YTD). Quarterly and Monthly show only two lines, last year and this year to date.",
      "Top n: starts at 5 with a View All button. Open gaps by Primary Care Manager shows count and % and includes Unassigned. Highest Closed Gap Rate is ranked by rate, only for managers with 100 or more members, with the board's note. To make that rule show real bars, Version 12 has 1,840 demo members (the first 304 plus 1,536 more). Names have no 'Dr.' and show the NPI.",
      "Gaps By Age (ten-year bands: 40-49, 50-59, 60-69, 70-74), Race, Ethnicity, Sex and Military Status: stacked Closed / Open bars on a Rate axis with count and % (Military Status is new). BCS Source files lists all 14 files with their dates.",
      "Numbers checked against NCQA MY 2026 for all five measures. The extra demo members now cover every age from 3 to 80, so each measure has members at both ends of its range. On the measure page Initial = Eligible + Excluded (members who need review are left out and a note says how many). Telehealth well-care visits no longer count for WCV, GSD uses the most recent final HbA1c of the year (as NCQA does; Version 11 and older use the lowest), and GSD also excludes age 66+ in an I-SNP or long-term institution. About text and Source files were completed for CCS, COL, GSD and WCV.",
      "Application side, matched to the Application Tables sheet (tab: Application Tables only). Values the data does not have are made-up sample data, labelled 'Sample data' in the column help. Versions 11 and older do not change.",
      "Members list: Open Gaps and Earliest Gap Due Date are off by default (still in the Columns panel). Care Gaps list: opens on the open gaps, sorted by Priority then Due Date; Priority now comes before Gap Identified Date; new Excluded status and Exclusion Reason column (members the measure excludes, e.g. hospice or palliative care); filtering to Closed shows Gap Closed Date and filtering to Excluded shows Exclusion Reason. Priority is one sample value used on the list, the member's Care Gaps tab and the Care Gap Details page (before, the list and the other two disagreed). Counts on the list can differ from earlier versions because Excluded rows are now listed.",
      "Member page: the record tabs (Claims, Diagnoses, Encounters, Immunizations, Labs, Medications, Observations, Procedures) and Providers use the sheet's column names and order, with the extra fields in the Columns panel under Optional. The Columns button is back on these tabs in Version 12 only. Providers show the Primary Care Manager first. The Care Gaps tab is Gap Name, Gap Status, Priority, Gap Identified Date, Due Date, Recommended Action, Evidence (link), Gap Closed Date, sorted open gaps by Priority, then closed, then excluded; Measure Code, Closure Source, Exclusion Reason and Primary Care Manager are optional.",
      "Care Gap Details: Gap Status, Days Remaining (and Exclusion Reason or Gap Closed Date when they apply) in the summary; a specific 'Why' text (window, last record on file, link to Evidence), 'How To Close The Gap' with the recommended action and what to document, and links to the member's other open gaps. Evidence: Service Date, Record Type, Description, Code, Code System, Result / Value, Provider, Source (optional Record ID, Received Date, Value Set, Clinic / Facility), records that count first, a row opens the record on the member page. History is an event log (Identified, Priority Changed, PCM Changed, Closed, Reopened, Excluded), newest first; the Priority Changed event is a made-up example. Evidence Role (Closes gap, Exclusion, Doesn't qualify) and Reason (why a record does not count, e.g. code not in the value set) are on the member's Care Gaps tab (one per gap) and on the Evidence tab (one per record). Not built (the sheet marks them Future): all diagnoses from all sources, outreach events. Not matched: the Care Gaps list selector shows Priority in table order, not after Due Date.",
      "Left as in Version 11 until the board owner confirms: BCS age 42-74 (the board says 52-74), the trend description wording, 'Disabled' as a military status, and the Admin and Inputs content. The board's typos are not copied.",
    ],
  },
  {
    id: 13,
    name: "Version 13",
    date: "2026-11-13",
    summary: "Version 12 with Sam's feedback on the dashboard prototype. Version 12 stays exactly as Sam saw it.",
    changes: [
      "Everything in Version 12 stays. Versions 12 and older are as they were. Only the Analytics dashboards change.",
      "Primary Care Manager filter (Overview and every measure page) is a search box: a magnifier, the hint 'Search PCM name or NPI', a grey 'All' tag while nothing is chosen, 'All' at the top of the list (it clears the choice) and an x to clear. Sam suggested the hint 'Enter a PCM Name or NPI to Search'; the hint above was kept for now.",
      "Overview: the chart 'Closed Gap Rate' is now 'Measure Rate'. Both charts have a description under the title and a click on a bar opens that measure's tab.",
      "Measure page descriptions use the board's new wording (Initial Population, Closed Gaps Count, Measure Rate, Open Gaps Count) and both Top n charts have the new descriptions.",
      "Top n is a number box (starts at 5, 1 to 100) with the View All button. 'Minimum Number of Members' is a box the user types in (starts at 30, counts eligible members of the measure) and sets which PCMs are ranked by rate. With View All, a last row 'Below x Members' adds together the PCMs under the minimum.",
      "Unassigned is always a separate last row under the Open Gaps chart. It is not ranked, and it is not shown in the rate chart.",
      "Quarterly trend stops at the last completed quarter (no Q4 2026). Monthly is not changed.",
      "Colours: one light green (the design system's chip green) and one soft red (#E57373) are used everywhere on the dashboards: tile stripes, bars, legends and trend lines. The soft red is not a design-system token yet: to confirm with the design system owner. The big tile numbers and the Better / Worse words use the design system's dark green and dark red text so they stay readable.",
      "Gaps By Sex always shows Male, Female and Unknown. About 1 member in 25 has Unknown sex (sample data, nobody is added or removed, so totals do not change).",
      "Still open with Sam: BCS age 42-74 or 52-74 (the board says 52-74); the Overview tile descriptions were not changed because the board's new wording for them was not clear; the monthly trend still shows the month in progress.",
    ],
  },
  {
    id: 14,
    name: "Version 14 - Srikanth",
    date: "2026-11-13",
    summary: "Version 13 with Srikanth's changes: HEDIS Inputs and DCS tabs, and the page title below the tab bar. Version 13 stays exactly as it was.",
    changes: [
      "Everything in Version 13 stays. Versions 13 and older are as they were. Only the Analytics dashboards change.",
      "The Inputs tab is now HEDIS Inputs, built from Srikanth's Sigma dashboard (HEDIS Inputs Dashboard): four filters (Member Id, Value Set or Medication List Name, Code, Supplemental Data) and the Member Details table with the same 43 column names, in the same order. Every value is made-up sample data. The column 'Fl...' in the screenshot is cut off; it is written 'Flag' here (to confirm).",
      "New DCS tab (before Admin), from the Sigma DCS Validations dashboard: four filters (Is Valid, Artefact Id, Patient, EOB Id) and the Client HEDIS DCS Artefacts table (Medicaid Id, ListAggDistinct of Artefact, Snapshot Id, Artefact, Artefact Id, Result, Status, Artefact Json, Created At, Organization Id, Indicator). Patient, EOB Id and Is Valid are added as the last three columns so the filters have values to work on (to confirm). All values are made-up sample data.",
      "The page title (for example 'HEDIS Care Gaps - Overview') is now below the tab bar on every dashboard tab, with the breadcrumb still at the top. HEDIS Inputs is titled 'HEDIS Inputs Dashboard' and DCS 'DCS Validations', as in Sigma.",
    ],
  },
  {
    id: 15,
    name: "Version 15 - Sam round 2",
    date: "2026-11-15",
    summary: "Version 14 with Sam's second round of dashboard feedback. Versions 14 and older stay exactly as they were.",
    changes: [
      "Everything in Version 14 stays. Versions 14 and older are as they were. Only the Analytics dashboards change.",
      "Overview: new descriptions for Member Population, Members With Open Gaps, Total Open Gaps and Total Closed Gaps (the board's wording). 'Total Gaps Closed' is now 'Total Closed Gaps', in the title and in the line under the tile. The board's own line under that tile still says 'Total Gaps Closed' (to fix on the board).",
      "Measure pages: Eligible Population says 'Initial Population minus Excluded Population'. Initial Population has its own sentence for each measure: BCS (age, sex and enrollment, with 'See About This Measure'), CCS, COL, WCV (age and enrollment) and GSD (members with diabetes). Sam's list had 'age, sex, and enrollment' for CCS; it is left out here because his note says only BCS uses sex (to confirm).",
      "Age ranges (Sam's Typical Age Ranges): BCS 40-74, CCS 21-64, COL 45-75, GSD 18-75, WCV 3-21, in About This Measure and in the sample members, so counts and rates move a little in this version only. The board's BCS About box still says 52-74.",
      "Better / Worse: the arrow, the number and the word use the same light green and soft red as the left border of the tile, in bold, with a bigger arrow. The soft red is not a design-system token yet.",
      "Trends: Quarterly always shows the last 9 completed quarters (Q3 2024 to Q3 2026 now), as three lines (2024, 2025, 2026 YTD). Monthly shows the last 27 completed months (Jul 2024 to Sep 2026), also as three lines, and no longer shows the month in progress. 2024 numbers are made-up sample data. The Annual, Quarterly and Monthly descriptions are the board's wording, with 27 months in Monthly (the board still says 25; to confirm).",
      "Top n: Top n, Minimum Number of Members and View All have Sam's descriptions. When a bar segment is too narrow to hold its count and percentage, the label moves just outside the bar, so every PCM shows its %. The two descriptions under the Top n charts start on the same line (the shorter chart gets blank rows). To confirm with Sam: the minimum only filters the rate chart (as on the board); the open gaps chart still lists every PCM, so 'Only PCMs with at least the minimum… are shown' is not true there.",
      "GSD: one gap per member, open for one of two reasons, decided by the latest HbA1c (from the team's Slack thread on LPP-16462). The Open Gaps Count tile on the GSD tab shows two lines under the number: 'HbA1c 8 to 9' and 'HbA1c above 9, or no test this year'. The two add up to the tile. To confirm: the team is waiting for Allie Grace's clinical answer, and the back end may count GSD as two gaps (<8 and >9). Looking back at any past measurement year (Sam's idea) is not built.",
    ],
  },
];
/** Versions 5 and 6 are the Analytics redesign experiments (own pages). Version 7 goes back to the Version 4 dashboard. */
export const isRedesign = (id: number) => id === 5 || id === 6;
export const LATEST_VERSION: VersionId = 15;

const KEY = "sevida-mockup-version";
const isId = (x: unknown): x is VersionId =>
  VERSIONS.some((v) => v.id === x);

function readSaved(): VersionId {
  try {
    const n = Number(sessionStorage.getItem(KEY));
    if (isId(n)) return n;
  } catch {
    /* storage can be blocked */
  }
  return LATEST_VERSION;
}

/** Read outside React (for plain helper functions). The provider keeps it in step. */
let current: VersionId = readSaved();
export const getVersion = (): VersionId => current;

interface Ctx {
  version: VersionInfo;
  setVersion: (id: VersionId) => void;
}
const VersionContext = createContext<Ctx | null>(null);

export function VersionProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<VersionId>(readSaved);
  current = id;
  const setVersion = useCallback((next: VersionId) => {
    current = next;
    try {
      sessionStorage.setItem(KEY, String(next));
    } catch {
      /* ignore */
    }
    setId(next);
  }, []);
  const value = useMemo<Ctx>(
    () => ({
      version: VERSIONS.find((v) => v.id === id) ?? VERSIONS[VERSIONS.length - 1],
      setVersion,
    }),
    [id, setVersion],
  );
  return (
    <VersionContext.Provider value={value}>{children}</VersionContext.Provider>
  );
}

export function useVersion(): Ctx {
  const c = useContext(VersionContext);
  if (!c) throw new Error("useVersion needs <VersionProvider>");
  return c;
}

/** 2026-10-23 -> "23 Oct 2026" */
export const fmtVersionDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/** The Version dropdown in the header. */
export function VersionPicker() {
  const { version, setVersion } = useVersion();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const narrow = useMediaQuery("(max-width:599.95px)");
  return (
    <>
      <Tooltip title={version.summary}>
        <Button
          variant="secondary"
          aria-haspopup="menu"
          aria-label={`${version.name}, ${fmtVersionDate(version.date)}. Change version`}
          onClick={(e) => setAnchor(e.currentTarget)}
          endIcon={<ExpandMoreIcon />}
        >
          {narrow
            ? `V${version.id}`
            : `${version.name} · ${fmtVersionDate(version.date)}`}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 280, maxWidth: "92vw" } } }}
      >
        {[...VERSIONS].reverse().map((v) => (
          <MenuItem
            key={v.id}
            selected={v.id === version.id}
            onClick={() => {
              setVersion(v.id);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              {v.id === version.id && <CheckIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={`${v.name} · ${fmtVersionDate(v.date)}${v.id === LATEST_VERSION ? " (latest)" : ""}`}
              secondary={v.summary}
              slotProps={{
                secondary: { sx: { whiteSpace: "normal", maxWidth: 340 } },
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
