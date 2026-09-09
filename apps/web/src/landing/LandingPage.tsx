import { lazy, Suspense, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { CreateDocument } from './CreateDocument.tsx';
import { HeroArtwork } from './HeroArtwork.tsx';
import { LandingFooter } from './LandingFooter.tsx';
import {
  CollaborationSketch,
  ExportSketch,
  ReconnectSketch,
  SaveSketch,
} from './FeatureSketches.tsx';
import './landing.css';

const EditorExample = lazy(() => import('./EditorExample.tsx'));

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65 } },
};
const headlineReveal = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] as const } },
};

export function LandingPage() {
  const reducedMotion = useReducedMotion();

  // The editor example pulls in CodeMirror and the Markdown renderer (~700 KB).
  // Hold that import until the section is near the viewport so visitors who read
  // only the hero never download it.
  const exampleRef = useRef<HTMLElement>(null);
  const exampleNear = useInView(exampleRef, { once: true, margin: '400px 0px' });

  return (
    <>
      <a className="landing-skip" href="#create-document">
        Skip to create document
      </a>
      <header id="top" className="landing-header">
        <a className="landing-brand" href="/" aria-label="Markdown Docs home">
          <svg className="landing-mark" viewBox="0 0 32 38" fill="none" aria-hidden="true">
            <path d="M5 2h15l8 9v25H5zM20 2v10h8" />
            <path d="M10 22h12M10 27h8" />
          </svg>
          Markdown Docs
        </a>
        <nav aria-label="Page navigation">
          <a href="#try-editor">The editor</a>
          <a href="#sharing">Together</a>
          <a className="landing-nav-start" href="#create-document">
            Start a document
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 19 19 5M5 5h14v14" />
            </svg>
          </a>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <motion.div
          className="landing-hero-copy"
          initial={reducedMotion ? false : 'hidden'}
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.1 } } }}
        >
          <motion.p className="landing-hero-label" variants={reveal}>
            A shared space for Markdown.
          </motion.p>
          <h1 id="landing-title">
            <span className="landing-headline-line">
              <motion.span variants={headlineReveal}>Good ideas</motion.span>
            </span>
            <span className="landing-headline-line">
              <motion.span variants={headlineReveal}>need company.</motion.span>
            </span>
          </h1>
          <motion.div className="landing-intro" variants={reveal}>
            <p>
              A live document for ideas that get better together. Write, preview, and share a link
              to bring someone in.
            </p>
            <CreateDocument />
          </motion.div>
        </motion.div>
        <HeroArtwork />
      </section>

      <motion.section
        ref={exampleRef}
        id="try-editor"
        className="landing-example"
        aria-labelledby="try-editor-title"
        initial={reducedMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="landing-example-intro">
          <h2 id="try-editor-title">From a thought to a shared page.</h2>
          <p>Try it below. A little syntax goes a long way.</p>
        </div>
        {exampleNear ? (
          <Suspense
            fallback={
              <div className="landing-example-frame landing-example-frame-idle">
                Loading the editor example…
              </div>
            }
          >
            <EditorExample />
          </Suspense>
        ) : (
          <div className="landing-example-frame landing-example-frame-idle" aria-hidden="true" />
        )}
      </motion.section>

      <section id="sharing" className="landing-sharing" aria-labelledby="sharing-title">
        <motion.div
          className="landing-sharing-intro"
          variants={reveal}
          initial={reducedMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 id="sharing-title">
            One link.
            <br />
            The same page<span className="landing-accent">.</span>
          </h2>
          <p>
            Create a document, choose a display name, and share its edit link. Everyone writes in
            the same place.
          </p>
          <a className="landing-text-link" href="#create-document">
            Back to create document
          </a>
        </motion.div>
        <motion.div
          className="landing-features"
          initial={reducedMotion ? false : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.18 }}
          variants={{ visible: { transition: { staggerChildren: reducedMotion ? 0 : 0.13 } } }}
        >
          <motion.article variants={reveal}>
            <CollaborationSketch />
            <h3>See who’s writing</h3>
            <p>
              Edit at the same time, with participant names and cursors showing where everyone is
              working.
            </p>
          </motion.article>
          <motion.article variants={reveal}>
            <SaveSketch />
            <h3>Saved as you write</h3>
            <p>
              Changes save automatically. Look for “Saved” before closing your document, then return
              through the same link.
            </p>
          </motion.article>
          <motion.article variants={reveal}>
            <ReconnectSketch />
            <h3>Pick up after a disconnect</h3>
            <p>
              Pending edits merge when you reconnect. Keep the tab open until your changes are
              saved.
            </p>
          </motion.article>
          <motion.article variants={reveal}>
            <ExportSketch />
            <h3>Keep your Markdown</h3>
            <p>
              Export the exact Markdown source whenever you need a local copy, including edits that
              haven’t saved yet.
            </p>
          </motion.article>
        </motion.div>
        <aside className="landing-link-note" aria-labelledby="link-note-title">
          <h3 id="link-note-title">The link is the access.</h3>
          <p>
            Anyone with it can read and edit. Keep the URL to return later. There are no accounts or
            access controls yet.
          </p>
        </aside>
      </section>

      <LandingFooter />
    </>
  );
}
