import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDentistFromAuth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  patientName: z.string().min(2),
  patientPhone: z.string().optional().or(z.literal("")),
  patientEmail: z.string().email().optional().or(z.literal("")),
  appointmentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const dentist = await getDentistFromAuth();
    const data = schema.parse(await req.json());

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const request = await prisma.reviewRequest.create({
      data: {
        dentistId: dentist.id,
        patientName: data.patientName,
        patientPhone: data.patientPhone || null,
        patientEmail: data.patientEmail || null,
        appointmentId: data.appointmentId || null,
        expiresAt,
      },
    });

    return NextResponse.json({ success: true, token: request.token });
  } catch (error) {
    console.error("Review request error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al crear solicitud" }, { status: 500 });
  }
}
