import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trophy, Target, TrendingUp, Calendar, LogOut, Zap, Clock, MapPin, Award, Users, Search, UserPlus, Bell, Activity, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import FloatingActionButton from "@/components/FloatingActionButton";
import StatCard from "@/components/StatCard";
import ListItemCard from "@/components/ListItemCard";
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

const STATUS_LABELS: Record<string, string> = {
  looking_partner: "Looking for partner",
  looking_one_more: "Looking for one more player",
  hosting_open_play: "Hosting open play",
  looking_open_play: "Looking for open play",
  looking_coach: "Looking for coach",
  looking_court: "Looking for court",
};
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
export default function Home() {
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0
  });
  const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
  const [scheduledGames, setScheduledGames] = useState<PendingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduledReminder, setShowScheduledReminder] = useState(false);
  const [paddlePalRequestsCount, setPaddlePalRequestsCount] = useState(0);
  const [showPalActivityNotification, setShowPalActivityNotification] = useState(false);
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);
  const loadData = async () => {
    if (!user) return;
    try {
      const {
        data: profileData,
        error: profileError
      } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileError) throw profileError;
      if (!profileData.username || !profileData.display_name) {
        navigate("/profile-setup");
        return;
      }
      setProfile(profileData);
      const {
        data: gamesData
      } = await supabase.from("lobby_players").select(`
          result,
          practice_lobbies!inner(status)
        `).eq("user_id", user.id).eq("practice_lobbies.status", "completed");
      if (gamesData) {
        const totalGames = gamesData.length;
        const wins = gamesData.filter(g => g.result === "win").length;
        const losses = gamesData.filter(g => g.result === "loss").length;
        const draws = gamesData.filter(g => g.result === "draw").length;
        const winRate = totalGames > 0 ? Math.round(wins / totalGames * 100) : 0;
        setStats({
          totalGames,
          wins,
          losses,
          draws,
          winRate
        });
      }
      const {
        data: pendingData
      } = await supabase.from("lobby_players").select(`
          practice_lobbies!inner(
            id,
            date,
            location_name,
            match_format,
            match_tag,
            status,
            is_scheduled,
            scheduled_datetime
          )
        `).eq("user_id", user.id).eq("practice_lobbies.status", "pending").eq("practice_lobbies.is_scheduled", false);
      if (pendingData) {
        const games = pendingData.map((item: any) => item.practice_lobbies);
        setPendingGames(games);
      }
      const {
        data: scheduledData
      } = await supabase.from("lobby_players").select(`
          practice_lobbies!inner(
            id,
            date,
            location_name,
            match_format,
            match_tag,
            status,
            is_scheduled,
            scheduled_datetime
          )
        `).eq("user_id", user.id).eq("practice_lobbies.status", "pending").eq("practice_lobbies.is_scheduled", true).gte("practice_lobbies.scheduled_datetime", new Date().toISOString());
      if (scheduledData) {
        const games = scheduledData.map((item: any) => item.practice_lobbies);
        setScheduledGames(games);
        const today = new Date().toDateString();
        const hasGameToday = games.some((game: any) => {
          const gameDate = new Date(game.scheduled_datetime).toDateString();
          return gameDate === today;
        });
        setShowScheduledReminder(hasGameToday);
      }

      const { data: requestsData, count } = await supabase
        .from("paddle_pals")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      setPaddlePalRequestsCount(count || 0);

      const { data: paddlePalsSent, error: palsSentError } = await supabase
        .from("paddle_pals")
        .select("receiver_id")
        .eq("sender_id", user.id)
        .eq("status", "accepted");

      const { data: paddlePalsReceived, error: palsReceivedError } = await supabase
        .from("paddle_pals")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .eq("status", "accepted");

      if (!palsSentError && !palsReceivedError) {
        const paddlePalIds = [
          ...(paddlePalsSent?.map((p) => p.receiver_id) || []),
          ...(paddlePalsReceived?.map((p) => p.sender_id) || []),
        ];

        if (paddlePalIds.length > 0) {
          const fourHoursAgo = new Date();
          fourHoursAgo.setHours(fourHoursAgo.getHours() - 4);

          const { data: recentActivity } = await supabase
            .from("profiles")
            .select("id")
            .in("id", paddlePalIds)
            .neq("status", "none")
            .not("status", "is", null)
            .gte("status_updated_at", fourHoursAgo.toISOString())
            .limit(1);

          setShowPalActivityNotification((recentActivity?.length || 0) > 0);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return <div className="relative flex min-h-screen w-full flex-col bg-background pb-32">
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

      <div className="px-4 py-6 space-y-6">

        {/* Scheduled Game Reminder */}
        {showScheduledReminder && <Card className="bg-primary/10 border-primary animate-scale-in">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <p className="text-foreground font-medium">You have a game scheduled today!</p>
            </CardContent>
          </Card>}

        {/* Paddle Pals Activity Notification */}
        {showPalActivityNotification && <Card className="bg-green-500/10 border-green-500 cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate("/activity-feed")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-green-500" />
                <p className="text-foreground font-medium">Your Paddle Pals are active now</p>
              </div>
              <Button size="sm" variant="outline">
                View Feed
              </Button>
            </CardContent>
          </Card>}

        {/* Status Card */}
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Your Status</h3>
                {profile?.status && profile.status !== "none" ? (
                  <div className="space-y-2">
                    <p className="font-medium text-base">
                      {STATUS_LABELS[profile.status] || profile.status}
                    </p>
                    {profile.status_location && (
                      <p className="text-sm text-muted-foreground">
                        📍 {profile.status_location}
                      </p>
                    )}
                    {profile.status_updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(profile.status_updated_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You have no active status</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/update-status")}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/activity-feed")}
            >
              <Activity className="h-4 w-4 mr-2" />
              View Activity Feed
            </Button>
          </CardContent>
        </Card>

        {/* Stats Dashboard */}
        <div className="flex flex-wrap gap-4 px-4">
          <StatCard
            title="Total Wins"
            value={stats.wins}
            change={stats.totalGames > 0 ? `${Math.round((stats.wins / stats.totalGames) * 100)}%` : "0%"}
            changeType="positive"
          />
          <StatCard
            title="Win %"
            value={`${stats.winRate}%`}
            change={`${stats.wins}W / ${stats.losses}L`}
            changeType="neutral"
          />
          <StatCard
            title="Total Games"
            value={stats.totalGames}
            change="Completed"
            changeType="neutral"
          />
        </div>

        {/* Scheduled Games */}
        {scheduledGames.length > 0 && <div className="space-y-3">
            <h3 className="text-zinc-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">
              Scheduled Games
            </h3>
            <div className="grid gap-3">
              {scheduledGames.map(game => <Card key={game.id} className="active:scale-95 cursor-pointer bg-card border-border shadow-sm transition-transform" onClick={() => navigate(`/lobby/${game.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {game.match_format}
                      </Badge>
                      {game.match_tag && <Badge variant="outline" className="text-xs">
                          {game.match_tag}
                        </Badge>}
                    </div>
                    <h3 className="font-bold text-base text-foreground mb-1 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {game.location_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(game.scheduled_datetime!).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                })}{" "}
                      at{" "}
                      {new Date(game.scheduled_datetime!).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                    </p>
                  </CardContent>
                </Card>)}
            </div>
          </div>}

        {/* Pending Games */}
        {pendingGames.length > 0 && <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-1">
              <Trophy className="h-5 w-5 text-primary" />
              Active
            </h2>
            <div className="grid gap-3">
              {pendingGames.map(game => <Card key={game.id} className="active:scale-95 cursor-pointer bg-card border-border shadow-sm transition-transform" onClick={() => navigate(`/lobby/${game.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className="text-xs font-semibold bg-primary">
                        {game.match_format}
                      </Badge>
                      {game.match_tag && <Badge variant="outline" className="text-xs">
                          {game.match_tag}
                        </Badge>}
                    </div>
                    <h3 className="font-bold text-base text-foreground mb-1 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {game.location_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(game.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric"
                })}{" "}
                      at{" "}
                      {new Date(game.date).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
                    </p>
                  </CardContent>
                </Card>)}
            </div>
          </div>}

        {/* Paddle Pals Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-1">
            <Users className="h-5 w-5 text-primary" />
            Paddle Pals
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="active:scale-95 cursor-pointer bg-card border-border shadow-sm transition-transform"
              onClick={() => navigate("/search-players")}>
              <CardContent className="p-4 text-center">
                <Search className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Find Players</p>
              </CardContent>
            </Card>
            <Card className="active:scale-95 cursor-pointer bg-card border-border shadow-sm transition-transform relative"
              onClick={() => navigate("/paddle-pal-requests")}>
              <CardContent className="p-4 text-center">
                {paddlePalRequestsCount > 0 && (
                  <Badge className="absolute top-2 right-2 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-xs">
                    {paddlePalRequestsCount}
                  </Badge>
                )}
                <Bell className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium">Requests</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Action - Floating Button Style */}
        <div className="space-y-3">
          <Button size="lg" onClick={() => navigate("/schedule-game")} className="w-full h-12 text-base font-semibold active:scale-95 transition-transform shadow-md bg-gradient-primary">
            <Calendar className="mr-2 h-5 w-5" />
            Schedule a Game
          </Button>
        </div>

        {/* Rating & Training Card */}
        {profile && profile.self_assessment_complete && profile.displayed_rating ? (
          <Card
            className="bg-gradient-primary text-white border-0 shadow-glow cursor-pointer active:scale-95 transition-transform"
            onClick={() => navigate("/training-dashboard")}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs mb-1">Your Rating</p>
                  <p className="text-4xl font-bold">{profile.displayed_rating}</p>
                </div>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-sm px-3 py-1">
                  {profile.badge_name}
                </Badge>
              </div>
              {profile.progress_percent !== null && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-white/80">
                    <span>Progress</span>
                    <span>{profile.progress_percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${profile.progress_percent}%` }}
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-white/70 mt-2">Tap to view training plan</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-primary/10 border-primary cursor-pointer active:scale-95 transition-transform"
            onClick={() => navigate("/self-assessment")}>
            <CardContent className="p-4 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="font-semibold text-foreground mb-1">Complete Your Self-Assessment</p>
              <p className="text-xs text-muted-foreground mb-3">
                Get your personalized rating, badge, and custom training program
              </p>
              <Button className="w-full">Start Assessment</Button>
            </CardContent>
          </Card>
        )}

        {/* Profile Quick Info */}
        {profile && <Card className="bg-card border-border shadow-sm cursor-pointer active:scale-95 transition-transform"
          onClick={() => navigate("/edit-profile")}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Player</p>
                    <p className="font-bold text-base text-foreground">@{profile.username}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {profile.skill_level && <Badge variant="secondary" className="text-xs font-semibold">
                        {profile.skill_level}
                      </Badge>}
                    {profile.city && <Badge variant="outline" className="text-xs font-medium">
                        <MapPin className="h-3 w-3 mr-1" />
                        {profile.city}
                      </Badge>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Tap to edit profile</p>
              </div>
            </CardContent>
          </Card>}
      </div>
      </main>

      <FloatingActionButton href="/start-game" />
      <BottomNav />
    </div>;
}