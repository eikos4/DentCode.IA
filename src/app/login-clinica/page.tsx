import Link from "next/link";
import { ArrowLeft, Building, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { LoginForm } from "@/components/login-form-clinic";

export const metadata = {
  title: "Login Clínica - DentCode",
  description: "Inicia sesión como administrador de clínica",
};

export default function ClinicLoginPage() {
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
            Acceso Clínica
          </h1>
          <p className="text-slate-600">
            Ingresa como administrador de tu clínica
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <LoginForm />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              ¿No tienes cuenta?{" "}
              <Link href="/registro-clinica" className="text-blue-600 hover:underline font-medium">
                Registra tu clínica
              </Link>
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-center text-xs text-slate-400 mb-2">
              ¿Eres dentista independiente?
            </p>
            <Link
              href="/login"
              className="block w-full py-2 px-4 text-sm text-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Ingresar como dentista
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
