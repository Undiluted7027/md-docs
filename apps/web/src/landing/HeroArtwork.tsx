import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import type { PointerEvent } from 'react';

/** Pointer tilt stays in Motion values, so it never rerenders the editor. */
export function HeroArtwork() {
  const reducedMotion = useReducedMotion();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 90, damping: 22 });
  const rotateY = useSpring(tiltY, { stiffness: 90, damping: 22 });

  function move(event: PointerEvent<HTMLDivElement>) {
    if (reducedMotion || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    tiltX.set((0.5 - (event.clientY - bounds.top) / bounds.height) * 12);
    tiltY.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 14);
  }

  function reset() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return (
    <div className="landing-artwork" onPointerMove={move} onPointerLeave={reset}>
      <motion.img
        src="/landing/markdown-sculpture.webp"
        alt="Paper strips woven into a Markdown hash symbol"
        width={1355}
        height={1161}
        fetchPriority="high"
        draggable={false}
        style={reducedMotion ? {} : { rotateX, rotateY }}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
