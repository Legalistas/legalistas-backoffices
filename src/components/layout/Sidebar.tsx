"use client";

import {
	ChevronRight,
	ChevronsUpDown,
	LogOut,
	Settings,
	Ticket,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { MENU_SECTIONS } from "@/constant/menu";
import type { NavItem } from "@/types/navigation";

export default function LayoutSidebar() {
	const pathname = usePathname();
	const { data: session } = useSession();
	const { state } = useSidebar();

	const userRole =
		session?.user?.role?.toLowerCase?.() ?? session?.user?.role;

	const hasAccess = useCallback(
		(roles?: string[]) => {
			if (!roles || roles.length === 0) return true;
			if (!userRole) return false;
			return roles.includes(userRole);
		},
		[userRole],
	);

	const filteredSections = useMemo(() => {
		return MENU_SECTIONS.filter((section) => hasAccess(section.roles))
			.map((section) => ({
				...section,
				items: section.items.filter((item) => hasAccess(item.roles)),
			}))
			.filter((section) => section.items.length > 0);
	}, [hasAccess]);

	const isActive = useCallback(
		(path: string) => path === pathname,
		[pathname],
	);

	const isCollapsed = state === "collapsed";

	const userImage = session?.user?.image
		? session.user.image.startsWith("http")
			? session.user.image
			: `${process.env.NEXT_PUBLIC_BACKEND_URL}${session.user.image}`
		: null;

	return (
		<Sidebar collapsible="icon" variant="sidebar">
			<SidebarHeader className="p-4 flex items-center justify-center">
				<Link
					href="/admin/dashboard"
					className="flex items-center justify-center"
				>
					{isCollapsed ? (
						<Image
							src="/images/logo/logo-icon.svg"
							alt="Legalistas"
							width={36}
							height={36}
							className="shrink-0 dark:brightness-0 dark:invert"
						/>
					) : (
						<Image
							src="/images/logo/logo-dark.svg"
							alt="Legalistas"
							width={170}
							height={48}
							loading="eager"
							className="brightness-0 invert"
							style={{ width: "auto", height: "auto" }}
						/>
					)}
				</Link>
			</SidebarHeader>

			<SidebarContent className="px-2 group-data-[collapsible=icon]:items-center">
				{filteredSections.map((section) => (
					<SidebarGroup key={section.type}>
						<SidebarGroupLabel className="uppercase text-[11px] font-semibold tracking-widest text-sidebar-foreground/40 px-3">
							{section.label}
						</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{section.items.map((nav) => (
									<NavMenuItem
										key={nav.name}
										nav={nav}
										isActive={isActive}
										hasAccess={hasAccess}
									/>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-0!"
								>
									<Avatar className="size-8 rounded-lg shrink-0">
										{userImage ? (
											<AvatarImage
												src={userImage}
												alt={session?.user?.name || ""}
											/>
										) : null}
										<AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
											{session?.user?.name
												?.split(" ")
												.map((n) => n[0])
												.join("")
												.slice(0, 2)
												.toUpperCase() || "U"}
										</AvatarFallback>
									</Avatar>
									<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
										<span className="truncate font-semibold text-sidebar-foreground">
											{session?.user?.name || "Usuario"}
										</span>
										<span className="truncate text-xs text-sidebar-foreground/60">
											{session?.user?.email || ""}
										</span>
									</div>
									<ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
								side="top"
								align="end"
								sideOffset={4}
							>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<Avatar className="size-8 rounded-lg">
											{userImage ? (
												<AvatarImage
													src={userImage}
													alt={session?.user?.name || ""}
												/>
											) : null}
											<AvatarFallback className="rounded-lg">
												{session?.user?.name
													?.split(" ")
													.map((n) => n[0])
													.join("")
													.slice(0, 2)
													.toUpperCase() || "U"}
											</AvatarFallback>
										</Avatar>
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-semibold">
												{session?.user?.name || "Usuario"}
											</span>
											<span className="truncate text-xs text-muted-foreground">
												{session?.user?.email || ""}
											</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link href="/admin/profile" className="cursor-pointer">
										<Settings className="mr-2 size-4" />
										Configuraci&oacute;n
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Ticket className="mr-2 size-4" />
									Soporte t&eacute;cnico
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive focus:text-destructive cursor-pointer"
									onClick={() => signOut({ callbackUrl: "/signin" })}
								>
									<LogOut className="mr-2 size-4" />
									Cerrar sesi&oacute;n
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}

function NavMenuItem({
	nav,
	isActive,
	hasAccess,
}: {
	nav: NavItem;
	isActive: (path: string) => boolean;
	hasAccess: (roles?: string[]) => boolean;
}) {
	const Icon = nav.icon as React.ComponentType<{ className?: string }>;
	const hasSubItems = !!nav.subItems;

	if (!hasSubItems) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton
					asChild
					isActive={isActive(nav.path || "")}
					tooltip={nav.name}
					className="cursor-pointer"
				>
					<Link href={nav.path || "#"} className="cursor-pointer">
						<Icon className="size-4" />
						<span>{nav.name}</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	const visibleSubItems = nav.subItems!.filter((sub) =>
		hasAccess(sub.roles),
	);
	if (visibleSubItems.length === 0) return null;

	const isSubActive = visibleSubItems.some((sub) => isActive(sub.path));

	return (
		<Collapsible asChild defaultOpen={isSubActive} className="group/collapsible">
			<SidebarMenuItem>
				<CollapsibleTrigger asChild>
					<SidebarMenuButton tooltip={nav.name} isActive={isSubActive} className="cursor-pointer">
						<Icon className="size-4" />
						<span>{nav.name}</span>
						<ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<SidebarMenuSub>
						{visibleSubItems.map((subItem) => (
							<SidebarMenuSubItem key={subItem.name}>
								<SidebarMenuSubButton
									asChild
									isActive={isActive(subItem.path)}
									className="cursor-pointer"
								>
									<Link href={subItem.path} className="cursor-pointer">
										<span>{subItem.name}</span>
										{subItem.new && (
											<span className="ml-auto rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
												new
											</span>
										)}
										{subItem.pro && (
											<span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
												pro
											</span>
										)}
									</Link>
								</SidebarMenuSubButton>
							</SidebarMenuSubItem>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}
