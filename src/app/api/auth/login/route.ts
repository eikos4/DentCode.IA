import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, remember } = loginSchema.parse(body);

    // Find dentist
    const dentist = await prisma.dentist.findUnique({
      where: { email },
    });

    if (!dentist || !dentist.passwordHash) {
      return NextResponse.json(
        { message: "Email o contraseña incorrectos" },
        { status: 401 }
      );
    }

    // Check password
    const passwordValid = await bcrypt.compare(password, dentist.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { message: "Email o contraseña incorrectos" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.dentist.update({
      where: { id: dentist.id },
      data: { lastLoginAt: new Date() },
    });

    // Create JWT token
    const maxAgeSeconds = remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30d vs 1d
    const token = jwt.sign(
      { 
        id: dentist.id,
        dentistId: dentist.id, 
        email: dentist.email,
        fullName: dentist.fullName,
        role: "DENTIST",
      },
      JWT_SECRET,
      { expiresIn: maxAgeSeconds }
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      dentist: {
        id: dentist.id,
        email: dentist.email,
        fullName: dentist.fullName,
        verificationStatus: dentist.verificationStatus,
        plan: dentist.plan,
      },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: maxAgeSeconds,
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Datos inválidos", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Error al iniciar sesión" },
      { status: 500 }
    );
  }
}
