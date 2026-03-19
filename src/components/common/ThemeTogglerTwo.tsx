"use client";
import { Moon, Sun } from "lucide-react";
import React from "react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeTogglerTwo() {
	const { toggleTheme } = useTheme();
	return (
		<button
			onClick={toggleTheme}
			className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/80 dark:bg-primary dark:text-white dark:hover:bg-primary/80 p-2 shadow-lg"
		>
			<Moon className="hidden dark:block" size={25} />
			<Sun className="dark:hidden" size={25} />
		</button>
	);
}
