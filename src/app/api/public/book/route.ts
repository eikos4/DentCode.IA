import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getAvailableSlots } from "@/lib/availability";

const bookSchema = z.object({
  slug: z.string().min(1),
  serviceId: z.string().optional(),
  startIso: z.string().min(1), // YYYY-MM-DDTHH:mm
  durationMin: z.number().int().positive().max(480),
  patient: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional().or(z.literal("")),
    rut: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bookSchema.parse(body);

    const dentist = await prisma.dentist.findUnique({
      where: { slug: data.slug },
      select: { id: true, isPublished: true },
    });
    if (!dentist || !dentist.isPublished) {
      return NextResponse.json({ message: "Dentista no disponible" }, { status: 404 });
    }

    // Parse iso local
    const [datePart, timePart] = data.startIso.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm] = (timePart || "00:00").split(":").map(Number);
    const startAt = new Date(y, m - 1, d, hh, mm, 0, 0);
    if (isNaN(startAt.getTime())) {
      return NextResponse.json({ message: "Hora inválida" }, { status: 400 });
    }
    if (startAt < new Date()) {
      return NextResponse.json({ message: "La hora seleccionada ya pasó" }, { status: 400 });
    }

    // Valida que el slot siga disponible
    const slots = await getAvailableSlots({
      dentistId: dentist.id,
      date: startAt,
      durationMin: data.durationMin,
    });
    const isAvailable = slots.some((s) => s.iso === data.startIso);
    if (!isAvailable) {
      return NextResponse.json(
        { message: "Ese horario ya no está disponible. Elige otro." },
        { status: 409 },
      );
    }

    // Servicio (si aplica)
    let service = null;
    if (data.serviceId) {
      service = await prisma.serviceOffering.findFirst({
        where: { id: data.serviceId, dentistId: dentist.id, active: true },
      });
    }

    // Busca o crea paciente por teléfono/email/rut
    const phoneClean = data.patient.phone.replace(/\s+/g, "");
    const existingPatient = await prisma.patient.findFirst({
      where: {
        dentistId: dentist.id,
        OR: [
          { phone: phoneClean },
          ...(data.patient.email ? [{ email: data.patient.email }] : []),
          ...(data.patient.rut ? [{ rut: data.patient.rut }] : []),
        ],
      },
    });

    const patient = existingPatient
      ? existingPatient
      : await prisma.patient.create({
          data: {
            dentistId: dentist.id,
            fullName: data.patient.fullName,
            phone: phoneClean,
            email: data.patient.email || null,
            rut: data.patient.rut || null,
            notes: data.patient.notes
              ? `[Auto-agendado]\n${data.patient.notes}`
              : "[Auto-agendado desde perfil público]",
          },
        });

    const endAt = new Date(startAt.getTime() + data.durationMin * 60000);

    const appointment = await prisma.appointment.create({
      data: {
        dentistId: dentist.id,
        patientId: patient.id,
        startAt,
        endAt,
        treatment: service?.name || "Consulta",
        priceCLP: service?.priceCLP || null,
        status: "SCHEDULED",
        notes: data.patient.notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      startAt: appointment.startAt,
    });
  } catch (error) {
    console.error("Public book error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al agendar" }, { status: 500 });
  }
}
