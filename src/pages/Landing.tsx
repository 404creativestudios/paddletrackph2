import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Target, TrendingUp, Users, BarChart3, Calendar, Star, ClipboardList, History, Mail, BookOpen, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      toast({
        title: "Invalid email",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("coach_waitlist")
        .insert([{ email: email.trim().toLowerCase() }]);

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already on the list!",
            description: "This email is already on the waitlist.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "You're on the list!",
          description: "We'll email you when Coach Mode launches.",
        });
        setEmail("");
      }
    } catch (error) {
      console.error("Error joining waitlist:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Target className="w-4 h-4" />
              <span>PaddleTrack PH</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              PaddleTrack PH 
            </h1>
            <div className="space-y-2">
              <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                Universal practice tracker for pickleball.
              </p>
              <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                Progress made visible.
              </p>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              PaddleTrack PH helps players record sessions, understand their progress, and grow at their own pace.
              Beginners, lifestyle players, coaches, and clubs can use it to make every practice meaningful.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate("/signup")} className="hover-scale">
                Sign in or create an account
              </Button>
              <Button size="lg" variant="outline" onClick={() => {
              document.getElementById("how-it-works")?.scrollIntoView({
                behavior: "smooth"
              });
            }} className="hover-scale">
                How it works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Inspired by real play */}
      <section className="py-16 md:py-24 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Inspired by real play</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              PaddleTrack PH is inspired by the paddle tracking technique in pickleball where players keep the paddle pointed at the ball so they stay ready for anything. This app applies the same idea to your journey. It keeps your progress in sight and helps you stay prepared for every session.
            </p>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-16 md:py-24 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 hover-lift transition-all">
              <CardContent className="pt-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Track every session</h3>
                <p className="text-muted-foreground">
                  Record scores, partners, and match details in seconds.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover-lift transition-all">
              <CardContent className="pt-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Understand your progress</h3>
                <p className="text-muted-foreground">
                  Your dashboard shows total games, wins, losses, draws, and win rate.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover-lift transition-all">
              <CardContent className="pt-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Grow at your pace</h3>
                <p className="text-muted-foreground">
                  Beginners, casual players, and coaches all benefit from clear session history.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 md:py-24 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            <h2 className="text-3xl md:text-4xl font-bold text-center">How it works</h2>
            
            <div className="space-y-12">
              {[{
              step: 1,
              icon: Users,
              title: "Set up your profile",
              description: "Choose a unique username, your skill level, and your city so partners can find you."
            }, {
              step: 2,
              icon: Calendar,
              title: "Start or schedule a game",
              description: "Start a game to log real time sessions or schedule a future match with partners."
            }, {
              step: 3,
              icon: Target,
              title: "Add players and track results",
              description: "Invite players by username, record scores, and approve accuracy together."
            }, {
              step: 4,
              icon: TrendingUp,
              title: "See your progress unfold",
              description: "Your stats update automatically. View your history, partner list, and growth over time."
            }].map(({
              step,
              icon: Icon,
              title,
              description
            }) => <div key={step} className="flex gap-6 items-start group">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="text-sm font-semibold text-primary">Step {step}</div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{description}</p>
                  </div>
                </div>)}
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16 md:py-24 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center">Core Features</h2>
            
            <div className="grid gap-6">
              {[{
              icon: BarChart3,
              title: "Dashboard",
              description: "See total games, wins, losses, draws, win rate, reminders for scheduled games, and quick actions."
            }, {
              icon: Target,
              title: "Start a Game",
              description: "Create an instant match log with location, format, tag, and score entry."
            }, {
              icon: Calendar,
              title: "Schedule a Game",
              description: "Plan ahead, invite players, and get in-app reminders when the session is coming up."
            }, {
              icon: ClipboardList,
              title: "Game Details",
              description: "View match info, teams, scores, and approval status. Add private notes for your own reflection."
            }, {
              icon: History,
              title: "Game History",
              description: "See all past matches, results, partners, and your performance over time."
            }, {
              icon: Star,
              title: "Favorite Players",
              description: "Star players you want to play with again. Favorites appear first during player searches."
            }, {
              icon: BookOpen,
              title: "Personal Training Program",
              description: "Receive a customised two-week training program generated from your assessment. Focus on your weak areas with drills, warm-ups, and game patterns designed for your growth."
            }, {
              icon: UserPlus,
              title: "Public Profiles and Paddle Pals",
              description: "View public profiles showing display name, username, badge, and location. Send Paddle Pal requests, accept or decline, and keep a friends list to easily invite partners to games and lobbies."
            }].map(({
              icon: Icon,
              title,
              description
            }) => <Card key={title} className="border-2 hover-lift transition-all">
                  <CardContent className="p-6">
                    <div className="flex gap-4 items-start">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold">{title}</h3>
                        <p className="text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>
        </div>
      </section>

      {/* For coaches and clubs */}
      <section className="py-16 md:py-24 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium">
                Coming Soon
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">Better tools for coaches and clubs</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Help players grow with structure, clarity, and consistency. PaddleTrack PH gives coaches a simple workspace where sessions, attendance, progress notes, and player insights all come together.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {[{
              icon: Users,
              title: "Manage your students",
              description: "Add players by username, send invites, approve requests, and keep your roster organized in one place."
            }, {
              icon: BarChart3,
              title: "Track player progress",
              description: "View each student's session history, skill level changes, game stats, and add private coaching notes only you can see."
            }, {
              icon: ClipboardList,
              title: "Structure your sessions",
              description: "Create coaching sessions, tag students by group or skill level, leave post-session notes, and manage your schedule."
            }, {
              icon: Award,
              title: "Build your coaching brand",
              description: "Create a shareable coach profile with your bio, specialties, welcome video, and custom accent colors. Share it anywhere to attract students."
            }].map(({
              icon: Icon,
              title,
              description
            }) => <div key={title} className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                    <Icon className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{description}</p>
                </div>)}
            </div>

            {/* Waitlist Form */}
            <Card className="border-2 max-w-2xl mx-auto mt-12">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold">
                    Join the waitlist
                  </h3>
                  <p className="text-muted-foreground">
                    Be the first to know when Coach Mode launches. We'll send you an email as soon as it's ready.
                  </p>
                </div>

                <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-center text-lg h-12"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Joining..." : "Join the Waitlist"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ready to begin */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">Begin your journey</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Whether you are starting your pickleball journey or guiding a community, PaddleTrack PH brings clarity to every practice. Stay active, stay motivated, and see your progress unfold.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate("/signup")} className="hover-scale">
                Create an account
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Already a member?{" "}
              <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>;
};
export default Landing;