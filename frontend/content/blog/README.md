# Blog posts

Each file here (except this README and files starting with `_`) becomes a page at
`/blog/<slug>`. The pages are generated at build time by `scripts/build-blog.mjs`,
so every push to `main` publishes them on Vercel.

## File format

`content/blog/<slug>.md`:

```markdown
---
title: Do heavier objects fall faster? Galileo's free-fall idea, explained
description: One or two sentences, 120–160 characters — this is the Google snippet.
date: 2026-10-19
keywords: [free fall, gravity, Class 9 physics]
image: /blog/images/do-heavier-objects-fall-faster.webp
imageAlt: A bowling ball and a basketball falling side by side
author: Visiora team
---

Article body in Markdown. Use ## for sections (they become the table of contents).
Don't add a # title — the page already shows `title` as its heading.
```

| Field | Required | Notes |
|---|---|---|
| `title` | yes | Used for the page title and heading. |
| `description` | yes | Meta description and social preview text. |
| `date` | yes | `YYYY-MM-DD`. Posts dated in the future stay hidden until that day. |
| `keywords` | no | `[a, b, c]` or `a, b, c`. The first one is shown as the category; they drive related posts and which lab is suggested. |
| `slug` | no | Defaults to the file name. |
| `image` | no | Put the file in `public/blog/images/` and reference it as `/blog/images/<file>`. Prefer WebP or JPEG under ~300 KB. |
| `imageAlt` | no | Describe the image for screen readers and Google Images. |
| `updated` | no | `YYYY-MM-DD`, shown as "Updated" and used in the sitemap. |
| `author` | no | Defaults to "Visiora team". |
| `draft` | no | `true` keeps the post off the site. |

A post with a missing or invalid required field is skipped with a warning in the build
log; the rest of the site still deploys.

## Generated files

- `/blog` and `/blog/<slug>`: static HTML with meta, Open Graph and Article structured data
- `/blog/posts.json`: list of published posts (used by the n8n workflow for internal links)
- `/blog/feed.xml`: RSS
- `/sitemap.xml`, `/robots.txt`
