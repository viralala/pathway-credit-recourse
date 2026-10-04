"use client";

import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  type AnimationPlaybackControls,
} from "motion/react";
import { useEffect, useRef } from "react";
import { useMoneyCursor } from "./cursor-store";

/**
 * A small pastel-gold coin that trails the pointer. Purely decorative:
 *   - never replaces or hides the system cursor, never receives pointer events, aria-hidden;
 *   - moves through motion values (no React render per mousemove);
 *   - drops a tiny coin or sparkle now and then when the pointer moves fast (max 10 alive);
 *   - not rendered on the server, on touch-first devices, with reduced motion, or in print.
 * On/off state comes from ./cursor-store (shared with <CursorToggle>).
 */
export function MoneyCursor() {
  const { active } = useMoneyCursor();
  return active ? <CoinFollower /> : null;
}

/** Coin's top-left corner relative to the pointer tip: below-right, clear of the arrow. */
const OFFSET_X = 12;
const OFFSET_Y = 14;
const COIN = 22;
const MAX_PARTICLES = 10;
/** Minimum gap between drops, in ms. */
const DROP_GAP = 110;
/** Pointer speed (px per ms) that counts as "fast". */
const FAST = 1.4;

// Static, trusted markup for the falling particles (never built from user input).
const MINI_COIN_SVG =
  '<svg viewBox="0 0 12 12" width="100%" height="100%" aria-hidden="true" focusable="false">' +
  '<circle cx="6" cy="6" r="5" style="fill:var(--pastel-butter);stroke:var(--money);stroke-width:1.2"/>' +
  '<circle cx="4.5" cy="4.4" r="1.3" style="fill:var(--card);opacity:.75"/></svg>';
const SPARKLE_SVG =
  '<svg viewBox="0 0 12 12" width="100%" height="100%" aria-hidden="true" focusable="false">' +
  '<path d="M6 .5C6.4 4 8 5.6 11.5 6 8 6.4 6.4 8 6 11.5 5.6 8 4 6.4.5 6 4 5.6 5.6 4 6 .5Z" style="fill:var(--money);opacity:.7"/></svg>';

function CoinFollower() {
  const x = useMotionValue(-COIN * 3);
  const y = useMotionValue(-COIN * 3);
  const sx = useSpring(x, { stiffness: 380, damping: 30, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 380, damping: 30, mass: 0.6 });
  // Lean into horizontal movement, then settle back upright.
  const vx = useVelocity(sx);
  const lean = useTransform(vx, [-1800, 0, 1800], [-22, 0, 22]);
  const rotate = useSpring(lean, { stiffness: 260, damping: 20 });
  const scale = useSpring(1, { stiffness: 520, damping: 24 });
  const opacity = useMotionValue(0);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = layer.current;
    if (!host) return;
    const running = new Set<AnimationPlaybackControls>();
    let shown = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let lastDrop = 0;

    const setShown = (next: boolean) => {
      if (shown === next) return;
      shown = next;
      animate(opacity, next ? 1 : 0, { duration: 0.2 });
    };

    const drop = (cx: number, cy: number, count: number) => {
      for (let i = 0; i < count && running.size < MAX_PARTICLES; i++) {
        const sparkle = Math.random() < 0.45;
        const size = sparkle ? 9 : 8 + Math.round(Math.random() * 3);
        const el = document.createElement("span");
        el.style.cssText = `position:absolute;display:block;left:${cx - size / 2 + (Math.random() - 0.5) * 10}px;top:${
          cy - size / 2 + (Math.random() - 0.5) * 6
        }px;width:${size}px;height:${size}px;will-change:transform,opacity`;
        el.innerHTML = sparkle ? SPARKLE_SVG : MINI_COIN_SVG;
        host.appendChild(el);
        const drift = (Math.random() - 0.5) * 28;
        const controls = animate(
          el,
          {
            opacity: [1, 0.9, 0],
            x: [0, drift * 0.4, drift],
            y: [0, 8, 32 + Math.random() * 16],
            rotate: [0, (Math.random() - 0.5) * 140],
            scale: [0.6, 1, 0.7],
          },
          { duration: 0.8 + Math.random() * 0.35, ease: "easeIn" },
        );
        running.add(controls);
        const done = () => {
          running.delete(controls);
          el.remove();
        };
        controls.then(done, done);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const tx = e.clientX + OFFSET_X;
      const ty = e.clientY + OFFSET_Y;
      x.set(tx);
      y.set(ty);
      if (!shown) {
        // Appear at the pointer instead of flying in from where it was last seen.
        sx.jump(tx);
        sy.jump(ty);
        setShown(true);
      }
      const t = e.timeStamp;
      const dt = t - lastT;
      if (dt > 0 && dt < 80) {
        const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt;
        if (speed > FAST && t - lastDrop > DROP_GAP && running.size < MAX_PARTICLES && Math.random() < 0.7) {
          lastDrop = t;
          drop(sx.get() + COIN / 2, sy.get() + COIN / 2, Math.random() < 0.3 ? 2 : 1);
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = t;
    };
    const onOut = (e: PointerEvent) => {
      if (!e.relatedTarget) setShown(false);
    };
    const onBlur = () => setShown(false);
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") scale.set(0.82);
    };
    const onUp = () => scale.set(1);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pointerout", onOut);
      for (const c of running) c.stop();
      running.clear();
      host.replaceChildren();
    };
  }, [x, y, sx, sy, scale, opacity]);

  return (
    <div aria-hidden="true" className="no-print pointer-events-none fixed inset-0 z-45 overflow-hidden print:hidden">
      <div ref={layer} className="absolute inset-0" />
      <motion.div
        className="absolute top-0 left-0 will-change-transform"
        style={{ x: sx, y: sy, rotate, scale, opacity }}
      >
        <CoinGlyph />
      </motion.div>
    </div>
  );
}

function CoinGlyph() {
  return (
    <svg
      width={COIN}
      height={COIN}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="block drop-shadow-[0_2px_2px_rgb(95_74_18/0.16)]"
    >
      <defs>
        <radialGradient id="pathway-coin-face" cx="36%" cy="30%" r="78%">
          <stop offset="0%" style={{ stopColor: "var(--card)" }} />
          <stop offset="38%" style={{ stopColor: "var(--pastel-butter)" }} />
          <stop offset="100%" style={{ stopColor: "color-mix(in srgb, var(--money) 45%, var(--pastel-butter))" }} />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.6" strokeWidth="1.3" style={{ fill: "url(#pathway-coin-face)", stroke: "var(--money)" }} />
      <circle
        cx="12"
        cy="12"
        r="7.4"
        fill="none"
        strokeWidth="0.9"
        strokeDasharray="1.2 1.6"
        style={{ stroke: "var(--money)", opacity: 0.55 }}
      />
      <path
        d="M12 7.6c.5 2.7 1.7 3.9 4.4 4.4-2.7.5-3.9 1.7-4.4 4.4-.5-2.7-1.7-3.9-4.4-4.4 2.7-.5 3.9-1.7 4.4-4.4Z"
        style={{ fill: "var(--money)", opacity: 0.8 }}
      />
      <ellipse cx="8.2" cy="6.9" rx="2.6" ry="1.2" transform="rotate(-35 8.2 6.9)" style={{ fill: "var(--card)", opacity: 0.85 }} />
    </svg>
  );
}
