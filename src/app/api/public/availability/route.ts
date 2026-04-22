import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const duration = Number(searchParams.get("duration") || "30");

  if (!slug || !dateStr) {
    return NextResponse.json({ message: "slug y date son requeridos" }, { status: 400 });
  }

  const dentist = await prisma.dentist.findUnique({
    where: { slug },
    select: { id: true, isPublished: true },
  });
  if (!dentist || !dentist.isPublished) {
    return NextResponse.json({ message: "Dentista no encontrado" }, { status: 404 });
  }

  // Parse date as local (evita shift UTC)
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ message: "Fecha inválida" }, { status: 400 });
  }

  const slots = await getAvailableSlots({
    dentistId: dentist.id,
    date,
    durationMin: duration,
  });

  return NextResponse.json({
    slots: slots.map((s) => ({
      iso: s.iso,
      time: s.start.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    })),
  });
}
