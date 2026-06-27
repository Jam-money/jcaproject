import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

const AVATAR_BUCKET = "avatars";

function Profile() {
  const { profile, role, refresh } = useAuth();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    await refresh(); toast.success("Profile updated");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, cacheControl: "3600" });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`; // cache-bust

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      await refresh();
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    if (!profile) return;
    setUploading(true);
    try {
      // best-effort cleanup of stored files (jpg/png/webp/etc.)
      const { data: list } = await supabase.storage.from(AVATAR_BUCKET).list(profile.id);
      if (list && list.length > 0) {
        await supabase.storage.from(AVATAR_BUCKET).remove(list.map(f => `${profile.id}/${f.name}`));
      }

      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
      if (error) throw error;

      await refresh();
      toast.success("Profile photo removed");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove photo");
    } finally {
      setUploading(false);
    }
  };

  const initials = (name || profile?.email || "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-xl space-y-6">
      <div><h1 className="text-2xl font-semibold">Profile settings</h1><p className="text-sm text-muted-foreground">Update your details.</p></div>
      <Card className="p-6 space-y-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-24 w-24">
              <AvatarImage src={(profile as any)?.avatar_url ?? undefined} alt={name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change photo"
              className="absolute bottom-0 right-0 grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground border-2 border-background shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
          <div>
            <div className="font-medium">{profile?.email}</div>
            <div className="text-xs text-muted-foreground capitalize">Role: {role}</div>
            {(profile as any)?.avatar_url && (
              <button
                type="button"
                onClick={removePhoto}
                disabled={uploading}
                className="text-xs text-destructive hover:underline mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={e=>setName(e.target.value)}/></div>
        <Button onClick={save} disabled={busy}>Save changes</Button>
      </Card>
    </div>
  );
}