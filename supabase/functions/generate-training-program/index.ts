import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { userId, profileData } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const technicalScores = [
      { name: "Serve", score: profileData.serve_score },
      { name: "Return", score: profileData.return_score },
      { name: "Dinks", score: profileData.dink_score },
      { name: "Drops", score: profileData.drop_score },
      { name: "Resets", score: profileData.reset_score },
      { name: "Volleys", score: profileData.volley_score },
      { name: "Hand speed", score: profileData.hand_speed_score },
      { name: "Lobs", score: profileData.lob_score },
      { name: "Speedups", score: profileData.speedup_score },
    ];

    const sortedScores = [...technicalScores].sort((a, b) => a.score - b.score);
    const weakest = sortedScores.slice(0, 3).map(s => s.name);

    const awarenessScores = [
      { name: "Positioning", score: profileData.positioning_score },
      { name: "Anticipation", score: profileData.anticipation_score },
    ];

    const allWeaknesses = [
      ...sortedScores.filter(s => s.score <= 2),
      ...awarenessScores.filter(s => s.score <= 2),
    ];

    let topThreeFocus: string[];
    if (allWeaknesses.length >= 3) {
      topThreeFocus = allWeaknesses.slice(0, 3).map(w => w.name);
    } else if (allWeaknesses.length > 0) {
      topThreeFocus = [
        ...allWeaknesses.map(w => w.name),
        ...weakest.filter(w => !allWeaknesses.find(a => a.name === w)).slice(0, 3 - allWeaknesses.length),
      ];
    } else {
      topThreeFocus = weakest;
    }

    const nextLevelTarget = profileData.displayed_rating + 0.5;

    const trainingProgram = generateTrainingProgram(profileData, topThreeFocus);
    const recommendedDrills = generateDrills(topThreeFocus);

    const { error } = await supabase
      .from("profiles")
      .update({
        top_three_focus_areas: topThreeFocus.join(", "),
        training_program: trainingProgram,
        recommended_drills: recommendedDrills,
        next_level_target: nextLevelTarget,
        ai_generated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        focusAreas: topThreeFocus,
        nextLevelTarget,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function generateTrainingProgram(profileData: any, focusAreas: string[]): string {
  const experienceLevel = profileData.experience_months <= 1 ? "beginner" : 
                         profileData.experience_months <= 3 ? "intermediate" : "advanced";
  
  let program = `**Your Two-Week Training Plan (${profileData.displayed_rating} → ${profileData.displayed_rating + 0.5})**\n\n`;
  
  program += `**Week 1: Build Foundation**\n`;
  program += `- Day 1-2: Focus on ${focusAreas[0]} fundamentals. Practice slow, controlled repetitions.\n`;
  program += `- Day 3-4: Work on ${focusAreas[1]}. Combine with footwork drills.\n`;
  program += `- Day 5-6: Integrate ${focusAreas[2]} into live play situations.\n`;
  program += `- Day 7: Rest and video review.\n\n`;
  
  program += `**Week 2: Apply and Refine**\n`;
  program += `- Day 1-2: Combine all three focus areas in drills.\n`;
  program += `- Day 3-4: Practice game scenarios emphasizing ${focusAreas[0]} and ${focusAreas[1]}.\n`;
  program += `- Day 5-6: Play matches focusing on consistency over power.\n`;
  program += `- Day 7: Self-assessment and goal adjustment.\n\n`;
  
  program += `**Key Principles:**\n`;
  program += `- Warm up for 10 minutes before each session\n`;
  program += `- Focus on form over speed initially\n`;
  program += `- Record progress in a journal\n`;
  program += `- Play with ${experienceLevel === "beginner" ? "patient partners" : "players at or slightly above your level"}\n`;
  
  return program;
}

function generateDrills(focusAreas: string[]): string {
  const drillMap: Record<string, string> = {
    "Serve": "**Serve Practice**: Set up targets in service boxes. Aim for 8/10 successful serves to each target. Focus on consistent toss and smooth swing.",
    "Return": "**Return Drill**: Have partner serve to you. Focus on returning deep to baseline. Alternate forehand and backhand returns.",
    "Dinks": "**Dinking Ladder**: Start at kitchen line. Dink cross-court for 20 consecutive shots. Then try straight-ahead dinks. Focus on soft touch and control.",
    "Drops": "**Third Shot Drop**: Position at baseline. Partner feeds from kitchen. Practice drops to land in kitchen zone. Aim for 10 good drops in a row.",
    "Resets": "**Reset Drill**: Partner hits fast balls from kitchen. Practice resetting to soft dinks. Focus on absorbing pace.",
    "Volleys": "**Volley Wall**: Partner feeds fast balls. Block back with firm wrist. Alternate forehand and backhand volleys.",
    "Hand speed": "**Reaction Drill**: Stand at kitchen. Partner hits quick shots at you. Practice fast hands and short backswing.",
    "Lobs": "**Lob Targets**: Set targets at baseline. Practice offensive and defensive lobs. Focus on height and depth.",
    "Speedups": "**Attack Drill**: Partner feeds high balls. Practice speedups to feet and middle. Focus on timing.",
    "Positioning": "**Court Awareness**: Play points focusing only on position. After each shot, move to optimal spot before next shot.",
    "Anticipation": "**Read and React**: Partner alternates shots. Practice reading paddle angle and body position to anticipate next shot.",
  };
  
  let drills = "**Recommended Drills for Your Focus Areas:**\n\n";
  
  focusAreas.forEach((area, index) => {
    drills += `${index + 1}. ${drillMap[area] || "Practice " + area + " fundamentals with a partner."}\n\n`;
  });
  
  drills += "**General Warm-up (before each session):**\n";
  drills += "- 5 minutes of dynamic stretching\n";
  drills += "- 3 minutes of footwork patterns (split-step, side shuffle)\n";
  drills += "- 2 minutes of paddle work (wrist rolls, shadow swings)\n";
  
  return drills;
}
