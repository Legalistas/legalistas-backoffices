"use client";

import { Editor } from "@tinymce/tinymce-react";
import {
	Calendar,
	Download,
	FileText,
	Plus,
	Printer,
	Trash2,
	User,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	CASES_FILES_CEDULAS_BY_ID_ENDPOINT,
	CASES_FILES_CEDULAS_ENDPOINT,
} from "@/constant/api-endpoints";
import { CEDULA_TEMPLATES } from "@/constant/cedula-templates";
import { useConfirm } from "@/hooks/useConfirm";
import { getProcessTypeLabel } from "@/lib/functions";

interface Cedula {
	id: number;
	fileId: number;
	cedulaType: string;
	partId: number;
	partName?: string;
	content: string;
	pdfPath?: string;
	generatedDate: string;
	status: string;
	createdAt: string;
	updatedAt: string;
}

interface FilesCedulasProps {
	caseId: number;
	fileId: number;
	cedulas?: Cedula[];
	parts?: any[];
	fileData?: any;
	onCedulasChange?: (cedulas: Cedula[]) => void;
	onRefresh?: () => void;
}

export default function FilesCedulas({
	caseId,
	fileId,
	cedulas = [],
	parts = [],
	fileData,
	onCedulasChange,
	onRefresh,
}: FilesCedulasProps) {
	const { data: session } = useSession();
	const { confirm, ConfirmationDialog } = useConfirm();
	const [isAddingCedula, setIsAddingCedula] = useState(false);
	const [localCedulas, setLocalCedulas] = useState<Cedula[]>(cedulas);
	const [, setIsLoading] = useState(false);

	// Cargar cédulas al montar el componente
	// biome-ignore lint/correctness/useExhaustiveDependencies: loadCedulas depends on session which changes often
	useEffect(() => {
		loadCedulas();
	}, [caseId, fileId]);

	const loadCedulas = async () => {
		if (!session?.user?.accessToken) return;

		try {
			const response = await fetch(
				CASES_FILES_CEDULAS_ENDPOINT(caseId, fileId),
				{
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			if (response.ok) {
				const data = await response.json();
				setLocalCedulas(data);
				onCedulasChange?.(data);
			}
		} catch (error) {
			console.error("Error al cargar cédulas:", error);
		} finally {
			setIsLoading(false);
		}
	};

	// Función para personalizar el template con datos del expediente
	const personalizeTemplate = (
		template: string,
		customJuez?: string,
		customSecretaria?: string,
	) => {
		let personalizedContent = template;

		if (fileData?.court) {
			const { charter, courtName, secretary, jurisdiction } = fileData.court;

			// Extraer ciudad y provincia del nombre de la jurisdicción
			// Ejemplo: "Santa Fe - Distrito Judicial Nro. 5 - Rafaela"
			const jurisdictionParts = jurisdiction?.name?.split(" - ") || [];
			const provincia = jurisdictionParts[0] || "Santa Fe"; // Primera parte: provincia
			const ciudad =
				jurisdictionParts[jurisdictionParts.length - 1] || "Rafaela"; // Última parte: ciudad

			// Formato: "Ciudad. Provincia"
			const ciudadProvincia = `${ciudad}. ${provincia}.`;

			// Fecha actual
			const fecha = new Date().toLocaleDateString("es-AR", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
			});

			// Construir la carátula del expediente
			const customerName = fileData?.case?.customer?.name || "";
			const firstPartName =
				Array.isArray(fileData?.filesParts) && fileData.filesParts.length > 0
					? fileData.filesParts[0]?.name
					: "";

			const processType = getProcessTypeLabel(
				typeof fileData?.typeProcessId === "number"
					? fileData.typeProcessId
					: null,
			);

			// Formato: "NOMBRE CLIENTE C/NOMBRE PARTE S/ TIPO PROCESO"
			const caratula = [
				customerName,
				firstPartName ? `C/${firstPartName}` : "",
				`S/ ${processType}`,
			]
				.filter(Boolean)
				.join(" ")
				.toUpperCase();

			// Usar los valores personalizados si se proveen, sino usar los del fileData o valores por defecto
			const juezValue = customJuez || fileData.judge || "[COMPLETAR DATO]";
			const secretariaValue =
				customSecretaria ||
				secretary ||
				fileData.secretary ||
				"[COMPLETAR DATO]";

			// Reemplazar variables en el template
			const variables: Record<string, string> = {
				"{{JUZGADO}}": `${charter} ${courtName}`,
				"{{JURISDICCION}}": ciudad.toUpperCase(),
				"{{CIUDAD}}": ciudad,
				"{{PROVINCIA}}": provincia,
				"{{CIUDAD_PROVINCIA}}": ciudadProvincia,
				"{{FECHA}}": fecha,
				"{{JUEZ}}": juezValue,
				"{{SECRETARIA}}": secretariaValue,
				"{{CARATULA}}": caratula || "SIN CARÁTULA",
			};

			// Reemplazar todas las variables
			Object.entries(variables).forEach(([key, value]) => {
				personalizedContent = personalizedContent.replace(
					new RegExp(key, "g"),
					value,
				);
			});
		}

		return personalizedContent;
	};

	const [newCedula, setNewCedula] = useState({
		cedulaType: "carta_certificada",
		partId: "",
		juez: "",
		secretaria: "",
		content: personalizeTemplate(CEDULA_TEMPLATES.carta_certificada),
	});

	// Cambiar template cuando cambia el tipo de cédula
	const handleCedulaTypeChange = (type: string) => {
		const baseTemplate =
			CEDULA_TEMPLATES[type as keyof typeof CEDULA_TEMPLATES] || "";
		setNewCedula({
			...newCedula,
			cedulaType: type,
			content: personalizeTemplate(
				baseTemplate,
				newCedula.juez,
				newCedula.secretaria,
			),
		});
	};

	// Actualizar Juez y Secretaría - Regenerar template completo
	const handleJuezChange = (juez: string) => {
		const baseTemplate =
			CEDULA_TEMPLATES[newCedula.cedulaType as keyof typeof CEDULA_TEMPLATES] ||
			"";
		let updatedContent = personalizeTemplate(
			baseTemplate,
			juez,
			newCedula.secretaria,
		);

		// Si hay una parte seleccionada, aplicar también sus datos
		if (newCedula.partId) {
			const selectedPart = parts.find(
				(p) => p.id.toString() === newCedula.partId,
			);
			if (selectedPart) {
				updatedContent = applyPartDataToContent(updatedContent, selectedPart);
			}
		}

		setNewCedula({
			...newCedula,
			juez,
			content: updatedContent,
		});
	};

	const handleSecretariaChange = (secretaria: string) => {
		const baseTemplate =
			CEDULA_TEMPLATES[newCedula.cedulaType as keyof typeof CEDULA_TEMPLATES] ||
			"";
		let updatedContent = personalizeTemplate(
			baseTemplate,
			newCedula.juez,
			secretaria,
		);

		// Si hay una parte seleccionada, aplicar también sus datos
		if (newCedula.partId) {
			const selectedPart = parts.find(
				(p) => p.id.toString() === newCedula.partId,
			);
			if (selectedPart) {
				updatedContent = applyPartDataToContent(updatedContent, selectedPart);
			}
		}

		setNewCedula({
			...newCedula,
			secretaria,
			content: updatedContent,
		});
	};

	// Función auxiliar para aplicar datos de la parte al contenido
	const applyPartDataToContent = (
		content: string,
		selectedPart: any,
	): string => {
		let updatedContent = content;

		// Formatear el nombre de la parte (en mayúsculas)
		const partName = selectedPart.name ? selectedPart.name.toUpperCase() : "";

		// Formatear el domicilio
		const partAddress =
			selectedPart.address && selectedPart.address !== "0"
				? `DOMICILIO: ${selectedPart.address.toUpperCase()}`
				: "DOMICILIO: [COMPLETAR DATO]";

		// Formatear ciudad y provincia
		const city =
			selectedPart.city && selectedPart.city !== "0"
				? selectedPart.city.toUpperCase()
				: "RAFAELA";

		// Mapear stateId a nombre de provincia
		const stateNames: { [key: number]: string } = {
			21: "SANTA FE",
			1: "BUENOS AIRES",
			2: "CATAMARCA",
			3: "CHACO",
			4: "CHUBUT",
			5: "CORDOBA",
			6: "CORRIENTES",
			7: "ENTRE RIOS",
			8: "FORMOSA",
			9: "JUJUY",
			10: "LA PAMPA",
			11: "LA RIOJA",
			12: "MENDOZA",
			13: "MISIONES",
			14: "NEUQUEN",
			15: "RIO NEGRO",
			16: "SALTA",
			17: "SAN JUAN",
			18: "SAN LUIS",
			19: "SANTA CRUZ",
			20: "SANTIAGO DEL ESTERO",
			22: "TIERRA DEL FUEGO",
			23: "TUCUMAN",
		};

		const province = selectedPart.stateId
			? stateNames[selectedPart.stateId] || "SANTA FE"
			: "SANTA FE";

		// Construir la línea de ubicación (código postal - ciudad - provincia)
		const locationLine = `2300 - ${city} - ${province}`;

		// Reemplazar las tres líneas hardcodeadas en el template
		const regex1 =
			/(<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong><\/span><\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)(DOMICILIO:[^<]+)(<\/strong><\/span>[^<]*<\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong>)/i;

		if (regex1.test(updatedContent)) {
			updatedContent = updatedContent.replace(
				regex1,
				`$1${partName}$3${partAddress}$5${locationLine}$7`,
			);
		}

		const regex2 =
			/(<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong><\/span><\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)(DOMICILIO:[^<]+)(<\/strong><\/span><\/p>\s*<p style="text-align: justify;[^"]*">[^<]*<span[^>]*><strong>)([^<]+)(<\/strong>)/i;

		if (regex2.test(updatedContent)) {
			updatedContent = updatedContent.replace(
				regex2,
				`$1${partName}$3${partAddress}$5${locationLine}$7`,
			);
		}

		return updatedContent;
	};

	// Manejar el cambio de parte y completar automáticamente los datos del destinatario
	const handlePartChange = (partId: string) => {
		// Buscar la parte seleccionada
		const selectedPart = parts.find((p) => p.id.toString() === partId);

		if (!selectedPart) {
			setNewCedula({ ...newCedula, partId });
			return;
		}

		// Regenerar el template completo con los valores actuales
		const baseTemplate =
			CEDULA_TEMPLATES[newCedula.cedulaType as keyof typeof CEDULA_TEMPLATES] ||
			"";
		let updatedContent = personalizeTemplate(
			baseTemplate,
			newCedula.juez,
			newCedula.secretaria,
		);

		// Aplicar los datos de la parte
		updatedContent = applyPartDataToContent(updatedContent, selectedPart);

		setNewCedula({
			...newCedula,
			partId,
			content: updatedContent,
		});
	};

	const handleAddCedula = async () => {
		if (!session?.user?.accessToken) return;
		if (!newCedula.cedulaType || !newCedula.partId || !newCedula.content) {
			toast.error("Por favor complete todos los campos requeridos");
			return;
		}

		setIsLoading(true);
		try {
			// Procesar el contenido para asegurar URLs absolutas de imágenes
			const frontendUrl = window.location.origin;
			const processedContent = newCedula.content.replace(
				/src="(?:\.\.\/)+images\//g,
				`src="${frontendUrl}/images/`,
			);

			const response = await fetch(
				CASES_FILES_CEDULAS_ENDPOINT(caseId, fileId),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
					body: JSON.stringify({
						cedulaType: newCedula.cedulaType,
						partId: Number.parseInt(newCedula.partId),
						content: processedContent,
						juez: newCedula.juez || null,
						secretaria: newCedula.secretaria || null,
					}),
				},
			);

			if (response.ok) {
				const createdCedula = await response.json();
				setLocalCedulas([...localCedulas, createdCedula]);
				onCedulasChange?.([...localCedulas, createdCedula]);
				onRefresh?.();

				setIsAddingCedula(false);
				setNewCedula({
					cedulaType: "carta_certificada",
					partId: "",
					juez: "",
					secretaria: "",
					content: personalizeTemplate(CEDULA_TEMPLATES.carta_certificada),
				});

				toast.success("Cédula creada exitosamente");
			} else {
				const error = await response.json();
				toast.error(
					`Error al crear cédula: ${error.message || "Error desconocido"}`,
				);
			}
		} catch (error) {
			console.error("Error al crear cédula:", error);
			toast.error("Error al crear cédula");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteCedula = async (cedulaId: number) => {
		if (!session?.user?.accessToken) return;
		if (!(await confirm({ description: "¿Está seguro de eliminar esta cédula?", confirmLabel: "Eliminar" }))) return;

		setIsLoading(true);
		try {
			const response = await fetch(
				CASES_FILES_CEDULAS_BY_ID_ENDPOINT(caseId, fileId, cedulaId),
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
					},
				},
			);

			if (response.ok || response.status === 204) {
				const updatedCedulas = localCedulas.filter((c) => c.id !== cedulaId);
				setLocalCedulas(updatedCedulas);
				onCedulasChange?.(updatedCedulas);
				onRefresh?.();
				toast.success("Cédula eliminada exitosamente");
			} else {
				toast.error("Error al eliminar cédula");
			}
		} catch (error) {
			console.error("Error al eliminar cédula:", error);
			toast.error("Error al eliminar cédula");
		} finally {
			setIsLoading(false);
		}
	};

	const handlePrintCedula = (cedula: Cedula) => {
		// Crear una ventana nueva para imprimir
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		// Usar el contenido directamente
		const processedContent = cedula.content;

		printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Cédula - ${cedula.cedulaType === "carta_certificada" ? "Carta Certificada" : "Común"}</title>
                <style>
                    @page {
                        size: A4;
                        margin: 10mm 20mm 20mm 20mm;
                    }
                    
                    body {
                        font-family: Calibri, Arial, sans-serif;
                        width: 210mm;
                        margin: 0 auto;
                        padding: 10mm 20mm 20mm 20mm;
                        color: #000;
                        background: white;
                    }
                    
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                    }
                    
                    @media screen {
                        body {
                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                            margin: 20px auto;
                        }
                    }

                    .cedula-logo { text-align: right; margin-bottom: 8px; }
                    .cedula-logo img { width: 140px; height: auto; }
                </style>
            </head>
            <body>
                <div class="cedula-logo"><img src="${window.location.origin}/images/logo/logo-print.png" alt="Legalistas" /></div>
                ${processedContent}
            </body>
            </html>
        `);

		printWindow.document.close();

		// Esperar a que se cargue y luego imprimir
		printWindow.onload = () => {
			setTimeout(() => {
				printWindow.print();
			}, 250);
		};
	};

	const handleDownloadCedula = async (cedulaId: number) => {
		if (!session?.user?.accessToken) return;

		try {
			const cedula = localCedulas.find((c) => c.id === cedulaId);
			if (!cedula || !cedula.pdfPath) {
				toast.error("No se encontró el archivo de la cédula");
				return;
			}

			toast.info("Abriendo documento...");

			// Obtener el archivo HTML del backend
			const apiUrl =
				process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
			const fileUrl = `${apiUrl}/upload/${cedula.pdfPath}`;

			// Abrir en nueva ventana para que el usuario pueda guardar como PDF con Ctrl+P
			const printWindow = window.open(fileUrl, "_blank");

			if (!printWindow) {
				toast.error("Por favor permita ventanas emergentes");
				return;
			}

			toast.success("Documento abierto. Use Ctrl+P para guardar como PDF");
		} catch (error) {
			console.error("Error al descargar cédula:", error);
			toast.error("Error al abrir el documento");
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Cédulas Automáticas
				</h3>
				<button
					onClick={() => setIsAddingCedula(true)}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					<Plus size={18} />
					Nueva Cédula
				</button>
			</div>

			{/* Formulario para agregar cédula */}
			{isAddingCedula && (
				<div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 space-y-6">
					<h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
						Nueva Cédula
					</h4>

					{/* Grid de campos */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Tipo de Cédula */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Tipo de Cédula *
							</label>
							<select
								value={newCedula.cedulaType}
								onChange={(e) => handleCedulaTypeChange(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								<option value="carta_certificada">
									Carta certificada al demandado
								</option>
								<option value="comun_cualquiera">Común a cualquiera</option>
							</select>
						</div>

						{/* Parte */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Parte *
							</label>
							<select
								value={newCedula.partId}
								onChange={(e) => handlePartChange(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								<option value="">Seleccione una parte</option>
								{parts.map((part) => (
									<option key={part.id} value={part.id}>
										{part.name} - {part.partyType}
									</option>
								))}
							</select>
						</div>

						{/* Juez */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Juez
							</label>
							<input
								type="text"
								value={newCedula.juez}
								onChange={(e) => handleJuezChange(e.target.value)}
								placeholder="Ej: Dr. Juan Pérez"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						{/* Secretaría */}
						<div>
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								Secretaría
							</label>
							<input
								type="text"
								value={newCedula.secretaria}
								onChange={(e) => handleSecretariaChange(e.target.value)}
								placeholder="Ej: Secretaría N° 1"
								className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>
					</div>

					{/* Editor de contenido */}
					{/* Editor de contenido */}
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Contenido de la Cédula *
						</label>
						<div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden shadow-sm">
							<Editor
								apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
								value={newCedula.content}
								onEditorChange={(content) =>
									setNewCedula({ ...newCedula, content })
								}
								init={{
									height: "850px",
									menubar: true,
									relative_urls: false,
									remove_script_host: false,
									convert_urls: false,
									plugins: [
										"advlist",
										"autolink",
										"lists",
										"link",
										"image",
										"charmap",
										"preview",
										"anchor",
										"searchreplace",
										"visualblocks",
										"code",
										"fullscreen",
										"insertdatetime",
										"media",
										"table",
										"code",
										"help",
										"wordcount",
									],
									toolbar:
										"undo redo | blocks | bold italic underline strikethrough | " +
										"alignleft aligncenter alignright alignjustify | " +
										"bullist numlist outdent indent | removeformat | help",
									// content_style: 'body { font-family: Arial, sans-serif; font-size: 14px; }',
									language: "es",
									content_style: `
                                         @import url('fonts.googleapis.com');
    /* Set the editor body to have A4-like properties and the desired padding */
    body {
      width: 210mm; /* A4 width */
      height: 297mm; /* A4 height */
      padding: 20mm; /* Desired margin/padding */
      margin: 0; /* Remove default body margin */
      box-sizing: border-box; /* Ensures padding is included in width/height calculation */
      background: #fff; /* Optional: Make the background white to simulate paper */
      font-family: 'Oxygen', sans-serif; /* Example font */
      line-height: 1.4;
      color: #3d3d3d;
    }
                                        .editable-section:focus-visible { outline: none !important; }
                                        .header, .footer { font-size: 0.8rem; color: #ddd; }
                                        .header {
                                            display: flex;
                                            justify-content: space-between;
                                            padding: 0 0 1rem 0;
                                        }
                                        .header .right-text { text-align: right; }
                                        .footer {
                                            padding:2rem 0 0 0;
                                            text-align: center;
                                        }
                                        

                                        @media print {
      body {
        width: auto; /* Let the browser handle print dimensions */
        height: auto;
        padding: 20mm; /* Ensure padding is applied during print */
      }
    }
                                    `,
								}}
							/>
						</div>
					</div>

					{/* Botones de acción */}
					<div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
						<button
							onClick={() => {
								setIsAddingCedula(false);
								setNewCedula({
									cedulaType: "carta_certificada",
									partId: "",
									juez: "",
									secretaria: "",
									content: personalizeTemplate(
										CEDULA_TEMPLATES.carta_certificada,
									),
								});
							}}
							className="px-6 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
						>
							Cancelar
						</button>
						<button
							onClick={handleAddCedula}
							disabled={!newCedula.partId || !newCedula.content}
							className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
						>
							Crear Cédula
						</button>
					</div>
				</div>
			)}

			{/* Listado de cédulas */}
			<div className="space-y-3">
				{localCedulas.length === 0 ? (
					<div className="text-center py-8 text-gray-500 dark:text-gray-400">
						<FileText size={48} className="mx-auto mb-2 opacity-50" />
						<p>No hay cédulas registradas</p>
						<p className="text-sm">Cree una nueva cédula para comenzar</p>
					</div>
				) : (
					localCedulas.map((cedula) => (
						<div
							key={cedula.id}
							className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
						>
							<div className="flex justify-between items-start">
								<div className="flex-1 space-y-2">
									<div className="flex items-center gap-3">
										<FileText
											size={20}
											className="text-blue-600 dark:text-blue-400"
										/>
										<h4 className="font-medium text-gray-900 dark:text-gray-100">
											{cedula.cedulaType === "carta_certificada"
												? "Carta certificada al demandado"
												: "Común a cualquiera"}
										</h4>
										<span
											className={`px-2 py-1 text-xs rounded-full ${
												cedula.status === "generada"
													? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
													: cedula.status === "pendiente"
														? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
														: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
											}`}
										>
											{cedula.status}
										</span>
									</div>

									<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
										<User size={16} />
										<span>{cedula.partName || "Parte no especificada"}</span>
									</div>

									<div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
										<div dangerouslySetInnerHTML={{ __html: cedula.content }} />
									</div>

									<div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
										<Calendar size={16} />
										<span>
											{new Date(
												cedula.generatedDate || cedula.createdAt,
											).toLocaleDateString("es-AR")}
										</span>
									</div>
								</div>

								<div className="flex gap-2">
									<button
										onClick={() => handlePrintCedula(cedula)}
										className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors"
										title="Imprimir cédula"
									>
										<Printer size={18} />
									</button>
									<button
										onClick={() => handleDownloadCedula(cedula.id)}
										className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
										title="Descargar cédula"
									>
										<Download size={18} />
									</button>
									<button
										onClick={() => handleDeleteCedula(cedula.id)}
										className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
										title="Eliminar cédula"
									>
										<Trash2 size={18} />
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>
			{ConfirmationDialog}
		</div>
	);
}
