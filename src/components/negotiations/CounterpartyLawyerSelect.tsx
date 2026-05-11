"use client";

import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { CASE_PARTS_ENDPOINT } from "@/constant/api-endpoints";
import CreateCounterpartyLawyerModal from "./CreateCounterpartyLawyerModal";

interface Props {
	caseId: number | null | undefined;
	value: string;
	onChange: (name: string) => void;
	disabled?: boolean;
	className?: string;
}

/**
 * Select de "Abogado contraparte" para negociaciones/cierres.
 *
 * Lista las partes del caso con `partyType === 'abogado'`. El valor
 * seleccionado (nombre) se guarda como string en el campo legacy
 * `contraparteLawyer`. El botón "+" abre el modal de crear parte del caso.
 */
export default function CounterpartyLawyerSelect({
	caseId,
	value,
	onChange,
	disabled,
	className,
}: Props) {
	const { data: session } = useSession();
	const [lawyers, setLawyers] = useState<{ id: number; name: string }[]>([]);
	const [loading, setLoading] = useState(false);
	const [showCreate, setShowCreate] = useState(false);

	const fetchLawyers = useCallback(async () => {
		if (!caseId || !session?.user?.accessToken) {
			setLawyers([]);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(CASE_PARTS_ENDPOINT(caseId), {
				headers: {
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			});
			if (!res.ok) {
				setLawyers([]);
				return;
			}
			const json = await res.json();
			const data = (json.data || json) as Array<{
				id: number;
				name: string;
				partyType: string;
			}>;
			setLawyers(
				data
					.filter((p) => p.partyType === "abogado")
					.map((p) => ({ id: p.id, name: p.name })),
			);
		} catch (err) {
			console.error("Error fetching counterparty lawyers:", err);
			setLawyers([]);
		} finally {
			setLoading(false);
		}
	}, [caseId, session?.user?.accessToken]);

	useEffect(() => {
		fetchLawyers();
	}, [fetchLawyers]);

	const handleCreated = (lawyer: { id: number; name: string }) => {
		setLawyers((prev) =>
			prev.some((l) => l.id === lawyer.id) ? prev : [...prev, lawyer],
		);
		onChange(lawyer.name);
	};

	const isEmpty = lawyers.length === 0;
	const placeholder = !caseId
		? "Seleccioná un caso primero"
		: loading
			? "Cargando..."
			: isEmpty
				? "Sin abogados cargados"
				: "Seleccionar abogado";

	// Si el value actual no está en la lista (legacy/manual), lo agrego como item.
	const valueInList = lawyers.some((l) => l.name === value);
	const showLegacyValue = Boolean(value) && !valueInList;

	return (
		<>
			<div className={`flex gap-2 ${className ?? ""}`}>
				<Select
					value={value || undefined}
					onValueChange={onChange}
					disabled={disabled || !caseId}
				>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder={placeholder} />
					</SelectTrigger>
					<SelectContent>
						{showLegacyValue && (
							<SelectItem value={value}>{value}</SelectItem>
						)}
						{lawyers.map((l) => (
							<SelectItem key={l.id} value={l.name}>
								{l.name}
							</SelectItem>
						))}
						{!showLegacyValue && isEmpty && !loading && (
							<div className="px-3 py-2 text-xs text-muted-foreground">
								No hay abogados cargados en este caso
							</div>
						)}
					</SelectContent>
				</Select>
				<Button
					type="button"
					variant="outline"
					size="icon"
					disabled={disabled || !caseId}
					onClick={() => setShowCreate(true)}
					title="Crear nuevo abogado contraparte"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			{caseId && (
				<CreateCounterpartyLawyerModal
					open={showCreate}
					onOpenChange={setShowCreate}
					caseId={caseId}
					onCreated={handleCreated}
				/>
			)}
		</>
	);
}
