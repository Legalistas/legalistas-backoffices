import { type NextRequest, NextResponse } from "next/server";
import { sendEmail, CRM_COLUMN_TO_TEMPLATE } from "@/lib/email";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL_API || "http://localhost:5000/api/v1";

const TEMPLATE_TITLES: Record<string, string> = {
  "crm-nueva-consulta": "Se envió mensaje de Bienvenida",
  "crm-reunion-concretar": "Se envió mensaje de Reunión a concretar",
  "crm-reunion-recordatorio": "Se envió recordatorio de Reunión",
  "crm-en-tratamiento": "Se envió mensaje de En tratamiento",
  "crm-en-tratamiento-recordatorio": "Se envió recordatorio de Tratamiento",
  "crm-pendiente-poder": "Se envió mensaje de Pendiente poder",
  "crm-pendiente-poder-recordatorio": "Se envió recordatorio de Poder",
  "crm-ganado-poder": "Se envió mensaje de Ganado poder",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, template, columnId, leadId, variables } = body;

    const resolvedTemplate = template ?? CRM_COLUMN_TO_TEMPLATE[columnId];

    if (!resolvedTemplate) {
      return NextResponse.json(
        { error: "Template no encontrado para la etapa indicada" },
        { status: 400 }
      );
    }

    if (!to) {
      return NextResponse.json(
        { error: "El campo 'to' (email destino) es requerido" },
        { status: 400 }
      );
    }

    await sendEmail({
      to,
      template: resolvedTemplate,
      variables: variables ?? {},
    });

    // Registrar en historial del lead
    if (leadId) {
      try {
        await fetch(
          `${BACKEND_URL}/crm/leads/${leadId}/email-log`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: TEMPLATE_TITLES[resolvedTemplate] || "Se envió email",
              description: `Email enviado a ${to}`,
            }),
          }
        );
      } catch (logError) {
        console.error("[Email API] Error registrando log:", logError);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Email API] Error enviando email:", error);
    return NextResponse.json(
      { error: "Error al enviar el email" },
      { status: 500 }
    );
  }
}
