import fs from "fs";
import { type NextRequest, NextResponse } from "next/server";
import path from "path";

const stageLabels: Record<number, string> = {
	1: "Documentaci\u00F3n",
	2: "Administrativo",
	3: "Judicial",
	4: "Incapacidad",
	5: "Cierre",
	6: "Experiencia",
	7: "Archivado",
};

/** Draw an arc as small line segments. Angles in degrees, 0=right, +clockwise in screen coords. */
function drawArc(
	doc: InstanceType<typeof import("jspdf").jsPDF>,
	cx: number,
	cy: number,
	r: number,
	startDeg: number,
	endDeg: number,
) {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const totalAngle = Math.abs(endDeg - startDeg);
	const steps = Math.max(40, Math.ceil(totalAngle / 2));
	const startRad = toRad(startDeg);
	const endRad = toRad(endDeg);
	const step = (endRad - startRad) / steps;
	for (let i = 0; i < steps; i++) {
		const a1 = startRad + i * step;
		const a2 = startRad + (i + 1) * step;
		doc.line(
			cx + r * Math.cos(a1),
			cy + r * Math.sin(a1),
			cx + r * Math.cos(a2),
			cy + r * Math.sin(a2),
		);
	}
}

function htmlToText(html: string): string {
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<\/div>/gi, "\n")
		.replace(/<\/li>/gi, "\n")
		.replace(/<li>/gi, "- ")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** Load logo as base64 — returns null on failure */
function loadLogo(): string | null {
	try {
		const logoPath = path.join(
			process.cwd(),
			"public",
			"images",
			"logo",
			"logo-print.png",
		);
		const buf = fs.readFileSync(logoPath);
		return `data:image/png;base64,${buf.toString("base64")}`;
	} catch {
		return null;
	}
}

