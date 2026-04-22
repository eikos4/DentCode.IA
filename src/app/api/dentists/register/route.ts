import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cleanRut, isValidRut } from "@/lib/rut";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().min(8),
  rut: z.string().transform(cleanRut).refine(isValidRut, "RUT inválido"),
  licenseNumber: z.string().min(3),
  specialty: z.string().min(2),
  university: z.string().min(2),
  graduationYear: z.string().regex(/^\d{4}$/).transform(Number).refine((y) => y >= 1950 && y <= new Date().getFullYear()),
  clinicName: z.string().min(2),
  address: z.string().min(5),
  commune: z.string().min(2),
  region: z.string().min(2),
  plan: z.enum(["trial", "dentist", "clinic"]),
  termsAccepted: z.string().transform((v) => v === "true"),
  privacyAccepted: z.string().transform((v) => v === "true"),
  marketingAccepted: z.string().transform((v) => v === "true"),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: Record<string, any> = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = value;
      } else {
        data[key] = value.toString();
      }
    }

    // Validate
    const validated = registerSchema.parse(data);

    // Check if email already exists
    const existing = await prisma.dentist.findUnique({ where: { email: validated.email } });
    if (existing) {
      return NextResponse.json({ message: "Email ya registrado" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 12);

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    // Create dentist
    const dentist = await prisma.dentist.create({
      data: {
        email: validated.email,
        passwordHash,
        fullName: validated.fullName,
        phone: validated.phone,
        rut: validated.rut,
        licenseNumber: validated.licenseNumber,
        specialty: validated.specialty,
        bio: `Especialista en ${validated.specialty}, graduado de ${validated.university} en ${validated.graduationYear}.`,
        verificationToken,
        plan: validated.plan,
        planEndsAt: validated.plan === "trial" ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
        onboardingStep: 5,
        onboardingCompleted: true,
      },
    });

    // Create clinic location
    await prisma.clinicLocation.create({
      data: {
        dentistId: dentist.id,
        name: validated.clinicName,
        address: validated.address,
        commune: validated.commune,
        region: validated.region,
        // TODO: Geocode address to get lat/lng
      },
    });

    // TODO: Upload files and create VerificationDocument records
    // For now, just simulate file processing
    const files = ["licenseFile", "degreeFile", "idFile"];
    for (const fileKey of files) {
      if (data[fileKey] instanceof File) {
        const file = data[fileKey] as File;
        // TODO: Upload to S3/local storage
        const fileUrl = `/uploads/verification/${dentist.id}-${fileKey}`;
        await prisma.verificationDocument.create({
          data: {
            dentistId: dentist.id,
            type: fileKey.replace("File", ""),
            url: fileUrl,
            status: "pending",
          },
        });
      }
    }

    // TODO: Send verification email
    // await sendVerificationEmail(dentist.email, verificationToken);

    return NextResponse.json({ 
      success: true, 
      dentistId: dentist.id,
      message: "Registro completado. Revisa tu email para verificar tu cuenta." 
    });

  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al registrar" }, { status: 500 });
  }
}
