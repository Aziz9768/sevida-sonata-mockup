import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
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
import { MemberDetailPage } from "./pages/MemberDetailPage";
import { CareGapDetailPage } from "./pages/CareGapDetailPage";
import { MemberMeasurePage } from "./pages/MemberMeasurePage";
import { initialsOf, useAuth } from "./auth";
import { effectiveGroups, samples, useAccess } from "./access";
import { poweredByDark, poweredByLight } from "./brand";
import { RoleProvider, useRole } from "./roles";
import type { NavKey } from "./roles";
import { RolePicker } from "./components/RolePicker";
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
];
/** Which sidebar item is highlighted for the current address. */
function activeKeyFor(pathname: string) {
  const [first] = pathname.split("/").filter(Boolean);
  return first === "measures" ||
    first === "care-gaps" ||
    first === "dashboard" ||
    first === "quicksight" ||
    first === "dashboards"
    ? first
    : "members";
}

const providers = ["Microsoft", "Okta", "Google"];

/** Sign-in screen. Demo account: username admin, password 123. Or pretend to sign in through the partner. */
function LoginRoute() {
  const { user, signedOut, signIn, signInAs } = useAuth();
  const { partnerSignIn, personById } = useAccess();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<string | null>(null);
  const [pick, setPick] = useState(samples[0].id);
  const [problem, setProblem] = useState("");
  if (user) return <Navigate to="/members" replace />;

  const continueAsPartner = () => {
    const sample = samples.find((s) => s.id === pick)!;
    const result = partnerSignIn(sample.payload);
    if (result.blocked) {
      setProblem(
        "Your account has been disabled. Ask your Sonata administrator.",
      );
      return;
    }
    const person = personById(result.personId)!;
    signInAs({
      name: person.name,
      initials: initialsOf(person.name),
      email: person.email,
      personId: person.id,
    });
    navigate("/members", { replace: true });
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
          signedOut
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
          if (!signIn(email, password))
            throw new Error(
              "Username or password is incorrect. Use admin and 123.",
            );
          navigate("/members", { replace: true });
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

function Protected() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { personById } = useAccess();
  const { role, home } = useRole();
  if (!user) return <Navigate to="/login" replace />;
  const me = personById(user.personId ?? "p-admin");
  const signOutNow = () => {
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
      headerContent={<RolePicker />}
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
    </AppShell>
  );
}

export function App() {
  return (
    <RoleProvider>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/*" element={<Protected />} />
      </Routes>
    </RoleProvider>
  );
}
