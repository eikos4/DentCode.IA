import { SidebarAuth } from "@/components/sidebar-auth";
import { getDentistFromAuth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getDentistFromAuth();
  
  // Manejar tanto dentistas (fullName) como clínicas (name)
  const displayName = (user as any).fullName ?? (user as any).name ?? "Usuario";
  const email = (user as any).email ?? "";
  const verificationStatus = (user as any).verificationStatus ?? "VERIFIED";
  const plan = (user as any).plan ?? "FREE";
  
  return (
    <div className="min-h-screen md:flex bg-muted/40">
      <SidebarAuth 
        dentistName={displayName}
        dentistEmail={email}
        verificationStatus={verificationStatus}
        plan={plan}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
