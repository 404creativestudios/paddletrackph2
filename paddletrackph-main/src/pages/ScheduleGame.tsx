import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, X, Calendar, MapPin, Tag, FileText, UserPlus, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import QuickAddPlayer from "@/components/QuickAddPlayer";

interface SelectedPlayer {
  user_id: string | null;
  guest_player_id: string | null;
  username: string | null;
  display_name: string;
  team: string;
  is_guest: boolean;
  guest_name?: string;
  guest_skill_level?: string;
  guest_city?: string;
}

export default function ScheduleGame() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    scheduledDatetime: "",
    locationName: "",
    matchFormat: "",
    matchTag: "",
    notes: "",
  });
  
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("B");

  const handleAddRegisteredPlayer = (profile: { id: string; username: string; display_name: string }) => {
    if (selectedPlayers.some((p) => p.user_id === profile.id)) {
      toast({
        title: "Already Added",
        description: "This player is already in the list",
        variant: "destructive",
      });
      return;
    }

    const assignedTeam = formData.matchFormat === "Singles" ? "B" : selectedTeam;

    setSelectedPlayers([
      ...selectedPlayers,
      {
        user_id: profile.id,
        guest_player_id: null,
        username: profile.username,
        display_name: profile.display_name,
        team: assignedTeam,
        is_guest: false,
      },
    ]);
  };

  const handleAddGuestPlayer = (guestData: { name: string; skill_level?: string; city?: string }) => {
    const assignedTeam = formData.matchFormat === "Singles" ? "B" : selectedTeam;
    const tempId = `guest_${Date.now()}`;

    setSelectedPlayers([
      ...selectedPlayers,
      {
        user_id: null,
        guest_player_id: tempId,
        username: null,
        display_name: guestData.name,
        team: assignedTeam,
        is_guest: true,
        guest_name: guestData.name,
        guest_skill_level: guestData.skill_level,
        guest_city: guestData.city,
      },
    ]);

    toast({
      title: "Guest Player Added",
      description: `${guestData.name} added to Team ${assignedTeam}`,
    });
  };

  const handleRemovePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter((p) => 
      p.is_guest ? p.guest_player_id !== playerId : p.user_id !== playerId
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.scheduledDatetime || !formData.locationName || !formData.matchFormat) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Convert datetime-local value to Philippine Time (UTC+8) ISO string
      const localDate = new Date(formData.scheduledDatetime);
      const phDate = new Date(localDate.getTime() - (8 * 60 * 60 * 1000));
      const dateIso = phDate.toISOString();

      const { data: lobby, error: lobbyError } = await supabase
        .from("practice_lobbies")
        .insert({
          created_by_user_id: user?.id,
          date: dateIso,
          scheduled_datetime: dateIso,
          is_scheduled: true,
          location_name: formData.locationName,
          match_format: formData.matchFormat,
          match_tag: formData.matchTag || null,
          notes: formData.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (lobbyError) throw lobbyError;

      const { error: creatorError } = await supabase.from("lobby_players").insert({
        lobby_id: lobby.id,
        user_id: user?.id,
        team: "A",
        is_creator: true,
        has_confirmed: true,
      });

      if (creatorError) throw creatorError;

      // Insert guest players first and get their IDs
      const guestPlayers = selectedPlayers.filter(p => p.is_guest);
      const registeredPlayers = selectedPlayers.filter(p => !p.is_guest);
      
      const guestPlayerIds: Map<string, string> = new Map();

      for (const guestPlayer of guestPlayers) {
        const { data: guestData, error: guestError } = await supabase
          .from("guest_players")
          .insert({
            owner_user_id: user?.id,
            name: guestPlayer.guest_name!,
            skill_level: guestPlayer.guest_skill_level,
            city: guestPlayer.guest_city,
          })
          .select()
          .single();

        if (guestError) throw guestError;
        guestPlayerIds.set(guestPlayer.guest_player_id!, guestData.id);
      }

      // Insert all lobby players
      const playersToInsert = [
        // Registered players
        ...registeredPlayers.map((player) => ({
          lobby_id: lobby.id,
          user_id: player.user_id,
          guest_player_id: null,
          team: player.team,
          is_creator: false,
          has_confirmed: false,
        })),
        // Guest players
        ...guestPlayers.map((player) => ({
          lobby_id: lobby.id,
          user_id: null,
          guest_player_id: guestPlayerIds.get(player.guest_player_id!),
          team: player.team,
          is_creator: false,
          has_confirmed: false,
        })),
      ];

      if (playersToInsert.length > 0) {
        const { error: playersError } = await supabase
          .from("lobby_players")
          .insert(playersToInsert);

        if (playersError) throw playersError;
      }

      toast({
        title: "Success!",
        description: "Game scheduled successfully",
      });

      navigate(`/lobby/${lobby.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule game",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 hover-lift">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="shadow-lg border-none bg-gradient-card animate-scale-in">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mx-auto mb-4">
              <Clock className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-3xl font-bold">Schedule a Game</CardTitle>
            <CardDescription className="text-base">
              Plan a future practice session with your team
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="scheduledDatetime" className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Scheduled Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="scheduledDatetime"
                  type="datetime-local"
                  value={formData.scheduledDatetime}
                  onChange={(e) => setFormData({ ...formData, scheduledDatetime: e.target.value })}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Venue <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="location"
                  placeholder="Name of Gym, Court or Facility"
                  value={formData.locationName}
                  onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matchFormat" className="text-base font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Match Format <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.matchFormat}
                  onValueChange={(value) => setFormData({ ...formData, matchFormat: value })}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Singles">Singles</SelectItem>
                    <SelectItem value="Doubles">Doubles</SelectItem>
                    <SelectItem value="Mixed Doubles">Mixed Doubles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="matchTag" className="text-base font-semibold flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Match Tag
                </Label>
                <Select
                  value={formData.matchTag}
                  onValueChange={(value) => setFormData({ ...formData, matchTag: value })}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select tag (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Friendly">Friendly</SelectItem>
                    <SelectItem value="Practice">Practice</SelectItem>
                    <SelectItem value="Open Play">Open Play</SelectItem>
                    <SelectItem value="Tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this game..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="text-base resize-none"
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Add Players
                </Label>
                
                {formData.matchFormat !== "Singles" && (
                  <div className="space-y-2">
                    <Label htmlFor="team" className="text-sm">Team</Label>
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
                  existingPlayerIds={selectedPlayers.filter(p => !p.is_guest).map(p => p.user_id!)}
                  teamContext={formData.matchFormat === "Singles" ? "B" : (selectedTeam as "A" | "B")}
                  matchFormat={formData.matchFormat}
                  teamACount={selectedPlayers.filter(p => p.team === "A").length}
                  teamBCount={selectedPlayers.filter(p => p.team === "B").length}
                  selectedTeam={selectedTeam as "A" | "B"}
                />

                {selectedPlayers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Selected Players</Label>
                    <div className="space-y-2">
                      {selectedPlayers.map((player) => {
                        const playerId = player.is_guest ? player.guest_player_id! : player.user_id!;
                        
                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">
                                  {player.is_guest ? player.guest_name : player.username}
                                </span>
                                {player.is_guest && <Badge variant="outline" className="text-xs">Guest</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {player.display_name}
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Team {player.team}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePlayer(playerId)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300 mt-6"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                <Clock className="mr-2 h-5 w-5" />
                Create Schedule
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
