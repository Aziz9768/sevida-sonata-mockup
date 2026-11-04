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
import { CURRENT_YEAR, v3Extra } from "../data";
import { useVersion } from "../version";
import { useRole } from "../roles";

/** A past year opens the member (or a tab of it) for that year. */
const withYear = (path: string, year: number) =>
  year === CURRENT_YEAR
    ? path
    : `${path}${path.includes("?") ? "&" : "?"}year=${year}`;

export function MembersListPage() {
  const navigate = useNavigate();

  const { version } = useVersion();
  const v2 = version.id === 2;
  const v3 = version.id >= 3;
  const v8 = version.id >= 8;
  const columns = useMemberTableColumns(undefined, true, version.id);
  // How many members match the search and filters, shown at the top so nobody has to scroll to the paging bar.
  const { visible: members, canSee } = useRole();
  const total = v3 ? members.length + v3Extra.filter(canSee).length : members.length;
  const [shown, setShown] = useState(total);
  // One row per member per measurement year. The Measurement year filter always has a value and starts at the current year.
  // Version 3 has no Measurement year filter: the page is for the current year only (see the line under the title).
  const rows = useMemo(
    () =>
      v3
        ? memberYearRows(
            [...members, ...v3Extra.filter(canSee)],
            [CURRENT_YEAR],
          )
        : memberYearRows(members),
    [members, v3, canSee],
  );

  return (
    <PageContainer
      // LPP-16069: the title is "Members" and the number of members.
      title={
        shown === total
          ? `${v8 ? "Members" : "Members List"} (${total})`
          : `${v8 ? "Members" : "Members List"} (${shown} of ${total})`
      }
      subtitle={
        v3
          ? `All measures are for Measurement Year ${CURRENT_YEAR}`
          : undefined
      }
    >
      <DataTable
        ariaLabel="Members and their care gaps"
        columns={columns}
        rows={rows}
        getRowId={getMemberRowId}
        defaultSort={{ key: v3 ? "name" : "id", direction: "asc" }}
        searchPlaceholder={
          v3
            ? "Search by Member Name or Tricare ID…"
            : v2
            ? "Search by member name, member ID or subscriber ID…"
            : "Search by member name, member ID or insurance number…"
        }
        searchPlaceholderCompact={
          v3
            ? "Member name, Tricare ID"
            : v2 ? "Member name, ID, subscriber ID" : "Member name, ID, insurance no."
        }
        onResultCountChange={setShown}
        noResultsTitle={v8 ? "No members found" : undefined}
        storageKey={
          v8
            ? "demo-members-v30-ver8-a"
            : v3
            ? "demo-members-v30-ver3-a"
            : v2
              ? "demo-members-v30-ver2-d"
              : "demo-members-v30"
        }
        savedViews={v8 ? "members-v8" : v3 ? "members-v3" : v2 ? "members-v2" : "members"}
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
