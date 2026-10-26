"use client";

import { Camera, Loader2, Shield, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ProvinceCitySelect from "@/components/common/ProvinceCitySelect";
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
import { Skeleton } from "@/components/ui/skeleton";
import { UPLOAD_ENDPOINT, USER_PROFILE_ENDPOINT } from "@/constant/api-endpoints";
import { apiErrorMessage } from "@/lib/api-error";
import { docsType, genderType } from "@/lib/constant";

const EMPTY_ADDRESS = {
	countryId: 1, // Argentina
	stateId: null as number | null,
	cityId: null as number | null,
	city: "",
	street: "",
	streetNumber: "",
	cp: "",
};

/** Personal data of the signed-in user ("Mis datos" in Mi perfil). */
export default function PersonalInfoSection({ isLawyer }: { isLawyer: boolean }) {
	const { data: session, update: updateSession } = useSession();
	const token = session?.user?.accessToken;
	const userId = session?.user?.id;

	const [isLoadingProfile, setIsLoadingProfile] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [imageError, setImageError] = useState(false);
	const [emailVerified, setEmailVerified] = useState<string | null>(null);
	const [userData, setUserData] = useState({ name: "", email: "", image: null as string | null });
	const [profileData, setProfileData] = useState({ docType: "", docNumber: "", gender: "", birthDate: "", phone: "" });
	const [address, setAddress] = useState(EMPTY_ADDRESS);

	// Not keyed on `status`: update() goes through "loading" and would reload the form.
	useEffect(() => {
		if (!token || !userId) return;
		const fetchProfile = async () => {
			setIsLoadingProfile(true);
			try {
				const res = await fetch(`${USER_PROFILE_ENDPOINT}/${userId}`, {
					headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				});
				if (!res.ok) throw new Error("Error al cargar perfil");
				const data = await res.json();
				setUserData({ name: session?.user?.name || "", email: session?.user?.email || "", image: session?.user?.image || null });
				if (data.address) {
					setAddress({
						countryId: data.address.countryId ?? 1,
						stateId: data.address.stateId ?? null,
						cityId: data.address.cityId ?? null,
						city: data.address.city || "",
						street: data.address.street || "",
						streetNumber: data.address.streetNumber || "",
						cp: data.address.cp || "",
					});
				}
				if (data.profile) {
					setProfileData({
						docType: data.profile.docType?.toString() || "",
						docNumber: data.profile.docNumber || "",
						gender: data.profile.gender?.toString() || "",
						birthDate: data.profile.birthDate || "",
						phone: data.profile.phone || "",
					});
				}
				setEmailVerified(data.emailVerified || null);
			} catch {
				toast.error("Error al cargar el perfil");
			} finally {
				setIsLoadingProfile(false);
			}
		};
		fetchProfile();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token, userId]);

	const handleSaveProfile = async () => {
		setIsSaving(true);
		try {
			const res = await fetch(`${USER_PROFILE_ENDPOINT}/${userId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({
					name: userData.name, email: userData.email, image: userData.image,
					docType: profileData.docType ? parseInt(profileData.docType) : null,
					docNumber: profileData.docNumber,
					gender: profileData.gender ? parseInt(profileData.gender) : null,
					birthDate: profileData.birthDate, phone: profileData.phone,
					// The backend needs at least the province to store an address.
					...(address.stateId ? { address: { ...address, isDefault: true } } : {}),
				}),
			});
			if (!res.ok)
				throw new Error(await apiErrorMessage(res, "Error al actualizar el perfil"));
			await updateSession({ name: userData.name });
			toast.success("Perfil actualizado correctamente");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al actualizar el perfil");
		} finally {
			setIsSaving(false);
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setIsSaving(true);
		try {
			const formData = new FormData();
			formData.append("image", file);
			const res = await fetch(`${UPLOAD_ENDPOINT}/profile_pic`, {
				method: "POST",
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});
			if (!res.ok) throw new Error(await apiErrorMessage(res, "Error al subir la imagen"));
			const data = await res.json();
			const image: string = data.imageUrl || data.url || data.path || "";
			// Saved right away: before, the photo was lost unless "Guardar cambios" was clicked too.
			const saved = await fetch(`${USER_PROFILE_ENDPOINT}/${userId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ image }),
			});
			if (!saved.ok) throw new Error(await apiErrorMessage(saved, "No se pudo guardar la foto"));
			setUserData((prev) => ({ ...prev, image }));
			setImageError(false);
			await updateSession({ image });
			toast.success("Foto actualizada");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al subir la imagen");
		} finally {
			setIsSaving(false);
			e.target.value = "";
		}
	};

	const imageUrl = userData.image
		? userData.image.startsWith("http") ? userData.image : `${process.env.NEXT_PUBLIC_BACKEND_URL}${userData.image}`
		: null;

	return (
		<div className="space-y-6">
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
						type="button"
						onClick={() => fileInputRef.current?.click()}
						aria-label="Cambiar foto"
						className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1.5 text-white hover:bg-primary/90 transition-colors"
					>
						<Camera className="h-3.5 w-3.5" />
					</button>
					<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<p className="text-sm font-medium text-foreground">{userData.name || "Sin nombre"}</p>
						{!isLoadingProfile &&
							(emailVerified ? (
								<span className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">
									<Shield className="h-2.5 w-2.5" />
									Verificada
								</span>
							) : (
								<span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">
									<Shield className="h-2.5 w-2.5" />
									No verificada
								</span>
							))}
					</div>
					<p className="text-xs text-muted-foreground">{userData.email}</p>
					<button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline mt-1">
						Cambiar foto
					</button>
				</div>
			</div>

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
				<>
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

					<div className="space-y-4 pt-4 border-t border-border">
						<div>
							<h3 className="text-sm font-semibold text-foreground">Domicilio</h3>
							{isLawyer && (
								<p className="text-xs text-muted-foreground mt-0.5">
									Es el domicilio legal que sale en los formularios SRT.
								</p>
							)}
						</div>
						<ProvinceCitySelect
							stateId={address.stateId}
							cityId={address.cityId}
							onChange={({ stateId, cityId, cityName }) =>
								setAddress((a) => ({ ...a, stateId, cityId, city: cityName ?? "" }))
							}
						/>
						<div className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px] gap-4">
							<div className="space-y-2">
								<Label htmlFor="address-street">Calle</Label>
								<Input id="address-street" value={address.street} onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="address-number">Número</Label>
								<Input id="address-number" value={address.streetNumber} onChange={(e) => setAddress((a) => ({ ...a, streetNumber: e.target.value }))} />
							</div>
							<div className="space-y-2">
								<Label htmlFor="address-cp">Código postal</Label>
								<Input id="address-cp" value={address.cp} onChange={(e) => setAddress((a) => ({ ...a, cp: e.target.value }))} />
							</div>
						</div>
					</div>
				</>
			)}

			<div className="flex justify-end pt-4 border-t border-border">
				<Button onClick={handleSaveProfile} disabled={isSaving || isLoadingProfile}>
					{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Guardar cambios
				</Button>
			</div>
		</div>
	);
}
