import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";

// GET - Listar radiografías pendientes de vinculación
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    await requireRole(["CLINIC_ADMIN", "CLINIC_STAFF"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // pending | matched | all
    const patientRut = searchParams.get("rut");

    // Buscar uploads donde el paciente pertenezca a esta clínica
    const where: any = {};

    if (status === "pending") {
      where.isMatched = false;
    } else if (status === "matched") {
      where.isMatched = true;
    }

    if (patientRut) {
      where.patientRut = {
        contains: patientRut.replace(/[.-]/g, ""),
      };
    }

    const uploads = await prisma.labUpload.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        laboratory: {
          select: { name: true, contactName: true, phone: true },
        },
        patient: {
          select: { id: true, fullName: true, rut: true, clinicId: true },
          where: user.clinicId ? { clinicId: user.clinicId } : undefined,
        },
      },
    });

    // Filtrar solo uploads de pacientes de esta clínica
    const filteredUploads = user.clinicId 
      ? uploads.filter(u => !u.patient || u.patient.clinicId === user.clinicId)
      : uploads;

    // Contar pendientes de esta clínica
    const pendingCount = filteredUploads.filter(u => !u.isMatched).length;

    return NextResponse.json({
      uploads: filteredUploads,
      pendingCount,
    });
  } catch (error: any) {
    console.error("List lab uploads error:", error);
    return NextResponse.json(
      { error: error.message || "Error al listar radiografías" },
      { status: 401 }
    );
  }
}
