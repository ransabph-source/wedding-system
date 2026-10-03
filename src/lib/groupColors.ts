const PALETTE = [
  "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400",
  "bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-400",
];

export function getGroupColorClasses(group: string): string {
  let hash = 0;
  for (let i = 0; i < group.length; i++) {
    hash = (hash * 31 + group.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
