"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  PencilIcon,
  SaveIcon,
  LoaderIcon,
  CheckIcon,
  XIcon,
  EyeIcon,
  CodeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MotionPreset } from "@/components/ui/motion-preset";

export function DocsEditSheet({
  filePath,
  rawContent,
}: {
  filePath: string;
  rawContent: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(rawContent);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  const handleSave = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/docs/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, content }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("saved");
      setTimeout(() => {
        setStatus("idle");
        router.refresh();
      }, 800);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [filePath, content, router]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setContent(rawContent);
    setStatus("idle");
  }, [rawContent]);

  const dirty = content !== rawContent;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted cursor-pointer"
      >
        <PencilIcon className="size-3" />
        Edit locally
      </button>
    );
  }

  return (
    <MotionPreset fade slide={{ direction: "up", offset: 20 }} delay={0} inView={false}>
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div className="flex items-center gap-3">
            <CodeIcon className="size-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">
              {filePath}
            </span>
            {dirty && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                Unsaved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={!dirty || status === "saving"}
              size="sm"
              variant={status === "saved" ? "outline" : "default"}
            >
              {status === "saving" && (
                <LoaderIcon className="size-3.5 animate-spin" />
              )}
              {status === "saved" && <CheckIcon className="size-3.5 text-emerald-500" />}
              {(status === "idle" || status === "error") && (
                <SaveIcon className="size-3.5" />
              )}
              {status === "saving"
                ? "Saving..."
                : status === "saved"
                  ? "Saved"
                  : status === "error"
                    ? "Failed — retry"
                    : "Save"}
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
            >
              <XIcon className="size-3.5" />
              Close
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (status === "saved" || status === "error") setStatus("idle");
            }}
            spellCheck={false}
            className="h-full w-full resize-none border-none bg-muted/50 p-6 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex h-10 shrink-0 items-center justify-between border-t px-6 text-xs text-muted-foreground">
          <span>
            {content.split("\n").length} lines · {content.length.toLocaleString()} chars
          </span>
          <span>
            Dev mode only · Changes saved to disk
          </span>
        </div>
      </div>
    </MotionPreset>
  );
}
