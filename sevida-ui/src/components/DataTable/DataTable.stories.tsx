import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { DataTable } from "./DataTable";
import { RowMenu } from "./RowMenu";
import type { Column, FilterState } from "./DataTable";
import { StatusChip } from "../Feedback/StatusChip";
import { Button } from "../Button/Button";
import { EmptyState } from "../Feedback/EmptyState";
import { members, statusTone } from "../../stories/sampleData";
import type { Member } from "../../stories/sampleData";

const DOCS = `
A list of records with **search**, **filters**, **column settings**, sorting, paging and row selection.
Filters and Columns open from the **tabs on the right edge of the table** (the same layout as the Alert Response table).
On a phone each row becomes a card with a **Sort & Filter** sheet, so nothing scrolls sideways.

### The only thing you write is the \`columns\` list

\`\`\`tsx
const columns: Column<Member>[] = [
  { key: 'name',   header: 'Member', accessor: (m) => m.name, sortable: true, primary: true },
  { key: 'status', header: 'Status', accessor: (m) => m.status,
    render: (m) => <StatusChip tone="success" label={m.status} /> },
];

<DataTable ariaLabel="Members" columns={columns} rows={members} getRowId={(m) => m.id} />
\`\`\`

### Add a new column = add one line

\`\`\`tsx
{ key: 'phone', header: 'Phone', accessor: (m) => m.phone },
\`\`\`

That column is now shown, can be searched, and appears in the Columns panel.
Then add only what you need:

| You want to… | Add to the column |
|---|---|
| let people sort by it | \`sortable: true\` |
| show something other than plain text (chip, link, button) | \`render: (row) => <…/>\` |
| let people filter by it | \`filter: { type: 'select', options: [...] }\` (also \`'text'\`, \`'multiselect'\`, \`'dateRange'\`, \`'numberRange'\`) |
| let people save, name and reopen a table setup | \`savedViews="members"\`. An eye icon beside the search box: pick a view, save the current one, manage views (rename, delete, choose which opens by default). Keeps filters, columns and sort; not search text or column widths. Stored in this browser |
| a filter that can never be All (a year, say) | \`filter: { type: 'select', options: [...], required: true }\`. No All row, starts at the first option, not counted as an active filter |
| add quick-pick buttons to a date filter | \`filter: { type: 'dateRange', presets: [{ label: 'Next 7 days', from: '2026-10-16', to: '2026-10-23' }, { label: 'No date', blank: true }] }\`. The user can still type their own dates |
| keep it out of the search box | \`searchable: false\` |
| hide it until someone switches it on | \`defaultHidden: true\` |
| stop people hiding it | \`alwaysVisible: true\` |
| hide it on tablets to avoid sideways scrolling | \`hideBelow: 'md'\` |
| keep it on one line (IDs, dates) | \`nowrap: true\` |
| right-align numbers | \`align: 'right'\` |
| leave it off the phone card | \`hideOnMobile: true\` |

### Row actions: always the three-dot menu

The last column of a table is the three-dot menu. Pass \`rowActions={(row) => <RowMenu rowLabel={row.name} items={[{ label: 'Open', onClick: ... }]} />}\`. Put the most common action first. Clicking the dots never triggers the row click.

### Filters, search and columns

* **Search** (top of the table) looks at every column that has an \`accessor\` (words can match different columns: "maria chronic").
* **Filters** tab (right edge): one labelled field for every column that has a \`filter\`. Active filters also show as chips above the table, each with an x, plus **Clear all**.
* **Columns** tab (right edge): tick to show / hide a column, **pin** up to 3 columns so they stay in view while scrolling sideways, or **Reset columns**.
* **Drag a column heading** (grab the dotted handle) to reorder. **Drag the edge** of a heading to resize it (double-click the edge to reset). Click a heading to sort.
* Add \`storageKey="members"\` to remember shown / hidden / order / pinned in this browser.
* Add \`title="Members"\` for a heading with the row count, and put extra buttons (Export, Add) in \`toolbarActions\`.

### Big lists (server does the work)

Pass \`page\`, \`total\` and \`onPageChange\`. The table then stops searching, filtering and sorting by itself and tells you what the user chose through
\`onSearchChange\`, \`onFiltersChange\` and \`onSortChange\`. \`rows\` is then just the current page.
`;

const columns: Column<Member>[] = [
  {
    key: "name",
    header: "Member",
    accessor: (m) => m.name,
    sortable: true,
    primary: true,
    filter: { type: "text" },
  },
  {
    key: "id",
    header: "ID",
    accessor: (m) => m.id,
    sortable: true,
    nowrap: true,
    hideBelow: "md",
  },
  {
    key: "program",
    header: "Program",
    accessor: (m) => m.program,
    sortable: true,
    filter: {
      type: "multiselect",
      options: [
        "Chronic Care",
        "Maternal Health",
        "Behavioral Health",
        "Transitions of Care",
      ].map((p) => ({ value: p, label: p })),
    },
  },
  {
    key: "cm",
    header: "Care manager",
    accessor: (m) => m.careManager,
    sortable: true,
    hideOnMobile: true,
    hideBelow: "md",
    filter: {
      type: "select",
      options: ["A. Rao", "S. Patel", "J. Moreno", "K. Lee"].map((p) => ({
        value: p,
        label: p,
      })),
    },
  },
  {
    key: "status",
    header: "Status",
    accessor: (m) => m.status,
    sortable: true,
    filter: {
      type: "select",
      options: ["Active", "Pending", "Overdue", "Inactive"].map((s) => ({
        value: s,
        label: s,
      })),
    },
    render: (m) => <StatusChip tone={statusTone[m.status]} label={m.status} />,
  },
  {
    key: "last",
    header: "Last contact",
    accessor: (m) => m.lastContact,
    sortable: true,
    nowrap: true,
    filter: { type: "dateRange" },
  },
  {
    key: "tasks",
    header: "Open tasks",
    accessor: (m) => m.openTasks,
    sortable: true,
    align: "right",
    hideBelow: "lg",
  },
  // Two extra columns that start hidden: switch them on in the Columns tab.
  {
    key: "phone",
    header: "Phone",
    accessor: (m) => m.phone,
    nowrap: true,
    defaultHidden: true,
  },
  {
    key: "email",
    header: "Email",
    accessor: (m) => m.email,
    defaultHidden: true,
  },
];

