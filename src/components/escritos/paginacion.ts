import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

// Hojas separadas en el editor, como en Word: el texto que no entra en una
// hoja sigue en la próxima, respetando los márgenes superior e inferior de
// cada una. Imita cómo corta el PDF (Chrome): por renglón, sin dejar un
// renglón suelto al pie ni al principio de hoja (orphans/widows = 2), y
// saltando de hoja en los "Salto de página".
//
// Cómo: se mide dónde cae cada renglón con el texto de corrido y, donde
// termina el área escrita de una hoja, se agrega un espaciador (decoración,
// no forma parte del HTML guardado) del alto justo para que lo que sigue
// empiece en el margen superior de la hoja siguiente.

const MM = 96 / 25.4;
/** Alto de la hoja A4 en px. */
export const ALTO_HOJA = 297 * MM;
/** Espacio gris entre hojas, en px. */
export const SEPARACION_HOJAS = 12;
const PASO = ALTO_HOJA + SEPARACION_HOJAS;

/** Meta de una transacción para volver a paginar (cambió el formato de hoja). */
export const REPAGINAR = "repaginar";

const clave = new PluginKey<EstadoPaginacion>("paginacion");

interface EstadoPaginacion {
	decos: DecorationSet;
	version: number;
}

export interface Linea {
	top: number;
	bottom: number;
	/** Posición del primer carácter del renglón. */
	pos: number;
}

export interface Unidad {
	tipo: "bloque" | "salto";
	/** Posición antes del nodo. */
	pos: number;
	top: number;
	bottom: number;
	/** Renglones de un párrafo (si tiene más de uno se puede partir). */
	lineas: Linea[];
}

export interface Espaciador {
	pos: number;
	alto: number;
	/** Dentro de un párrafo (entre renglones) o antes de un bloque. */
	enLinea: boolean;
}

function renglones(view: EditorView, dom: HTMLElement, desde: number, hasta: number, base: number) {
	const rango = document.createRange();
	rango.selectNodeContents(dom);
	const rects = Array.from(rango.getClientRects())
		.filter((r) => r.width > 0 && r.height > 0)
		.sort((a, b) => a.top - b.top || a.left - b.left);
	const grupos: { top: number; bottom: number; left: number }[] = [];
	for (const r of rects) {
		const g = grupos[grupos.length - 1];
		if (g && r.top < g.bottom - 2 && r.bottom > g.top + 2) {
			g.top = Math.min(g.top, r.top);
			g.bottom = Math.max(g.bottom, r.bottom);
			g.left = Math.min(g.left, r.left);
		} else {
			grupos.push({ top: r.top, bottom: r.bottom, left: r.left });
		}
	}
	// Los rects son del texto; el renglón ocupa el interlineado completo.
	const interlineado = Number.parseFloat(getComputedStyle(dom).lineHeight);
	const doc = view.state.doc;
	const lineas: Linea[] = [];
	for (const g of grupos) {
		const medio = (g.top + g.bottom) / 2;
		const alto = Number.isFinite(interlineado) ? Math.max(interlineado, g.bottom - g.top) : g.bottom - g.top;
		let pos = view.posAtCoords({ left: g.left + 1, top: medio })?.pos ?? -1;
		if (pos <= desde || pos >= hasta) pos = -1;
		// Que el renglón empiece en la palabra, no en el espacio anterior.
		else if (doc.textBetween(pos, pos + 1) === " ") pos += 1;
		lineas.push({ top: medio - alto / 2 - base, bottom: medio + alto / 2 - base, pos });
	}
	return lineas;
}

function medir(view: EditorView, base: number): Unidad[] {
	const unidades: Unidad[] = [];
	const recorrer = (node: PMNode, pos: number) => {
		const dom = view.nodeDOM(pos);
		if (!(dom instanceof HTMLElement)) return;
		if (node.type.name === "saltoPagina") {
			const r = dom.getBoundingClientRect();
			unidades.push({ tipo: "salto", pos, top: r.top - base, bottom: r.bottom - base, lineas: [] });
			return;
		}
		// Listas y citas: se pagina lo que tienen adentro.
		if (!node.isTextblock && !node.isLeaf && node.type.name !== "table") {
			node.forEach((hijo, offset) => recorrer(hijo, pos + 1 + offset));
			return;
		}
		const r = dom.getBoundingClientRect();
		const lineas = node.isTextblock ? renglones(view, dom, pos, pos + node.nodeSize, base) : [];
		unidades.push({
			tipo: "bloque",
			pos,
			top: r.top - base,
			bottom: r.bottom - base,
			// Sin la posición de algún renglón no se puede partir: va entero.
			lineas: lineas.every((l) => l.pos >= 0) ? lineas : [],
		});
	};
	view.state.doc.forEach((node, offset) => recorrer(node, offset));
	return unidades;
}

