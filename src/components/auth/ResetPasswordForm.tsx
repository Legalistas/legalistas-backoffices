"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FORGOT_PASSWORD_ENDPOINT } from "@/constant/api-endpoints";

export default function ResetPasswordForm() {
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) {
			toast.error("Ingresá tu correo electrónico");
			return;
		}

		setLoading(true);
		try {
			const res = await fetch(FORGOT_PASSWORD_ENDPOINT, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email }),
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message || "Error al enviar el correo");
			}

			setSent(true);
			toast.success("Correo enviado. Revisá tu bandeja de entrada.");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Error al enviar el correo",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col flex-1 lg:w-1/2 w-full">
			<div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
				<div className="mb-5 sm:mb-8">
					<h1 className="mb-2 font-semibold text-foreground text-title-sm sm:text-title-md">
						¿Olvidaste tu contraseña?
					</h1>
					<p className="text-sm text-muted-foreground">
						Ingresá el correo electrónico vinculado a tu cuenta y te enviaremos
						un enlace para restablecer tu contraseña.
					</p>
				</div>

				{sent ? (
					<div className="rounded-lg border border-border bg-muted/50 p-6 text-center space-y-3">
						<Mail className="mx-auto h-10 w-10 text-primary" />
						<h2 className="text-lg font-semibold text-foreground">
							Correo enviado
						</h2>
						<p className="text-sm text-muted-foreground">
							Si existe una cuenta con <strong>{email}</strong>, recibirás un
							enlace para restablecer tu contraseña.
						</p>
						<Button
							variant="outline"
							className="mt-2"
							onClick={() => {
								setSent(false);
								setEmail("");
							}}
						>
							Enviar de nuevo
						</Button>
					</div>
				) : (
					<div>
						<form onSubmit={handleSubmit}>
							<div className="space-y-5">
								<div>
									<Label>
										Correo electrónico
										<span className="text-red-500">*</span>
									</Label>
									<div className="relative">
										<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
										<Input
											type="email"
											placeholder="tu@correo.com"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="pl-9"
											disabled={loading}
										/>
									</div>
								</div>

								<Button
									type="submit"
									className="w-full"
									disabled={loading}
								>
									{loading ? "Enviando..." : "Enviar enlace"}
								</Button>
							</div>
						</form>
						<div className="mt-5">
							<p className="text-sm text-center text-muted-foreground sm:text-start">
								Recordé mi contraseña...{" "}
								<Link
									href="/"
									className="text-primary hover:underline"
								>
									Iniciar sesión
								</Link>
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
