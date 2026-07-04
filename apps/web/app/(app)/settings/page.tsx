"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">General Settings</h1>
        <p className="text-neutral-500">Manage your general account preferences.</p>
      </div>

      <Card className="bg-[#0A0A0A] border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-lg">Appearance</CardTitle>
          <CardDescription className="text-neutral-500">
            Customize the look and feel of the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-white font-medium">Dark Mode</Label>
              <p className="text-sm text-neutral-500">
                The application currently forces a dark aesthetic.
              </p>
            </div>
            <Switch checked disabled className="data-[state=checked]:bg-white" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
