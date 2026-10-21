import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';
import { LegalModal, type LegalDoc } from './LegalModal';
import { useEscapeToClose } from '../lib/useEscapeToClose';

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signInWithGoogle, loading } = useAuth();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Disabled while a legal doc is open so Escape closes that first, not the whole sign-in flow.
  useEscapeToClose(isOpen && !legalDoc, onClose);

  const handleGoogle = async () => {
    if (!agreedToTerms) {
      setError("Please confirm you're 13+ and agree to the terms");
      return;
    }
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Try again.');
    }
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && !legalDoc && (
        <motion.div
          key="auth-overlay"
          className="auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="auth-card"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to Pathfind"
          >
            <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>

            <span className="auth-eyebrow">Pathfind</span>
            <h2 className="auth-heading">Find what you'll do next</h2>
            <p className="auth-subhead">
              Save opportunities and build a path around what you care about.
            </p>

            <button type="button" className="auth-google-btn" onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9C16.66 14.2 17.64 11.9 17.64 9.2z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
              </svg>
              {loading ? 'Please wait…' : 'Continue with Google'}
            </button>

            <p className="auth-google-note">
              We only use this to sign you in — Pathfind never sees or stores your Google password.
            </p>

            <label className="auth-consent">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => { setAgreedToTerms(e.target.checked); setError(null); }}
                disabled={loading}
              />
              <span>
                I'm 13 or older and agree to the{' '}
                <button type="button" onClick={() => setLegalDoc('terms')}>Terms of Use</button>{' '}
                and{' '}
                <button type="button" onClick={() => setLegalDoc('privacy')}>Privacy Policy</button>.
              </span>
            </label>

            {error && <p className="auth-message auth-message--error">{error}</p>}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      {/* Outside AnimatePresence: it was an unkeyed sibling of the overlay, which made
          React warn about duplicate (empty) keys on every open. */}
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
    </>
  );
}
