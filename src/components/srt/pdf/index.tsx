"use client";

import type { DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { PreviewValues } from "@/components/srt/SrtDocumentPreview";
import type { CaseSrtDefaults, CaseSrtInfo } from "@/types/srt";
import { AnexoIDoc } from "./AnexoIDoc";
import { AnexoIIDoc } from "./AnexoIIDoc";
import { AnexoIIIDoc } from "./AnexoIIIDoc";
import { OpcionCompetenciaDoc } from "./OpcionCompetenciaDoc";
import { PatrocinioDoc } from "./PatrocinioDoc";

// =============================================================================
// Punto único donde se elige qué PDF corresponde a cada documento.
//
// Los anexos leen `PreviewValues` (el record `name → valor` que ya arma
// `buildPreviewValues`); competencia y patrocinio reciben datos con nombre
// propio porque son texto corrido, no una grilla de campos.
// =============================================================================

function str(value: unknown): string | undefined {
	if (value == null || value === "" || typeof value === "boolean") return undefined;
	return String(value);
}

export function buildSrtDocument(
	docKey: string,
	v: PreviewValues,
	info: CaseSrtInfo | null,
	defaults: CaseSrtDefaults | null,
): ReactElement<DocumentProps> | null {
	switch (docKey) {
		case "anexo-i":
			return <AnexoIDoc v={v} />;
		case "anexo-ii":
			return <AnexoIIDoc v={v} />;
		case "anexo-ii-itinere":
			return <AnexoIIDoc v={v} inItinere />;
		case "anexo-iii":
			return <AnexoIIIDoc v={v} />;

		case "competencia":
			return (
				<OpcionCompetenciaDoc
					data={{
						cmNumero: str(info?.cmNumber),
						cmDelegacion: str(info?.cmJurisdiction),
						ground: info?.competenceGround ?? null,
						domicilio: str(info?.competenceAddress),
						localidad: str(v.competencia_localidad),
						provincia: str(v.competencia_provincia),
					}}
				/>
			);

		case "patrocinio": {
			const worker = defaults?.worker;
			const lawyer = defaults?.representativeLawyer;
			const today = new Date();
			return (
				<PatrocinioDoc
					data={{
						trabajadorNombre: str(info?.workerFullName ?? worker?.fullName),
						trabajadorDni: str(info?.workerDni ?? worker?.dni),
						trabajadorDomicilio: str(info?.workerAddress ?? worker?.address),
						trabajadorLocalidad: str(info?.workerCity ?? worker?.city),
						trabajadorCp: str(info?.workerZip ?? worker?.zip),
						trabajadorTelefono: str(info?.workerPhone ?? worker?.phone),
						// La fecha se completa el día que se firma, pero se propone hoy.
						dia: String(today.getDate()),
						mes: today.toLocaleDateString("es-AR", { month: "long" }),
						anio: String(today.getFullYear()),
						letradoNombre: str(lawyer?.name),
						letradoCuit: str(lawyer?.cuit),
						letradoMatricula: str(lawyer?.srtMatricula),
						letradoDomicilio: str(lawyer?.legalAddress?.street),
						letradoNumero: str(lawyer?.legalAddress?.streetNumber),
						letradoPiso: str(lawyer?.srtLegalOffice),
						letradoLocalidad: str(lawyer?.legalAddress?.city),
						letradoDomicilioElectronico: str(lawyer?.srtElectronicDomicile),
						cmNumero: str(info?.cmNumber),
						cmCiudad: str(info?.cmJurisdiction),
					}}
				/>
			);
		}

		default:
			return null;
	}
}
