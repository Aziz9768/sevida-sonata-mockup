import { useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import ViewModuleOutlinedIcon from "@mui/icons-material/ViewModuleOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import AssignmentLateOutlinedIcon from "@mui/icons-material/AssignmentLateOutlined";
import {
  AppShell,
  Button,
  LoginPage,
  Modal,
  NoAccessPage,
  SessionExpiredPage,
  RadioGroupField,
  InfoBanner,
} from "sevida-ui";
import type { NavItem } from "sevida-ui";
import { Typography } from "@mui/material";
import { RouterLinkAdapter } from "./components/RouterLinkAdapter";
import { DashboardPage } from "./pages/DashboardPage";
import { QuickSightDashboardPage } from "./pages/QuickSightDashboardPage";
import { DashboardCardsPage } from "./pages/DashboardCardsPage";
import { MeasureDashboardPage } from "./pages/MeasureDashboardPage";
import { MeasuresPage } from "./pages/MeasuresPage";
import { MeasureDetailPage } from "./pages/MeasureDetailPage";
import { MembersListPage } from "./pages/MembersListPage";
import { CareGapsPage } from "./pages/CareGapsPage";
import { AccessLogPage } from "./pages/AccessLogPage";
import { MemberDetailPage } from "./pages/MemberDetailPage";
import { CareGapDetailPage } from "./pages/CareGapDetailPage";
import { MemberMeasurePage } from "./pages/MemberMeasurePage";
import { initialsOf, useAuth } from "./auth";
import { effectiveGroups, groupName, samples, useAccess } from "./access";
import { poweredByDark, poweredByLight } from "./brand";
import { RoleProvider, useRole } from "./roles";
import type { NavKey } from "./roles";
import { RolePicker } from "./components/RolePicker";
import { RunLine } from "./components/RunBits";
import { RunKeyed, RunProvider } from "./runs";
import { AuditProvider, useAudit, useWho } from "./auditLog";
import { IdleWatcher, clearReturnPath, readReturnPath } from "./session";
import { MemberGate, MenuGate } from "./components/AccessGate";

const baseNav: NavItem[] = [
  {
    key: "quicksight",
    label: "Quality measure analytics",
    icon: <InsightsOutlinedIcon />,
    href: "/quicksight",
  },
  {
    key: "dashboards",
    label: "Analytics option 2",
    icon: <ViewModuleOutlinedIcon />,
    href: "/dashboards",
  },
  {
    key: "members",
    label: "Members",
    icon: <PeopleAltOutlinedIcon />,
    href: "/members",
  },
  {
    key: "care-gaps",
    label: "Care gaps",
    icon: <AssignmentLateOutlinedIcon />,
    href: "/care-gaps",
  },
  {
    key: "measures",
    label: "Quality measures",
    icon: <FactCheckOutlinedIcon />,
    href: "/measures",
  },
  {
    key: "access-log",
    label: "Access log",
    icon: <ManageSearchOutlinedIcon />,
    href: "/access-log",
  },
];
/** Which sidebar item is highlighted for the current address. */
function activeKeyFor(pathname: string) {
  const [first] = pathname.split("/").filter(Boolean);
  return first === "measures" ||
    first === "care-gaps" ||
    first === "dashboard" ||
    first === "quicksight" ||
    first === "access-log" ||
    first === "dashboards"
    ? first
    : "members";
}

const providers = ["Microsoft", "Okta", "Google"];

/** Sign-in screen. Demo account: username admin, password 123. Or pretend to sign in through the partner. */
function LoginRoute() {
  const { user, signedOut, signIn, signInAs } = useAuth();
  const { partnerSignIn, personById } = useAccess();
  const { logSignIn } = useAudit();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<string | null>(null);
  const [pick, setPick] = useState(samples[0].id);
  const [problem, setProblem] = useState("");
  if (user) return <Navigate to={readReturnPath() ?? "/"} replace />;
  const expiredFrom = readReturnPath();
  const arrive = () => navigate(readReturnPath() ?? "/", { replace: true });

  const continueAsPartner = () => {
    const sample = samples.find((s) => s.id === pick)!;
    const result = partnerSignIn(sample.payload);
    if (result.blocked) {
      logSignIn(
        { user: sample.payload.name, role: "–" },
        "Sign-in failed",
        "Failed",
        "Person is disabled in Sonata",
      );
      setProblem(
        "Your account has been disabled. Ask your Sonata administrator.",
      );
      return;
    }
    const person = personById(result.personId)!;
    const groupsNow = effectiveGroups(person);
    logSignIn(
      {
        user: person.name,
        role: groupsNow.length ? groupName(groupsNow[0]) : "No access yet",
      },
      "Signed in",
      "Success",
      `Through ${provider ?? "the partner login"}${result.isNew ? " (first sign-in)" : ""}`,
    );
    signInAs({
      name: person.name,
      initials: initialsOf(person.name),
      email: person.email,
      personId: person.id,
    });
    arrive();
  };

  return (
    <>
      <LoginPage
        appName="Sonata"
        identifier="username"
        subtitle="Demo account: username admin, password 123."
        poweredBy={poweredByLight}
        showRememberMe={false}
        notice={
          expiredFrom
            ? {
                tone: "warning",
                text: "Your session expired. Sign in to go back to where you were.",
              }
            : signedOut
              ? { tone: "success", text: "You have been signed out." }
              : undefined
        }
        ssoSlot={providers.map((p) => (
          <Button
            key={p}
            variant="secondary"
            fullWidth
            size="large"
            onClick={() => {
              setProvider(p);
              setProblem("");
            }}
          >
            Continue with {p}
          </Button>
        ))}
        onSubmit={({ email, password }) => {
          if (!signIn(email, password)) {
            logSignIn(
              { user: email.trim() || "(blank)", role: "–" },
              "Sign-in failed",
              "Failed",
              "Wrong username or password",
            );
            throw new Error(
              "Username or password is incorrect. Use admin and 123.",
            );
          }
          logSignIn(
            { user: "Admin", role: "Administrator" },
            "Signed in",
            "Success",
            "Username and password",
          );
          arrive();
        }}
      />
      <Modal
        open={!!provider}
        onClose={() => setProvider(null)}
        title={`Continue with ${provider ?? ""} (demo)`}
        size="md"
        actions={
          <>
            <Button variant="secondary" onClick={() => setProvider(null)}>
              Cancel
            </Button>
            <Button onClick={continueAsPartner}>Continue</Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 16 }}>
          <InfoBanner tone="info">
            In real life {provider} would ask for the person&apos;s work
            password, then tell Sonata who they are, their groups and their
            company code. Here, choose who the partner says you are.
          </InfoBanner>
          {problem && <InfoBanner tone="danger">{problem}</InfoBanner>}
          <RadioGroupField
            label="Sign in as"
            value={pick}
            onChange={(v) => {
              setPick(v);
              setProblem("");
            }}
            options={samples.map((s) => ({ value: s.id, label: s.label }))}
          />
          <span style={{ fontSize: ".875rem" }}>
            {samples.find((s) => s.id === pick)!.what}
          </span>
        </div>
      </Modal>
    </>
  );
}

