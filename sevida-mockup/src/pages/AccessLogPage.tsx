import { useMemo, useState } from "react";
import { PageContainer, DataTable, StatusChip, Tabs } from "sevida-ui";
import type { Column, StatusTone } from "sevida-ui";
import { fmtDateTime } from "../data";
import { useAudit } from "../auditLog";
import type { MemberAccessEntry, SignInEntry } from "../auditLog";
import { TableLink } from "../components/TableLink";

const tone: Record<string, StatusTone> = {
  Success: "success",
  Allowed: "success",
  Failed: "danger",
  Denied: "danger",
};
const opts = (xs: string[]) =>
  [...new Set(xs)]
    .sort((a, b) => a.localeCompare(b))
    .map((v) => ({ value: v, label: v }));

/** Administrators only. Read only: nobody can edit or delete a row (FR-306, 308, NFR-06). */
export function AccessLogPage() {
  const { state } = useAudit();
  const [tab, setTab] = useState<"sign-ins" | "members">("sign-ins");
  const { signIns, memberAccess } = state;

  const signInCols = useMemo<Column<SignInEntry>[]>(
    () => [
      {
        key: "at",
        header: "When",
        accessor: (r) => r.at,
        render: (r) => fmtDateTime(new Date(r.at)),
        sortable: true,
        nowrap: true,
        primary: true,
        filter: { type: "dateRange" },
        filterAccessor: (r) => new Date(r.at),
      },
      {
        key: "user",
        header: "User",
        accessor: (r) => r.user,
        sortable: true,
        filter: { type: "multiselect", options: opts(signIns.map((r) => r.user)) },
      },
      {
        key: "role",
        header: "Role",
        accessor: (r) => r.role,
        sortable: true,
        filter: { type: "multiselect", options: opts(signIns.map((r) => r.role)) },
      },
      {
        key: "event",
        header: "Event",
        accessor: (r) => r.event,
        sortable: true,
        filter: { type: "multiselect", options: opts(signIns.map((r) => r.event)) },
      },
      {
        key: "outcome",
        header: "Outcome",
        accessor: (r) => r.outcome,
        render: (r) => <StatusChip label={r.outcome} tone={tone[r.outcome]} />,
        sortable: true,
        filter: { type: "multiselect", options: opts(signIns.map((r) => r.outcome)) },
      },
      { key: "detail", header: "Details", accessor: (r) => r.detail },
    ],
    [signIns],
  );

  const memberCols = useMemo<Column<MemberAccessEntry>[]>(
    () => [
      {
        key: "at",
        header: "When",
        accessor: (r) => r.at,
        render: (r) => fmtDateTime(new Date(r.at)),
        sortable: true,
        nowrap: true,
        primary: true,
        filter: { type: "dateRange" },
        filterAccessor: (r) => new Date(r.at),
      },
      {
        key: "user",
        header: "User",
        accessor: (r) => r.user,
        sortable: true,
        filter: { type: "multiselect", options: opts(memberAccess.map((r) => r.user)) },
      },
      {
        key: "role",
        header: "Role",
        accessor: (r) => r.role,
        sortable: true,
        filter: { type: "multiselect", options: opts(memberAccess.map((r) => r.role)) },
      },
      {
        key: "member",
        header: "Member",
        accessor: (r) => `${r.memberId} ${r.memberName}`,
        render: (r) => (
          <TableLink to={`/members/${r.memberId}`}>
            {r.memberName} ({r.memberId})
          </TableLink>
        ),
        sortable: true,
        filter: { type: "text" },
        help: "Type a member's name or ID to see everyone who opened that record.",
      },
      {
        key: "screen",
        header: "Screen",
        accessor: (r) => r.screen,
        sortable: true,
        filter: { type: "multiselect", options: opts(memberAccess.map((r) => r.screen)) },
      },
      {
        key: "outcome",
        header: "Outcome",
        accessor: (r) => r.outcome,
        render: (r) => <StatusChip label={r.outcome} tone={tone[r.outcome]} />,
        sortable: true,
        filter: { type: "multiselect", options: opts(memberAccess.map((r) => r.outcome)) },
      },
    ],
    [memberAccess],
  );

  return (
    <PageContainer
      title="Access log"
      subtitle="Who signed in or was turned away, and which member records were opened. Read only, kept for audit."
    >
      <Tabs
        ariaLabel="Access log"
        value={tab}
        onChange={(v) => setTab(v as "sign-ins" | "members")}
        items={[
          { key: "sign-ins", label: "Sign-ins and denials", count: signIns.length },
          { key: "members", label: "Member access", count: memberAccess.length },
        ]}
      />
      {tab === "sign-ins" ? (
        <DataTable
          key="sign-ins"
          ariaLabel="Sign-ins and denials"
          columns={signInCols}
          rows={signIns}
          getRowId={(r) => r.id}
          defaultSort={{ key: "at", direction: "desc" }}
          searchPlaceholder="Search user or details…"
          exportFile="access-log-sign-ins"
          storageKey="demo-access-log-signins-v1"
        />
      ) : (
        <DataTable
          key="members"
          ariaLabel="Member access"
          columns={memberCols}
          rows={memberAccess}
          getRowId={(r) => r.id}
          defaultSort={{ key: "at", direction: "desc" }}
          searchPlaceholder="Search user or member…"
          exportFile="access-log-member-access"
          storageKey="demo-access-log-members-v1"
        />
      )}
    </PageContainer>
  );
}

export default AccessLogPage;
