"use client"

import { useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Button from "@/components/ui/button/Button"
import { cn } from "@/lib/utils"

interface DatePickerCellProps {
    date: Date | null
    onChange: (date: Date | null) => void
}

export function DatePickerCell({ date, onChange }: DatePickerCellProps) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn(
                        "h-8 w-full justify-start text-left font-normal text-xs px-2 hover:bg-muted",
                        !date && "text-muted-foreground",
                    )}
                >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {date ? format(date, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                <Calendar
                    mode="single"
                    selected={date ?? undefined}
                    onSelect={(d: any) => {
                        onChange(d ?? null)
                        setOpen(false)
                    }}
                    locale={es}
                    initialFocus
                    className="bg-popover"
                />
            </PopoverContent>
        </Popover>
    )
}
