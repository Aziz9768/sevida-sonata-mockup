# Sevida UI

The common component library for Sevida Lite and the Leap Metrics app, plus **Storybook**, the
showcase app that displays every component on phone, tablet and desktop sizes.

## Run it

```
npm install
npm run storybook      # opens the showcase at http://localhost:6006
```

In Storybook, use the **Viewport** button in the toolbar to switch between Phone (390), Tablet (768)
and Desktop (1440).

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Builds the library into `dist/` (JS + types) |
| `npm run build-storybook` | Builds the showcase as plain files you can host anywhere |
| `npm run typecheck` | Checks the code for type errors |

## What is inside

| Folder | Contents |
|---|---|
| `src/theme/` | `tokens.ts` (the one place colours, sizes, fonts are defined), `createSevidaTheme.ts`, `SevidaThemeProvider.tsx` |
| `src/components/` | Button, Card (Card, DetailGrid), DataTable (with search, filters, column chooser), Pagination, Modal (Modal, ConfirmDialog), Page (PageContainer, Breadcrumbs, StickyActionBar), Tabs, RateBar, FileDropzone, Sidebar (Sidebar, AppHeader, AppShell), Form (TextField, PasswordField, CodeField, SelectField, AutocompleteField, DateField, CheckboxField, SwitchField, RadioGroupField, FormSection), Auth (sign-in, sign-up, password, two-step, status and error pages), Feedback (StatusChip, InfoBanner, EmptyState) |
| `src/stories/` | Foundations pages and the full "Members list" example page |
| `fonts.css` | Lato, bundled so the app works with no internet |

Every component sits in its own folder with a `.stories.tsx` file next to it. That file is its Storybook page.

## Using it in an app

```tsx
import 'sevida-ui/fonts.css';
import { SevidaThemeProvider, Button, DataTable } from 'sevida-ui';

<SevidaThemeProvider brand={{ primary: '#484581' }}>   {/* brand is optional */}
  <Button>Save</Button>
</SevidaThemeProvider>
```

* Wrap the whole app, or just ONE screen of an existing app, in `SevidaThemeProvider`. Old screens are not affected.
* The app must provide `react`, `@mui/material` (v7), `@mui/icons-material` and `@emotion/*`. The library does not bundle them.
* Routing: the library never depends on a router. `Breadcrumbs` takes `renderLink`, and `Sidebar` / `AppShell` take `linkComponent`, so you plug in your router's link.

## Look and feel (same as the Leap Metrics app)

Colours and type are copied from the live Leap Metrics app and live in ONE file: `src/theme/tokens.ts`.

| What | Value |
|---|---|
| Font | Lato (bundled) for the page. **Table headers and table cells are Roboto 14 (header 500, cells 400) with 0.15px letter spacing, because that is what the Leap Metrics app shows** (bundled too). Body 14 / 400, page title 24 / 700, list title 18 / 400, card title 14 / 700, record name 16 / 600, labels and table headings 14 / 500, buttons 13 / 400 (first letter of each word capital) |
| Primary (structure) | `#484581` indigo; `primary.dark` `#272460` = sidebar and main list table headers |
| Secondary (action) | `#3E5FCA` = links, filled buttons, tabs. Outlined buttons are indigo |
| Accent | `#FBAA51` active menu item, `#F97316` call-outs |
| Text greys | `#212529` body, `#374151` labels, `#666666` secondary, `#64748B` cool grey, `#BDBDBD` disabled |
| Backgrounds | `#FFFFFF` page and cards, `#F3F4F6` panels, `#F8FAFC` subtle, `#D1E0F4` record-header band, `#E0E0E0` borders |
| Status | success `#2E7D32`, warning `#ED6C02`, danger `#D32F2F`, info `#1976D2`; filled status labels `#81C784`, `#FFCC80`, `#EF5350`, `#90CAF9` with black text |

To change something for everyone, edit `tokens.ts`. For one client, pass `brand` to `SevidaThemeProvider` (`primary`, `primaryDark`, `secondary`, `fontFamily`, `tableFontFamily`). To make tables Lato like the rest of the page, pass `tableFontFamily` the same value as `fontFamily`. See Storybook: Foundations.

## Logo, name and "Powered by"

The sidebar and every sign-in/error screen show a **placeholder logo** (a rounded square with the first letter) and the name **Sonata**, plus a small **"Powered by Leap Metrics"** line.

```tsx
<Sidebar brandName="Sonata" logo={<img src="/logo.svg" height={28} />} logoCollapsed={<img src="/mark.svg" height={28} />} ... />
<AuthLayout logo={<img src="/client-logo.svg" height={32} />} appName="Client name" ... />   // client re-brand
<Sidebar poweredBy={false} ... />                                                          // hide the line
```

