import { getClinicFromAuth } from "@/lib/auth";
import { formatCLP } from "@/lib/utils";
import { TrendingUp, Calendar, Users, Download, Filter, BarChart3, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClinicReportsPage() {
  const clinic = await getClinicFromAuth();

  if (clinic.role !== "CLINIC_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Lock className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Acceso restringido</h2>
        <p className="text-slate-500">Solo los administradores de clínica pueden ver los reportes.</p>
      </div>
    );
  }
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Fetch todo en paralelo con Prisma estándar
  const [completedAppointments, topTreatments, dentistPerformance] = await Promise.all([
    // Todas las citas completadas en los últimos 6 meses
    prisma.appointment.findMany({
      where: {
        clinicId: clinic.id,
        status: "COMPLETED",
        startAt: { gte: sixMonthsAgo },
      },
      select: { priceCLP: true, startAt: true },
    }),
    // Top tratamientos del mes
    prisma.appointment.groupBy({
      by: ["treatment"],
      where: {
        clinicId: clinic.id,
        status: "COMPLETED",
        startAt: { gte: startOfMonth },
        treatment: { not: null },
      },
      _sum: { priceCLP: true },
      _count: true,
      orderBy: { _sum: { priceCLP: "desc" } },
      take: 10,
    }),
    // Performance por dentista
    prisma.dentist.findMany({
      where: { clinicId: clinic.id, isActive: true },
      include: {
        appointments: {
          where: { status: "COMPLETED", startAt: { gte: startOfMonth } },
          select: { priceCLP: true },
        },
        _count: {
          select: {
            patients: true,
            appointments: {
              where: { status: "COMPLETED", startAt: { gte: startOfMonth } },
            },
          },
        },
      },
    }),
  ]);

  // Agrupar citas por mes en JavaScript
  const monthMap: Record<string, { revenue: number; appointments: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = { revenue: 0, appointments: 0 };
  }
  for (const appt of completedAppointments) {
    const d = new Date(appt.startAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap[key]) {
      monthMap[key].revenue += appt.priceCLP ?? 0;
      monthMap[key].appointments += 1;
    }
  }
  const monthlyRevenue = Object.entries(monthMap).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    appointments: data.appointments,
  }));

  // Calcular métricas del mes actual
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonth = monthMap[currentMonthKey] ?? { revenue: 0, appointments: 0 };
  const avgAppointmentValue = currentMonth.appointments > 0
    ? currentMonth.revenue / currentMonth.appointments
    : 0;

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  const dentistStats = dentistPerformance.map((dentist) => ({
    ...dentist,
    monthlyRevenue: dentist.appointments.reduce((sum, apt) => sum + (apt.priceCLP ?? 0), 0),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Reportes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Análisis de rendimiento y métricas de {clinic.name}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs Generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Ingresos mes actual</p>
          <p className="text-2xl font-bold">{formatCLP(currentMonth.revenue)}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Citas completadas</p>
          <p className="text-2xl font-bold">{currentMonth.appointments}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <BarChart3 className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Valor promedio cita</p>
          <p className="text-2xl font-bold">{formatCLP(avgAppointmentValue)}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Pacientes activos</p>
          <p className="text-2xl font-bold">{clinic._count?.patients || 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance por Dentista */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="font-semibold text-lg">Performance por Dentista</h2>
            <p className="text-sm text-slate-500 mt-1">Ingresos y citas del mes actual</p>
          </div>
          
          <div className="p-6 space-y-4">
            {dentistStats.map((dentist: any) => (
              <div key={dentist.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white grid place-items-center text-sm font-bold">
                    {dentist.fullName.split(" ").map((s: any) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{dentist.fullName}</div>
                    <div className="text-sm text-slate-500">
                      {dentist.specialty || "General"} · {dentist._count.appointments} citas
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatCLP(dentist.monthlyRevenue)}</div>
                  <div className="text-sm text-slate-500">{dentist._count.patients} pacientes</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Tratamientos */}
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="font-semibold text-lg">Top Tratamientos</h2>
            <p className="text-sm text-slate-500 mt-1">Más rentables del mes</p>
          </div>
          
          <div className="p-6 space-y-3">
            {topTreatments.map((treatment: any, index: number) => (
              <div key={treatment.treatment} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 grid place-items-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{treatment.treatment}</div>
                    <div className="text-sm text-slate-500">{treatment._count} sesiones</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatCLP(treatment._sum.priceCLP || 0)}</div>
                  <div className="text-sm text-slate-500">
                    {treatment._count > 0 ? formatCLP((treatment._sum.priceCLP || 0) / treatment._count) : 0} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de Ingresos Mensuales */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-semibold text-lg">Evolución de Ingresos</h2>
          <p className="text-sm text-slate-500 mt-1">Últimos 6 meses</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {monthlyRevenue.map((month, index) => (
              <div key={`${month.month}-${index}`} className="flex items-center gap-4">
                <div className="w-20 text-sm text-slate-600">
                  {new Date(month.month + "-01").toLocaleDateString("es-CL", { month: "short", year: "2-digit" })}
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-sky-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${(month.revenue / maxRevenue) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <div className="w-32 text-right">
                  <div className="font-semibold text-slate-900">{formatCLP(month.revenue)}</div>
                  <div className="text-sm text-slate-500">{month.appointments} citas</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
