import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reviewSchema = z.object({
  token: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  treatment: z.string().optional().or(z.literal("")),
  comment: z.string().max(500).optional().or(z.literal("")),
  patientName: z.string().min(2).max(80),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = reviewSchema.parse(body);

    const request = await prisma.reviewRequest.findUnique({
      where: { token: data.token },
    });
    if (!request) {
      return NextResponse.json({ message: "Enlace inválido" }, { status: 404 });
    }
    if (request.submittedAt) {
      return NextResponse.json({ message: "Ya enviaste una reseña con este enlace" }, { status: 409 });
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      return NextResponse.json({ message: "Este enlace ha expirado" }, { status: 410 });
    }

    const review = await prisma.review.create({
      data: {
        dentistId: request.dentistId,
        patientName: data.patientName,
        rating: data.rating,
        comment: data.comment || null,
        treatment: data.treatment || null,
        verified: true, // viene con token válido
        published: false, // requiere moderación
      },
    });

    await prisma.reviewRequest.update({
      where: { id: request.id },
      data: { submittedAt: new Date(), reviewId: review.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Public review error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al enviar reseña" }, { status: 500 });
  }
}
