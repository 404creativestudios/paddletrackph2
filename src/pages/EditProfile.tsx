import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, ArrowLeft, Save, Moon, Sun, Monitor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "@/components/AvatarUpload";

export default function EditProfile() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, city, avatar_url, is_profile_public, theme_preference")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setUsername(data.username || "");
        setDisplayName(data.display_name || "");
        setCity(data.city || "");
        setAvatarUrl(data.avatar_url);
        setIsPublic(data.is_profile_public ?? true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !displayName) {
      toast({
        title: "Missing information",
        description: "Username and display name are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user?.id)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Username taken",
          description: "Please choose a different username",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: displayName,
          city: city || null,
          is_profile_public: isPublic,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Profile updated!",
        description: "Your changes have been saved",
      });

      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
          <Button variant="ghost" onClick={() => navigate(-1)} className="hover-lift">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
        </div>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your public profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center py-4">
                <AvatarUpload
                  currentAvatarUrl={avatarUrl}
                  userId={user?.id || ""}
                  displayName={displayName}
                  onUploadComplete={(url) => setAvatarUrl(url)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your unique identifier on PaddleTrack PH
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Location</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Manila"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to find and view your profile
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {!isPublic && (
                <div className="p-4 bg-muted/50 rounded-lg text-sm">
                  <p className="text-muted-foreground">
                    When your profile is private, only your accepted Paddle Pals can view it.
                    You won't appear in search results.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Label>Theme Preference</Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
                      theme === "light"
                        ? "border-primary bg-primary/10"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <Sun className="h-5 w-5" />
                    <span className="text-sm font-medium">Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
                      theme === "dark"
                        ? "border-primary bg-primary/10"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <Moon className="h-5 w-5" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
                      theme === "system"
                        ? "border-primary bg-primary/10"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <Monitor className="h-5 w-5" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Choose how PaddleTrack PH looks to you. System uses your device's theme preference.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
