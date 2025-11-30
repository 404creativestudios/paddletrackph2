import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "none", label: "No active status" },
  { value: "looking_partner", label: "Looking for partner" },
  { value: "looking_one_more", label: "Looking for one more player" },
  { value: "hosting_open_play", label: "Hosting open play" },
  { value: "looking_open_play", label: "Looking for open play" },
  { value: "looking_coach", label: "Looking for coach" },
  { value: "looking_court", label: "Looking for court" },
];

export default function UpdateStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("none");
  const [statusLocation, setStatusLocation] = useState("");
  const [statusLink, setStatusLink] = useState("");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadCurrentStatus();
  }, [user, navigate]);

  const loadCurrentStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("status, status_location, status_link")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStatus(data.status || "none");
        setStatusLocation(data.status_location || "");
        setStatusLink(data.status_link || "");
      }
    } catch (error) {
      console.error("Error loading status:", error);
      toast.error("Failed to load current status");
    } finally {
      setInitializing(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const updates: any = {
        status,
        status_updated_at: new Date().toISOString(),
      };

      if (status === "none") {
        updates.status_location = null;
        updates.status_link = null;
      } else {
        updates.status_location = statusLocation || null;
        updates.status_link = statusLink || null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Status updated successfully");
      navigate("/");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    if (value === "none") {
      setStatusLocation("");
      setStatusLink("");
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">Update Status</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {status !== "none" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="location">Location (optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Marina Bay Courts"
                    value={statusLocation}
                    onChange={(e) => setStatusLocation(e.target.value)}
                  />
                </div>

                {status === "hosting_open_play" && (
                  <div className="space-y-2">
                    <Label htmlFor="link">Event Link (optional)</Label>
                    <Input
                      id="link"
                      placeholder="e.g., Reclub event URL"
                      value={statusLink}
                      onChange={(e) => setStatusLink(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Add a link to your Reclub event or other booking page
                    </p>
                  </div>
                )}
              </>
            )}

            <Button
              onClick={handleSave}
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Status
            </Button>
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground space-y-2 bg-muted/50 p-4 rounded-lg">
          <p className="font-medium">How status works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your status will be visible in the Activity Feed for 72 hours</li>
            <li>Paddle Pals can always see your status</li>
            <li>Other users can see it only if your profile is public</li>
            <li>Update anytime to keep it current</li>
          </ul>
        </div>
      </div>
  );
}
