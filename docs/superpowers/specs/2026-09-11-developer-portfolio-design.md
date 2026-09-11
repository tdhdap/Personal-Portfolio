# Developer Portfolio — Design

## Purpose

A personal developer portfolio for an AI/ML developer who also has a creative/design/writing side. It needs to showcase internships, projects, skills, and certifications, and should feel distinct from generic templated dev portfolios rather than blend into them.

## Stack

- Next.js 15 (App Router), TypeScript
- Tailwind CSS + shadcn/ui components
- Dark theme only (no light/dark toggle)
- MDX for project case studies
- Resend (email API) for the contact form
- Deployed on Vercel, initially on the free `*.vercel.app` subdomain (custom domain can be attached later with no architecture changes)
- Git repo initialized and pushed to GitHub as part of this build (required for the Vercel deploy pipeline)

## Routes

- `/` — single-page home, sections in order:
  1. Hero — name, title, tagline, resume download button
  2. About
  3. Skills + Certifications (one section, two visually distinct content types — see Content Model)
  4. Experience — all entries shown (only 2-3 total, so no featured/full split needed here)
  5. Featured Projects — 3 of the 5-8 total projects, each linking to its `/projects/[slug]` page
  6. Contact — contact form + resume download + GitHub/LinkedIn links
- `/experience` — full experience list, same entries as home but with fuller per-role detail
- `/projects` — full grid of all projects
- `/projects/[slug]` — individual project case-study page (see Case Study Structure below)

## Content Model

- `content/projects/<slug>.mdx` — one file per project.
  - Frontmatter: `title`, `slug`, `tags` (tech stack), `dates`, `links` (repo/live), `featured: boolean`, `cover` (path to cover image).
  - MDX body: a standard summary section (always visible) plus an optional expandable narrative section (see Case Study Structure).
- `data/experience.ts` — typed array: role, company, dates, description, tech tags.
- `data/certifications.ts` — typed array: name, issuer, date, credential URL.
- `data/skills.ts` — typed array grouped by category (languages, frameworks, tools).
- Project media (screenshots, diagrams) stored locally under `/public/projects/<slug>/`, rendered via `next/image`. No external image host/CDN.

Home page renders projects/experience where relevant (`featured: true` projects, all experience). The dedicated `/projects` and `/experience` pages render everything.

## Case Study Structure (differentiator: process-driven, not templated)

Each `/projects/[slug]` page shows a **standard view by default** — title, short description, tech stack, images, repo/live links — indistinguishable from a normal, well-made portfolio project page.

A **"show more" affordance** reveals additional narrative content in place (no navigation, no page change). This narrative is where the project's thinking/design/process shows up — written as flowing prose, not under literal labels like "Problem" or "Process" or "Outcome". The internal shape (problem → process → build → outcome) exists in how each piece is *written*, not as visible UI structure.

The expand/collapse mechanism itself is built generically (a simple, unstyled-for-now expand/collapse wrapper around arbitrary MDX content) rather than a fixed template, because the right presentation may differ per project (text reveal, image gallery, diagram, etc.) and that decision is deferred to a later per-project design pass. This is intentionally left flexible — do not over-build this component now.

## Signature Visual Motif (differentiator)

A persistent ambient visual element mounted in the root layout, present across all routes, serving as the site's visual signature.

- Implemented as a `<canvas>` element with `requestAnimationFrame`-driven animation — not Framer Motion, which is reserved for discrete UI transitions (section entrances, hover states) elsewhere in the app.
- Must respect `prefers-reduced-motion`: render a static (non-animated) variant when set.
- Must pause when off-screen (e.g. via `IntersectionObserver`) or when the tab is backgrounded, to avoid unnecessary battery/CPU use.
- The exact visual treatment (what it looks like, how prominent, what if anything it reacts to) is deliberately left to a later design pass (design-taste-frontend) — this spec only fixes the technical approach and constraints.

## Skills + Certifications Section

- Skills rendered as tag/pill groups by category (Languages, Frameworks, Tools).
- Certifications rendered as a visually distinct row of cards/badges below the skill pills — name, issuer, date, clickable through to the credential verification URL. Certifications must read as a different kind of claim than skill tags, not just more pills.

## Contact

A real contact form (not just `mailto:`), using `react-hook-form` + `zod` for validation, built with shadcn form components for visual consistency with the rest of the UI. Submission goes through a Next.js API route that sends the message via Resend to the site owner's inbox.

## Explicitly Out of Scope

- Notes / blog section
- Live in-browser ML demo on any project
- Analytics (Vercel Analytics or otherwise)
- Social share preview (OG) image generation, static or dynamic
- Automated test suite (unit/e2e) — CI is limited to TypeScript type-checking and ESLint before Vercel deploys; Vercel preview deployments serve as the visual verification step

## Deferred to Later Passes

- Exact visual/component design (colors, spacing, typography, component styling) — handled by the design-taste-frontend skill, not this spec.
- Per-project "show more" presentation — decided individually per project when that project's content is written.
- Custom domain — can be attached to the Vercel deployment at any time with no architectural change.
- Actual content (resume text, project write-ups, internship details, certification names) — to be provided after this plan, using realistic placeholders in the meantime.
