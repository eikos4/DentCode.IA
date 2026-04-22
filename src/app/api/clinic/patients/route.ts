import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClinicFromAuth } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2),
  dentistId: z.string().optional().nullable(),
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
});

export async function POST(req: Request) {
  try {
    const clinic = await getClinicFromAuth();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { birthDate, email, dentistId, ...rest } = parsed.data;

    // Resolver dentistId: usar el provisto o el primero activo de la clínica
    let resolvedDentistId = dentistId;
    if (!resolvedDentistId) {
      const firstDentist = await prisma.dentist.findFirst({
        where: { clinicId: clinic.id, isActive: true },
        select: { id: true },
        orderBy: { fullName: "asc" },
      });
      if (!firstDentist) {
        return NextResponse.json(
          { error: "La clínica no tiene dentistas activos. Agrega un dentista primero." },
          { status: 400 }
        );
      }
      resolvedDentistId = firstDentist.id;
    }

    const patient = await prisma.patient.create({
      data: {
        dentistId: resolvedDentistId,
        clinicId: clinic.id,
        ...rest,
        email: email || null,
        birthDate: birthDate ? new Date(birthDate) : null,
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const clinic = await getClinicFromAuth();

    const patients = await prisma.patient.findMany({
      where: { clinicId: clinic.id },
      select: {
        id: true,
        fullName: true,
        rut: true,
        phone: true,
        email: true,
        birthDate: true,
        gender: true,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ patients });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
