import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, PageContainer } from "sevida-ui";
import { RowActions } from "../components/RowActions";
import {
  getMemberRowId,
  memberYearRows,
  useMemberTableColumns,
  yearOf,
} from "../components/memberColumns";
import { CURRENT_YEAR } from "../data";
import { useRole } from "../roles";

/** A past year opens the member (or a tab of it) for that year. */
const withYear = (path: string, year: number) =>
  year === CURRENT_YEAR
    ? path
    : `${path}${path.includes("?") ? "&" : "?"}year=${year}`;

export function MembersListPage() {
  const navigate = useNavigate();

  const columns = useMemberTableColumns(undefined, true);
  // How many members match the search and filters, shown at the top so nobody has to scroll to the paging bar.
  const { visible: members } = useRole();
  const [shown, setShown] = useState(members.length);
  // One row per member per measurement year. The Measurement year filter always has a value and starts at the current year.
  const rows = useMemo(() => memberYearRows(members), [members]);

  return (
    <PageContainer
      title={
        shown === members.length
          ? `Members List (${members.length})`
          : `Members List (${shown} of ${members.length})`
      }
    >
      <DataTable
        ariaLabel="Members and their care gaps"
        columns={columns}
        rows={rows}
        getRowId={getMemberRowId}
        defaultSort={{ key: "id", direction: "asc" }}
        searchPlaceholder="Search by member name, member ID or insurance number…"
        searchPlaceholderCompact="Member name, ID, insurance no."
        onResultCountChange={setShown}
        storageKey="demo-members-v30"
        savedViews="members"
        exportFile="members"
        // Column names stay in view while a long page of rows scrolls (FR-405).
        stickyHeader
        maxHeight="calc(100vh - 245px)"
        onRowClick={(m) => navigate(withYear(`/members/${m.id}`, yearOf(m)))}
        rowActions={(m) => (
          <RowActions id={m.id} name={m.name} year={yearOf(m)} />
        )}
      />
    </PageContainer>
  );
}
