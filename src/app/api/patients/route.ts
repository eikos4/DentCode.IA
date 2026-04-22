import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentDentistId } from "@/lib/utils";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { getTemplate } from "@/lib/whatsapp-templates";

const schema = z.object({
  fullName: z.string().min(2),
  rut: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(["F", "M", "O"]).optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  commune: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  referredBy: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medicalHistory: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sendWelcome: z.boolean().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const dentistId = await getCurrentDentistId();
  const dentist = await prisma.dentist.findUnique({ where: { id: dentistId } });
  if (!dentist) return NextResponse.json({ error: "dentist not found" }, { status: 404 });

  const { birthDate, email, sendWelcome, ...rest } = parsed.data;

  const patient = await prisma.patient.create({
    data: {
      dentistId,
      ...rest,
      email: email || null,
      birthDate: birthDate ? new Date(birthDate) : null,
    },
  });

  let welcomeSent = false;
  if (sendWelcome && patient.phone) {
    const template = getTemplate("welcome");
    const msg = template.build(
      { fullName: patient.fullName, firstName: patient.fullName.split(" ")[0] },
      { dentistName: dentist.fullName },
    );
    const res = await sendWhatsAppText(patient.phone, msg);
    welcomeSent = res.ok;
  }

  return NextResponse.json({ ...patient, welcomeSent });
}
