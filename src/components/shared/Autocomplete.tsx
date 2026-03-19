"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { User } from "@/types/users";

interface AutocompleteProps {
	options: User[];
	onSelect: (selectedUserId: number | null) => void;
	placeholder?: string;
	value?: number | null;
	defaultValue?: number | null;
	id?: string;
	name?: string;
	className?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
	options,
	onSelect,
	placeholder = "Buscar usuario...",
	value,
	defaultValue,
	id,
	name,
	className,
}) => {
	const isControlled = value !== undefined;
	const [inputValue, setInputValue] = useState<string>(() => {
		const initialId = isControlled ? value : defaultValue;
		if (initialId !== null && initialId !== undefined) {
			const user = options.find((opt) => opt.id === initialId);
			return user ? user.name : "";
		}
		return "";
	});
	const [filteredSuggestions, setFilteredSuggestions] = useState<User[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (isControlled) {
			const user = options.find((opt) => opt.id === value);
			setInputValue(user ? user.name : "");
		}
	}, [value, isControlled, options]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const input = e.target.value;
		setInputValue(input);
		if (input.length > 0) {
			const filtered = options.filter((user) =>
				user.name.toLowerCase().includes(input.toLowerCase()),
			);
			setFilteredSuggestions(filtered);
			setShowSuggestions(true);
			setActiveSuggestionIndex(-1);
		} else {
			setFilteredSuggestions([]);
			setShowSuggestions(false);
			onSelect(null);
		}
	};

	const handleSelectSuggestion = useCallback(
		(user: User) => {
			setInputValue(user.name);
			onSelect(user.id);
			setShowSuggestions(false);
		},
		[onSelect],
	);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActiveSuggestionIndex((prevIndex) =>
				prevIndex < filteredSuggestions.length - 1 ? prevIndex + 1 : prevIndex,
			);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActiveSuggestionIndex((prevIndex) =>
				prevIndex > 0 ? prevIndex - 1 : 0,
			);
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (
				activeSuggestionIndex !== -1 &&
				filteredSuggestions[activeSuggestionIndex]
			) {
				handleSelectSuggestion(filteredSuggestions[activeSuggestionIndex]);
			} else {
				const exactMatch = filteredSuggestions.find(
					(user) => user.name.toLowerCase() === inputValue.toLowerCase(),
				);
				if (exactMatch) {
					handleSelectSuggestion(exactMatch);
				} else {
					onSelect(null);
					setShowSuggestions(false);
				}
			}
		} else if (e.key === "Escape") {
			setShowSuggestions(false);
			setActiveSuggestionIndex(-1);
		}
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleBlur = () => {
		if (inputValue) {
			const exactMatch = options.find(
				(user) => user.name.toLowerCase() === inputValue.toLowerCase(),
			);
			if (exactMatch) {
				handleSelectSuggestion(exactMatch);
			} else {
				onSelect(null);
			}
		} else {
			onSelect(null);
		}
		setShowSuggestions(false);
	};

	const selectedUserId = isControlled ? value : null;

	return (
		<div className={cn("relative", className)} ref={wrapperRef}>
			<Input
				id={id}
				name={name}
				type="text"
				value={inputValue}
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				onFocus={() => {
					if (inputValue.length > 0) {
						const filtered = options.filter((user) =>
							user.name.toLowerCase().includes(inputValue.toLowerCase()),
						);
						setFilteredSuggestions(filtered);
						setShowSuggestions(true);
					} else {
						setFilteredSuggestions(options);
						setShowSuggestions(true);
					}
				}}
				onBlur={handleBlur}
				placeholder={placeholder}
				autoComplete="off"
			/>
			{showSuggestions && filteredSuggestions.length > 0 && (
				<ul className="absolute z-50 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-auto mt-1 p-1">
					{filteredSuggestions.map((user, index) => (
						<li
							key={user.id}
							className={cn(
								"relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden",
								"hover:bg-accent hover:text-accent-foreground",
								index === activeSuggestionIndex && "bg-accent text-accent-foreground",
								selectedUserId === user.id && "font-medium",
							)}
							onMouseDown={(e) => {
								e.preventDefault();
								handleSelectSuggestion(user);
							}}
						>
							{selectedUserId === user.id && (
								<Check className="mr-2 h-4 w-4 shrink-0" />
							)}
							{user.name}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};
