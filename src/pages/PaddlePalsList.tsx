import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Users, MapPin, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface PaddlePal {
  id: string;
  username: string;
  display_name: string;
  badge_name: string | null;
  city: string | null;
  status: string | null;
  status_location: string | null;
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

const STATUS_COLORS: Record<string, string> = {
  looking_partner: "bg-blue-500",
  looking_one_more: "bg-purple-500",
  hosting_open_play: "bg-green-500",
  looking_open_play: "bg-orange-500",
  looking_coach: "bg-pink-500",
  looking_court: "bg-yellow-500",
};

export default function PaddlePalsList() {
  const [pals, setPals] = useState<PaddlePal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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
            city,
            status,
            status_location,
            status_updated_at
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
            city,
            status,
            status_location,
            status_updated_at
          )
        `)
        .eq("receiver_id", user.id)
        .eq("status", "accepted");

      if (receivedError) throw receivedError;

      const allPals: PaddlePal[] = [
        ...(sentConnections?.map((c: any) => c.receiver) || []),
        ...(receivedConnections?.map((c: any) => c.sender) || []),
      ];

      allPals.sort((a, b) => {
        const aTime = a.status_updated_at ? new Date(a.status_updated_at).getTime() : 0;
        const bTime = b.status_updated_at ? new Date(b.status_updated_at).getTime() : 0;
        return bTime - aTime;
      });

      setPals(allPals);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load Paddle Pals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="container max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/home")} className="hover-lift">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Paddle Pals</h1>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => navigate("/search-players")} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Find More Players
          </Button>
        </div>

        {pals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No Paddle Pals yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Find players and send them a Paddle Pal request
              </p>
              <Button onClick={() => navigate("/search-players")}>
                <Users className="h-4 w-4 mr-2" />
                Search Players
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pals.map((pal) => (
              <Card
                key={pal.id}
                className="cursor-pointer hover-lift active:scale-95 transition-transform"
                onClick={() => navigate(`/profile/${pal.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">{pal.display_name}</h3>
                      <p className="text-sm text-muted-foreground">@{pal.username}</p>
                      {pal.city && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {pal.city}
                        </div>
                      )}
                    </div>
                    {pal.badge_name && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Award className="h-3 w-3" />
                        {pal.badge_name}
                      </Badge>
                    )}
                  </div>

                  {pal.status && pal.status !== "none" && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[pal.status] || "bg-gray-500"}`} />
                        <span className="text-sm font-medium">
                          {STATUS_LABELS[pal.status] || pal.status}
                        </span>
                      </div>
                      {pal.status_location && (
                        <p className="text-xs text-muted-foreground">
                          📍 {pal.status_location}
                        </p>
                      )}
                      {pal.status_updated_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(pal.status_updated_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          {pals.length} {pals.length === 1 ? "Paddle Pal" : "Paddle Pals"}
        </div>
      </div>
    </div>
  );
}
