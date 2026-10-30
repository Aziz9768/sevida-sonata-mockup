import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Box, Stack, Typography } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { Button, Modal, StatusChip } from "sevida-ui";
import type { StatusTone } from "sevida-ui";
import { SMALL_N, STATUS_WORDS } from "../../analyticsRegistry";
import type { DashDef, Status } from "../../analyticsRegistry";

/** Every page sets its own browser tab title, for example "CCS - Cervical Cancer Screening, Analytics, Sevida". */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const before = document.title;
    document.title = `${title}, Sevida`;
    return () => {
      document.title = before;
    };
  }, [title]);
}

/** A short pause with a skeleton on screen, like the real embed which takes a few seconds to draw. The key restarts it. */
export function useFakeLoad(key: string, ms = 700) {
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setDone(key), ms);
    return () => window.clearTimeout(t);
  }, [key, ms]);
  return done !== key;
}

/* ---------------------------------------------------------------- build notes (a review layer, not part of the product) */

const NOTES_KEY = "sevida-mockup-build-notes";
/** Review notes that tag each part of the page: does it work with the QuickSight embed, or does Sonata have to build it? */
export function useBuildNotes(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => {
    try {
      return sessionStorage.getItem(NOTES_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const set = (v: boolean) => {
    setOn(v);
    try {
      sessionStorage.setItem(NOTES_KEY, v ? "on" : "off");
    } catch {
      /* ignore */
    }
  };
  return [on, set];
}

export function BuildNotesToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Button variant="tertiary" onClick={() => onChange(!on)} aria-pressed={on}>
      {on ? "Hide build notes" : "Show build notes"}
    </Button>
  );
}

export type Effort = "embed" | "custom";
const EFFORT: Record<Effort, { label: string; tone: StatusTone; tip: string }> = {
  embed: {
    label: "Works with the embed",
    tone: "info",
    tip: "QuickSight can draw this itself (charts, tiles, a table). The team only builds the dashboard in QuickSight.",
  },
  custom: {
    label: "Needs custom build",
    tone: "primary",
    tip: "This sits outside the QuickSight iframe, so Sonata builds it. It reads the same data through an API.",
  },
};
/** A small tag on a section: how it would be built. Hidden when build notes are off. */
export function EffortTag({
  on,
  kind,
  note,
}: {
  on: boolean;
  kind: Effort;
  note: string;
}) {
  if (!on) return null;
  const e = EFFORT[kind];
  return <StatusChip label={e.label} tone={e.tone} tip={`${e.tip} ${note}`} />;
}

/* ---------------------------------------------------------------- small pieces */

const STATUS_VIEW: Record<Status, { tone: StatusTone; icon: ReactElement }> = {
  meets: { tone: "success", icon: <CheckCircleOutlineIcon /> },
  near: { tone: "warning", icon: <WarningAmberOutlinedIcon /> },
  misses: { tone: "danger", icon: <CancelOutlinedIcon /> },
};
/** Status as a word AND an icon, never colour alone. */
export function StatusPill({ status }: { status: Status }) {
  const v = STATUS_VIEW[status];
  return <StatusChip tone={v.tone} icon={v.icon} label={STATUS_WORDS[status]} />;
}

/** "Higher is better" or "Lower is better", with an arrow. */
export function DirectionLabel({ def }: { def: DashDef }) {
  const Icon = def.higherIsBetter ? ArrowUpwardIcon : ArrowDownwardIcon;
  return (
    <Stack
      component="span"
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{ display: "inline-flex", fontSize: ".8125rem", color: "text.secondary" }}
    >
      <Icon sx={{ fontSize: 16 }} aria-hidden />
      <span>{def.higherIsBetter ? "Higher is better" : "Lower is better"}</span>
    </Stack>
  );
}

