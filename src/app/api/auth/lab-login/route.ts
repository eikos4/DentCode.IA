import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Buscar laboratorio por email
    const lab = await prisma.laboratory.findUnique({
      where: { email },
    });

    if (!lab || !lab.isActive) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Verificar contraseña
    const valid = await bcrypt.compare(password, lab.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Generar JWT
    const token = jwt.sign(
      {
        labId: lab.id,
        labName: lab.name,
        role: "LABORATORY",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Cookie con el token
    const response = NextResponse.json({
      success: true,
      lab: {
        id: lab.id,
        name: lab.name,
        email: lab.email,
      },
    });

    response.cookies.set({
      name: "lab_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error: any) {
    console.error("Lab login error:", error);
    return NextResponse.json(
      { error: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
