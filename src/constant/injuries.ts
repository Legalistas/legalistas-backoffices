export interface InjuryCategory {
	category: string;
	items: string[];
}

// Catálogo de lesiones por categoría (baremo ART), usado para el
// autocompletado del campo "Lesión". Escribir el nombre de una categoría
// (ej. "Rodilla") muestra todas las lesiones de ese grupo.
export const INJURY_CATALOG: InjuryCategory[] = [
	{
		category: "Rodilla — Lesiones capsulo-ligamentarias y meniscales",
		items: [
			"Síndrome meniscal con signos objetivos",
			"Meniscectomía sin secuelas",
			"Meniscectomía con hipotrofia muscular",
			"Rotura de LCA con inestabilidad residual",
			"Prótesis total de rodilla",
		],
	},
	{
		category: "Columna vertebral",
		items: [
			"Hernia discal lumbosacra",
			"Lumbalgia post-traumática",
			"Fractura vertebral sin desplazamiento",
			"Cervicobraquialgia post-traumática",
		],
	},
	{
		category: "Mano y dedos",
		items: [
			"Amputación dedo mayor (pulgar) a nivel interfalángica distal",
			"Amputación dedo mayor (pulgar) a nivel interfalángica proximal",
			"Amputación dedo mayor (pulgar) completo",
			"Amputación dedo índice completo",
			"Amputación dedo medio completo",
			"Amputación dedo anular completo",
			"Amputación dedo meñique completo",
			"Fractura de falange con limitación funcional",
			"Síndrome del túnel carpiano operado",
		],
	},
	{
		category: "Hombro y brazo",
		items: [
			"Fractura de húmero sin secuelas",
			"Fractura de húmero con callo deforme y/o acortamiento",
			"Lesión manguito rotador",
			"Omalgia con limitación funcional",
		],
	},
	{
		category: "Pierna, pelvis y pie",
		items: [
			"Fractura de fémur sin secuelas",
			"Fractura de rótula",
			"Fractura de calcáneo",
			"Pelvis inestable",
		],
	},
	{
		category: "Vista y oído",
		items: ["Pérdida total de visión en un ojo", "Hipoacusia bilateral severa"],
	},
	{
		category: "Piel: quemaduras y cicatrices",
		items: ["Cicatrices y compromiso de piel", "Quemaduras con secuelas"],
	},
];
