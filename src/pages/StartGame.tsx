import { useState, useEffect } from "react";
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
import { Loader2, ArrowLeft, Zap, MapPin, Calendar, Tag, FileText } from "lucide-react";
import { format } from "date-fns";

export default function StartGame() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previousLocations, setPreviousLocations] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Auto-set today's date in datetime-local format
  const getTodayDateTime = () => {
    const now = new Date();
    return format(now, "yyyy-MM-dd'T'HH:mm");
  };

  const [formData, setFormData] = useState({
    date: getTodayDateTime(),
    locationName: "",
    matchFormat: "",
    matchTag: "",
    notes: "",
  });

  // Fetch previous locations on mount
  useEffect(() => {
    const fetchPreviousLocations = async () => {
      try {
        const { data, error } = await supabase
          .from("practice_lobbies")
          .select("location_name")
          .eq("created_by_user_id", user?.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        // Get unique locations
        const uniqueLocations = Array.from(
          new Set(data?.map(item => item.location_name).filter(Boolean))
        ) as string[];
        
        setPreviousLocations(uniqueLocations);
      } catch (error) {
        console.error("Error fetching locations:", error);
      }
    };

    if (user?.id) {
      fetchPreviousLocations();
    }
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.locationName || !formData.matchFormat) {
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
      const localDate = new Date(formData.date);
      const phDate = new Date(localDate.getTime() - (8 * 60 * 60 * 1000));
      const dateIso = phDate.toISOString();

      const { data: lobby, error: lobbyError } = await supabase
        .from("practice_lobbies")
        .insert({
          created_by_user_id: user?.id,
          date: dateIso,
          location_name: formData.locationName,
          match_format: formData.matchFormat,
          match_tag: formData.matchTag || null,
          notes: formData.notes || null,
          status: "pending",
        })
        .select()
        .single();

      if (lobbyError) throw lobbyError;

      const { error: playerError } = await supabase.from("lobby_players").insert({
        lobby_id: lobby.id,
        user_id: user?.id,
        team: "A",
        is_creator: true,
        has_confirmed: true,
      });

      if (playerError) throw playerError;

      toast({
        title: "Success!",
        description: "Game created successfully",
      });

      navigate(`/lobby/${lobby.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create game",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 hover-lift"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="shadow-lg border-none bg-gradient-card animate-scale-in">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Quick Record a Game</CardTitle>
            <CardDescription className="text-base">
              Log a game you just played or are playing now
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="date" className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">Auto-set to today. Adjust if needed.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Venue <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="location"
                    placeholder="Name of Gym, Court or Facility"
                    value={formData.locationName}
                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                    required
                    className="h-12 text-base"
                  />
                  {showLocationSuggestions && previousLocations.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      <div className="p-2 border-b border-border">
                        <p className="text-xs text-muted-foreground font-medium">Recent Venues</p>
                      </div>
                      {previousLocations.map((location, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, locationName: location });
                            setShowLocationSuggestions(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {location}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {previousLocations.length > 0 && (
                  <p className="text-xs text-muted-foreground">Click to select from your recent venues</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="matchFormat" className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
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
                  rows={4}
                  className="text-base resize-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-primary hover:shadow-glow transition-all duration-300 mt-6"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                <Zap className="mr-2 h-5 w-5" />
                Quick Record Game
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
