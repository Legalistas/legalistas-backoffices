import { Heading, Hr, Text } from "@react-email/components";
import { EmailLayout } from "./layout";

interface Props {
	leadName?: string;
}

export function CrmPendienteConfirmacionRecordatorioTemplate({
	leadName = "Cliente",
}: Props) {
	const firstName = leadName.split(" ")[0];

	return (
		<EmailLayout preview="Estamos esperando tu confirmación — Legalistas">
			<Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
				Recordatorio · Hola, {firstName}
			</Text>
			<Heading
				as="h2"
				className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
			>
				Estamos esperando tu confirmación
			</Heading>

			<Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
				Queremos recordarte que estamos esperando tu confirmación para poder
				avanzar con tu caso.
			</Text>

			<Text className="text-[#374151] text-[15px] leading-7 m-0 mt-4">
				Si tenés alguna duda o necesitás más información antes de confirmar,
				no dudes en contactarnos. Estamos para ayudarte.
			</Text>

			<Hr className="border-[#e5e7eb] my-6" />

			<Text className="text-[#6b7280] text-[14px] leading-6 m-0">
				Saludos,
				<br />
				<strong className="text-[#1f2937]">Equipo Legalistas</strong>
			</Text>
		</EmailLayout>
	);
}
