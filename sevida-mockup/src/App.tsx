import { Fragment, useEffect, useState } from "react";
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
import { Box, Typography } from "@mui/material";
import { RouterLinkAdapter } from "./components/RouterLinkAdapter";
import { DashboardPage } from "./pages/DashboardPage";
import { QuickSightDashboardPage } from "./pages/QuickSightDashboardPage";
import { NotFoundPageV7 } from "./pages/NotFoundPageV7";
import { measureByCode } from "./data";
import { DashboardCardsPage } from "./pages/DashboardCardsPage";
import { MeasureDashboardPage } from "./pages/MeasureDashboardPage";
import { AnalyticsOverviewPage } from "./pages/AnalyticsOverviewPage";
import { AnalyticsMeasurePage } from "./pages/AnalyticsMeasurePage";
import { AnalyticsOverviewQsPage } from "./pages/AnalyticsOverviewQsPage";
import { AnalyticsMeasureQsPage } from "./pages/AnalyticsMeasureQsPage";
import { GROUPS, dashByCode, dashesIn } from "./analyticsRegistry";
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
import { VersionPicker, VersionProvider, isRedesign, useVersion } from "./version";
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
/** Menu items kept in the code (page, address and access rules still work) but not shown in the sidebar.
 *  To show Quality measures again, remove "measures" from this list. */
const HIDDEN_IN_SIDEBAR: string[] = ["measures"];
/** Also hidden in version 2: the Access Log (no data to show yet) and Analytics Option 2 (only one Analytics entry is kept, and it is relabelled "Analytics"). */
const HIDDEN_IN_SIDEBAR_V2: string[] = ["access-log", "dashboards"];

/** Version 3 sidebar (final sheet, Navigation Menu tab): Analytics (Overview, BCS, CCS, COL, GSD, WCV), Care Gaps, Members. Nothing else. */
const V3_MEASURES: [string, string][] = [
  ["BCS", "BCS - Breast Cancer Screening"],
  ["CCS", "CCS - Cervical Cancer Screening"],
  ["COL", "COL - Colorectal Cancer Screening"],
  ["GSD", "GSD · Glycemic Status Assessment for Patients With Diabetes"],
  ["WCV", "WCV · Child and Adolescent Well-Care Visits"],
];
function v3Nav(menus: NavKey[]): NavItem[] {
  const out: NavItem[] = [];
  if (menus.includes("quicksight") || menus.includes("dashboards"))
    out.push({
      key: "analytics",
      label: "Analytics",
      icon: <InsightsOutlinedIcon />,
      children: [
        { key: "analytics-overview", label: "Overview", href: "/dashboards" },
        ...V3_MEASURES.map(([code, label]) => ({
          key: `analytics-${code}`,
          label,
          href: `/quicksight?m=${code}`,
        })),
      ],
    });
  if (menus.includes("care-gaps"))
    out.push({
      key: "care-gaps",
      label: "Care Gaps",
      icon: <AssignmentLateOutlinedIcon />,
      href: "/care-gaps",
    });
  if (menus.includes("members"))
    out.push({
      key: "members",
      label: "Members",
      icon: <PeopleAltOutlinedIcon />,
      href: "/members",
    });
  return out;
}

/** Version 5 sidebar: Analytics (Overview, then one entry per group; the dashboards of a group are tabs inside it), Care Gaps, Members. Drawn from the dashboard list, so a new group shows up here by itself. */
function v5Nav(menus: NavKey[]): NavItem[] {
  const out = v3Nav(menus).filter((i) => i.key !== "analytics");
  if (menus.includes("quicksight") || menus.includes("dashboards"))
    out.unshift({
      key: "analytics",
      label: "Analytics",
      icon: <InsightsOutlinedIcon />,
      children: [
        { key: "analytics-overview", label: "Overview", href: "/analytics" },
        ...GROUPS.map((g) => ({
          key: `analytics-group-${g.id}`,
          label: g.name,
          href: `/analytics/${dashesIn(g.id)[0].code}`,
        })),
      ],
    });
  return out;
}

