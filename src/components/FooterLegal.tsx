import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LegalModal, type LegalDoc } from "./LegalModal";

export default function FooterLegal() {
  const [open, setOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);

  return (
    <div className="footer-legal">
      <button
        type="button"
        className="footer-legal-toggle"
        aria-expanded={open}
        aria-controls="footer-legal-content"
        onClick={() => setOpen((v) => !v)}
      >
        About &amp; privacy
        <span className={`more-filters-chevron${open ? " is-open" : ""}`}>⌄</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="footer-legal-content"
            className="footer-legal-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="footer-legal-section">
              <h3>Not affiliated with anyone listed</h3>
              <p>
                Pathfind is an independent, unofficial directory built to help students find
                public summer opportunities. It isn't affiliated with, sponsored by, or endorsed
                by any of the programs, schools, labs, or organizations listed here — every name
                belongs to its own owner.
              </p>
            </div>
            <div className="footer-legal-section">
              <h3>Accuracy</h3>
              <p>
                Deadlines, costs, and eligibility are gathered from public sources and can change
                or be entered incorrectly — some deadlines marked "(est.)" are estimates for a
                cycle that hadn't been announced yet. Always confirm details on the official site
                before applying. This information is provided as-is, with no guarantee of
                accuracy, and Pathfind isn't responsible for decisions made based on it.
              </p>
            </div>
            <div className="footer-legal-section">
              <h3>Privacy</h3>
              <p>
                Saved opportunities and your Path selections are stored in this browser. If you
                create an account, they also sync to your Pathfind account so you can pick up
                where you left off on another device.
              </p>
              <div className="footer-legal-links">
                <button type="button" onClick={() => setLegalDoc('privacy')}>Privacy Policy</button>
                <button type="button" onClick={() => setLegalDoc('terms')}>Terms of Use</button>
                <button type="button" onClick={() => setLegalDoc('contact')}>Contact</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
}
