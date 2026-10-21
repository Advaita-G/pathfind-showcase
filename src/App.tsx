import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActiveFilters from "./components/ActiveFilters";
import BackToTop from "./components/BackToTop";
import FooterLegal from "./components/FooterLegal";
import { AnimatePresence, motion } from "motion/react";
import GradeSelect from "./components/GradeSelect";
import NewHero from "./components/NewHero";
import NextMove from "./components/NextMove";
import BuildMyPath, {
  IdeaCard,
  type ApplyPathParams,
  type BuildMyPathHandle,
} from "./components/BuildMyPath";
import LocationFilter from "./components/LocationFilter";
import InterestFilter from "./components/InterestFilter";
import OpportunityList, { type ListMode } from "./components/OpportunityList";
import SearchBar from "./components/SearchBar";
import SortControl from "./components/SortControl";
import TypeFilter from "./components/TypeFilter";
import { AuthModal } from "./components/AuthModal";
import { ProfileModal } from "./components/ProfileModal";
import { OPPORTUNITIES } from "./data/opportunities";
import { DEMO_PATHFIND_IDEAS } from "./data/pathfindIdeas";
import OpportunityDetail from "./components/OpportunityDetail";
import {
  type Interest,
  type Location,
  type Opportunity,
  type OpportunityType,
  type SortBy,
} from "./data/types";
import { filterByCost } from "./lib/filterByCost";
import { filterByLocation } from "./lib/filterByLocation";
import { filterByType } from "./lib/filterByType";
import { filterOpportunities } from "./lib/filterOpportunities";
import { closingSoon } from "./lib/landingSections";
import { searchOpportunities } from "./lib/searchOpportunities";
import { sortOpportunities } from "./lib/sortOpportunities";
import { useBookmarks } from "./lib/useBookmarks";
import { useIdeaProgress } from "./lib/useIdeaProgress";
import {
  getFirstIncompletePathStep,
  hasSavedPath,
  usePathProfile,
} from "./lib/usePathProfile";
import { decodeFilters, encodeFilters } from "./lib/urlState";
import { ANALYTICS_EVENTS, trackOnce } from "./lib/analytics";
import { Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { usePlans } from "./context/PlansContext";
import { useAssistant } from "./context/AssistantContext";
import { getDisplayFirstName } from "./lib/userDisplayName";

export default function App() {
  const initialSearch = typeof window === "undefined" ? "" : window.location.search;
  const initialFilters = decodeFilters(initialSearch.replace(/^\?/, ""));
  // "/?saved=1" is the deep link ProfilePage's "View all saved" points to.
  const initialSavedOnly = new URLSearchParams(initialSearch).get("saved") === "1";

  const [grade, setGrade] = useState<number | null>(initialFilters.grade);
  const [interests, setInterests] = useState<Interest[]>(initialFilters.interests);
  const [types, setTypes] = useState<OpportunityType[]>(initialFilters.types);
  const [locations, setLocations] = useState<Location[]>(initialFilters.locations);
  const [freeOnly, setFreeOnly] = useState(initialFilters.freeOnly);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const moreFiltersCount =
    types.length + locations.length + interests.length + (freeOnly ? 1 : 0);
  const [query, setQuery] = useState(initialFilters.query);
  const [sortBy, setSortBy] = useState<SortBy>(initialFilters.sortBy);
  const [showSavedOnly, setShowSavedOnly] = useState(initialSavedOnly);
  const [pathMatchContext, setPathMatchContext] = useState<ApplyPathParams | null>(null);
  const [pendingPathAction, setPendingPathAction] = useState<"edit" | "view" | null>(null);
  const [pendingDestination, setPendingDestination] = useState<{ target: "controls" | "results"; key: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [detailOpportunity, setDetailOpportunity] = useState<Opportunity | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  // A guest tapping "Sign in" inside the detail drawer triggers a full-page Google OAuth
  // redirect, which discards this component's state — stash the id so the drawer reopens
  // to the same opportunity, now unlocked, once the session comes back.
  const requestSignInForDetail = useCallback(() => {
    if (detailOpportunity) sessionStorage.setItem("pathfind:pending-detail", detailOpportunity.id);
    setAuthModalOpen(true);
  }, [detailOpportunity]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { bookmarks, toggle } = useBookmarks();
  const { plans } = usePlans();
  const activePlansCount = useMemo(
    () => Object.values(plans).filter((p) => p.status !== "done" && p.status !== "dropped").length,
    [plans],
  );
  const { ask: askAssistant } = useAssistant();
  const { ideaProgress, toggleSaved: toggleIdeaSaved, toggleStep: toggleIdeaStep } = useIdeaProgress();
  // Single source of truth for path-profile state: App owns the one usePathProfile
  // instance; ProfileModal receives it via props so its saves update THIS state
  // (a second hook instance there used to save to Supabase but never update App —
  // My Path / Build My Path stayed stale until a full page reload).
  const { profile, updateProfile, flushPendingSave } = usePathProfile();
  const { user, loading, needsProfileSetup } = useAuth();
  const navigate = useNavigate();
  const [heroPresent, setHeroPresent] = useState(true);
  // "My Path" is a workspace view: the cinematic hero gives way to a compact header and Your next move.
  const [myPathOpen, setMyPathOpen] = useState(false);
  const [mobileMenuOpen, setMenuMobileOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const buildPathRef = useRef<HTMLDivElement | null>(null);
  const buildMyPathRef = useRef<BuildMyPathHandle | null>(null);
  const filterToggleRef = useRef<HTMLButtonElement | null>(null);
  const filterCloseRef = useRef<HTMLButtonElement | null>(null);

  const scrollToTarget = useCallback((target: HTMLElement | null, focusTarget?: HTMLElement | null) => {
    if (!target) return;
    const navHeight = document.querySelector<HTMLElement>(".top-nav-inner")?.getBoundingClientRect().height ?? 0;
    // A first child's top margin collapses through the wrapper, so the wrapper's top sits above
    // the visible content; add it back to avoid scrolling to a blank gap.
    const collapsedMargin = target.firstElementChild
      ? parseFloat(getComputedStyle(target.firstElementChild).marginTop) || 0
      : 0;
    const top = window.scrollY + target.getBoundingClientRect().top + collapsedMargin - navHeight - 16;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const longJump = Math.abs(window.scrollY - top) > window.innerHeight * 2;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: reducedMotion || longJump ? "auto" : "smooth",
    });
    focusTarget?.focus({ preventScroll: true });
  }, []);

  const closingSoonList = useMemo(() => {
    const featuredIds = new Set(OPPORTUNITIES.filter((o) => o.featured).map((o) => o.id));
    return closingSoon(
      OPPORTUNITIES.filter((o) => !featuredIds.has(o.id)),
      8,
    );
  }, []);

  // "Save idea" (a Pathfind Idea, generated project/community direction) is a separate
  // collection from bookmarked opportunities — surface it in the Saved view too, since a
  // student who saves an idea there would otherwise never see it show up as "saved" anywhere.
  const savedIdeas = useMemo(
    () => DEMO_PATHFIND_IDEAS.filter((idea) => ideaProgress.ideas[idea.id]?.saved === true),
    [ideaProgress],
  );
  const savedIdeasSection = (
    <section className="saved-section saved-ideas-section" aria-labelledby="saved-ideas-heading">
      <div className="saved-section-head">
        <h2 id="saved-ideas-heading" tabIndex={-1}>Project ideas</h2>
        <span className="saved-section-count">{savedIdeas.length}</span>
      </div>
      {savedIdeas.length === 0 ? (
        <div className="saved-empty">
          <p className="saved-empty-title">No project ideas saved yet</p>
          <p>Build My Path suggests projects you can start on your own. Save one to track it here.</p>
          <button type="button" className="saved-empty-action" onClick={() => openMyPath()}>Open Build My Path</button>
        </div>
      ) : (
        <div className="saved-ideas-grid">
          {savedIdeas.map((idea, index) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              index={index}
              matchReason="Saved from Build My Path."
              saved
              savedOnly
              completedSteps={ideaProgress.ideas[idea.id]?.completedSteps ?? []}
              onToggleSaved={() => toggleIdeaSaved(idea.id)}
              onToggleStep={(stepIndex) => toggleIdeaStep(idea.id, stepIndex)}
            />
          ))}
        </div>
      )}
    </section>
  );

  useEffect(() => {
    const encoded = encodeFilters({ grade, interests, types, locations, freeOnly, query, sortBy });
    // Preserve the URL hash: right after a Google OAuth redirect, it briefly holds
    // #access_token=...&refresh_token=... — Supabase reads and consumes it asynchronously
    // to establish the session, so this must never wipe it out from under that in-flight read.
    const url = `${window.location.pathname}${encoded ? `?${encoded}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, [grade, interests, types, locations, freeOnly, query, sortBy]);

  // Prompt a first-time (or still-incomplete) Google sign-in to finish setting up their profile.
  useEffect(() => {
    if (needsProfileSetup) setProfileModalOpen(true);
  }, [needsProfileSetup]);

  // Reopen the detail drawer, now unlocked, once sign-in completes.
  useEffect(() => {
    if (loading || !user) return;
    const pendingId = sessionStorage.getItem("pathfind:pending-detail");
    if (!pendingId) return;
    sessionStorage.removeItem("pathfind:pending-detail");
    const pending = OPPORTUNITIES.find((o) => o.id === pendingId);
    if (pending) setDetailOpportunity(pending);
  }, [loading, user]);

  // If the session ends (sign-out or deleted account) while the profile drawer is open,
  // close it — don't leave the user looking at a form for an account that's gone.
  useEffect(() => {
    if (!loading && !user) setProfileModalOpen(false);
  }, [loading, user]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!moreFiltersOpen) return;

    const dialog = document.getElementById("more-filters");
    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hasAttribute("hidden"));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreFiltersOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => filterCloseRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      filterToggleRef.current?.focus();
    };
  }, [moreFiltersOpen]);

  const isLanding =
    !showSavedOnly &&
    grade === null &&
    interests.length === 0 &&
    types.length === 0 &&
    locations.length === 0 &&
    !freeOnly &&
    query.trim() === "";

  const workspaceView = showSavedOnly || (isLanding && myPathOpen);
  useEffect(() => {
    if (workspaceView) setHeroPresent(false);
  }, [workspaceView]);

  const { opportunities, mode } = useMemo<{
    opportunities: Opportunity[];
    mode: ListMode;
  }>(() => {
    if (isLanding) {
      return {
        opportunities: sortOpportunities(
          OPPORTUNITIES.filter((o) => o.featured),
          sortBy,
        ),
        mode: "landing",
      };
    }

    const base = showSavedOnly
      ? OPPORTUNITIES.filter((o) => bookmarks.includes(o.id))
      : OPPORTUNITIES;
    const filtered = filterByCost(
      filterByLocation(
        filterByType(filterOpportunities(base, grade, interests), types),
        locations,
      ),
      freeOnly,
    );
    const searched = searchOpportunities(filtered, query);

    return {
      opportunities: sortOpportunities(searched, sortBy),
      mode: showSavedOnly ? "saved" : "results",
    };
  }, [
    isLanding,
    showSavedOnly,
    bookmarks,
    grade,
    interests,
    types,
    locations,
    freeOnly,
    query,
    sortBy,
  ]);

  useEffect(() => {
    if (!pendingDestination) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const target = pendingDestination.target === "controls"
          ? controlsRef.current
          : resultsRef.current?.querySelector<HTMLElement>(".results-header, .path-match-context, .empty-state") ?? resultsRef.current;
        const focusTarget = target?.querySelector<HTMLElement>("h2, [tabindex='-1']");
        scrollToTarget(target ?? null, focusTarget);
        setPendingDestination(null);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [pendingDestination, mode, opportunities.length, scrollToTarget]);

  useEffect(() => {
    if (!pendingPathAction || !isLanding) return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (pendingPathAction === "edit") {
          buildMyPathRef.current?.openToStep(0);
          scrollToTarget(
            buildPathRef.current,
            buildPathRef.current?.querySelector<HTMLElement>("#build-my-path-heading"),
          );
          setPendingPathAction(null);
          return;
        }

        const firstIncompleteStep = hasSavedPath(profile)
          ? getFirstIncompletePathStep(profile)
          : 0;
        if (firstIncompleteStep === null) {
          buildMyPathRef.current?.openFinalPath();
        } else {
          buildMyPathRef.current?.openToStep(firstIncompleteStep);
        }
        // The compact header and Your next move sit above Build My Path, so start at the top.
        window.scrollTo({ top: 0, behavior: "auto" });
        setPendingPathAction(null);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [isLanding, pendingPathAction, profile, scrollToTarget]);

  const clearFilters = () => {
    setGrade(null);
    setInterests([]);
    setTypes([]);
    setLocations([]);
    setFreeOnly(false);
    setQuery("");
    setPathMatchContext(null);
  };

  const toggleInterest = (interest: Interest) => {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((i) => i !== interest)
        : [...current, interest],
    );
  };

  const selectInterest = (interest: Interest) => {
    setShowSavedOnly(false);
    setInterests([interest]);
    setPathMatchContext(null);
    setPendingDestination({ target: "results", key: Date.now() });
  };

  const toggleType = (type: OpportunityType) => {
    setTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    );
  };

  const toggleLocation = (location: Location) => {
    setLocations((current) =>
      current.includes(location)
        ? current.filter((l) => l !== location)
        : [...current, location],
    );
  };

  const toggleFreeOnly = () => {
    setFreeOnly(!freeOnly);
  };

  const openExplore = () => {
    setMyPathOpen(false);
    setShowSavedOnly(false);
    setGrade(null);
    setInterests([]);
    setTypes([]);
    setLocations([]);
    setFreeOnly(false);
    setQuery("");
    setPathMatchContext(null);
    setPendingDestination({ target: "controls", key: Date.now() });
  };

  const restoreLandingForPath = () => {
    setShowSavedOnly(false);
    setGrade(null);
    setInterests([]);
    setTypes([]);
    setLocations([]);
    setFreeOnly(false);
    setQuery("");
  };

  const scrollToBuildPath = () => {
    setMyPathOpen(false);
    restoreLandingForPath();
    setPendingPathAction("edit");
  };

  const openMyPath = () => {
    setMyPathOpen(true);
    restoreLandingForPath();
    setPendingPathAction("view");
  };

  const showSaved = () => {
    setMyPathOpen(false);
    if (showSavedOnly) {
      setShowSavedOnly(false);
      setPendingDestination({ target: "controls", key: Date.now() });
    } else {
      setShowSavedOnly(true);
      setPathMatchContext(null);
      setPendingDestination({ target: "results", key: Date.now() });
    }
  };

  const handlePathGenerated = useCallback(() => {
    trackOnce(ANALYTICS_EVENTS.pathGenerated);
  }, []);

  // From Your next move: jump to the first unfinished Build My Path step without leaving My Path.
  const buildPathFromMove = () => {
    buildMyPathRef.current?.openToStep(getFirstIncompletePathStep(profile) ?? 0);
    scrollToTarget(buildPathRef.current, buildPathRef.current?.querySelector<HTMLElement>("#build-my-path-heading"));
  };

  const applyPath = (params: ApplyPathParams) => {
    setMyPathOpen(false);
    setShowSavedOnly(false);
    setInterests(params.interests as Interest[]);
    setTypes(params.types);
    setPathMatchContext(params);
    setMoreFiltersOpen(false);
    setPendingDestination({ target: "results", key: Date.now() });
  };

  return (
    <div className="page">
        <header className={`top-nav${heroPresent ? "" : " is-scrolled"}`}>
          <div className="top-nav-inner">
            <button
              type="button"
              className="top-nav-brand"
              onClick={() => {
                setMyPathOpen(false);
                setShowSavedOnly(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span className="top-nav-logo">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 20 12 5l6 15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 5v15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="top-nav-wordmark">Pathfind</span>
            </button>

            <div className="top-nav-links">
              <button type="button" className="top-nav-link" onClick={openExplore}>
                Explore
              </button>
              <button type="button" className="top-nav-link" onClick={scrollToBuildPath}>
                Build My Path
              </button>
              <button
                type="button"
                className="top-nav-link top-nav-my-path"
                onClick={openMyPath}
              >
                My Path
                {hasSavedPath(profile) && (
                  <span className="top-nav-path-dot" aria-label="Saved path available" />
                )}
              </button>
              <button
                type="button"
                className={`top-nav-link${showSavedOnly ? " is-active" : ""}`}
                onClick={showSaved}
              >
                Saved{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
              </button>
              <Link to="/plans" className="top-nav-link">
                Plans{activePlansCount > 0 ? ` (${activePlansCount})` : ""}
              </Link>

              <button
                type="button"
                className="top-nav-link top-nav-account"
                onClick={() => {
                  if (loading) return;
                  if (user) navigate("/profile"); else setAuthModalOpen(true);
                }}
              >
                {loading ? null : user ? (
                  <>
                    {getDisplayFirstName(user)}
                    <span className="top-nav-account-indicator" />
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </div>

            <div className="top-nav-actions">
              <button
                type="button"
                className="top-nav-action"
                onClick={() => navigate("/profile")}
                disabled={!user}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="top-nav-action-icon"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 8a4 4 0 100 8 4 4 0 000-8z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </button>
              <button
                type="button"
                className="top-nav-hamburger"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                onClick={() => setMenuMobileOpen((v) => !v)}
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                className="top-nav-mobile"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div className="top-nav-mobile-inner" onClick={() => setMenuMobileOpen(false)}>
                  <button type="button" className="top-nav-link" onClick={openExplore}>
                    Explore
                  </button>
                  <button type="button" className="top-nav-link" onClick={scrollToBuildPath}>
                    Build My Path
                  </button>
                  <button type="button" className="top-nav-link top-nav-my-path" onClick={openMyPath}>
                    My Path
                    {hasSavedPath(profile) && (
                      <span className="top-nav-path-dot" aria-label="Saved path available" />
                    )}
                  </button>
                  <button
                    type="button"
                    className={`top-nav-link${showSavedOnly ? " is-active" : ""}`}
                    onClick={showSaved}
                  >
                    Saved{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
                  </button>
                  <Link to="/plans" className="top-nav-link">
                    Plans{activePlansCount > 0 ? ` (${activePlansCount})` : ""}
                  </Link>
                  <button
                    type="button"
                    className="top-nav-link top-nav-account"
                    onClick={() => {
                      if (loading) return;
                      if (user) navigate("/profile"); else setAuthModalOpen(true);
                    }}
                  >
                    {loading ? null : user ? getDisplayFirstName(user) : "Sign in"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-1 overflow-hidden">
          <AnimatePresence>
            {authModalOpen && (
              <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {profileModalOpen && (
              <ProfileModal
                isOpen={profileModalOpen}
                onClose={() => setProfileModalOpen(false)}
                profile={profile}
                updateProfile={updateProfile}
                flushPendingSave={flushPendingSave}
              />
            )}
          </AnimatePresence>
          <section className="relative overflow-hidden">
            {!workspaceView && (
              <NewHero
                onExplore={openExplore}
                onBuildPath={scrollToBuildPath}
                onHeroPresenceChange={(present) => setHeroPresent(present)}
              />
            )}
            {/* Main content area */}
            <div className="content">
                {workspaceView && (
                  <div className="workspace-header">
                    {!showSavedOnly && (
                      <>
                        <h1>My Path</h1>
                        <p>Your plans, saved work and deadlines in one place.</p>
                      </>
                    )}
                  </div>
                )}
                {workspaceView && (
                  <NextMove
                    profile={profile}
                    bookmarks={bookmarks}
                    ideaProgress={ideaProgress}
                    onToggleIdeaStep={toggleIdeaStep}
                    onBuildPath={isLanding ? buildPathFromMove : openMyPath}
                  />
                )}
                {/* Search & Filters */}
                <div className="discover-search-filters" ref={controlsRef}>
                  <SearchBar
                    value={query}
                    onChange={setQuery}
                  />
                  <div className="controls-row" style={{ marginTop: "1.5rem" }}>
                    <GradeSelect value={grade} onChange={setGrade} />
                    <button
                      type="button"
                      className="more-filters-toggle"
                      aria-expanded={moreFiltersOpen}
                      aria-controls="more-filters"
                      onClick={() => setMoreFiltersOpen((v) => !v)}
                    >
                      {moreFiltersOpen ? "Fewer filters" : "More filters"}
                      {moreFiltersCount > 0 && (
                        <span className="more-filters-count">{moreFiltersCount}</span>
                      )}
                      <span className={`more-filters-chevron${moreFiltersOpen ? " is-open" : ""}`}>⌄</span>
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {moreFiltersOpen && (
                      <motion.div
                        id="more-filters"
                        className="more-filters"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="controls-row">
                          <LocationFilter value={locations} onToggle={toggleLocation} />
                          <div className="control-group">
                            <span className="control-label">Cost</span>
                            <button
                              type="button"
                              aria-pressed={freeOnly}
                              className={`location-pill${freeOnly ? " is-selected" : ""}`}
                              onClick={toggleFreeOnly}
                            >
                              Free only
                            </button>
                          </div>
                          <SortControl value={sortBy} onChange={setSortBy} />
                        </div>
                        <TypeFilter value={types} onToggle={toggleType} />
                        <InterestFilter value={interests} onToggle={toggleInterest} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active Filters Badge */}
                {moreFiltersCount > 0 && (
                  <ActiveFilters
                    grade={grade}
                    interests={interests}
                    types={types}
                    locations={locations}
                    freeOnly={freeOnly}
                    query={query}
                    onRemoveGrade={() => setGrade(null)}
                    onRemoveInterest={toggleInterest}
                    onRemoveType={toggleType}
                    onRemoveLocation={toggleLocation}
                    onRemoveFreeOnly={() => setFreeOnly(false)}
                    onClearQuery={() => setQuery("")}
                    onClearAll={clearFilters}
                  />
                )}

                {showSavedOnly && bookmarks.length > 1 && (
                  <button
                    type="button"
                    className="compare-saved-cta"
                    onClick={() =>
                      askAssistant(
                        "Compare my saved opportunities and help me prioritize which to apply to first.",
                        bookmarks,
                      )
                    }
                  >
                    Compare my saved options
                  </button>
                )}

                {/* Opportunities List */}
                <div ref={resultsRef}>
                  <OpportunityList
                    savedIdeasCount={savedIdeas.length}
                    onBrowse={showSaved}
                    opportunities={opportunities}
                    mode={mode}
                    bookmarks={bookmarks}
                    onToggleBookmark={toggle}
                    onClearFilters={clearFilters}
                    closingSoonOpportunities={closingSoonList}
                    onSelectInterest={selectInterest}
                    pathMatchContext={pathMatchContext}
                    onOpenMyPath={openMyPath}
                    savedIdeasSection={savedIdeasSection}
                    onOpenDetail={setDetailOpportunity}
                    pathBuilder={
                      isLanding ? (
                        <div ref={buildPathRef} className="build-path-anchor">
                          <BuildMyPath
                            ref={buildMyPathRef}
                            profile={profile}
                            updateProfile={updateProfile}
                            onApplyPath={applyPath}
                            onPathGenerated={handlePathGenerated}
                            onScrollTo={scrollToTarget}
                            ideaProgress={ideaProgress}
                            onToggleIdeaSaved={(ideaId) => {
                              const idea = DEMO_PATHFIND_IDEAS.find((item) => item.id === ideaId);
                              const wasSaved = ideaProgress.ideas[ideaId]?.saved === true;
                              toggleIdeaSaved(ideaId);
                              if (idea) setToast(wasSaved ? `Removed ${idea.title}` : `Saved ${idea.title}`);
                            }}
                            onToggleIdeaStep={toggleIdeaStep}
                            savedOpportunityIds={bookmarks}
                            onToggleSavedOpportunity={toggle}
                          />
                        </div>
                      ) : undefined
                    }
                  />
                </div>
              </div>
          </section>
        </main>

        <footer className="footer" ref={footerRef}>
          <div className="footer-inner">
            <div className="footer-brand">Pathfind</div>
            <p className="footer-blurb">
              A curated map of summer programs, internships, research, and competitions for high
              schoolers — built to make the search less overwhelming.
            </p>
            <p className="footer-disclaimer">
              Deadlines shift year to year and some aren't published yet for the upcoming cycle —
              entries marked "(est.)" are estimates. Always confirm the current date on the
              official site before you apply.
            </p>
            <div className="footer-seo-links">
              <div>
                <h3>Browse opportunities</h3>
                <Link to="/opportunities">All opportunities</Link>
                <Link to="/research-programs">Research programs</Link>
                <Link to="/internships">Internships</Link>
                <Link to="/competitions">Competitions</Link>
                <Link to="/summer-programs">Summer programs</Link>
                <Link to="/free-programs">Free programs</Link>
              </div>
              <div>
                <h3>By topic</h3>
                <Link to="/stem">STEM</Link>
                <Link to="/business">Business &amp; entrepreneurship</Link>
                <Link to="/interests/computer-science">Computer science</Link>
                <Link to="/interests/math">Math</Link>
                <Link to="/interests/biology-medicine">Biology &amp; medicine</Link>
              </div>
              <div>
                <h3>By grade</h3>
                <Link to="/grades/9">Grade 9</Link>
                <Link to="/grades/10">Grade 10</Link>
                <Link to="/grades/11">Grade 11</Link>
                <Link to="/grades/12">Grade 12</Link>
              </div>
              <div>
                <h3>Guides</h3>
                <Link to="/guides">All guides</Link>
                <Link to="/guides/research-opportunities-for-high-school-students">Research</Link>
                <Link to="/guides/internships-for-high-school-students">Internships</Link>
                <Link to="/guides/competitions-for-high-school-students">Competitions</Link>
                <Link to="/guides/volunteer-opportunities-for-high-school-students">Volunteering</Link>
              </div>
            </div>
            <FooterLegal />
          </div>
        </footer>

        <BackToTop />

        <OpportunityDetail
          opportunity={detailOpportunity}
          onClose={() => setDetailOpportunity(null)}
          bookmarked={detailOpportunity ? bookmarks.includes(detailOpportunity.id) : false}
          onToggleBookmark={toggle}
          onSelectInterest={(interest) => {
            setDetailOpportunity(null);
            selectInterest(interest);
          }}
          signedIn={!!user}
          onRequestSignIn={requestSignInForDetail}
        />

        <div className="toast-region" role="status" aria-live="polite">
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast}
                className="toast"
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
  );
}