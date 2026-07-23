"use client";

import { Loader2, Pencil } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MANUAL_KPIS_ENDPOINT } from "@/constant/api-endpoints";
import { cn } from "@/lib/utils";
import type { KpiFormat, KpiMatrixRow, KpiMatrixSection } from "@/types/kpi";

const MONTH_LABELS = [
	"ENERO",
	"FEBRERO",
	"MARZO",
	"ABRIL",
	"MAYO",
	"JUNIO",
	"JULIO",
	"AGOSTO",
	"SEPTIEMBRE",
	"OCTUBRE",
	"NOVIEMBRE",
	"DICIEMBRE",
];

interface KpiMatrixProps {
	year: number;
	sections: KpiMatrixSection[];
	loading?: boolean;
	/** Ej: "DPTO. LEGALES". Se muestra arriba de las secciones. */
	departmentLabel?: string;
	/** Callback tras guardar un valor inline (para refrescar el hook). */
	onValueChanged?: () => void;
	/**
	 * Labels de las columnas de período. Default: MONTH_LABELS (12 meses).
	 * En modo semana se pasa un array de 4-6 semanas.
	 */
	periodLabels?: string[];
	/**
	 * Encabezado de la columna acumulado. Default: "ACUMULADO {year}".
	 * En modo semana suele ser "TOTAL MES".
	 */
	accumulatedLabel?: string;
	/**
	 * Si true, las celdas editables se muestran como no editables. Útil en
	 * modo semana donde el bucketing por semana está delegado al panel de
	 * carga (evita que el user escriba y no sepa a qué semana va).
	 */
	readOnly?: boolean;
	/**
	 * Índice de la columna a resaltar (0-based). Default: mes actual en modo
	 * año. En modo semana el consumidor decide si resalta la semana actual.
	 */
	highlightIndex?: number;
}

// ─── Formatters ────────────────────────────────────────────────────────

function formatValue(value: number | null, format: KpiFormat = "number") {
	if (value === null || value === undefined || Number.isNaN(value)) return "0";
	if (format === "currency") {
		return new Intl.NumberFormat("es-AR", {
			style: "currency",
			currency: "ARS",
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
		}).format(value);
	}
	if (format === "percent") {
		return `${value.toFixed(2)}%`;
	}
	return new Intl.NumberFormat("es-AR").format(value);
}

function formatPercent(value: number | null) {
	if (value === null || value === undefined || Number.isNaN(value)) return "#N/A";
	const sign = value > 0 ? "" : "";
	return `${sign}${value.toFixed(2)}%`;
}

function computeVMA(monthlyValues: (number | null)[]): number | null {
	const withData: { i: number; v: number }[] = [];
	for (let i = 0; i < monthlyValues.length; i++) {
		const v = monthlyValues[i];
		if (v !== null && v !== undefined && !Number.isNaN(v)) {
			withData.push({ i, v });
		}
	}
	if (withData.length < 2) return null;
	const last = withData[withData.length - 1];
	const prev = withData[withData.length - 2];
	if (!prev || !last || prev.v === 0) return null;
	return ((last.v - prev.v) / Math.abs(prev.v)) * 100;
}

