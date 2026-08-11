"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useState } from "react";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const {
    geminiApiKey,
    setGeminiApiKey,
    clearGeminiApiKey,
  } = useSettings();
  const [apiKeyDraft, setApiKeyDraft] = useState(geminiApiKey);

  const saveApiKey = () => {
    setGeminiApiKey(apiKeyDraft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogTitle className="sr-only">Gemini API key</DialogTitle>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-api-key" className="text-sm font-medium">
              Gemini API key
            </Label>
            <Input
              id="gemini-api-key"
              type="password"
              value={apiKeyDraft}
              onChange={(event) => setApiKeyDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && apiKeyDraft.trim()) saveApiKey();
              }}
              placeholder="Paste your Gemini API key"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-sm text-muted-foreground">
              Stored only for this browser tab and sent only when you generate.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              {geminiApiKey && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearGeminiApiKey();
                    setApiKeyDraft('');
                  }}
                >
                  Clear
                </Button>
              )}
              <Button type="button" onClick={saveApiKey} disabled={!apiKeyDraft.trim()}>
                Save key
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
