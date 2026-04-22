import Link from "next/link";
import { ArrowLeft, Building } from "lucide-react";
import { RegisterClinicForm } from "@/components/register-form-clinic";

export const metadata = {
  title: "Registro de Clínica - DentCode",
  description: "Registra tu clínica dental y gestiona múltiples dentistas",
};

export default function ClinicRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition mb-8">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 grid place-items-center text-white font-black text-2xl shadow-lg shadow-blue-500/25 mx-auto mb-4">
            <Building className="w-8 h-8" />
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Registro de Clínica
          </h1>
          <p className="text-slate-600">
            Gestiona múltiples dentistas y pacientes desde una cuenta
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <RegisterClinicForm />
          
          <p className="text-center text-sm text-slate-500 mt-6">
            ¿Eres dentista independiente?{" "}
            <Link href="/registro" className="text-blue-600 hover:underline font-medium">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
