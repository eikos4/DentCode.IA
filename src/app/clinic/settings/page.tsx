import { getClinicFromAuth } from "@/lib/auth";
import { Building, CreditCard, Users, Shield, Globe, Lock } from "lucide-react";
import { ClinicSettingsForm } from "@/components/clinic-settings-form";

export const dynamic = "force-dynamic";

export default async function ClinicSettingsPage() {
  const clinic = await getClinicFromAuth();

  if (clinic.role !== "CLINIC_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Lock className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Acceso restringido</h2>
        <p className="text-slate-500">Solo los administradores de clínica pueden acceder a la configuración.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Configuración
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Administra la configuración de {clinic.name}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Información Básica */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Building className="w-5 h-5" />
                Información de la Clínica
              </h2>
            </div>
            <div className="p-6">
              <ClinicSettingsForm clinic={{
                id: clinic.id,
                name: clinic.name,
                phone: clinic.phone,
                email: clinic.email,
                address: clinic.address,
                city: clinic.city,
                commune: clinic.commune,
                region: clinic.region,
                rut: clinic.rut,
              }} />
            </div>
          </div>

          {/* Plan y Facturación */}
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Plan y Facturación
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plan actual
                  </label>
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="font-medium text-slate-900 capitalize">
                      {clinic.plan === "trial" ? "Prueba gratuita" : clinic.plan}
                    </div>
                    {clinic.planEndsAt && (
                      <div className="text-sm text-slate-500 mt-1">
                        {clinic.plan === "trial" 
                          ? `Expira: ${clinic.planEndsAt.toLocaleDateString("es-CL")}`
                          : `Renovación: ${clinic.planEndsAt.toLocaleDateString("es-CL")}`
                        }
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Estado
                  </label>
                  <div className={`p-3 rounded-lg border ${
                    clinic.isActive 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}>
                    <div className="font-medium">
                      {clinic.isActive ? "Activa" : "Inactiva"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">¿Necesitas cambiar tu plan?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Contacta a nuestro equipo de ventas para encontrar el plan perfecto para tu clínica.
                </p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                  Contactar ventas
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Estadísticas
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Dentistas activos</span>
                <span className="font-semibold">{clinic.dentists.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Pacientes totales</span>
                <span className="font-semibold">{clinic._count?.patients || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Sedes</span>
                <span className="font-semibold">—</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Servicios</span>
                <span className="font-semibold">—</span>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Seguridad
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Autenticación de dos factores</span>
                <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  Recomendado
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Copia de seguridad automática</span>
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  Activa
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Cifrado de datos</span>
                <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  AES-256
                </span>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h2 className="font-semibold text-lg">Acciones</h2>
            </div>
            
            <div className="p-6 space-y-3">
              <button className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2">
                <Users className="w-4 h-4" /> Gestionar usuarios
              </button>
              <button className="w-full px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2">
                <Globe className="w-4 h-4" /> Dominio personalizado
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
