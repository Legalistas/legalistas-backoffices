"use client";

import {
	Bell,
	Handshake,
	Loader2,
	PlayCircle,
	RefreshCw,
	Scale,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CrmAlertsTable } from "@/components/crm-monitor/CrmAlertsTable";
import { CrmMonitorOverview } from "@/components/crm-monitor/CrmMonitorOverview";
import { useCrmMonitorReport } from "@/components/crm-monitor/useCrmMonitorReport";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lunes 00:00 (local) de la semana que contiene `date`. Mismo criterio que
// el backend en src/modules/crm-monitor/engine/week.ts.
function mondayOf(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	const day = d.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	return d;
}

function toISODate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

const RULE_LABELS: Record<string, string> = {
	"opportunities-stalled": "Oportunidades",
	"negotiations-stalled": "Negociaciones",
	"cases-stalled": "Casos legales",
};

const RULE_ICONS: Record<string, typeof Users> = {
	"opportunities-stalled": Users,
	"negotiations-stalled": Handshake,
	"cases-stalled": Scale,
};

const RULE_ORDER = [
	"opportunities-stalled",
	"negotiations-stalled",
	"cases-stalled",
];

export default function CrmMonitorPage() {
	const defaultWeek = useMemo(() => toISODate(mondayOf(new Date())), []);
	const [weekOf, setWeekOf] = useState(defaultWeek);
	const { data, loading, error, refresh, runNow, running } =
		useCrmMonitorReport(weekOf);

	const handleRun = async () => {
		const result = await runNow();
		if (result) {
			toast.success(
				`${result.totalInserted} alertas nuevas (${result.totalDetected} detectadas)`,
			);
		} else {
			toast.error("Error ejecutando el monitor");
		}
	};

	const activeTab =
		RULE_ORDER.find((k) => (data?.byRule[k]?.length ?? 0) > 0) ?? RULE_ORDER[0];

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
			<header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
				<div className="flex items-center gap-3">
					<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
						<Bell className="size-5 text-primary" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold text-slate-900">
							Monitor de Gestión
						</h1>
						<p className="text-sm text-slate-500">
							Oportunidades, negociaciones y casos sin movimiento. Se ejecuta
							automáticamente cada día — usá <em>Ejecutar ahora</em> para
							actualizar bajo demanda.
						</p>
					</div>
				</div>
				<div className="flex flex-wrap items-end gap-2">
					<div className="flex flex-col">
						<label
							htmlFor="week-of"
							className="mb-1 text-xs font-medium text-slate-600"
						>
							Semana (lunes)
						</label>
						<Input
							id="week-of"
							type="date"
							value={weekOf}
							onChange={(e) => setWeekOf(e.target.value)}
							className="w-[160px]"
						/>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={refresh}
						disabled={loading}
					>
						<RefreshCw
							className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
						/>
						Refrescar
					</Button>
					<Button size="sm" onClick={handleRun} disabled={running}>
						{running ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						) : (
							<PlayCircle className="mr-2 h-4 w-4" />
						)}
						Ejecutar ahora
					</Button>
				</div>
			</header>

			{error && (
				<div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					Error cargando el reporte: {error}
				</div>
			)}

			<CrmMonitorOverview data={data} />

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Alertas por regla</CardTitle>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue={activeTab} key={activeTab}>
						<TabsList>
							{RULE_ORDER.map((key) => {
								const count = data?.byRule[key]?.length ?? 0;
								const Icon = RULE_ICONS[key] ?? Bell;
								return (
									<TabsTrigger key={key} value={key} className="gap-1.5">
										<Icon className="size-3.5 text-muted-foreground" />
										{RULE_LABELS[key] ?? key}
										<span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
											{count}
										</span>
									</TabsTrigger>
								);
							})}
						</TabsList>
						{RULE_ORDER.map((key) => (
							<TabsContent key={key} value={key} className="mt-4">
								<CrmAlertsTable
									alerts={data?.byRule[key] ?? []}
									users={data?.users ?? []}
								/>
							</TabsContent>
						))}
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
}
