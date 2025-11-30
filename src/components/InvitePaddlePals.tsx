import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, MapPin, Award, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaddlePal {
  id: string;
  username: string;
  display_name: string;
  badge_name: string | null;
  city: string | null;
}

interface InvitePaddlePalsProps {
  lobbyId: string;
  currentPlayers: string[];
  onPlayerAdded?: () => void;
}

export default function InvitePaddlePals({ lobbyId, currentPlayers, onPlayerAdded }: InvitePaddlePalsProps) {
  const [pals, setPals] = useState<PaddlePal[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadPaddlePals();
  }, [user]);

  const loadPaddlePals = async () => {
    if (!user) return;

    try {
      const { data: sentConnections, error: sentError } = await supabase
        .from("paddle_pals")
        .select(`
          receiver:profiles!paddle_pals_receiver_id_fkey(
            id,
            username,
            display_name,
            badge_name,
            city
          )
        `)
        .eq("sender_id", user.id)
        .eq("status", "accepted");

      if (sentError) throw sentError;

      const { data: receivedConnections, error: receivedError } = await supabase
        .from("paddle_pals")
        .select(`
          sender:profiles!paddle_pals_sender_id_fkey(
            id,
            username,
            display_name,
            badge_name,
            city
          )
        `)
        .eq("receiver_id", user.id)
        .eq("status", "accepted");

      if (receivedError) throw receivedError;

      const allPals: PaddlePal[] = [
        ...(sentConnections?.map((c: any) => c.receiver) || []),
        ...(receivedConnections?.map((c: any) => c.sender) || []),
      ].filter((pal) => !currentPlayers.includes(pal.id));

      allPals.sort((a, b) => a.display_name.localeCompare(b.display_name));

      setPals(allPals);
    } catch (error: any) {
      console.error("Failed to load Paddle Pals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (palId: string) => {
    setInviting(palId);

    try {
      const { error } = await supabase.from("lobby_players").insert({
        lobby_id: lobbyId,
        user_id: palId,
        is_creator: false,
        has_confirmed: false,
      });

      if (error) throw error;

      toast({
        title: "Player added!",
        description: "Your Paddle Pal has been added to the lobby",
      });

      setPals(pals.filter((p) => p.id !== palId));
      onPlayerAdded?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add player",
        variant: "destructive",
      });
    } finally {
      setInviting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (pals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Paddle Pals
          </CardTitle>
          <CardDescription>No available Paddle Pals to invite</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Invite Paddle Pals
        </CardTitle>
        <CardDescription>Add your Paddle Pals to this game</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pals.map((pal) => (
          <div
            key={pal.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex-1">
              <p className="font-medium">{pal.display_name}</p>
              <p className="text-xs text-muted-foreground">@{pal.username}</p>
              <div className="flex items-center gap-2 mt-1">
                {pal.city && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {pal.city}
                  </div>
                )}
                {pal.badge_name && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    {pal.badge_name}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleInvite(pal.id)}
              disabled={inviting === pal.id}
            >
              {inviting === pal.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-3 w-3 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
