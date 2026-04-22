import { SidebarAuth } from "@/components/sidebar-auth";
import { getDentistFromAuth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const dentist = await getDentistFromAuth();
  
  return (
    <div className="min-h-screen md:flex bg-muted/40">
      <SidebarAuth 
        dentistName={dentist.fullName}
        dentistEmail={dentist.email}
        verificationStatus={dentist.verificationStatus}
        plan={dentist.plan}
      />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
