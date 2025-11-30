import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, MapPin, Award, UserPlus, Check, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  badge_name: string | null;
  city: string | null;
  is_profile_public: boolean;
  displayed_rating: number | null;
}

type PaddlePalStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paddlePalStatus, setPaddlePalStatus] = useState<PaddlePalStatus>("none");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (userId) {
      loadProfile();
      checkPaddlePalStatus();
    }
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, badge_name, city, is_profile_public, displayed_rating")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (!data.is_profile_public && data.id !== user?.id) {
        const { data: connection } = await supabase
          .from("paddle_pals")
          .select("status")
          .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user?.id})`)
          .eq("status", "accepted")
          .maybeSingle();

        if (!connection) {
          toast({
            title: "Profile is private",
            description: "This profile is only visible to Paddle Pals",
            variant: "destructive",
          });
          navigate("/search-players");
          return;
        }
      }

      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load profile",
        variant: "destructive",
      });
      navigate("/search-players");
    } finally {
      setLoading(false);
    }
  };

  const checkPaddlePalStatus = async () => {
    if (!userId || !user) return;

    try {
      const { data: sentRequest } = await supabase
        .from("paddle_pals")
        .select("status")
        .eq("sender_id", user.id)
        .eq("receiver_id", userId)
        .maybeSingle();

      if (sentRequest) {
        if (sentRequest.status === "accepted") {
          setPaddlePalStatus("accepted");
        } else if (sentRequest.status === "pending") {
          setPaddlePalStatus("pending_sent");
        }
        return;
      }

      const { data: receivedRequest } = await supabase
        .from("paddle_pals")
        .select("status")
        .eq("sender_id", userId)
        .eq("receiver_id", user.id)
        .maybeSingle();

      if (receivedRequest) {
        if (receivedRequest.status === "accepted") {
          setPaddlePalStatus("accepted");
        } else if (receivedRequest.status === "pending") {
          setPaddlePalStatus("pending_received");
        }
      }
    } catch (error) {
      console.error("Error checking paddle pal status:", error);
    }
  };

  const handleAddPaddlePal = async () => {
    if (!userId || !user) return;

    setActionLoading(true);

    try {
      const { error } = await supabase.from("paddle_pals").insert({
        sender_id: user.id,
        receiver_id: userId,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Request sent!",
        description: "Your Paddle Pal request has been sent",
      });

      setPaddlePalStatus("pending_sent");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const renderActionButton = () => {
    if (profile.id === user?.id) {
      return (
        <Button onClick={() => navigate("/edit-profile")} className="w-full">
          Edit Profile
        </Button>
      );
    }

    switch (paddlePalStatus) {
      case "accepted":
        return (
          <Button disabled className="w-full">
            <Check className="h-4 w-4 mr-2" />
            Paddle Pals
          </Button>
        );
      case "pending_sent":
        return (
          <Button disabled variant="secondary" className="w-full">
            <Clock className="h-4 w-4 mr-2" />
            Request Sent
          </Button>
        );
      case "pending_received":
        return (
          <Button onClick={() => navigate("/paddle-pal-requests")} className="w-full">
            View Request
          </Button>
        );
      default:
        return (
          <Button
            onClick={handleAddPaddlePal}
            disabled={actionLoading}
            className="w-full"
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Add Paddle Pal
          </Button>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="container max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="hover-lift">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-primary h-24" />
          <CardContent className="p-6 -mt-8 space-y-6">
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{profile.display_name}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>
              {profile.badge_name && (
                <Badge variant="secondary" className="text-sm px-3 py-1.5 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  {profile.badge_name}
                </Badge>
              )}
            </div>

            <div className="grid gap-4">
              {profile.city && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{profile.city}</span>
                </div>
              )}

              {profile.displayed_rating && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Rating:</span>
                  <span className="text-2xl font-bold text-primary">
                    {profile.displayed_rating}
                  </span>
                </div>
              )}
            </div>

            {renderActionButton()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
