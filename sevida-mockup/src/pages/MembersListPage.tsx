import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
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
  // Version 11: LPP-16069 as updated and Mansi's selector standard (table order, search box), search on Enter, Apply before Clear.
  const v11 = version.id >= 11;
  const v12 = version.id >= 12;
  // Version 16 (LPP-16069): title "Members List", opens sorted by # Open Gaps (most first, then name A to Z), Clear Selections in the Columns panel.
  const v16 = version.id >= 16;
  const columns = useMemberTableColumns(undefined, true, version.id);
  // How many members match the search and filters, shown at the top so nobody has to scroll to the paging bar.
  const { visible: members, canSee } = useRole();
  // `members` already holds the Version 12 extra members (see roles.tsx).
  const total = v3 ? members.length + v3Extra.filter(canSee).length : members.length;
  const [shown, setShown] = useState(total);
  // One row per member per measurement year. The Measurement year filter always has a value and starts at the current year.
  // Version 3 has no Measurement year filter: the page is for the current year only (see the line under the title).
  const rows = useMemo(() => {
    const r = v3
      ? memberYearRows([...members, ...v3Extra.filter(canSee)], [CURRENT_YEAR])
      : memberYearRows(members);
    // Version 16: members with the same number of open gaps stay in name order (A to Z).
    return v16 ? [...r].sort((a, b) => a.name.localeCompare(b.name)) : r;
  }, [members, v3, v16, canSee]);

  return (
    <PageContainer
      breadcrumbs={v11 ? [{ label: "Members" }] : undefined}
      titleIcon={v11 ? <PeopleAltOutlinedIcon /> : undefined}
      // LPP-16069: the title is "Members" and the number of members.
      title={
        shown === total
          ? `${v8 && !v16 ? "Members" : "Members List"} (${total})`
          : `${v8 && !v16 ? "Members" : "Members List"} (${shown} of ${total})`
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
        defaultSort={v16 ? { key: "openCount", direction: "desc" } : { key: v3 ? "name" : "id", direction: "asc" }}
        searchOnEnter={v11}
        applyFirst={v11}
        columnsPanel={v11 ? { tableOrder: true, search: true, clearSelections: v16 } : undefined}
        searchPlaceholder={
          v16
            ? "Search by Member Name or Member ID"
            : v11
            ? "Search by Member Name or Tricare ID"
            : v3
            ? "Search by Member Name or Tricare ID…"
            : v2
            ? "Search by member name, member ID or subscriber ID…"
            : "Search by member name, member ID or insurance number…"
        }
        searchPlaceholderCompact={
          v16
            ? "Member name, Member ID"
            : v3
            ? "Member name, Tricare ID"
            : v2 ? "Member name, ID, subscriber ID" : "Member name, ID, insurance no."
        }
        onResultCountChange={setShown}
        noResultsTitle={v8 ? "No members found" : undefined}
        storageKey={
          v16
            ? "demo-members-v30-ver16-a"
            : v12
            ? "demo-members-v30-ver12-a"
            : v11
            ? "demo-members-v30-ver11-a"
            : v8
            ? "demo-members-v30-ver8-a"
            : v3
            ? "demo-members-v30-ver3-a"
            : v2
              ? "demo-members-v30-ver2-d"
              : "demo-members-v30"
        }
        savedViewsKeepPageSize={v16}
        savedViews={v16 ? "members-v16" : v12 ? "members-v12" : v11 ? "members-v11" : v8 ? "members-v8" : v3 ? "members-v3" : v2 ? "members-v2" : "members"}
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
