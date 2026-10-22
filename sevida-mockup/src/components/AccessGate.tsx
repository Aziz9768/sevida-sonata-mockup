import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, EmptyState, PageContainer } from "sevida-ui";
import { memberById } from "../data";
import { useRole } from "../roles";

/** What a person sees when their role does not allow a page. Hide, never grey out: the menu already hides it, this covers a typed address. */
export function AccessDenied({ what }: { what?: string }) {
  const { role, home } = useRole();
  const navigate = useNavigate();
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

/** Wraps every page about one member: the role must see lists of members, and this member must be in its scope. */
export function MemberGate({ children }: { children: ReactNode }) {
  const { memberId } = useParams();
  const { canSee, memberLists } = useRole();
  const m = memberById(memberId);
  if (!memberLists) return <AccessDenied what="Member pages" />;
  if (m && !canSee(m)) return <AccessDenied what="This member" />;
  return <>{children}</>;
}
