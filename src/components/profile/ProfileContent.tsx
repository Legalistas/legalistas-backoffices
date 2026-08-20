"use client";
import {
	Bell,
	Camera,
	ChevronRight,
	Chrome,
	Clock,
	Eye,
	EyeOff,
	Globe,
	KeyRound,
	Laptop,
	Link2,
	Loader2,
	Lock,
	LogOut,
	Mail,
	MessageSquare,
	Monitor,
	Scale,
	Shield,
	Smartphone,
	Tablet,
	User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	ACTIVITY_LOGS_BY_USER_ENDPOINT,
	API_BASE_URL,
	UPLOAD_ENDPOINT,
	USER_PROFILE_ENDPOINT,
} from "@/constant/api-endpoints";
import LegalSection from "@/components/profile/LegalSection";
import { docsType, genderType } from "@/lib/constant";
import { Skeleton } from "@/components/ui/skeleton";

type TabId =
	| "general"
	| "legal"
	| "security"
	| "notifications"
	| "connections";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
	{ id: "general", label: "Información general", icon: User },
	{ id: "legal", label: "Legal", icon: Scale },
	{ id: "security", label: "Seguridad", icon: Lock },
	{ id: "notifications", label: "Notificaciones", icon: Bell },
	{ id: "connections", label: "Conexiones", icon: Link2 },
];

