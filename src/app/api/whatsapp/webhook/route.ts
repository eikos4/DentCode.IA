import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook WhatsApp Cloud API.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */

// Verificación inicial (GET) — Meta envía hub.challenge.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === (process.env.WHATSAPP_VERIFY_TOKEN ?? "dentcode-verify")) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

// Eventos entrantes (mensajes del paciente).
export async function POST(req: Request) {
  const body = await req.json();
  try {
    const changes = body?.entry?.[0]?.changes?.[0]?.value;
    const msg = changes?.messages?.[0];
    if (msg) {
      const from: string = msg.from;
      const text: string = (msg.text?.body ?? msg.button?.text ?? "").trim().toLowerCase();

      await prisma.messageLog.create({
        data: { channel: "whatsapp", direction: "in", to: from, body: text, status: "received" },
      });

      // Busca la próxima cita de ese teléfono y aplica confirmación/cancelación simple.
      const patient = await prisma.patient.findFirst({ where: { phone: { contains: from.slice(-8) } } });
      if (patient) {
        const next = await prisma.appointment.findFirst({
          where: { patientId: patient.id, startAt: { gte: new Date() } },
          orderBy: { startAt: "asc" },
        });
        if (next) {
          if (/^(si|sí|1|confirmo|ok)$/.test(text)) {
            await prisma.appointment.update({ where: { id: next.id }, data: { status: "CONFIRMED" } });
          } else if (/^(no|cancelar|2)$/.test(text)) {
            await prisma.appointment.update({ where: { id: next.id }, data: { status: "CANCELLED" } });
          }
        }
      }
    }
  } catch (err) {
    console.error("webhook error", err);
  }
  return NextResponse.json({ ok: true });
}
