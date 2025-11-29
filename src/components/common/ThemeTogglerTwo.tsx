"use client";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";
import React from "react";

export default function ThemeTogglerTwo() {
    const { toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            className="inline-flex size-12 items-center justify-center rounded-full bg-[#09A4B5] text-white transition-colors hover:bg-[#09A4B5]/80 dark:bg-[#09A4B5] dark:text-white dark:hover:bg-[#09A4B5]/80 p-2 shadow-lg"
        >
            <Moon className="hidden dark:block" size={25} />
            <Sun className="dark:hidden" size={25} />
        </button>
    );
}
