import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClinicFromAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    const clinic = await getClinicFromAuth();

    if (clinic.role !== "CLINIC_ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden agregar dentistas." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { fullName, email, phone, specialty, licenseNumber } = parsed.data;

    // Verificar si ya existe
    const existing = await prisma.dentist.findUnique({ where: { email } });
    if (existing) {
      // Si ya existe, vincularlo a esta clínica
      if (existing.clinicId && existing.clinicId !== clinic.id) {
        return NextResponse.json(
          { error: "Este dentista ya pertenece a otra clínica." },
          { status: 400 }
        );
      }
      const updated = await prisma.dentist.update({
        where: { id: existing.id },
        data: { clinicId: clinic.id, isActive: true },
      });
      return NextResponse.json({ dentist: updated, action: "linked" }, { status: 200 });
    }

    // Crear nuevo dentista con contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const dentist = await prisma.dentist.create({
      data: {
        email,
        fullName,
        phone: phone ?? null,
        specialty: specialty ?? null,
        licenseNumber: licenseNumber ?? null,
        clinicId: clinic.id,
        passwordHash,
        isActive: true,
        onboardingCompleted: false,
        verificationStatus: "PENDING",
      },
    });

    return NextResponse.json({ dentist, tempPassword, action: "created" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
