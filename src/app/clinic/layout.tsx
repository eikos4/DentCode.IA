import { redirect } from "next/navigation";
import { getClinicFromAuth } from "@/lib/auth";
import { ClinicNav } from "@/components/clinic-nav";

export const dynamic = "force-dynamic";

export default async function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const clinic = await getClinicFromAuth();
    
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-50 glass bg-white/80 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 grid place-items-center text-white font-black shadow-lg shadow-blue-500/25">
                {clinic.name.charAt(0)}
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">{clinic.name}</h1>
                <p className="text-xs text-slate-500">Panel de administración</p>
              </div>
            </div>
            
            <ClinicNav role={clinic.role as "CLINIC_ADMIN" | "CLINIC_STAFF"} />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </main>
      </div>
    );
  } catch (error) {
    redirect("/login-clinica");
  }
}
