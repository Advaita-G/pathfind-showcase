import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePlans } from "../context/PlansContext";
import { useBookmarks } from "../lib/useBookmarks";
import { useIdeaProgress } from "../lib/useIdeaProgress";
import { usePathProfile, type PathProfile } from "../lib/usePathProfile";
import { matchOpportunities } from "../lib/matchOpportunities";
import { getNameParts } from "../lib/userDisplayName";
import { supabase } from "../lib/supabaseClient";
import { OPPORTUNITIES } from "../data/opportunities";
import { DEMO_PATHFIND_IDEAS } from "../data/pathfindIdeas";
import { GOALS, INTERESTS, type Interest, type Opportunity } from "../data/types";
import FooterLegal from "../components/FooterLegal";
import NextMove from "../components/NextMove";
import { ProfileModal } from "../components/ProfileModal";
import OpportunityCard from "../components/OpportunityCard";
import SeoPageHeader from "../components/SeoPageHeader";
import { useSeoMeta } from "../lib/useSeoMeta";
import { siteUrl } from "../seo/meta";
import { planProgress } from "../lib/planner/buildPlan";
import { STATUS_LABEL } from "../components/PlanDetail";

interface Identity {
  firstName: string;
  lastName: string;
  school: string;
  grade: number | null;
  graduationYear: number | null;
}

const EMPTY_IDENTITY: Identity = {
  firstName: "",
  lastName: "",
  school: "",
  grade: null,
  graduationYear: null,
};

const interestLabels = new Map(INTERESTS.map((item) => [item.id, item.label]));
const numberFormatter = new Intl.NumberFormat("en-US");
const RECENT_SAVED_LIMIT = 6;
const CONTINUE_EXPLORING_LIMIT = 3;

