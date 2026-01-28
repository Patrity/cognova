---
tags: []
shared: false
---
# Editor UX Improvements

Future enhancements for the markdown editor.

## High Priority

### Code Syntax Highlighting
- Install `@tiptap/extension-code-block-lowlight` and `lowlight`
- Configure with common languages (js, ts, python, bash, etc.)

### Slash Commands
- Add `UEditorSuggestionMenu` component
- Trigger with `/` for quick formatting (headings, lists, code blocks, etc.)

### Bubble Toolbar
- Add `UEditorToolbar` with `type="bubble"`
- Shows floating toolbar on text selection for quick formatting

## Medium Priority

### Drag Handle
- Add `UEditorDragHandle` component
- Allows reordering blocks by dragging

### Task Lists
- Install `@tiptap/extension-task-list` and `@tiptap/extension-task-item`
- Enables checkbox items in markdown

## Nice to Have

### Table Support
- Install `@tiptap/extension-table` extensions
- Add table controls to toolbar

### Image Uploads
- Create custom upload handler
- Support drag & drop images

## Reference
- [Nuxt UI Editor Docs](https://ui.nuxt.com/components/editor)
- [TipTap Extensions](https://tiptap.dev/docs/editor/extensions)
