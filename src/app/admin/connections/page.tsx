import { AdminPageShell } from "../_components/AdminPageShell";
import { ConnectionsClient } from "./ConnectionsClient";

export default function AdminConnectionsPage() {
  return (
    <AdminPageShell
      title="Connections"
      description="Manage employee Outlook OAuth connections used for Monday email sends."
    >
      <ConnectionsClient />
    </AdminPageShell>
  );
}