/** Where an idle session ends up (FR-307). "Sign in again" goes to the sign-in page, which sends the person back to the page they were on. */
function SessionExpiredRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  if (user) return <Navigate to="/" replace />;
  return (
    <SessionExpiredPage
      appName="Sonata"
      poweredBy={poweredByLight}
      onSignIn={() => navigate("/login", { replace: true })}
    />
  );
}

function Protected() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { personById } = useAccess();
  const { role, home } = useRole();
  const { logSignIn } = useAudit();
  const who = useWho();
  // Once signed in again the saved page has done its job.
  useEffect(() => {
    if (user) clearReturnPath();
  }, [user]);
  // An expired session (a return path is saved) ends on the Session Expired page, a normal sign-out on the sign-in page.
  if (!user)
    return (
      <Navigate
        to={readReturnPath() ? "/session-expired" : "/login"}
        replace
      />
    );
  const me = personById(user.personId ?? "p-admin");
  const signOutNow = () => {
    logSignIn(who, "Signed out", "Success", "Chose Sign out");
    signOut();
    navigate("/login", { replace: true });
  };
  // Signed in through the partner, but nothing gives this person access yet (or an administrator turned them off).
  if (!me || effectiveGroups(me).length === 0) {
    return (
      <NoAccessPage
        contactText="your Sonata administrator"
        onSignOut={signOutNow}
      />
    );
  }
  return (
    <AppShell
      items={baseNav.filter((i) => role.menus.includes(i.key as NavKey))}
      activeKey={activeKeyFor(pathname)}
      headerContent={
        <>
          <RunLine />
          <RolePicker />
        </>
      }
      brandName="Sevida"
      // Name only, no mark: the sidebar shows plain "Sevida" (and nothing when it is collapsed).
      logo={
        <Typography
          component="span"
          noWrap
          sx={{
            fontSize: "1.0625rem",
            fontWeight: 700,
            letterSpacing: ".01em",
            color: "onPrimary.text",
          }}
        >
          Sevida
        </Typography>
      }
      logoCollapsed={<span />}
      linkComponent={RouterLinkAdapter}
      user={{
        name: role.person ?? user.name,
        subtitle: role.label,
        initials: role.person ? initialsOf(role.person) : user.initials,
      }}
      poweredBy={poweredByDark}
      onSignOut={signOutNow}
    >
      <IdleWatcher />
      <RunKeyed>
      <Routes>
        <Route path="/" element={<Navigate to={home} replace />} />
        <Route
          path="/dashboard"
          element={
            <MenuGate path="/dashboard">
              <DashboardPage />
            </MenuGate>
          }
        />
        <Route
          path="/quicksight"
          element={
            <MenuGate path="/quicksight">
              <QuickSightDashboardPage />
            </MenuGate>
          }
        />
        <Route
          path="/dashboards"
          element={
            <MenuGate path="/dashboards">
              <DashboardCardsPage />
            </MenuGate>
          }
        />
        <Route
          path="/dashboard/:code"
          element={
            <MenuGate path="/dashboard">
              <MeasureDashboardPage />
            </MenuGate>
          }
        />
        <Route
          path="/measures"
          element={
            <MenuGate path="/measures">
              <MeasuresPage />
            </MenuGate>
          }
        />
        <Route
          path="/measures/:code"
          element={
            <MenuGate path="/measures">
              <MeasureDetailPage />
            </MenuGate>
          }
        />
        <Route
          path="/care-gaps"
          element={
            <MenuGate path="/care-gaps">
              <CareGapsPage />
            </MenuGate>
          }
        />
        <Route
          path="/access-log"
          element={
            <MenuGate path="/access-log">
              <AccessLogPage />
            </MenuGate>
          }
        />
        <Route
          path="/members"
          element={
            <MenuGate path="/members">
              <MembersListPage />
            </MenuGate>
          }
        />
        <Route
          path="/members/:memberId"
          element={
            <MemberGate>
              <MemberDetailPage />
            </MemberGate>
          }
        />
        <Route
          path="/members/:memberId/gaps/:code"
          element={
            <MemberGate>
              <CareGapDetailPage />
            </MemberGate>
          }
        />
        <Route
          path="/members/:memberId/measures/:code"
          element={
            <MemberGate>
              <MemberMeasurePage />
            </MemberGate>
          }
        />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
      </RunKeyed>
    </AppShell>
  );
}

export function App() {
  return (
    <AuditProvider>
      <RoleProvider>
        <RunProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/session-expired" element={<SessionExpiredRoute />} />
            <Route path="/*" element={<Protected />} />
          </Routes>
        </RunProvider>
      </RoleProvider>
    </AuditProvider>
  );
}
