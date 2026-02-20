import { AdminPageShell } from "../_components/AdminPageShell";
import { JobListingsClient } from "./JobListingsClient";

export default function AdminJobListingsPage() {
  return (
    <AdminPageShell
      title="Job Listings"
      description="Create and manage job listings."
    >
      <JobListingsClient />
    </AdminPageShell>
  );
}

