import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";

// GET - Listar laboratorios
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await requireRole(["CLINIC_ADMIN", "CLINIC_STAFF"]);

    const labs = await prisma.laboratory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        rut: true,
        email: true,
        phone: true,
        contactName: true,
        city: true,
        createdAt: true,
        _count: {
          select: { uploads: true },
        },
      },
    });

    return NextResponse.json({ laboratories: labs });
  } catch (error: any) {
    console.error("List labs error:", error);
    return NextResponse.json(
      { error: error.message || "Error al listar laboratorios" },
      { status: 401 }
    );
  }
}

// POST - Crear nuevo laboratorio
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    await requireRole(["CLINIC_ADMIN"]);

    const body = await req.json();
    const { name, rut, email, phone, contactName, address, city, password } = body;

    // Validaciones
    if (!name || !rut || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, RUT, email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que no existe
    const existing = await prisma.laboratory.findFirst({
      where: {
        OR: [{ email }, { rut }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un laboratorio con ese email o RUT" },
        { status: 400 }
      );
    }

    // Crear laboratorio
    const passwordHash = await bcrypt.hash(password, 10);

    const lab = await prisma.laboratory.create({
      data: {
        name,
        rut: rut.replace(/[.-]/g, "").toUpperCase(),
        email,
        phone,
        contactName,
        address,
        city,
        passwordHash,
      },
    });

    return NextResponse.json({
      success: true,
      laboratory: {
        id: lab.id,
        name: lab.name,
        email: lab.email,
        tempPassword: password, // Solo para mostrar una vez
      },
      message: "Laboratorio creado exitosamente",
    });
  } catch (error: any) {
    console.error("Create lab error:", error);
    return NextResponse.json(
      { error: error.message || "Error al crear laboratorio" },
      { status: 500 }
    );
  }
}