const meta: Meta<typeof DataTable<Member>> = {
  title: "Components/DataTable",
  component: DataTable,
  parameters: { layout: "padded", docs: { description: { component: DOCS } } },
};
export default meta;
type Story = StoryObj<typeof DataTable<Member>>;

export const SearchFiltersColumns: Story = {
  name: "Search, filters and columns",
  render: () => (
    <DataTable
      ariaLabel="Members"
      columns={columns}
      rows={members}
      getRowId={(m) => m.id}
      defaultSort={{ key: "name", direction: "asc" }}
      title="Members"
      searchPlaceholder="Search members…"
      storageKey="storybook-members"
      toolbarActions={
        <Button variant="secondary" startIcon={<FileDownloadOutlinedIcon />}>
          Export
        </Button>
      }
    />
  ),
};

export const WithFiltersApplied: Story = {
  name: "With filters already applied",
  render: () => {
    const [filters, setFilters] = useState<FilterState>({
      status: "Active",
      program: ["Chronic Care", "Maternal Health"],
    });
    return (
      <DataTable
        ariaLabel="Members"
        columns={columns}
        rows={members}
        getRowId={(m) => m.id}
        filters={filters}
        onFiltersChange={setFilters}
      />
    );
  },
};

export const RequiredFilter: Story = {
  name: "A filter that can never be All (required)",
  render: () => {
    // Each row belongs to one year. The Year filter has no "All" row and starts at the first option, so the table never mixes years.
    const rows = members.flatMap((m) =>
      ["2026", "2025"].map((y) => ({ ...m, id: `${m.id}-${y}`, year: y })),
    );
    const cols: Column<Member & { year: string }>[] = [
      {
        key: "name",
        header: "Member",
        accessor: (m) => m.name,
        sortable: true,
        primary: true,
      },
      {
        key: "year",
        header: "Year",
        accessor: (m) => m.year,
        filter: {
          type: "select",
          required: true,
          options: [
            { value: "2026", label: "2026" },
            { value: "2025", label: "2025" },
          ],
        },
      },
      { key: "status", header: "Status", accessor: (m) => m.status },
    ];
    return (
      <DataTable
        ariaLabel="Members by year"
        columns={cols}
        rows={rows}
        getRowId={(m) => m.id}
      />
    );
  },
};

export const SavedViews: Story = {
  name: "Saved views",
  render: () => (
    <DataTable
      ariaLabel="Members"
      columns={columns}
      rows={members}
      getRowId={(m) => m.id}
      title="Members"
      searchPlaceholder="Search members…"
      savedViews="storybook-members-views"
    />
  ),
};

export const NoToolbar: Story = {
  name: "Bare table (no toolbar)",
  render: () => (
    <DataTable
      ariaLabel="Members"
      columns={columns}
      rows={members}
      getRowId={(m) => m.id}
      toolbar={false}
      pageSize={5}
    />
  ),
};

export const SelectableWithActions: Story = {
  name: "Selectable, row actions, click through",
  render: () => {
    const [selected, setSelected] = useState<string[]>(["M-20483"]);
    return (
      <>
        <p style={{ margin: "0 0 8px", fontSize: 13 }}>
          {selected.length} selected
        </p>
        <DataTable
          ariaLabel="Members"
          columns={columns}
          rows={members}
          getRowId={(m) => m.id}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          onRowClick={() => undefined}
          rowActions={(m) => (
            <RowMenu
              rowLabel={m.name}
              items={[
                { label: "Open", onClick: () => undefined },
                { label: "Assign care manager", onClick: () => undefined },
              ]}
            />
          )}
          pageSize={5}
        />
      </>
    );
  },
};

export const Loading: Story = {
  render: () => (
    <DataTable
      ariaLabel="Members"
      columns={columns}
      rows={[]}
      getRowId={(m) => m.id}
      loading
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <DataTable
      ariaLabel="Members"
      columns={columns}
      rows={[]}
      getRowId={(m) => m.id}
      emptyState={
        <EmptyState
          title="No members yet"
          description="Add your first member to get started."
          action={<Button>Add member</Button>}
        />
      }
    />
  ),
};

export const PhoneCards: Story = {
  name: "On a phone (cards)",
  parameters: { viewport: { defaultViewport: "phone" } },
  render: () => (
    <DataTable
      ariaLabel="Members"
      columns={columns}
      rows={members}
      getRowId={(m) => m.id}
      pageSize={5}
      onRowClick={() => undefined}
    />
  ),
};
