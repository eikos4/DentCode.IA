import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClinicFromAuth } from "@/lib/auth";

const schema = z.object({
  dentistId: z.string(),
  patientId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  treatment: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  priceCLP: z.number().optional().nullable(),
  locationId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const clinic = await getClinicFromAuth();

    // CLINIC_ADMIN y CLINIC_STAFF pueden crear citas
    if (clinic.role !== "CLINIC_ADMIN" && clinic.role !== "CLINIC_STAFF") {
      return NextResponse.json({ error: "Sin permisos para crear citas" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { dentistId, patientId, startAt, endAt, treatment, notes, priceCLP, locationId } = parsed.data;

    // Verificar que el dentista pertenezca a la clínica
    const dentist = await prisma.dentist.findFirst({
      where: { id: dentistId, clinicId: clinic.id, isActive: true },
    });
    if (!dentist) {
      return NextResponse.json({ error: "Dentista no encontrado o no pertenece a la clínica" }, { status: 400 });
    }

    // Verificar que el paciente pertenezca a la clínica
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId: clinic.id },
    });
    if (!patient) {
      return NextResponse.json({ error: "Paciente no encontrado o no pertenece a la clínica" }, { status: 400 });
    }

    // Verificar solapamiento de citas para ese dentista
    const overlapping = await prisma.appointment.findFirst({
      where: {
        dentistId,
        status: { not: "CANCELLED" },
        OR: [
          { startAt: { lt: new Date(endAt) }, endAt: { gt: new Date(startAt) } },
        ],
      },
    });
    if (overlapping) {
      return NextResponse.json({ error: "El dentista ya tiene una cita en ese horario" }, { status: 409 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        dentistId,
        patientId,
        clinicId: clinic.id,
        locationId: locationId || null,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        treatment: treatment || null,
        notes: notes || null,
        priceCLP: priceCLP || null,
        status: "SCHEDULED",
      },
      include: {
        dentist: { select: { fullName: true, specialty: true } },
        patient: { select: { fullName: true, phone: true } },
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const clinic = await getClinicFromAuth();

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const dentistId = searchParams.get("dentistId");

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    const whereClause: any = {
      clinicId: clinic.id,
      startAt: { gte: startDate, lte: endDate },
      status: { not: "CANCELLED" },
    };

    if (dentistId) {
      whereClause.dentistId = dentistId;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        dentist: { select: { id: true, fullName: true, specialty: true } },
        patient: { select: { fullName: true, phone: true } },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
