import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";

function insertLineBreak(editor: Editor): boolean {
  const { selection } = editor.state;
  if ("node" in selection && (selection as { node?: { type: { name: string } } }).node) {
    return editor.chain().setTextSelection(selection.to).setHardBreak().run();
  }
  return editor.commands.setHardBreak();
}

/**
 * Enter inserts a line break (`<br>`), matching the previous Shift+Enter
 * behavior so authors do not need a modifier key to go to the next line.
 */
export const ReportEnterToLineBreak = Extension.create({
  name: "reportEnterToLineBreak",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (insertLineBreak(this.editor)) {
          return true;
        }
        return this.editor.commands.splitBlock();
      },
    };
  },
});
