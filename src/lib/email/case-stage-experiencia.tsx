import { Button, Heading, Hr, Section, Text } from "@react-email/components";
import { CaseInfoBlock, type CaseInfo } from "./_case-info-block";
import { EmailLayout } from "./layout";

interface Props extends CaseInfo {
  customerName?: string;
  /** URL para que el cliente deje una reseña en Google. */
  reviewUrl?: string;
}

export function CaseStageExperienciaTemplate({
  customerName = "Cliente",
  caseNumber,
  caseTitle,
  serviceName,
  responsibleLawyerName,
  reviewUrl = "https://g.page/r/legalistas/review",
}: Props) {
  const firstName = customerName.split(" ")[0];

  return (
    <EmailLayout preview="¡Tu caso fue resuelto! — Legalistas">
      <Text className="text-[#6b7280] text-[12px] uppercase tracking-wider font-semibold m-0">
        ¡Excelente noticia! · Hola, {firstName}
      </Text>
      <Heading
        as="h2"
        className="text-[#111827] text-[26px] font-bold m-0 mt-1 leading-tight"
      >
        ¡Tu caso fue resuelto!
      </Heading>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-5">
        Nos alegra muchísimo poder darte esta noticia. Tu trámite{" "}
        <strong>llegó a buen puerto</strong> y queremos agradecerte
        sinceramente la confianza que depositaste en Legalistas para
        acompañarte durante todo el proceso.
      </Text>

      <CaseInfoBlock
        caseNumber={caseNumber}
        caseTitle={caseTitle}
        serviceName={serviceName}
        responsibleLawyerName={responsibleLawyerName}
      />

      {/* Bloque de reseña destacado */}
      <Section
        style={{
          marginTop: "24px",
          padding: "24px",
          backgroundColor: "rgba(9, 167, 178, 0.08)",
          border: "1px solid rgba(9, 167, 178, 0.3)",
          borderRadius: "10px",
          textAlign: "center",
        }}
      >
        <Text className="text-[#09A7B2] text-[12px] uppercase tracking-wider font-bold m-0">
          ¿Nos ayudás con una reseña?
        </Text>
        <Text className="text-[#1f2937] text-[16px] leading-6 m-0 mt-2 font-semibold">
          Tu opinión vale oro 🙌
        </Text>
        <Text className="text-[#374151] text-[14px] leading-6 m-0 mt-2">
          Compartir tu experiencia en Google nos ayuda muchísimo a llegar a
          más personas que necesitan asesoramiento legal.
        </Text>

        <Section className="mt-5">
          <Button
            href={reviewUrl}
            className="bg-[#09A7B2] text-white text-[15px] font-bold no-underline rounded-md"
            style={{ padding: "14px 32px" }}
          >
            Dejar reseña en Google
          </Button>
        </Section>
      </Section>

      <Text className="text-[#374151] text-[15px] leading-7 m-0 mt-6">
        Si en el futuro necesitás asesoramiento o conocés a alguien que lo
        necesite, estamos a tu disposición.
      </Text>

      <Hr className="border-[#e5e7eb] my-6" />

      <Text className="text-[#6b7280] text-[14px] leading-6 m-0">
        Muchas gracias por todo,
        <br />
        <strong className="text-[#1f2937]">Equipo Legalistas</strong>
      </Text>
    </EmailLayout>
  );
}
