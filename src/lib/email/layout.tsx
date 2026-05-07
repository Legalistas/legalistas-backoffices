import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#f4f4f4] font-sans my-0 mx-auto py-8">
          <Container className="max-w-150 mx-auto bg-white rounded-lg overflow-hidden shadow-sm">
            {/* Accent stripe — branding */}
            <Section
              style={{
                backgroundColor: "#09A7B2",
                height: "5px",
                lineHeight: "5px",
                fontSize: "0",
              }}
            >
              <Text style={{ margin: 0, padding: 0, lineHeight: "5px" }}>
                &nbsp;
              </Text>
            </Section>

            {/* Header con logo */}
            <Section className="bg-white pt-8 pb-6 px-5 text-center">
              <Link href="https://legalistas.ar" target="_blank">
                <Img
                  src="https://legalistas.ar/images/logo-print.png"
                  width="220"
                  alt="Legalistas"
                  className="mx-auto"
                />
              </Link>
            </Section>

            {/* Contenido */}
            <Section className="bg-white px-10 pt-2 pb-10">{children}</Section>

            {/* Footer: redes sociales */}
            <Section className="bg-[#1f2937] px-10 pt-6 pb-6 text-center">
              <table
                cellPadding="0"
                cellSpacing="0"
                role="presentation"
                align="center"
                style={{ margin: "0 auto" }}
              >
                <tr>
                  <td align="center" style={{ padding: "0 6px" }}>
                    <Link
                      href="https://www.instagram.com/legalistas.ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/174/174855.png"
                        width="28"
                        height="28"
                        alt="Instagram"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 6px" }}>
                    <Link
                      href="https://www.tiktok.com/@legalistas.ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png"
                        width="28"
                        height="28"
                        alt="TikTok"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 6px" }}>
                    <Link
                      href="https://web.facebook.com/Legalistas.ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/174/174848.png"
                        width="28"
                        height="28"
                        alt="Facebook"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 6px" }}>
                    <Link href="https://wa.me/5491127683103" target="_blank">
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                        width="28"
                        height="28"
                        alt="WhatsApp"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 6px" }}>
                    <Link
                      href="https://www.linkedin.com/company/legalistas-ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/174/174857.png"
                        width="28"
                        height="28"
                        alt="LinkedIn"
                      />
                    </Link>
                  </td>
                </tr>
              </table>

              <Text className="text-[#9ca3af] text-[12px] leading-6 mt-5 mb-0 text-center">
                <strong className="text-white">Legalistas</strong>
                <br />
                Leandro N. Alem 80, S2300 Rafaela, Santa Fe
                <br />
                <Link
                  href="https://legalistas.ar"
                  target="_blank"
                  className="text-[#9ca3af] underline"
                >
                  legalistas.ar
                </Link>
              </Text>

              <Text className="text-[#6b7280] text-[11px] leading-5 mt-3 mb-0 text-center">
                &copy; {new Date().getFullYear()} Legalistas.ar — Todos los
                derechos reservados.
                <br />
                <Link
                  href="https://legalistas.ar/terminos-condiciones"
                  target="_blank"
                  className="text-[#6b7280] underline"
                >
                  Política de Privacidad
                </Link>
                {" · "}
                <Link
                  href="https://legalistas.ar/darse-de-baja"
                  target="_blank"
                  className="text-[#6b7280] underline"
                >
                  Darse de Baja
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
