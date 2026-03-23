import {
  Body,
  Container,
  Head,
  Hr,
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
        <Body className="bg-[#f4f4f4] my-0 mx-auto font-sans">
          <Container className="max-w-150 mx-auto my-0">
            {/* ── Header con logo ── */}
            <Section className="bg-white rounded-t-lg pt-7.5 pb-7.5 px-5 text-center">
              <Link href="https://legalistas.ar" target="_blank">
                <Img
                  src="https://legalistas.ar/images/logo-print.png"
                  width="280"
                  alt="Legalistas"
                  className="mx-auto"
                />
              </Link>
            </Section>

            {/* ── Contenido ── */}
            <Section className="bg-white px-10 py-5">{children}</Section>

            {/* ── Footer: redes sociales ── */}
            <Section className="bg-[#333333] rounded-b-lg px-10 pt-5 pb-5 text-center">
              <table
                cellPadding="0"
                cellSpacing="0"
                role="presentation"
                align="center"
                style={{ margin: "0 auto" }}
              >
                <tr>
                  <td align="center" style={{ padding: "0 5px" }}>
                    <Link
                      href="https://www.instagram.com/legalistas.ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/174/174855.png"
                        width="32"
                        height="32"
                        alt="Instagram"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 5px" }}>
                    <Link
                      href="https://www.tiktok.com/@legalistas.ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/3046/3046121.png"
                        width="32"
                        height="32"
                        alt="TikTok"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 5px" }}>
                    <Link
                      href="https://web.facebook.com/Legalistas.ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/174/174848.png"
                        width="32"
                        height="32"
                        alt="Facebook"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 5px" }}>
                    <Link
                      href="https://wa.me/5491127683103"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/733/733585.png"
                        width="32"
                        height="32"
                        alt="WhatsApp"
                      />
                    </Link>
                  </td>
                  <td align="center" style={{ padding: "0 5px" }}>
                    <Link
                      href="https://www.linkedin.com/company/legalistas-ar"
                      target="_blank"
                    >
                      <Img
                        src="https://cdn-icons-png.flaticon.com/512/174/174857.png"
                        width="32"
                        height="32"
                        alt="LinkedIn"
                      />
                    </Link>
                  </td>
                </tr>
              </table>

              <Text className="text-[#cccccc] text-[14px] leading-6 mt-5 mb-0 text-center">
                &copy; 2025 Legalistas.ar. Todos los derechos reservados.
                <br />
                Leandro N. Alem 80, S2300 Rafaela, Santa Fe
                <br />
                <Link
                  href="https://legalistas.ar/terminos-condiciones"
                  target="_blank"
                  className="text-[#cccccc] underline"
                >
                  Política de Privacidad
                </Link>
                {" | "}
                <Link
                  href="https://legalistas.ar/darse-de-baja"
                  target="_blank"
                  className="text-[#cccccc] underline"
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
