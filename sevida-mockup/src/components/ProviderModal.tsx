import { Button, Modal } from "sevida-ui";
import { providerByNpi, providerFields } from "../recordFields";
import { FieldTable } from "./FieldTable";

/** The provider.csv row behind a name on a record (FR-503). */
export function ProviderModal({
  npi,
  onClose,
}: {
  npi?: string | null;
  onClose: () => void;
}) {
  const p = providerByNpi(npi ?? undefined);
  return (
    <Modal
      open={!!p}
      onClose={onClose}
      title={p ? `Provider: ${p.name}` : ""}
      size="lg"
      actions={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {p && (
        <FieldTable
          title="provider.csv"
          rows={providerFields(p)}
          note="Credential, taxonomy and role dates are made up for the demo. The name, NPI and organization are real demo data."
        />
      )}
    </Modal>
  );
}
