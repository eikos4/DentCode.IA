import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MensajesPage() {
  const logs = await prisma.messageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { appointment: { include: { patient: true } } },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Mensajes</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Registro de WhatsApp enviados/recibidos. Si no configuras credenciales, los mensajes se guardan como <code>simulated</code>.
      </p>
      <div className="rounded-xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Paciente</th>
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2">{formatDateTime(m.createdAt)}</td>
                <td className="px-4 py-2">{m.appointment?.patient.fullName ?? "—"}</td>
                <td className="px-4 py-2">{m.to}</td>
                <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full bg-muted text-xs">{m.status}</span></td>
                <td className="px-4 py-2 max-w-md truncate">{m.body}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin mensajes aún.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
