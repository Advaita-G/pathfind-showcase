import { Plus, X } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { describeCollege, type College } from "../data/colleges";
import { highlightCollegeName, resolveCollege, searchColleges, type CollegeMatch } from "../lib/collegeSearch";
import { useColleges } from "../lib/useColleges";

interface CollegeSearchProps {
  /** Names already on the student's list (canonical or legacy) — hidden from results. */
  selected: string[];
  onAdd: (college: College) => void;
  /** Existing style hooks: "path-college" (dark Build My Path step) or "profile-college" (paper drawer). */
  classPrefix: "path-college" | "profile-college";
  inputClassName?: string;
  label?: string;
  placeholder?: string;
  limit?: number;
}

// 12, not 8: a query like "University of California" or "Texas A&M" ties across every campus in
// the system, and the real one a student wants (e.g. Santa Barbara) must not get truncated away.
const RESULT_LIMIT = 12;

/**
 * One combobox for both college pickers. The ~100 KB directory is fetched the first time the
 * input is focused, not on mount, so the landing page stays light.
 */
export default function CollegeSearch({
  selected,
  onAdd,
  classPrefix,
  inputClassName,
  label = "Search and add a college",
  placeholder = "Search any US college…",
  limit = RESULT_LIMIT,
}: CollegeSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputId = useId();
  const listboxId = useId();
  const statusId = useId();
  const directory = useColleges(wanted);

  const trimmed = query.trim();
  const results = useMemo<CollegeMatch[]>(() => {
    if (!directory.index || !trimmed) return [];
    // Exclude by canonical name so a legacy saved "UC Berkeley" still hides the Berkeley row.
    const exclude = selected.map((name) => resolveCollege(directory.index!, name)?.name ?? name);
    return searchColleges(directory.index, trimmed, { limit, exclude });
  }, [directory.index, trimmed, selected, limit]);

  const showList = open && results.length > 0;
  const loading = trimmed.length > 0 && (directory.status === "loading" || directory.status === "idle");
  const failed = trimmed.length > 0 && directory.status === "error";
  const empty = trimmed.length > 0 && directory.status === "ready" && results.length === 0;

  const choose = (match: CollegeMatch | undefined) => {
    if (!match) return;
    onAdd(match.college);
    setQuery("");
    setOpen(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      // Close the list, not the surrounding drawer (its Escape handler listens on window).
      if (open) {
        event.stopPropagation();
        setOpen(false);
        setHighlighted(-1);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(results[highlighted >= 0 ? highlighted : 0]);
      return;
    }
    if (!showList) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlighted(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlighted(results.length - 1);
    }
  };

  const wake = () => {
    setWanted(true);
    setOpen(true);
  };

  // A <div>, not a <form>: the Profile drawer renders this inside its own form, and Enter is
  // handled in onKeyDown so it adds a college instead of submitting the surrounding form.
  return (
    <div className={`${classPrefix}-search college-search`}>
      <label htmlFor={inputId} className={classPrefix === "profile-college" ? "profile-college-label" : undefined}>
        {label}
      </label>
      <div className={`${classPrefix}-input-wrap college-search-input-wrap`}>
        <input
          id={inputId}
          className={inputClassName}
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlighted(-1);
            wake();
          }}
          onFocus={wake}
          onPointerEnter={() => setWanted(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-describedby={loading || failed || empty ? statusId : undefined}
          aria-activedescendant={highlighted >= 0 ? `${listboxId}-${highlighted}` : undefined}
          aria-busy={loading || undefined}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
        />
        {trimmed.length > 0 && (
          <button
            type="button"
            className="college-search-clear"
            aria-label="Clear search"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              setHighlighted(-1);
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={classPrefix === "profile-college" ? "profile-college-add" : undefined}
          aria-label="Add college"
          disabled={results.length === 0}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => choose(results[highlighted >= 0 ? highlighted : 0])}
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>

      {showList && (
        <ul id={listboxId} className={`${classPrefix}-dropdown college-search-dropdown`} role="listbox">
          {results.map((match, index) => (
            <li key={match.college.id} role="presentation">
              <button
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlighted}
                className={`college-option${index === highlighted ? " is-active" : ""}`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(match);
                }}
                onMouseEnter={() => setHighlighted(index)}
              >
                <span className="college-option-name">
                  {highlightCollegeName(match.college.name, trimmed).map((segment, i) =>
                    segment.match ? <mark key={i}>{segment.text}</mark> : <span key={i}>{segment.text}</span>,
                  )}
                </span>
                <span className="college-option-meta">
                  {describeCollege(match.college)}
                  {match.matchedAlias && match.kind !== "name" && (
                    <>
                      {" · also "}
                      <span className="college-option-alias">“{match.matchedAlias}”</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(loading || failed || empty) && (
        <p id={statusId} className={`${classPrefix}-no-match college-search-status`} role="status">
          {loading && "Loading the college list…"}
          {failed && (
            <>
              Couldn’t load the college list.{" "}
              <button type="button" className="college-search-retry" onClick={directory.retry}>
                Try again
              </button>
            </>
          )}
          {empty && (
            <>
              No college matches “{trimmed}”. Try the city, a shorter name, or an abbreviation like “UCLA”.
            </>
          )}
        </p>
      )}
    </div>
  );
}