export default function ProfileContent() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<TabId>("general");
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingProfile, setIsLoadingProfile] = useState(true);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [imageError, setImageError] = useState(false);

	// User data
	const [userData, setUserData] = useState({ name: "", email: "", image: null as string | null });
	const [profileData, setProfileData] = useState({ docType: "", docNumber: "", gender: "", birthDate: "", phone: "" });

	// Password
	const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
	const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

	// Notifications
	const [notifications, setNotifications] = useState({
		emailNotifications: true,
		pushNotifications: true,
		meetingReminders: true,
		leadUpdates: true,
		systemUpdates: false,
	});

	// Connections
	const [googleLinked, setGoogleLinked] = useState(false);
	const [emailVerified, setEmailVerified] = useState<string | null>(null);

	// Active sessions
	interface SessionLog {
		id: number;
		loginAt: string;
		logoutAt: string | null;
		durationSecs: number | null;
		ipAddress: string | null;
		browser: string | null;
		browserVersion: string | null;
		os: string | null;
		device: string | null;
		loginMethod: string | null;
	}
	const [activeSessions, setActiveSessions] = useState<SessionLog[]>([]);

	const formatDuration = (secs: number | null | undefined) => {
		if (!secs) return "";
		const h = Math.floor(secs / 3600);
		const m = Math.floor((secs % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	};

	const formatHour = (iso: string) =>
		new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

	const groupedSessions = useMemo(() => {
		if (!activeSessions.length) return [] as {
			dayKey: string;
			label: string;
			firstEntry: SessionLog;
			totalSecs: number;
			sessions: SessionLog[];
		}[];

		const dayKeyOf = (iso: string) => {
			const d = new Date(iso);
			return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		};

		const now = new Date();
		const todayKey = dayKeyOf(now.toISOString());
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayKey = dayKeyOf(yesterday.toISOString());

		const labelFor = (iso: string) => {
			const k = dayKeyOf(iso);
			if (k === todayKey) return "Hoy";
			if (k === yesterdayKey) return "Ayer";
			const d = new Date(iso);
			return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
		};

		const byDay = new Map<string, SessionLog[]>();
		for (const s of activeSessions) {
			const key = dayKeyOf(s.loginAt);
			const bucket = byDay.get(key) ?? [];
			bucket.push(s);
			byDay.set(key, bucket);
		}

		const groups = Array.from(byDay.entries()).map(([dayKey, sessions]) => {
			const asc = [...sessions].sort(
				(a, b) => new Date(a.loginAt).getTime() - new Date(b.loginAt).getTime(),
			);
			const totalSecs = asc.reduce((acc, s) => acc + (s.durationSecs || 0), 0);
			return {
				dayKey,
				label: labelFor(asc[0].loginAt),
				firstEntry: asc[0],
				totalSecs,
				sessions: asc,
			};
		});

		groups.sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1));
		return groups.slice(0, 7);
	}, [activeSessions]);

	// Fetch profile
	useEffect(() => {
		if (!session?.user?.id || status !== "authenticated") return;
		const fetchProfile = async () => {
			setIsLoadingProfile(true);
			try {
				const res = await fetch(`${USER_PROFILE_ENDPOINT}/${session.user.id}`, {
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.user.accessToken}` },
				});
				if (!res.ok) throw new Error("Error al cargar perfil");
				const data = await res.json();
				console.log("Profile data:", data);
				setUserData({ name: session.user.name || "", email: session.user.email || "", image: session.user.image || null });
				if (data.profile) {
					setProfileData({
						docType: data.profile.docType?.toString() || "",
						docNumber: data.profile.docNumber || "",
						gender: data.profile.gender?.toString() || "",
						birthDate: data.profile.birthDate || "",
						phone: data.profile.phone || "",
					});
				}
				if (data.googleLinked !== undefined) {
					setGoogleLinked(data.googleLinked);
				}
				setEmailVerified(data.emailVerified || null);

				// Fetch historial de sesiones (se agrupa por día en el render)
				const sessionsRes = await fetch(ACTIVITY_LOGS_BY_USER_ENDPOINT(Number(session.user.id)), {
					headers: { Authorization: `Bearer ${session.user.accessToken}` },
				});
				if (sessionsRes.ok) {
					const sessionsData = await sessionsRes.json();
					const all = sessionsData.data || sessionsData || [];
					setActiveSessions(all);
				}
			} catch (err) {
				toast.error("Error al cargar el perfil");
			} finally {
				setIsLoadingProfile(false);
			}
		};
		fetchProfile();
	}, [session?.user?.id, status]);

	// Save profile
	const handleSaveProfile = async () => {
		setIsLoading(true);
		try {
			const res = await fetch(`${USER_PROFILE_ENDPOINT}/${session?.user?.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
				body: JSON.stringify({
					name: userData.name, email: userData.email, image: userData.image,
					docType: profileData.docType ? parseInt(profileData.docType) : null,
					docNumber: profileData.docNumber,
					gender: profileData.gender ? parseInt(profileData.gender) : null,
					birthDate: profileData.birthDate, phone: profileData.phone,
				}),
			});
			if (!res.ok) throw new Error("Error al actualizar");
			toast.success("Perfil actualizado correctamente");
		} catch {
			toast.error("Error al actualizar el perfil");
		} finally {
			setIsLoading(false);
		}
	};

	// Change password
	const handleChangePassword = async () => {
		if (passwordData.newPassword !== passwordData.confirmPassword) {
			toast.error("Las contraseñas no coinciden");
			return;
		}
		if (passwordData.newPassword.length < 6) {
			toast.error("La contraseña debe tener al menos 6 caracteres");
			return;
		}
		setIsLoading(true);
		try {
			const res = await fetch(`${API_BASE_URL}/app/change-password`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.user?.accessToken}` },
				body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Error al cambiar contraseña");
			}
			toast.success("Contraseña actualizada correctamente");
			setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
		} catch (err: any) {
			toast.error(err.message || "Error al cambiar la contraseña");
		} finally {
			setIsLoading(false);
		}
	};

	// Upload image
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setIsLoading(true);
		try {
			const formData = new FormData();
			formData.append("image", file);
			const res = await fetch(`${UPLOAD_ENDPOINT}/profile_pic`, {
				method: "POST",
				headers: { Authorization: `Bearer ${session?.user?.accessToken}` },
				body: formData,
			});
			if (!res.ok) throw new Error("Error al subir imagen");
			const data = await res.json();
			setUserData((prev) => ({ ...prev, image: data.imageUrl || data.url || data.path || "" }));
			setImageError(false);
			toast.success("Imagen actualizada");
		} catch {
			toast.error("Error al subir la imagen");
		} finally {
			setIsLoading(false);
		}
	};

	if (status === "loading") {
		return (
			<div className="space-y-6">
				<Skeleton className="h-8 w-52" />
				<div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
					<div className="bg-card border border-border rounded-xl p-3 space-y-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton key={i} className="h-10 w-full rounded-lg" />
						))}
					</div>
					<div className="bg-card border border-border rounded-xl p-6 space-y-6">
						<Skeleton className="h-6 w-40" />
						<div className="flex items-center gap-5">
							<Skeleton className="h-20 w-20 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-3 w-48" />
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="space-y-2">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-10 w-full rounded-lg" />
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	const imageUrl = userData.image
		? userData.image.startsWith("http") ? userData.image : `${process.env.NEXT_PUBLIC_BACKEND_URL}${userData.image}`
		: null;

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold text-foreground">Configuración de perfil</h1>

			{!isLoadingProfile && !emailVerified && (
				<div className="flex items-center justify-between p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
					<div className="flex items-center gap-3">
						<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
							<Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<p className="text-sm font-medium text-amber-800 dark:text-amber-300">Tu cuenta no está verificada</p>
							<p className="text-xs text-amber-600 dark:text-amber-400">Verificá tu correo electrónico para acceder a todas las funcionalidades</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0"
						onClick={() => toast.success("Email de verificación enviado a " + userData.email)}
					>
						<Mail className="h-3.5 w-3.5 mr-1.5" />
						Enviar verificación
					</Button>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
				{/* Sidebar */}
				<div className="flex flex-col bg-card border border-border rounded-xl p-3 md:min-h-100">
					<div className="space-y-1">
						{TABS.map((tab) => (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={`w-full flex items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${
									activeTab === tab.id
										? "bg-primary/10 text-primary font-medium"
										: "text-muted-foreground hover:bg-muted hover:text-foreground"
								}`}
							>
								<div className="flex items-center gap-2.5">
									<tab.icon className="h-4 w-4" />
									{tab.label}
								</div>
								<ChevronRight className="h-3.5 w-3.5" />
							</button>
						))}
					</div>
					<div className="pt-3 mt-auto border-t border-border">
						<button
							onClick={() => router.push("/api/auth/signout")}
							className="w-full flex items-center gap-2.5 p-2.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
						>
							<LogOut className="h-4 w-4" />
							Cerrar sesión
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="bg-card border border-border rounded-xl p-6">
					{/* ═══ GENERAL ═══ */}
					{activeTab === "general" && (
						<div className="space-y-6">
							<h2 className="text-lg font-semibold text-foreground">Información general</h2>

							{/* Avatar */}
							<div className="flex items-center gap-5">
								<div className="relative">
									<div
										className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden cursor-pointer ring-2 ring-border"
										onClick={() => fileInputRef.current?.click()}
									>
										{imageUrl && !imageError ? (
											<Image src={imageUrl} alt="Avatar" width={80} height={80} className="h-full w-full object-cover" onError={() => setImageError(true)} />
										) : (
											<User className="h-8 w-8 text-muted-foreground" />
										)}
									</div>
									<button
										onClick={() => fileInputRef.current?.click()}
										className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 text-white hover:bg-primary/90 transition-colors"
									>
										<Camera className="h-3.5 w-3.5" />
									</button>
									<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium text-foreground">{userData.name || "Sin nombre"}</p>
										{emailVerified ? (
											<span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
												<Shield className="h-2.5 w-2.5" />
												Verificada
											</span>
										) : (
											<span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
												<Shield className="h-2.5 w-2.5" />
												No verificada
											</span>
										)}
									</div>
									<p className="text-xs text-muted-foreground">{userData.email}</p>
									<button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline mt-1">
										Cambiar foto
									</button>
								</div>
							</div>

							{/* Form */}
							{isLoadingProfile ? (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{Array.from({ length: 6 }).map((_, i) => (
										<div key={i} className="space-y-2">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-10 w-full rounded-lg" />
										</div>
									))}
								</div>
							) : (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label>Nombre completo</Label>
										<Input value={userData.name} onChange={(e) => setUserData((p) => ({ ...p, name: e.target.value }))} />
									</div>
									<div className="space-y-2">
										<Label>Correo electrónico</Label>
										<Input value={userData.email} disabled className="opacity-60" />
										<p className="text-[11px] text-muted-foreground">No se puede modificar. <Link href="/admin/ticket" className="text-primary hover:underline">Contactar soporte</Link></p>
									</div>
									<div className="space-y-2">
										<Label>Tipo de documento</Label>
										<Select value={profileData.docType} onValueChange={(v) => setProfileData((p) => ({ ...p, docType: v }))}>
											<SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
											<SelectContent>
												{docsType.map((d) => <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>)}
											</SelectContent>
										</Select>
									</div>
									<div className="space-y-2">
										<Label>Número de documento</Label>
										<Input value={profileData.docNumber} onChange={(e) => setProfileData((p) => ({ ...p, docNumber: e.target.value }))} />
									</div>
									<div className="space-y-2">
										<Label>Teléfono</Label>
										<Input type="tel" value={profileData.phone} onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))} />
									</div>
									<div className="space-y-2">
										<Label>Fecha de nacimiento</Label>
										<Input type="date" value={profileData.birthDate?.split("T")[0] || ""} onChange={(e) => setProfileData((p) => ({ ...p, birthDate: e.target.value }))} />
									</div>
									<div className="space-y-2">
										<Label>Sexo</Label>
										<Select value={profileData.gender} onValueChange={(v) => setProfileData((p) => ({ ...p, gender: v }))}>
											<SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
											<SelectContent>
												{genderType.map((g) => <SelectItem key={g.value} value={g.value.toString()}>{g.label}</SelectItem>)}
											</SelectContent>
										</Select>
									</div>
								</div>
							)}

							<div className="flex justify-end pt-4 border-t border-border">
								<Button onClick={handleSaveProfile} disabled={isLoading}>
									{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									Guardar cambios
								</Button>
							</div>
						</div>
					)}

					{/* ═══ LEGAL ═══ */}
					{activeTab === "legal" && (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-foreground">
									Datos profesionales
								</h2>
								<p className="text-sm text-muted-foreground mt-1">
									Matrícula y datos de contacto que se usan en los formularios
									SRT
								</p>
							</div>
							<LegalSection />
						</div>
					)}

					{/* ═══ SECURITY ═══ */}
					{activeTab === "security" && (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-foreground">Seguridad</h2>
								<p className="text-sm text-muted-foreground mt-1">Cambiá tu contraseña para mantener tu cuenta segura</p>
							</div>

							<div className="max-w-md space-y-4">
								<div className="space-y-2">
									<Label>Contraseña actual</Label>
									<div className="relative">
										<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											type={showPasswords.current ? "text" : "password"}
											value={passwordData.currentPassword}
											onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
											className="pl-10 pr-10"
											placeholder="Ingresá tu contraseña actual"
										/>
										<button type="button" onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
											{showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
										</button>
									</div>
								</div>
								<div className="space-y-2">
									<Label>Nueva contraseña</Label>
									<div className="relative">
										<KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											type={showPasswords.new ? "text" : "password"}
											value={passwordData.newPassword}
											onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
											className="pl-10 pr-10"
											placeholder="Mínimo 6 caracteres"
										/>
										<button type="button" onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
											{showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
										</button>
									</div>
								</div>
								<div className="space-y-2">
									<Label>Confirmar contraseña</Label>
									<div className="relative">
										<Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											type={showPasswords.confirm ? "text" : "password"}
											value={passwordData.confirmPassword}
											onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
											className="pl-10 pr-10"
											placeholder="Repetí la nueva contraseña"
										/>
										<button type="button" onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
											{showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
										</button>
									</div>
								</div>
								{passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
									<p className="text-xs text-destructive">Las contraseñas no coinciden</p>
								)}
							</div>

							<div className="flex justify-end pt-4 border-t border-border">
								<Button onClick={handleChangePassword} disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}>
									{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
									Cambiar contraseña
								</Button>
							</div>

							{/* Active Sessions */}
							<div className="pt-6 border-t border-border space-y-4">
								<div>
									<h3 className="text-sm font-semibold text-foreground">Historial de sesiones</h3>
									<p className="text-xs text-muted-foreground mt-0.5">Accesos agrupados por día · primera entrada destacada</p>
								</div>

								{groupedSessions.length > 0 ? (
									<div className="space-y-5">
										{groupedSessions.map((g) => (
											<div key={g.dayKey} className="space-y-2">
												<div className="flex flex-wrap items-center justify-between gap-2 px-1">
													<div className="flex items-center gap-2">
														<span className="text-xs font-semibold text-foreground capitalize">{g.label}</span>
														<span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
															<Clock className="h-3 w-3" />
															1ª entrada {formatHour(g.firstEntry.loginAt)}
														</span>
													</div>
													{g.totalSecs > 0 && (
														<span className="text-[11px] text-muted-foreground">
															Total trabajado: <span className="font-medium text-foreground">{formatDuration(g.totalSecs)}</span>
														</span>
													)}
												</div>
												<div className="space-y-2">
													{g.sessions.map((s, idx) => {
														const DeviceIcon = s.device === "mobile" ? Smartphone : s.device === "tablet" ? Tablet : Laptop;
														const isCurrentSession = s.id === session?.user?.activityLogId;
														const isActive = !s.logoutAt;
														const isFirstOfDay = idx === 0;
														return (
															<div key={s.id} className={`flex items-center justify-between p-3 rounded-lg border ${isCurrentSession ? "border-primary/30 bg-primary/5" : isFirstOfDay ? "border-primary/20 bg-primary/2" : "border-border"}`}>
																<div className="flex items-center gap-3">
																	<div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isCurrentSession || isFirstOfDay ? "bg-primary/10" : "bg-muted"}`}>
																		<DeviceIcon className={`h-4 w-4 ${isCurrentSession || isFirstOfDay ? "text-primary" : "text-muted-foreground"}`} />
																	</div>
																	<div>
																		<div className="flex items-center gap-2 flex-wrap">
																			<p className="text-sm font-medium text-foreground">
																				{s.browser || "Desconocido"}{s.browserVersion ? ` ${s.browserVersion.split(".")[0]}` : ""}
																			</p>
																			{isFirstOfDay && (
																				<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase bg-primary/10 text-primary">
																					1ª del día
																				</span>
																			)}
																			{s.loginMethod && (
																				<span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase ${s.loginMethod === "google" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-muted text-muted-foreground"}`}>
																					{s.loginMethod}
																				</span>
																			)}
																		</div>
																		<p className="text-xs text-muted-foreground">
																			{s.os || "SO desconocido"}
																			{s.ipAddress && ` · ${s.ipAddress}`}
																			{` · ${formatHour(s.loginAt)}`}
																			{s.durationSecs ? ` · ${formatDuration(s.durationSecs)}` : ""}
																		</p>
																	</div>
																</div>
																{isCurrentSession ? (
																	<span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
																		<span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
																		Actual
																	</span>
																) : isActive ? (
																	<span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
																		<span className="h-1.5 w-1.5 rounded-full bg-green-500" />
																		Activa
																	</span>
																) : (
																	<span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
																		Cerrada
																	</span>
																)}
															</div>
														);
													})}
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-6 text-sm text-muted-foreground">
										No hay sesiones registradas
									</div>
								)}
							</div>
						</div>
					)}

					{/* ═══ NOTIFICATIONS ═══ */}
					{activeTab === "notifications" && (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-foreground">Notificaciones</h2>
								<p className="text-sm text-muted-foreground mt-1">Configurá qué notificaciones querés recibir</p>
							</div>

							<div className="space-y-1">
								{[
									{ key: "emailNotifications" as const, icon: Mail, label: "Notificaciones por email", desc: "Recibir actualizaciones y alertas por correo electrónico" },
									{ key: "pushNotifications" as const, icon: Smartphone, label: "Notificaciones push", desc: "Recibir notificaciones en tiempo real en el navegador" },
									{ key: "meetingReminders" as const, icon: Bell, label: "Recordatorios de reuniones", desc: "Avisos antes de reuniones y eventos programados" },
									{ key: "leadUpdates" as const, icon: MessageSquare, label: "Actualizaciones de leads", desc: "Novedades sobre cambios en leads y oportunidades" },
									{ key: "systemUpdates" as const, icon: Monitor, label: "Actualizaciones del sistema", desc: "Información sobre mantenimiento y nuevas funcionalidades" },
								].map((item) => (
									<div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
										<div className="flex items-center gap-3">
											<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
												<item.icon className="h-4 w-4 text-muted-foreground" />
											</div>
											<div>
												<p className="text-sm font-medium text-foreground">{item.label}</p>
												<p className="text-xs text-muted-foreground">{item.desc}</p>
											</div>
										</div>
										<Switch
											checked={notifications[item.key]}
											onCheckedChange={(checked) => setNotifications((p) => ({ ...p, [item.key]: checked }))}
										/>
									</div>
								))}
							</div>

							<div className="flex justify-end pt-4 border-t border-border">
								<Button onClick={() => toast.success("Preferencias guardadas")} disabled={isLoading}>
									Guardar preferencias
								</Button>
							</div>
						</div>
					)}

					{/* ═══ CONNECTIONS ═══ */}
					{activeTab === "connections" && (
						<div className="space-y-6">
							<div>
								<h2 className="text-lg font-semibold text-foreground">Conexiones</h2>
								<p className="text-sm text-muted-foreground mt-1">Gestioná las cuentas vinculadas a tu perfil</p>
							</div>

							<div className="space-y-3">
								{/* Google */}
								<div className="flex items-center justify-between p-4 rounded-xl border border-border">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
											<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
												<path d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z" fill="#4285F4" />
												<path d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z" fill="#34A853" />
												<path d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z" fill="#FBBC05" />
												<path d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z" fill="#EB4335" />
											</svg>
										</div>
										<div>
											<p className="text-sm font-medium text-foreground">Google</p>
											<p className="text-xs text-muted-foreground">
												{googleLinked ? "Cuenta vinculada" : "No vinculada"}
											</p>
										</div>
									</div>
									{googleLinked ? (
										<div className="flex items-center gap-2">
											<span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
												<div className="h-1.5 w-1.5 rounded-full bg-green-500" />
												Vinculada
											</span>
										</div>
									) : (
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												window.location.href = "/api/auth/signin?callbackUrl=/admin/profile";
											}}
											className="gap-1.5"
										>
											<Link2 className="h-3.5 w-3.5" />
											Vincular
										</Button>
									)}
								</div>

								{/* Microsoft - placeholder */}
								<div className="flex items-center justify-between p-4 rounded-xl border border-border opacity-50">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
											<svg width="20" height="20" viewBox="0 0 21 21" fill="none">
												<rect x="1" y="1" width="9" height="9" fill="#F25022" />
												<rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
												<rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
												<rect x="11" y="11" width="9" height="9" fill="#FFB900" />
											</svg>
										</div>
										<div>
											<p className="text-sm font-medium text-foreground">Microsoft</p>
											<p className="text-xs text-muted-foreground">Próximamente</p>
										</div>
									</div>
									<span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Pronto</span>
								</div>
							</div>

							<div className="bg-muted/50 rounded-lg p-4 mt-4">
								<p className="text-xs text-muted-foreground">
									Las cuentas vinculadas te permiten iniciar sesión más rápido y de forma segura sin necesidad de contraseña.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
