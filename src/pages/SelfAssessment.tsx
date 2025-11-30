import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AssessmentData {
  experience_months: number;
  frequency_per_week: number;
  serve_score: number;
  return_score: number;
  dink_score: number;
  drop_score: number;
  reset_score: number;
  volley_score: number;
  hand_speed_score: number;
  lob_score: number;
  speedup_score: number;
  positioning_score: number;
  anticipation_score: number;
  consistency_score: number;
  play_style: string;
}

export default function SelfAssessment() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [data, setData] = useState<AssessmentData>({
    experience_months: 0,
    frequency_per_week: 1,
    serve_score: 3,
    return_score: 3,
    dink_score: 3,
    drop_score: 3,
    reset_score: 3,
    volley_score: 3,
    hand_speed_score: 3,
    lob_score: 3,
    speedup_score: 3,
    positioning_score: 3,
    anticipation_score: 3,
    consistency_score: 2,
    play_style: "",
  });

  const totalSteps = 6;
  const progressPercent = (step / totalSteps) * 100;

  const calculateRating = () => {
    const technical_average = (
      data.serve_score +
      data.return_score +
      data.dink_score +
      data.drop_score +
      data.reset_score +
      data.volley_score +
      data.hand_speed_score +
      data.lob_score +
      data.speedup_score
    ) / 9;

    const awareness_average = (data.positioning_score + data.anticipation_score) / 2;
    const consistency_value = data.consistency_score;
    const experience_value = (data.experience_months + data.frequency_per_week) / 2;

    const weighted_rating_raw =
      (technical_average * 0.5) +
      (awareness_average * 0.2) +
      (consistency_value * 0.2) +
      (experience_value * 0.1);

    const rating = 1.5 + (weighted_rating_raw * 0.6);
    const displayed_rating = Math.round(rating * 2) / 2;

    let badge_name = "";
    if (displayed_rating < 2.5) badge_name = "Starter";
    else if (displayed_rating === 2.5) badge_name = "Getting There";
    else if (displayed_rating === 3.0) badge_name = "Intermediate";
    else if (displayed_rating === 3.5) badge_name = "Leveling Up";
    else if (displayed_rating === 4.0) badge_name = "Advanced";
    else if (displayed_rating === 4.5) badge_name = "Elite";
    else if (displayed_rating >= 5.0) badge_name = "Expert";

    const progress_percent = Math.max(0, Math.min(100, ((rating - displayed_rating) / 0.5) * 100));

    return {
      weighted_rating_raw,
      displayed_rating,
      badge_name,
      progress_percent,
    };
  };

  const handleFinish = async () => {
    if (!data.play_style) {
      toast({
        title: "Please select a play style",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const ratings = calculateRating();

      const { error } = await supabase
        .from("profiles")
        .update({
          ...data,
          ...ratings,
          self_assessment_complete: true,
        })
        .eq("id", user?.id);

      if (error) throw error;

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-training-program`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user?.id,
          profileData: { ...data, ...ratings },
        }),
      });

      toast({
        title: "Assessment Complete!",
        description: "Your personalized training program is being generated.",
      });

      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save assessment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>How long have you been playing pickleball?</CardTitle>
              <CardDescription>This helps us understand your experience level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Less than 3 months", value: 0 },
                { label: "Three to six months", value: 1 },
                { label: "Six to twelve months", value: 2 },
                { label: "More than one year", value: 3 },
                { label: "More than two years", value: 4 },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={data.experience_months === option.value ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => setData({ ...data, experience_months: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </CardContent>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>How often do you play per week?</CardTitle>
              <CardDescription>Regular play helps build consistency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Once per week", value: 1 },
                { label: "Two to three times per week", value: 3 },
                { label: "Four times per week or more", value: 4 },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={data.frequency_per_week === option.value ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => setData({ ...data, frequency_per_week: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </CardContent>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Rate Your Technical Skills</CardTitle>
              <CardDescription>1 = Beginner, 5 = Expert</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: "Serve", key: "serve_score" },
                { label: "Return", key: "return_score" },
                { label: "Dinks", key: "dink_score" },
                { label: "Third Shot Drops", key: "drop_score" },
                { label: "Resets", key: "reset_score" },
                { label: "Volleys", key: "volley_score" },
                { label: "Hand Speed", key: "hand_speed_score" },
                { label: "Lobs", key: "lob_score" },
                { label: "Speedups", key: "speedup_score" },
              ].map((skill) => (
                <div key={skill.key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{skill.label}</Label>
                    <span className="text-sm font-medium">
                      {data[skill.key as keyof AssessmentData]}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[data[skill.key as keyof AssessmentData] as number]}
                    onValueChange={([value]) => setData({ ...data, [skill.key]: value })}
                  />
                </div>
              ))}
            </CardContent>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Rate Your Game Awareness</CardTitle>
              <CardDescription>1 = Beginner, 5 = Expert</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: "Positioning", key: "positioning_score" },
                { label: "Anticipation", key: "anticipation_score" },
              ].map((skill) => (
                <div key={skill.key} className="space-y-2">
                  <div className="flex justify-between">
                    <Label>{skill.label}</Label>
                    <span className="text-sm font-medium">
                      {data[skill.key as keyof AssessmentData]}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[data[skill.key as keyof AssessmentData] as number]}
                    onValueChange={([value]) => setData({ ...data, [skill.key]: value })}
                  />
                </div>
              ))}
            </CardContent>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>How consistent are you?</CardTitle>
              <CardDescription>How often can you repeat your shots during real games?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Almost never", value: 1 },
                { label: "Sometimes", value: 2 },
                { label: "Often", value: 3 },
                { label: "Very often", value: 4 },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={data.consistency_score === option.value ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => setData({ ...data, consistency_score: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </CardContent>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>What's your play style?</CardTitle>
              <CardDescription>Choose the style that best describes your game</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Keep the ball in play",
                "Mix soft and fast shots",
                "Control pace and placement",
                "Aggressive and strategic",
              ].map((style) => (
                <Button
                  key={style}
                  variant={data.play_style === style ? "default" : "outline"}
                  className="w-full justify-start text-left h-auto py-4"
                  onClick={() => setData({ ...data, play_style: style })}
                >
                  {style}
                </Button>
              ))}
            </CardContent>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero py-8 px-4">
      <div className="container max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Self Assessment</h1>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
        </div>

        <Card>{renderStep()}</Card>

        <div className="flex justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1 || loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button onClick={() => setStep(step + 1)}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Finish Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
