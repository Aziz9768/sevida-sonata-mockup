# Sonata mockup

Mockup screens built **only from `sevida-ui` components** (nothing custom is styled here).

| Screen | Address | Built from |
|---|---|---|
| Dashboard (first item in the menu) | `/#/dashboard` | One tab per measure plus Admin: filters, whole-population box, Results cards, Met % by group, trend, member list, inputs. See the Dashboard section below. |
| Quality measures | `/#/measures` | DataTable (Measure, Code, Who is counted, Members in measure, Met, Not met, Open care gaps, Excluded; no rate and no data column), InfoBanner |
| Measure detail (WCV, BCS-E, CCS-E, COL-E, GSD) | `/#/measures/COL-E` | Opens straight on the Members table (no summary card; the very same table and columns as the Members list, only members who are in the measure; a link from a count or group row narrows it, with a "Show all members" button); Tabs, Card, DataTable (filters), StatusChip |
| Members | `/#/members` | DataTable (search, filters, columns, paging) |
| Care gaps | `/#/care-gaps` | Tabs (one per measure, with counts) and a DataTable with one row per open care gap. See the Care gaps section below. |
| Member detail (tabs: Profile, Measures, Care gaps, Enrollment, Records; Records has a switch for All, Claims, Diagnoses, Immunizations, Labs, Medications, Visits and procedures) | `/#/members/M1036` | Card, DetailGrid, Tabs, DataTable, StatusChip, InfoBanner, Modal |
| Care gap detail | `/#/members/M1036/gaps/COL-E` | Card, DetailGrid, Tabs, DataTable, StepTrace, Modal, form fields |
| Member measure result (no gap) | `/#/members/M1010/measures/CCS-E` | Card, DetailGrid, Tabs, DataTable, StepTrace |
| Sign in (with partner buttons) | `/#/login` | LoginPage (`ssoSlot`), Modal, RadioGroupField, InfoBanner |

## Where the content comes from

Everything follows **Leap Sonata Quality Measure Data Ingestion Spec.xlsx**.

- `src/spec.ts` is generated from the sheet: the 16 file definitions (every field, required or not, allowed codes, rules) and each file's sample rows. Excel had turned some codes into dates in the sheet (for example `2106-3` became a date); they are restored in this file.
- `src/data.ts` is made-up demo data. Members `M1001`–`M1010` copy the sheet's sample tabs. `M1011`–`M1100` are generated (the same every time) so the dashboard has believable numbers. 12 of the generated members have 3 or 4 care gaps at once (for example M1019, M1045) so the Gaps column can be seen with several chips. The five measures use a **simplified** version of the NCQA rules (shown on each measure's "How it is calculated" tab), so the rates are for the demo only.
- `src/validate.ts` checks a CSV against the spec. No screen uses it now (the data ingestion screens were taken out of the demo), but it is kept for when they come back.

## Run it

This folder must sit **next to** the `sevida-ui` folder:

```
Downloads/
  sevida-ui/
  sevida-mockup/   <- this folder
```

```
npm install
npm run dev        # opens http://localhost:5173
```

The mockup reads the library straight from `../sevida-ui/src`, so when you change or add a component in `sevida-ui` the mockup updates at once (no rebuild).

## Where things are

- `src/data.ts` made-up members, tasks, care team. Nothing is real.
- `src/pages/MembersListPage.tsx`, `src/pages/MemberDetailPage.tsx` the two screens.
- `src/App.tsx` sidebar items and routes. Only Members is built; other items show a "not part of this mockup yet" message.
- `src/components/RouterLinkAdapter.tsx` the small piece that lets the library work with react-router (the library itself has no router).

## Adding the next screen

1. Add a file in `src/pages/`.
2. Add a `<Route>` in `src/App.tsx`.
3. Build it from `sevida-ui` components. If a component is missing, add it to `sevida-ui` (with a story) first, then use it here.


## What each screen is based on

Everything comes from "Leap Sonata Quality Measure Data Ingestion Spec.xlsx". The product idea in one line: files in, results you can trust, trace any member.

