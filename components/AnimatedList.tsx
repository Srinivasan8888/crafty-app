"use client";

// PRD §17.7 motion pattern 2 — animated list reorders / mount-unmount.
// Thin wrapper around framer-motion's AnimatePresence + motion.div layout.
// Use for places where items can come and go (e.g. saved list, search
// results when filter changes). Reduced-motion users get instant updates.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

export function AnimatedList<T extends { id: string }>({
  items,
  renderItem,
  className,
}: {
  items: T[];
  renderItem: (item: T) => ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout={reduce ? false : true}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
