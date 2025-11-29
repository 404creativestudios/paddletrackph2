import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Trophy, Target, TrendingUp, Calendar } from "lucide-react";

interface Player {
  id: string;
  display_name: string;
  username: string | null;
  team: string | null;
  player_notes: string | null;
  is_favorited: boolean;
  is_guest: boolean;
}

interface GameHistoryItem {
  id: string;
  date: string;
  location_name: string;
  match_format: string;
  match_tag: string | null;
  score_team_a: string | null;
  score_team_b: string | null;
  team: string | null;
  result: string;
  notes: string | null;
  players: Player[];
  my_player_id: string;
}

interface PartnerStats {
  user_id: string;
  display_name: string;
  username: string | null;
  games_played: number;
  is_favorited: boolean;
  is_guest: boolean;
}

interface Stats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export default function GameHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalGames: 0, wins: 0, losses: 0, draws: 0, winRate: 0 });
  const [partners, setPartners] = useState<PartnerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPartners, setShowPartners] = useState(false);
  const [editingNotes, setEditingNotes] = useState<{ gameId: string; playerId: string } | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (user) {
      loadHistory();
      loadPartnerHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("lobby_players")
        .select(`
          id,
          team,
          result,
          player_notes,
          practice_lobbies!inner(
            id,
            date,
            location_name,
            match_format,
            match_tag,
            score_team_a,
            score_team_b,
            notes,
            status
          )
        `)
        .eq("user_id", user?.id)
        .eq("practice_lobbies.status", "completed")
        .order("practice_lobbies(date)", { ascending: false });

      if (error) throw error;

      // Get favorites
      const { data: favoritesData } = await supabase
        .from("player_favorites")
        .select("favorite_user_id")
        .eq("user_id", user?.id);

      const favoriteIds = new Set(favoritesData?.map((f) => f.favorite_user_id) || []);

      // Get all players for each game
      const gamesWithPlayers = await Promise.all(
        data.map(async (item: any) => {
          const { data: playersData } = await supabase
            .from("lobby_players")
            .select(`
              id,
              team,
              player_notes,
              user_id,
              guest_player_id,
              profiles (
                id,
                display_name,
                username
              ),
              guest_players (
                id,
                name
              )
            `)
            .eq("lobby_id", item.practice_lobbies.id);

          const players: Player[] = (playersData || []).map((p: any) => {
            const isGuest = !!p.guest_player_id;
            return {
              id: isGuest ? p.guest_players.id : p.user_id,
              display_name: isGuest ? p.guest_players.name : p.profiles.display_name,
              username: isGuest ? null : p.profiles.username,
              team: p.team,
              player_notes: p.player_notes,
              is_favorited: isGuest ? false : favoriteIds.has(p.user_id),
              is_guest: isGuest
            };
          });

          return {
            id: item.practice_lobbies.id,
            date: item.practice_lobbies.date,
            location_name: item.practice_lobbies.location_name,
            match_format: item.practice_lobbies.match_format,
            match_tag: item.practice_lobbies.match_tag,
            score_team_a: item.practice_lobbies.score_team_a,
            score_team_b: item.practice_lobbies.score_team_b,
            notes: item.practice_lobbies.notes,
            team: item.team,
            result: item.result,
            players,
            my_player_id: item.id,
          };
        })
      );

      setGames(gamesWithPlayers);

      // Calculate stats
      const totalGames = gamesWithPlayers.length;
      const wins = gamesWithPlayers.filter((g) => g.result === "win").length;
      const losses = gamesWithPlayers.filter((g) => g.result === "loss").length;
      const draws = gamesWithPlayers.filter((g) => g.result === "draw").length;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      setStats({ totalGames, wins, losses, draws, winRate });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerHistory = async () => {
    try {
      // Get all games the user played
      const { data: myGames } = await supabase
        .from("lobby_players")
        .select("lobby_id")
        .eq("user_id", user?.id);

      if (!myGames || myGames.length === 0) {
        setPartners([]);
        return;
      }

      const lobbyIds = myGames.map((g) => g.lobby_id);

      // Get all players from these games
      const { data: allPlayers } = await supabase
        .from("lobby_players")
        .select(`
          user_id,
          guest_player_id,
          profiles (
            id,
            display_name,
            username
          ),
          guest_players (
            id,
            name
          )
        `)
        .in("lobby_id", lobbyIds)
        .neq("user_id", user?.id);

      // Get favorites
      const { data: favoritesData } = await supabase
        .from("player_favorites")
        .select("favorite_user_id")
        .eq("user_id", user?.id);

      const favoriteIds = new Set(favoritesData?.map((f) => f.favorite_user_id) || []);

      // Count games per partner (including guests)
      const partnerCounts: { [key: string]: { count: number; display_name: string; username: string | null; is_guest: boolean } } = {};

      allPlayers?.forEach((p: any) => {
        const isGuest = !!p.guest_player_id;
        const partnerId = isGuest ? p.guest_players.id : p.user_id;
        if (!partnerCounts[partnerId]) {
          partnerCounts[partnerId] = {
            count: 0,
            display_name: isGuest ? p.guest_players.name : p.profiles.display_name,
            username: isGuest ? null : p.profiles.username,
            is_guest: isGuest
          };
        }
        partnerCounts[partnerId].count++;
      });

      const partnersList: PartnerStats[] = Object.entries(partnerCounts)
        .map(([userId, data]) => ({
          user_id: userId,
          display_name: data.display_name,
          username: data.username,
          games_played: data.count,
          is_favorited: data.is_guest ? false : favoriteIds.has(userId),
          is_guest: data.is_guest
        }))
        .sort((a, b) => {
          if (a.is_favorited !== b.is_favorited) return a.is_favorited ? -1 : 1;
          return b.games_played - a.games_played;
        });

      setPartners(partnersList);
    } catch (error: any) {
      console.error("Failed to load partner history:", error);
    }
  };

  const toggleFavorite = async (userId: string, isFavorited: boolean) => {
    try {
      if (isFavorited) {
        await supabase
          .from("player_favorites")
          .delete()
          .eq("user_id", user?.id)
          .eq("favorite_user_id", userId);
      } else {
        await supabase
          .from("player_favorites")
          .insert({ user_id: user?.id, favorite_user_id: userId });
      }

      // Refresh both lists
      loadHistory();
      loadPartnerHistory();

      toast({
        title: isFavorited ? "Removed from favorites" : "Added to favorites",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const savePlayerNotes = async (gameId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from("lobby_players")
        .update({ player_notes: noteText })
        .eq("id", playerId);

      if (error) throw error;

      toast({
        title: "Notes saved",
      });

      setEditingNotes(null);
      setNoteText("");
      loadHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Game History
          </h1>
          <p className="text-muted-foreground">Your completed pickleball games</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{stats.totalGames}</p>
              <p className="text-sm text-muted-foreground">Total Games</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-3xl font-bold">{stats.wins}</p>
              <p className="text-sm text-muted-foreground">Wins</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-3xl font-bold">{stats.losses}</p>
              <p className="text-sm text-muted-foreground">Losses</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-3xl font-bold">{stats.winRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Partner History Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowPartners(!showPartners)}
          className="w-full"
        >
          {showPartners ? "View Game History" : "View Partner History"}
        </Button>

        {/* Partner History */}
        {showPartners ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Partner History
              </h2>
              <p className="text-muted-foreground">People you've played with before</p>
            </div>

            {partners.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No partners yet</p>
                </CardContent>
              </Card>
            ) : (
              partners.map((partner) => (
                <Card key={partner.user_id} className="shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{partner.display_name}</p>
                          {partner.is_guest && (
                            <Badge variant="secondary" className="text-xs">Guest</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {partner.username ? `@${partner.username}` : '(no username - guest)'}
                        </p>
                        <p className="text-sm mt-1">
                          <span className="font-semibold">{partner.games_played}</span>{" "}
                          {partner.games_played === 1 ? "game" : "games"} together
                        </p>
                      </div>
                      {!partner.is_guest && (
                        <Button
                          variant={partner.is_favorited ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleFavorite(partner.user_id, partner.is_favorited)}
                        >
                          {partner.is_favorited ? "★ Favorited" : "☆ Favorite"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          /* Games List */
          <div className="space-y-4">
            {games.length === 0 ? (
              <Card className="shadow-md">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">No completed games yet</p>
                  <Button onClick={() => navigate("/start-game")} className="mt-4">
                    Start Your First Game
                  </Button>
                </CardContent>
              </Card>
            ) : (
              games.map((game) => (
                <Card key={game.id} className="shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{game.location_name}</CardTitle>
                      <Badge
                        variant={
                          game.result === "win"
                            ? "default"
                            : game.result === "loss"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {game.result.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(game.date).toLocaleDateString()} at{" "}
                        {new Date(game.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{game.match_format}</Badge>
                      {game.match_tag && <Badge variant="outline">{game.match_tag}</Badge>}
                      {game.team && (
                        <Badge variant="secondary" className={game.team === "A" ? "bg-success/20" : "bg-accent/20"}>
                          Team {game.team}
                        </Badge>
                      )}
                    </div>

                    {/* Score */}
                    {game.score_team_a && game.score_team_b && (
                      <div className="text-center py-2 bg-muted rounded-md">
                        <span className="text-lg font-bold">
                          Team A: {game.score_team_a} - Team B: {game.score_team_b}
                        </span>
                      </div>
                    )}

                    {/* Players */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Players:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {game.players
                          .filter((p) => p.team === "A")
                          .map((player) => (
                            <div
                              key={player.id}
                              className="text-sm p-2 bg-success/10 rounded flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-1">
                                  <p className="font-medium">{player.display_name}</p>
                                  {player.is_guest && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Guest</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {player.username ? `@${player.username}` : '(guest)'}
                                </p>
                              </div>
                              {!player.is_guest && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleFavorite(player.id, player.is_favorited)}
                                >
                                  {player.is_favorited ? "★" : "☆"}
                                </Button>
                              )}
                            </div>
                          ))}
                        {game.players
                          .filter((p) => p.team === "B")
                          .map((player) => (
                            <div
                              key={player.id}
                              className="text-sm p-2 bg-accent/10 rounded flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-1">
                                  <p className="font-medium">{player.display_name}</p>
                                  {player.is_guest && (
                                    <Badge variant="secondary" className="text-[10px] px-1 py-0">Guest</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {player.username ? `@${player.username}` : '(guest)'}
                                </p>
                              </div>
                              {!player.is_guest && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleFavorite(player.id, player.is_favorited)}
                                >
                                  {player.is_favorited ? "★" : "☆"}
                                </Button>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Game Notes */}
                    {game.notes && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Game Notes:</p>
                        <p className="text-sm">{game.notes}</p>
                      </div>
                    )}

                    {/* My Notes */}
                    <div className="p-3 bg-primary/5 rounded-md space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">My Journal:</p>
                      {editingNotes?.gameId === game.id && editingNotes?.playerId === game.my_player_id ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full min-h-[80px] p-2 text-sm rounded border"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="What did you learn? How did you feel? Any insights?"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => savePlayerNotes(game.id, game.my_player_id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNotes(null);
                                setNoteText("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {game.players.find((p) => p.id === user?.id)?.player_notes ? (
                            <p className="text-sm whitespace-pre-wrap">
                              {game.players.find((p) => p.id === user?.id)?.player_notes}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No notes yet</p>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2"
                            onClick={() => {
                              setEditingNotes({ gameId: game.id, playerId: game.my_player_id });
                              setNoteText(
                                game.players.find((p) => p.id === user?.id)?.player_notes || ""
                              );
                            }}
                          >
                            {game.players.find((p) => p.id === user?.id)?.player_notes
                              ? "Edit Notes"
                              : "Add Notes"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