`BrandLogo` (mark + name) and `PoweredBy` are exported if you need them elsewhere.

## Mockups

The sibling folder `sevida-mockup` is a small app that builds real screens (Members list, Add New Member, Member detail with the Member Details form) from these components. See its README.

## Rules for adding a component

1. It must be used (or clearly will be used) in two or more places, and contain no client or domain words.
2. Colours, fonts and sizes come from the theme (`'primary.main'`, `'text.secondary'`, `theme.palette.tint.*`), never hard-coded.
3. It must work on a 390px phone with no sideways scrolling.
4. It gets a `.stories.tsx` page showing every variant.
5. Add it to `src/index.ts`.

## Using the DataTable

A table is described by a `columns` list. That list is the only thing you write.

```tsx
import { DataTable, StatusChip } from 'sevida-ui';
import type { Column } from 'sevida-ui';

const columns: Column<Member>[] = [
  { key: 'name',   header: 'Member', accessor: (m) => m.name, sortable: true, primary: true },
  { key: 'status', header: 'Status', accessor: (m) => m.status, sortable: true,
    filter: { type: 'select', options: [{ value: 'Active', label: 'Active' }, { value: 'Overdue', label: 'Overdue' }] },
    render: (m) => <StatusChip tone={m.status === 'Active' ? 'success' : 'danger'} label={m.status} /> },
];

<DataTable ariaLabel="Members" columns={columns} rows={members} getRowId={(m) => m.id} storageKey="members" />
```

**To add a column, add one line to `columns`:**

```tsx
{ key: 'phone', header: 'Phone', accessor: (m) => m.phone },
```

It then shows in the table, is found by the search box and appears in the Columns panel. Add only what you need to that line:

