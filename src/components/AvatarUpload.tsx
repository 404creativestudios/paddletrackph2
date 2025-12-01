import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  userId: string;
  displayName: string;
  onUploadComplete: (url: string) => void;
}

export default function AvatarUpload({
  currentAvatarUrl,
  userId,
  displayName,
  onUploadComplete,
}: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      if (file.size > 2 * 1024 * 1024) {
        toast.error("File size must be less than 2MB");
        return;
      }

      if (!["jpg", "jpeg", "png", "webp"].includes(fileExt?.toLowerCase() || "")) {
        toast.error("Only JPG, PNG, and WebP images are allowed");
        return;
      }

      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${userId}/${oldPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      onUploadComplete(publicUrl);
      toast.success("Profile photo updated successfully");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setUploading(true);

      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${userId}/${oldPath}`]);
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (error) throw error;

      setAvatarUrl(null);
      onUploadComplete("");
      toast.success("Profile photo removed");
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      toast.error(error.message || "Failed to remove photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
          <AvatarImage src={avatarUrl || ""} alt={displayName} />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-accent text-white">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => document.getElementById("avatar-upload")?.click()}
        >
          <Camera className="w-4 h-4 mr-2" />
          {avatarUrl ? "Change Photo" : "Upload Photo"}
        </Button>

        {avatarUrl && (
          <Button
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={removeAvatar}
          >
            <X className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <input
        id="avatar-upload"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={uploadAvatar}
        disabled={uploading}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        JPG, PNG or WebP. Max 2MB.
      </p>
    </div>
  );
}
