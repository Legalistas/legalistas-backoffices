"use client";
import Image from "next/image";
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Session } from "next-auth";
import { ChevronDown, Cog, LogOut, Ticket, User, UserCircle } from "lucide-react";
import { signOut } from "next-auth/react"; // 👈 Importa signOut

interface UserDropdownProps {
    data: Session | null;
}

const UserDropdown = ({ data }: UserDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                className="flex items-center dropdown-toggle text-gray-700 dark:text-gray-400"
            >
                <span className="mr-3 overflow-hidden rounded-full h-11 w-11">
                    {data?.user?.image ? (
                        <Image
                            src={
                                data.user.image.startsWith('http')
                                    ? data.user.image
                                    : `${process.env.NEXT_PUBLIC_BACKEND_URL}${data.user.image}`
                            }
                            alt={data?.user?.name || "User Avatar"}
                            width={45}
                            height={45}
                            quality={100}
                            priority
                            className="h-full w-full aspect-square object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = '<div class="h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-full"><svg class="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>';
                            }}
                        />
                    ) : (
                        <div className="h-full w-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-full">
                            <User className="h-7 w-7 text-gray-500" />
                        </div>
                    )}
                </span>
                <span className="block mr-1 font-medium text-theme-sm">
                    {data?.user?.name || "John Doe"}
                </span>
                <ChevronDown
                    className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            <Dropdown
                isOpen={isOpen}
                onClose={closeDropdown}
                className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
            >
                <div>
                    <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
                        {data?.user?.name || "John Doe"}
                    </span>
                    <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                        {data?.user?.email || "john@doe.com"}
                    </span>
                </div>

                <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                    <li>
                        <DropdownItem
                            onItemClick={closeDropdown}
                            tag="a"
                            href="/admin/profile"
                            className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                            <Cog className="w-6 h-6" />
                            Configuración
                        </DropdownItem>
                    </li>
                    <li>
                        <DropdownItem
                            onItemClick={closeDropdown}
                            tag="a"
                            href="/profile"
                            className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                        >
                            <Ticket className="w-6 h-6" />
                            Soporte técnico
                        </DropdownItem>
                    </li>
                </ul>

                <button
                    onClick={() => signOut({ callbackUrl: '/signin' })} // 👈 Cierra la sesión
                    className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-red-500 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-white/5 dark:hover:text-red-300"
                >
                    <LogOut className="w-6 h-6" />
                    <span className="text-start">Cerrar sesión</span>
                </button>
            </Dropdown>
        </div>
    );
};

export default UserDropdown;
