---
name: pages-cms-architecture
description: Build and update React/Vite UI components strictly on top of the repository's Pages CMS configuration (.pages.yml) and CMS-managed content files. Use whenever creating pages, tabs, cards, or data loaders for the Living Lab website.
---

# Pages CMS-Driven Frontend Architecture

This site is a static Vite + React + TypeScript + Tailwind CSS application where non-technical lab managers manage all website content through **Pages CMS** (`.pages.yml`).

## 1. Core Architecture & Exact Content Map

1. **Inspect `.pages.yml` First:** Before building or editing any page, component, or data loader, read `.pages.yml` at the repo root to verify exact collection paths, field names, media outputs, and select values.
2. **Never Hard-Code Site Content:** Do not hard-code projects, team members, events, or news inside `.tsx` components. Always load content from the paths defined in `.pages.yml`:
   - **Folder Collections** (load with `import.meta.glob('/<path>/*.json', { eager: true })`):
     - `projects/` (`title`, `status`, `authors`, `guest_authors`, `description`, `thumbnail`, `project_type`, `live_link`, `html_file`)
     - `team/` (`name`, `status`, `role`, `focus`, `bio`, `photo`, `link`)
     - `news/` (`title`, `status`, `date`, `authors`, `guest_authors`, `image`, `summary`, `body`)
   - **Single-File Array** (import directly as a JSON array):
     - `events.json` (`title`, `status`, `date`, `location`, `summary`, `sample`)
   - **Media Outputs:** Render uploaded assets using the output URLs saved by Pages CMS (`/media/projects`, `/media/team`, `/media/events`, `/media/news`, `/media/penn_brand`, `/projects/html`).

## 2. Data Safety & Defensive Rendering

- **Protect Real CMS Content:** Never edit, rename, or delete real `.json` entries or uploaded media created by lab managers inside `projects/`, `team/`, `news/`, `events.json`, or `media/` while refactoring frontend code. Never leave dummy or test JSON files behind.
- **Filter Unpublished Entries Strictly:** Only render entries where `status === 'published'`. Never expose `status === 'hidden'` items anywhere in the public UI.
- **Handle Missing Fields & Empty Collections Gracefully:** Lab managers frequently leave optional fields blank (`photo`, `bio`, `link`, `thumbnail`, `image`, `guest_authors`, `location`, `summary`). Always use optional chaining, clean fallbacks (e.g., an initials avatar when `photo` is missing; plain text name when `link` is empty), and intentional empty states if a collection has zero published entries—never fall back to hard-coded placeholder items.
- **Compute Dynamic & Sorted Views from CMS Data:**
  - **Homepage "Next Event":** Compute dynamically by filtering published `events.json` entries with `date >= today` and sorting ascending by `date`.
  - **Chronological & Grouped Ordering:** Sort `news` descending by `date`, sort `events` chronologically rather than by array order, and group `team` in exact role order: `Leadership Team`, `Participating Faculty`, `Current Lab Members`, `Lab Alumni`.

## 3. Field-Specific Rendering Rules

- **Projects (`project_type`):** Treat `project_type` (`app` vs. `html`) as the absolute source of truth—even if both fields contain values. Use `live_link` only when `project_type === 'app'`, and `html_file` only when `project_type === 'html'`. Follow the `.pages.yml` behavior (opening the selected link/HTML file in a new tab, or providing an "Open in new tab" fallback if embedded).
- **Authors (`projects` & `news`):** Combine `authors` (array of Team member names) and `guest_authors` (array of {name, photo?}) cleanly, handling cases where either or both arrays are missing or empty.
- **Team & News Rich Text:** Render `team.bio` and `news.body` (`rich-text` Markdown strings) with a Markdown renderer styled for dark mode. Link a team member's name to `link` when present.

## 4. Pages CMS Schema & Media Guardrails

- **Schema-First Updates:** When a requested UI feature needs new fields or tabs, update `.pages.yml` first with plain-language `label` and `description` hints before editing React components.
- **Keep Navigation Decoupled from Collections:** Grouping frontend pages under dropdowns (e.g., "Media and Events" or "About Us") must never merge their underlying `.pages.yml` collections—keep `events`, `news`, `podcasts`, `publications`, etc. as separate entries with tailored fields.
- **Valid Pages CMS Syntax Only:**
  - Use exact field types (`rich-text` with a hyphen, `string`, `text`, `select`, `image`, `file`, `reference`, `boolean`, `date`).
  - Avoid putting `required: true` on non-text/custom inputs (`rich-text`, `image`, `file`, `reference`, or `select` fields without a `default`) to prevent `n.focus is not a function` save errors in Pages CMS.
  - Never use unsupported `when:` conditional blocks or `collapsible` objects on top-level `type: file` entries.
  - Only add `view:` blocks (`primary`, `fields`, `sort`, `default`) to `type: collection` entries, never to `type: file`.
- **No Large Binary Uploads:** Never create `type: file` upload fields for videos (`.mp4`) or podcast audio (`.mp3`). Always use external URL `type: string` fields (YouTube, Vimeo, Spotify) and render them as embeds to prevent GitHub repository bloat.

## 5. Visual Consistency

- Preserve the site's dark-mode Tailwind aesthetic (`#0f1219` page background, `#0b2559` hero accents, `#151b2b` card surfaces, clean responsive grids) unless explicitly asked to redesign a section.