"use client";
import Link from "next/link";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

export default function OtpForm() {
	const [otp, setOtp] = useState(["", "", "", "", "", ""]);
	const inputsRef = useRef<HTMLInputElement[]>([]);

	const handleChange = (value: string, index: number) => {
		const updatedOtp = [...otp];
		updatedOtp[index] = value;

		// Update the state with the new value
		setOtp(updatedOtp);

		// Automatically move to the next input if a value is entered
		if (value && index < inputsRef.current.length - 1) {
			inputsRef.current[index + 1].focus();
		}
	};

	const handleKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
		index: number,
	) => {
		if (event.key === "Backspace") {
			const updatedOtp = [...otp];

			// If current input is empty, move focus to the previous input
			if (!otp[index] && index > 0) {
				inputsRef.current[index - 1].focus();
			}

			// Clear the current input
			updatedOtp[index] = "";
			setOtp(updatedOtp);
		}

		if (event.key === "ArrowLeft" && index > 0) {
			inputsRef.current[index - 1].focus();
		}

		if (event.key === "ArrowRight" && index < inputsRef.current.length - 1) {
			inputsRef.current[index + 1].focus();
		}
	};

	const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
		event.preventDefault();

		// Get the pasted text
		const pasteData = event.clipboardData.getData("text").slice(0, 6).split("");

		// Update OTP with the pasted data
		const updatedOtp = [...otp];
		pasteData.forEach((char, idx) => {
			if (idx < updatedOtp.length) {
				updatedOtp[idx] = char;
			}
		});

		setOtp(updatedOtp);

		// Focus the last filled input
		const filledIndex = pasteData.length - 1;
		if (inputsRef.current[filledIndex]) {
			inputsRef.current[filledIndex].focus();
		}
	};

	const handleSubmit = () => {
		toast.info(`Submitted OTP: ${otp.join("")}`);
	};
	return (
		<div className="flex flex-col flex-1 lg:w-1/2 w-full">
			<div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
				<div className="mb-5 sm:mb-8">
					<h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
						Two Step Verification
					</h1>
					<p className="text-sm text-gray-500 dark:text-gray-400">
						A verification code has been sent to your mobile. Please enter it in
						the field below.
					</p>
				</div>
				<div>
					<form>
						<div className="space-y-5">
							{/* <!-- Email --> */}
							<div>
								<Label>Type your 6 digits security code</Label>
								<div className="flex gap-2 sm:gap-4" id="otp-container">
									{otp.map((_, index) => (
										<input
											key={index}
											type="text"
											maxLength={1}
											value={otp[index]}
											onChange={(e) => handleChange(e.target.value, index)}
											onKeyDown={(e) => handleKeyDown(e, index)}
											onPaste={(e) => handlePaste(e)}
											// ref={(el) => (inputsRef.current[index] = el!)} // Assign input refs
											ref={(el) => {
												if (el) {
													inputsRef.current[index] = el;
												}
											}}
											className="dark:bg-dark-900 otp-input h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-center text-xl font-semibold text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-primary/30 focus:outline-hidden focus:ring-3 focus:ring-primary/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-primary/40"
										/>
									))}
								</div>
							</div>

							{/* <!-- Button --> */}
							<div>
								<button
									onClick={handleSubmit}
									className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-primary shadow-theme-xs hover:bg-primary/90"
								>
									Verify My Account
								</button>
							</div>
						</div>
					</form>
					<div className="mt-5">
						<p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
							Didn’t get the code?{" "}
							<Link
								href="/"
								className="text-primary hover:text-primary dark:text-primary"
							>
								Resend
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