/** Version 5: the old Analytics addresses go to the new pages. */
function V5Redirect({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

/** Which sidebar item is highlighted for the current address. */
function activeKeyFor(pathname: string, search = "", versionId = 2) {
  const [first] = pathname.split("/").filter(Boolean);
  if (isRedesign(versionId) && first === "analytics") {
    const d = dashByCode(pathname.split("/")[2]);
    return d ? `analytics-group-${d.group}` : "analytics-overview";
  }
  if (versionId >= 3) {
    if (first === "dashboards") return "analytics-overview";
    if (first === "quicksight")
      return `analytics-${new URLSearchParams(search).get("m") ?? "BCS"}`;
    if (first === "dashboard") return `analytics-${pathname.split("/")[2] ?? "BCS"}`;
    return first === "care-gaps" ? "care-gaps" : "members";
  }
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
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { personById } = useAccess();
  const { role, home } = useRole();
  const { version } = useVersion();
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
      defaultCollapsed
      items={isRedesign(version.id) ? v5Nav(role.menus) : version.id >= 3 ? v3Nav(role.menus) : baseNav
        .filter(
          (i) =>
            role.menus.includes(i.key as NavKey) &&
            !HIDDEN_IN_SIDEBAR.includes(i.key) &&
            !(version.id === 2 && HIDDEN_IN_SIDEBAR_V2.includes(i.key)),
        )
        .map((i) =>
          version.id === 2 && i.key === "quicksight"
            ? { ...i, label: "Analytics" }
            : i,
        )}
      activeKey={activeKeyFor(pathname, search, version.id)}
      headerContent={
        <>
          <RunLine />
          <VersionPicker />
          <RolePicker />
        </>
      }
      brandName="Sevida"
      // Name only, no mark: the sidebar shows plain "Sevida" (a small "S" mark when it is collapsed).
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
      logoCollapsed={
        <Box
          role="img"
          aria-label="Sevida"
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            display: "grid",
            placeItems: "center",
            bgcolor: "onPrimary.accent",
            color: "primary.dark",
            fontWeight: 900,
            fontSize: "1.0625rem",
            lineHeight: 1,
          }}
        >
          S
        </Box>
      }
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
      <Fragment key={`version-${version.id}`}>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={
                // Version 7: the app opens on Analytics (the Overview) for anyone who can see it.
                version.id >= 7 &&
                (role.menus.includes("dashboards") || role.menus.includes("quicksight"))
                  ? "/dashboards"
                  : version.id >= 3 && role.menus.includes("care-gaps")
                    ? "/care-gaps"
                    : home
              }
              replace
            />
          }
        />
        <Route
          path="/analytics"
          element={
            <MenuGate path="/analytics">
              {version.id === 7 ? <Navigate to="/dashboards" replace /> : version.id >= 6 ? <AnalyticsOverviewQsPage /> : <AnalyticsOverviewPage />}
            </MenuGate>
          }
        />
        <Route
          path="/analytics/:code"
          element={
            <MenuGate path="/analytics">
              {version.id === 7 ? <Navigate to="/dashboards" replace /> : version.id >= 6 ? <AnalyticsMeasureQsPage /> : <AnalyticsMeasurePage />}
            </MenuGate>
          }
        />
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
            isRedesign(version.id) ? (
              <V5Redirect
                to={(() => {
                  const m = new URLSearchParams(search).get("m");
                  return m ? `/analytics/${m.toLowerCase()}` : "/analytics";
                })()}
              />
            ) : (
              <MenuGate path="/quicksight">
                {version.id >= 7 &&
                new URLSearchParams(search).get("m") !== null &&
                !measureByCode(new URLSearchParams(search).get("m") ?? "") ? (
                  <NotFoundPageV7
                    what={`There is no dashboard called "${new URLSearchParams(search).get("m")}"`}
                  />
                ) : (
                  <QuickSightDashboardPage />
                )}
              </MenuGate>
            )
          }
        />
        <Route
          path="/dashboards"
          element={
            isRedesign(version.id) ? (
              <V5Redirect to="/analytics" />
            ) : (
              <MenuGate path="/dashboards">
                <DashboardCardsPage />
              </MenuGate>
            )
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
        <Route path="*" element={version.id >= 7 ? <NotFoundPageV7 /> : <Navigate to={home} replace />} />
      </Routes>
      </Fragment>
      </RunKeyed>
    </AppShell>
  );
}

export function App() {
  return (
    <AuditProvider>
      <VersionProvider>
      <RoleProvider>
        <RunProvider>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/session-expired" element={<SessionExpiredRoute />} />
            <Route path="/*" element={<Protected />} />
          </Routes>
        </RunProvider>
      </RoleProvider>
      </VersionProvider>
    </AuditProvider>
  );
}