| You want to... | Add to the column |
|---|---|
| let people sort by it | `sortable: true` |
| show something other than plain text (chip, link, button) | `render: (row) => <.../>` |
| let people filter by it | `filter: { type: 'select', options: [...] }`, or `'text'`, `'multiselect'`, `'dateRange'` |
| give a number filter a slider | `filter: { type: 'numberRange', min: 0, max: 100 }`. A two-handle slider sits above the From / To boxes and stays in step with them. A slider left at both ends means no filter |
| keep one filter near the top | `filterPinned: true` on the column. It sits right under the required filter (Measurement year), ahead of the A to Z list |
| keep the column names in view while rows scroll | `stickyHeader` plus `maxHeight` (for example `maxHeight="calc(100vh - 300px)"`). The rows scroll inside the table and the headings stay put |
| let people save, name and reopen a table setup | `savedViews="members"` on the `DataTable` (the name keeps this table's views apart from other tables'). An eye icon appears beside the search box: pick a view, "Save current view…", "Manage views…" (rename, delete, choose which opens by default). A view keeps filters + columns (order, hidden, pinned) + sort, not search text or column widths. Views live in this browser; pass `savedViews={{ key, store }}` to keep them elsewhere. "Reset to default" goes back to the plain table; "Reset to my view" to your default view |
| a filter that can never be "All" (for example a Measurement year) | `filter: { type: 'select', options: [...], required: true }`. There is no All row; it starts as the first option and is not counted as an active filter |
| add quick-pick buttons to a date filter | `filter: { type: 'dateRange', presets: [{ label: 'Next 7 days', from, to }, { label: 'No date', blank: true }] }` (dates as `YYYY-MM-DD`; people can still type their own) |
| keep it out of the search box | `searchable: false` |
| hide it until someone switches it on | `defaultHidden: true` |
| put its filter in a different place in the Filters panel | `filterOrder: 2.5` (a number; filters are listed by this, or by column position if not set. 2.5 = between the 2nd and 3rd column) |
| start with a column pinned | `defaultPinned: true` (up to the table's `maxPinned`; the person can unpin it) |
| stop people hiding it | `alwaysVisible: true` (the `primary` column is always visible) |
| hide it on tablets, to avoid sideways scrolling | `hideBelow: 'md'` |
| keep it on one line (IDs, dates) | `nowrap: true` |
| right-align numbers | `align: 'right'` |
| leave it off the phone card | `hideOnMobile: true` |

**Export:** `exportFile="members"` on the `DataTable` adds an **Export** button with a menu: CSV, Excel (.xlsx) and PDF (`exportFormats={["csv","xlsx"]}` to offer fewer). The file holds every row that matches the search and filters (all pages), with the columns that are showing, in their order. Dates are MM/DD/YYYY (real dates in Excel); a list is joined with `; `. Columns without an `accessor` are left out. The PDF has a title, the row count, the date and the filters used. Not shown when the server pages the rows. The Excel and PDF code (packages `write-excel-file`, `jspdf`, `jspdf-autotable`) is loaded only when someone exports, so it does not add to the page size. For your own files (for example a one-page summary) use `exportAs(format, { title, lines, sheets }, fileName)` and the `ExportSheet` type; a sheet is `{ name, head, body }`, and each sheet becomes an Excel tab or a titled table in the PDF.

**Dependent filters:** `filterAccessor(row, filters)` receives the chosen filters as its second argument, for a filter that depends on another (for example "Open care gaps" counting only the measures picked in the Measure filter).

**Dates:** the table shows and searches dates as MM/DD/YYYY (US). Filter chips show the same (for example `Date of birth: 01/01/1960 → 12/31/1970`). The helper is `usDate` in `DataTable/filters.ts`. In your own `render` functions, format dates as MM/DD/YYYY too.

**Filters panel:** changes are kept as a draft until the person presses **Apply** (bottom of the panel, disabled until something changes). **Clear filters** sits at the top. Closing the panel drops an unapplied draft. In a pick-many (`multiselect`) filter, chosen values show as chips with an x, and clicking "All" while it is on un-ticks everything. The saved views menu reads "Reset to default" (the plain table) and, when a default view exists, "Reset to my view".

**Toolbar and rail (same design as the Alert Response table):** a framed bar with the `title` (+ row count), a search box, your `toolbarActions` and a chip for each active filter. On the right edge of the table are two tabs: **Filters** (one field per column that has `filter`) and **Columns** (show / hide, pin up to 3, reset). Drag a column heading to reorder it, drag its edge to resize it. On a phone the table becomes cards and a **Sort & Filter** button opens a bottom sheet.
`storageKey="members"` remembers each person's column choices (shown, order, pinned) in their browser. Use `toolbar={false}` for a bare table.

**Big lists:** pass `page`, `total` and `onPageChange`. The table then stops searching, filtering and sorting by itself, and reports what the user chose through
`onSearchChange`, `onFiltersChange` and `onSortChange`. `rows` is then just the current page.

## Sign-in and account screens

Storybook: **Examples → Sign-in and accounts** (there is also a click-through demo: password `Welcome123`, code `123456`).
All screens are pages with **no network code**: you pass `onSubmit` and do the real sign-in. Throw `new Error('message')` from `onSubmit` to show that message on the form.

```tsx
<LoginPage appName="Sevida Lite" forgotPasswordHref="/forgot-password" signUpHref="/sign-up"
  onSubmit={async ({ email, password }) => { /* call your API; throw on failure */ }} />
```

| Screen | Component |
|---|---|
| Sign in (optional single sign-on buttons via `ssoSlot`) | `LoginPage` |
| Open sign-up / invite-only sign-up | `SignUpPage` / `AcceptInvitationPage` |
| Forgot password, "Check your email" | `ForgotPasswordPage`, `CheckEmailPage` |
| New password from the email link (+ expired link view) | `ResetPasswordPage` |
| Two-step code | `TwoStepPage` |
| Verify email result | `VerifyEmailPage` |
| Session expired / Account locked / Signed out | `SessionExpiredPage`, `AccountLockedPage`, `SignedOutPage` |
| Change password when signed in | `ChangePasswordCard` |
| 404 / 403 / 500 | `NotFoundPage`, `NoAccessPage`, `ServerErrorPage` |

* **Per client:** invite-only = leave out `signUpHref` and use `AcceptInvitationPage`; open sign-up = pass `signUpHref` and use `SignUpPage`; both is fine. Logo, name and colours: `logo`, `appName`, and the theme `brand`.
* **Password rules** are shared: `passwordPolicy={{ minLength: 12, requireSymbol: true }}`. The page only guides; the server must enforce.
* **Routing:** pass `linkComponent` (your router's link, must accept `href`).
* Building blocks you can reuse: `PasswordField` (show / hide), `CodeField` (one box per digit), `PasswordRules`, `AuthLayout`.
* The server must also handle: not revealing whether an email exists on "Forgot password", lock-out after repeated failures, single-use expiring links.

## Not built yet (next batch)

export to Excel/CSV, Toast notifications, Stepper/Wizard, Timeline. Add these only when a real screen needs them.


## Charts

`RingGauge`, `LineChart`, `BarChart`, `Funnel`, `Pipeline`, `StackedBar` (components/Charts). Theme colours only, drawn as SVG at real pixel size, each with a screen-reader data table or text alternative.
