import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReactNode } from "react";

interface ListItemCardProps {
  imageUrl?: string;
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  timestamp?: string;
  onClick?: () => void;
  fallback?: string;
}

export default function ListItemCard({
  imageUrl,
  icon,
  iconColor = "text-primary",
  title,
  subtitle,
  subtitleColor = "text-zinc-500 dark:text-zinc-400",
  timestamp,
  onClick,
  fallback,
}: ListItemCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 bg-white dark:bg-zinc-900/50 min-h-[72px] py-2 px-4 justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 ${
        onClick ? "cursor-pointer hover:border-primary transition-colors" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        {imageUrl || fallback ? (
          <Avatar className="h-12 w-12 rounded-full">
            <AvatarImage src={imageUrl} alt={title} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
              {fallback}
            </AvatarFallback>
          </Avatar>
        ) : icon ? (
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
            <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
          </div>
        ) : null}
        <div className="flex flex-col justify-center">
          <p className="text-zinc-900 dark:text-white text-base font-medium leading-normal line-clamp-1">{title}</p>
          {subtitle && (
            <p className={`text-sm font-medium leading-normal line-clamp-2 ${subtitleColor}`}>{subtitle}</p>
          )}
        </div>
      </div>
      {timestamp && (
        <div className="shrink-0">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-normal">{timestamp}</p>
        </div>
      )}
    </div>
  );
}
