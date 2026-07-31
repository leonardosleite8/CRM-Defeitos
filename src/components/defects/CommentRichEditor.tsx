"use client";

import { useImperativeHandle, useRef, forwardRef, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { uploadFileWithProgress, buildCommentMediaPath } from "@/lib/upload";

export type CommentEditorHandle = {
  getHTML: () => string;
  getText: () => string;
  clear: () => void;
};

type Props = {
  boardId: string;
  cardId: string;
  initialHTML?: string;
};

export const CommentRichEditor = forwardRef<CommentEditorHandle, Props>(function CommentEditor(
  { boardId, cardId, initialHTML = "" },
  ref,
) {
  const editorRef = useRef<Editor | null>(null);

  const handlePaste = useCallback(
    (_view: unknown, event: ClipboardEvent) => {
      const ed = editorRef.current;
      if (!ed) return false;
      const items = event.clipboardData?.items;
      if (!items?.length) return false;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.kind === "file" && it.type.startsWith("image/")) {
          event.preventDefault();
          const file = it.getAsFile();
          if (!file) continue;
          const path = buildCommentMediaPath(boardId, cardId, file);
          void uploadFileWithProgress(file, path, () => {})
            .then(({ publicUrl }) => {
              ed.chain().focus().setImage({ src: publicUrl, alt: "Imagem" }).run();
            })
            .catch(() => {
              /* silencioso: opcional mostrar toast */
            });
          return true;
        }
      }
      return false;
    },
    [boardId, cardId],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        bulletList: { HTMLAttributes: { class: "list-disc pl-4" } },
        orderedList: { HTMLAttributes: { class: "list-decimal pl-4" } },
      }),
      Image.configure({ inline: true, allowBase64: false }),
    ],
    content: initialHTML || "",
    immediatelyRender: false,
    editorProps: {
      handlePaste: (view, event) => handlePaste(view, event as ClipboardEvent),
    },
  });

  editorRef.current = editor;

  useImperativeHandle(
    ref,
    () => ({
      getHTML: () => editor?.getHTML() ?? "",
      getText: () => editor?.getText({ blockSeparator: "\n" }) ?? "",
      clear: () => {
        editor?.commands.clearContent();
      },
    }),
    [editor],
  );

  if (!editor) {
    return <div className="min-h-[120px] rounded-md border border-slate-200 bg-slate-50" aria-hidden />;
  }

  return (
    <div className="rounded-md border border-slate-300 bg-white">
      <EditorContent
        editor={editor}
        className="comment-editor max-h-48 min-h-[120px] overflow-y-auto px-2 py-1.5 text-sm text-slate-800 [&_.ProseMirror]:min-h-[100px] [&_.ProseMirror]:outline-none [&_img]:max-h-32 [&_img]:cursor-pointer [&_img]:rounded"
      />
      <p className="border-t border-slate-100 px-2 py-1 text-[10px] text-slate-500">
        Dica: use <strong>Ctrl+V</strong> para colar capturas de tela; a imagem sobe automaticamente.
      </p>
    </div>
  );
});

CommentRichEditor.displayName = "CommentRichEditor";
