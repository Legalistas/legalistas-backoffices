"use client"

import { ChevronDownIcon } from 'lucide-react'
import type React from "react"
import { useState, useEffect, useRef } from "react"

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: Array<{
    value: string
    label: string
  }>
  placeholder?: string
  onValueChange: (value: string) => void
  className?: string
  defaultValue?: string
  value?: string
}

const Select = ({
  options,
  placeholder = "Select an option",
  onValueChange,
  className = "",
  defaultValue = "",
  value,
  id,
  name,
  ...props
}: SelectProps) => {
  // Track if this is the first render
  const isFirstRender = useRef(true)

  // Determine if component is controlled or uncontrolled
  const isControlled = value !== undefined

  // Manage the selected value
  const [selectedValue, setSelectedValue] = useState<string>(isControlled ? value : defaultValue)

  // Update internal state when value prop changes (for controlled mode)
  useEffect(() => {
    if (isControlled) {
      setSelectedValue(value)
    }
  }, [value, isControlled])

  // Set defaultValue on first render only (for uncontrolled mode)
  useEffect(() => {
    if (isFirstRender.current && !isControlled && defaultValue) {
      setSelectedValue(defaultValue)
      isFirstRender.current = false
    }
  }, [defaultValue, isControlled])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value

    // Always update internal state
    setSelectedValue(newValue)

    // Call parent handler
    onValueChange(newValue)
  }

  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 ${selectedValue ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"
          } ${className}`}
        value={selectedValue}
        onChange={handleChange}
        {...props}
      >
        {/* Placeholder option */}
        <option value="" disabled className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
          {placeholder}
        </option>
        {/* Map over options */}
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-gray-700 dark:bg-gray-900 dark:text-gray-400">
            {option.label}
          </option>
        ))}
      </select>
      <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
        <ChevronDownIcon />
      </span>
    </div>
  )
}

export default Select
