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
  const frequencyAdjustment = profileData.frequency_per_week <= 1
    ? "Practice these drills during your weekly session. Focus on quality over quantity."
    : profileData.frequency_per_week <= 2
    ? "Split these modules across your sessions. Take your time with each drill."
    : "You can progress through modules faster. Practice 1-2 modules per session.";

  let program = `**Your Progress-Based Training Program**\n`;
  program += `Target: ${profileData.displayed_rating} → ${profileData.displayed_rating + 0.5}\n\n`;

  program += `**Top Three Focus Areas**\n`;
  focusAreas.forEach((area, index) => {
    program += `${index + 1}. ${area}\n`;
  });
  program += `\n${frequencyAdjustment}\n\n`;

  program += `**Module 1: Foundation - ${focusAreas[0]}**\n`;
  program += `**Purpose:** Build basic control and consistency in ${focusAreas[0]}.\n`;
  program += `**Drills:**\n`;
  program += `- Start with slow, controlled repetitions focusing on form\n`;
  program += `- Practice 10-15 reps per session when you play\n`;
  program += `- Record successful attempts vs total attempts\n`;
  program += `**Move to next module when:** You can complete 8 out of 10 attempts with good form.\n\n`;

  program += `**Module 2: Consistency - ${focusAreas[1]}**\n`;
  program += `**Purpose:** Develop reliable ${focusAreas[1]} that you can use in games.\n`;
  program += `**Drills:**\n`;
  program += `- Combine ${focusAreas[1]} with footwork patterns\n`;
  program += `- Practice 15-20 reps per session\n`;
  program += `- Focus on maintaining form under movement\n`;
  program += `**Move to next module when:** You can maintain good form while moving and complete 10 consecutive good attempts.\n\n`;

  program += `**Module 3: Application - ${focusAreas[2]}**\n`;
  program += `**Purpose:** Use ${focusAreas[2]} effectively in live play situations.\n`;
  program += `**Drills:**\n`;
  program += `- Practice in game-like scenarios with a partner\n`;
  program += `- Start with cooperative drills, then add light competition\n`;
  program += `- Track success rate during actual games\n`;
  program += `**Move to next module when:** You successfully use this skill 6 out of 10 times in real game situations.\n\n`;

  program += `**Module 4: Integration**\n`;
  program += `**Purpose:** Combine all three focus areas smoothly in match play.\n`;
  program += `**Drills:**\n`;
  program += `- Play practice games focusing on using all three skills\n`;
  program += `- Ask your practice partner to create situations where you need each skill\n`;
  program += `- Keep a simple tally of successful uses during games\n`;
  program += `**Move to next module when:** You feel confident using all three skills without thinking about them too much.\n\n`;

  program += `**Module 5: Refinement**\n`;
  program += `**Purpose:** Polish your skills and prepare for the next rating level.\n`;
  program += `**Drills:**\n`;
  program += `- Play against players at or slightly above your level\n`;
  program += `- Focus on consistency over power\n`;
  program += `- Practice reading opponents and adjusting your strategy\n`;
  program += `**Move to next module when:** You win more than half your games at your current level and feel ready to challenge yourself further.\n\n`;

  program += `**Important Recommendation**\n`;
  program += `Consider consulting a qualified pickleball coach to verify your skills or receive expert guidance. Drills may vary depending on your physical condition, environment, and actual performance. A coach can provide personalized feedback and adjustments tailored to your specific needs.\n`;

  return program;
}

function generateDrills(focusAreas: string[]): string {
  const drillMap: Record<string, string> = {
    "Serve": "**Serve Practice**: Place targets in service boxes. Aim for consistent placement. Practice 10-15 serves per session. Target 8 out of 10 successful before moving to next drill.",
    "Return": "**Return Drill**: Partner serves to you. Focus on returning deep. Practice both forehand and backhand. Repeat 15-20 times per session.",
    "Dinks": "**Dinking Control**: Start at kitchen line. Dink cross-court aiming for consistency. Try for 10-15 consecutive soft touches. Move to straight dinks when ready.",
    "Drops": "**Third Shot Drop**: Start at baseline. Partner feeds from kitchen. Drop the ball into the kitchen zone. Aim for 10 good drops per session.",
    "Resets": "**Reset Drill**: Partner hits fast balls from kitchen. Practice absorbing pace and resetting to soft shots. Focus on control over power.",
    "Volleys": "**Volley Practice**: Partner feeds medium-paced balls. Block back with firm wrist and compact swing. Alternate sides. 15-20 reps per session.",
    "Hand speed": "**Quick Hands Drill**: Stand at kitchen line. Partner hits quick shots. Practice short backswing and fast reaction. 10-15 reps when you play.",
    "Lobs": "**Lob Control**: Practice both defensive and offensive lobs. Focus on height and depth. Aim for baseline targets. 10-12 attempts per session.",
    "Speedups": "**Attack Practice**: Partner feeds high or floating balls. Practice speedups aiming at feet or middle. Focus on timing and placement over pure power.",
    "Positioning": "**Court Position Drill**: Play practice points. After each shot, check your position. Focus on moving to the right spot. Do this during regular games.",
    "Anticipation": "**Read and React**: Watch your partner's paddle and body. Try to predict the next shot. Practice this awareness during every session.",
  };

  let drills = "**Recommended Drills:**\n\n";

  focusAreas.forEach((area, index) => {
    drills += `${index + 1}. ${drillMap[area] || "Practice " + area + " with focus on form and consistency."}\n\n`;
  });

  drills += "**Warm-up (5-10 minutes before each session):**\n";
  drills += "- Light stretching of shoulders, arms, and legs\n";
  drills += "- Basic footwork patterns: side shuffle, split-step practice\n";
  drills += "- Gentle paddle swings and wrist rolls\n\n";

  drills += "**Remember:** Quality matters more than quantity. Focus on good form, then gradually increase speed and difficulty.\n";

  return drills;
}
