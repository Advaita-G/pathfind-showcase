import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import type { PathProfile } from '../lib/usePathProfile';
import { supabase } from '../lib/supabaseClient';
import { X } from 'lucide-react';
import type { TimeCommitment } from '../data/types';
import CollegeSearch from './CollegeSearch';
import { resolveCollege } from '../lib/collegeSearch';
import { useColleges } from '../lib/useColleges';
import { CAUSES, GRADES, GOALS, INTERESTS, SKILLS, TIME_COMMITMENTS } from '../data/types';
import { goalLabel } from '../lib/matchPathfindIdeas';
import { useEscapeToClose } from '../lib/useEscapeToClose';
import { getNameParts } from '../lib/userDisplayName';
import { ANALYTICS_EVENTS, trackOnce } from '../lib/analytics';

const BIO_MAX = 500;

interface IdentityFields {
  firstName: string;
  lastName: string;
  school: string;
  grade: number | null;
  graduationYear: number | null;
  city: string;
  state: string;
  bio: string;
}

const EMPTY_IDENTITY: IdentityFields = {
  firstName: '',
  lastName: '',
  school: '',
  grade: null,
  graduationYear: null,
  city: '',
  state: '',
  bio: '',
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Shared path-profile state owned by App's single usePathProfile instance.
   *  ProfileModal must NOT create its own: a second instance's saves would update
   *  Supabase but never App's copy — My Path / Build My Path would stay stale until reload. */
  profile: PathProfile;
  updateProfile: (partial: Partial<PathProfile>) => void;
  flushPendingSave: (override?: Partial<PathProfile>) => Promise<void>;
}

