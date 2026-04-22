import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDentistFromAuth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  address: z.string().optional().or(z.literal("")),
  commune: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const dentist = await getDentistFromAuth();
    const data = schema.parse(await req.json());
    const loc = await prisma.clinicLocation.create({
      data: {
        dentistId: dentist.id,
        name: data.name,
        address: data.address || null,
        commune: data.commune || null,
        city: data.city || null,
        region: data.region || null,
        phone: data.phone || null,
      },
    });
    return NextResponse.json({ success: true, location: loc });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al crear sede" }, { status: 500 });
  }
}
