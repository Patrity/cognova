# Second Brain

## Project Overview
Second Brain is a personal knowledge management system designed to help track tasks and documentation. It is a set of claude code rules, skills, prompts, and agents to help organize tasks across projects

## Documentation

| Document | Description |
|----------|-------------|
| [architecture.md](./docs/architecture.md) | System design, components, deployment |
| [data-models.md](./docs/data-models.md) | Database schema (Neon) |
| [skills.md](./docs/skills.md) | Custom Claude Code skills |
| [ui-wireframes.md](./docs/ui-wireframes.md) | Interface layouts and components |
| [api.md](./docs/api.md) | REST API and WebSocket specs |

## IMPORTANT: Knowledge Cutoff

Your knowledge of Nuxt 4 and Nuxt UI v4 is OUTDATED. Do NOT rely on training data for:
- Nuxt 4 APIs, directory structure, or composables
- Nuxt UI v4 component props, slots, or patterns
- Implementation examples

ALWAYS use the skills below to fetch current documentation before writing code.

## Required Skills Usage

### Before using any Nuxt composable:
```bash
python3 .claude/skills/nuxt-docs/fetch.py <topic>
# Examples: usefetch, routing, deployment, configuration
```

### Before using any Nuxt UI component:
```bash
python3 .claude/skills/nuxt-ui-docs/fetch.py <component>
# Examples: button, modal, form, dashboardsidebar
```

### Before building layouts or complex features:
```bash
python3 .claude/skills/nuxt-ui-templates/fetch.py <template> --structure
python3 .claude/skills/nuxt-ui-templates/fetch.py <template> <file_path>
# Templates: dashboard, saas, landing, chat, docs, portfolio
```

## Rules

Rules in `.claude/rules/` auto-load for relevant files:
- `nuxt4.md` - Nuxt 4 directory structure, route rules, SSR patterns
- `nuxt-ui.md` - Nuxt UI component conventions

### Global Rules
- Always update rules as new discoveries are found
- Always ask clarifying questions as needed. never assume. The user will answer as many questions as needed to provide clear direction. Take no liberties.
- Update `CLAUDE.md` to reflect new rews files
- Keep `CLAUDE.md` consice and digestable
- Always keep claude code best practices in mind, suggest new skills, rules or agents if there is a need

## Code style
- Document sensibly. We need quality, maintainable code, but not every self-descriptive variable needs a comment
- Never use semicolons in typescript
- Only use brackets on if statements, loops, etc if the following block is > 1 line of code, requiring brackets.
- Follow Nuxt4 best practices, creating/using composables as needed