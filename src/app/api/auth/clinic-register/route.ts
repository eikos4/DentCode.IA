import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";

export async function POST(request: NextRequest) {
  try {
    const {
      clinicName,
      clinicRut,
      clinicPhone,
      clinicEmail,
      adminName,
      adminEmail,
      adminPassword,
    } = await request.json();

    // Validaciones básicas
    if (!clinicName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Datos requeridos faltantes" },
        { status: 400 }
      );
    }

    // Verificar si el email de admin ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El email de administrador ya está registrado" },
        { status: 400 }
      );
    }

    // Verificar si el RUT de clínica ya existe (si se proporciona)
    if (clinicRut) {
      const existingClinic = await prisma.clinic.findUnique({
        where: { rut: clinicRut },
      });

      if (existingClinic) {
        return NextResponse.json(
          { error: "El RUT de clínica ya está registrado" },
          { status: 400 }
        );
      }
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Crear clínica y usuario en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear clínica
      const clinic = await tx.clinic.create({
        data: {
          name: clinicName,
          rut: clinicRut || null,
          phone: clinicPhone || null,
          email: clinicEmail || null,
          plan: "trial",
          planEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días de trial
        },
      });

      // 2. Crear usuario administrador
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          passwordHash,
          role: "CLINIC_ADMIN",
          clinicId: clinic.id,
        },
      });

      return { clinic, user };
    });

    // Generar token JWT
    const token = jwt.sign(
      {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        clinicId: result.clinic.id,
        fullName: result.clinic.name,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        clinicId: result.clinic.id,
        clinicName: result.clinic.name,
      },
      clinic: result.clinic,
    });
  } catch (error) {
    console.error("Error en registro clínica:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