export function ProfileModal({ isOpen, onClose, profile, updateProfile, flushPendingSave }: ProfileModalProps) {
  const { user, deleteAccount, clearNeedsProfileSetup, needsProfileSetup, signOut } = useAuth();
  // Debounced Supabase writes live inside App's usePathProfile; Save flushes the pending one
  // immediately so closing the drawer right after saving can't drop the write.
  const prefersReducedMotion = useReducedMotion();
  useEscapeToClose(isOpen, onClose);

  const [identity, setIdentity] = useState<IdentityFields>(EMPTY_IDENTITY);
  const [pathSelections, setPathSelections] = useState({
    interests: [] as string[],
    goals: [] as string[],
    skills: [] as string[],
    causes: [] as string[],
    dreamColleges: [] as string[],
    timeCommitment: null as TimeCommitment | null,
  });
  const [otherSkill, setOtherSkill] = useState('');
  const [otherGoal, setOtherGoal] = useState('');
  const [otherCause, setOtherCause] = useState('');

  // Directory is loaded by the picker on focus; here it's only used to show canonical names
  // for legacy saved abbreviations once available.
  const collegeDirectory = useColleges(false);
  const displayCollege = (name: string) =>
    collegeDirectory.index ? resolveCollege(collegeDirectory.index, name)?.name ?? name : name;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);  // Load identity fields (from auth metadata + the profiles row) whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccess(null);
    setConfirmingDelete(false);

    setPathSelections({
      interests: profile.interests,
      goals: profile.goals,
      skills: profile.skills,
      causes: profile.causes,
      dreamColleges: profile.colleges,
      timeCommitment: profile.timeCommitment,
    });

    if (!user) {
      setIdentity(EMPTY_IDENTITY);
      return;
    }

    setIdentity((prev) => ({ ...prev, ...getNameParts(user) }));

    let cancelled = false;
    supabase
      .from('profiles')
      .select('school, grade, graduation_year, city, state, bio')
      .eq('id', user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled || fetchError || !data) return;
        setIdentity((prev) => ({
          ...prev,
          school: data.school ?? '',
          grade: data.grade ?? null,
          graduationYear: data.graduation_year ?? null,
          city: data.city ?? '',
          state: data.state ?? '',
          bio: data.bio ?? '',
        }));
      });

    return () => {
      cancelled = true;
    };
    // profile.* intentionally excluded: this effect seeds form state on open, it shouldn't
    // re-run every time usePathProfile's own debounced save updates `profile`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const toggleTag = (field: keyof typeof pathSelections, value: string) => {
    setPathSelections((prev) => {
      const current = prev[field] as string[];
      return {
        ...prev,
        [field]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
    setError(null);
    setSuccess(null);
  };

  const addOther = (field: 'skills' | 'goals' | 'causes', raw: string, reset: (v: string) => void) => {
    const value = raw.trim();
    if (!value) return;
    setPathSelections((prev) => {
      const current = prev[field] as string[];
      return current.includes(value) ? prev : { ...prev, [field]: [...current, value] };
    });
    reset('');
    setError(null);
    setSuccess(null);
  };

  // Only a real directory record can be added (the picker never emits free text); duplicates
  // are compared by canonical name so a legacy "UC Berkeley" and the full name can't coexist.
  const addCollege = (name: string) => {
    const canonical = displayCollege(name);
    if (pathSelections.dreamColleges.some((c) => displayCollege(c).toLowerCase() === canonical.toLowerCase())) return;
    toggleTag('dreamColleges', canonical);
  };

  const validate = (): string | null => {
    if (!identity.firstName.trim()) return 'First name is required';
    if (!identity.lastName.trim()) return 'Last name is required';
    if (!identity.school.trim()) return 'School is required';
    if (identity.grade === null) return 'Please select your grade';
    if (identity.graduationYear === null) return 'Please enter your graduation year';
    const currentYear = new Date().getFullYear();
    if (identity.graduationYear < currentYear || identity.graduationYear > currentYear + 6) {
      return 'Please enter a valid graduation year';
    }
    return null;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // Flush with the drawer's exact selections — ref-based state isn't updated mid-tick,
      // so the debounced writer alone could miss or stale-out these changes.
      await flushPendingSave({
        interests: pathSelections.interests,
        goals: pathSelections.goals,
        skills: pathSelections.skills,
        causes: pathSelections.causes,
        colleges: pathSelections.dreamColleges,
        timeCommitment: pathSelections.timeCommitment,
      });
      if (user) {
        await supabase.auth.updateUser({
          data: { first_name: identity.firstName.trim(), last_name: identity.lastName.trim() },
        });

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: user.id,
          first_name: identity.firstName.trim(),
          last_name: identity.lastName.trim(),
          school: identity.school.trim(),
          grade: identity.grade,
          graduation_year: identity.graduationYear,
          city: identity.city.trim() || null,
          state: identity.state.trim() || null,
          bio: identity.bio.trim() || null,
          updated_at: new Date().toISOString(),
        });

        if (profileError) throw profileError;
      }

      updateProfile({
        interests: pathSelections.interests,
        goals: pathSelections.goals,
        skills: pathSelections.skills,
        causes: pathSelections.causes,
        colleges: pathSelections.dreamColleges,
        timeCommitment: pathSelections.timeCommitment,
      });

      clearNeedsProfileSetup();
      trackOnce(ANALYTICS_EVENTS.profileCompleted);
      setSuccess('Profile saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // Auto-close shortly after a successful save — via an effect so the timer is tied to
  // this component's mounted lifetime. A raw setTimeout here would keep running after the
  // drawer unmounts: a student who closed manually and reopened within the window got the
  // freshly-opened drawer slammed shut by the stale timer ("the button does nothing").
  // App fully unmounts this component when closed, so the cleanup below cancels the timer
  // on close, and a fresh remount starts with success=null — no timer at all.
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => onClose(), 1200);
    return () => clearTimeout(timer);
  }, [success, onClose]);

  // The drawer itself stays mounted while sign-out runs; App closes it once the session
  // is gone (an effect there watches `user`). On error, just re-enable the button.
  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out. Try again.");
      setSigningOut(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete account. Try again.');
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="profile-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="profile-drawer"
            initial={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Edit profile"
          >
            <div className="profile-drawer-header">
              <div>
                <span className="auth-eyebrow">Pathfind</span>
                <h2>{needsProfileSetup ? 'Set up your profile' : 'Your profile'}</h2>
                {needsProfileSetup && (
                  <p className="auth-subhead">
                    A few details so we can help you find the right opportunities.
                  </p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <form
              className="profile-drawer-body"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <section className="profile-section">
                <h3>Basics</h3>
                <div className="auth-row">
                  <div className="auth-field">
                    <label htmlFor="pf-firstName" className="auth-label">First name</label>
                    <input
                      id="pf-firstName"
                      className="auth-input"
                      value={identity.firstName}
                      onChange={(e) => setIdentity((p) => ({ ...p, firstName: e.target.value }))}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="pf-lastName" className="auth-label">Last name</label>
                    <input
                      id="pf-lastName"
                      className="auth-input"
                      value={identity.lastName}
                      onChange={(e) => setIdentity((p) => ({ ...p, lastName: e.target.value }))}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="pf-school" className="auth-label">School</label>
                  <input
                    id="pf-school"
                    className="auth-input"
                    value={identity.school}
                    onChange={(e) => setIdentity((p) => ({ ...p, school: e.target.value }))}
                    placeholder="Your school"
                  />
                </div>

                <div className="auth-row">
                  <div className="auth-field">
                    <label htmlFor="pf-grade" className="auth-label">Grade</label>
                    <select
                      id="pf-grade"
                      className="auth-input auth-select"
                      value={identity.grade ?? ''}
                      onChange={(e) => setIdentity((p) => ({ ...p, grade: e.target.value ? Number(e.target.value) : null }))}
                    >
                      <option value="">Select grade</option>
                      {GRADES.map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="auth-field">
                    <label htmlFor="pf-gradYear" className="auth-label">Graduation year</label>
                    <input
                      id="pf-gradYear"
                      type="number"
                      className="auth-input"
                      value={identity.graduationYear ?? ''}
                      onChange={(e) => setIdentity((p) => ({ ...p, graduationYear: e.target.value ? Number(e.target.value) : null }))}
                      placeholder="YYYY"
                    />
                  </div>
                </div>

                <div className="auth-row">
                  <div className="auth-field">
                    <label htmlFor="pf-city" className="auth-label">City <span className="profile-optional">(optional)</span></label>
                    <input
                      id="pf-city"
                      className="auth-input"
                      value={identity.city}
                      onChange={(e) => setIdentity((p) => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="pf-state" className="auth-label">State <span className="profile-optional">(optional)</span></label>
                    <input
                      id="pf-state"
                      className="auth-input"
                      value={identity.state}
                      onChange={(e) => setIdentity((p) => ({ ...p, state: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label htmlFor="pf-bio" className="auth-label">Short bio <span className="profile-optional">(optional)</span></label>
                  <textarea
                    id="pf-bio"
                    className="auth-input profile-textarea"
                    value={identity.bio}
                    maxLength={BIO_MAX}
                    rows={3}
                    onChange={(e) => setIdentity((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="A couple sentences about what you're into."
                  />
                  <span className="profile-char-count">{identity.bio.length}/{BIO_MAX}</span>
                </div>
              </section>

              <section className="profile-section">
                <h3>Interests</h3>
                <div className="interest-pills">
                  {INTERESTS.map((interest) => (
                    <button
                      key={interest.id}
                      type="button"
                      className={`interest-pill${pathSelections.interests.includes(interest.id) ? ' is-selected' : ''}`}
                      onClick={() => toggleTag('interests', interest.id)}
                    >
                      {interest.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="profile-section">
                <h3>Goals</h3>
                <div className="interest-pills">
                  {GOALS.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      className={`interest-pill${pathSelections.goals.includes(goal.id) ? ' is-selected' : ''}`}
                      onClick={() => toggleTag('goals', goal.id)}
                    >
                      {goal.label}
                    </button>
                  ))}
                  {pathSelections.goals.filter((g) => !GOALS.some((goal) => goal.id === g)).map((custom) => (
                    <button key={custom} type="button" className="interest-pill is-selected" onClick={() => toggleTag('goals', custom)}>
                      {goalLabel(custom)} ×
                    </button>
                  ))}
                </div>
                <div className="profile-other-row">
                  <input
                    className="auth-input"
                    placeholder="Other goal…"
                    value={otherGoal}
                    onChange={(e) => setOtherGoal(e.target.value)}
                  />
                  <button type="button" className="profile-add-btn" disabled={!otherGoal.trim()} onClick={() => addOther('goals', otherGoal, setOtherGoal)}>
                    Add
                  </button>
                </div>
              </section>

              <section className="profile-section">
                <h3>Skills</h3>
                <div className="interest-pills">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      className={`interest-pill${pathSelections.skills.includes(skill.id) ? ' is-selected' : ''}`}
                      onClick={() => toggleTag('skills', skill.id)}
                    >
                      {skill.label}
                    </button>
                  ))}
                  {pathSelections.skills.filter((s) => !SKILLS.some((sk) => sk.id === s)).map((custom) => (
                    <button key={custom} type="button" className="interest-pill is-selected" onClick={() => toggleTag('skills', custom)}>
                      {custom} ×
                    </button>
                  ))}
                </div>
                <div className="profile-other-row">
                  <input
                    className="auth-input"
                    placeholder="Other skill…"
                    value={otherSkill}
                    onChange={(e) => setOtherSkill(e.target.value)}
                  />
                  <button type="button" className="profile-add-btn" disabled={!otherSkill.trim()} onClick={() => addOther('skills', otherSkill, setOtherSkill)}>
                    Add
                  </button>
                </div>
              </section>

              <section className="profile-section">
                <h3>Causes you care about</h3>
                <div className="interest-pills">
                  {CAUSES.map((cause) => (
                    <button
                      key={cause.id}
                      type="button"
                      className={`interest-pill${pathSelections.causes.includes(cause.id) ? ' is-selected' : ''}`}
                      onClick={() => toggleTag('causes', cause.id)}
                    >
                      {cause.label}
                    </button>
                  ))}
                  {pathSelections.causes.filter((c) => !CAUSES.some((cc) => cc.id === c)).map((custom) => (
                    <button key={custom} type="button" className="interest-pill is-selected" onClick={() => toggleTag('causes', custom)}>
                      {custom} ×
                    </button>
                  ))}
                </div>
                <div className="profile-other-row">
                  <input
                    className="auth-input"
                    placeholder="Other cause…"
                    value={otherCause}
                    onChange={(e) => setOtherCause(e.target.value)}
                  />
                  <button type="button" className="profile-add-btn" disabled={!otherCause.trim()} onClick={() => addOther('causes', otherCause, setOtherCause)}>
                    Add
                  </button>
                </div>
              </section>

              <section className="profile-section">
                <h3>Dream colleges</h3>
                <CollegeSearch
                  selected={pathSelections.dreamColleges}
                  onAdd={(college) => addCollege(college.name)}
                  classPrefix="profile-college"
                  inputClassName="auth-input"
                />
                {pathSelections.dreamColleges.length > 0 ? (
                  <div className="interest-pills">
                    {pathSelections.dreamColleges.map((college) => (
                      <button
                        key={college}
                        type="button"
                        className="interest-pill is-selected"
                        aria-label={`Remove ${displayCollege(college)}`}
                        onClick={() => toggleTag('dreamColleges', college)}
                      >
                        {displayCollege(college)} ×
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="profile-college-hint">Optional. Any US college or university — about 3,900 to choose from.</p>
                )}
              </section>

              <section className="profile-section">
                <h3>Time available</h3>
                <div className="interest-pills">
                  {TIME_COMMITMENTS.map((tc) => (
                    <button
                      key={tc}
                      type="button"
                      className={`interest-pill${pathSelections.timeCommitment === tc ? ' is-selected' : ''}`}
                      onClick={() => setPathSelections((p) => ({ ...p, timeCommitment: p.timeCommitment === tc ? null : tc }))}
                    >
                      {tc}
                    </button>
                  ))}
                </div>
              </section>

              {error && <p className="auth-message auth-message--error">{error}</p>}
              {success && <p className="auth-message auth-message--success">{success}</p>}

              {user && (
                <section className="profile-section profile-danger-zone">
                  <h3>Delete account</h3>
                  <p className="profile-danger-copy">
                    Permanently deletes your account, profile, and saved opportunities. This can't be undone.
                  </p>
                  {!confirmingDelete ? (
                    <button type="button" className="profile-delete-btn" onClick={() => setConfirmingDelete(true)}>
                      Delete my account
                    </button>
                  ) : (
                    <div className="profile-delete-confirm">
                      <span>Are you sure? This is permanent.</span>
                      <div className="profile-delete-confirm-actions">
                        <button type="button" className="profile-cancel-btn" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                          Cancel
                        </button>
                        <button type="button" className="profile-delete-btn" onClick={handleDelete} disabled={deleting}>
                          {deleting ? 'Deleting…' : 'Yes, delete my account'}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </form>

            <div className="profile-drawer-footer">
              <button type="button" className="auth-google-btn" onClick={onClose}>Cancel</button>
              <button type="button" className="auth-submit" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : 'Save profile'}
              </button>
              {user && (
                <button type="button" className="profile-signout-btn" onClick={handleSignOut} disabled={signingOut}>
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
