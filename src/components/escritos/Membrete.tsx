import type { MembreteEscrito } from "@/types/escritos";

// Membrete de la hoja en el editor: el mismo que dibuja el PDF
// (backend/src/modules/escritos/utils/membretes.ts). Si cambiás algo acá,
// cambialo allá.

export const MEMBRETE_OPCIONES: { value: MembreteEscrito; label: string }[] = [
	{ value: "LEGALISTAS", label: "Legalistas" },
	{ value: "RPU", label: "RPU — Poder Judicial" },
];

/** Encabezado oficial del Registro de Procesos Universales (primera página). */
function MembreteRpu() {
	return (
		<table
			className="mb-[6mm] w-full border-collapse"
			style={{ border: "none" }}
			cellPadding={0}
			cellSpacing={0}
		>
			<tbody>
				<tr>
					<td className="w-[120px] p-0 text-center align-top" style={{ border: "none" }}>
						<img
							src="/images/escritos/logo-poder-judicial.avif"
							alt="Poder Judicial"
							className="inline-block h-[78px] w-[71px]"
						/>
					</td>
					<td className="p-0 pr-[60px] text-center align-top" style={{ border: "none" }}>
						<p className="m-0 font-[Arial,Helvetica,sans-serif] text-[20px] font-bold leading-[1.15] text-black">
							REGISTRO DE PROCESOS UNIVERSALES Y<br />
							DE ACCIDENTES Y ENFERMEDADES
							<br />
							OCUPACIONALES
						</p>
					</td>
				</tr>
				<tr>
					<td className="p-0 pt-5 text-center align-top" style={{ border: "none" }}>
						<img
							src="/images/escritos/poder-judicial.avif"
							alt=""
							className="inline-block h-[12px] w-[103px]"
						/>
					</td>
					<td
						className="p-0 pt-5 text-right align-bottom font-['Times_New_Roman',Tinos,serif] text-[13.33px] leading-none text-black"
						style={{ border: "none" }}
					>
						<p className="m-0 mb-1.5">Nro: ..............................................</p>
						<p className="m-0">Fecha: ...........................................</p>
					</td>
				</tr>
			</tbody>
		</table>
	);
}

/** Lo que va arriba del texto en la hoja del editor, según el membrete. */
export function Membrete({ tipo }: { tipo?: MembreteEscrito }) {
	if (tipo === "RPU") return <MembreteRpu />;
	return (
		<img
			src="/images/logo/logo-print.png"
			alt="Legalistas"
			className="-mt-[14mm] mb-[5mm] h-[9mm]"
		/>
	);
}
