"use client";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignInForm() {
	const [showPassword, setShowPassword] = useState(false);
	const [isChecked, setIsChecked] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		const errorParam = searchParams.get("error");
		if (errorParam) {
			setError(decodeURIComponent(errorParam));
		}
	}, [searchParams]);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!email || !password) {
			setError("Por favor ingresa tu email y contraseña");
			return;
		}

		setError("");
		setIsLoading(true);

		try {
			const result = await signIn("credentials", {
				email,
				password,
				userAgent: navigator.userAgent,
				redirect: false,
			});

			if (result?.error) {
				setError(result.error);
			} else {
				router.push("/admin/dashboard");
			}
		} catch (error) {
			console.error("Login error:", error);
			setError("Ocurrió un error inesperado");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmitWithGoogle = () => {
		document.cookie = `client-user-agent=${encodeURIComponent(navigator.userAgent)}; path=/; max-age=300; SameSite=Lax`;
		signIn("google", {
			callbackUrl: "/admin/dashboard",
		});
	};

	return (
		<div className="flex flex-col flex-1 lg:w-1/2 w-full">
			<div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
						Bienvenido de nuevo
					</h1>
					<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
						Ingresá tus credenciales para acceder a tu cuenta
					</p>
				</div>

				{/* Error */}
				{error && (
					<div className="flex items-center gap-2 p-3 mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
						<svg
							className="w-4 h-4 shrink-0"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clipRule="evenodd"
							/>
						</svg>
						{error}
					</div>
				)}

				{/* Social login */}
				<Button
					type="button"
					variant="outline"
					onClick={handleSubmitWithGoogle}
					className="w-full h-11 gap-3 text-sm font-medium border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5"
				>
					<svg width="18" height="18" viewBox="0 0 20 20" fill="none">
						<path
							d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
							fill="#4285F4"
						/>
						<path
							d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
							fill="#34A853"
						/>
						<path
							d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
							fill="#FBBC05"
						/>
						<path
							d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
							fill="#EB4335"
						/>
					</svg>
					Continuar con Google
				</Button>

				{/* Divider */}
				<div className="relative my-6">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-gray-200 dark:border-gray-700" />
					</div>
					<div className="relative flex justify-center text-xs uppercase">
						<span className="px-3 text-gray-400 bg-white dark:bg-gray-900">
							o continuar con email
						</span>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-2">
						<Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Correo electrónico
						</Label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								id="email"
								placeholder="nombre@empresa.com"
								type="email"
								name="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="pl-10 h-11"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Contraseña
						</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								id="password"
								type={showPassword ? "text" : "password"}
								placeholder="Ingresá tu contraseña"
								name="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="pl-10 pr-10 h-11"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
							>
								{showPassword ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
							</button>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Checkbox
								id="remember"
								checked={isChecked}
								onCheckedChange={(checked) => setIsChecked(checked === true)}
							/>
							<Label
								htmlFor="remember"
								className="text-sm font-normal text-gray-600 dark:text-gray-400 cursor-pointer"
							>
								Recordarme
							</Label>
						</div>
						<Link
							href="/reset-password"
							className="text-sm font-medium text-primary hover:underline"
						>
							¿Olvidaste tu contraseña?
						</Link>
					</div>

					<Button
						type="submit"
						className="w-full h-11 text-sm font-medium"
						disabled={isLoading || !email || !password}
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Iniciando sesión...
							</>
						) : (
							"Iniciar sesión"
						)}
					</Button>
				</form>

			</div>
		</div>
	);
}
