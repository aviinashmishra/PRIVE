import { SellerNav } from "@/components/seller/SellerNav";
import { SimulationProvider } from "@/components/app/SimulationProvider";
import { Toaster } from "@/components/ui/Toast";

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SimulationProvider>
      <div className="min-h-screen bg-canvas">
        <SellerNav />
        <main className="max-w-[1280px] mx-auto px-5 py-8">{children}</main>
      </div>
      <Toaster />
    </SimulationProvider>
  );
}
