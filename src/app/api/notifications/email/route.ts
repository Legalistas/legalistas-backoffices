import { type NextRequest, NextResponse } from "next/server";
import {
  sendEmail,
  CRM_COLUMN_TO_TEMPLATE,
  CASE_STAGE_TO_TEMPLATE,
} from "@/lib/email";

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
  "case-stage-documentacion": { sent: "Se envió email de Documentación", resent: "Se reenvió email de Documentación" },
  "case-stage-administrativo": { sent: "Se envió email de etapa Administrativa", resent: "Se reenvió email de etapa Administrativa" },
  "case-stage-judicial": { sent: "Se envió email de etapa Judicial", resent: "Se reenvió email de etapa Judicial" },
  "case-stage-incapacidad": { sent: "Se envió email de etapa Incapacidad", resent: "Se reenvió email de etapa Incapacidad" },
  "case-stage-cierre": { sent: "Se envió email de etapa Cierre", resent: "Se reenvió email de etapa Cierre" },
  "case-stage-experiencia": { sent: "Se envió email de Caso resuelto + reseña", resent: "Se reenvió email de Caso resuelto + reseña" },
  "case-stage-archivado": { sent: "Se envió email de Caso archivado", resent: "Se reenvió email de Caso archivado" },
  "case-informe-trimestral": { sent: "Se envió informe trimestral por email", resent: "Se reenvió informe trimestral por email" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      template,
      columnId,
      stageId,
      leadId,
      caseId,
      isResend,
      accessToken,
      variables,
    } = body;

    const resolvedTemplate =
      template ??
      (stageId != null ? CASE_STAGE_TO_TEMPLATE[stageId] : undefined) ??
      (columnId != null ? CRM_COLUMN_TO_TEMPLATE[columnId] : undefined);

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

    const logTitle = TEMPLATE_TITLES[resolvedTemplate]
      ? isResend
        ? TEMPLATE_TITLES[resolvedTemplate].resent
        : TEMPLATE_TITLES[resolvedTemplate].sent
      : isResend
        ? "Se reenvió email"
        : "Se envió email";

    const logBody = JSON.stringify({
      title: logTitle,
      description: `Email enviado a ${to}`,
    });

    const logHeaders = {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    // Registrar en historial del lead
    if (leadId) {
      try {
        await fetch(`${BACKEND_URL}/crm/leads/${leadId}/email-log`, {
          method: "POST",
          headers: logHeaders,
          body: logBody,
        });
      } catch (logError) {
        console.error("[Email API] Error registrando log de lead:", logError);
      }
    }

    // Registrar en historial del caso
    if (caseId) {
      try {
        await fetch(`${BACKEND_URL}/cases/${caseId}/email-log`, {
          method: "POST",
          headers: logHeaders,
          body: logBody,
        });
      } catch (logError) {
        console.error("[Email API] Error registrando log de caso:", logError);
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
