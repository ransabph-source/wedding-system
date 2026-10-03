interface StatsBarProps {
  totalGuests: number;
  seatedGuests: number;
  unseatedGuests: number;
}

export default function StatsBar({
  totalGuests,
  seatedGuests,
  unseatedGuests,
}: StatsBarProps) {
  const tiles = [
    {
      label: "סה״כ מוזמנים",
      value: totalGuests,
      badgeClasses:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.318 2.318 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
        </svg>
      ),
    },
    {
      label: "שובצו בשולחן",
      value: seatedGuests,
      badgeClasses:
        "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      label: "ממתינים לשיבוץ",
      value: unseatedGuests,
      badgeClasses:
        "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="mb-3 grid grid-cols-3 gap-2">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col items-center gap-1 rounded-xl bg-white p-2 text-center shadow-md sm:flex-row sm:gap-3 sm:p-3 sm:text-start ring-1 ring-black/5 dark:bg-zinc-900"
        >
          <div
            className={`hidden h-9 w-9 shrink-0 place-items-center rounded-full sm:grid ${tile.badgeClasses}`}
          >
            <div className="h-4.5 w-4.5">{tile.icon}</div>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium leading-tight text-zinc-500 sm:text-xs dark:text-zinc-400">
              {tile.label}
            </p>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              {tile.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
