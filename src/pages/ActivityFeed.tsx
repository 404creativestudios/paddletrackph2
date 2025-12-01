import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, ExternalLink, User, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActivityItem = {
  id: string;
  display_name: string;
  username: string;
  badge_name: string | null;
  status: string;
  status_location: string | null;
  status_link: string | null;
  status_updated_at: string;
  is_paddle_pal: boolean;
};

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

export default function ActivityFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadActivityFeed();
  }, [user, navigate]);

  const loadActivityFeed = async () => {
    if (!user) return;

    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 72);

      const { data: paddlePalsSent, error: palsSentError } = await supabase
        .from("paddle_pals")
        .select("receiver_id")
        .eq("sender_id", user.id)
        .eq("status", "accepted");

      if (palsSentError) throw palsSentError;

      const { data: paddlePalsReceived, error: palsReceivedError } = await supabase
        .from("paddle_pals")
        .select("sender_id")
        .eq("receiver_id", user.id)
        .eq("status", "accepted");

      if (palsReceivedError) throw palsReceivedError;

      const paddlePalIds = [
        ...(paddlePalsSent?.map((p) => p.receiver_id) || []),
        ...(paddlePalsReceived?.map((p) => p.sender_id) || []),
      ];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, username, badge_name, status, status_location, status_link, status_updated_at, is_profile_public")
        .neq("status", "none")
        .not("status", "is", null)
        .gte("status_updated_at", cutoffTime.toISOString())
        .order("status_updated_at", { ascending: false });

      if (error) throw error;

      const filtered = data?.filter((profile) => {
        if (profile.id === user.id) return false;

        const isPaddlePal = paddlePalIds.includes(profile.id);
        return profile.is_profile_public || isPaddlePal;
      }) || [];

      const enriched: ActivityItem[] = filtered.map((profile) => ({
        id: profile.id,
        display_name: profile.display_name || profile.username || "Unknown",
        username: profile.username || "",
        badge_name: profile.badge_name,
        status: profile.status,
        status_location: profile.status_location,
        status_link: profile.status_link,
        status_updated_at: profile.status_updated_at,
        is_paddle_pal: paddlePalIds.includes(profile.id),
      }));

      enriched.sort((a, b) => {
        if (a.is_paddle_pal && !b.is_paddle_pal) return -1;
        if (!a.is_paddle_pal && b.is_paddle_pal) return 1;
        return new Date(b.status_updated_at).getTime() - new Date(a.status_updated_at).getTime();
      });

      setActivities(enriched);
    } catch (error) {
      console.error("Error loading activity feed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredActivities = () => {
    if (filter === "all") return activities;
    if (filter === "paddle_pals") return activities.filter((a) => a.is_paddle_pal);
    return activities.filter((a) => a.status === filter);
  };

  const ActivityCard = ({ activity }: { activity: ActivityItem }) => (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{activity.display_name}</h3>
              {activity.is_paddle_pal && (
                <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                  <Users className="w-3 h-3" />
                  Pal
                </Badge>
              )}
            </div>
            {activity.badge_name && (
              <Badge variant="outline" className="mb-2">
                {activity.badge_name}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[activity.status] || "bg-gray-500"}`} />
            <span className="font-medium text-sm">
              {STATUS_LABELS[activity.status] || activity.status}
            </span>
          </div>

          {activity.status_location && (
            <p className="text-sm text-muted-foreground">
              📍 {activity.status_location}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(activity.status_updated_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/profile/${activity.username}`)}
            className="flex-1"
          >
            <User className="w-4 h-4 mr-2" />
            View Profile
          </Button>
          {activity.status_link && activity.status === "hosting_open_play" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(activity.status_link!, "_blank")}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Event
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredActivities = getFilteredActivities();

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Activity Feed</h1>
        </div>

        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full grid grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="paddle_pals">Pals</TabsTrigger>
            <TabsTrigger value="hosting_open_play">Hosting</TabsTrigger>
            <TabsTrigger value="looking_open_play" className="hidden lg:block">Play</TabsTrigger>
            <TabsTrigger value="looking_partner" className="hidden lg:block">Partner</TabsTrigger>
            <TabsTrigger value="looking_coach" className="hidden lg:block">Coach</TabsTrigger>
            <TabsTrigger value="looking_court" className="hidden lg:block">Court</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4 mt-6">
            {filteredActivities.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No active statuses to display
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Check back later or invite more Paddle Pals
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
}
