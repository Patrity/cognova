# Frontmatter Standards

All markdown documents in the vault use YAML frontmatter for metadata. When documents are created or discovered without frontmatter, defaults are automatically added by the document sync system.

## Default Frontmatter

```yaml
---
tags: []
shared: false
---
```

## All Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tags` | string[] | `[]` | Array of tag strings for categorization |
| `shared` | boolean | `false` | Whether document is publicly accessible |
| `shareType` | string | - | When `shared: true`: `'private'` or `'public'` |
| `title` | string | - | Optional; auto-extracted from first H1 or filename |
| `project` | string | - | Project ID for document association |

## Visibility Modes

Documents support three visibility levels controlled by `shared` and `shareType`:

1. **Hidden** (default) - `shared: false`
   - Requires authentication to view
   - Never publicly accessible

2. **Private** - `shared: true, shareType: 'private'`
   - Accessible via direct link only
   - Not indexed by search engines

3. **Public** - `shared: true, shareType: 'public'`
   - Fully publicly accessible
   - Indexed by search engines

## Tag Conventions

- Use lowercase: `productivity` not `Productivity`
- Use hyphens for multi-word: `project-management`
- Limit to 3-5 tags per document
- Prefer specific over generic: `nuxt` over `programming`

## Title Extraction

The document title is determined in this order:
1. `title` field in frontmatter (if present)
2. First H1 heading in document body
3. Filename without extension

The `title` field in frontmatter is optional and only needed to override automatic extraction.
