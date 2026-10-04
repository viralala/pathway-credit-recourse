"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Page transition: each route fades in and rises 8px (0.35s, ease-out). Only opacity and
 * transform change, so there is no layout work. Skipped:
 *   - on the very first page load (the server HTML is visible immediately, never hidden behind JS);
 *   - when the visitor prefers reduced motion;
 *   - in print (styles forced back to the final state).
 * Next.js remounts this template on navigation between routes, not on query-string changes.
 */
let hasMounted = false;

export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  // Decided once per mount: false for the first page, true for client-side navigations after it.
  const [animateIn] = useState(() => hasMounted);

  useEffect(() => {
    hasMounted = true;
  }, []);

  return (
    <motion.div
      initial={animateIn && !reduce ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="print:transform-none! print:opacity-100!"
    >
      {children}
    </motion.div>
  );
}
