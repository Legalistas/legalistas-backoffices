import { type NextRequest, NextResponse } from "next/server";
import { sendEmail, CRM_COLUMN_TO_TEMPLATE } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, template, columnId, variables } = body;

    // Si viene columnId, resolver el template automáticamente
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Email API] Error enviando email:", error);
    return NextResponse.json(
      { error: "Error al enviar el email" },
      { status: 500 }
    );
  }
}
