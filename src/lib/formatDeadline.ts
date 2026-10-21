const DAY_IN_MS = 1000 * 60 * 60 * 24;

export function formatDeadline(deadline: string): string {
  const [year, month, day] = deadline.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(deadline: string, today: Date = new Date()): number {
  const [year, month, day] = deadline.split("-").map(Number);
  const deadlineDate = new Date(year, month - 1, day);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((deadlineDate.getTime() - todayMidnight.getTime()) / DAY_IN_MS);
}
