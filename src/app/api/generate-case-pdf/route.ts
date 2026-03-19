import fs from "fs";
import { type NextRequest, NextResponse } from "next/server";
import path from "path";

const stageLabels: Record<number, string> = {
	1: "Documentación",
	2: "Administrativo",
	3: "Judicial",
	4: "Incapacidad",
	5: "Cierre",
	6: "Experiencia",
	7: "Archivado",
};

const serviceLabels: Record<number, string> = {
	1: "Acc. de trabajo",
	2: "Acc. de transito",
	3: "Jubilaciones",
	4: "Sucesiones",
	5: "Daños y materiales",
	6: "Despidos",
	7: "Civil",
	8: "Ejecutivos",
};

const resultLabels: Record<string, string> = {
	IN_PROGRESS: "En Progreso",
	WON: "Ganado",
	LOST: "Perdido",
};

function formatDate(date: string | Date | null | undefined): string {
	if (!date) return "-";
	return new Date(date).toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

export async function POST(request: NextRequest) {
	try {
		const { default: jsPDF } = await import("jspdf");
		const { default: autoTable } = await import("jspdf-autotable");
		const data = await request.json();

		const doc = new jsPDF({
			orientation: "portrait",
			unit: "mm",
			format: "a4",
		});

		const pageWidth = doc.internal.pageSize.getWidth();
		let yPos = 10;

		// ==================== LOGO + INFO DERECHA ====================
		const logoY = yPos;
		try {
			const logoPath = path.join(
				process.cwd(),
				"public",
				"images",
				"logo",
				"logo-print.png",
			);
			const logoBuffer = fs.readFileSync(logoPath);
			const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
			doc.addImage(logoBase64, "PNG", 20, logoY, 50, 10);
		} catch {
			doc.setFontSize(24);
			doc.setFont("helvetica", "bold");
			doc.setTextColor(9, 164, 181);
			doc.text("Legalistas", 20, logoY + 8);
		}

		// Fecha y caso a la derecha, a la altura del logo
		doc.setFontSize(8);
		doc.setFont("helvetica", "normal");
		doc.setTextColor(120, 120, 120);
		doc.text(
			`Generado el ${formatDate(new Date())}`,
			pageWidth - 20,
			logoY + 4,
			{ align: "right" },
		);
		doc.setFontSize(14);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(9, 164, 181);
		doc.text(`Caso #${data.number || data.id}`, pageWidth - 20, logoY + 10, {
			align: "right",
		});

		yPos = logoY + 14;

		// Línea separadora
		doc.setDrawColor(9, 164, 181);
		doc.setLineWidth(0.5);
		doc.line(20, yPos, pageWidth - 20, yPos);
		yPos += 6;

		// Badges: servicio, etapa, resultado (calcular antes del título)
		const stageLabel = data.stageId ? stageLabels[data.stageId] || "-" : "-";
		const serviceLabel = data.servicesId
			? serviceLabels[data.servicesId] || "-"
			: "-";
		const rawResult =
			data.status && ["IN_PROGRESS", "WON", "LOST"].includes(data.status)
				? data.status
				: null;
		const resultLabel = rawResult
			? resultLabels[rawResult] || "En Progreso"
			: "En Progreso";

		// ==================== TÍTULO + BADGES en misma línea ====================
		doc.setFontSize(18);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(15, 23, 42);
		doc.text(data.title || "Sin título", 20, yPos);

		// Badges alineados a la derecha del título
		doc.setFontSize(9);
		doc.setFont("helvetica", "bold");

		// Resultado badge (más a la derecha)
		if (rawResult === "WON") doc.setTextColor(22, 163, 74);
		else if (rawResult === "LOST") doc.setTextColor(220, 38, 38);
		else doc.setTextColor(180, 83, 9);
		const resultWidth = doc.getTextWidth(resultLabel);
		doc.text(resultLabel, pageWidth - 20, yPos, { align: "right" });

		// Etapa badge
		doc.setTextColor(180, 83, 9);
		const stageWidth = doc.getTextWidth(stageLabel);
		doc.text(stageLabel, pageWidth - 20 - resultWidth - 8, yPos, {
			align: "right",
		});

		// Servicio badge
		doc.setTextColor(13, 148, 136);
		doc.text(
			serviceLabel,
			pageWidth - 20 - resultWidth - 8 - stageWidth - 8,
			yPos,
			{ align: "right" },
		);

		yPos += 8;

		// ==================== INDICADOR DE ETAPAS ====================
		const totalSteps = 7;
		const stepWidth = (pageWidth - 40) / totalSteps;
		const circleRadius = 3.5;

		for (let i = 1; i <= totalSteps; i++) {
			const cx = 20 + stepWidth * (i - 0.5);
			const isCompleted = data.stageId ? i < data.stageId : false;
			const isCurrent = data.stageId ? i === data.stageId : false;

			// Línea conectora
			if (i > 1) {
				const prevCx = 20 + stepWidth * (i - 1.5);
				if (isCompleted || isCurrent) {
					doc.setDrawColor(9, 164, 181);
				} else {
					doc.setDrawColor(200, 200, 200);
				}
				doc.setLineWidth(0.5);
				doc.line(prevCx + circleRadius + 1, yPos, cx - circleRadius - 1, yPos);
			}

			// Círculo
			if (isCompleted || isCurrent) {
				doc.setFillColor(9, 164, 181);
				doc.circle(cx, yPos, circleRadius, "F");
			} else {
				doc.setFillColor(229, 231, 235);
				doc.circle(cx, yPos, circleRadius, "F");
			}

			// Número dentro del círculo (blanco sobre teal, oscuro sobre gris)
			doc.setFontSize(8);
			doc.setFont("helvetica", "bold");
			if (isCompleted) {
				// Check mark - usar "v" ya que jsPDF no renderiza bien ✓
				doc.setTextColor(255, 255, 255);
				doc.text("v", cx - 1.2, yPos + 1.2);
			} else if (isCurrent) {
				doc.setTextColor(255, 255, 255);
				doc.text(String(i), cx, yPos + 1.2, { align: "center" });
			} else {
				doc.setTextColor(156, 163, 175);
				doc.text(String(i), cx, yPos + 1.2, { align: "center" });
			}

			// Label debajo
			doc.setFontSize(6);
			if (isCompleted || isCurrent) {
				doc.setTextColor(9, 164, 181);
			} else {
				doc.setTextColor(156, 163, 175);
			}
			doc.text(stageLabels[i] || "", cx, yPos + circleRadius + 4, {
				align: "center",
			});
		}

		yPos += circleRadius + 10;

		// ==================== INFORMACIÓN GENERAL ====================
		doc.setTextColor(0, 0, 0);
		doc.setFontSize(13);
		doc.setFont("helvetica", "bold");
		doc.text("Información General", 20, yPos);
		doc.setDrawColor(9, 164, 181);
		doc.setLineWidth(0.5);
		doc.line(20, yPos + 1, 65, yPos + 1);
		yPos += 5;

		autoTable(doc, {
			startY: yPos,
			margin: { left: 20, right: 20 },
			body: [
				["Servicio:", serviceLabel, "Etapa:", stageLabel],
				["Resultado:", resultLabel, "Creación:", formatDate(data.createdAt)],
			],
			theme: "plain",
			styles: {
				fontSize: 10,
				cellPadding: 3,
				lineColor: [229, 231, 235],
				lineWidth: 0.1,
			},
			columnStyles: {
				0: { fontStyle: "bold", cellWidth: 35, textColor: [107, 114, 128] },
				1: { cellWidth: 50 },
				2: { fontStyle: "bold", cellWidth: 35, textColor: [107, 114, 128] },
				3: { cellWidth: 50 },
			},
		});

		yPos = (doc as any).lastAutoTable.finalY + 8;

		// ==================== PERSONAS ====================
		doc.setFontSize(13);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(0, 0, 0);
		doc.text("Personas Involucradas", 20, yPos);
		doc.setDrawColor(9, 164, 181);
		doc.line(20, yPos + 1, 70, yPos + 1);
		yPos += 5;

		const personsData: string[][] = [];
		if (data.customer?.name) personsData.push(["Cliente", data.customer.name]);
		if (data.responsibleLawyer?.name)
			personsData.push(["Abog. Responsable", data.responsibleLawyer.name]);
		if (data.internalLawyer?.name)
			personsData.push(["Abog. Interno", data.internalLawyer.name]);

		if (personsData.length > 0) {
			autoTable(doc, {
				startY: yPos,
				margin: { left: 20, right: 20 },
				head: [["Rol", "Nombre"]],
				body: personsData,
				theme: "grid",
				headStyles: {
					fillColor: [9, 164, 181],
					fontSize: 9,
					fontStyle: "bold",
				},
				styles: { fontSize: 10, cellPadding: 3 },
				columnStyles: {
					0: { fontStyle: "bold", cellWidth: 45, textColor: [107, 114, 128] },
				},
			});
			yPos = (doc as any).lastAutoTable.finalY + 8;
		}

		// ==================== EXPEDIENTES ====================
		doc.setFontSize(13);
		doc.setFont("helvetica", "bold");
		doc.setTextColor(0, 0, 0);
		doc.text("Expedientes", 20, yPos);
		doc.setDrawColor(9, 164, 181);
		doc.line(20, yPos + 1, 50, yPos + 1);
		yPos += 5;

		const filesData = data.files?.length
			? data.files.map((f: any) => [
					f.title || "-",
					f.cuij || "-",
					f.court
						? `${f.court.courtName}${f.court.jurisdiction ? ` - ${f.court.jurisdiction.name}` : ""}`
						: "-",
				])
			: [["Sin expedientes", "", ""]];

		autoTable(doc, {
			startY: yPos,
			margin: { left: 20, right: 20 },
			head: [["Título", "CUIJ", "Juzgado"]],
			body: filesData,
			theme: "grid",
			headStyles: { fillColor: [9, 164, 181], fontSize: 9, fontStyle: "bold" },
			styles: { fontSize: 9, cellPadding: 3 },
		});

		yPos = (doc as any).lastAutoTable.finalY + 8;

		// ==================== PIE DE PÁGINA ====================
		const pageHeight = doc.internal.pageSize.getHeight();
		const pageCount = doc.internal.pages.length - 1;

		for (let i = 1; i <= pageCount; i++) {
			doc.setPage(i);
			doc.setFontSize(8);
			doc.setFont("helvetica", "normal");
			doc.setTextColor(156, 163, 175);
			doc.text(
				"Legalistas — Documento confidencial — Generado automáticamente",
				pageWidth / 2,
				pageHeight - 10,
				{ align: "center" },
			);
			doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 6, {
				align: "center",
			});
		}

		// Generar PDF
		const pdfOutput = doc.output("arraybuffer");
		const clientName = data.customer?.name?.replace(/\s+/g, "_") || "caso";

		return new NextResponse(pdfOutput, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="Resumen_Caso_${data.number || data.id}_${clientName}.pdf"`,
			},
		});
	} catch (error) {
		console.error("Error al generar PDF del caso:", error);
		return NextResponse.json(
			{
				error: "Error al generar el PDF",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
