"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"

interface SelectDropdownProps {
    value: string
    options: readonly string[]
    onChange: (value: string) => void
    className?: string
    badgeClassName?: string
}

export function SelectDropdown({ value, options, onChange, className, badgeClassName }: SelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 120),
            })
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const handleScroll = () => setIsOpen(false)
        window.addEventListener("scroll", handleScroll, true)
        return () => window.removeEventListener("scroll", handleScroll, true)
    }, [isOpen])

    const dropdown =
        isOpen && mounted
            ? createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
                    <div
                        className="fixed z-[9999] bg-popover border border-border rounded-md shadow-lg py-1 max-h-48 overflow-auto"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            minWidth: dropdownPosition.width,
                        }}
                    >
                        {options.map((option) => (
                            <button
                                key={option}
                                onClick={() => {
                                    onChange(option)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full px-3 py-1.5 text-left text-xs hover:bg-secondary transition-colors",
                                    option === value && "bg-secondary font-medium",
                                )}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </>,
                document.body,
            )
            : null

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center justify-between gap-1 px-2 py-1 rounded text-xs font-medium transition-colors min-w-[80px] w-full",
                    badgeClassName || "bg-secondary text-foreground hover:bg-muted",
                    className,
                )}
            >
                <span className="truncate">{value}</span>
                <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", isOpen && "rotate-180")} />
            </button>
            {dropdown}
        </div>
    )
}
