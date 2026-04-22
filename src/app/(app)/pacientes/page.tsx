import { prisma } from "@/lib/prisma";
import { getCurrentDentistId } from "@/lib/utils";
import { PatientsClient, type EnrichedPatient } from "./patients-client";

export const dynamic = "force-dynamic";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: { q?: string; filter?: string; sort?: string };
}) {
  const dentistId = await getCurrentDentistId();
  const dentist = await prisma.dentist.findUnique({ where: { id: dentistId } });

  const patients = await prisma.patient.findMany({
    where: { dentistId },
    include: {
      appointments: { orderBy: { startAt: "asc" } },
      recalls: { where: { doneAt: null } },
    },
    take: 500,
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

  const enriched: EnrichedPatient[] = patients.map((p) => {
    const upcoming = p.appointments.filter(a => a.startAt > now);
    const past = p.appointments.filter(a => a.startAt <= now);
    const nextAppt = upcoming[0] ?? null;
    const lastVisit = past[past.length - 1] ?? null;

    const totalSpent = p.appointments
      .filter(a => a.status === "COMPLETED")
      .reduce((s, a) => s + (a.priceCLP ?? 0), 0);

    const visits = past.length;

    const overdueRecalls = p.recalls.filter(r => r.dueDate < now).length;
    const hasAllergies = !!p.allergies && p.allergies.trim().length > 0;
    const hasPhone = !!p.phone && p.phone.trim().length > 0;
    const isInactive = !lastVisit || lastVisit.startAt < sixMonthsAgo;
    const isNewThisMonth = p.createdAt >= startOfMonth;

    // cumpleaños este mes
    const birthdayThisMonth = !!p.birthDate && p.birthDate.getMonth() === now.getMonth();

    return {
      id: p.id,
      fullName: p.fullName,
      rut: p.rut,
      phone: p.phone,
      email: p.email,
      allergies: p.allergies,
      birthDate: p.birthDate ? p.birthDate.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
      nextAppointmentAt: nextAppt ? nextAppt.startAt.toISOString() : null,
      nextAppointmentTreatment: nextAppt?.treatment ?? null,
      lastVisitAt: lastVisit ? lastVisit.startAt.toISOString() : null,
      totalSpent,
      visits,
      overdueRecalls,
      hasAllergies,
      hasPhone,
      isInactive,
      isNewThisMonth,
      birthdayThisMonth,
    };
  });

  const counters = {
    total: enriched.length,
    newThisMonth: enriched.filter(p => p.isNewThisMonth).length,
    noPhone: enriched.filter(p => !p.hasPhone).length,
    allergies: enriched.filter(p => p.hasAllergies).length,
    overdueRecalls: enriched.filter(p => p.overdueRecalls > 0).length,
    inactive: enriched.filter(p => p.isInactive).length,
    birthdayMonth: enriched.filter(p => p.birthdayThisMonth).length,
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PatientsClient
        patients={enriched}
        counters={counters}
        dentistName={dentist?.fullName ?? ""}
        initialQuery={searchParams.q ?? ""}
        initialFilter={searchParams.filter ?? "all"}
        initialSort={searchParams.sort ?? "name"}
      />
    </div>
  );
}
