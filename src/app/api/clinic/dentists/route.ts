import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClinicFromAuth } from "@/lib/auth";

export async function GET() {
  try {
    const clinic = await getClinicFromAuth();

    const dentists = await prisma.dentist.findMany({
      where: { clinicId: clinic.id, isActive: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        specialty: true,
        phone: true,
        isActive: true,
      },
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ dentists });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
