import { useEffect } from "react";

interface UseGroupKeyboardShortcutsOptions {
  enabled: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

/**
 * Custom hook to handle keyboard shortcuts for grouped table operations
 * - Ctrl/Cmd + E: Expand all groups
 * - Ctrl/Cmd + Shift + C: Collapse all groups
 */
export function useGroupKeyboardShortcuts({
  enabled,
  onExpandAll,
  onCollapseAll,
}: UseGroupKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for modifier key (Ctrl on Windows/Linux, Cmd on Mac)
      const isModifierPressed = event.ctrlKey || event.metaKey;

      if (!isModifierPressed) return;

      // Expand All: Ctrl/Cmd + E
      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        onExpandAll();
        return;
      }

      // Collapse All: Ctrl/Cmd + Shift + C
      if (event.shiftKey && (event.key === "c" || event.key === "C")) {
        event.preventDefault();
        onCollapseAll();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onExpandAll, onCollapseAll]);
}
