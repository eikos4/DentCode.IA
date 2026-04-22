import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentDentistId } from "@/lib/utils";
import { buildConfirmationMessage, sendWhatsAppText } from "@/lib/whatsapp";

const schema = z.object({
  patientId: z.string(),
  startAt: z.string(),
  durationMin: z.number().min(5).max(480).default(30),
  treatment: z.string().optional().nullable(),
  priceCLP: z.number().int().nullable().optional(),
  notifyWhatsApp: z.boolean().optional(),
  locationId: z.string().optional(),
});

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const dentistId = await getCurrentDentistId();
  const patient = await prisma.patient.findFirst({ where: { id: body.patientId, dentistId }, include: { dentist: true } });
  if (!patient) return NextResponse.json({ error: "patient not found" }, { status: 404 });

  const startAt = new Date(body.startAt);
  const endAt = new Date(startAt.getTime() + body.durationMin * 60_000);

  const appt = await prisma.appointment.create({
    data: {
      dentistId,
      patientId: body.patientId,
      startAt,
      endAt,
      treatment: body.treatment ?? null,
      priceCLP: body.priceCLP ?? null,
      locationId: body.locationId ?? null,
    },
  });

  if (body.notifyWhatsApp && patient.phone) {
    const msg = buildConfirmationMessage({
      patientName: patient.fullName.split(" ")[0],
      dentistName: patient.dentist.fullName,
      startAt,
    });
    await sendWhatsAppText(patient.phone, msg, appt.id);
  }

  return NextResponse.json(appt);
}
