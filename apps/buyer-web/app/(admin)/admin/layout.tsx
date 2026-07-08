import { AdminShell } from "@/components/admin/AdminShell";
import { SimulationProvider } from "@/components/app/SimulationProvider";
import { Toaster } from "@/components/ui/Toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SimulationProvider>
      <AdminShell>{children}</AdminShell>
      <Toaster />
    </SimulationProvider>
  );
}
