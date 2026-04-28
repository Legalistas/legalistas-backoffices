"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	Coffee,
	Loader2,
	LogOut,
	Pause,
	Play,
	Timer,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	computePauseSecs,
	computeWorkedSecs,
	formatHMS,
	useAttendance,
} from "@/context/AttendanceContext";

export default function AttendanceChecker() {
	const { state, record, submitting, doAction } = useAttendance();
	const [collapsed, setCollapsed] = useState(false);

	if (state === null) return null;
	if (state === "NO_EMPLOYMENT" || state === "COMPLETED") return null;

	if (state === "NEEDS_CHECK_IN") {
		return (
			<Dialog open modal>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-md"
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Timer className="h-5 w-5 text-primary" />
							Registrar entrada
						</DialogTitle>
						<DialogDescription>
							Para empezar a trabajar, registrá tu entrada. Esto es obligatorio
							para continuar usando el sistema.
						</DialogDescription>
					</DialogHeader>

					<div className="py-4 flex items-center justify-center">
						<div className="text-center">
							<div className="text-4xl font-bold tabular-nums text-primary mb-1">
								{new Date().toLocaleTimeString("es-AR", {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</div>
							<div className="text-xs text-muted-foreground">
								{new Date().toLocaleDateString("es-AR", {
									weekday: "long",
									day: "numeric",
									month: "long",
								})}
							</div>
						</div>
					</div>

					<Button
						size="lg"
						className="w-full"
						disabled={submitting}
						onClick={() => doAction("check-in")}
					>
						{submitting ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Play className="h-4 w-4 mr-2" />
						)}
						Registrar entrada
					</Button>
				</DialogContent>
			</Dialog>
		);
	}

	if (state === "PAUSED" && record) {
		const pauseSecs = computePauseSecs(record);
		return (
			<Dialog open modal>
				<DialogContent
					showCloseButton={false}
					className="sm:max-w-md"
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Coffee className="h-5 w-5 text-amber-600" />
							En pausa
						</DialogTitle>
						<DialogDescription>
							Estás en pausa. Cuando vuelvas al trabajo presioná Retomar para
							seguir usando el sistema.
						</DialogDescription>
					</DialogHeader>

					<div className="py-4 flex flex-col items-center justify-center gap-2">
						<div className="text-4xl font-bold tabular-nums text-amber-600">
							{formatHMS(pauseSecs)}
						</div>
						<div className="text-xs text-muted-foreground">
							Tiempo en pausa
						</div>
					</div>

					<Button
						size="lg"
						className="w-full"
						disabled={submitting}
						onClick={() => doAction("resume")}
					>
						{submitting ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Play className="h-4 w-4 mr-2" />
						)}
						Retomar
					</Button>
				</DialogContent>
			</Dialog>
		);
	}

	if (state === "WORKING" && record) {
		const workedSecs = computeWorkedSecs(record);

		return (
			<div
				className="fixed z-40"
				style={{ bottom: "90px", right: "20px" }}
				data-testid="attendance-floating-widget"
			>
				<AnimatePresence mode="wait" initial={false}>
					{collapsed ? (
						<motion.button
							key="collapsed"
							initial={{ opacity: 0, scale: 0.7 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.7 }}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setCollapsed(false)}
							title={`Trabajando ${formatHMS(workedSecs)}`}
							className="relative flex items-center justify-center w-14 h-14 rounded-full bg-card border border-border text-foreground shadow-lg hover:bg-accent transition-colors"
						>
							<Timer className="h-5 w-5" />
							<span className="absolute -top-1 -right-1 flex h-3 w-3">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
								<span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
							</span>
						</motion.button>
					) : (
						<motion.div
							key="expanded"
							initial={{ opacity: 0, scale: 0.85, y: 10 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.85, y: 10 }}
							className="rounded-lg border border-border bg-card shadow-lg p-3 flex items-center gap-3 min-w-60"
						>
							<div className="flex items-center gap-2 flex-1">
								<div className="relative flex h-2.5 w-2.5">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
									<span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
								</div>
								<div>
									<div className="text-xs text-muted-foreground leading-none">
										Trabajando
									</div>
									<div className="text-sm font-semibold tabular-nums">
										{formatHMS(workedSecs)}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1">
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8"
									title="Pausar"
									disabled={submitting}
									onClick={() => doAction("pause")}
								>
									<Pause className="h-4 w-4" />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
									title="Salir"
									disabled={submitting}
									onClick={() => {
										if (confirm("¿Registrar salida y cerrar el día?")) {
											doAction("check-out");
										}
									}}
								>
									<LogOut className="h-4 w-4" />
								</Button>
								<Button
									size="icon"
									variant="ghost"
									className="h-8 w-8 text-muted-foreground"
									title="Minimizar"
									onClick={() => setCollapsed(true)}
								>
									<ChevronDown className="h-4 w-4" />
								</Button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}

	return null;
}
