import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useEscapeToClose } from '../lib/useEscapeToClose';

export type LegalDoc = 'privacy' | 'terms' | 'contact';

const TITLES: Record<LegalDoc, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Use',
  contact: 'Contact',
};

const LAST_UPDATED = 'September 13, 2026';

function PrivacyContent() {
  return (
    <>
      <p>Last updated {LAST_UPDATED}.</p>

      <h3>What we collect</h3>
      <p>
        Pathfind uses <strong>Sign in with Google</strong> for accounts — there's no Pathfind
        password to create or store. When you sign in, Google shares your name and email address
        with us; we never see or have access to your Google password.
      </p>
      <p>
        If you fill out your profile: your school, grade, graduation year, interests, goals,
        skills, causes you care about, dream colleges, how much time you have available, and
        an optional short bio, city, and state. Every field beyond grade is optional.
      </p>
      <p>
        Your saved opportunities and Build My Path selections. If you're signed in, these sync
        to your account. If you're not signed in, they stay only in your browser's local
        storage and are never sent to us.
      </p>
      <p>
        We do not ask for your exact date of birth, precise location, or any government ID.
        Pathfind is intended for students who are at least 13 years old, and signup requires
        confirming this.
      </p>

      <h3>Why we collect it</h3>
      <p>
        To create and secure your account, save your profile and bookmarked opportunities
        across visits and devices, and personalize which programs we surface for you. We don't
        use your data for advertising, and we don't sell it.
      </p>

      <h3>Who processes it</h3>
      <p>
        <strong>Supabase</strong> hosts our database and handles authentication (accounts,
        sessions) via Google Sign-In. <strong>Google</strong> handles the sign-in itself and
        tells us your name and email — we never see your Google password.
        <strong> Vercel</strong> hosts the website itself. None of these providers are
        authorized to use your data for their own purposes.
      </p>

      <h3>Cookies &amp; sessions</h3>
      <p>
        We use a session cookie/token (set by Supabase Auth) to keep you signed in, and your
        browser's local storage to remember filters and, if you're signed out, your saved
        opportunities. We don't use third-party advertising or tracking cookies.
      </p>

      <h3>Retention &amp; deletion</h3>
      <p>
        We keep your account data for as long as your account exists. You can permanently
        delete your account, profile, and saved opportunities at any time from your profile —
        this removes your data immediately and can't be undone.
      </p>

      <h3>Children's privacy</h3>
      <p>
        Pathfind is meant for high-school students aged 13 and up. We don't knowingly collect
        personal information from anyone under 13. If you believe a child under 13 has created
        an account, account deletion is available from the profile page.
      </p>

      <h3>Contact</h3>
      <p>Contact details are omitted from this public source showcase.</p>

      <p style={{ color: 'var(--ink-faint)', fontSize: '0.82rem' }}>
        This is a good-faith, plain-language description of what Pathfind actually does — it
        hasn't been reviewed by a lawyer, and shouldn't be treated as a substitute for legal advice.
      </p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p>Last updated {LAST_UPDATED}.</p>

      <h3>What Pathfind is</h3>
      <p>
        Pathfind is an independent, unofficial directory of academic and extracurricular
        opportunities for high-school students. It isn't affiliated with, sponsored by, or
        endorsed by any of the programs, schools, or organizations it lists.
      </p>

      <h3>Eligibility</h3>
      <p>
        You must be at least 13 years old to create a Pathfind account. By signing up, you're
        confirming that you meet this requirement.
      </p>

      <h3>Accuracy of listings</h3>
      <p>
        Deadlines, costs, and eligibility are gathered from public sources and can change or be
        entered incorrectly — deadlines marked "(est.)" are estimates for a cycle that hasn't
        been announced yet. Always confirm details on the official program site before applying.
        Listings are provided as-is, with no guarantee of accuracy, and Pathfind isn't
        responsible for decisions made based on them.
      </p>

      <h3>Your account</h3>
      <p>
        You sign in with your Google account — keeping that account secure is on you, and
        you're responsible for activity that happens under your Pathfind account. You can
        delete your Pathfind account at any time from your profile.
      </p>

      <h3>Acceptable use</h3>
      <p>
        Don't use Pathfind to scrape, resell, or misrepresent the data it hosts, or to attempt
        to access another user's account or data.
      </p>

      <h3>Changes</h3>
      <p>We may update these terms as Pathfind changes. Material changes will be reflected here with an updated date.</p>

      <h3>Contact</h3>
      <p>Contact details are omitted from this public source showcase.</p>

      <p style={{ color: 'var(--ink-faint)', fontSize: '0.82rem' }}>
        This is a good-faith, plain-language summary — it hasn't been reviewed by a lawyer, and
        shouldn't be treated as a substitute for legal advice.
      </p>
    </>
  );
}

function ContactContent() {
  return (
    <>
      <p>Contact details are omitted from this public source showcase.</p>
    </>
  );
}

export function LegalModal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  useEscapeToClose(doc !== null, onClose);
  return (
    <AnimatePresence>
      {doc && (
        <motion.div
          className="legal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="legal-card"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={TITLES[doc]}
          >
            <div className="legal-card-header">
              <div>
                <span className="auth-eyebrow">Pathfind</span>
                <h2>{TITLES[doc]}</h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="legal-card-body">
              {doc === 'privacy' && <PrivacyContent />}
              {doc === 'terms' && <TermsContent />}
              {doc === 'contact' && <ContactContent />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
