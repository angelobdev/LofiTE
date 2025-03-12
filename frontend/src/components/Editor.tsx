import { AnyDocumentId } from "@automerge/automerge-repo";
import { useDocument, useHandle } from "@automerge/automerge-repo-react-hooks";
import { Box, Flex, LoadingOverlay } from "@mantine/core";
import { Link, RichTextEditor } from "@mantine/tiptap";
import Highlight from "@tiptap/extension-highlight";
import SubScript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";
import { RichText } from "../model/RichText";
import * as Automerge from "@automerge/automerge/next";

export default function Editor({ docUrl }: { docUrl: AnyDocumentId }) {
  const handle = useHandle<RichText>(docUrl);
  const [doc, changeDoc] = useDocument<RichText>(docUrl);

  const [focusPosition, setFocusPosition] = useState<number>(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link,
      Superscript,
      SubScript,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: doc?.data,
    onBeforeCreate: ({ editor }) => {
      if (handle) {
        handle.on("change", (docHandle) => {
          editor.commands.setContent(
            docHandle.doc.data,
            false,
            {
              preserveWhitespace: "full",
            },
            { errorOnInvalidContent: true }
          );
        });
      }
    },
    onUpdate: ({ editor }) => {
      // Saving cursor position
      const focusPos = editor.state.selection.$from.pos;
      setFocusPosition(focusPos);

      changeDoc((doc) => {
        // doc.data = editor.getHTML();
        Automerge.updateText(doc, ["data"], editor.getHTML());
      });
    },
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setTextSelection(focusPosition);
    }
  }, [editor, focusPosition]);

  useEffect(() => {
    if (editor && handle) {
      handle.whenReady().then(() => {
        editor.commands.setContent(
          handle.docSync()!.data,
          false,
          {
            preserveWhitespace: "full",
          },
          { errorOnInvalidContent: true }
        );
      });
    }
  }, [editor, handle]);

  return (
    <>
      {handle && !handle.isReady() && (
        <Box pos="absolute" top={0} left={0} right={0} bottom={0}>
          <LoadingOverlay
            visible={true}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
          />
        </Box>
      )}
      {handle?.isReady() && (
        <Flex w="100%" h="100%" direction={"column"}>
          <RichTextEditor editor={editor} w="100%" h="100%" mb={"lg"}>
            <RichTextEditor.Toolbar sticky stickyOffset={60}>
              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Bold />
                <RichTextEditor.Italic />
                <RichTextEditor.Underline />
                <RichTextEditor.Strikethrough />
                <RichTextEditor.ClearFormatting />
                <RichTextEditor.Highlight />
                <RichTextEditor.Code />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.H1 />
                <RichTextEditor.H2 />
                <RichTextEditor.H3 />
                <RichTextEditor.H4 />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Blockquote />
                <RichTextEditor.Hr />
                <RichTextEditor.BulletList />
                <RichTextEditor.OrderedList />
                <RichTextEditor.Subscript />
                <RichTextEditor.Superscript />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Link />
                <RichTextEditor.Unlink />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.AlignLeft />
                <RichTextEditor.AlignCenter />
                <RichTextEditor.AlignJustify />
                <RichTextEditor.AlignRight />
              </RichTextEditor.ControlsGroup>

              <RichTextEditor.ControlsGroup>
                <RichTextEditor.Undo />
                <RichTextEditor.Redo />
              </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>

            <RichTextEditor.Content />
          </RichTextEditor>
          {/* <div>
            <h3>Debug</h3>
            <p>{doc?.data}</p>
          </div> */}
        </Flex>
      )}
    </>
  );
}