| Screen | Based on the spec | Demo data / not in the spec |
|---|---|---|
| Dashboard (first item in the menu) | The members, results and file statuses above, plus the Madigan dashboard checklist (FR-701 to FR-710) | GSD second rate, Admin rows and file dates are demo assumptions |
| Quality measures | The five measures in one table. The language and disability membership reports (LDM, DDM) are not on this page: they are plan-level counts with no care gaps, so they are left out of the demo for now | Members and their results |
| Members | Member fields from member-gm, member-RES; Gaps lists every care gap (short form of the measure, full name on hover) and Gap status gives the status of each | 10 sample members copied from the spec, 290 generated. **Gap identified, Next appointment, Care team, Care manager and Last updated are made up** (the spec has no such fields, shown in each column's (i)); see `careTeamOf` etc. at the end of `src/data.ts` |
| Member > Measures | The order of checks and the source file for each answer | Simplified calculation (see below) |
| Measure | Who is counted, exclusions, look-back where the spec states it | Rules marked "Standard HEDIS rule" are not in the spec |

Not in the spec, so not in the demo: goals or targets, trends over time, outreach or care-gap lists. The spec says the real calculation is NCQA's logic (CQL) run on the data converted to FHIR; this demo applies a simplified version.

## Sign in, sign out and logo

- The app opens on a demo sign-in screen. Username `admin`, password `123`; nothing is sent anywhere. The sidebar has a **Sign out** button next to the user's name.
- "Powered by Leap Metrics" shows the Leap Metrics logo, loaded from the address in `src/brand.tsx`. If it cannot load, only the words show. To keep a copy with the app, save it as `public/leap-metrics.png` and change `LEAP_LOGO` to `/leap-metrics.png`.

## Partner login (SSO)

The Access screens (Users, Groups, Partner login) were removed from the demo. The sign-in screen still has the demo "Continue with Microsoft / Okta / Google" buttons, which use the made-up people and rules in `src/access.tsx`. A person who is signed in but belongs to no group sees a "You do not have access" page. The removed screens are not part of the app any more.

## Care gaps (member page and care gap page)

Three different things, never mixed:

| | Comes from | Values |
|---|---|---|
| **Measure result** | The files only (`src/data.ts`) | Met, Not met, Excluded, Needs review |
| **Care gap status** | The work on a Not met result (`src/careGaps.tsx`) | Open, Closed |
| **Evidence status** | The proof, kept apart from both of the above | Not requested, Requested, Received (waiting for review), Validated, Rejected |

- **Needs review** means the evidence is missing, incomplete or conflicting, so it is **not** counted as a care gap and **not** in the rate. Today two rules produce it: no claims or clinical records at all dated in the measurement year (try member M1010), and a diabetes member whose only HbA1c this year is preliminary. A file that was not received shows as "Partial data" on the dashboard; it does not turn gaps into Needs review.
- **Counts add up.** For every measure: eligible = met + not met + needs review + excluded, and rate = met / (met + not met). On a member: open gaps + closed gaps = the member's Not met results. A closed gap still counts as Not met in the measure result until the next calculation run reads the evidence (the screens say so).
- **A gap closes only with validated evidence and a re-evaluated measure.** Close gap is unavailable until: evidence is recorded; an authorized reviewer validated it (Evidence tab > Review); it is the right kind of record, dated inside the measurement period, with source and provider recorded (for GSD, HbA1c below 8%); the member still qualifies; and **Re-evaluate measure** was run with that evidence and came out Met. Closing asks for confirmation and records the reason, the supporting evidence, the person and the time. A finished task, a completed appointment, a manual status change or a request for records never closes a gap. Every change is written to the audit trail (History tab) with the user, the time and a reason. Re-evaluation is a simulation: the result in the files changes at the next calculation run.
- **Care gap page:** a summary with three separate statuses (Measure result, Care gap status, Evidence status) and the next action; one "Actions" button (small, top right) that opens a short menu: Schedule appointment, Add referral (shows "to be built" for now), Reassign care manager (Assign when there is none) and Close gap. Close gap is greyed out until every closing requirement is met; the suggested step is marked "(suggested)" and explained in the (i) next to the button, including which tab to use for evidence steps. Recording evidence is on the Evidence tab, reviewing is a row action there, and re-evaluating and closing are on the Closing tab; Overview (cards: why the gap is open with what counts, the three steps left to close it and the days left in the measurement year; a member snapshot of eligibility, enrollment, exclusions and the last qualifying service; and the exact record behind the gap. The measure rules and the step-by-step check live on the Quality measures page and the member Measures tab, not here); Evidence (one table of records from the files and evidence recorded in Sonata, with missing, conflicting and unmapped records flagged); Follow-up (one table of appointments and referrals; the next scheduled one is shown as the Next action and Due date); History (every change with who, when and why); Closing this gap.
- **Criteria are not validated against the official MY 2026 specification.** They come from the ingestion spec and simplified demo rules, and the page says so. Points to confirm (age bands in recent HEDIS years have changed for BCS-E, CCS-E and COL-E; accepted tests such as HPV for CCS-E) are listed in `specCheck` in `src/careGaps.tsx` and on each care gap's Measure and criteria card.
- **Dates:** the demo's "today" is Oct 16, 2026 (`DEMO_NOW` in `src/data.ts`). No service, file, gap or note date is later than today, and no record is dated after the file that carries it. Only due dates, scheduled appointments, one planned colonoscopy (M1004, status "preparation") and coverage end dates look ahead.
- **Measures tab:** one table with a row for each measure the member is in (measures they are not in are not listed). Columns: measure, code, final result, why, care gap, evidence, evaluation and a three-dot menu. The measure name and a click on the row open the member's own page for that measure: the care gap page when the result is Not met, otherwise the measure result page (Met, Excluded, Needs review: why, criteria, the record behind the result, the step-by-step check and the supporting records). "How it was decided" opens the step-by-step check in a popup.
- **One Records tab (checklist rows 25 and 55):** the member page has five tabs: Profile, Measures, Care gaps, Enrollment and Records. Inside Records a switch picks the kind: All records (first), then Claims, Diagnoses, Immunizations, Labs, Medications and Visits and procedures (A to Z), each with its own count. Every record sits in exactly one kind, so the counts add up. A diagnosis (EHR problem list, or an ICD-10 code on a claim) is in Diagnoses; vaccines in Immunizations; labs and observations in Labs (the only kind with a Result value); pharmacy records in Medications; other claim lines in Claims; the rest in Visits and procedures. Each kind has its own column names and code header (ICD-10, CVX, LOINC, NDC…). **Links:** `?tab=records&records=labs` opens a kind. Older links still work: `?tab=labs`, `?tab=all` and `?tab=clinical` open Records on that kind. **Roles:** the kinds a role may not open (`hiddenTabs`: Claims and All records for the care manager; Claims and All records for the clinician) are missing from the switch, and the Records count only adds the kinds the role can open. Columns in each kind: Date | What | Code | Status or Result | Source | Provider, then Last updated (when the file reached Sonata, kept apart from the service date), Date identified and Measure or care gap. Records tied to a care gap are tinted and say what they did to the measure. Click a row to inspect the source record.
- **Every spec field is somewhere (FR-503):** Inspect on a record opens a "Fields in the file" section with every column of the spec for that record, in file order, with the value, and whether the spec says Required, Conditional or Optional (a claim line shows both claim.csv and claim-line.csv, a pharmacy line both pharmacy files). Blank fields are folded away behind a switch with their count. The provider name opens the whole provider.csv row (credential, gender, prescribing, taxonomy, role dates, organization). Enrollment has an "Other benefits" card (dental, mental health, chemical dependency, long-term services, employee flag) and the same columns in the periods table (hidden until chosen in Columns). Profile shows middle initial, subscriber or family ID and mailing address 2. **The demo data does not hold every column, so values it lacks are made up from the record (the same every time) and marked "Sample"** (`src/recordFields.ts`). In the real product they are the file's values.
- **Made up, because the spec has none of it:** care manager, tasks and due dates, contact log (date, method, outcome, notes, follow-up date, care manager), appointments and referrals, records requests, the starting gap status, "gap identified" dates and "last updated" dates. They are the same every time and are marked "Demo" in each column's (i). Changes you make in the demo are kept for the visit. **Access > Partner login > Reset demo data** clears them.
- **Worked out, not in the spec as a field:** the primary care provider on the Profile tab (the primary-care provider with the most records) and the "primary care gap" (first open gap in the usual measure order).
- **Measure version** shown on every measure is "HEDIS MY2026, simplified demo rules v0.3". The spec says the real calculation is NCQA logic; this demo uses simplified rules.

## UX rules used on every screen

- **Answer a question per block.** Dashboard: is my data current and complete? How is each measure doing? Where do groups differ, and who are those members?
- **Every number leads somewhere.** A "not met" count, a bar or a group row opens the member list already filtered; the filter shows as a removable chip.
- **No unexplained short forms.** Measure names are written in full with the code beside them, and an (i) explains measures, columns and terms in plain words (`InfoTip` / `Term`, and `help` on table columns).
- **One table at a time.** Several tables on one topic go in tabs, never stacked.
- **Every table has search and column choice** (`DataTable` toolbar).

## Accessibility

Every chart has a text equivalent (hidden data table, values written on bars), status is never shown by colour alone (words and icons), and each page was scanned with axe-core (WCAG 2.1 AA): 0 violations.

## Added for the manager questions (v0.4 demo rules)

- **More exclusions:** palliative care in the measurement year (BCS-E, COL-E, GSD), colorectal cancer and total colectomy (COL-E), and hospice is now checked before death. Palliative care is not in the ingestion spec: marked "Standard HEDIS rule" and not yet checked against the official specification.
- **COL-E tests and windows:** colonoscopy 10 years, CT colonography and flexible sigmoidoscopy 5 years, stool DNA 3 years, FIT this year (`colTests` in `src/data.ts`). The spec gives no windows: they are HEDIS windows and are **not yet validated** against MY 2026. A record that exists but is outside its window is shown as "closest record on file (did not count)".
- **Why a gap is still open:** a final HbA1c lab with no result value shows as Needs review (GSD needs the actual value); a screening code that is not mapped to the measure (Z12.31, Z01.419, Z12.11, 83036) is flagged on the Evidence tab and in the record box; files not received are listed on the gap Overview.
- **Care team:** Care team and Care manager columns in both member tables, and Care team on the gap page. Demo data (`careTeamOf`).
- **Evidence lineage:** `RecordBox` shows the exact record behind any result (met, did not meet, or caused the exclusion) on the member measure page and the gap Overview.
- **Demo members for these cases** are added by `withEdgeCases` in `src/data.ts` on a fixed rhythm; the 10 sample members are untouched.

## Worklist columns and filters (staff worklist questions)

- **Gaps in several measures** (Yes/No, hidden until ticked; the filter is always in the Filters panel), **Age group**, **Latest HbA1c** (filter: above 9%, 8% to 9%, below 8%, no result; shown by default on the GSD members table), **Age status** (ages out next year, just aged in), **Last contact** and **Contact result** (filter includes "Not contacted yet"). All are in both member tables (Members list and a measure's Members tab).
- **Next appointment** filter has quick picks (Next 7 days, Next 14 days, Later, No appointment) above the From/To dates. These need the `presets` option on the library's `dateRange` filter (added to `sevida-ui`).
- **Quality measures > a measure > Results by group** can also split by Care team, Care manager and Primary care provider (sorted by most gaps first). Provider is worked out from the records (same as the member page); there is no clinic, because the spec has none.
- Demo data: care team, care manager and the contact log. Just aged in has examples only for COL-E in the demo.

## Measurement year (2026 and 2025)

The **Members** list and the **Quality measures** table have a **Measurement year** column and a filter in the Filters drawer. The filter always has a value: it starts at 2026 and has no "All" (library option: `filter: { type: 'select', required: true }`). A row is one member in one year (Members) or one measure in one year (Quality measures). Open a row for a past year and the member page, measure page and member measure page follow it through `?year=2025` in the address.

| | 2026 (current) | 2025 (past) |
|---|---|---|
| Records | the demo members | the same members with every date moved back one year (a demo copy, not real 2025 data) |
| Rules | Leap Sonata data spec (ages BCS-E 42–74, CCS-E 24–64, COL-E 46–75) | NCQA MY 2025 documents for the items below; everything else is the 2026 rule, labelled "Same as 2026, not confirmed" |
| Care-gap work | care manager, appointments, outreach, evidence | none: results are final, shown as "Year ended" or a dash |

2025 items taken from NCQA's public documents: ages WCV 3–21, BCS-E 50–74, CCS-E 21–64, COL-E 45–75, GSD 18–75; CCS-E also counts a high-risk HPV test in the last 5 years (age 30+ on the test date); WCV no longer counts telehealth well-care visits; BCS-E ignores a mastectomy that appears only on a lab claim when looking for the two-sided mastectomy exclusion. **Not confirmed for 2025:** the colorectal test windows, the BCS-E and CCS-E look-back windows, and the other exclusions. 2026 does not use the HPV, telehealth or lab-claim rules (they are switched on per year in `yearRules` in `src/data.ts`).

Demo records added to show the difference: 6 children whose only well-care visit was by telehealth, 5 women with an HPV test and no Pap test, 3 women with a mastectomy on one side plus one billed on a lab claim (these three are now Excluded in 2026 BCS-E; before they were Not met).

Where it lives: `YEARS`, `yearRules`, `memberForYear`, `measureFor` and the `year` argument of `resultsFor`, `tally`, `evaluate` in `src/data.ts`; `evidenceKindsFor` in `src/careGaps.tsx`; the column and row type in `src/components/memberColumns.tsx` (`MemberRow`, `memberYearRows`).

## Saved views (Members, Quality measures, measure Members tab)

Each of these tables has the same eye icon as Alert Response, at the left of the toolbar.

- **What a view keeps:** the filters (including Measurement year), the columns (order, hidden, pinned) and the sort. It does not keep the search text or column widths.
- **Save icon:** appears next to the eye only when something differs from the view that is on. It lets you update that view or save a new one.
- **Menu:** Default, your saved views, "Save current view…" and "Manage views…".
- **Manage views:** pick which view opens by default (radio), rename, delete.
- **Saving a view makes it the one that opens next time.** Pick "Default" in Manage views to undo that.
- **Clear all** goes back to the default view, not to an empty table. The Measurement year filter stays on.
- **Storage:** this browser only (localStorage, key `sevida-ui:views:<table>:list` and `:default`). Nothing is shared between people or devices in the demo.
- **Where it lives:** it is built once in the library DataTable and turned on with `savedViews="<name>"`. A server store later means a small async change to the store interface; see the library README.

## Measure result filter (measure page, Members tab)

The Members tab of a measure has a **Measure result** column and filter: Met, Not met, Needs review, Excluded. It is for this one measure only. Links from the charts and counts (for example the Not met count) open the tab with this filter already set; remove or change it in the filters panel like any other filter. The Members list has no such column, because a result means nothing without a measure; use Gaps and Gap status there.

## Member columns (from the Madigan checklist, points 4 to 9)

- **Date of birth** is now a column (and keeps its date-range filter). It sits next to Age, which stays.
- **Sex** replaces "Gender" in the column, the filter and the member header. It is shown by default now. (The data field is still called `gender`, as in the spec file.)
- **Member name is pinned by default**, so the person stays in view when you scroll sideways. Unpin it in the Columns panel. Name, Member ID, Date of birth, Sex and Open gaps are all visible without opening anything.
- Search by name or Member ID is partial and ignores upper and lower case. Search and filters work together.
- The date filter is two typed date boxes, not dropdowns.
- **Open care gaps filter (Members list):** a dropdown with All, No open gaps, 1, 2, 3 and 4 or more open gaps (checklist row 10). Inside one measure a member has at most one open gap, so that tab keeps a plain Has an open gap / No open gaps choice.
- **State, County, Military status** (checklist rows 11 and 12): three columns and filters, **off by default** since the sheet says the table is already too wide (switch them on in the Columns panel; the filters are always in the panel). State comes from the member file. **County and Military status are PROPOSED new columns of the member file**: the ingestion spec has no such fields (it has City, State and Zip only, "not used in measure logic"), so the spec owner has to add them, or County can be looked up from the Zip. In the demo they are stored on each member record like any other field (not worked out on the screen), shown on the member Profile tab as "(proposed field)", and the help text says so. Like every member in the demo, the values are sample data. A third of the made-up members live in Indiana, Missouri, Iowa or other Illinois cities so the filters have something to pick.
- **Age From / To** (row 15): the Age column has number boxes (for example 40 to 55) next to the fixed Age group buckets. **A slider** (two handles, 0 to 100) sits above the boxes and stays in step with them (FR-407.2): drag it, or type. Both handles at the ends means no age filter.
- **Evidence code** (row 14) now shows what the code means under it (for example "Hemoglobin A1c, 6.8%"), and the search box finds members by that text.

## Filter panel (checklist rows 17 to 23, 29, 30)

- **Order:** Measurement year first (it is required and always has a value), then **Measure** (FR-407.4, set with `filterPinned` on the column, because it is the filter people reach for first and the Open care gaps count follows it), then every other filter A to Z by its label. The library does this itself (`FilterFields`).
- **Apply:** changes in the panel are held until you press **Apply** (full-width button at the bottom; off until something changes). Closing the panel drops unapplied choices. On a phone, Apply is in the bottom sheet.
- **Clear filters** is at the top of the panel.
- **Pick-many lists:** the picked values show as small chips with an x, so one can be removed without opening the list. Clicking **All** while it is ticked un-ticks everything so you can tick only what you want; closing the list with nothing ticked goes back to All.
- **Saved views menu:** the first item is **Reset to default** (the plain table). **Reset to my view** appears when you have chosen a default view, and goes back to that one.

## Member page (checklist rows 32 to 52)

- **Header (rows 32, 33):** name, Member ID, date of birth, Age · sex (Sex, not Gender) and an **enrollment status** chip: "Enrolled since 1 Jan 2024", or "Not enrolled, ended 20 Sep 2026". The files have no status field, only start and end dates (member-en.csv), so the status is worked out from those dates as of today. Whether this is what the customer means by "enrollment status" is still to be confirmed with them.
- **Labs tab (rows 42 to 46):** Collection date (the lab.csv Date of Service), Result, **Unit, Reference range, Flag, Resulting date**. These four are **PROPOSED stored fields**: the spec has Units and Result Value Flag in obs.csv only, and no file has a reference range or a result date. Each is stored on the lab record and the help text says so. The spec owner has to add them (or the reference range may have to come from the customer separately). Row 47 (is an updated date also needed for labs?) is answered by Last updated below; confirm with the customer.
- **Last updated and Date identified (rows 38 to 41):** every record tab has **Last updated** (the day the file last reached Sonata) and **Date identified** (the day Sonata first saw the record), each with a date filter. Date identified is a **PROPOSED stored field**: the spec does not have it, and today the first value is lost when a record is overwritten. The Profile and Enrollment tabs come from one file each, so they show one "Last updated: <date> (file)" line instead of a column and filter that would be the same on every row.
- **Newest first (row 37):** record tabs, the Care gaps tab and the Enrollment tab are all sorted newest first.
- **Care gaps tab (rows 48 to 51):** filter by Gap status (Open, Closed), Measure, Evidence status and a **Gap identified date range**. New **Closed by** column: the record that closed the gap (for example "Colonoscopy, 7 Aug 2026") and who closed it and when. "Gap reason" already says why the gap existed.
- **Measures tab (row 52):** the button "View steps" is now **"How it was decided"**, to match the popup it opens.
- **Not built / not for us:** row 35 (show every ingested field, for example claim paid amount and place of service) is still open. Row 36 and row 47 are questions for the customer. Row 53 is a comment. Role scoping (row 2) is not built.

## Dates and states (US format)

- **Every date is MM/DD/YYYY** with two digits for month and day (for example 05/04/2026), in tables, popups, filter chips and the text of rule descriptions. Date and time is `MM/DD/YYYY, h:mm AM`. The one function for this is `fmtDate` (and `fmtDateTime`) in `data.ts`; do not format dates anywhere else. The date boxes in the filter panel are the browser's own date input and follow the browser's language (US English shows MM/DD/YYYY).
- **States are shown as full names** (Illinois, not IL) in the State column, its filter, the search and the member address. The member file still carries the two-letter postal code, as the spec says; `stateName(code)` in `data.ts` turns it into the name for display.

## Checklist rows 54 to 72 (member page, measure screen, lists)

- **Data last updated (row 54):** one line in the member header: Claims, Diagnoses, Immunizations, Labs, Medications, Visits and procedures, Enrollment, each with the day that file last arrived.
- **All records tab (rows 55, 56):** the first record tab. Every record in one list, newest first. Columns: Date | Type | What | Code | Status or result | Source | Last updated | Date identified | Measure or care gap. Details that only one kind has (unit, reference range, flag, result date) stay in that kind's tab. Click a row to open the record popup, which says which measure it relates to and what it did to it.
- **Export and print (rows 57, 67, 27):** an **Export** button on the Members list and on the Members tab of a measure opens a menu: **CSV, Excel (.xlsx) or PDF**. Each file holds every row that matches the search and filters (all pages, not only the page you see), with the columns that are showing, in their order. Dates are MM/DD/YYYY (real dates in Excel, so they sort). The PDF has the title, the row count, the date and the filters used, on A3 when the table is wide. On the member page, **Print or export summary** gives **Print** (a one-page printout), **PDF** and **Excel** (one tab each for Member, Measures, Care gaps and Data last updated). "Subject to role" is not built: there is one login.
- **Measure screen, Members tab (rows 60, 61, 62, 66):** it is the same table and columns as the Members list. The **Measure** filter is removed there, because every row is that measure. A row now opens the member on the **Care gaps** tab (for the current year; a past year has no care-gap work and opens the Measures tab).
- **Several open gaps across chosen measures (rows 68, 69, 70):** on the Members list, pick measures in the **Measure** filter first, then **Open care gaps**: the count covers only the picked measures. Example: pick BCS-E and CCS-E and 2 open gaps, and you get members with a gap in both, even if they also have a gap in another measure. With no measure picked the count covers all measures. The Open gaps column sorts.
- **Gaps closed since last run (row 71):** new column on the Quality measures table: care gaps closed with validated evidence after the last calculation. They still count as Not met until the next run. Row 72 (also on the Overview dashboard) is a stretch comment and is not built.


## Dashboard (Madigan POC dashboard checklist, FR-701 to FR-710; layout from the Sigma WCV wireframe)

- **Dashboard** (`/dashboard`) has one tab per measure (Well-care visits, Breast cancer, Cervical cancer, Colorectal cancer, Diabetes blood sugar) and an **Admin** tab. Every measure tab has the same layout. The tab is in the address (`/dashboard?m=GSD`); the filters stay when you switch tab.
- **Order on a measure tab** (same as the wireframe): title (`WCV - name`) with what the measure counts and the period; Last updated / Next update top right; **Filters**; **Whole population** box on the left (does not change with the filters) next to **Results** (Initial population, Eligible, Excluded, Met, Met %, Not met, Not met %; they change with the filters); **Met % by** race, ethnicity, age group, sex and provider; **Trend over time** with its own controls, the numbers table and the line chart; **List of members in the initial population**; what went into the measure; members left out and why; everything that affects this calculation (period, who is counted, who is left out, files, rules, formula, link to the full spec).
- **Filters** (same names and values as the Members list, listed Measurement year first, then A to Z; see "Filters match on both screens" below): Measurement year, Age (From / To), Age group, County, Date of birth, Ethnicity, Evidence date, Excluded from, Latest HbA1c, Measure result, Member, Military status, Open care gaps, Primary care provider, Race, Sex, State. Like the Members list, a choice applies only after **Apply** (Apply sits at the top next to Clear filters; Enter in a box applies too; Clear filters applies at once and keeps the year). No period filter (the period is always Jan 1 to Dec 31). No Care Manager filter.
- **Trend controls** (in the trend card, they change the trend only): Daily / Weekly / Monthly / Quarterly / Annual, Met % or Not met %, From, To, Compare with last year. Table on the left (period start, period end, met, eligible, rate), chart on the right. On a narrow screen the chart is first.
- Charts: one color, group size under the name (`met of eligible`), a star when fewer than 10 eligible. A split with one group is a sentence, not a one-bar chart. Bars are not clickable. Each chart card has a small icon that downloads that chart as a PNG (FR-709.2).
- **Clicking a Results card** (FR-707.1) lists those members below: Met or Met % shows only Met members, Not met or Not met % only Not met, the other cards show everyone. A banner above the list says what is shown and has "Show everyone". The page scrolls to the list.
- **Gaps closed since the last run** is the line under the Results.
- **Export dashboard** (icon, top right) saves Excel, PDF or CSV with the applied filters at the top. The member list has its own Export.
- **Admin tab** (slim first pass, after the reviewer comments on the other team's Admin mock-up): **Calculation settings in use** at the top (specification, period, measures, run schedule, last and next run); **Latest load** (files received, rows received, **rows accepted count and %**, rows rejected count and %, rows with a warning); a red **critical problems** box (a file that a measure reads was rejected or did not arrive, so results may be incomplete), a "What you can do" line (fix at the source and send the file again; export the list to send back to Madigan); **Problems by reason** with what to do for each; and the detail table (opens on rejected and not-received rows only; a switch adds the rows used with a warning; columns: impact, file, row, member, field, value received, rule broken, reason, measures affected, loaded at, result; file type, source and the plain-words problem are in the Columns panel; search, filters, export). Left out on purpose because they come from Operations or are for Leap staff: load retries, nightly run history, FHIR artefact build status, lineage, member matching.
- The trend is rebuilt from the dates of the evidence, so it only exists for 2025 and 2026 in the demo. The rate starts again each January 1.
- Demo assumptions to confirm with the customer: the GSD second rate (HbA1c at or under 9%), the Admin rows (worked out from the demo files), the "Gaps closed" per period (not in the trend table: needs care-gap history per run).
- Code: numbers in `src/dashboardData.ts`; page in `src/pages/DashboardPage.tsx`; parts in `src/components/dashboard/`. `/dashboard/WCV` style addresses redirect. Library: `LineChart` (hover, dashed lines, gaps), `BarChart` (wrapped labels), `StatCard` (`tip`, now exported).


## Filters match on both screens (Dashboard and Members list)

Rule: the same idea has the same name, the same values and the same control on both screens. Both read one shared file, `src/sharedFilters.ts` (age groups, filter names, result choices, sex, military status), so a change there shows on both.

- **Age group:** one list, Under 3, 3–11, 12–17, 18–21, 22–39, 40–49, 50–64, 65 and over (age on December 31 of the measurement year). The Met % by age group chart uses the same list.
- **Measure result:** All, Met, Not met, Needs review, Excluded (same words as the result chips). On the Members list it exists inside a measure's Members tab only.
- **Sex:** All, Female, Male (pick one) on both.
- **"All" means everything.** No "Any" and no "Met and Not met".
- **Same order** for the filters both screens have. On the Members list use `filterOrder` on a column to place its filter.
- **Same behaviour:** both wait for Apply.
- **Race, Ethnicity and Primary care provider** are now Members list filters (columns hidden until ticked), using the same functions as the dashboard.
- **Age (From / To), State, County and Military status** are now dashboard filters, and so are **Date of birth, Open care gaps, Excluded from, Evidence date and Latest HbA1c**. County and Military status are still proposed new member-file fields. On the dashboard, Open care gaps counts the measures a member has not met (a gap closed since the last run still counts until the next run).
- Left different on purpose: Measure (the dashboard has tabs, the list has a filter), Member (a box in the dashboard block, the table search on the list), and the care-work filters that only make sense for calling people: Gap status, Gap identified, Next appointment, Last contact, Contact result, Care team, Care manager, Age status, Last updated. The full side-by-side list is in `filter-comparison.xlsx`.


## Quality measure analytics (QuickSight style) (`/#/quicksight`)

The same dashboard drawn only with what QuickSight can build, from the Leap QuickSight style guide (leap-context-plane, PR #35). The old Dashboard is hidden from the sidebar (still at `/#/dashboard`). The audit that led to this is `quicksight-audit.xlsx` (70 elements: what works, what changes, what is not possible, what to ask the QuickSight developers).

- **Frame:** QuickSight's own toolbar (Reset works; Bookmarks, Export, Share are drawn greyed because we cannot style them) and tab strip (Overview, Details, Data, Admin, Help). Measure is a control on every sheet, not a tab.
- **Controls bar:** 12-column grid, four controls per row (3 columns each), a date range is 6 columns, collapsible. Overview has 12 controls, Details has 10 more. Age is a slider. Choices apply at once (no Apply button: the guide lists none, see Q1). Same filter names and values as the Members list.
- **Sheet:** 36-column grid of tiles. Tiles are KPI, column chart, line chart, table and text box only. Gap between tiles and margin are on, tile padding 16 px, corner radius 12 px.
- **Look:** one font, Source Sans Pro (Lato is not on QuickSight's list), Normal or Bold only, no shadows, square bars, one decimal on percentages, MM/DD/YYYY dates, fixed meaning colours (Met green, Not met orange, neutral grey-blue). All colours come from the Sonata tokens (`src/quicksight/qsTheme.ts` is the token sheet of guide chapter 07).
- **Replacements for things QuickSight cannot do:** the Results cards cannot be clicked, so a small Met / Not met column chart is clickable and opens Details filtered. The chart image icon, How-to popup, banners, switches, chips, saved views and column picker are gone (a Help sheet and coloured text-box tiles take their place).
- **Review tags** (grey `FR-7xx`, amber `Ask Qn`): which requirement a tile answers and which audit question it depends on. They are not part of the dashboard. Switch them off at the top right. Hover an amber tag for the question.
- **Code:** `src/quicksight/kit.tsx` (frame, controls bar, sheet grid, tile, KPI, column chart, table, text box) and `src/pages/QuickSightDashboardPage.tsx`. Numbers come from the same functions as the old dashboard (`dashboardData.ts`).


## Review fixes from the customer (LPP-16069, member list and search)

- **Search (FR-402):** the search box looks at Member name and Member ID only. A care manager, care team or evidence text no longer brings up members.
- **Count (FR-405):** the Members page title shows how many members match the search and filters, for example "Members (12 of 300)". The library DataTable has a new `onResultCountChange` prop for this. A measure's Members tab already showed a live count in its table title.
- **Gaps (FR-404):** "Gaps in several measures" is gone (Open gaps already tells that; filter on Open gaps to find members with 2 or more). **Gaps** now lists open gaps only and matches the Open gaps number. The **Gap status** column is gone. New **Closed gaps** column (shown by default, next to the evidence columns): the measure and the day it was closed, for the current measurement year. A past year has no care-gap work, so it shows a dash.
- **Missing evidence (new):** for each open gap, the records that would close it (any one of them), with the date windows on hover.
- **Evidence date and Evidence:** now tied to the closed gaps (the record that closed each one, one line per gap, same measures as Closed gaps), so they no longer show evidence for a measure the member has no gap in. The Evidence column shows the test or service and its result in larger text, with its technical code under it (for example **Hemoglobin A1c: 7.8%** and 4548-4 (LOINC)). Order: Closed gaps, Evidence date, Evidence, then Excluded from. Evidence entered by staff has no code of its own in the demo, so the code is the usual one for that kind of evidence (`evidenceCodeOf`).
- **Removed:** Evidence source system, Evidence provider, and the "Gaps in more than one measure" filter (also removed from the dashboard and QuickSight filters).
- **Moved:** Gap identified now sits right after Gaps.
- Saved table setups were reset (storage keys raised) because columns were removed.


## Care gaps screen (FR-601 to FR-610)

A separate item in the sidebar, between Members and Quality measures. It is the worklist for the whole population: every open gap, one row per gap (a member with two open gaps has two rows).

- **Title:** a live count, for example "Care gaps (60 of 145)".
- **Tabs:** All measures, then one tab per measure, each with its count (the library `Tabs`, like the other screens). The counts follow the search and every filter except Measure. A tab sets the Measure filter; the Measure filter in the Filters panel does the same.
- **Columns:** Member name, Member ID, Measure, Why, Missing evidence (short text, hover for every accepted record with its date window), Gap identified, Evidence status, Open gaps (the member's total, sortable and filterable), Next appointment, Contact result, Care manager. Hidden until switched on: Last contact, Care team, Date of birth, Age, Sex, Spoken language, State, County, Military status.
- **Filters:** the same names and values as Members (the member facets come from one helper, `memberFacets` in `memberColumns.tsx`), plus Measure, Evidence status, Gap identified, Contact result and Care manager. Saved views and Export work as on Members.
- **Sorting:** starts with the oldest gap first. Sort on Open gaps to bring members with several gaps to the top.
- **Opening things:** the member name, the Member ID and a click on the row all open the member with the **Care gaps tab** in focus (FR-607). The gap's own page is one more click: from that tab, or from the row's ⋮ menu ("Open this care gap").
- **Search:** member name and Member ID only.
- **Current measurement year only.** A past year has no care-gap work.
- **Not built:** FR-611 (gaps closed since a prior run). It needs run history, and the requirements document marks it Stretch.

## Icon buttons: one rule (sevida-ui `IconButton`)

- `variant="boxed"` is for actions in a toolbar or page header: export, download, print, saved views, save view, show/hide details. Always the same 40px outlined square with a 22px icon.
- Plain (default) is for small helpers inside content: the row menu, the close X, pagination, clear search.
- Do not hand-style a border onto an IconButton. If it is a toolbar action, use `variant="boxed"`.

## Wording and order rules (one rule for the whole mockup)

- Title Case for every label: buttons, tabs, sidebar items, column headers, filter labels, column chooser, card and page titles, field labels. Small words (a, an, and, as, at, but, by, for, in, nor, of, on, or, the, to, vs, via) stay lowercase unless first, last or after a colon. The sevida-ui components apply this themselves through `titleCase` (src/utils/titleCase.ts), so screens just pass normal text. Values, status chips, sentences and tooltips stay in sentence case (Not met, Needs review, Not requested, Other race). Official measure names stay as NCQA writes them. The theme does not capitalise button text.
- Code and name are joined with " · " (WCV · Child and Adolescent Well-Care Visits). Never " - " or " – ".
- Filters in every panel and bar are listed A to Z by label, with Measurement year first.
- Every dropdown list is A to Z by what the viewer reads, with All first. The table filter does this itself (`sortOptions` in sevida-ui). Set `ordered: true` on the filter only when the values have a natural order: age groups, open-gap counts, HbA1c bands, evidence stages, Daily to Annual. A required filter (Measurement year) keeps your order, newest first.
- Measure pickers (tabs on Care gaps and the dashboard, every measure dropdown) are A to Z.
- Page tabs that follow a workflow (Profile, Measures, Care gaps…) keep their logical order. They are navigation, not a list.
- The QuickSight pages copy QuickSight's own tab strip and toolbar on purpose, so those keep QuickSight's sizes.

## Roles: the "View as" picker (FR-302 to 304, 401, 509, 706)

A picker in the header ("View as (demo only)") switches the role. Real roles will come from Keycloak at sign-in; the role list is a DRAFT from the requirements doc and Madigan has not confirmed it (open question 8). All the rules are in one file, `src/roles.tsx`.

| Role | Menus | Members | Member page tabs removed | Admin sheet |
|---|---|---|---|---|
| Administrator | all | all | none | yes |
| Quality analyst | all | all | none | yes |
| Care manager (demo: Rita Gomez) | Members, Care gaps | own caseload (the care manager on the Members list) | Claims, All records | no |
| Clinician (demo: Maria L. Rivera, MD) | Members, Care gaps | own patients (the primary care provider) | Enrollment, Claims, All records | no |
| Executive | Analytics (both), Quality measures | none: totals and rates only | no member pages | no |

- Hide, never grey out. A hidden address typed by hand opens "You do not have access" (`AccessGate.tsx`).
- The same member filter applies to Members, Care gaps and every member page. The Executive gets no Members tab on a measure, no member list card on the dashboard and no member list sheet on the QuickSight page.
- This is a demo of the screens. Real enforcement is server-side (FR-305).

## Run history and "as of run" (FR-105, 108, 206, 209, 510, 705, NFR-08)

- **One header line on every page** (top bar, left of the View As button): `Data as of 10/15/2026 · Run 10/16/2026, 2:00 AM`. It is one component (`RunLine`, `components/RunBits.tsx`), so no page can differ. *Data as of* = date of the newest file the results are built from. *Run* = when the calculation ran. On a phone the text is hidden and only the chips remain.
- **Seven nightly runs** are made up in `src/runs.tsx`, the same every time: two with warnings, one with no new files (10/15), one failed (10/13, no results published), the rest completed. The real list comes from the pipeline's run log.
- **Results as of run** (FR-206): a picker on every Analytics page (Quality measure analytics, Analytics option 2, the Dashboard). It lists the runs that published results, newest first (a timeline, so it is the one list that is not A to Z). Choosing an older run changes every number in the app (dashboards, members, care gaps, measures): `resultsFor` in `data.ts` takes an "as of" step, and members whose gap closed in a later file show as Not met again. The step is the same for a member in every measure, so an older run never shows a gap a newer run does not. A chip "Older run" and a "Back to latest run" button show in the header, and a banner on the Analytics pages.
- **A night with no new file** (FR-105) shows a warning banner on the Analytics pages: nothing was recalculated, these are the results of the run before. Choose the 10/15 run to see it.
- **Run history table** (FR-108, FR-209) in the Admin tab (Dashboard) and the Admin sheet (Quality measure analytics): run started, status, data as of, files received, rows in, rows out, rows rejected, duration, and a View button. Click a row for the files, the problems by reason and each measure (members counted, time, status). Administrators and Quality analysts only.
- **Not built:** FR-611 (gaps closed since a prior run, shown as a list), FR-111 (re-run a failed night from the screen). Trend charts are not versioned by run.

## Access log (FR-306, 308, NFR-06)

- **Administrators only**: "Access log" in the sidebar, `/access-log`. Read only. Two tabs: *Sign-ins and denials* (signed in, sign-in failed, signed out, session expired, access denied, role switched) and *Member access* (who opened which member, which screen, allowed or denied). Filters by date, user, role, event or screen, outcome, and member; export to CSV, Excel or PDF.
- **Live plus made-up history** (`src/auditLog.tsx`): 15 days of made-up rows so it is never empty, and new rows appear while you use the demo (sign in, wrong password, sign out, switch role, open a member, open a page the role cannot). Stored in the browser for the visit only. The real log is written by the server.
- A member page is logged when it opens (member page, care gap page, measure result page). Lists are not logged row by row.

## Session expiry (FR-307)

- After 15 minutes without a mouse move, key, scroll or touch the person is signed out and sees **Your session expired**. **Sign in again** goes to the sign-in page, which says the session expired, and after signing in the person lands on the page they were on. The length is `SESSION_IDLE_MINUTES` in `src/session.tsx` (in real life it is the Keycloak setting).
- **Demo shortcut:** *Expire Session Now* at the bottom of the View As menu.

## Member search and filters (FR-402, FR-407)

- **Column names stay in view** (FR-405): the Members list, a measure's Members tab and the Care gaps screen scroll their rows inside the table (`stickyHeader` plus `maxHeight`), so the headings never leave the screen, even at 100 rows per page. The Members list shows 21 columns by default (it was 24).
- **Print summary from a list** (FR-512): the ⋮ menu on a row has **Print summary**. It opens the member and starts the print dialog for the one-page summary (PDF and Excel stay on the member page).

- **Search box** (Members list, a measure's Members tab, Care gaps, dashboard member list): finds a member by name, Member ID or **insurance number**. In the Filters panel, **First name**, **Last name**, **Insurance number** and **Date of birth** can be used alone or together to narrow the list to one person. The insurance number is the spec's *Subscriber or Family ID Number*; the demo members have none, so it is made up (`memberExtras`).
- **Diagnosis** filter (hidden column, Filters panel): pick one or more diagnoses (code and name, one entry per code) to find members who have any of them, from claims and the EHR problem list.
- **Measure result** filter on the Members list (hidden column): for example "BCS-E: Met" or "COL-E: Not met". Inside a measure the existing Measure result column is used.

## Failed nights and bad rows (FR-107, FR-111)

- **When a run stops** (Admin tab): a bad row is left out and listed in Rejected rows (file, row, member, field, value received, rule broken, reason), and the run goes on. A rejected `member-gm.csv` or `member-en.csv` stops the run. A setting stops it when more than 1, 2, 5 or 10% of a file's rows fail. In the demo the setting does not change the runs in the history.
- **Run again**: a failed night in Run history (and its run window) has a Run again button. It asks first, then adds a new run at the top of the history (labelled "re-run", results of the latest files) and shows it. It is written to the Access log as "Run started again". The re-run is kept for the visit only. Open question 12 (what a re-run reads) is assumed: the files in the drop now.

## Gaps closed since an earlier run (FR-611)

On the Care gaps page, **Gaps closed since an earlier run** picks an earlier run and lists the gaps that were open then and are met on the run being shown, with the run that closed each one. The results of every run are kept, so this is the difference between two runs. The measures page column that used to say "Gaps closed since last run" now says "closed by staff": those gaps stay Not met until the next run.

## Dashboard export (FR-709)

The Export icon on the main dashboard has Excel, PDF and CSV (tables and filters), and **Whole page as PDF, with charts** (the print window, landscape, without the menu and header). Each chart also has a picture icon. A whole-page picture is not offered: browsers do not allow drawing a page into an image without an extra library. Analytics Option 2 follows QuickSight: PDF through the print window, no image export (question 6).
