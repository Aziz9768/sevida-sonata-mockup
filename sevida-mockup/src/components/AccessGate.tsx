import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, EmptyState, PageContainer } from "sevida-ui";
import { memberById } from "../data";
import { useRole } from "../roles";
import { useAudit, useWho } from "../auditLog";
import type { MemberScreen } from "../auditLog";

/** What a person sees when their role does not allow a page. Hide, never grey out: the menu already hides it, this covers a typed address. */
export function AccessDenied({ what }: { what?: string }) {
  const { role, home } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logSignIn } = useAudit();
  const who = useWho();
  const last = useRef("");
  // Every refusal goes in the access log (FR-306).
  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    logSignIn(who, "Access denied", "Denied", `Tried to open ${pathname}`);
  }, [pathname, who, logSignIn]);
  return (
    <PageContainer title="You do not have access">
      <EmptyState
        title="Your role cannot open this page"
        description={`${what ?? "This page"} is not part of the ${role.label} role. If you think it should be, ask your administrator.`}
        action={
          <Button variant="secondary" onClick={() => navigate(home)}>
            Go to my home page
          </Button>
        }
      />
    </PageContainer>
  );
}

/** Wraps a page that belongs behind one sidebar menu. */
export function MenuGate({
  path,
  children,
}: {
  path: string;
  children: ReactNode;
}) {
  const { canOpen } = useRole();
  return canOpen(path) ? <>{children}</> : <AccessDenied />;
}

const screenOf = (pathname: string): MemberScreen =>
  pathname.includes("/gaps/")
    ? "Care gap page"
    : pathname.includes("/measures/")
      ? "Measure result page"
      : "Member page";

/** Wraps every page about one member: the role must see lists of members, and this member must be in its scope. Every open, allowed or not, goes in the access log (FR-308). */
export function MemberGate({ children }: { children: ReactNode }) {
  const { memberId } = useParams();
  const { pathname } = useLocation();
  const { canSee, memberLists } = useRole();
  const { logMember } = useAudit();
  const who = useWho();
  const m = memberById(memberId);
  const denied = !memberLists || (!!m && !canSee(m));
  const last = useRef("");
  useEffect(() => {
    if (!m || last.current === pathname) return;
    last.current = pathname;
    logMember(who, m.id, screenOf(pathname), denied ? "Denied" : "Allowed");
  }, [m, pathname, denied, who, logMember]);
  if (!memberLists) return <AccessDenied what="Member pages" />;
  if (m && !canSee(m)) return <AccessDenied what="This member" />;
  return <>{children}</>;
}
