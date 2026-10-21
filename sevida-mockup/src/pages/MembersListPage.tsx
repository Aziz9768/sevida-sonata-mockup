import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, PageContainer } from "sevida-ui";
import { RowActions } from "../components/RowActions";
import {
  getMemberRowId,
  memberYearRows,
  useMemberTableColumns,
  yearOf,
} from "../components/memberColumns";
import { CURRENT_YEAR, members } from "../data";

/** A past year opens the member (or a tab of it) for that year. */
const withYear = (path: string, year: number) =>
  year === CURRENT_YEAR
    ? path
    : `${path}${path.includes("?") ? "&" : "?"}year=${year}`;

export function MembersListPage() {
  const navigate = useNavigate();

  const columns = useMemberTableColumns(undefined, true);
  // One row per member per measurement year. The Measurement year filter always has a value and starts at the current year.
  const rows = useMemo(() => memberYearRows(members), []);

  return (
    <PageContainer title={`Members (${members.length})`}>
      <DataTable
        ariaLabel="Members and their care gaps"
        columns={columns}
        rows={rows}
        getRowId={getMemberRowId}
        defaultSort={{ key: "id", direction: "asc" }}
        searchPlaceholder="Search by name or ID…"
        storageKey="demo-members-v25"
        savedViews="members"
        exportFile="members"
        onRowClick={(m) => navigate(withYear(`/members/${m.id}`, yearOf(m)))}
        rowActions={(m) => (
          <RowActions id={m.id} name={m.name} year={yearOf(m)} />
        )}
      />
    </PageContainer>
  );
}
