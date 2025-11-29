import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Crear un nuevo documento PDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let yPos = 10;

    // ==================== LOGO LEGALISTAS ====================
    try {
      // Cargar la imagen del logo
      const logoPath = path.join(process.cwd(), "public", "images", "logo", "logo-print.png");
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
      
      // Agregar logo (ajustar dimensiones según necesidad: x, y, ancho, alto)
      doc.addImage(logoBase64, "PNG", 20, yPos, 40, 10);
      yPos += 12;
    } catch (error) {
      console.error("Error al cargar el logo:", error);
      // Fallback a texto si falla la carga de imagen
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 174, 239);
      doc.text("Legalistas", 20, yPos);
      yPos += 5;
    }
    
    // Línea debajo del logo
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, doc.internal.pageSize.getWidth() - 20, yPos);
    
    yPos += 10;
    doc.setTextColor(0, 0, 0); // Volver a negro

    // ==================== ENCABEZADO ====================
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("LIQUIDACIÓN LRT", doc.internal.pageSize.getWidth() / 2, yPos, {
      align: "center",
    });

    yPos += 10;
    doc.setFontSize(16);
    doc.text(
      "Ley de Riesgos del Trabajo",
      doc.internal.pageSize.getWidth() / 2,
      yPos,
      { align: "center" }
    );

    yPos += 15;

    // ==================== INFORMACIÓN DEL CLIENTE ====================
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Información del Cliente", 20, yPos);
    doc.line(20, yPos + 1, 80, yPos + 1);

    yPos += 5;

    // Crear tabla para información del cliente
    autoTable(doc, {
      startY: yPos,
      body: [
        [
          "Cliente:",
          data.cliente || "N/A",
          "Expediente:",
          data.expediente || "N/A",
        ],
        [
          "Fecha de Accidente:",
          data.fechaAccidente || "N/A",
          "Edad del Accidentado:",
          data.edad !== null ? `${data.edad} años` : "N/A",
        ],
        [
          "Porcentaje de Incapacidad:",
          data.incapacidad !== null ? `${data.incapacidad}%` : "N/A",
          "",
          "",
        ],
      ],
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 45 },
        1: { cellWidth: 45 },
        2: { fontStyle: "bold", cellWidth: 45 },
        3: { cellWidth: 45 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ==================== RIPTE UTILIZADO ====================
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RIPTE Utilizado", 20, yPos);
    doc.line(20, yPos + 1, 60, yPos + 1);

    yPos += 5;

    // Crear tabla para RIPTE
    if (data.selectedRipte) {
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "Mes/Año:",
            `${data.selectedRipte.month} ${data.selectedRipte.year}`,
            "Valor:",
            `$${Number(data.selectedRipte.value).toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ],
        ],
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45 },
          1: { cellWidth: 45 },
          2: { fontStyle: "bold", cellWidth: 45 },
          3: { cellWidth: 45 },
        },
      });
    } else {
      autoTable(doc, {
        startY: yPos,
        body: [["RIPTE:", "No seleccionado", "", ""]],
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 2,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 45 },
          1: { cellWidth: 135 },
        },
      });
    }

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ==================== TABLA DE REMUNERACIONES ====================
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Tabla de Remuneraciones", 20, yPos);
    doc.line(20, yPos + 1, 75, yPos + 1);

    yPos += 5;

    // Preparar datos para la tabla
    const remuneracionesData =
      data.remuneraciones?.map((row: any) => [
        row.periodo || "",
        row.haberes
          ? `$${parseFloat(row.haberes).toLocaleString("es-AR")}`
          : "-",
        row.ripteDelMes ? row.ripteDelMes.toFixed(2) : "-",
        row.haber_ajustado
          ? `$${row.haber_ajustado.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : "-",
      ]) || [];

    // Calcular totales
    const totalHaberes =
      data.remuneraciones?.reduce(
        (sum: number, row: any) => sum + (parseFloat(row.haberes) || 0),
        0
      ) || 0;
    const totalAjustados =
      data.remuneraciones?.reduce(
        (sum: number, row: any) => sum + (row.haber_ajustado || 0),
        0
      ) || 0;

    // Agregar fila de totales
    remuneracionesData.push([
      "TOTAL",
      `$${totalHaberes.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      "",
      `$${totalAjustados.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ]);

    // Agregar fila de promedio
    remuneracionesData.push([
      "PROMEDIO",
      "",
      "",
      `$${
        data.ibmConRipte?.toLocaleString("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) || "0"
      }`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["PERIODO", "HABERES", "RIPTE MES", "AJUSTADO"]],
      body: remuneracionesData,
      theme: "grid",
      headStyles: {
        fillColor: [41, 128, 185],
        fontSize: 9,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      footStyles: {
        fillColor: [236, 240, 241],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ==================== CÁLCULOS FINALES ====================
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Cálculo Final de LRT", 20, yPos);
    doc.line(20, yPos + 1, 70, yPos + 1);

    yPos += 5;

    // Crear tabla para cálculos finales
    const calculosData: any[] = [
      [
        "IBM CON RIPTE:",
        `$${
          data.ibmConRipte?.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || "0"
        }`,
      ],
      ["TASA DE VARIACIÓN:", `${data.tasaVariacion?.toFixed(2) || "0"}%`],
      [
        "IBM TOTAL:",
        `$${
          data.ibmTotal?.toLocaleString("es-AR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) || "0"
        }`,
      ],
      [
        "PORCENTAJE INCAPACIDAD:",
        `${data.incapacidad !== null ? `${data.incapacidad}%` : "0%"}`,
      ],
      ["COEFICIENTE EDAD:", `${data.coeficienteEdad?.toFixed(2) || "0"}`],
    ];

    autoTable(doc, {
      startY: yPos,
      body: calculosData,
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 90 },
        1: { cellWidth: 90, halign: "right" },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;

    // Total Fórmula
    autoTable(doc, {
      startY: yPos,
      body: [
        [
          "TOTAL FÓRMULA:",
          `$${
            data.totalFormula?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0"
          }`,
        ],
      ],
      theme: "plain",
      styles: {
        fontSize: 12,
        cellPadding: 3,
        lineColor: [0, 102, 204],
        lineWidth: 0.5,
        textColor: [0, 102, 204],
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 90 },
        1: { cellWidth: 90, halign: "right", fontStyle: "bold" },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 5;

    // 20% adicional si está activado
    if (data.activar20Porciento) {
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "20% DEL TOTAL FÓRMULA:",
            `$${
              data.veintePorCiento?.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0"
            }`,
          ],
        ],
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 90 },
          1: { cellWidth: 90, halign: "right" },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // Total Indemnización con 20%
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "TOTAL INDEMNIZACIÓN (Fórmula + 20%):",
            `$${
              data.totalIndemnizacion?.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0"
            }`,
          ],
        ],
        theme: "plain",
        styles: {
          fontSize: 12,
          cellPadding: 3,
          lineColor: [0, 153, 0],
          lineWidth: 0.5,
          textColor: [0, 153, 0],
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 90 },
          1: { cellWidth: 90, halign: "right", fontStyle: "bold" },
        },
      });
    } else {
      // Total Indemnización sin 20%
      autoTable(doc, {
        startY: yPos,
        body: [
          [
            "TOTAL INDEMNIZACIÓN:",
            `$${
              data.totalIndemnizacion?.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }) || "0"
            }`,
          ],
        ],
        theme: "plain",
        styles: {
          fontSize: 12,
          cellPadding: 3,
          lineColor: [0, 102, 204],
          lineWidth: 0.5,
          textColor: [0, 102, 204],
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 90 },
          1: { cellWidth: 90, halign: "right", fontStyle: "bold" },
        },
      });
    }

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ==================== PISO MÍNIMO ====================
    if (data.pisoMinimo !== null && data.totalPisoMinimo > 0) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Piso Mínimo", 20, yPos);
      doc.line(20, yPos + 1, 50, yPos + 1);

      yPos += 5;

      // Crear tabla para piso mínimo
      const pisoMinimoData: any[] = [
        [
          "PISO MÍNIMO INGRESADO:",
          `$${
            data.pisoMinimo?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0"
          }`,
        ],
        [
          "TOTAL PISO MÍNIMO:",
          `$${
            data.totalPisoMinimo?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0"
          }`,
        ],
      ];

      if (data.activarPisoMinimo) {
        pisoMinimoData.push([
          "20% DEL PISO MÍNIMO:",
          `$${
            data.veintePorCientoPiso?.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0"
          }`,
        ]);
      }

      autoTable(doc, {
        startY: yPos,
        body: pisoMinimoData,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 2,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 90 },
          1: { cellWidth: 90, halign: "right" },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // Total Piso Mínimo Final
      if (data.activarPisoMinimo) {
        autoTable(doc, {
          startY: yPos,
          body: [
            [
              "TOTAL PISO MÍNIMO (Piso + 20%):",
              `$${
                data.totalPisoMinimoFinal?.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0"
              }`,
            ],
          ],
          theme: "plain",
          styles: {
            fontSize: 12,
            cellPadding: 3,
            lineColor: [153, 0, 204],
            lineWidth: 0.5,
            textColor: [153, 0, 204],
          },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 90 },
            1: { cellWidth: 90, halign: "right", fontStyle: "bold" },
          },
        });
      } else {
        autoTable(doc, {
          startY: yPos,
          body: [
            [
              "TOTAL PISO MÍNIMO:",
              `$${
                data.totalPisoMinimoFinal?.toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }) || "0"
              }`,
            ],
          ],
          theme: "plain",
          styles: {
            fontSize: 12,
            cellPadding: 3,
            lineColor: [100, 100, 100],
            lineWidth: 0.5,
          },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 90 },
            1: { cellWidth: 90, halign: "right", fontStyle: "bold" },
          },
        });
      }

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.setTextColor(0, 0, 0);

    // ==================== PIE DE PÁGINA ====================
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageCount = doc.internal.pages.length - 1;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Documento generado automáticamente el ${new Date().toLocaleDateString(
          "es-AR"
        )} a las ${new Date().toLocaleTimeString("es-AR")}`,
        doc.internal.pageSize.getWidth() / 2,
        pageHeight - 15,
        { align: "center" }
      );

      doc.text(
        "Los cálculos se realizan según la Ley de Riesgos del Trabajo (LRT)",
        doc.internal.pageSize.getWidth() / 2,
        pageHeight - 10,
        { align: "center" }
      );

      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        pageHeight - 5,
        { align: "center" }
      );
    }

    // Generar el PDF como ArrayBuffer
    const pdfOutput = doc.output("arraybuffer");

    // Retornar el PDF como respuesta
    return new NextResponse(pdfOutput, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Liquidacion_LRT_${
          data.cliente?.replace(/\s+/g, "_") || "Cliente"
        }_${new Date().toLocaleDateString("es-AR").replace(/\//g, "-")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error al generar PDF:", error);
    return NextResponse.json(
      {
        error: "Error al generar el PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
