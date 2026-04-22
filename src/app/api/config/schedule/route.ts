import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDentistFromAuth } from "@/lib/auth";
import { z } from "zod";

// Reemplaza todo el horario semanal de una vez (bulk upsert simple).
const dayBlockSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  enabled: z.boolean(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  slotMinutes: z.number().int().min(10).max(240).default(30),
});
const bodySchema = z.object({
  blocks: z.array(dayBlockSchema),
});

export async function PUT(req: NextRequest) {
  try {
    const dentist = await getDentistFromAuth();
    const { blocks } = bodySchema.parse(await req.json());

    await prisma.$transaction([
      prisma.weeklySchedule.deleteMany({ where: { dentistId: dentist.id } }),
      ...blocks
        .filter((b) => b.enabled)
        .map((b) =>
          prisma.weeklySchedule.create({
            data: {
              dentistId: dentist.id,
              dayOfWeek: b.dayOfWeek,
              openTime: b.openTime,
              closeTime: b.closeTime,
              slotMinutes: b.slotMinutes,
              enabled: true,
            },
          }),
        ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Schedule error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: "Error al actualizar horario" }, { status: 500 });
  }
}
