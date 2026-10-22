import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Button, DataTable, EmptyState, InfoBanner } from "sevida-ui";
import type { FilterState } from "sevida-ui";
import { RowActions } from "../RowActions";
import {
  getMemberRowId,
  memberYearRows,
  useMemberTableColumns,
  yearOf,
} from "../memberColumns";
import { CURRENT_YEAR, resultsFor } from "../../data";
import type { MemberView } from "./KpiBlocks";
import type { Member, MeasureCode } from "../../data";

/** The members behind the numbers: everyone in the initial population for the filters. Same table and columns as the Members list. */
export function MembersCard({
  code,
  list,
  year,
  view,
  onView,
}: {
  code: MeasureCode;
  list: Member[];
  year: number;
  /** Only Met or only Not met members, picked by clicking a card above. */
  view: MemberView;
  onView: (v: MemberView) => void;
}) {
  const navigate = useNavigate();
  const columns = useMemberTableColumns(code);
  const [filters, setFilters] = useState<FilterState>({});
  const shown = useMemo(
    () =>
      view
        ? list.filter((m) => resultsFor(m, year)[code].state === view)
        : list,
    [list, view, year, code],
  );
  const rows = useMemo(() => memberYearRows(shown, [year]), [shown, year]);
  return (
    <Box id="dashboard-members" sx={{ scrollMarginTop: 16 }}>
      {view && (
        <Box sx={{ mb: 1.5 }}>
          <InfoBanner
            tone="info"
            action={
              <Button
                variant="tertiary"
                size="small"
                onClick={() => onView("")}
              >
                Show everyone
              </Button>
            }
          >
            Showing only members who are {view === "Gap" ? "Not met" : "Met"} (
            {shown.length}).
          </InfoBanner>
        </Box>
      )}
      <DataTable
        ariaLabel="Members in the initial population"
        title="List of members in the initial population"
        columns={columns}
        rows={rows}
        filters={filters}
        onFiltersChange={setFilters}
        getRowId={getMemberRowId}
        defaultSort={{ key: "id", direction: "asc" }}
        searchPlaceholder="Search by name or ID…"
        storageKey="demo-dashboard-members-v3"
        exportFile={`${code}-initial-population`}
        onRowClick={(m) =>
          navigate(
            `/members/${m.id}${yearOf(m) === CURRENT_YEAR ? "?tab=gaps" : `?year=${yearOf(m)}`}`,
          )
        }
        rowActions={(m) => (
          <RowActions id={m.id} name={m.name} year={yearOf(m)} />
        )}
        emptyState={
          <EmptyState
            title="No members"
            description="Nobody passes the filters."
          />
        }
      />
    </Box>
  );
}
