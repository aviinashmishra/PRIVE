import { Sidebar } from "@/components/app/Sidebar";
import { Topbar, MobileNav } from "@/components/app/Topbar";
import { SimulationProvider } from "@/components/app/SimulationProvider";
import { Toaster } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SimulationProvider>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar />
          <main className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-6 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <Toaster />
    </SimulationProvider>
  );
}
