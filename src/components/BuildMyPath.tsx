import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { OPPORTUNITIES } from "../data/opportunities";
import CollegeSearch from "./CollegeSearch";
import { resolveCollege } from "../lib/collegeSearch";
import { useColleges } from "../lib/useColleges";
import { opportunitiesForCollege } from "../lib/matchCollegeOpportunities";
import { DEMO_PATHFIND_IDEAS, type PathfindIdea } from "../data/pathfindIdeas";
import {
  CAUSES,
  GOALS as GOAL_OPTIONS,
  INTEREST_GROUPS,
  INTERESTS,
  SKILLS,
  TIME_COMMITMENTS,
  type Cause,
  type Interest,
  type Opportunity,
  type OpportunityType,
  type Skill,
  type TimeCommitment,
} from "../data/types";
import type { IdeaProgressState } from "../lib/ideaProgress";
import { matchOpportunities } from "../lib/matchOpportunities";
import { describeIdeaMatch, diversifyIdeas, matchPathfindIdeas, personalizeIdea } from "../lib/matchPathfindIdeas";
import { requiresGroupToJoin } from "../lib/participation";
import type { PathProfile } from "../lib/usePathProfile";
import { IconClose } from "./icons";
import PathPreview, { OpportunityRow } from "./PathPreview";
import { ANALYTICS_EVENTS, trackEvent, trackOpportunityAction } from "../lib/analytics";

export interface ApplyPathParams {
  interests: string[];
  types: OpportunityType[];
  goals: string[];
  skills: Skill[];
  causes: Cause[];
  timeCommitment: TimeCommitment | null;
  colleges: string[];
}

interface BuildMyPathProps {
  profile: PathProfile;
  /** The currently selected student grade; optional because the path can be built signed out. */
  grade?: number | null;
  updateProfile: (partial: Partial<PathProfile>) => void;
  onApplyPath: (params: ApplyPathParams) => void;
  onPathGenerated: () => void;
  onScrollTo: (target: HTMLElement | null, focusTarget?: HTMLElement | null) => void;
  ideaProgress: IdeaProgressState;
  onToggleIdeaSaved: (ideaId: string) => void;
  onToggleIdeaStep: (ideaId: string, stepIndex: number) => void;
  /** Bookmarked opportunity ids; ideas that build toward one rank a little higher. */
  savedOpportunityIds?: string[];
  /** Bookmarks an opportunity (same store as the Explore cards). Omit to hide the bookmark button. */
  onToggleSavedOpportunity?: (opportunityId: string) => void;
}

export interface BuildMyPathHandle {
  openFinalPath: () => void;
  openToStep: (step: number) => void;
}

const STEPS = [
  { number: "01", short: "Interests", label: "Interests", question: "What are you curious about?", optional: false },
  { number: "02", short: "Goals", label: "Goals", question: "What do you want to do next?", optional: false },
  { number: "03", short: "Skills", label: "Skills", question: "What skills do you already have?", optional: true },
  { number: "04", short: "Causes", label: "Things I care about", question: "What do you care about?", optional: true },
  { number: "05", short: "Time", label: "Time available", question: "How many hours a week can you really give?", optional: false },
  { number: "06", short: "Colleges", label: "Dream colleges", question: "Any colleges on your mind?", optional: true },
] as const;

const numberFormatter = new Intl.NumberFormat("en-US");
const joinSteps = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
const INTEREST_LABELS = new Map(INTERESTS.map((item) => [item.id, item.label]));
const SKILL_LABELS = new Map(SKILLS.map((item) => [item.id, item.label]));
const CAUSE_LABELS = new Map(CAUSES.map((item) => [item.id, item.label]));

