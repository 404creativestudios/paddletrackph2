import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePresence } from "@/hooks/usePresence";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  skill_level: string | null;
  city: string | null;
}

interface QuickAddPlayerProps {
  onAddRegisteredPlayer: (user: Profile) => void;
  onAddGuestPlayer: (guestData: { name: string; skill_level?: string; city?: string }) => void;
  existingPlayerIds: string[];
  teamContext?: "A" | "B";
  matchFormat: string;
  teamACount: number;
  teamBCount: number;
  selectedTeam?: "A" | "B";
}

export default function QuickAddPlayer({
  onAddRegisteredPlayer,
  onAddGuestPlayer,
  existingPlayerIds,
  teamContext,
  matchFormat,
  teamACount,
  teamBCount,
  selectedTeam
}: QuickAddPlayerProps) {
  const [mode, setMode] = useState<"search" | "guest">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const { onlineUsers } = usePresence();

  // Guest player form state
  const [guestName, setGuestName] = useState("");
  const [guestSkillLevel, setGuestSkillLevel] = useState("");
  const [guestCity, setGuestCity] = useState("");

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, skill_level, city")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(8);

      if (error) throw error;

      // Filter out players already in the lobby
      const filtered = (data || []).filter(
        (user) => !existingPlayerIds.includes(user.id)
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Search failed",
        description: "Could not search for players",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchUsers(value);
  };

  const handleAddRegisteredPlayerClick = (user: Profile) => {
    handleAddPlayer(() => {
      onAddRegisteredPlayer(user);
      setSearchQuery("");
      setSearchResults([]);
    });
  };

  const handleAddGuestPlayerClick = () => {
    if (!guestName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the guest player",
        variant: "destructive",
      });
      return;
    }

    handleAddPlayer(() => {
      onAddGuestPlayer({
        name: guestName.trim(),
        skill_level: guestSkillLevel || undefined,
        city: guestCity.trim() || undefined,
      });

      // Reset form
      setGuestName("");
      setGuestSkillLevel("");
      setGuestCity("");
      setMode("search");
    });
  };

  const isUserOnline = (userId: string) => onlineUsers.has(userId);

  // Calculate max players per team based on match format
  const maxPlayersPerTeam = matchFormat === "Singles" ? 1 : 2;
  
  // Determine which team we're adding to
  const targetTeam = matchFormat === "Singles" ? "B" : (selectedTeam || teamContext || "B");
  const currentTeamCount = targetTeam === "A" ? teamACount : teamBCount;
  const isTeamFull = currentTeamCount >= maxPlayersPerTeam;

  const handleAddPlayer = (addFn: () => void) => {
    if (isTeamFull) {
      toast({
        title: "Team Full",
        description: `Team ${targetTeam} already has ${maxPlayersPerTeam} player${maxPlayersPerTeam > 1 ? 's' : ''}`,
        variant: "destructive",
      });
      return;
    }
    addFn();
  };

  if (mode === "guest") {
    return (
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Add Guest Player</h3>
            <Badge variant="outline" className="ml-2 text-xs">
              Guest
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="guest-name" className="text-sm font-medium">
              Name *
            </Label>
            <Input
              id="guest-name"
              placeholder="Enter player name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="guest-skill" className="text-sm font-medium">
              Skill Level (optional)
            </Label>
            <select
              id="guest-skill"
              value={guestSkillLevel}
              onChange={(e) => setGuestSkillLevel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1"
            >
              <option value="">Select level...</option>
              <option value="2.0-2.5 Beginner">2.0-2.5 Beginner</option>
              <option value="3.0 Intermediate">3.0 Intermediate</option>
              <option value="3.5 Intermediate+">3.5 Intermediate+</option>
              <option value="4.0 Advanced">4.0 Advanced</option>
              <option value="4.5 Advanced+">4.5 Advanced+</option>
              <option value="5.0+ Elite">5.0+ Elite</option>
            </select>
          </div>

          <div>
            <Label htmlFor="guest-city" className="text-sm font-medium">
              City (optional)
            </Label>
            <Input
              id="guest-city"
              placeholder="Enter city"
              value={guestCity}
              onChange={(e) => setGuestCity(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAddGuestPlayerClick}
              className="flex-1"
              size="sm"
              disabled={isTeamFull}
            >
              Add to Game
            </Button>
            <Button
              onClick={() => setMode("search")}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Search mode (default)
  return (
    <div className="space-y-4">
      {isTeamFull && (
        <div className="p-3 bg-muted/50 border border-border rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Team {targetTeam} is full ({currentTeamCount}/{maxPlayersPerTeam} players)
          </p>
        </div>
      )}
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search PaddleTrack users..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {isSearching && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Searching...
        </p>
      )}

      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {user.display_name}
                  </p>
                  {isUserOnline(user.id) && (
                    <Badge variant="outline" className="text-xs">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                      Online
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                {user.skill_level && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.skill_level}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => handleAddRegisteredPlayerClick(user)}
                disabled={isTeamFull}
              >
                Add
              </Button>
            </div>
          ))}
        </div>
      )}

      {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No players found
        </p>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setMode("guest")}
        disabled={isTeamFull}
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Add guest player instead
      </Button>
    </div>
  );
}