function completeness(identity: Identity, profile: PathProfile): number {
  const fields = [
    Boolean(identity.firstName.trim()),
    Boolean(identity.lastName.trim()),
    Boolean(identity.school.trim()),
    identity.grade !== null,
    identity.graduationYear !== null,
    profile.interests.length > 0,
    profile.goals.length > 0,
    profile.skills.length > 0,
    profile.causes.length > 0,
    profile.timeCommitment !== null,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

/** "Research" stays as-is; every other opportunity type just gets an "s". */
function pluralType(type: string): string {
  return type === "Research" ? type : `${type}s`;
}

export default function ProfilePage() {
  // Keeps the client-side title/canonical/noindex in sync with the prerendered profileMeta()
  // in seo/meta.ts — the prerendered file supplies the tags for a direct visit.
  useSeoMeta({
    title: "Your Profile | Pathfind",
    description:
      "Your private Pathfind profile: what Pathfind knows about you and what it uses to personalize your path. Sign in to view it.",
    canonical: siteUrl("/profile"),
    robotsNoindex: true,
  });
  const { user, loading: authLoading, needsProfileSetup, signInWithGoogle, signOut, deleteAccount } = useAuth();
  const { profile, updateProfile, flushPendingSave } = usePathProfile();
  const { bookmarks, toggle } = useBookmarks();
  const { plans } = usePlans();
  const { ideaProgress, toggleStep: toggleIdeaStep } = useIdeaProgress();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (needsProfileSetup) setEditing(true);
  }, [needsProfileSetup]);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      return;
    }

    const name = getNameParts(user);
    setIdentity({ ...EMPTY_IDENTITY, ...name });
    setProfileLoading(true);
    setProfileError(null);
    let cancelled = false;

    supabase
      .from("profiles")
      .select("first_name, last_name, school, grade, graduation_year")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Keep the authenticated page visible. Profile failure is not session failure.
          setProfileError("Some profile details could not be loaded. Your account is still signed in.");
          setProfileLoading(false);
          return;
        }
        if (data) {
          setIdentity((current) => ({
            ...current,
            firstName: data.first_name ?? current.firstName,
            lastName: data.last_name ?? current.lastName,
            school: data.school ?? "",
            grade: data.grade ?? null,
            graduationYear: data.graduation_year ?? null,
          }));
        }
        setProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  // The one real "path" Pathfind can compute today: live matches for the student's current
  // interests/goals/skills/causes, via the same engine Build My Path uses. There is no saved,
  // independently-named "multiple paths" concept — showing several would mean inventing data.
  const goalTypes = useMemo(
    () => Array.from(new Set(GOALS.filter((goal) => profile.goals.includes(goal.id)).flatMap((goal) => goal.types))),
    [profile.goals],
  );
  const pathBreakdown = useMemo(
    () => matchOpportunities(OPPORTUNITIES, profile.interests, goalTypes, {
      grade: identity.grade,
      skills: profile.skills,
      causes: profile.causes,
      timeCommitment: profile.timeCommitment,
    }),
    [profile.interests, goalTypes, identity.grade, profile.skills, profile.causes, profile.timeCommitment],
  );
  const pathTitle = profile.interests.length > 0
    ? profile.interests.map((id) => interestLabels.get(id as Interest) ?? id).join(" + ")
    : null;
  const exploreHref = useMemo(() => {
    if (profile.interests.length === 0) return "/#build-my-path-heading";
    const params = new URLSearchParams();
    params.set("interests", profile.interests.join(","));
    return `/?${params.toString()}`;
  }, [profile.interests]);

  const saved = useMemo(
    () => bookmarks.map((id) => OPPORTUNITIES.find((opportunity) => opportunity.id === id)).filter((o): o is Opportunity => Boolean(o)),
    [bookmarks],
  );
  // Bookmarks are appended as they're saved, so the end of the list is the most recent.
  const recentSaved = useMemo(() => saved.slice(-RECENT_SAVED_LIMIT).reverse(), [saved]);
  const continueExploring = useMemo(
    () => pathBreakdown.matches.filter((o) => !bookmarks.includes(o.id)).slice(0, CONTINUE_EXPLORING_LIMIT),
    [pathBreakdown.matches, bookmarks],
  );
  const activePlans = useMemo(
    () => Object.values(plans)
      .map((plan) => ({ plan, opportunity: OPPORTUNITIES.find((o) => o.id === plan.opportunityId) }))
      .filter((item): item is { plan: (typeof plans)[string]; opportunity: Opportunity } => Boolean(item.opportunity)),
    [plans],
  );
  const savedIdeas = useMemo(
    () => DEMO_PATHFIND_IDEAS.filter((idea) => ideaProgress.ideas[idea.id]?.saved),
    [ideaProgress.ideas],
  );

  const name = [identity.firstName, identity.lastName].filter(Boolean).join(" ") || "Your profile";
  const completion = completeness(identity, profile);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    navigate("/");
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteAccount();
    navigate("/");
  };

  if (authLoading) {
    return <ProfilePageShell><p className="profile-page-status">Loading your profile…</p></ProfilePageShell>;
  }

  if (!user) {
    return (
      <ProfilePageShell>
        <section className="profile-page-logged-out">
          <p className="profile-page-kicker">Your Pathfind profile</p>
          <h1>Sign in to see your path.</h1>
          <p>Your saved opportunities and profile details live here once you sign in with Google.</p>
          <button type="button" className="profile-page-primary" onClick={signInWithGoogle}>Continue with Google</button>
          <Link to="/" className="profile-page-back">Back to Pathfind</Link>
        </section>
      </ProfilePageShell>
    );
  }

  return (
    <ProfilePageShell>
      {editing && (
        <ProfileModal
          isOpen={editing}
          onClose={() => setEditing(false)}
          profile={profile}
          updateProfile={updateProfile}
          flushPendingSave={flushPendingSave}
        />
      )}

      <main className="profile-page-main">
        <div className="profile-page-topline">
          <Link to="/" className="profile-page-back">← Back to Pathfind</Link>
        </div>

        <section className="profile-page-hero">
          <div className="profile-page-identity">
            <p className="profile-page-kicker">Your Pathfind</p>
            <h1>{identity.firstName || name}</h1>
            <p className="profile-page-subtitle">
              {[identity.grade ? `Grade ${identity.grade}` : null, identity.school || null].filter(Boolean).join(" · ") || "Add your school and grade"}
            </p>
            {completion < 100 && <p className="profile-page-meta">Profile {completion}% complete</p>}
          </div>
          <button type="button" className="profile-page-edit" onClick={() => setEditing(true)}>Edit profile</button>
        </section>

        {profileError && <p className="profile-page-notice" role="status">{profileError}</p>}

        <section className="profile-page-path-hero">
          <div className="profile-page-path-hero-heading">
            <p className="profile-page-kicker">Your path</p>
            {pathTitle ? (
              <>
                <h2>{pathTitle}</h2>
                <p className="profile-page-path-hero-count">
                  {numberFormatter.format(pathBreakdown.total)} verified {pathBreakdown.total === 1 ? "opportunity matches" : "opportunities match"} this path.
                </p>
              </>
            ) : (
              <>
                <h2>Your next move is still taking shape.</h2>
                <p className="profile-page-path-hero-count">
                  Add a few interests and Pathfind will start matching you to real, verified programs.
                </p>
              </>
            )}
          </div>

          {pathTitle && pathBreakdown.byType.length > 0 && (
            <div className="profile-page-path-stats">
              {pathBreakdown.byType.map(({ type, count }) => (
                <div key={type} className="profile-page-path-stat">
                  <span className="profile-page-path-stat-count">{count}</span>
                  <span className="profile-page-path-stat-label">{pluralType(type)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="profile-page-path-actions">
            <Link to={exploreHref} className="profile-page-path-cta">
              {pathTitle ? "Continue exploring" : "Build my path"} →
            </Link>
            <Link to="/plans" className="profile-page-text-link">Your plans ({activePlans.length})</Link>
            {pathTitle && <Link to="/#build-my-path-heading" className="profile-page-text-link">Refine my path</Link>}
          </div>
        </section>

        <NextMove
          profile={profile}
          bookmarks={bookmarks}
          ideaProgress={ideaProgress}
          onToggleIdeaStep={toggleIdeaStep}
        />

        {activePlans.length > 0 && (
          <section className="profile-page-section-block">
            <div className="profile-page-heading-row">
              <div>
                <p className="profile-page-kicker">Checklists &amp; deadlines</p>
                <h2>Active plans</h2>
              </div>
              <span className="profile-page-heading-count">{activePlans.length}</span>
            </div>
            <div className="plans-list">
              {activePlans.slice(0, 4).map(({ plan, opportunity }) => {
                const progress = planProgress(plan);
                return (
                  <Link
                    key={plan.opportunityId}
                    to={`/plans?o=${encodeURIComponent(plan.opportunityId)}`}
                    className="plan-card"
                  >
                    <span className="plan-card-org">{opportunity.org}</span>
                    <strong>{opportunity.title}</strong>
                    <span className="plan-card-meta">
                      <span className="plan-status">{STATUS_LABEL[plan.status]}</span>
                      <span className="plan-card-count">{progress.done}/{progress.total} steps done</span>
                    </span>
                  </Link>
                );
              })}
            </div>
            <Link to="/plans" className="profile-page-text-link">Open all plans →</Link>
          </section>
        )}

        {savedIdeas.length > 0 && (
          <section className="profile-page-section-block">
            <div className="profile-page-heading-row">
              <div>
                <p className="profile-page-kicker">Pathfind ideas</p>
                <h2>Saved project ideas</h2>
              </div>
              <span className="profile-page-heading-count">{savedIdeas.length}</span>
            </div>
            <div className="plans-list">
              {savedIdeas.map((idea) => {
                const doneCount = ideaProgress.ideas[idea.id]?.completedSteps.length ?? 0;
                return (
                  <Link key={idea.id} to={`/ideas/${idea.id}`} className="plan-card">
                    <span className="plan-card-org">Pathfind idea · {idea.category}</span>
                    <strong>{idea.title}</strong>
                    <span className="plan-card-meta">
                      <span className="plan-card-count">{doneCount}/{idea.roadmap.length} steps done</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="profile-page-section-block">
          <div className="profile-page-heading-row">
            <div>
              <p className="profile-page-kicker">Your shortlist</p>
              <h2>Saved opportunities</h2>
            </div>
            {bookmarks.length > 0 && <span className="profile-page-heading-count">{bookmarks.length}</span>}
          </div>
          {recentSaved.length > 0 ? (
            <>
              <div className="opportunity-grid">
                {recentSaved.map((opportunity, index) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    bookmarked
                    onToggleBookmark={toggle}
                    index={index}
                  />
                ))}
              </div>
              {bookmarks.length > recentSaved.length && (
                <Link to="/?saved=1" className="profile-page-text-link">View all saved →</Link>
              )}
            </>
          ) : (
            <p className="profile-page-empty">
              You haven’t saved an opportunity yet. <Link to="/">Browse opportunities →</Link>
            </p>
          )}
        </section>

        {continueExploring.length > 0 && (
          <section className="profile-page-section-block">
            <div className="profile-page-heading-row">
              <div>
                <p className="profile-page-kicker">{pathTitle ? `Based on your ${pathTitle} path` : "More to explore"}</p>
                <h2>Continue exploring</h2>
              </div>
            </div>
            <div className="opportunity-grid">
              {continueExploring.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  bookmarked={bookmarks.includes(opportunity.id)}
                  onToggleBookmark={toggle}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}

        <section className="profile-page-account">
          <div><p className="profile-page-kicker">Account &amp; privacy</p><h2>Account settings</h2><p>{user.email}</p></div>
          <div className="profile-page-account-actions">
            <FooterLegal />
            <button type="button" className="profile-page-secondary" onClick={handleSignOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Log out"}</button>
            {!deleteConfirm ? <button type="button" className="profile-page-danger" onClick={() => setDeleteConfirm(true)}>Delete account</button> : <div className="profile-page-delete-confirm"><span>This permanently deletes your account.</span><button type="button" className="profile-page-danger" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting…" : "Confirm delete"}</button></div>}
          </div>
        </section>

        {profileLoading && <p className="profile-page-meta">Refreshing profile details…</p>}
      </main>
    </ProfilePageShell>
  );
}

function ProfilePageShell({ children }: { children: ReactNode }) {
  return <div className="profile-page"><SeoPageHeader /><div className="profile-page-background">{children}</div></div>;
}
