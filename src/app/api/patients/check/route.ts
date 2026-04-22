import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentDentistId } from "@/lib/utils";
import { cleanRut } from "@/lib/rut";

/**
 * GET /api/patients/check?rut=12345678-9&phone=+56987654321
 * Devuelve { duplicates: [{id, fullName, matchedBy}] } para alertar antes de crear.
 */
export async function GET(req: Request) {
  const dentistId = await getCurrentDentistId();
  const { searchParams } = new URL(req.url);
  const rut = searchParams.get("rut");
  const phone = searchParams.get("phone");

  const or: any[] = [];
  if (rut && cleanRut(rut).length >= 7) or.push({ rut: { contains: cleanRut(rut).slice(0, -1) } });
  if (phone) {
    const digits = phone.replace(/\D/g, "").slice(-8);
    if (digits.length >= 6) or.push({ phone: { contains: digits } });
  }
  if (or.length === 0) return NextResponse.json({ duplicates: [] });

  const matches = await prisma.patient.findMany({
    where: { dentistId, OR: or },
    select: { id: true, fullName: true, rut: true, phone: true },
    take: 5,
  });

  const duplicates = matches.map(m => ({
    id: m.id,
    fullName: m.fullName,
    rut: m.rut,
    phone: m.phone,
    matchedBy: rut && m.rut && cleanRut(m.rut) === cleanRut(rut) ? "rut" : "phone",
  }));

  return NextResponse.json({ duplicates });
}
