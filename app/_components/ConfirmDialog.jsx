"use client";
import { CircleHelp, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Confirmation dialog. Callers pass { message, subMessage?, onConfirm, danger? }
// through `showConfirm` in SchoolApp; `danger` defaults to true because almost
// every caller is a delete. Built on shadcn AlertDialog so focus trapping,
// Escape-to-close and scroll locking come from the primitive.
export default function ConfirmDialog({ dialog, onCancel }) {
  const open = Boolean(dialog);
  const danger = dialog?.danger !== false;
  const Icon = danger ? TriangleAlert : CircleHelp;

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <AlertDialogContent className="max-w-[420px]">
        <AlertDialogHeader>
          <div className="flex items-start gap-3.5">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1.5 text-start">
              <AlertDialogTitle className="text-base leading-snug">
                {dialog?.message}
              </AlertDialogTitle>
              {dialog?.subMessage ? (
                <AlertDialogDescription className="leading-relaxed">
                  {dialog.subMessage}
                </AlertDialogDescription>
              ) : (
                // Radix warns when a dialog has no description; keep one for a11y.
                <AlertDialogDescription className="sr-only">
                  Please confirm this action.
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              danger &&
                "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30",
            )}
            onClick={() => dialog?.onConfirm?.()}
          >
            {danger ? "Delete" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