export async function POST(request: NextRequest) {
	try {
		const { default: jsPDF } = await import("jspdf");
		const data = await request.json();

		const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
		const pw = doc.internal.pageSize.getWidth(); // 210
		const ph = doc.internal.pageSize.getHeight(); // 297
		const m = 15; // margin
		const cw = pw - m * 2; // content width = 180
		const logo = loadLogo();

		// ================================================================
		//  HEADER
		// ================================================================
		doc.setFillColor(9, 164, 181);
		doc.rect(0, 0, pw, 55, "F");
		// thin lighter top line
		doc.setFillColor(11, 180, 198);
		doc.rect(0, 0, pw, 1.5, "F");

		// Logo — small, centered
		if (logo) {
			doc.addImage(logo, "PNG", pw / 2 - 15, 5, 30, 6);
		} else {
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(12);
			doc.setFont("helvetica", "bolditalic");
			doc.text("legalistas", pw / 2, 10, { align: "center" });
		}

		// Title
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(16);
		doc.setFont("helvetica", "bold");
		doc.text("INFORME TRIMESTRAL DEL ESTADO", pw / 2, 22, { align: "center" });
		doc.text("DE SU RECLAMO", pw / 2, 30, { align: "center" });

		// Client
		doc.setFontSize(10);
		doc.setFont("helvetica", "italic");
		doc.text(
			`Cliente: ${data.customerName}     N\u00B0 ${data.caseNumber}`,
			pw / 2,
			42,
			{ align: "center" },
		);

		let y = 62;

		// ================================================================
		//  PROGRESS TIMELINE
		// ================================================================
		const stageId = data.stageId || 1;
		const totalSteps = 7;
		const timelineH = 46;

		// white background card
		doc.setFillColor(255, 255, 255);
		doc.roundedRect(m, y, cw, timelineH, 3, 3, "F");

		// Subtitle
		doc.setTextColor(170, 170, 170);
		doc.setFontSize(6);
		doc.setFont("helvetica", "bold");
		doc.text("PROGRESO DE SU RECLAMO", pw / 2, y + 5, { align: "center" });

		// Positions
		const startX = m + 14;
		const endX = pw - m - 14;
		const spacing = (endX - startX) / (totalSteps - 1);
		const rCY = y + 18; // ring center Y
		const outerR = 6; // ring radius
		const innerR = 4.2; // inner circle radius
		const connH = 3; // vertical connector height
		const dotRadius = 0.8;
		const dotCY = rCY + outerR + connH + dotRadius + 0.5;

		// Horizontal timeline
		doc.setDrawColor(230, 230, 230);
		doc.setLineWidth(0.3);
		doc.line(startX, dotCY, endX, dotCY);
		if (stageId > 1) {
			doc.setDrawColor(9, 164, 181);
			doc.setLineWidth(0.4);
			doc.line(startX, dotCY, startX + (stageId - 1) * spacing, dotCY);
		}

		for (let i = 1; i <= totalSteps; i++) {
			const cx = startX + (i - 1) * spacing;
			const done = i < stageId;
			const curr = i === stageId;
			const active = done || curr;

			// ── Ring arcs ──
			// Gray background ring
			doc.setDrawColor(238, 238, 238);
			doc.setLineWidth(0.5);
			drawArc(doc, cx, rCY, outerR, 0, 360);

			if (done) {
				// Teal arc 270deg from top
				doc.setDrawColor(9, 164, 181);
				doc.setLineWidth(0.9);
				drawArc(doc, cx, rCY, outerR, -90, 180);
			} else if (curr) {
				// Teal arc 150deg
				doc.setDrawColor(9, 164, 181);
				doc.setLineWidth(0.9);
				drawArc(doc, cx, rCY, outerR, -90, 60);
				// Pink arc 100deg
				doc.setDrawColor(232, 67, 147);
				doc.setLineWidth(0.9);
				drawArc(doc, cx, rCY, outerR, 80, 180);
			}

			// ── Inner circle ──
			doc.setFillColor(active ? 243 : 250, active ? 244 : 250, active ? 246 : 250);
			doc.circle(cx, rCY, innerR, "F");
			// subtle border
			doc.setDrawColor(active ? 220 : 240, active ? 220 : 240, active ? 220 : 240);
			doc.setLineWidth(0.15);
			doc.circle(cx, rCY, innerR, "S");

			// ── Number inside ──
			doc.setFontSize(8);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(active ? 75 : 200, active ? 85 : 200, active ? 99 : 200);
			doc.text(String(i), cx, rCY + 1.2, { align: "center" });

			// ── Vertical connector ──
			doc.setDrawColor(active ? 9 : 225, active ? 164 : 225, active ? 181 : 225);
			doc.setLineWidth(0.3);
			doc.line(cx, rCY + outerR, cx, rCY + outerR + connH);

			// ── Dot ──
			if (active) {
				doc.setFillColor(9, 164, 181);
				doc.circle(cx, dotCY, dotRadius, "F");
			} else {
				doc.setFillColor(255, 255, 255);
				doc.setDrawColor(210, 210, 210);
				doc.setLineWidth(0.25);
				doc.circle(cx, dotCY, dotRadius, "FD");
			}

			// ── Label ──
			doc.setFontSize(5);
			doc.setFont("helvetica", curr ? "bold" : "normal");
			doc.setTextColor(active ? 9 : 190, active ? 164 : 190, active ? 181 : 190);
			doc.text(stageLabels[i] || "", cx, dotCY + 3.5, { align: "center" });
		}

		y += timelineH + 5;

		// ================================================================
		//  INCAPACIDAD  +  ESTADO ACTUAL  (two cards)
		// ================================================================
		const colW = (cw - 6) / 2;
		const cardH = 68;
		const hdrH = 9;
		const rx = m + colW + 6; // right column x

		// ── Left card: Incapacidad ──
		doc.setFillColor(255, 255, 255);
		doc.roundedRect(m, y, colW, cardH, 2, 2, "F");
		doc.setDrawColor(230, 230, 230);
		doc.setLineWidth(0.2);
		doc.roundedRect(m, y, colW, cardH, 2, 2, "S");

		// header bar
		doc.setFillColor(9, 164, 181);
		doc.roundedRect(m, y, colW, hdrH, 2, 2, "F");
		doc.rect(m, y + hdrH - 2, colW, 2, "F"); // square bottom corners

		doc.setTextColor(255, 255, 255);
		doc.setFontSize(7);
		doc.setFont("helvetica", "bold");
		doc.text("INCAPACIDAD DETERMINADA", m + colW / 2, y + 6, { align: "center" });

		// Big percentage
		const pct = data.incapacityPercentage || "-";
		doc.setTextColor(9, 164, 181);
		doc.setFontSize(28);
		doc.setFont("helvetica", "bold");
		doc.text(`${pct}%`, m + colW / 2, y + 26, { align: "center" });

		// subtitle
		doc.setTextColor(120, 120, 120);
		doc.setFontSize(6);
		doc.setFont("helvetica", "bold");
		doc.text("\u00BFQU\u00C9 SIGNIFICA EL PORCENTAJE", m + colW / 2, y + 34, { align: "center" });
		doc.text("DE INCAPACIDAD?", m + colW / 2, y + 38, { align: "center" });

		// Small bar chart
		const barBaseY = y + 45;
		const barMaxH = 10;
		const barW = 3;
		const barGap = 1.5;
		const bars = [0.3, 0.45, 0.6, 0.75, 0.9];
		const barsStartX = m + colW / 2 - ((bars.length * (barW + barGap) - barGap) / 2);
		bars.forEach((h, idx) => {
			const bx = barsStartX + idx * (barW + barGap);
			const bh = barMaxH * h;
			const alpha = 0.3 + idx * 0.15;
			doc.setFillColor(
				Math.round(9 + (255 - 9) * (1 - alpha)),
				Math.round(164 + (255 - 164) * (1 - alpha)),
				Math.round(181 + (255 - 181) * (1 - alpha)),
			);
			doc.roundedRect(bx, barBaseY + barMaxH - bh, barW, bh, 0.5, 0.5, "F");
		});

		// description text
		doc.setFontSize(5.5);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(160, 160, 160);
		const descTxt = "Este porcentaje representa la incapacidad determinada, y constituye la base para calcular la indemnizaci\u00F3n econ\u00F3mica correspondiente.";
		const descL = doc.splitTextToSize(descTxt, colW - 12);
		doc.text(descL, m + 6, y + 60);

		// ── Right card: Estado Actual ──
		doc.setFillColor(255, 255, 255);
		doc.roundedRect(rx, y, colW, cardH, 2, 2, "F");
		doc.setDrawColor(230, 230, 230);
		doc.setLineWidth(0.2);
		doc.roundedRect(rx, y, colW, cardH, 2, 2, "S");

		// header bar
		doc.setFillColor(9, 164, 181);
		doc.roundedRect(rx, y, colW, hdrH, 2, 2, "F");
		doc.rect(rx, y + hdrH - 2, colW, 2, "F");

		doc.setTextColor(255, 255, 255);
		doc.setFontSize(7);
		doc.setFont("helvetica", "bold");
		doc.text("ESTADO ACTUAL", rx + colW / 2, y + 6, { align: "center" });

		// Estado text — parse HTML to plain text with bold handling
		const rawEstado = data.estadoActualHtml || "";
		const estadoPlain = htmlToText(rawEstado);
		doc.setTextColor(55, 55, 55);
		doc.setFontSize(8.5);
		doc.setFont("helvetica", "normal");
		const estadoLines = doc.splitTextToSize(estadoPlain, colW - 12);
		doc.text(estadoLines.slice(0, 10), rx + 6, y + 16);

		y += cardH + 6;

		// ================================================================
		//  COMPROMISO  +  PLAZOS  (two cards)
		// ================================================================
		const btmH = 48;

		// ── Compromiso ──
		doc.setFillColor(247, 248, 249);
		doc.roundedRect(m, y, colW, btmH, 2, 2, "F");

		doc.setTextColor(9, 164, 181);
		doc.setFontSize(7);
		doc.setFont("helvetica", "bold");
		doc.text("COMPROMISO LEGALISTAS", m + 6, y + 8);

		const items = [
			"Seguimiento permanente de su caso",
			"Gestiones para avanzar en la negociaci\u00F3n",
			"Comunicaci\u00F3n ante cualquier novedad relevante",
		];
		items.forEach((txt, idx) => {
			const iy = y + 16 + idx * 8;
			// draw a small teal check circle
			doc.setFillColor(9, 164, 181);
			doc.circle(m + 8, iy - 0.8, 1.5, "F");
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(5);
			doc.setFont("helvetica", "bold");
			doc.text("v", m + 7.2, iy - 0.2);
			// text
			doc.setTextColor(80, 80, 80);
			doc.setFontSize(7);
			doc.setFont("helvetica", "normal");
			doc.text(txt, m + 12, iy);
		});

		// ── Plazos ──
		doc.setFillColor(247, 248, 249);
		doc.roundedRect(rx, y, colW, btmH, 2, 2, "F");

		doc.setTextColor(9, 164, 181);
		doc.setFontSize(7);
		doc.setFont("helvetica", "bold");
		doc.text("SOBRE LOS PLAZOS", rx + 6, y + 8);

		doc.setTextColor(80, 80, 80);
		doc.setFontSize(7);
		doc.setFont("helvetica", "normal");
		const plzLines = doc.splitTextToSize(
			"Los plazos dependen de organismos administrativos y judiciales.",
			colW - 12,
		);
		doc.text(plzLines, rx + 6, y + 16);

		doc.setFont("helvetica", "bold");
		doc.setTextColor(55, 55, 55);
		doc.text("Nosotros impulsamos su caso", rx + 6, y + 32);
		doc.text("de forma permanente.", rx + 6, y + 37);

		// ================================================================
		//  FOOTER
		// ================================================================
		const fH = 18;
		const fY = ph - fH;
		doc.setFillColor(9, 164, 181);
		doc.rect(0, fY, pw, fH, "F");

		if (logo) {
			doc.addImage(logo, "PNG", pw / 2 - 15, fY + 2, 30, 6);
		} else {
			doc.setTextColor(255, 255, 255);
			doc.setFontSize(12);
			doc.setFont("helvetica", "bolditalic");
			doc.text("legalistas", pw / 2, fY + 8, { align: "center" });
		}

		doc.setTextColor(255, 255, 255);
		doc.setFontSize(6);
		doc.setFont("helvetica", "normal");
		doc.text(
			"M\u00E1s informaci\u00F3n en https://usuarios.legalistas.ar/signin",
			pw / 2,
			fY + 14,
			{ align: "center" },
		);

		// ================================================================
		//  OUTPUT
		// ================================================================
		const pdfOut = doc.output("arraybuffer");
		const safeName = data.customerName?.replace(/\s+/g, "_") || "cliente";

		return new NextResponse(pdfOut, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="Informe_Trimestral_${data.caseNumber}_${safeName}.pdf"`,
			},
		});
	} catch (error) {
		console.error("Error generating quarterly report PDF:", error);
		return NextResponse.json(
			{
				error: "Error al generar el informe trimestral",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
