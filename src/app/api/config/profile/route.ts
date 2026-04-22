import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDentistFromAuth } from "@/lib/auth";
import { generateUniqueSlug, slugify } from "@/lib/slug";
import { z } from "zod";

const profileSchema = z.object({
  fullName: z.string().min(3).optional(),
  specialty: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  photoUrl: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  slug: z.string().optional().or(z.literal("")),
  isPublished: z.boolean().optional(),
  // PublicProfile
  bioPublic: z.string().max(2000).optional().or(z.literal("")),
  experience: z.string().optional().or(z.literal("")),
  languages: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  insuranceProviders: z.array(z.string()).optional(),
  acceptsInsurance: z.boolean().optional(),
  emergencyCare: z.boolean().optional(),
  education: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const dentist = await getDentistFromAuth();
    const data = profileSchema.parse(await req.json());

    // Slug: si viene custom, slugificar; si no hay slug y se publica, generar
    let slug: string | undefined = undefined;
    if (data.slug !== undefined && data.slug !== "") {
      const desired = slugify(data.slug);
      const existing = await prisma.dentist.findUnique({ where: { slug: desired } });
      if (existing && existing.id !== dentist.id) {
        return NextResponse.json({ message: "Ese slug ya está en uso" }, { status: 409 });
      }
      slug = desired;
    } else if (!dentist.slug && data.isPublished) {
      slug = await generateUniqueSlug(data.fullName || dentist.fullName, dentist.id);
    }

    await prisma.dentist.update({
      where: { id: dentist.id },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.specialty !== undefined && { specialty: data.specialty || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl || null }),
        ...(data.bio !== undefined && { bio: data.bio || null }),
        ...(slug !== undefined && { slug }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
    });

    // PublicProfile upsert
    const pub = {
      bioPublic: data.bioPublic ?? undefined,
      experience: data.experience ?? undefined,
      languages: data.languages ? JSON.stringify(data.languages) : undefined,
      paymentMethods: data.paymentMethods ? JSON.stringify(data.paymentMethods) : undefined,
      insuranceProviders: data.insuranceProviders ? JSON.stringify(data.insuranceProviders) : undefined,
      education: data.education ? JSON.stringify(data.education) : undefined,
      acceptsInsurance: data.acceptsInsurance ?? undefined,
      emergencyCare: data.emergencyCare ?? undefined,
    };

    const hasAnyPublic = Object.values(pub).some((v) => v !== undefined);
    if (hasAnyPublic) {
      await prisma.publicProfile.upsert({
        where: { dentistId: dentist.id },
        update: pub,
        create: { dentistId: dentist.id, ...pub },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config profile error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al actualizar" }, { status: 500 });
  }
}
