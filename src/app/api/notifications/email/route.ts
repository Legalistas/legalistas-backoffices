import { type NextRequest, NextResponse } from "next/server";
import { sendEmail, CRM_COLUMN_TO_TEMPLATE } from "@/lib/email";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL_API || "http://localhost:5000/api/v1";

const TEMPLATE_TITLES: Record<string, { sent: string; resent: string }> = {
  "crm-nueva-consulta": { sent: "Se envió email de Bienvenida", resent: "Se reenvió email de Bienvenida" },
  "crm-reunion-concretar": { sent: "Se envió email con datos de la reunión", resent: "Se reenvió email con datos de la reunión" },
  "crm-reunion-recordatorio": { sent: "Se envió recordatorio de reunión", resent: "Se reenvió recordatorio de reunión" },
  "crm-en-tratamiento": { sent: "Se envió email de En tratamiento", resent: "Se reenvió email de En tratamiento" },
  "crm-en-tratamiento-recordatorio": { sent: "Se envió recordatorio de tratamiento", resent: "Se reenvió recordatorio de tratamiento" },
  "crm-pendiente-poder": { sent: "Se envió email de Pendiente poder", resent: "Se reenvió email de Pendiente poder" },
  "crm-pendiente-poder-recordatorio": { sent: "Se envió recordatorio de poder", resent: "Se reenvió recordatorio de poder" },
  "crm-ganado-poder": { sent: "Se envió email de Tu trámite está por iniciar", resent: "Se reenvió email de Tu trámite está por iniciar" },
  "case-inicio-tramite": { sent: "Se envió certificado de inicio de trámite", resent: "Se reenvió certificado de inicio de trámite" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, template, columnId, leadId, isResend, accessToken, variables } = body;

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
            headers: {
              "Content-Type": "application/json",
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
              title: TEMPLATE_TITLES[resolvedTemplate]
                ? isResend ? TEMPLATE_TITLES[resolvedTemplate].resent : TEMPLATE_TITLES[resolvedTemplate].sent
                : isResend ? "Se reenvió email" : "Se envió email",
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
