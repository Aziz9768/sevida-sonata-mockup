import { StepTrace } from "sevida-ui";
import type { TraceItem } from "sevida-ui";
import type { MeasureResult, StepOutcome } from "../data";
import { SourceLinks } from "./SourceLinks";

const look: Record<StepOutcome, Pick<TraceItem, "tone" | "statusLabel">> = {
  pass: { tone: "success", statusLabel: "Passed" },
  fail: { tone: "neutral", statusLabel: "Not in this measure" },
  excluded: { tone: "neutral", statusLabel: "Excluded" },
  unmet: { tone: "warning", statusLabel: "Not met" },
  review: { tone: "warning", statusLabel: "Needs review" },
  skipped: { tone: "muted", statusLabel: "Not checked" },
};

/** The checks behind one member's result for one measure, in the order they were made. */
export function TraceView({
  result,
  label,
}: {
  result: MeasureResult;
  label: string;
}) {
  const last = result.steps.length - 1;
  const items: TraceItem[] = result.steps.map((s, i) => ({
    label: s.label,
    detail:
      s.outcome === "skipped"
        ? "Not needed: the decision was already made above"
        : s.detail,
    ...look[s.outcome],
    ...(i === last && s.outcome === "pass" ? { statusLabel: "Met" } : {}),
    source:
      s.outcome === "skipped" ? undefined : <SourceLinks text={s.source} />,
  }));
  return <StepTrace steps={items} label={label} />;
}
