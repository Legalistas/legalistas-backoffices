"use client";

import { Moon, Search, Sun } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import { useTheme } from "@/context/ThemeContext";

export default function Header() {
	const { theme, toggleTheme } = useTheme();
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "k") {
				event.preventDefault();
				inputRef.current?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 shadow-sm">
			<div className="flex items-center gap-2">
				<SidebarTrigger className="size-10 text-muted-foreground hover:text-foreground" />
				<Separator orientation="vertical" className="h-5" />
			</div>

			<div className="relative flex-1 max-w-xl">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
				<input
					ref={inputRef}
					type="text"
					placeholder="Buscar causas, clientes, expedientes..."
					className="h-10 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors"
				/>
				<kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden h-6 select-none items-center gap-1 rounded-md border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground sm:flex">
					<span className="text-xs">⌘</span>K
				</kbd>
			</div>

			<div className="ml-auto flex items-center gap-1">
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
