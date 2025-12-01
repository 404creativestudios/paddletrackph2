import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Profile {
  username: string;
  display_name: string;
  skill_level: string | null;
  city: string | null;
  avatar_url: string | null;
  self_assessed_level: string | null;
  displayed_rating: number | null;
  badge_name: string | null;
  progress_percent: number | null;
  self_assessment_complete: boolean | null;
  status: string | null;
  status_location: string | null;
  status_link: string | null;
  status_updated_at: string | null;
}

interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

interface PendingGame {
  id: string;
  date: string;
  location_name: string;
  match_format: string;
  match_tag: string | null;
  is_scheduled: boolean;
  scheduled_datetime: string | null;
}

export default function HomeRedesigned() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
  });
  const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!profileData.username || !profileData.display_name) {
        navigate("/profile-setup");
        return;
      }

      setProfile(profileData);

      const { data: gamesData } = await supabase
        .from("lobby_players")
        .select(`
          result,
          practice_lobbies!inner(status)
        `)
        .eq("user_id", user.id)
        .eq("practice_lobbies.status", "completed");

      if (gamesData) {
        const totalGames = gamesData.length;
        const wins = gamesData.filter((g) => g.result === "win").length;
        const losses = gamesData.filter((g) => g.result === "loss").length;
        const draws = gamesData.filter((g) => g.result === "draw").length;
        const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
        setStats({ totalGames, wins, losses, draws, winRate });
      }

      const { data: pending } = await supabase
        .from("practice_lobbies")
        .select("*")
        .or(`created_by_user_id.eq.${user.id}`)
        .in("status", ["pending"])
        .order("date", { ascending: true })
        .limit(5);

      setPendingGames(pending || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background pb-32">
      <main className="flex-1">
        {/* Top App Bar */}
        <div className="flex items-center p-4">
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-12 w-12 rounded-full">
              <AvatarImage src={profile?.avatar_url || ""} alt={profile?.display_name} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white">
                {getInitials(profile?.display_name || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h1 className="text-zinc-800 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                {profile?.display_name}
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-normal">
                {profile?.displayed_rating ? `${profile.displayed_rating.toFixed(1)} Rating` : "No Rating"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={() => navigate("/activity-feed")}
              className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 w-12 bg-transparent text-zinc-800 dark:text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0"
            >
              <span className="material-symbols-outlined text-2xl">notifications</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 p-4">
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg bg-white dark:bg-zinc-900/50 p-6 border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400 text-base font-medium leading-normal">Total Wins</p>
            <p className="text-zinc-900 dark:text-white tracking-light text-3xl font-bold leading-tight">{stats.wins}</p>
            <p className="text-green-500 text-sm font-medium leading-normal">
              {stats.totalGames > 0 ? `${Math.round((stats.wins / stats.totalGames) * 100)}%` : "0%"}
            </p>
          </div>
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg bg-white dark:bg-zinc-900/50 p-6 border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400 text-base font-medium leading-normal">Win %</p>
            <p className="text-zinc-900 dark:text-white tracking-light text-3xl font-bold leading-tight">{stats.winRate}%</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-normal">
              {stats.wins}W / {stats.losses}L
            </p>
          </div>
          <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-lg bg-white dark:bg-zinc-900/50 p-6 border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-600 dark:text-zinc-400 text-base font-medium leading-normal">Total Games</p>
            <p className="text-zinc-900 dark:text-white tracking-light text-3xl font-bold leading-tight">{stats.totalGames}</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium leading-normal">Completed</p>
          </div>
        </div>

        {/* Section Header */}
        <h3 className="text-zinc-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
          Pending Games
        </h3>

        {/* List Items */}
        <div className="flex flex-col px-4 gap-2">
          {pendingGames.length === 0 ? (
            <div className="flex items-center gap-4 bg-white dark:bg-zinc-900/50 min-h-[72px] py-4 px-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">No pending games. Start a new game!</p>
            </div>
          ) : (
            pendingGames.map((game) => (
              <div
                key={game.id}
                onClick={() => navigate(`/lobby/${game.id}`)}
                className="flex items-center gap-4 bg-white dark:bg-zinc-900/50 min-h-[72px] py-2 px-4 justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:border-primary transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                    <span className="material-symbols-outlined text-primary">sports_tennis</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-zinc-900 dark:text-white text-base font-medium leading-normal line-clamp-1">
                      {game.match_format} at {game.location_name}
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-normal line-clamp-2">
                      {game.match_tag || "Practice Match"}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-normal">
                    {game.is_scheduled && game.scheduled_datetime
                      ? formatDistanceToNow(new Date(game.scheduled_datetime), { addSuffix: true })
                      : "Pending"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-4 z-10">
        <button
          onClick={() => navigate("/start-game")}
          className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 dark:bg-background/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around z-10">
        <a className="flex flex-col items-center justify-center gap-1 text-primary" href="/home">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-xs font-bold">Dashboard</span>
        </a>
        <a
          className="flex flex-col items-center justify-center gap-1 text-zinc-500 dark:text-zinc-400"
          href="/paddle-pals"
        >
          <span className="material-symbols-outlined">group</span>
          <span className="text-xs font-medium">Paddle Pals</span>
        </a>
        <a
          className="flex flex-col items-center justify-center gap-1 text-zinc-500 dark:text-zinc-400"
          href="/game-history"
        >
          <span className="material-symbols-outlined">history</span>
          <span className="text-xs font-medium">History</span>
        </a>
        <a
          className="flex flex-col items-center justify-center gap-1 text-zinc-500 dark:text-zinc-400"
          href="/edit-profile"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-xs font-medium">Profile</span>
        </a>
      </nav>
    </div>
  );
}