function computeAccumulated(monthlyValues: (number | null)[]) {
	return monthlyValues.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

// ─── Sub-componentes ──────────────────────────────────────────────────

function VmaCell({ value }: { value: number | null }) {
	if (value === null) {
		return (
			<td className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right text-xs text-muted-foreground bg-white dark:bg-gray-900">
				#N/A
			</td>
		);
	}
	const positive = value >= 0;
	return (
		<td
			className={cn(
				"border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right text-xs font-semibold tabular-nums",
				positive
					? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
					: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
			)}
		>
			{formatPercent(value)}
		</td>
	);
}

// Celda editable inline. Al click → input. Enter/blur → PUT.
function EditableCell({
	value,
	format,
	metricKey,
	year,
	monthIdx,
	onSaved,
}: {
	value: number | null;
	format: KpiFormat;
	metricKey: string;
	year: number;
	monthIdx: number;
	onSaved: () => void;
}) {
	const { data: session } = useSession();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(String(value ?? 0));
	const [displayValue, setDisplayValue] = useState<number | null>(value);
	const [saving, setSaving] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setDisplayValue(value);
	}, [value]);

	useEffect(() => {
		if (editing) inputRef.current?.select();
	}, [editing]);

	const startEdit = () => {
		if (saving) return;
		setDraft(String(displayValue ?? 0));
		setEditing(true);
	};

	const cancel = () => {
		setDraft(String(displayValue ?? 0));
		setEditing(false);
	};

	const save = async () => {
		const numValue = Number(draft);
		if (Number.isNaN(numValue) || numValue < 0) {
			toast.error("Valor inválido");
			cancel();
			return;
		}
		// Sin cambios: no hacemos nada.
		if (numValue === (displayValue ?? 0)) {
			setEditing(false);
			return;
		}
		const token = session?.user?.accessToken;
		if (!token) {
			toast.error("Sesión expirada");
			cancel();
			return;
		}

		setEditing(false);
		setSaving(true);
		const periodStart = new Date(year, monthIdx, 1);
		const periodEnd = new Date(year, monthIdx + 1, 0);
		const iso = (d: Date) =>
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

		try {
			const res = await fetch(MANUAL_KPIS_ENDPOINT, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					metricKey,
					periodStart: iso(periodStart),
					periodEnd: iso(periodEnd),
					userId: null,
					value: numValue,
				}),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error || `HTTP ${res.status}`);
			}
			setDisplayValue(numValue);
			toast.success("Guardado");
			onSaved();
		} catch (err) {
			toast.error((err as Error).message);
			setDisplayValue(value); // revertir a valor original
		} finally {
			setSaving(false);
		}
	};

	if (editing) {
		return (
			<td className="border-2 border-amber-500 dark:border-amber-600 p-0 bg-amber-50 dark:bg-amber-950/40 ring-2 ring-amber-200 dark:ring-amber-800/50">
				<input
					ref={inputRef}
					type="number"
					step="any"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") save();
						if (e.key === "Escape") cancel();
					}}
					onBlur={() => save()}
					title="Enter para guardar · Esc para cancelar"
					className="w-full h-full text-right text-xs tabular-nums bg-transparent border-0 outline-none focus:ring-0 px-2 py-1.5 font-semibold text-amber-900 dark:text-amber-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
			</td>
		);
	}

	return (
		<td
			className={cn(
				"border border-gray-300 dark:border-gray-700 p-0 text-right text-xs tabular-nums",
				saving
					? "bg-blue-50 dark:bg-blue-950/30"
					: "bg-amber-50/40 dark:bg-amber-950/10",
			)}
		>
			<button
				type="button"
				onClick={startEdit}
				className={cn(
					"w-full h-full px-2 py-1.5 flex items-center justify-end gap-1 group",
					saving
						? "cursor-wait"
						: "cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30",
				)}
				title="Click para editar"
				disabled={saving}
			>
				{saving ? (
					<Loader2 className="h-3 w-3 animate-spin text-blue-600" />
				) : (
					<Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-80 text-primary" />
				)}
				<span>{formatValue(displayValue, format)}</span>
			</button>
		</td>
	);
}

function DataRow({
	row,
	year,
	onValueChanged,
	periodLabels,
	readOnly,
}: {
	row: KpiMatrixRow;
	year: number;
	onValueChanged?: () => void;
	periodLabels: string[];
	readOnly: boolean;
}) {
	const accumulated = row.accumulated ?? computeAccumulated(row.monthlyValues);
	const vma = computeVMA(row.monthlyValues);
	const indent = row.indentLevel ?? 0;
	const isSub = indent > 0;
	const format = row.format ?? "number";
	const isEditable = Boolean(row.editable && row.sourceKey) && !readOnly;

	return (
		<tr className="hover:bg-gray-50 dark:hover:bg-white/5">
			{isSub ? (
				<>
					<td className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
					<td
						className={cn(
							"border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs bg-white dark:bg-gray-900",
							indent === 2 && "pl-8",
						)}
					>
						<div className="flex items-center gap-1">
							{isEditable && (
								<Pencil className="h-2.5 w-2.5 text-amber-600" />
							)}
							<span>{row.label}</span>
						</div>
					</td>
				</>
			) : (
				<td
					colSpan={2}
					className="border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs bg-white dark:bg-gray-900"
				>
					<div className="flex items-center gap-1">
						{isEditable && <Pencil className="h-2.5 w-2.5 text-primary" />}
						<span>{row.label}</span>
					</div>
				</td>
			)}
			<td className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right text-xs font-medium tabular-nums bg-gray-50 dark:bg-white/5">
				{formatValue(accumulated, format)}
			</td>
			{row.monthlyValues.map((v, i) => {
				const cellKey = `${row.key}-${periodLabels[i] ?? i}`;
				return isEditable && row.sourceKey ? (
					<EditableCell
						key={cellKey}
						value={v}
						format={format}
						metricKey={row.sourceKey}
						year={year}
						monthIdx={i}
						onSaved={() => onValueChanged?.()}
					/>
				) : (
					<td
						key={cellKey}
						className="border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right text-xs tabular-nums bg-white dark:bg-gray-900"
					>
						{formatValue(v, format)}
					</td>
				);
			})}
			<VmaCell value={vma} />
		</tr>
	);
}

