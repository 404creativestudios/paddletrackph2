import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

const SKILL_LEVELS = [
  {
    value: "2.0-2.5 Beginner",
    title: "2.0-2.5 Beginner",
    description: "You have a little experience and can keep basic score. Your rallies last 1-2 shots."
  },
  {
    value: "3.0 Lower Intermediate",
    title: "3.0 Lower Intermediate",
    description: "You know the rules and fundamentals. You are learning proper court positioning. Some consistency on forehands and serves."
  },
  {
    value: "3.5 Intermediate",
    title: "3.5 Intermediate",
    description: "You sustain medium-length dink rallies. You are working on third-shot drop and developing backhands."
  },
  {
    value: "4.0 Upper Intermediate",
    title: "4.0 Upper Intermediate",
    description: "You play patiently, read opponents, mix soft and hard shots. You know your partner's position and play as a team."
  },
  {
    value: "4.5 Advanced",
    title: "4.5 Advanced",
    description: "Your forehands are consistent. You serve with power and accuracy. You vary spins. You use stacking or poaching. You make few unforced errors."
  },
  {
    value: "5.0+ Elite",
    title: "5.0+ Elite",
    description: "You hit all shot types at high level. You master dinks and drop shots. You adjust quickly. You rarely make unforced errors."
  }
];

export default function SkillAssessment() {
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadCurrentLevel();
  }, [user]);

  const loadCurrentLevel = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("self_assessed_level")
        .eq("id", user.id)
        .single();

      if (profile?.self_assessed_level) {
        setCurrentLevel(profile.self_assessed_level);
        setSelectedLevel(profile.self_assessed_level);
      }
    } catch (error) {
      console.error("Error loading current level:", error);
    }
  };

  const handleSaveLevel = async () => {
    if (!selectedLevel) {
      toast({
        title: "Please select a level",
        description: "Choose the description that best fits your current game.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ self_assessed_level: selectedLevel })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Level saved!",
        description: `You selected ${selectedLevel}. You can change this anytime.`,
      });
      
      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save level",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="container max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="animate-fade-in space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="hover-lift"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              Assess your pickleball skill level
            </h1>
            <p className="text-lg text-muted-foreground">
              Choose the description that best fits your current game.
            </p>
          </div>
        </div>

        {/* Why it matters */}
        <Card className="bg-primary/5 border-primary/20 animate-fade-in">
          <CardContent className="p-5">
            <p className="text-foreground">
              <span className="font-semibold">Why it matters:</span> Choosing the right level helps you track progress, match with similar players, and enjoy games that fit your pace.
            </p>
          </CardContent>
        </Card>

        {/* Level Cards */}
        <div className="space-y-4">
          {SKILL_LEVELS.map((level, index) => (
            <Card
              key={level.value}
              className={`cursor-pointer transition-all duration-300 hover-lift animate-scale-in ${
                selectedLevel === level.value
                  ? "border-primary bg-primary/10 shadow-glow"
                  : "hover:border-primary/50"
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => setSelectedLevel(level.value)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                      {level.title}
                      {currentLevel === level.value && (
                        <span className="text-xs font-normal text-muted-foreground">
                          (Current)
                        </span>
                      )}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {level.description}
                    </p>
                  </div>
                  {selectedLevel === level.value && (
                    <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-center pt-4 animate-fade-in">
          <Button
            size="lg"
            onClick={handleSaveLevel}
            disabled={loading || !selectedLevel}
            className="w-full md:w-auto h-14 text-base font-semibold hover-lift shadow-md bg-gradient-primary hover:shadow-glow transition-all duration-300"
          >
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Set my level
          </Button>
        </div>
      </div>
    </div>
  );
}
