import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLabToken } from "@/lib/lab-auth";

// Función para normalizar RUT (quitar puntos y guión)
function normalizeRut(rut: string): string {
  return rut.replace(/[.-]/g, "").toUpperCase();
}

// GET - Buscar paciente por RUT (para laboratorios)
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación de laboratorio
    const lab = await verifyLabToken(req);
    if (!lab) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rut = searchParams.get("rut");

    if (!rut) {
      return NextResponse.json(
        { error: "RUT es requerido" },
        { status: 400 }
      );
    }

    // Normalizar el RUT de búsqueda (quitar puntos y guión)
    const searchRut = normalizeRut(rut);

    // Traer pacientes y filtrar en memoria (para manejar RUT con/sin puntos)
    const allPatients = await prisma.patient.findMany({
      where: {
        rut: { not: null }, // Solo pacientes con RUT
      },
      select: {
        id: true,
        fullName: true,
        rut: true,
        birthDate: true,
        gender: true,
        phone: true,
        email: true,
        clinic: {
          select: { name: true },
        },
        dentist: {
          select: { fullName: true, specialty: true },
        },
      },
    });

    // Filtrar pacientes cuyo RUT normalizado contenga el RUT buscado
    const patients = allPatients.filter(p => {
      if (!p.rut) return false;
      const normalizedPatientRut = normalizeRut(p.rut);
      return normalizedPatientRut.includes(searchRut) || searchRut.includes(normalizedPatientRut);
    }).slice(0, 5);

    return NextResponse.json({
      patients,
      count: patients.length,
    });
  } catch (error: any) {
    console.error("Lab patient search error:", error);
    return NextResponse.json(
      { error: "Error al buscar paciente" },
      { status: 500 }
    );
  }
}
