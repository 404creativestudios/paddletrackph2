interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export default function StatCard({ title, value, change, changeType = "neutral" }: StatCardProps) {
  const changeColorClass =
    changeType === "positive"
      ? "text-green-500"
      : changeType === "negative"
      ? "text-red-500"
      : "text-zinc-500 dark:text-zinc-400";

  return (
    <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg bg-white dark:bg-zinc-900/50 p-6 border border-zinc-200 dark:border-zinc-800">
      <p className="text-zinc-600 dark:text-zinc-400 text-base font-medium leading-normal">{title}</p>
      <p className="text-zinc-900 dark:text-white tracking-light text-3xl font-bold leading-tight">{value}</p>
      {change && <p className={`text-sm font-medium leading-normal ${changeColorClass}`}>{change}</p>}
    </div>
  );
}
