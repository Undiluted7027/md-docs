import { motion, useReducedMotion } from 'motion/react';

const wordReveal = {
  hidden: { y: '110%', rotate: 3 },
  visible: { y: 0, rotate: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] as const } },
};

export function LandingFooter() {
  const reducedMotion = useReducedMotion();
  return (
    <footer className="landing-footer">
      <div className="landing-footer-top">
        <span>A shared space for Markdown.</span>
        <a href="#top">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </div>
      <motion.p
        className="landing-footer-wordmark"
        initial={reducedMotion ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
        variants={{ visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.12 } } }}
      >
        <motion.span variants={wordReveal}>Markdown</motion.span>{' '}
        <motion.span variants={wordReveal}>Docs</motion.span>
      </motion.p>
      <div className="landing-footer-bottom">
        <span>Plain text. Shared space.</span>
        <a href="#create-document">
          Write something together <span aria-hidden="true">↗</span>
        </a>
      </div>
    </footer>
  );
}
