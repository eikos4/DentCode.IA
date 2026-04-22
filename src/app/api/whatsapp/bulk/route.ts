import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentDentistId } from "@/lib/utils";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { getTemplate, TEMPLATES, TemplateId } from "@/lib/whatsapp-templates";

const schema = z.object({
  patientIds: z.array(z.string()).min(1).max(200),
  templateId: z.enum(TEMPLATES.map(t => t.id) as [TemplateId, ...TemplateId[]]),
  customMessage: z.string().optional(),
});

export async function POST(req: Request) {
  const dentistId = await getCurrentDentistId();
  const data = schema.parse(await req.json());
  const template = getTemplate(data.templateId);

  const dentist = await prisma.dentist.findUnique({ where: { id: dentistId } });
  if (!dentist) return NextResponse.json({ error: "dentist not found" }, { status: 404 });

  const patients = await prisma.patient.findMany({
    where: { id: { in: data.patientIds }, dentistId },
    include: {
      appointments: { orderBy: { startAt: "asc" } },
    },
  });

  const now = new Date();
  let sent = 0, failed = 0, skipped = 0;
  const errors: { patientId: string; reason: string }[] = [];

  for (const p of patients) {
    if (!p.phone) { skipped++; errors.push({ patientId: p.id, reason: "sin teléfono" }); continue; }

    const nextAppt = p.appointments.find(a => a.startAt > now) ?? null;
    const lastVisit = [...p.appointments].reverse().find(a => a.startAt <= now) ?? null;

    const body = template.build(
      {
        fullName: p.fullName,
        firstName: p.fullName.split(" ")[0],
        nextAppointmentAt: nextAppt?.startAt ?? null,
        lastVisitAt: lastVisit?.startAt ?? null,
      },
      { dentistName: dentist.fullName },
      { customMessage: data.customMessage },
    );

    const res = await sendWhatsAppText(p.phone, body);
    if (res.ok) sent++;
    else { failed++; errors.push({ patientId: p.id, reason: res.error ?? "error" }); }
  }

  return NextResponse.json({ sent, failed, skipped, total: patients.length, errors });
}
