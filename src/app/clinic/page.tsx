import { getClinicFromAuth } from "@/lib/auth";
import { formatCLP, formatTime } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  CalendarDays,
  Users,
  TrendingUp,
  Activity,
  Building,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { ClinicKpi } from "@/components/clinic-kpi";
import { DentistCard } from "@/components/dentist-card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClinicDashboard() {
  const clinic = await getClinicFromAuth();
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Métricas consolidadas
  const [
    todayAppts,
    weekAppts,
    monthRevenue,
    activePatients,
    upcomingAppts,
    overdueRecalls,
  ] = await Promise.all([
    // Citas de hoy de todos los dentistas
    prisma.appointment.count({
      where: {
        clinicId: clinic.id,
        startAt: { gte: startOfDay, lte: endOfDay },
      },
    }),
    // Citas de la semana
    prisma.appointment.count({
      where: {
        clinicId: clinic.id,
        startAt: { gte: startOfWeek, lt: endOfWeek },
      },
    }),
    // Ingresos del mes
    prisma.appointment.aggregate({
      where: {
        clinicId: clinic.id,
        status: "COMPLETED",
        startAt: { gte: startOfMonth },
      },
      _sum: { priceCLP: true },
    }),
    // Pacientes activos
    prisma.patient.count({
      where: {
        clinicId: clinic.id,
      },
    }),
    // Próximas citas (próximas 48 horas)
    prisma.appointment.findMany({
      where: {
        clinicId: clinic.id,
        status: "SCHEDULED",
        startAt: { gte: now, lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
      },
      include: {
        dentist: { select: { fullName: true } },
        patient: { select: { fullName: true, phone: true } },
      },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
    // Recalls vencidos
    prisma.recall.count({
      where: {
        patient: { clinicId: clinic.id },
        doneAt: null,
        dueDate: { lt: now },
      },
    }),
  ]);

  const revenue = monthRevenue._sum.priceCLP ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard Clínica
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {clinic.dentists.length} dentistas activos · {activePatients} pacientes totales
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Buscar paciente..."
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white w-full sm:w-56 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex gap-2">
            <Link
              href="/clinic/patients"
              className="flex-1 sm:flex-initial justify-center px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" /> Paciente
            </Link>
            <Link
              href="/clinic/schedule"
              className="flex-1 sm:flex-initial justify-center px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-600/25 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Nueva cita
            </Link>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ClinicKpi
          icon={CalendarDays}
          label="Citas hoy"
          value={todayAppts}
          accent="teal"
        />
        <ClinicKpi
          icon={Clock}
          label="Esta semana"
          value={weekAppts}
          accent="sky"
        />
        <ClinicKpi
          icon={TrendingUp}
          label="Ingresos mes"
          value={formatCLP(revenue)}
          accent="emerald"
        />
        <ClinicKpi
          icon={Users}
          label="Pacientes"
          value={activePatients}
          accent="violet"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Próximas citas */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">Próximas citas</h2>
              <p className="text-xs text-slate-500">
                Próximas 48 horas · {upcomingAppts.length} programadas
              </p>
            </div>
            <Link
              href="/clinic/schedule"
              className="text-sm text-blue-700 hover:underline flex items-center gap-1"
            >
              Ver agenda completa <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingAppts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-slate-500">
              <CalendarDays className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-medium">Sin próximas citas</p>
              <p className="text-sm mt-1">No hay citas programadas para las próximas 48 horas.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingAppts.map((appt) => (
                <li
                  key={appt.id}
                  className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition"
                >
                  <div className="text-center min-w-[56px]">
                    <div className="font-mono text-sm font-semibold">
                      {formatTime(appt.startAt)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {appt.dentist.fullName.split(" ").slice(-1)[0]}
                    </div>
                  </div>
                  <div className="w-1 h-10 rounded-full bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{appt.patient.fullName}</p>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {appt.treatment ?? "Consulta"}{" "}
                      {appt.priceCLP && `· ${formatCLP(appt.priceCLP)}`}
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                    {appt.dentist.fullName.split(" ")[0]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dentistas activos */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">Equipo dental</h2>
              <p className="text-xs text-slate-500">
                {clinic.dentists.length} activos
              </p>
            </div>
            {clinic.role === "CLINIC_ADMIN" && (
              <Link
                href="/clinic/dentists"
                className="text-sm text-blue-700 hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="space-y-3">
            {clinic.dentists.slice(0, 4).map((dentist) => (
              <DentistCard
                key={dentist.id}
                dentist={dentist}
                showActions={clinic.role === "CLINIC_ADMIN"}
              />
            ))}
            
            {clinic.dentists.length > 4 && (
              <Link
                href="/clinic/dentists"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2"
              >
                Ver {clinic.dentists.length - 4} más...
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Alertas */}
      {overdueRecalls > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-amber-900">
                {overdueRecalls} recalls vencidos
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Hay controles que deberían haberse realizado. Contacta a los pacientes para reagendar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
