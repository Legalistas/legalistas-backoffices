"use client"
import { useState } from "react"
import { Dropdown } from "../ui/dropdown/Dropdown"
import { DropdownItem } from "../ui/dropdown/DropdownItem"
import { DotIcon, Menu } from "lucide-react"

interface ChatHeaderProps {
  onToggle: () => void
}

export default function ChatHeader({ onToggle }: ChatHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)

  function toggleDropdown() {
    setIsOpen(!isOpen)
  }

  function closeDropdown() {
    setIsOpen(false)
  }

  return (
    <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-10 h-10 text-gray-700 transition border border-gray-300 rounded-full xl:hidden dark:border-gray-700 dark:text-gray-400 dark:hover:text-white/90"
        >
          <Menu size={20} />
        </button>
        <h3 className="font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">Mensajes</h3>
      </div>
      <div>
        <button className="dropdown-toggle" onClick={toggleDropdown}>
          <DotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300" />
        </button>
        <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-40 p-2">
          <DropdownItem
            onItemClick={closeDropdown}
            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            Marcar todos como leídos
          </DropdownItem>
          <DropdownItem
            onItemClick={closeDropdown}
            className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            Configuración
          </DropdownItem>
        </Dropdown>
      </div>
    </div>
  )
}
