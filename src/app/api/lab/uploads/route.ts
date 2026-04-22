import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { join } from "path";
import { verifyLabToken } from "@/lib/lab-auth";

// Tamaño máximo: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Tipos permitidos
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/dicom",
  "application/octet-stream", // Algunos DICOM
];

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación de laboratorio
    const lab = await verifyLabToken(req);
    if (!lab) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const patientRut = formData.get("patientRut") as string;
    const subtype = formData.get("subtype") as string;
    const description = formData.get("description") as string;

    // Validaciones
    if (!file || !patientRut) {
      return NextResponse.json(
        { error: "Archivo y RUT del paciente son requeridos" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Use JPG, PNG o DICOM" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Archivo demasiado grande (máx 50MB)" },
        { status: 400 }
      );
    }

    // Limpiar RUT (quitar puntos y guión)
    const cleanRut = patientRut.replace(/[.-]/g, "").toUpperCase();

    // Buscar si existe paciente con ese RUT
    const patient = await prisma.patient.findFirst({
      where: {
        rut: {
          contains: cleanRut,
        },
      },
      select: { id: true, fullName: true, rut: true },
    });

    // Generar nombre único de archivo
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}_${originalName}`;

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), "public", "uploads", "lab", lab.labId);
    await mkdir(uploadDir, { recursive: true });

    // Guardar archivo
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // URL pública del archivo
    const fileUrl = `/uploads/lab/${lab.labId}/${fileName}`;

    // Crear registro en la base de datos
    const upload = await prisma.labUpload.create({
      data: {
        labId: lab.labId,
        patientRut: cleanRut,
        patientId: patient?.id || null, // Vincular automáticamente si existe
        fileName: originalName,
        fileUrl,
        fileType: file.type,
        category: "radiograph",
        subtype: subtype || null,
        description: description || null,
        isMatched: !!patient?.id,
        matchedAt: patient?.id ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      upload: {
        id: upload.id,
        fileUrl,
        patientFound: !!patient,
        patientName: patient?.fullName || null,
        isMatched: !!patient?.id,
      },
      message: patient
        ? "Radiografía subida y vinculada automáticamente al paciente"
        : "Radiografía subida. Pendiente de vinculación por la clínica.",
    });
  } catch (error: any) {
    console.error("Lab upload error:", error);
    return NextResponse.json(
      { error: "Error al subir la radiografía" },
      { status: 500 }
    );
  }
}

// GET - Listar uploads del laboratorio
export async function GET(req: NextRequest) {
  try {
    const lab = await verifyLabToken(req);
    if (!lab) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const uploads = await prisma.labUpload.findMany({
      where: { labId: lab.labId },
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: { fullName: true, rut: true },
        },
      },
    });

    return NextResponse.json({ uploads });
  } catch (error: any) {
    console.error("List uploads error:", error);
    return NextResponse.json(
      { error: "Error al listar radiografías" },
      { status: 500 }
    );
  }
}
