import { getClinicFromAuth } from "@/lib/auth";
import { formatCLP, formatTime } from "@/lib/utils";
import { Search, UserPlus, Calendar, Phone, Mail, MoreHorizontal, Filter } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Página de gestión de pacientes de la clínica
export default async function ClinicPatientsPage() {
  const clinic = await getClinicFromAuth();
  
  // Obtener todos los pacientes de la clínica con información de sus dentistas
  const patients = await prisma.patient.findMany({
    where: { clinicId: clinic.id },
    include: {
      dentist: {
        select: { fullName: true, specialty: true },
      },
      _count: {
        select: { appointments: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Pacientes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {patients.length} pacientes en {clinic.name}
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
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm transition">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <Link
            href="/clinic/pacientes/new"
            className="flex-1 sm:flex-initial justify-center px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 text-white font-semibold hover:shadow-lg hover:shadow-blue-600/25 transition flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Nuevo paciente
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Total pacientes</p>
          <p className="text-2xl font-bold">{patients.length}</p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Nuevos este mes</p>
          <p className="text-2xl font-bold">
            {patients.filter(p => {
              const createdAt = new Date(p.createdAt);
              const thisMonth = new Date();
              return createdAt.getMonth() === thisMonth.getMonth() && 
                     createdAt.getFullYear() === thisMonth.getFullYear();
            }).length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <Phone className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Con teléfono</p>
          <p className="text-2xl font-bold">
            {patients.filter(p => p.phone).length}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <Mail className="w-5 h-5 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500 mt-3">Con email</p>
          <p className="text-2xl font-bold">
            {patients.filter(p => p.email).length}
          </p>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-semibold text-lg">Directorio de pacientes</h2>
        </div>
        
        {patients.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">Sin pacientes registrados</h3>
            <p className="text-sm text-slate-500 mb-6">
              Comienza registrando el primer paciente de la clínica
            </p>
            <Link
              href="/clinic/pacientes/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
            >
              <UserPlus className="w-4 h-4" /> Registrar primer paciente
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Dentista
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Citas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Registro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-sky-500 text-white grid place-items-center text-xs font-bold">
                          {patient.fullName.split(" ").map(s => s[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{patient.fullName}</div>
                          {patient.rut && (
                            <div className="text-xs text-slate-500">{patient.rut}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-slate-900">{patient.dentist.fullName}</div>
                        <div className="text-xs text-slate-500">{patient.dentist.specialty || "General"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {patient.phone && (
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {patient.phone}
                          </div>
                        )}
                        {patient.email && (
                          <div className="text-sm text-slate-600 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {patient.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">
                        {patient._count.appointments} citas
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        {new Date(patient.createdAt).toLocaleDateString("es-CL")}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/clinic/pacientes/${patient.id}`}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          title="Ver ficha"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/clinic/schedule?patient=${patient.id}`}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          title="Agendar cita"
                        >
                          <Calendar className="w-4 h-4" />
                        </Link>
                        {patient.phone && (
                          <a
                            href={`https://wa.me/${patient.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            title="WhatsApp"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