/** "Up 2.1 points, better" in words with an arrow. Nothing depends on colour. */
export function ChangeText({
  change,
  better,
  suffix = "",
}: {
  change: number;
  better: boolean | null;
  /** Text after the words, for example " since 2025". */
  suffix?: string;
}) {
  if (better === null)
    return <span>No change{suffix}</span>;
  const Icon = change > 0 ? ArrowUpwardIcon : ArrowDownwardIcon;
  return (
    <Stack
      component="span"
      direction="row"
      alignItems="center"
      spacing={0.5}
      sx={{ display: "inline-flex" }}
    >
      <Icon sx={{ fontSize: 16 }} aria-hidden />
      <span>
        {change > 0 ? "Up" : "Down"} {Math.abs(change).toFixed(1)} pts,{" "}
        {better ? "better" : "worse"}
        {suffix}
      </span>
    </Stack>
  );
}

/* ---------------------------------------------------------------- help: one place, plain words first, the HEDIS term second */

export interface Term {
  term: string;
  plain: string;
  hedis?: string;
}
export const GLOSSARY: Record<string, Term> = {
  eligible: {
    term: "Eligible members (n)",
    plain:
      "The members who belong in this measure for the year: the right age and enrolled long enough, and not left out.",
    hedis: "HEDIS calls them the Initial Population, or the Total Eligible Population.",
  },
  met: {
    term: "Met",
    plain: "Members who have already had the test, visit or result the measure asks for.",
    hedis: "HEDIS: Numerator compliant.",
  },
  notMet: {
    term: "Not met",
    plain: "Members who have not had it yet. Each one is an open care gap you can act on.",
    hedis: "HEDIS: Numerator non-compliant.",
  },
  excluded: {
    term: "Excluded",
    plain:
      "Members left out on purpose, for example someone in hospice. They are not in the percentage.",
    hedis: "HEDIS: Excluded Population (required or optional exclusions).",
  },
  benchmark: {
    term: "Benchmark",
    plain:
      "The goal we compare with. Near means within 5 points of it. The values here are demo values.",
    hedis: "In real life: a national percentile from NCQA or the plan's own target.",
  },
  small: {
    term: "Small group",
    plain: `A group with fewer than ${SMALL_N} members. One member moves its percentage by many points, so read it with care.`,
  },
  period: {
    term: "Measurement period",
    plain: "The calendar year the numbers are about: January 1 to December 31.",
    hedis: "HEDIS: Measurement Year.",
  },
};
export const tip = (k: keyof typeof GLOSSARY) =>
  `${GLOSSARY[k].plain}${GLOSSARY[k].hedis ? ` ${GLOSSARY[k].hedis}` : ""}`;

/** The one place for help. The (i) icons on the page use the same words (tip). */
export function HelpModal({
  open,
  onClose,
  def,
}: {
  open: boolean;
  onClose: () => void;
  def?: DashDef;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={def ? `How to read ${def.short}` : "How to read Analytics"}
      actions={<Button onClick={onClose}>Close</Button>}
    >
      <Stack spacing={1.75}>
        {def && (
          <Stack spacing={0.25}>
            <Typography sx={{ fontWeight: 700 }}>What this dashboard shows</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              The share of {def.ages} {def.plain}.{" "}
              {def.higherIsBetter ? "A higher number is better." : "A lower number is better."}
            </Typography>
          </Stack>
        )}
        <Stack spacing={0.25}>
          <Typography sx={{ fontWeight: 700 }}>Filters</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            The filters sit in one row under the title and work at once, with no Apply button. They have the same names
            as on the Members and Care Gaps pages. The line under them says which filters are on. Reset puts them back.
            They stay when you switch to another dashboard in the group.
          </Typography>
        </Stack>
        {(["eligible", "met", "notMet", "excluded", "benchmark", "small", "period"] as const).map((k) => (
          <Stack key={k} spacing={0.25}>
            <Typography sx={{ fontWeight: 700 }}>{GLOSSARY[k].term}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {GLOSSARY[k].plain}
              {GLOSSARY[k].hedis && (
                <Box component="span" sx={{ display: "block", mt: 0.25 }}>
                  {GLOSSARY[k].hedis}
                </Box>
              )}
            </Typography>
          </Stack>
        ))}
        <Stack spacing={0.25}>
          <Typography sx={{ fontWeight: 700 }}>Share and print</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Copy link keeps the filters you picked. Print saves the whole page, with its charts, as a PDF. Export saves
            the numbers as Excel, PDF or CSV.
          </Typography>
        </Stack>
      </Stack>
    </Modal>
  );
}
