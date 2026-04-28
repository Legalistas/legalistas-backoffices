"use client";

import { Moon, Sun } from "lucide-react";
import AttendanceHeaderIndicator from "@/components/attendance/AttendanceHeaderIndicator";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import GlobalSearch from "@/components/layout/GlobalSearch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useTheme } from "@/context/ThemeContext";

export default function Header() {
	const { theme, toggleTheme } = useTheme();

	return (
		<header className="relative z-50 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 shadow-sm">
			<div className="flex items-center gap-2">
				<SidebarTrigger className="size-10 text-muted-foreground hover:text-foreground" />
				<Separator orientation="vertical" className="h-5" />
			</div>

			<div className="relative flex-1 max-w-xl">
				<GlobalSearch />
			</div>

			<div className="ml-auto flex items-center gap-2">
				<AttendanceHeaderIndicator />
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleTheme}
					className="size-10 rounded-full text-muted-foreground hover:text-foreground"
				>
					{theme === "dark" ? (
						<Sun className="size-5" />
					) : (
						<Moon className="size-5" />
					)}
					<span className="sr-only">Cambiar tema</span>
				</Button>

				<NotificationDropdown />
			</div>
		</header>
	);
}
