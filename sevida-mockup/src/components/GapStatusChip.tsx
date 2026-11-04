import { StatusChip } from "sevida-ui";
import { getVersion } from "../version";

/**
 * The Open / Closed label of a care gap. Version 8 (LPP-16153): the same green (Closed) and red (Open) label everywhere in the app.
 * Earlier versions keep green and orange.
 */
export function GapStatusChip({ closed }: { closed: boolean }) {
  return (
    <StatusChip
      tone={closed ? "success" : getVersion() >= 8 ? "danger" : "warning"}
      label={closed ? "Closed" : "Open"}
    />
  );
}
