import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, Target, TrendingUp, Calendar, LogOut, Zap, Clock, MapPin, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
interface Profile {
  username: string;
  display_name: string;
  skill_level: string | null;
  city: string | null;
  self_assessed_level: string | null;
  displayed_rating: number | null;
  badge_name: string | null;
  progress_percent: number | null;
  self_assessment_complete: boolean | null;
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
    return <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-full bg-gradient-hero">
      {/* App-style Top Bar */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              PaddleTrack PH 
            </h1>
            <p className="text-xs text-muted-foreground">
              Hey, {profile?.display_name?.split(' ')[0]}! 👋
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
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

        {/* Stats Dashboard */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-1">
            <Zap className="h-5 w-5 text-primary" />
            Performance
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className="active:scale-95 transition-transform bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <p className="text-3xl font-bold text-foreground mb-0.5">{stats.totalGames}</p>
                <p className="text-xs text-muted-foreground font-medium">Games</p>
              </CardContent>
            </Card>

            <Card className="active:scale-95 transition-transform bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-success/10 mb-2">
                  <Trophy className="h-5 w-5 text-success" />
                </div>
                <p className="text-3xl font-bold text-success mb-0.5">{stats.wins}</p>
                <p className="text-xs text-muted-foreground font-medium">Wins</p>
              </CardContent>
            </Card>

            <Card className="active:scale-95 transition-transform bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10 mb-2">
                  <Target className="h-5 w-5 text-destructive" />
                </div>
                <p className="text-3xl font-bold text-destructive mb-0.5">{stats.losses}</p>
                <p className="text-xs text-muted-foreground font-medium">Losses</p>
              </CardContent>
            </Card>

            <Card className="active:scale-95 transition-transform bg-card border-border shadow-sm">
              <CardContent className="p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 mb-2">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <p className="text-3xl font-bold text-accent mb-0.5">{stats.winRate}%</p>
                <p className="text-xs text-muted-foreground font-medium">Win Rate</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Scheduled Games */}
        {scheduledGames.length > 0 && <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-1">
              <Clock className="h-5 w-5 text-accent" />
              Scheduled
            </h2>
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
        {profile && <Card className="bg-card border-border shadow-sm">
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
              </div>
            </CardContent>
          </Card>}
      </div>
    </div>;
}