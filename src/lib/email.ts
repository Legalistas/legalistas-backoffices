import { render } from "@react-email/render";
import nodemailer from "nodemailer";
import { CrmNuevaConsultaTemplate } from "./email/crm-nueva-consulta";
import { CrmReunionConcretarTemplate } from "./email/crm-reunion-concretar";
import { CrmReunionRecordatorioTemplate } from "./email/crm-reunion-recordatorio";
import { CrmEnTratamientoTemplate } from "./email/crm-en-tratamiento";
import { CrmEnTratamientoRecordatorioTemplate } from "./email/crm-en-tratamiento-recordatorio";
import { CrmPendientePoderTemplate } from "./email/crm-pendiente-poder";
import { CrmPendientePoderRecordatorioTemplate } from "./email/crm-pendiente-poder-recordatorio";
import { CrmGanadoPoderTemplate } from "./email/crm-ganado-poder";
import { CaseInicioTramiteTemplate } from "./email/case-inicio-tramite";

// ─────────────────────────────────────────────────
// SMTP Configuration
// ─────────────────────────────────────────────────

function createTransport() {
  const provider = process.env.SMTP_PROVIDER ?? "generic";
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";

  if (provider === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  const port = Number(process.env.SMTP_PORT ?? 465);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "mail.legalistas.ar",
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const FROM = process.env.SMTP_FROM || `Legalistas <${process.env.SMTP_USER}>`;

// ─────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────

type EmailTemplate =
  | "crm-nueva-consulta"
  | "crm-reunion-concretar"
  | "crm-reunion-recordatorio"
  | "crm-en-tratamiento"
  | "crm-en-tratamiento-recordatorio"
  | "crm-pendiente-poder"
  | "crm-pendiente-poder-recordatorio"
  | "crm-ganado-poder"
  | "case-inicio-tramite";

interface TemplateVars {
  leadName?: string;
  // Reunión
  meetingType?: string;
  date?: string;
  hours?: string;
  phoneNumber?: string;
  confirmationUrl?: string;
  // Caso
  customerName?: string;
  caseNumber?: string;
  caseTitle?: string;
  serviceName?: string;
  injury?: string;
  accidentDate?: string;
  responsibleLawyerName?: string;
}

/** Mapea columnId del CRM → template de email (cambio de etapa) */
export const CRM_COLUMN_TO_TEMPLATE: Partial<Record<number, EmailTemplate>> = {
  1: "crm-nueva-consulta",
  4: "crm-en-tratamiento",
  9: "crm-ganado-poder",
};

async function renderTemplate(
  template: EmailTemplate,
  vars: TemplateVars
): Promise<{ subject: string; html: string }> {
  switch (template) {
    case "crm-nueva-consulta":
      return {
        subject: "Recibimos tu consulta — Legalistas",
        html: await render(
          CrmNuevaConsultaTemplate({ leadName: vars.leadName })
        ),
      };

    case "crm-reunion-concretar":
      return {
        subject: "Tu reunión fue registrada — Legalistas",
        html: await render(
          CrmReunionConcretarTemplate({
            leadName: vars.leadName,
            meetingType: vars.meetingType,
            date: vars.date,
            hours: vars.hours,
            phoneNumber: vars.phoneNumber,
            confirmationUrl: vars.confirmationUrl,
          })
        ),
      };

    case "crm-reunion-recordatorio":
      return {
        subject: "Recordatorio: tu reunión es pronto — Legalistas",
        html: await render(
          CrmReunionRecordatorioTemplate({
            leadName: vars.leadName,
            meetingType: vars.meetingType,
            date: vars.date,
            hours: vars.hours,
            phoneNumber: vars.phoneNumber,
            confirmationUrl: vars.confirmationUrl,
          })
        ),
      };

    case "crm-en-tratamiento":
      return {
        subject: "Tu caso está en tratamiento — Legalistas",
        html: await render(
          CrmEnTratamientoTemplate({ leadName: vars.leadName })
        ),
      };

    case "crm-en-tratamiento-recordatorio":
      return {
        subject: "¿Cómo va tu recuperación? — Legalistas",
        html: await render(
          CrmEnTratamientoRecordatorioTemplate({ leadName: vars.leadName })
        ),
      };

    case "crm-pendiente-poder":
      return {
        subject: "Firma de autorización pendiente — Legalistas",
        html: await render(
          CrmPendientePoderTemplate({
            leadName: vars.leadName,
            meetingType: vars.meetingType,
            date: vars.date,
            hours: vars.hours,
            phoneNumber: vars.phoneNumber,
            confirmationUrl: vars.confirmationUrl,
          })
        ),
      };

    case "crm-pendiente-poder-recordatorio":
      return {
        subject: "Recordatorio: tu autorización sigue pendiente — Legalistas",
        html: await render(
          CrmPendientePoderRecordatorioTemplate({
            leadName: vars.leadName,
            confirmationUrl: vars.confirmationUrl,
          })
        ),
      };

    case "crm-ganado-poder":
      return {
        subject: "¡Recibimos tu autorización! — Legalistas",
        html: await render(
          CrmGanadoPoderTemplate({ leadName: vars.leadName })
        ),
      };

    case "case-inicio-tramite":
      return {
        subject: "Certificado de inicio de trámite — Legalistas",
        html: await render(
          CaseInicioTramiteTemplate({
            customerName: vars.customerName,
            caseNumber: vars.caseNumber,
            caseTitle: vars.caseTitle,
            serviceName: vars.serviceName,
            injury: vars.injury,
            accidentDate: vars.accidentDate,
            responsibleLawyerName: vars.responsibleLawyerName,
          })
        ),
      };
  }
}

// ─────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  variables: TemplateVars;
}

export async function sendEmail({
  to,
  template,
  variables,
}: SendEmailOptions): Promise<void> {
  const { subject, html } = await renderTemplate(template, variables);
  const transport = createTransport();

  await transport.sendMail({
    from: FROM,
    to,
    subject,
    html,
  });
}
