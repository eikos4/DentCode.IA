import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClinicFromAuth } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  commune: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const clinic = await getClinicFromAuth();

    if (clinic.role !== "CLINIC_ADMIN") {
      return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        ...parsed.data,
        email: parsed.data.email || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