/** Dónde cortar cada hoja, a partir de las medidas del texto de corrido. */
export function calcularHojas(
	unidades: Unidad[],
	margenSuperior: number,
	margenInferior: number,
): { espaciadores: Espaciador[]; hojas: number } {
	const arriba = (k: number) => k * PASO + margenSuperior;
	const abajo = (k: number) => k * PASO + ALTO_HOJA - margenInferior;
	const espaciadores: Espaciador[] = [];
	let desplazamiento = 0;
	let k = 0;
	let fin = 0;
	let forzar = false;

	for (const u of unidades) {
		let tope = u.top + desplazamiento;
		while (tope >= (k + 1) * PASO) k++;

		if (u.tipo === "salto") {
			forzar = true;
			fin = Math.max(fin, u.bottom + desplazamiento);
			continue;
		}
		if (forzar) {
			forzar = false;
			if (tope > arriba(k) + 1) {
				const alto = arriba(k + 1) - tope;
				espaciadores.push({ pos: u.pos, alto, enLinea: false });
				desplazamiento += alto;
				k++;
				tope = arriba(k);
			}
		}

		const { lineas } = u;
		const n = lineas.length;
		let j = 0; // primer renglón que falta ubicar
		while (u.bottom + desplazamiento > abajo(k)) {
			const alTope = tope <= arriba(k) + 1;
			let i = -1;
			if (n >= 2) {
				i = lineas.findIndex((l, x) => x >= j && l.bottom + desplazamiento > abajo(k));
				if (i === -1) break;
				if (n - i < 2) i = n - 2; // no dejar un renglón solo arriba de la hoja
				if (i - j < 2) i = alTope ? Math.max(i, j + 1) : -1; // ni uno solo al pie
			}
			if (i <= j) {
				// Lo que falta pasa entero a la hoja siguiente. Si ya está al
				// principio de una hoja y no entra, no hay nada que hacer.
				if (alTope) break;
				const alto = arriba(k + 1) - tope;
				espaciadores.push(
					j === 0
						? { pos: u.pos, alto, enLinea: false }
						: { pos: lineas[j].pos, alto, enLinea: true },
				);
				desplazamiento += alto;
				k++;
				tope = arriba(k);
				continue;
			}
			const alto = arriba(k + 1) - (lineas[i].top + desplazamiento);
			espaciadores.push({ pos: lineas[i].pos, alto, enLinea: true });
			desplazamiento += alto;
			k++;
			j = i;
			tope = arriba(k);
		}
		fin = Math.max(fin, u.bottom + desplazamiento);
	}
	return { espaciadores, hojas: Math.max(1, Math.floor(Math.max(fin - 1, 0) / PASO) + 1) };
}

function espaciador({ alto, enLinea }: Espaciador) {
	return () => {
		const el = document.createElement(enLinea ? "span" : "div");
		el.className = enLinea ? "salto-hoja salto-hoja-linea" : "salto-hoja";
		el.style.height = `${alto}px`;
		el.contentEditable = "false";
		return el;
	};
}

export interface OpcionesPaginacion {
	/** Cantidad de hojas, para dibujarlas detrás del texto. */
	alCambiarHojas: (hojas: number) => void;
}

export const Paginacion = Extension.create<OpcionesPaginacion>({
	name: "paginacion",

	addOptions() {
		return { alCambiarHojas: () => {} };
	},

	addProseMirrorPlugins() {
		const { alCambiarHojas } = this.options;
		let hojas = 0;
		const firma = (pos: number, e: Pick<Espaciador, "alto" | "enLinea">) =>
			`${pos}:${e.enLinea ? "l" : "b"}:${e.alto.toFixed(1)}`;

		const paginar = (view: EditorView) => {
			const hoja = view.dom.closest<HTMLElement>(".hoja-a4");
			// Oculto (otra pestaña) o a mitad de una composición (acentos, IME).
			if (!hoja || hoja.offsetParent === null || view.composing) return;

			// Se mide con el texto de corrido (sin los espaciadores actuales).
			hoja.classList.add("midiendo");
			const base = hoja.getBoundingClientRect().top;
			const estilo = getComputedStyle(hoja);
			const unidades = medir(view, base);
			hoja.classList.remove("midiendo");

			const res = calcularHojas(
				unidades,
				Number.parseFloat(estilo.paddingTop),
				Number.parseFloat(estilo.paddingBottom),
			);
			if (res.hojas !== hojas) {
				hojas = res.hojas;
				alCambiarHojas(hojas);
			}
			// Si los espaciadores que hay (ya movidos por las ediciones) son los
			// mismos, no se toca nada.
			const actuales = (clave.getState(view.state)?.decos.find() ?? [])
				.map((d) => firma(d.from, d.spec.espaciador as Espaciador))
				.join("|");
			const nuevos = res.espaciadores.map((e) => firma(e.pos, e)).join("|");
			if (nuevos === actuales) return;
			const decos = res.espaciadores.map((e) =>
				Decoration.widget(e.pos, espaciador(e), {
					side: -1,
					ignoreSelection: true,
					key: `hoja-${firma(e.pos, e)}`,
					espaciador: e,
				}),
			);
			const tr = view.state.tr.setMeta(clave, DecorationSet.create(view.state.doc, decos));
			view.dispatch(tr.setMeta("addToHistory", false));
		};

		return [
			new Plugin<EstadoPaginacion>({
				key: clave,
				state: {
					init: () => ({ decos: DecorationSet.empty, version: 0 }),
					apply: (tr, prev) => {
						const decos = tr.getMeta(clave) as DecorationSet | undefined;
						return {
							decos: decos ?? prev.decos.map(tr.mapping, tr.doc),
							version: prev.version + (tr.docChanged || tr.getMeta(REPAGINAR) ? 1 : 0),
						};
					},
				},
				props: {
					decorations: (state) => clave.getState(state)?.decos,
				},
				view: (view) => {
					let cuadro = 0;
					const programar = () => {
						cancelAnimationFrame(cuadro);
						cuadro = requestAnimationFrame(() => paginar(view));
					};
					programar();
					// Hasta que carga la fuente los renglones miden otra cosa.
					document.fonts?.ready.then(programar);
					// Cuando aparece (estaba en una pestaña oculta) o cambia de tamaño.
					const observador = new ResizeObserver(programar);
					observador.observe(view.dom);
					return {
						update: (v, previo) => {
							if (clave.getState(v.state)?.version !== clave.getState(previo)?.version) programar();
						},
						destroy: () => {
							cancelAnimationFrame(cuadro);
							observador.disconnect();
						},
					};
				},
			}),
		];
	},
});
