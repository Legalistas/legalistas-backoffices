"use client";

import { motion } from "framer-motion";
import { Cake, PartyPopper, Sparkles } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Fireworks from "@/components/celebrations/Fireworks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { todayLocalISO } from "./anniversary-config";
import { BIRTHDAY_GREETING } from "./birthday-config";

// =============================================================================
// Cartel + modal de cumpleaños. El cartel queda visible todo el día;
// el modal aparece una sola vez por persona (se recuerda en localStorage) y se
// puede volver a abrir desde el cartel.
// =============================================================================

const seenKey = `birthday-greeting-seen:${BIRTHDAY_GREETING.date}`;

export default function BirthdayGreeting() {
	const { data: session } = useSession();
	const [enabled, setEnabled] = useState(false);
	const [isPreview, setIsPreview] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);

	// La fecha y el query param se leen en el cliente: en el servidor no existe
	// ni la zona horaria del usuario ni la URL con querystring.
	useEffect(() => {
		const preview =
			new URLSearchParams(window.location.search).get(
				BIRTHDAY_GREETING.previewParam,
			) === BIRTHDAY_GREETING.previewValue;

		const isTheDay = todayLocalISO() === BIRTHDAY_GREETING.date;
		if (!preview && !isTheDay) return;

		// Si el saludo es privado, solo lo ve la persona que cumple años.
		// En preview se saltea el filtro para poder probarlo desde cualquier cuenta.
		const targetId = BIRTHDAY_GREETING.userId;
		const currentId = Number(session?.user?.id);
		if (
			!preview &&
			!BIRTHDAY_GREETING.showToEveryone &&
			targetId !== null &&
			currentId !== targetId
		) {
			return;
		}

		setIsPreview(preview);
		setEnabled(true);
		setModalOpen(preview || localStorage.getItem(seenKey) !== "1");
	}, [session?.user?.id]);

	const closeModal = () => {
		setModalOpen(false);
		if (!isPreview) localStorage.setItem(seenKey, "1");
	};

	if (!enabled) return null;

	// A quien cumple años le hablamos en primera persona; al resto del equipo
	// le contamos de quién se trata.
	const isCelebrant =
		BIRTHDAY_GREETING.userId !== null &&
		Number(session?.user?.id) === BIRTHDAY_GREETING.userId;

	const { name, photo } = BIRTHDAY_GREETING;

	const headline = isCelebrant
		? `¡Feliz cumpleaños, ${name}!`
		: `¡Hoy ${name} está de cumpleaños!`;

	const subline = isCelebrant
		? "Que tengas un día espectacular. ¡Disfrutalo mucho!"
		: "Pasá a saludarla y hagamos que sea un gran día.";

	return (
		<>
			<Fireworks active={modalOpen} />

			{/* Cartel — visible todo el día */}
			<motion.div
				initial={{ opacity: 0, y: -12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
				className="relative overflow-hidden border-b border-amber-200 bg-linear-to-r from-amber-100 via-pink-100 to-violet-100 px-4 py-3 dark:border-amber-900/40 dark:from-amber-950/40 dark:via-pink-950/30 dark:to-violet-950/40"
			>
				<div className="flex flex-wrap items-center gap-3">
					{photo ? (
						<Image
							src={photo}
							alt={name}
							width={40}
							height={40}
							className="h-10 w-10 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-white/80 dark:ring-white/20"
						/>
					) : (
						<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm dark:bg-white/10">
							<Cake className="h-5 w-5 text-amber-600 dark:text-amber-400" />
						</span>
					)}
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold text-amber-900 dark:text-amber-200">
							{headline}
						</p>
						<p className="truncate text-xs text-amber-800/80 dark:text-amber-200/70">
							{subline}
						</p>
					</div>
					<Button
						size="sm"
						variant="outline"
						onClick={() => setModalOpen(true)}
						className="shrink-0 border-amber-300 bg-white/70 text-amber-900 hover:bg-white dark:border-amber-800 dark:bg-white/10 dark:text-amber-200"
					>
						<PartyPopper className="mr-1.5 h-3.5 w-3.5" />
						Ver saludo
					</Button>
				</div>
			</motion.div>

			{/* Modal */}
			<Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
				<DialogContent
					showCloseButton={false}
					className="overflow-hidden border-0 bg-linear-to-br from-amber-50 via-pink-50 to-violet-100 p-0 sm:max-w-lg dark:from-amber-950 dark:via-pink-950/60 dark:to-violet-950"
				>
					<div className="px-8 pt-10 pb-8 text-center">
						<motion.div
							initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
							animate={{ scale: 1, rotate: 0, opacity: 1 }}
							transition={{ type: "spring", stiffness: 180, damping: 14 }}
							className="relative mx-auto mb-5 w-fit"
						>
							{photo ? (
								<Image
									src={photo}
									alt={name}
									width={112}
									height={112}
									priority
									className="h-28 w-28 rounded-full object-cover shadow-lg ring-4 ring-white/80 dark:ring-white/10"
								/>
							) : (
								<span className="flex h-28 w-28 items-center justify-center rounded-full bg-white/80 shadow-lg dark:bg-white/10">
									<Cake className="h-12 w-12 text-amber-600 dark:text-amber-400" />
								</span>
							)}
						</motion.div>

						<DialogTitle asChild>
							<motion.h2
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.15 }}
								className="text-balance text-3xl font-bold text-amber-900 dark:text-amber-100"
							>
								{headline}
							</motion.h2>
						</DialogTitle>

						<motion.p
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.28 }}
							className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-amber-800/90 dark:text-amber-200/80"
						>
							{subline}
						</motion.p>

						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.4 }}
							className="mt-4 flex items-center justify-center gap-1.5 text-2xl"
						>
							<span>🎂</span>
							<span>🥳</span>
							<span>✨</span>
							<span>🎈</span>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.5 }}
							className="mt-7"
						>
							<Button
								onClick={closeModal}
								className="bg-pink-600 px-8 text-white shadow-md hover:bg-pink-700"
							>
								<Sparkles className="mr-1.5 h-4 w-4" />
								{isCelebrant ? "¡Gracias!" : "¡A festejar!"}
							</Button>
						</motion.div>

						{isPreview && (
							<p className="mt-5 text-[11px] font-medium uppercase tracking-wider text-amber-700/60 dark:text-amber-300/50">
								Vista previa · el saludo real se activa el{" "}
								{BIRTHDAY_GREETING.date.split("-").reverse().join("/")}
							</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
