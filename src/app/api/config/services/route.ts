import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDentistFromAuth } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().or(z.literal("")),
  durationMin: z.number().int().min(5).max(480),
  priceCLP: z.number().int().min(0).nullable().optional(),
  order: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const dentist = await getDentistFromAuth();
    const data = createSchema.parse(await req.json());
    const service = await prisma.serviceOffering.create({
      data: {
        dentistId: dentist.id,
        name: data.name,
        description: data.description || null,
        durationMin: data.durationMin,
        priceCLP: data.priceCLP ?? null,
        order: data.order ?? 0,
      },
    });
    return NextResponse.json({ success: true, service });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al crear servicio" }, { status: 500 });
  }
}
