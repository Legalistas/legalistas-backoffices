"use client";

import { useEffect, useRef } from "react";

// =============================================================================
// Fuegos artificiales en canvas. Sin dependencias: cohetes que suben, explotan
// y caen con gravedad. Se monta como overlay a pantalla completa y no
// intercepta clicks (pointer-events-none).
//
// Respeta `prefers-reduced-motion`: si el sistema lo pide, no anima nada.
// =============================================================================

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	color: string;
	size: number;
}

interface Rocket {
	x: number;
	y: number;
	vy: number;
	targetY: number;
	color: string;
}

const GOLD = "#fbbf24";

const COLORS: string[] = [
	GOLD, // dorado
	"#f472b6", // rosa
	"#38bdf8", // celeste
	"#a78bfa", // violeta
	"#4ade80", // verde
	"#fb7185", // coral
];

const pickColor = (): string =>
	COLORS[Math.floor(Math.random() * COLORS.length)] ?? GOLD;

const GRAVITY = 0.045;
const FRICTION = 0.985;

export default function Fireworks({ active }: { active: boolean }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!active) return;

		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Accesibilidad: si pidieron menos movimiento, no animamos.
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		let width = 0;
		let height = 0;

		const resize = () => {
			const dpr = window.devicePixelRatio || 1;
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		window.addEventListener("resize", resize);

		const rockets: Rocket[] = [];
		const particles: Particle[] = [];

		const launch = () => {
			const color = pickColor();
			rockets.push({
				x: width * (0.15 + Math.random() * 0.7),
				y: height,
				vy: -(height / 90) * (0.85 + Math.random() * 0.4),
				targetY: height * (0.12 + Math.random() * 0.33),
				color,
			});
		};

		const explode = (rocket: Rocket) => {
			const count = 55 + Math.floor(Math.random() * 30);
			// Un tercio de las explosiones mezcla colores, el resto es monocromática.
			const mixed = Math.random() < 0.35;
			for (let i = 0; i < count; i++) {
				const angle = (Math.PI * 2 * i) / count + Math.random() * 0.15;
				const speed = 1.6 + Math.random() * 3.4;
				const maxLife = 55 + Math.random() * 35;
				particles.push({
					x: rocket.x,
					y: rocket.y,
					vx: Math.cos(angle) * speed,
					vy: Math.sin(angle) * speed,
					life: maxLife,
					maxLife,
					color: mixed ? pickColor() : rocket.color,
					size: 1.5 + Math.random() * 1.8,
				});
			}
		};

		let frame = 0;
		let rafId = 0;

		const tick = () => {
			frame++;

			// Estela: en vez de limpiar del todo, pintamos un velo casi transparente.
			ctx.globalCompositeOperation = "destination-out";
			ctx.fillStyle = "rgba(0,0,0,0.18)";
			ctx.fillRect(0, 0, width, height);
			ctx.globalCompositeOperation = "lighter";

			// Un cohete nuevo cada ~45 frames (≈0.75s), más uno extra al azar.
			if (frame % 45 === 0 || (frame % 12 === 0 && Math.random() < 0.12)) {
				launch();
			}

			for (let i = rockets.length - 1; i >= 0; i--) {
				const r = rockets[i];
				if (!r) continue;
				r.y += r.vy;
				r.vy += GRAVITY * 1.4;

				ctx.beginPath();
				ctx.fillStyle = r.color;
				ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
				ctx.fill();

				if (r.y <= r.targetY || r.vy >= -0.6) {
					explode(r);
					rockets.splice(i, 1);
				}
			}

			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				if (!p) continue;
				p.x += p.vx;
				p.y += p.vy;
				p.vx *= FRICTION;
				p.vy = p.vy * FRICTION + GRAVITY;
				p.life--;

				if (p.life <= 0) {
					particles.splice(i, 1);
					continue;
				}

				ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
				ctx.beginPath();
				ctx.fillStyle = p.color;
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx.fill();
			}

			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = "source-over";
			rafId = requestAnimationFrame(tick);
		};

		// Arrancamos con una tanda para que se note desde el primer segundo.
		launch();
		setTimeout(launch, 250);
		setTimeout(launch, 550);
		rafId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener("resize", resize);
		};
	}, [active]);

	if (!active) return null;

	return (
		// Canvas puramente decorativo: sin contenido accesible y sin capturar
		// clicks. Los lectores de pantalla no tienen nada que anunciar acá.
		<canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-100" />
	);
}
