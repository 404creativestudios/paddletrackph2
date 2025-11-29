import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, ArrowLeft, UserPlus, CheckCircle2, Trophy, BookOpen, 
  MapPin, Calendar, Clock, Tag, Users, Target, Zap, CalendarPlus
} from "lucide-react";
import { format } from "date-fns";
import QuickAddPlayer from "@/components/QuickAddPlayer";

interface LobbyData {
  id: string;
  date: string;
  location_name: string;
  match_format: string;
  match_tag: string | null;
  notes: string | null;
  status: string;
  score_team_a: string | null;
  score_team_b: string | null;
  winning_team: string | null;
  created_by_user_id: string;
  is_scheduled: boolean;
  scheduled_datetime: string | null;
}

interface PlayerData {
  id: string;
  user_id: string | null;
  guest_player_id: string | null;
  team: string | null;
  is_creator: boolean;
  has_confirmed: boolean;
  profiles: {
    username: string;
    display_name: string;
  } | null;
  guest_players: {
    name: string;
    skill_level: string | null;
    city: string | null;
  } | null;
}

export default function LobbyDetail() {
  const { lobbyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduledBanner, setShowScheduledBanner] = useState(false);
  const [showStartButton, setShowStartButton] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("B");
  const [scoreTeamA, setScoreTeamA] = useState("");
  const [scoreTeamB, setScoreTeamB] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [playerNotes, setPlayerNotes] = useState("");

  useEffect(() => {
    if (lobbyId) {
      loadLobbyData();
    }
  }, [lobbyId]);

  const loadLobbyData = async () => {
    try {
      const { data: lobbyData, error: lobbyError } = await supabase
        .from("practice_lobbies")
        .select("*")
        .eq("id", lobbyId)
        .single();

      if (lobbyError) throw lobbyError;

      setLobby(lobbyData);
      setScoreTeamA(lobbyData.score_team_a || "");
      setScoreTeamB(lobbyData.score_team_b || "");

      if (lobbyData.is_scheduled && lobbyData.scheduled_datetime) {
        setShowScheduledBanner(true);
        const scheduledTime = new Date(lobbyData.scheduled_datetime).getTime();
        const currentTime = new Date().getTime();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (currentTime >= scheduledTime - thirtyMinutes && currentTime <= scheduledTime) {
          setShowStartButton(true);
        }

        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (scheduledTime - currentTime <= twentyFourHours && scheduledTime > currentTime) {
          toast({
            title: "Game Reminder",
            description: "This game is happening soon. Make sure your team is ready.",
          });
        }
      }

      const { data: playersData, error: playersError} = await supabase
        .from("lobby_players")
        .select(`
          *,
          profiles (
            username,
            display_name
          ),
          guest_players (
            name,
            skill_level,
            city
          )
        `)
        .eq("lobby_id", lobbyId);

      if (playersError) throw playersError;

      setPlayers(playersData || []);

      const currentPlayer = playersData?.find((p) => p.user_id === user?.id);
      if (currentPlayer) {
        setPlayerNotes(currentPlayer.player_notes || "");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load lobby",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRegisteredPlayer = async (user: { id: string; username: string; display_name: string }) => {
    setSubmitting(true);

    try {
      const assignedTeam = lobby?.match_format === "Singles" ? "B" : selectedTeam;

      const { error } = await supabase.from("lobby_players").insert({
        lobby_id: lobbyId,
        user_id: user.id,
        guest_player_id: null,
        team: assignedTeam,
        is_creator: false,
        has_confirmed: false,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${user.display_name} added to Team ${assignedTeam}`,
      });

      loadLobbyData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add player",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddGuestPlayer = async (guestData: { name: string; skill_level?: string; city?: string }) => {
    setSubmitting(true);

    try {
      // First create the guest player
      const { data: guestPlayer, error: guestError } = await supabase
        .from("guest_players")
        .insert({
          owner_user_id: user?.id,
          name: guestData.name,
          skill_level: guestData.skill_level,
          city: guestData.city,
        })
        .select()
        .single();

      if (guestError) throw guestError;

      // Then add them to the lobby
      const assignedTeam = lobby?.match_format === "Singles" ? "B" : selectedTeam;

      const { error: lobbyError } = await supabase.from("lobby_players").insert({
        lobby_id: lobbyId,
        user_id: null,
        guest_player_id: guestPlayer.id,
        team: assignedTeam,
        is_creator: false,
        has_confirmed: false,
      });

      if (lobbyError) throw lobbyError;

      toast({
        title: "Success!",
        description: `${guestData.name} (Guest) added to Team ${assignedTeam}`,
      });

      loadLobbyData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add guest player",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveScore = async () => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("lobby_players")
        .update({ has_confirmed: true })
        .eq("lobby_id", lobbyId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Score Approved!",
        description: "You've confirmed the score is accurate",
      });

      loadLobbyData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve score",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveScore = async () => {
    setSubmitting(true);

    try {
      // Auto-determine winning team based on scores
      let determinedWinner = null;
      if (scoreTeamA && scoreTeamB) {
        const scoreA = parseInt(scoreTeamA);
        const scoreB = parseInt(scoreTeamB);
        
        if (scoreA > scoreB) {
          determinedWinner = "A";
        } else if (scoreB > scoreA) {
          determinedWinner = "B";
        } else {
          determinedWinner = "Draw";
        }
      }

      const { error } = await supabase
        .from("practice_lobbies")
        .update({
          score_team_a: scoreTeamA || null,
          score_team_b: scoreTeamB || null,
          winning_team: determinedWinner,
        })
        .eq("id", lobbyId);

      if (error) throw error;

      // Automatically approve creator's confirmation
      const { error: confirmError } = await supabase
        .from("lobby_players")
        .update({ has_confirmed: true })
        .eq("lobby_id", lobbyId)
        .eq("user_id", user?.id)
        .eq("is_creator", true);

      if (confirmError) throw confirmError;

      toast({
        title: "Success!",
        description: "Score saved",
      });

      loadLobbyData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save score",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePlayerNotes = async () => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("lobby_players")
        .update({ player_notes: playerNotes })
        .eq("lobby_id", lobbyId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your notes saved",
      });

      loadLobbyData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save notes",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartGameNow = async () => {
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("practice_lobbies")
        .update({ is_scheduled: false })
        .eq("id", lobbyId);

      if (error) throw error;

      toast({
        title: "Game Started",
        description: "The scheduled game is now active",
      });

      loadLobbyData();
      setShowScheduledBanner(false);
      setShowStartButton(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start game",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteGame = async () => {
    setSubmitting(true);

    try {
      // Only check for approvals if this is a Tournament
      const isTournament = lobby.match_tag === "Tournament";
      
      if (isTournament) {
        // For tournaments, check that all registered (non-guest) players who aren't the creator have approved
        const registeredPlayers = players.filter((p) => p.user_id !== null);
        const unconfirmedPlayers = registeredPlayers.filter((p) => !p.has_confirmed && !p.is_creator);
        
        if (unconfirmedPlayers.length > 0) {
          toast({
            title: "Cannot Complete",
            description: `Tournament requires all players to approve. Waiting for ${unconfirmedPlayers.length} player(s) to approve the score`,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      if (lobby.winning_team && lobby.winning_team !== "Draw") {
        for (const player of players) {
          let result = "none";
          if (player.team === lobby.winning_team) {
            result = "win";
          } else if (player.team) {
            result = "loss";
          }

          await supabase
            .from("lobby_players")
            .update({ result })
            .eq("id", player.id);
        }
      } else if (lobby.winning_team === "Draw") {
        for (const player of players) {
          await supabase
            .from("lobby_players")
            .update({ result: "draw" })
            .eq("id", player.id);
        }
      }

      const { error } = await supabase
        .from("practice_lobbies")
        .update({ status: "completed" })
        .eq("id", lobbyId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Game completed successfully",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete game",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const generateGoogleCalendarUrl = () => {
    if (!lobby?.scheduled_datetime) return "";

    // Generate event title based on match format
    let eventTitle = "";
    if (lobby.match_format === "Singles") {
      const playerA = teamAPlayers[0];
      const playerB = teamBPlayers[0];
      const nameA = playerA?.profiles.display_name || playerA?.profiles.username || "Player A";
      const nameB = playerB?.profiles.display_name || playerB?.profiles.username || "Player B";
      eventTitle = `Pickleball Game: ${nameA} vs ${nameB}`;
    } else {
      const creator = players.find((p) => p.is_creator);
      const creatorName = creator?.profiles.display_name || creator?.profiles.username || "Organizer";
      eventTitle = `Pickleball Game with ${creatorName} + Others`;
    }

    // Format dates for Google Calendar in Philippine Time (UTC+8)
    const startDate = new Date(lobby.scheduled_datetime);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    const formatGoogleDate = (date: Date) => {
      // Convert to Philippine time by adding 8 hours
      const phDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      return format(phDate, "yyyyMMdd'T'HHmmss");
    };

    const startFormatted = formatGoogleDate(startDate);
    const endFormatted = formatGoogleDate(endDate);

    // Build description
    const creator = players.find((p) => p.is_creator);
    const creatorName = creator?.profiles.display_name || creator?.profiles.username || "Unknown";
    const description = `Game created on PaddleTrackPH. Match Format: ${lobby.match_format} | Creator: ${creatorName}`;

    // Encode parameters
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventTitle,
      dates: `${startFormatted}/${endFormatted}`,
      details: description,
      location: lobby.location_name,
      ctz: "Asia/Manila",
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const handleAddToCalendar = () => {
    const url = generateGoogleCalendarUrl();
    if (url) {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Card className="p-6">
          <p className="text-muted-foreground">Lobby not found</p>
        </Card>
      </div>
    );
  }

  const isCreator = lobby.created_by_user_id === user?.id;
  const currentUserPlayer = players.find((p) => p.user_id === user?.id);
  const hasConfirmed = currentUserPlayer?.has_confirmed || false;

  const teamAPlayers = players.filter((p) => p.team === "A");
  const teamBPlayers = players.filter((p) => p.team === "B");

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 hover-lift">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        {/* Scheduled Game Banner */}
        {showScheduledBanner && (
          <Card className="bg-accent/10 border-accent animate-scale-in">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                <p className="text-foreground font-semibold">This is a scheduled game</p>
              </div>
              {showStartButton && (
                <Button onClick={handleStartGameNow} className="w-full bg-gradient-primary hover:shadow-glow" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Zap className="mr-2 h-4 w-4" />
                  Start Game Now
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Game Details */}
        <Card className="shadow-lg border-none bg-gradient-card animate-slide-up">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl font-bold">Game Details</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge className={lobby.status === "completed" ? "bg-success" : "bg-primary"}>
                    {lobby.status}
                  </Badge>
                  <Badge variant="secondary">{lobby.match_format}</Badge>
                  {lobby.match_tag && <Badge variant="outline">{lobby.match_tag}</Badge>}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-semibold text-foreground">{lobby.location_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-semibold text-foreground">
                    {new Date(lobby.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                    at {new Date(lobby.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
            {lobby.scheduled_datetime && currentUserPlayer && (
              <Button 
                onClick={handleAddToCalendar}
                variant="outline"
                className="w-full h-11 border-primary/30 hover:bg-primary/5 hover:border-primary transition-all"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Add to Google Calendar
              </Button>
            )}
            {lobby.notes && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-foreground">{lobby.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Players */}
        <Card className="shadow-lg border-none bg-gradient-card animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Players
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Team A */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <h3 className="font-semibold text-success">Team A</h3>
                </div>
                <div className="space-y-2">
                  {teamAPlayers.map((player) => {
                    const isGuest = !!player.guest_player_id;
                    const displayName = isGuest ? player.guest_players?.name : player.profiles?.display_name;
                    const username = isGuest ? null : player.profiles?.username;
                    const skillLevel = isGuest ? player.guest_players?.skill_level : null;

                    return (
                      <div key={player.id} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{displayName}</p>
                            {isGuest && <Badge variant="outline" className="text-xs">Guest</Badge>}
                          </div>
                          {username && <p className="text-sm text-muted-foreground">@{username}</p>}
                          {isGuest && skillLevel && <p className="text-xs text-muted-foreground">{skillLevel}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {player.is_creator && <Badge variant="secondary" className="text-xs">Organizer</Badge>}
                          {!isGuest && lobby.match_tag === "Tournament" && player.has_confirmed ? (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="h-5 w-5 text-success" />
                              <span className="text-xs text-success font-medium">Approved</span>
                            </div>
                          ) : !isGuest && lobby.match_tag === "Tournament" && lobby.score_team_a && lobby.score_team_b ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Pending</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Team B */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-accent"></div>
                  <h3 className="font-semibold text-accent">Team B</h3>
                </div>
                <div className="space-y-2">
                  {teamBPlayers.length > 0 ? (
                    teamBPlayers.map((player) => {
                      const isGuest = !!player.guest_player_id;
                      const displayName = isGuest ? player.guest_players?.name : player.profiles?.display_name;
                      const username = isGuest ? null : player.profiles?.username;
                      const skillLevel = isGuest ? player.guest_players?.skill_level : null;

                      return (
                        <div key={player.id} className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{displayName}</p>
                              {isGuest && <Badge variant="outline" className="text-xs">Guest</Badge>}
                            </div>
                            {username && <p className="text-sm text-muted-foreground">@{username}</p>}
                            {isGuest && skillLevel && <p className="text-xs text-muted-foreground">{skillLevel}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {player.is_creator && <Badge variant="secondary" className="text-xs">Organizer</Badge>}
                            {!isGuest && lobby.match_tag === "Tournament" && player.has_confirmed ? (
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-5 w-5 text-accent" />
                                <span className="text-xs text-accent font-medium">Approved</span>
                              </div>
                            ) : !isGuest && lobby.match_tag === "Tournament" && lobby.score_team_a && lobby.score_team_b ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Pending</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground text-sm p-3 bg-muted/30 rounded-lg">No players yet</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Player */}
        {lobby.status === "pending" && (
          <Card className="shadow-lg border-none bg-gradient-card animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add Player
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lobby.match_format !== "Singles" && (
                <div className="space-y-2">
                  <Label htmlFor="team" className="text-sm font-medium">Team</Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Team A</SelectItem>
                      <SelectItem value="B">Team B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <QuickAddPlayer
                onAddRegisteredPlayer={handleAddRegisteredPlayer}
                onAddGuestPlayer={handleAddGuestPlayer}
                existingPlayerIds={players.map(p => p.user_id).filter(Boolean) as string[]}
                teamContext={lobby.match_format === "Singles" ? "B" : (selectedTeam as "A" | "B")}
                matchFormat={lobby.match_format}
                teamACount={teamAPlayers.length}
                teamBCount={teamBPlayers.length}
                selectedTeam={selectedTeam as "A" | "B"}
              />
            </CardContent>
          </Card>
        )}

        {/* Approve Score - Only for Tournaments and non-guest registered players */}
        {!hasConfirmed && !isCreator && lobby.status === "pending" && currentUserPlayer && lobby.score_team_a && lobby.score_team_b && lobby.match_tag === "Tournament" && currentUserPlayer.user_id !== null && (
          <Card className="shadow-lg border-primary/30 bg-gradient-card animate-scale-in">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-primary" />
                <p className="font-semibold text-foreground">Tournament Score Approval</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This is a tournament match. Please review the score above and approve if accurate.
              </p>
              <Button
                onClick={handleApproveScore}
                disabled={submitting}
                className="w-full h-11 bg-gradient-primary hover:shadow-glow transition-all font-semibold"
              >
                {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Approve Score
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Score Section */}
        {lobby.status === "pending" && (
          <Card className="shadow-lg border-none bg-gradient-card animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Score
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCreator ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scoreTeamA" className="text-sm font-medium">Team A Score</Label>
                      <Input
                        id="scoreTeamA"
                        type="number"
                        placeholder="0"
                        value={scoreTeamA}
                        onChange={(e) => setScoreTeamA(e.target.value)}
                        className="h-11 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scoreTeamB" className="text-sm font-medium">Team B Score</Label>
                      <Input
                        id="scoreTeamB"
                        type="number"
                        placeholder="0"
                        value={scoreTeamB}
                        onChange={(e) => setScoreTeamB(e.target.value)}
                        className="h-11 text-base"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    The winning team will be automatically determined based on the scores
                  </p>

                  <Button onClick={handleSaveScore} disabled={submitting} className="w-full h-11 bg-gradient-primary hover:shadow-glow transition-all">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Target className="mr-2 h-4 w-4" />
                    Save Score
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  {lobby.score_team_a && lobby.score_team_b ? (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Team A Score</p>
                          <p className="text-3xl font-bold text-success">{lobby.score_team_a}</p>
                        </div>
                        <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-1">Team B Score</p>
                          <p className="text-3xl font-bold text-accent">{lobby.score_team_b}</p>
                        </div>
                      </div>
                      {lobby.winning_team && (
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                          <p className="text-sm text-muted-foreground mb-1">Winner</p>
                          <p className="text-xl font-bold text-primary">
                            {lobby.winning_team === "Draw" ? "Draw" : `Team ${lobby.winning_team}`}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-6 bg-muted/30 rounded-lg text-center">
                      <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">The game organizer will enter the score when the match is complete.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* My Journal */}
        <Card className="shadow-lg border-none bg-gradient-card animate-slide-up" style={{ animationDelay: "0.4s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              My Journal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Add your personal notes about this game..."
              value={playerNotes}
              onChange={(e) => setPlayerNotes(e.target.value)}
              rows={5}
              className="text-base resize-none"
            />
            <Button onClick={handleSavePlayerNotes} disabled={submitting} className="w-full h-11 bg-gradient-primary hover:shadow-glow transition-all">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <BookOpen className="mr-2 h-4 w-4" />
              Save Notes
            </Button>
          </CardContent>
        </Card>

        {/* Complete Game */}
        {lobby.status === "pending" && isCreator && (
          <Button
            onClick={handleCompleteGame}
            disabled={submitting}
            className="w-full h-12 bg-success hover:bg-success/90 hover:shadow-glow transition-all text-base font-semibold animate-scale-in"
          >
            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            <Trophy className="mr-2 h-5 w-5" />
            Complete Game
          </Button>
        )}
      </div>
    </div>
  );
}
