import {
  GRADES,
  INTERESTS,
  OPPORTUNITY_TYPES,
  SORTS,
  LOCATIONS,
  type Interest,
  type Location,
  type OpportunityType,
  type SortBy,
} from "../data/types";

export interface FilterState {
  grade: number | null;
  interests: Interest[];
  types: OpportunityType[];
  locations: Location[];
  freeOnly: boolean;
  query: string;
  sortBy: SortBy;
}

const DEFAULT_SORT: SortBy = "deadline";

export function encodeFilters(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.grade !== null) params.set("grade", String(state.grade));
  if (state.interests.length > 0) params.set("interests", state.interests.join(","));
  if (state.types.length > 0) params.set("types", state.types.join(","));
  if (state.locations.length > 0) params.set("locations", state.locations.join(","));
  if (state.freeOnly) params.set("free", "1");
  if (state.query.trim() !== "") params.set("q", state.query.trim());
  if (state.sortBy !== DEFAULT_SORT) params.set("sort", state.sortBy);
  return params.toString();
}

export function decodeFilters(search: string): FilterState {
  const params = new URLSearchParams(search);

  const gradeRaw = Number(params.get("grade"));
  const grade = (GRADES as readonly number[]).includes(gradeRaw) ? gradeRaw : null;

  const validInterests = new Set<string>(INTERESTS.map((i) => i.id));
  const interests = (params.get("interests") ?? "")
    .split(",")
    .filter((value): value is Interest => validInterests.has(value));

  const validTypes = new Set<string>(OPPORTUNITY_TYPES);
  const types = (params.get("types") ?? "")
    .split(",")
    .filter((value): value is OpportunityType => validTypes.has(value));

  const validLocations = new Set<string>(LOCATIONS);
  const locations = (params.get("locations") ?? "")
    .split(",")
    .filter((value): value is Location => validLocations.has(value));

  const sortRaw = params.get("sort");
  const sortBy = (SORTS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as SortBy)
    : DEFAULT_SORT;

  return {
    grade,
    interests,
    types,
    locations,
    freeOnly: params.get("free") === "1",
    query: params.get("q") ?? "",
    sortBy,
  };
}
