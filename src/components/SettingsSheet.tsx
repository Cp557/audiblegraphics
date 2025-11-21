"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/contexts/SettingsContext";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { 
    autoplayAudio, 
    setAutoplayAudio, 
    autoSwitchSlide, 
    setAutoSwitchSlide,
    darkMode,
    setDarkMode
  } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Dark Mode Setting */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="dark-mode" className="text-sm font-medium">
                Dark Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Use dark background for slides and videos
              </p>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>

          {/* Autoplay Audio Setting */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="autoplay-audio" className="text-sm font-medium">
                Autoplay audio
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically play audio when entering a slide
              </p>
            </div>
            <Switch
              id="autoplay-audio"
              checked={autoplayAudio}
              onCheckedChange={setAutoplayAudio}
            />
          </div>

          {/* Auto Switch Slide Setting */}
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="auto-switch-slide"
                className="text-sm font-medium"
              >
                Auto switch slide on audio end
              </Label>
              <p className="text-sm text-muted-foreground">
                Move to the next slide when audio playback finishes
              </p>
            </div>
            <Switch
              id="auto-switch-slide"
              checked={autoSwitchSlide}
              onCheckedChange={setAutoSwitchSlide}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