function SelectionRow({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`path-selection-row${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span>{children}</span>
      <span className="path-selection-mark" aria-hidden="true">
        {selected ? <Check size={16} /> : <Plus size={15} />}
      </span>
    </button>
  );
}

function OtherOptionRow({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="path-other-row"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onAdd(value);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={60}
      />
      <button type="submit" aria-label="Add" disabled={!value.trim()}>
        <Plus size={16} />
      </button>
    </form>
  );
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <motion.div className="path-signal-row" layout="position" initial={{ y: 8 }} animate={{ y: 0 }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.div>
  );
}

export function IdeaCard({
  idea,
  index,
  matchReason,
  saved,
  savedOnly,
  completedSteps,
  onToggleSaved,
  onToggleStep,
}: {
  idea: PathfindIdea;
  index: number;
  matchReason: string;
  saved: boolean;
  savedOnly: boolean;
  completedSteps: number[];
  onToggleSaved: () => void;
  onToggleStep: (stepIndex: number) => void;
}) {
  const related = idea.relatedOpportunityIds
    .map((id) => OPPORTUNITIES.find((opportunity) => opportunity.id === id))
    .filter((opportunity): opportunity is Opportunity => Boolean(opportunity));
  const [planOpen, setPlanOpen] = useState(false);
  const completedCount = completedSteps.length;
  const totalSteps = idea.roadmap.length;
  const progress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const progressLabel = completedCount === 0
    ? "Not started"
    : completedCount === totalSteps
      ? "Complete"
      : `${completedCount} of ${totalSteps} steps`;
  // personalizeIdea appends a long "fits your path because…" tail to the summary; the card shows the
  // original one-liner and keeps the match reason on its own short line.
  const baseSummary = DEMO_PATHFIND_IDEAS.find((item) => item.id === idea.id)?.summary ?? idea.summary;
  const reasonSentences = matchReason.split(/(?<=\.)\s+/);
  const timeCaveat = reasonSentences.find((sentence) => sentence.startsWith("Needs more than"));
  const planId = `${idea.id}-plan`;

  return (
    <motion.article
      className={`path-idea-card${saved ? " is-saved" : ""}`}
      data-idea-id={idea.id}
      initial={{ y: 14 }}
      animate={{ y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.16) }}
    >
      <span className="path-idea-type">{savedOnly ? "Saved idea" : `Pathfind idea · ${idea.category}`}</span>
      <h4><Link to={`/ideas/${idea.id}`} className="path-idea-title-link">{idea.title}</Link></h4>
      <p className="path-idea-summary">{baseSummary}</p>
      <p className="path-idea-meta">{idea.weeklyHours}/week · {idea.duration} · {idea.cost}</p>
      <p className="path-idea-fit">{[reasonSentences[0], timeCaveat].filter(Boolean).join(" ")}</p>
      {savedOnly && (
        <div className="path-idea-card-progress">
          <div className="path-idea-progress-heading">
            <span>Progress</span>
            <strong>{progressLabel}</strong>
          </div>
          <div className="path-idea-progress-track" aria-hidden="true">
            <span className="path-idea-progress-fill" style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
        </div>
      )}
      <div className="path-idea-actions">
        {savedOnly && (
          <Link to={`/ideas/${idea.id}`} className="path-idea-continue">
            {completedCount === 0 ? "Open project" : completedCount === totalSteps ? "Review project" : "Continue project"}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
        <button
          type="button"
          className="path-idea-plan-toggle"
          aria-expanded={planOpen}
          aria-controls={planId}
          onClick={() => setPlanOpen((open) => !open)}
        >
          View project plan{!savedOnly && completedCount > 0 && <em>{progressLabel}</em>}
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`path-idea-save${saved ? " is-saved" : ""}${savedOnly ? " is-remove" : ""}`}
          aria-pressed={saved}
          aria-label={`${saved ? "Unsave" : "Save"} ${idea.title}`}
          onClick={onToggleSaved}
        >
          <Bookmark size={15} fill={saved && !savedOnly ? "currentColor" : "none"} aria-hidden="true" />
          {savedOnly ? "Remove" : saved ? "Saved" : "Save idea"}
        </button>
      </div>
      {planOpen && (
        <div className="path-idea-details" id={planId}>
          <p className="path-idea-description">{idea.description}</p>
          <div className="path-idea-progress">
            <div className="path-idea-progress-heading">
              <span>Progress</span>
              <strong aria-live="polite" aria-atomic="true">{progressLabel}</strong>
            </div>
            <div
              className="path-idea-progress-track"
              role="progressbar"
              aria-label={`${idea.title} progress`}
              aria-valuemin={0}
              aria-valuemax={totalSteps}
              aria-valuenow={completedCount}
              aria-valuetext={progressLabel}
            >
              <motion.span
                className="path-idea-progress-fill"
                initial={false}
                animate={{ scaleX: progress / 100 }}
                transition={{ duration: 0.25 }}
              />
            </div>
          </div>
          <div className="path-idea-start">
            <span>Start here</span>
            <p>{idea.firstStep}</p>
          </div>
          <div className="path-idea-impact">
            <span>{idea.whoItHelps ? "Who it helps" : "Why it could matter"}</span>
            <p>{idea.potentialImpact}</p>
          </div>
          <div className="path-idea-plan-grid">
            <section>
              <h5>Roadmap</h5>
              <ol className="path-idea-roadmap-checklist">
                {idea.roadmap.map((step, stepIndex) => {
                  const complete = completedSteps.includes(stepIndex);
                  return (
                    <li key={`${idea.id}-${stepIndex}`} className={complete ? "is-complete" : ""}>
                      <label className="path-idea-roadmap-step">
                        <input
                          type="checkbox"
                          checked={complete}
                          aria-label={`${complete ? "Mark incomplete" : "Mark complete"}: ${step}`}
                          onChange={() => onToggleStep(stepIndex)}
                        />
                        <span className="path-idea-roadmap-mark" aria-hidden="true">
                          {complete && <Check size={13} />}
                        </span>
                        <span>{step}</span>
                      </label>
                    </li>
                  );
                })}
              </ol>
            </section>
            <section>
              <h5>What you’ll finish with</h5>
              <ul>
                {idea.deliverables.map((deliverable) => <li key={deliverable}>{deliverable}</li>)}
              </ul>
              <h5>Skills to bring</h5>
              <p>{idea.skillsRequired.join(" · ")}</p>
              <h5>Skills you’ll build</h5>
              <p>{idea.skillsYouWillLearn.join(" · ")}</p>
              {idea.tools && idea.tools.length > 0 && (
                <>
                  <h5>Tools</h5>
                  <p>{idea.tools.join(" · ")}</p>
                </>
              )}
              {idea.dataSource && (
                <>
                  <h5>Data</h5>
                  <p>{idea.dataSource}</p>
                </>
              )}
              {idea.stretchGoal && (
                <>
                  <h5>Stretch goal</h5>
                  <p>{idea.stretchGoal}</p>
                </>
              )}
            </section>
          </div>
          <p className="path-idea-full-reason">{matchReason}</p>
          {related.length > 0 && (
            <div className="path-idea-related">
              <h5>Related verified opportunities</h5>
              {related.map((opportunity) => (
                <Link key={opportunity.id} to={`/opportunities/${opportunity.id}`}>
                  {opportunity.title}<ArrowUpRight size={13} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

/** Stable default so the idea memo does not re-run every render. */
const NO_SAVED_OPPORTUNITIES: string[] = [];

const BuildMyPath = forwardRef<BuildMyPathHandle, BuildMyPathProps>(function BuildMyPath(
  {
    profile,
    grade = null,
    updateProfile,
    onApplyPath,
    onPathGenerated,
    onScrollTo,
    ideaProgress,
    onToggleIdeaSaved,
    onToggleIdeaStep,
    savedOpportunityIds = NO_SAVED_OPPORTUNITIES,
    onToggleSavedOpportunity,
  },
  ref,
) {
  const { colleges, interests, goals: selectedGoals, skills, causes, timeCommitment } = profile;
  const [activeStep, setActiveStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showFinalPath, setShowFinalPath] = useState(false);
  const [individualOnly, setIndividualOnly] = useState(false);
  // "Did you find at least one useful recommendation?" — answered once per generated path.
  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const feedbackHeadingId = useId();
  // Only consulted when already loaded (by the picker) — we never fetch the directory just to
  // prettify legacy saved names like "UC Berkeley".
  const collegeDirectory = useColleges(false);
  const revealRef = useRef<HTMLDivElement>(null);
  const revealHeadingRef = useRef<HTMLHeadingElement>(null);

  const goals = GOAL_OPTIONS.filter((option) => selectedGoals.includes(option.id));
  const types = useMemo<OpportunityType[]>(
    () => Array.from(new Set(goals.flatMap((goal) => goal.types))),
    [goals],
  );
  const hasMatchFilters = interests.length > 0 || types.length > 0;
  const matchBreakdown = useMemo(
    () => matchOpportunities(OPPORTUNITIES, interests, types, {
      grade,
      skills,
      causes,
      timeCommitment,
    }),
    [interests, types, grade, skills, causes, timeCommitment],
  );
  // Shown when the strict match set came up empty or thin, so the student knows why they are
  // seeing broader results instead of wondering why their exact interest produced nothing.
  const matchNote = hasMatchFilters ? matchBreakdown.note : null;
  const matchingIdeas = useMemo(
    () => matchPathfindIdeas(
      DEMO_PATHFIND_IDEAS,
      interests as Interest[],
      causes as Cause[],
      timeCommitment,
      selectedGoals,
      skills as Skill[],
      grade,
      savedOpportunityIds,
    ),
    [interests, causes, timeCommitment, selectedGoals, skills, grade, savedOpportunityIds],
  );
  const profileRichness = interests.length + causes.length + skills.length + selectedGoals.length;
  const ideaLimit = profileRichness >= 7 ? 5 : profileRichness >= 4 ? 4 : 3;
  const recommendedIdeas = diversifyIdeas(matchingIdeas, ideaLimit).map((idea) =>
    personalizeIdea(idea, interests, causes, selectedGoals, skills, grade, timeCommitment),
  );
  const recommendedIdeaIds = new Set(recommendedIdeas.map((idea) => idea.id));
  const savedIdeas = DEMO_PATHFIND_IDEAS
    .filter((idea) => ideaProgress.ideas[idea.id]?.saved && !recommendedIdeaIds.has(idea.id))
    .sort((a, b) => (
      ideaProgress.ideas[a.id]!.savedAt - ideaProgress.ideas[b.id]!.savedAt
    ));
  const pathIdeas = [...recommendedIdeas, ...savedIdeas];
  const verifiedMatches = hasMatchFilters ? matchBreakdown.matches : OPPORTUNITIES;
  // Team/club-only opportunities stay recommended by default (see VerifiedMatch's
  // participation note) — this only hides them when the student explicitly asks to.
  const visibleVerifiedMatches = individualOnly
    ? verifiedMatches.filter((opportunity) => !requiresGroupToJoin(opportunity))
    : verifiedMatches;
  const hiddenGroupOnlyCount = verifiedMatches.length - visibleVerifiedMatches.length;

  // A check means the student actually answered — optional steps are not pre-checked, so the
  // progress strip reflects what was entered rather than what can be skipped.
  const stepComplete = [
    interests.length > 0,
    selectedGoals.length > 0,
    skills.length > 0,
    causes.length > 0,
    timeCommitment !== null,
    colleges.length > 0,
  ];
  // Required steps still unanswered, excluding the one on screen (no "add time" nudge while
  // the student is already choosing a time).
  const requiredMissing = STEPS.filter((step, index) => !step.optional && !stepComplete[index] && index !== activeStep);
  useEffect(() => {
    if (!showFinalPath) return;
    const frame = window.requestAnimationFrame(() => {
      onScrollTo(revealRef.current, revealHeadingRef.current);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showFinalPath, onPathGenerated, onScrollTo]);

  useImperativeHandle(ref, () => ({
    openFinalPath: () => {
      setShowFinalPath(true);
    },
    openToStep: (step) => {
      setShowFinalPath(false);
      setDirection(step > activeStep ? 1 : -1);
      setActiveStep(Math.max(0, Math.min(STEPS.length - 1, step)));
    },
  }), [activeStep]);

  const goToStep = (next: number) => {
    setDirection(next > activeStep ? 1 : -1);
    setActiveStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  };

  // Canonical display name for a stored value (legacy abbreviations resolve once the directory
  // is loaded; anything unknown is shown verbatim rather than dropped).
  const displayCollege = (name: string) =>
    collegeDirectory.index ? resolveCollege(collegeDirectory.index, name)?.name ?? name : name;

  // Only a real directory record can be added — the picker never accepts free text.
  const addCollege = (name: string) => {
    const canonical = displayCollege(name);
    if (colleges.some((college) => displayCollege(college).toLowerCase() === canonical.toLowerCase())) return;
    updateProfile({ colleges: [...colleges, canonical] });
  };

  const collegeMatches = useMemo(() => {
    const entries: Array<{ college: string; matches: Opportunity[] }> = [];
    for (const college of colleges) {
      const matches = opportunitiesForCollege(OPPORTUNITIES, college);
      if (matches.length > 0) entries.push({ college: displayCollege(college), matches });
    }
    return entries;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colleges, collegeDirectory.index]);

  const sendFeedback = (answer: "yes" | "no") => {
    if (feedback) return;
    setFeedback(answer);
    trackEvent(ANALYTICS_EVENTS.pathFeedback, {
      useful: answer,
      verified_matches: hasMatchFilters ? matchBreakdown.total : OPPORTUNITIES.length,
      idea_count: recommendedIdeas.length,
    });
  };

  const toggleInterest = (interest: string) =>
    updateProfile({ interests: interests.includes(interest) ? interests.filter((item) => item !== interest) : [...interests, interest] });
  const toggleSkill = (skill: string) =>
    updateProfile({ skills: skills.includes(skill) ? skills.filter((item) => item !== skill) : [...skills, skill] });
  const toggleCause = (cause: string) =>
    updateProfile({ causes: causes.includes(cause) ? causes.filter((item) => item !== cause) : [...causes, cause] });
  const toggleGoal = (goal: string) =>
    updateProfile({ goals: selectedGoals.includes(goal) ? selectedGoals.filter((item) => item !== goal) : [...selectedGoals, goal] });

  const addOther = (
    field: "interests" | "goals" | "skills" | "causes",
    current: string[],
    raw: string,
  ) => {
    const value = raw.trim();
    if (!value || current.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    updateProfile({ [field]: [...current, value] } as Partial<PathProfile>);
  };

  const customInterests = interests.filter((id) => !INTEREST_LABELS.has(id as Interest));
  const customGoals = selectedGoals.filter((id) => !GOAL_OPTIONS.some((option) => option.id === id));
  const customSkills = skills.filter((id) => !SKILL_LABELS.has(id as Skill));
  const customCauses = causes.filter((id) => !CAUSE_LABELS.has(id as Cause));

  const applyPath = () => onApplyPath({
    interests,
    types,
    goals: selectedGoals,
    skills: skills as Skill[],
    causes: causes as Cause[],
    timeCommitment,
    colleges,
  });

  const stepContent = [
    <div className="path-interest-groups" key="interests">
      <p className="path-step-hint">Pick as many as you like.</p>
      {INTEREST_GROUPS.map((group) => (
        <div className="path-interest-group" key={group}>
          <h4>{group}</h4>
          <div className="path-selection-list">
            {INTERESTS.filter((interest) => interest.group === group).map((interest) => (
              <SelectionRow key={interest.id} selected={interests.includes(interest.id)} onClick={() => toggleInterest(interest.id)}>{interest.label}</SelectionRow>
            ))}
          </div>
        </div>
      ))}
      {customInterests.length > 0 && (
        <div className="path-interest-group">
          <h4>Other</h4>
          <div className="path-selection-list">
            {customInterests.map((value) => (
              <SelectionRow key={value} selected onClick={() => toggleInterest(value)}>{value}</SelectionRow>
            ))}
          </div>
        </div>
      )}
      <OtherOptionRow placeholder="Add another interest…" onAdd={(value) => addOther("interests", interests, value)} />
    </div>,
    <div key="goals">
      <div className="path-selection-list">
        <p className="path-step-hint">Pick every direction you want to explore.</p>
        {GOAL_OPTIONS.map((option) => (
          <SelectionRow key={option.id} selected={selectedGoals.includes(option.id)} onClick={() => toggleGoal(option.id)}>
            {option.label}
          </SelectionRow>
        ))}
        {customGoals.map((value) => (
          <SelectionRow key={value} selected onClick={() => toggleGoal(value)}>{value}</SelectionRow>
        ))}
      </div>
      <OtherOptionRow placeholder="Add another goal…" onAdd={(value) => addOther("goals", selectedGoals, value)} />
    </div>,
    <div key="skills">
      <div className="path-selection-list">
        <p className="path-step-hint">Starting from zero is a fine answer.</p>
        {SKILLS.map((skill) => (
          <SelectionRow key={skill.id} selected={skills.includes(skill.id)} onClick={() => toggleSkill(skill.id)}>{skill.label}</SelectionRow>
        ))}
        {customSkills.map((value) => (
          <SelectionRow key={value} selected onClick={() => toggleSkill(value)}>{value}</SelectionRow>
        ))}
      </div>
      <OtherOptionRow placeholder="Add another skill…" onAdd={(value) => addOther("skills", skills, value)} />
    </div>,
    <div key="causes">
      <div className="path-selection-list">
        <p className="path-step-hint">These help shape project ideas you could start yourself.</p>
        {CAUSES.map((cause) => (
          <SelectionRow key={cause.id} selected={causes.includes(cause.id)} onClick={() => toggleCause(cause.id)}>{cause.label}</SelectionRow>
        ))}
        {customCauses.map((value) => (
          <SelectionRow key={value} selected onClick={() => toggleCause(value)}>{value}</SelectionRow>
        ))}
      </div>
      <OtherOptionRow placeholder="Add another cause…" onAdd={(value) => addOther("causes", causes, value)} />
    </div>,
    <div className="path-selection-list path-time-list" key="time">
      <p className="path-step-hint">Pick a pace you can keep up, not your busiest week.</p>
      {TIME_COMMITMENTS.map((time) => (
        <SelectionRow key={time} selected={timeCommitment === time} onClick={() => updateProfile({ timeCommitment: timeCommitment === time ? null : time })}>{time}</SelectionRow>
      ))}
    </div>,
    <div className="path-college-step" key="colleges">
      <p className="path-step-hint">Add any schools on your mind. They steer your path; they do not predict admission.</p>
      <div className="path-college-tags">
        {colleges.map((college) => (
          <span key={college} className="path-college-tag">
            {displayCollege(college)}
            <button type="button" aria-label={`Remove ${displayCollege(college)}`} onClick={() => updateProfile({ colleges: colleges.filter((item) => item !== college) })}>
              <IconClose aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <CollegeSearch selected={colleges} onAdd={(college) => addCollege(college.name)} classPrefix="path-college" />

      {collegeMatches.length > 0 && (
        <div className="path-college-matches">
          <h4>Real programs connected to your list</h4>
          {collegeMatches.map(({ college, matches }) => (
            <div className="path-college-match-group" key={college}>
              <span className="path-college-match-label">{college}</span>
              <ul>
                {matches.slice(0, 6).map((opportunity) => (
                  <li key={opportunity.id}>
                    <Link to={`/opportunities/${opportunity.id}`} onClick={() => trackOpportunityAction(opportunity.id)}>{opportunity.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {colleges.length > 0 && collegeMatches.length === 0 && (
        <p className="path-step-hint path-college-empty-hint">
          No Pathfind-listed programs are directly run by your dream colleges yet — that's normal,
          most great opportunities aren't hosted by the school itself. Your interests below will
          still surface plenty to explore.
        </p>
      )}
    </div>,
  ];

  const preview = (
    <PathPreview
      hasMatchFilters={hasMatchFilters}
      catalogTotal={OPPORTUNITIES.length}
      opportunityCount={hasMatchFilters ? matchBreakdown.total : OPPORTUNITIES.length}
      ideaCount={matchingIdeas.length}
      interests={interests}
      verified={hasMatchFilters ? visibleVerifiedMatches : []}
      ideas={recommendedIdeas}
      isIdeaSaved={(ideaId) => ideaProgress.ideas[ideaId]?.saved === true}
      savedOpportunityIds={savedOpportunityIds}
      onToggleIdeaSaved={onToggleIdeaSaved}
      onToggleSavedOpportunity={onToggleSavedOpportunity}
      onExplore={applyPath}
    />
  );

  const header = (
    <header className="build-my-path-header">
      <h2 id="build-my-path-heading" className="build-my-path-title" tabIndex={-1}>Your next chapter starts here.</h2>
      <p className="build-my-path-subtitle">Pick what fits. Your matches update as you go.</p>
      <button
        type="button"
        className="build-my-path-skip"
        onClick={() => onScrollTo(document.getElementById("more-opportunities"))}
      >
        Skip to all opportunities
      </button>
    </header>
  );

  return (
    <section className="build-my-path-section" aria-labelledby="build-my-path-heading">
      <div className="build-my-path-inner">
        {header}

        <AnimatePresence mode="wait" initial={false}>
          {showFinalPath ? (
            <motion.div ref={revealRef} key="reveal" className="path-reveal" initial={{ y: 18 }} animate={{ y: 0 }} exit={{ opacity: 0 }}>
              <header className="path-reveal-header">
                <div>
                  <h3 ref={revealHeadingRef} tabIndex={-1}>Here’s a route you can start now.</h3>
                  <span>A direction, not a prediction.</span>
                </div>
                <button type="button" onClick={() => setShowFinalPath(false)}>
                  <RotateCcw size={16} aria-hidden="true" /> Edit my path
                </button>
              </header>

              <div className="path-reveal-signal-strip">
                {interests.length > 0 && <SignalRow label="Interests" value={interests.map((id) => (INTEREST_LABELS.get(id as Interest) ?? id)).join(" + ")} />}
                {goals.length > 0 && <SignalRow label="Goals" value={goals.map((goal) => goal.label).join(" · ")} />}
                {skills.length > 0 && <SignalRow label="Skills" value={skills.map((id) => (SKILL_LABELS.get(id as Skill) ?? id)).join(" · ")} />}
                {causes.length > 0 && <SignalRow label="Causes" value={causes.map((id) => (CAUSE_LABELS.get(id as Cause) ?? id)).join(" · ")} />}
                {timeCommitment && <SignalRow label="Time" value={timeCommitment} />}
              </div>

              <section className="path-reveal-section path-reveal-verified" aria-labelledby="verified-path-heading">
                <div className="path-reveal-section-heading">
                  <h3 id="verified-path-heading">Verified opportunities</h3>
                  <strong>
                    {numberFormatter.format(individualOnly ? visibleVerifiedMatches.length : (hasMatchFilters ? matchBreakdown.total : OPPORTUNITIES.length))}
                    {hasMatchFilters ? " matches" : " in the catalog"}
                  </strong>
                </div>
                {matchNote && (
                  <p className="path-reveal-note path-reveal-fallback-note" role="status">{matchNote}</p>
                )}
                {matchBreakdown.closedCycleCount > 0 && (
                  <p className="path-reveal-note path-reveal-fallback-note">
                    {matchBreakdown.closedCycleCount === 1
                      ? "One of these has closed for this cycle and is expected to reopen next year."
                      : `${matchBreakdown.closedCycleCount} of these have closed for this cycle and are expected to reopen next year.`}
                  </p>
                )}
                <label className="path-individual-only-toggle">
                  <input
                    type="checkbox"
                    checked={individualOnly}
                    onChange={(e) => setIndividualOnly(e.target.checked)}
                  />
                  <span>Only show opportunities I can join on my own</span>
                </label>
                {individualOnly && hiddenGroupOnlyCount > 0 && (
                  <p className="path-reveal-note path-individual-only-note">
                    Hiding {hiddenGroupOnlyCount} {hiddenGroupOnlyCount === 1 ? "opportunity that requires" : "opportunities that require"} a
                    team, club, or school to join.
                  </p>
                )}
                <div className="path-verified-list">
                  {visibleVerifiedMatches.slice(0, 5).map((opportunity) => (
                    <OpportunityRow
                      key={opportunity.id}
                      opportunity={opportunity}
                      interests={interests}
                      saved={savedOpportunityIds.includes(opportunity.id)}
                      onToggleSaved={onToggleSavedOpportunity ? () => onToggleSavedOpportunity(opportunity.id) : undefined}
                    />
                  ))}
                </div>
                <button type="button" className="path-reveal-explore" onClick={applyPath}>
                  Explore all verified matches <ArrowRight size={17} aria-hidden="true" />
                </button>
              </section>

              <section className="path-reveal-section" aria-labelledby="ideas-path-heading">
                <div className="path-reveal-section-heading">
                  <h3 id="ideas-path-heading">Pathfind ideas</h3>
                  <strong>
                    {recommendedIdeas.length} directions
                    {savedIdeas.length > 0 ? ` · ${savedIdeas.length} saved` : ""}
                  </strong>
                </div>
                <p className="path-reveal-note">Projects you can start yourself. Not external programs.</p>
                {pathIdeas.length > 0 ? (
                  <div className="path-ideas-grid">
                    {pathIdeas.map((idea, index) => (
                      <IdeaCard
                        key={idea.id}
                        idea={idea}
                        index={index}
                        matchReason={
                          recommendedIdeaIds.has(idea.id)
                            ? describeIdeaMatch(idea, interests as Interest[], causes as Cause[], selectedGoals, skills as Skill[], grade, timeCommitment)
                            : "Saved from an earlier version of your path."
                        }
                        saved={ideaProgress.ideas[idea.id]?.saved === true}
                        savedOnly={!recommendedIdeaIds.has(idea.id)}
                        completedSteps={ideaProgress.ideas[idea.id]?.completedSteps ?? []}
                        onToggleSaved={() => onToggleIdeaSaved(idea.id)}
                        onToggleStep={(stepIndex) => onToggleIdeaStep(idea.id, stepIndex)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="path-no-ideas">
                    <h4>
                      {interests.length === 0
                        ? "Add at least one interest to shape your project ideas."
                        : "None of Pathfind’s project ideas fit this exact combination yet — adding one more interest usually does it."}
                    </h4>
                    <button type="button" onClick={() => { setShowFinalPath(false); goToStep(0); }}>
                      {interests.length === 0 ? "Choose interests" : "Add an interest"}
                    </button>
                  </div>
                )}
              </section>

              <section className="path-reveal-next">
                <span>Your first step</span>
                <h3>{pathIdeas[0]?.firstStep ?? "Choose an interest, then return here for a concrete first step."}</h3>
                <div>
                  <button type="button" onClick={() => setShowFinalPath(false)}>Refine my path</button>
                </div>
              </section>

              <section className="path-feedback" aria-labelledby={feedbackHeadingId}>
                {feedback ? (
                  <p className="path-feedback-thanks" role="status">
                    {feedback === "yes"
                      ? "Good — thanks for telling us."
                      : "Thanks. Try adding another interest or a custom one; it changes the matches."}
                  </p>
                ) : (
                  <>
                    <h4 id={feedbackHeadingId}>Did you find at least one useful recommendation?</h4>
                    <div className="path-feedback-actions">
                      <button type="button" onClick={() => sendFeedback("yes")}>Yes</button>
                      <button type="button" onClick={() => sendFeedback("no")}>Not really</button>
                    </div>
                  </>
                )}
              </section>
            </motion.div>
          ) : (
            <motion.div key="builder" className="build-my-path-grid" initial={{ y: 12 }} animate={{ y: 0 }} exit={{ opacity: 0 }}>
              <div className="path-builder">
                <nav className="path-step-nav" aria-label="Build My Path steps">
                  {STEPS.map((step, index) => (
                    <button key={step.number} type="button" className={`${activeStep === index ? "is-active" : ""}${stepComplete[index] ? " is-complete" : ""}`} aria-current={activeStep === index ? "step" : undefined} aria-label={`Step ${step.number}: ${step.label}${stepComplete[index] ? " (done)" : ""}`} onClick={() => goToStep(index)}>
                      <span className="path-step-index">{stepComplete[index] ? <Check size={12} aria-hidden="true" /> : step.number}</span>
                      <span className="path-step-text"><em>{step.short}</em></span>
                    </button>
                  ))}
                </nav>

                <div className="path-active-step">
                  {STEPS[activeStep].optional && <span className="path-step-optional">Optional</span>}
                  <h3>{STEPS[activeStep].question}</h3>
                  <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div key={activeStep} custom={direction} variants={{ enter: (value: number) => ({ x: value * 24 }), center: { x: 0 }, exit: (value: number) => ({ x: value * -18, opacity: 0 }) }} initial="enter" animate="center" exit="exit" transition={{ duration: 0.22 }} className="path-step-content">
                      {stepContent[activeStep]}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="path-step-actions">
                  <button type="button" className="path-back" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0}><ArrowLeft size={17} /> Back</button>
                  {activeStep < STEPS.length - 1 ? (
                    <button type="button" className="path-continue" onClick={() => goToStep(activeStep + 1)}>{STEPS[activeStep].optional && !stepComplete[activeStep] ? "Skip for now" : "Continue"} <ArrowRight size={17} /></button>
                  ) : (
                    <button type="button" className="path-continue" onClick={() => { onPathGenerated(); setFeedback(null); setShowFinalPath(true); }}>View my path <ArrowRight size={17} /></button>
                  )}
                </div>
                {activeStep === STEPS.length - 1 && requiredMissing.length > 0 && (
                  <p className="path-step-hint path-required-hint" role="status">
                    Your path will be much more specific once you add {joinSteps(requiredMissing.map((step) => step.label.toLowerCase()))}.{" "}
                    <button type="button" className="path-inline-link" onClick={() => goToStep(STEPS.indexOf(requiredMissing[0]))}>
                      Go to {requiredMissing[0].label.toLowerCase()}
                    </button>
                  </p>
                )}
              </div>

              <aside className="path-preview" aria-label="Your Path preview">{preview}</aside>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
});

export default BuildMyPath;
