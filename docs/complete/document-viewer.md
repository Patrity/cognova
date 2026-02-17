---
tags: []
shared: false
---
# Public Document Viewer

## Overview

The `/view/[uuid]` route allows documents to be shared publicly based on their visibility settings. Documents can be shared via direct link without requiring authentication.

## Access Control

| Visibility | Setting | Who Can View |
|------------|---------|--------------|
| Hidden | `shared: false` | Owner only (requires auth) |
| Private | `shared: true, shareType: 'private'` | Anyone with the link |
| Public | `shared: true, shareType: 'public'` | Anyone, indexed by search engines |

### Access Control Flow

```
Request to /view/:uuid
    ↓
Fetch /api/documents/:id/public
    ↓
Check if document exists → 404 if not found
    ↓
Check if user is owner → Allow if yes
    ↓
Check shared flag → 403 if false
    ↓
Allow access (private or public)
```

## Routes

### Page Route

- **URL**: `/view/:uuid`
- **Layout**: `view` (minimal header + footer)
- **Auth**: Not required (public route)

### API Endpoint

`GET /api/documents/:id/public`

**Response:**
```typescript
{
  data: {
    document: {
      id: string
      title: string
      path: string
      fileType: 'markdown' | 'binary'
      shared: boolean
      shareType: 'public' | 'private' | null
      createdAt: Date
    }
    content: string | null  // null for binary files
    isOwner: boolean
  }
}
```

**Error Codes:**
- `400` - Invalid document ID format
- `403` - Document is not shared
- `404` - Document not found or deleted

## SEO

Uses `useSeoMeta` with dynamic `robots` meta tag:

- **Public documents** (`shareType: 'public'`): `index, follow`
- **Private/hidden documents**: `noindex, nofollow`

This ensures only intentionally public content is indexed by search engines.

## Components

### ViewToc

Custom table of contents component that:
- Accepts `links: TocLink[]` from MDC's `parseMarkdown()` output
- Uses IntersectionObserver for active heading highlighting
- Smooth scrolls to headings on click
- Supports nested headings with indentation

### Layout

The `view` layout provides:
- Header with logo and color mode toggle
- Footer with "Shared via Cognova" text and GitHub link
- No authentication UI (public-facing)

## File Locations

| File | Purpose |
|------|---------|
| `server/api/documents/[id]/public.get.ts` | Public API with access control |
| `server/middleware/auth.ts` | Auth bypass for `/view` and public API |
| `app/layouts/view.vue` | Minimal layout with header/footer |
| `app/pages/view/[uuid].vue` | Main viewer page |
| `app/components/view/ViewToc.vue` | Table of contents |
| `shared/types/index.ts` | TocLink, PublicDocumentResponse types |

## Usage

### Sharing a Document

1. Open document in the editor
2. In the metadata panel, set visibility to "Private" or "Public"
3. Copy the view URL: `/view/{document-id}`
4. Share the link

### Viewing a Shared Document

1. Navigate to `/view/{document-id}`
2. If authorized, document renders with TOC sidebar
3. If unauthorized, shows "Access Denied" with login option

### Non-Markdown Files

Binary files (images, PDFs, etc.) show a friendly error:
> "Only markdown content is supported for now. Other file types coming soon! 🚀"

## Technical Notes

- Uses `@nuxtjs/mdc` for markdown rendering (NOT Nuxt Content)
- TOC generated client-side via `parseMarkdown()` from MDC runtime
- Prose styling applied via Tailwind typography plugin
- Mobile-responsive: TOC hidden on small screens

## Related Documentation

- [Document Metadata](./document-metadata.md) - Frontmatter and metadata system
- [Authentication](./auth.md) - BetterAuth configuration