function SectionHeader({ label, colSpan }: { label: string; colSpan: number }) {
	return (
		<tr>
			<td
				colSpan={colSpan}
				className="border border-gray-300 dark:border-gray-700 bg-[#3b6ba5] dark:bg-[#284a72] text-white text-center font-semibold text-sm py-1.5 uppercase tracking-wide"
			>
				{label}
			</td>
		</tr>
	);
}

function SubSectionHeader({
	label,
	colSpan,
}: {
	label: string;
	colSpan: number;
}) {
	return (
		<tr>
			<td
				colSpan={colSpan}
				className="border border-gray-300 dark:border-gray-700 bg-[#dbe6f2] dark:bg-[#2a3b52] text-gray-800 dark:text-gray-100 text-center text-xs font-medium py-1"
			>
				{label}
			</td>
		</tr>
	);
}

function DepartmentHeader({
	label,
	colSpan,
}: {
	label: string;
	colSpan: number;
}) {
	return (
		<tr>
			<td
				colSpan={colSpan}
				className="border-0 px-3 pt-3 pb-1.5 text-[11px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider bg-transparent"
			>
				{label}
			</td>
		</tr>
	);
}

export default function KpiMatrix({
	year,
	sections,
	loading,
	departmentLabel,
	onValueChanged,
	periodLabels,
	accumulatedLabel,
	readOnly,
	highlightIndex,
}: KpiMatrixProps) {
	const labels = periodLabels ?? MONTH_LABELS;
	// colSpan total = 2 (logo) + 1 (acumulado) + N (períodos) + 1 (VMA).
	const totalColSpan = 4 + labels.length;
	const highlight = highlightIndex ?? new Date().getMonth();
	const isReadOnly = Boolean(readOnly);

	return (
		<div className="w-full overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
			<table className="w-full border-collapse text-[11px]">
				<thead>
					<tr>
						<th
							colSpan={2}
							className="border border-gray-300 dark:border-gray-700 bg-black text-white p-2 min-w-[280px]"
						>
							<div className="flex items-center justify-center h-12">
								<Image
									src="/images/logo/logo-print-blanco.png"
									alt="Legalistas"
									width={140}
									height={30}
									className="object-contain"
								/>
							</div>
						</th>
						<th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white text-[10px] font-bold px-2 py-2 w-[110px]">
							{accumulatedLabel ? (
								accumulatedLabel
							) : (
								<>
									ACUMULADO
									<br />
									{year}
								</>
							)}
						</th>
						{labels.map((m, i) => (
							<th
								key={m}
								className={cn(
									"border border-gray-300 dark:border-gray-700 text-[10px] font-bold px-1 py-2 w-[85px]",
									i === highlight
										? "bg-black text-white"
										: "bg-white dark:bg-gray-900 text-gray-900 dark:text-white",
								)}
							>
								{m}
							</th>
						))}
						<th className="border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white text-[10px] font-bold px-2 py-2 w-[75px]">
							VMA
						</th>
					</tr>
				</thead>

				<tbody>
					{departmentLabel && (
						<DepartmentHeader label={departmentLabel} colSpan={totalColSpan} />
					)}
					{loading ? (
						<tr>
							<td
								colSpan={totalColSpan}
								className="p-8 text-center text-sm text-muted-foreground"
							>
								Cargando KPIs…
							</td>
						</tr>
					) : (
						sections.map((section) => (
							<Fragment key={section.key}>
								<SectionHeader
									label={section.label}
									colSpan={totalColSpan}
								/>
								{section.subSections.map((sub) => (
									<Fragment key={sub.key}>
										<SubSectionHeader
											label={sub.label}
											colSpan={totalColSpan}
										/>
										{sub.rows.map((row) => (
											<Fragment key={row.key}>
												<DataRow
													row={row}
													year={year}
													onValueChanged={onValueChanged}
													periodLabels={labels}
													readOnly={isReadOnly}
												/>
												{row.subRows?.map((sr) => (
													<DataRow
														key={sr.key}
														row={sr}
														year={year}
														onValueChanged={onValueChanged}
														periodLabels={labels}
														readOnly={isReadOnly}
													/>
												))}
											</Fragment>
										))}
									</Fragment>
								))}
							</Fragment>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
