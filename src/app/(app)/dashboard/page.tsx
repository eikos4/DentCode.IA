import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDentistFromAuth } from "@/lib/auth";
import { formatCLP, formatTime } from "@/lib/utils";
import {
  CalendarDays, Users, TrendingUp, Bell, AlertTriangle, Sparkles,
  Plus, Search, MessageCircle, Activity, ArrowUpRight, Cake, Clock,
  CheckCircle2, FileImage, StickyNote, UserPlus,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ------- helpers ------- */
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const STATUS_STYLE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  SCHEDULED: { label: "Pendiente", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  CONFIRMED: { label: "Confirmada", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  COMPLETED: { label: "Atendida", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  CANCELLED: { label: "Cancelada", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  NO_SHOW:   { label: "No-show",   bg: "bg-zinc-100", text: "text-zinc-700", dot: "bg-zinc-400" },
};

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function monthKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}`; }

export default async function DashboardPage() {
  const dentist = await getDentistFromAuth();
  const dentistId = dentist.id;
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - ((startOfDay.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    todays, weekCount, patientCount, patientsNewMonth, monthAppts,
    overdueRecalls, pendingConfirm, lastMonthRevenue,
    recentPatients, recentAttachments, recentNotes,
    upcomingBirthdays, sixMonthAppts,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { dentistId, startAt: { gte: startOfDay, lte: endOfDay } },
      include: { patient: true }, orderBy: { startAt: "asc" },
    }),
    prisma.appointment.count({ where: { dentistId, startAt: { gte: startOfWeek, lt: endOfWeek } } }),
    prisma.patient.count({ where: { dentistId } }),
    prisma.patient.count({ where: { dentistId, createdAt: { gte: startOfMonth } } }),
    prisma.appointment.findMany({
      where: { dentistId, startAt: { gte: startOfMonth } },
      select: { status: true, priceCLP: true, treatment: true, startAt: true },
    }),
    prisma.recall.findMany({
      where: { patient: { dentistId }, doneAt: null, dueDate: { lt: now } },
      include: { patient: { select: { fullName: true, phone: true } } },
      orderBy: { dueDate: "asc" }, take: 5,
    }),
    prisma.appointment.findMany({
      where: {
        dentistId, status: "SCHEDULED",
        startAt: { gte: now, lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
      },
      include: { patient: { select: { fullName: true, phone: true } } },
      orderBy: { startAt: "asc" }, take: 5,
    }),
    prisma.appointment.aggregate({
      where: {
        dentistId, status: "COMPLETED",
        startAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          lt: startOfMonth,
        },
      },
      _sum: { priceCLP: true },
    }),
    prisma.patient.findMany({
      where: { dentistId }, orderBy: { createdAt: "desc" }, take: 3,
      select: { id: true, fullName: true, createdAt: true },
    }),
    prisma.attachment.findMany({
      where: { patient: { dentistId } }, orderBy: { createdAt: "desc" }, take: 3,
      include: { patient: { select: { fullName: true, id: true } } },
    }),
    prisma.clinicalNote.findMany({
      where: { patient: { dentistId } }, orderBy: { date: "desc" }, take: 3,
      include: { patient: { select: { fullName: true, id: true } } },
    }),
    prisma.patient.findMany({
      where: { dentistId, birthDate: { not: null } },
      select: { id: true, fullName: true, birthDate: true },
    }),
    prisma.appointment.findMany({
      where: { dentistId, startAt: { gte: sixMonthsAgo }, status: "COMPLETED" },
      select: { startAt: true, priceCLP: true },
    }),
  ]);

  /* -------- derivaciones -------- */
  const revenueMonth = monthAppts
    .filter(a => a.status === "COMPLETED")
    .reduce((s, a) => s + (a.priceCLP ?? 0), 0);
  const prevRevenue = lastMonthRevenue._sum.priceCLP ?? 0;
  const revenueDelta = prevRevenue ? ((revenueMonth - prevRevenue) / prevRevenue) * 100 : 0;

  const statusCount = monthAppts.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1; return acc;
  }, {});
  const monthTotal = monthAppts.length;
  const noShow = statusCount.NO_SHOW ?? 0;
  const noShowRate = monthTotal ? Math.round((noShow / monthTotal) * 100) : 0;

  // top 3 tratamientos por ingreso mes actual
  const byTreatment = monthAppts
    .filter(a => a.status === "COMPLETED" && a.treatment)
    .reduce<Record<string, { count: number; revenue: number }>>((acc, a) => {
      const k = a.treatment!;
      acc[k] ||= { count: 0, revenue: 0 };
      acc[k].count++; acc[k].revenue += a.priceCLP ?? 0;
      return acc;
    }, {});
  const topTreatments = Object.entries(byTreatment)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 4);

  // revenue by month (últimos 6)
  const monthBuckets: { key: string; label: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthBuckets.push({ key: monthKey(d), label: MONTHS_ES[d.getMonth()], total: 0 });
  }
  for (const a of sixMonthAppts) {
    const k = monthKey(new Date(a.startAt));
    const b = monthBuckets.find(m => m.key === k);
    if (b) b.total += a.priceCLP ?? 0;
  }
  const maxRev = Math.max(1, ...monthBuckets.map(b => b.total));

  // cumpleaños próximos 14 días
  const upcoming = upcomingBirthdays
    .map(p => {
      const b = p.birthDate!;
      const next = new Date(now.getFullYear(), b.getMonth(), b.getDate());
      if (next < startOfDay) next.setFullYear(next.getFullYear() + 1);
      return { ...p, nextBirthday: next, days: Math.floor((next.getTime() - startOfDay.getTime()) / (86400000)) };
    })
    .filter(p => p.days <= 14)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  // próxima cita ahora
  const nextAppt = todays.find(a => new Date(a.startAt) > now);
  const currentAppt = todays.find(a => new Date(a.startAt) <= now && new Date(a.endAt) >= now);

  // feed actividad reciente
  type ActivityItem = { at: Date; icon: any; color: string; text: React.ReactNode; href?: string };
  const activity: ActivityItem[] = [
    ...recentPatients.map(p => ({
      at: p.createdAt, icon: UserPlus, color: "text-sky-600 bg-sky-50",
      text: <>Nuevo paciente <b>{p.fullName}</b></>,
      href: `/pacientes/${p.id}`,
    })),
    ...recentAttachments.map(a => ({
      at: a.createdAt, icon: FileImage, color: "text-amber-600 bg-amber-50",
      text: <><b>{a.category}</b> subida para <b>{a.patient.fullName}</b></>,
      href: `/pacientes/${a.patient.id}`,
    })),
    ...recentNotes.map(n => ({
      at: n.date, icon: StickyNote, color: "text-violet-600 bg-violet-50",
      text: <>Nota clínica de <b>{n.patient.fullName}</b></>,
      href: `/pacientes/${n.patient.id}`,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6);

  /* ---------- render ---------- */
  const firstName = dentist?.fullName.split(" ")[1] ?? dentist?.fullName ?? "Doctor/a";
  const todayLabel = new Intl.DateTimeFormat("es-CL", {
    weekday: "long", day: "numeric", month: "long",
  }).format(now);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 anim-fade-up">
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-slate-500 capitalize">{todayLabel}</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-0.5">
            {greet()}, <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tienes <b>{todays.length}</b> {todays.length === 1 ? "cita" : "citas"} hoy
            {nextAppt && <> · próxima a las <b>{formatTime(nextAppt.startAt)}</b></>}
            {currentAppt && <> · <span className="text-emerald-700 font-medium">atendiendo a {currentAppt.patient.fullName}</span></>}
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
            <Link href="/pacientes" className="flex-1 sm:flex-initial justify-center px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition flex items-center gap-1">
              <UserPlus className="w-4 h-4" /> Paciente
            </Link>
            <Link href="/agenda" className="flex-1 sm:flex-initial justify-center px-3 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-600/25 transition flex items-center gap-1">
              <Plus className="w-4 h-4" /> Nueva cita
            </Link>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 anim-fade-up delay-100">
        <Kpi icon={CalendarDays} label="Citas hoy" value={todays.length} accent="teal" />
        <Kpi icon={Clock} label="Esta semana" value={weekCount} accent="sky" />
        <Kpi
          icon={TrendingUp} label="Ingresos del mes"
          value={formatCLP(revenueMonth)}
          delta={prevRevenue ? revenueDelta : undefined}
          accent="emerald"
        />
        <Kpi icon={Users} label="Pacientes" value={patientCount} sub={`+${patientsNewMonth} este mes`} accent="violet" />
        <Kpi
          icon={Bell} label="Recalls vencidos"
          value={overdueRecalls.length}
          accent={overdueRecalls.length > 0 ? "red" : "slate"}
        />
        <Kpi
          icon={AlertTriangle} label="Tasa no-show"
          value={`${noShowRate}%`} sub={`${noShow} de ${monthTotal}`}
          accent={noShowRate > 15 ? "red" : "slate"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agenda de hoy */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-200 bg-white anim-fade-up delay-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">Agenda de hoy</h2>
              <p className="text-xs text-slate-500">{todays.length} citas · {statusCount.CONFIRMED ?? 0} confirmadas</p>
            </div>
            <Link href="/agenda" className="text-sm text-blue-700 hover:underline flex items-center gap-1">
              Ver agenda completa <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todays.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sin citas hoy" subtitle="Aprovecha para ponerte al día con fichas o contactar pacientes para recall." />
          ) : (
            <ul className="space-y-2">
              {todays.map((a) => {
                const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.SCHEDULED;
                const start = new Date(a.startAt);
                const end = new Date(a.endAt);
                const isNow = start <= now && end >= now;
                const isPast = end < now;
                return (
                  <li
                    key={a.id}
                    className={`group flex items-center gap-4 p-3 rounded-lg border transition ${
                      isNow ? "border-blue-500 bg-blue-50/50 shadow-sm shadow-blue-600/10" :
                      isPast ? "border-slate-100 bg-slate-50/40 opacity-70" :
                      "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-center min-w-[56px]">
                      <div className="font-mono text-sm font-semibold">{formatTime(start)}</div>
                      <div className="text-[10px] text-slate-400">{formatTime(end)}</div>
                    </div>
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: isNow ? "#14b8a6" : undefined }}>
                      <span className={`block w-full h-full rounded-full ${st.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{a.patient.fullName}</p>
                        {isNow && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-semibold anim-pulse-glow">AHORA</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{a.treatment ?? "Consulta"} {a.priceCLP ? `· ${formatCLP(a.priceCLP)}` : ""}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>{st.label}</span>
                    {a.patient.phone && (
                      <a
                        href={`https://wa.me/${a.patient.phone.replace(/\D/g, "")}`}
                        target="_blank" rel="noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition text-blue-700 hover:text-blue-800"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Revenue chart */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white anim-fade-up delay-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">Ingresos</h2>
                <p className="text-xs text-slate-500">Últimos 6 meses</p>
              </div>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <BarChart data={monthBuckets} max={maxRev} />
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <p className="text-xs text-slate-500">Este mes</p>
                <p className="text-2xl font-bold">{formatCLP(revenueMonth)}</p>
              </div>
              {prevRevenue > 0 && (
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${revenueDelta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {revenueDelta >= 0 ? "↑" : "↓"} {Math.abs(revenueDelta).toFixed(1)}% vs mes anterior
                </span>
              )}
            </div>
          </div>

          {/* Status donut */}
          <div className="p-5 rounded-2xl border border-slate-200 bg-white anim-fade-up delay-300">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-semibold">Estado de citas</h2>
                <p className="text-xs text-slate-500">Mes en curso · {monthTotal} total</p>
              </div>
            </div>
            <StackedBar counts={statusCount} total={monthTotal} />
            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {Object.entries(STATUS_STYLE).map(([k, s]) => (
                <li key={k} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-slate-600">{s.label}</span>
                  <span className="ml-auto font-semibold">{statusCount[k] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Por hacer */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white anim-fade-up">
          <h2 className="font-semibold mb-1">Por hacer</h2>
          <p className="text-xs text-slate-500 mb-4">Acciones que requieren tu atención</p>

          <div className="space-y-4">
            {pendingConfirm.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Confirmar ({pendingConfirm.length})</p>
                <ul className="space-y-1.5">
                  {pendingConfirm.slice(0, 3).map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{a.patient.fullName}</p>
                        <p className="text-xs text-slate-500">{formatTime(a.startAt)} · {new Date(a.startAt).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</p>
                      </div>
                      {a.patient.phone && (
                        <a href={`https://wa.me/${a.patient.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {overdueRecalls.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Recalls vencidos ({overdueRecalls.length})
                </p>
                <ul className="space-y-1.5">
                  {overdueRecalls.map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-sm p-2 rounded-md hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{r.patient.fullName}</p>
                        <p className="text-xs text-slate-500 capitalize">{r.type} · vencido hace {Math.floor((now.getTime() - r.dueDate.getTime()) / 86400000)}d</p>
                      </div>
                      {r.patient.phone && (
                        <a href={`https://wa.me/${r.patient.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-800">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pendingConfirm.length === 0 && overdueRecalls.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <p className="text-sm font-medium">Todo al día</p>
                <p className="text-xs text-slate-500">No tienes acciones pendientes.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top tratamientos */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white anim-fade-up delay-100">
          <h2 className="font-semibold mb-1">Top tratamientos</h2>
          <p className="text-xs text-slate-500 mb-4">Por ingreso · mes actual</p>
          {topTreatments.length === 0 ? (
            <EmptyState icon={Activity} title="Sin datos aún" subtitle="Completa citas con precio para ver tu mix." />
          ) : (
            <ul className="space-y-3">
              {topTreatments.map(([name, v], i) => {
                const pct = Math.round((v.revenue / (topTreatments[0][1].revenue || 1)) * 100);
                return (
                  <li key={name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium truncate">{i + 1}. {name}</span>
                      <span className="text-slate-600">{formatCLP(v.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{v.count} {v.count === 1 ? "paciente" : "pacientes"}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Cumpleaños */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white anim-fade-up delay-200">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <Cake className="w-4 h-4 text-pink-500" /> Cumpleaños
          </h2>
          <p className="text-xs text-slate-500 mb-4">Próximos 14 días</p>
          {upcoming.length === 0 ? (
            <EmptyState icon={Cake} title="Sin cumpleaños" subtitle="Ningún paciente cumple años en las próximas 2 semanas." />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((p) => (
                <li key={p.id}>
                  <Link href={`/pacientes/${p.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 text-pink-700 grid place-items-center text-xs font-bold">
                      {p.fullName.split(" ").map(s => s[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.fullName}</p>
                      <p className="text-xs text-slate-500">
                        {p.nextBirthday.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                      </p>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-pink-50 text-pink-700">
                      {p.days === 0 ? "hoy 🎉" : p.days === 1 ? "mañana" : `en ${p.days}d`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white anim-fade-up">
        <h2 className="font-semibold mb-1">Actividad reciente</h2>
        <p className="text-xs text-slate-500 mb-4">Últimos eventos en tu consulta</p>
        {activity.length === 0 ? (
          <EmptyState icon={Activity} title="Sin actividad" subtitle="Comienza registrando un paciente o subiendo una radiografía." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((e, i) => {
              const Icon = e.icon;
              const content = (
                <div className="flex items-center gap-3 py-3">
                  <span className={`w-8 h-8 rounded-lg grid place-items-center ${e.color}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{e.text}</p>
                    <p className="text-xs text-slate-500">{e.at.toLocaleString("es-CL")}</p>
                  </div>
                </div>
              );
              return e.href ? (
                <li key={i}><Link href={e.href} className="block hover:bg-slate-50 rounded-lg px-2 -mx-2">{content}</Link></li>
              ) : <li key={i}>{content}</li>;
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ===== sub-components ===== */

function Kpi({
  icon: Icon, label, value, sub, delta, accent,
}: {
  icon: any; label: string; value: React.ReactNode; sub?: string; delta?: number;
  accent: "teal" | "sky" | "emerald" | "violet" | "red" | "slate";
}) {
  const palette: Record<string, { bg: string; text: string }> = {
    teal:    { bg: "bg-blue-50",    text: "text-blue-700" },
    sky:     { bg: "bg-sky-50",     text: "text-sky-600" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-600" },
    red:     { bg: "bg-red-50",     text: "text-red-600" },
    slate:   { bg: "bg-slate-100",  text: "text-slate-600" },
  };
  const p = palette[accent];
  return (
    <div className="card-hover p-4 rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between">
        <span className={`w-8 h-8 rounded-lg grid place-items-center ${p.bg} ${p.text}`}>
          <Icon className="w-4 h-4" />
        </span>
        {delta !== undefined && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-3">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({ data, max }: { data: { label: string; total: number }[]; max: number }) {
  const W = 280, H = 100, pad = 4;
  const bw = (W - pad * (data.length + 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full h-auto">
      <defs>
        <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      {data.map((b, i) => {
        const h = max > 0 ? (b.total / max) * H : 0;
        const x = pad + i * (bw + pad);
        const y = H - h;
        const isCurrent = i === data.length - 1;
        return (
          <g key={b.label}>
            <rect
              x={x} y={y} width={bw} height={h || 1}
              rx={4}
              fill={isCurrent ? "url(#barGrad)" : "#e2e8f0"}
              opacity={isCurrent ? 1 : 0.9}
            >
              <animate attributeName="height" from="0" to={h || 1} dur="0.8s" fill="freeze" />
              <animate attributeName="y" from={H} to={y} dur="0.8s" fill="freeze" />
            </rect>
            <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize="10" fill="#64748b">{b.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StackedBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) return <div className="h-3 rounded-full bg-slate-100" />;
  const order = ["CONFIRMED", "COMPLETED", "SCHEDULED", "NO_SHOW", "CANCELLED"];
  const fills: Record<string, string> = {
    CONFIRMED: "#10b981", COMPLETED: "#0ea5e9", SCHEDULED: "#f59e0b",
    NO_SHOW: "#a1a1aa", CANCELLED: "#f87171",
  };
  let acc = 0;
  return (
    <div className="h-3 rounded-full bg-slate-100 overflow-hidden flex">
      {order.map(k => {
        const v = counts[k] ?? 0;
        if (!v) return null;
        const pct = (v / total) * 100;
        acc += pct;
        return <div key={k} style={{ width: `${pct}%`, background: fills[k] }} title={`${k}: ${v}`} />;
      })}
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-8 text-slate-500">
      <div className="w-12 h-12 rounded-full bg-slate-100 grid place-items-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-xs mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}
