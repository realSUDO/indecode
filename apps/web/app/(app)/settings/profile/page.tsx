"use client";

import { useEffect, useState } from "react";
import { trpc } from "~/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, isLoading } = trpc.auth.getSession.useQuery();
  const utils = trpc.useUtils();
  
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      setCompany((session.user as any).company || "");
      setRole((session.user as any).onboardingRole || "");
    }
  }, [session]);

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      utils.auth.getSession.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    }
  });

  if (isLoading || !session?.user) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    );
  }

  const user = session.user;
  const initials = user.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
    : user.email?.substring(0, 2).toUpperCase() || "U";

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfileMutation.mutate({
      name,
      company,
      onboardingRole: role
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Profile</h1>
        <p className="text-neutral-500">Manage your public profile and personal details.</p>
      </div>

      <Card className="bg-[#0A0A0A] border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">Personal Information</CardTitle>
          <CardDescription className="text-neutral-500">
            This information will be displayed on your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border border-white/10 rounded-2xl shadow-xl shadow-black">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} className="object-cover" />
              <AvatarFallback className="rounded-2xl bg-white/5 text-white text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium text-white">Profile Picture</h3>
              <p className="text-sm text-neutral-500 max-w-xs">
                Your profile picture is synced with your authentication provider (e.g. GitHub/Google).
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-neutral-300">Full Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20" 
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-neutral-300">Email Address</Label>
              <Input 
                value={user.email || ""} 
                disabled 
                className="bg-white/5 border-white/10 text-neutral-500 opacity-60 cursor-not-allowed" 
              />
              <p className="text-[10px] text-neutral-500">Email addresses cannot be changed.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Company</Label>
              <Input 
                value={company} 
                onChange={(e) => setCompany(e.target.value)} 
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20" 
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-neutral-300">Role</Label>
              <Input 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className="bg-white/5 border-white/10 text-white focus-visible:ring-white/20" 
                placeholder="Software Engineer"
              />
            </div>
          </div>
          
        </CardContent>
        <CardFooter className="bg-white/[0.02] border-t border-white/10 px-6 py-4 flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={updateProfileMutation.isPending || !name.trim()}
            className="bg-white text-black hover:bg-neutral-200 transition-colors"
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : updateProfileMutation.isSuccess ? (
              <Check className="w-4 h-4 mr-2" />
            ) : null}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
