# Frontmatter Standards

## Required Fields

Every note should have:

```yaml
---
title: Human-readable title
created: 2024-01-15
tags: [topic, category]
---
```

## Optional Fields

```yaml
---
updated: 2024-01-20      # Last modification
status: draft|active|archived
project: project-name    # Link to project
due: 2024-02-01          # For actionable notes
source: URL or reference # For external content
---
```

## Tag Conventions

- Use lowercase: `#productivity` not `#Productivity`
- Use hyphens for multi-word: `#project-management`
- Limit to 3-5 tags per note
- Prefer specific over generic: `#nuxt` over `#programming`

## Status Values

| Status | Meaning |
|--------|---------|
| `draft` | Work in progress |
| `active` | Current and maintained |
| `review` | Needs updating |
| `archived` | No longer relevant |
