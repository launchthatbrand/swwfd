import { AdminPageShell } from "../_components/AdminPageShell";
import { SupportAdminClient } from "./SupportAdminClient";

export default function AdminSupportPage() {
  return (
    <AdminPageShell
      title="Support"
      description="Standalone support + agent runtime surface for SWWFD."
    >
      <SupportAdminClient />
    </AdminPageShell>
  );
}
