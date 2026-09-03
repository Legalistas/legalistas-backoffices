"use client";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { CLOSING_PAYMENTS_ENDPOINT } from "@/constant/api-endpoints";
import type { ClosingPayment } from "@/types/closing-manager";

interface ClosingPaymentHistoryModalProps {
	closingId: number;
	subtype: "fee" | "pcl";
	isOpen: boolean;
	onClose: () => void;
}

const formatCurrency = (amount: number) =>
	new Intl.NumberFormat("es-AR", {
		style: "currency",
		currency: "ARS",
		minimumFractionDigits: 2,
	}).format(amount);

const formatDate = (dateString: string) => {
	const d = new Date(dateString);
	return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function ClosingPaymentHistoryModal({
	closingId,
	subtype,
	isOpen,
	onClose,
}: ClosingPaymentHistoryModalProps) {
	const { data: session } = useSession();
	const [loading, setLoading] = useState(false);
	const [payments, setPayments] = useState<ClosingPayment[]>([]);
	const [total, setTotal] = useState(0);

	useEffect(() => {
		if (!isOpen || !session?.user?.accessToken) return;
		const controller = new AbortController();
		setLoading(true);
		fetch(CLOSING_PAYMENTS_ENDPOINT(closingId, subtype), {
			headers: { Authorization: `Bearer ${session.user.accessToken}` },
			signal: controller.signal,
		})
			.then((res) => res.json())
			.then((json) => {
				setPayments(json?.data ?? []);
				setTotal(json?.total ?? 0);
			})
			.catch((err) => {
				if ((err as Error).name !== "AbortError") console.error(err);
			})
			.finally(() => setLoading(false));
		return () => controller.abort();
	}, [isOpen, closingId, subtype, session?.user?.accessToken]);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>
						Historial de pagos — {subtype === "fee" ? "HP" : "PCL"}
					</DialogTitle>
				</DialogHeader>
				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : payments.length === 0 ? (
					<p className="text-sm text-muted-foreground py-4 text-center">
						Todavía no se registraron pagos.
					</p>
				) : (
					<div className="space-y-2 max-h-[400px] overflow-y-auto">
						{payments.map((p) => (
							<div
								key={p.id}
								className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
							>
								<div className="min-w-0">
									<p className="font-medium">{formatCurrency(p.amount)}</p>
									<p className="text-xs text-muted-foreground truncate">
										{formatDate(p.date)}
										{p.user ? ` · ${p.user.name}` : ""}
										{p.description ? ` · ${p.description}` : ""}
									</p>
								</div>
							</div>
						))}
						<div className="flex items-center justify-between pt-2 border-t text-sm font-semibold">
							<span>Total pagado</span>
							<span>{formatCurrency(total)}</span>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
