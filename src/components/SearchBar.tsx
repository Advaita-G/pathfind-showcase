import { useEffect, useRef } from "react";
import { isSearchShortcut } from "../lib/isSearchShortcut";
import { IconSearch } from "./icons";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isSearchShortcut(event)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <label className="search-bar">
      <IconSearch className="search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        className="search-input"
        placeholder="Try “robotics” or “Stanford”…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Search opportunities"
      />
      {value === "" && (
        <kbd className="search-kbd-hint" aria-hidden="true">
          Press /
        </kbd>
      )}
    </label>
  );
}
