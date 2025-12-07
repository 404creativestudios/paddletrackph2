import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, Trophy, Target, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TrainingProfile {
  displayed_rating: number;
  badge_name: string;
  progress_percent: number;
  top_three_focus_areas: string;
  training_program: string;
  recommended_drills: string;
  next_level_target: number;
  ai_generated_at: string;
}

export default function TrainingDashboard() {
  const [profile, setProfile] = useState<TrainingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTrainingProfile();
  }, [user]);

  const loadTrainingProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("displayed_rating, badge_name, progress_percent, top_three_focus_areas, training_program, recommended_drills, next_level_target, ai_generated_at")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (!data.displayed_rating) {
        navigate("/self-assessment");
        return;
      }

      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load training profile",
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

  if (!profile) {
    return null;
  }

  const focusAreas = profile.top_three_focus_areas?.split(", ") || [];

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/home")} className="hover-lift">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Your Training Plan</h1>
        </div>

        <Card className="bg-gradient-primary text-white border-0 shadow-glow">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm mb-1">Current Rating</p>
                <p className="text-5xl font-bold">{profile.displayed_rating}</p>
              </div>
              <div className="text-right">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-lg px-4 py-2">
                  {profile.badge_name}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white/90">
                <span>Progress to {profile.next_level_target}</span>
                <span>{profile.progress_percent}%</span>
              </div>
              <Progress value={profile.progress_percent} className="h-3 bg-white/20" />
            </div>
          </CardContent>
        </Card>

        <Alert className="border-primary/20 bg-primary/5">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            <strong>Disclaimer:</strong> This rating is a self-assessed estimate for training purposes. It is not an official tournament rating. PaddleTrack PH uses USA Pickleball skill descriptions as a guide but adjusts for PH open play style. Your rating may change as you log games.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Focus Areas
            </CardTitle>
            <CardDescription>Work on these to reach the next level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {focusAreas.map((area, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium">{area}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Your Training Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {profile.training_program?.split("\n").map((line, index) => {
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <h3 key={index} className="font-bold text-foreground mt-4 mb-2">
                      {line.replace(/\*\*/g, "")}
                    </h3>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <li key={index} className="text-muted-foreground ml-4">
                      {line.substring(2)}
                    </li>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={index} className="text-muted-foreground mb-2">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Recommended Drills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {profile.recommended_drills?.split("\n").map((line, index) => {
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <h3 key={index} className="font-bold text-foreground mt-4 mb-2">
                      {line.replace(/\*\*/g, "")}
                    </h3>
                  );
                }
                if (line.match(/^\d+\./)) {
                  return (
                    <div key={index} className="mb-4">
                      <p className="font-semibold text-foreground">{line}</p>
                    </div>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <li key={index} className="text-muted-foreground ml-4">
                      {line.substring(2)}
                    </li>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={index} className="text-muted-foreground mb-2">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigate("/self-assessment")}
            className="hover-lift"
          >
            Retake Assessment
          </Button>
        </div>

        {profile.ai_generated_at && (
          <p className="text-center text-xs text-muted-foreground">
            Generated on {new Date(profile.ai_generated_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
