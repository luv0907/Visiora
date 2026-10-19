#!/usr/bin/env node
/**
 * VISIORA — static blog generator. Runs after `vite build`.
 *
 * Reads Markdown posts from content/blog/*.md and writes fully static,
 * SEO-ready pages into dist/ so search engines get real HTML (the main app is a
 * client-rendered SPA, which ranks poorly):
 *   dist/blog.html               the blog index          → /blog
 *   dist/blog/<slug>.html        one page per post        → /blog/<slug>
 *   dist/blog/posts.json         post list (for n8n internal linking)
 *   dist/blog/feed.xml           RSS feed
 *   dist/sitemap.xml, dist/robots.txt
 * vercel.json has cleanUrls on, so /blog/<slug> serves blog/<slug>.html.
 *
 * A post that fails validation is skipped with a warning instead of failing the
 * build, so one bad article from an automation never takes the site down.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marked } from 'marked'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = path.join(ROOT, 'content', 'blog')
const DIST = path.join(ROOT, 'dist')
const SITE = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'https://visiora-ten.vercel.app'
).replace(/\/$/, '')
const BRAND = 'Visiora'

// Labs a post can point readers to, matched by words in its title and keywords.
const LABS = [
  { path: '/gravity', name: 'Gravity Lab', blurb: 'Drop and throw balls on Earth, the Moon, Mars and Jupiter.', words: ['gravity', 'free fall', 'falling', 'projectile', 'galileo', 'acceleration due to gravity'] },
  { path: '/motion', name: 'Motion Lab', blurb: 'Drive a car and watch its distance–time and speed–time graphs draw live.', words: ['motion', 'velocity', 'speed', 'distance', 'acceleration', 'kinematics', 'graph'] },
  { path: '/force', name: 'Force Lab', blurb: 'Push a box against friction and see F = ma happen.', words: ['force', 'friction', 'newton', 'laws of motion', 'inertia', 'mass'] },
  { path: '/light', name: 'Light Lab', blurb: 'Bend a laser through water, glass and diamond.', words: ['light', 'refraction', 'reflection', 'snell', 'lens', 'optics', 'total internal reflection'] },
  { path: '/electricity', name: 'Electricity Lab', blurb: 'Build series and parallel circuits with a live ammeter and voltmeter.', words: ['electricity', 'circuit', 'ohm', 'current', 'voltage', 'resistance', 'resistor'] },
  { path: '/board', name: 'Graph Board', blurb: 'Type any formula and see it plotted with sliders.', words: ['formula', 'equation', 'vector', 'function', 'plot'] },
]

// ── helpers ──────────────────────────────────────────────────

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const abs = p => (/^https?:\/\//.test(p) ? p : `${SITE}${p.startsWith('/') ? '' : '/'}${p}`)
const fmtDate = d => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function parseFrontmatter(raw) {
  const m = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(x => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    else v = v.replace(/^["']|["']$/g, '')
    data[kv[1]] = v
  }
  return { data, body: m[2] }
}

function loadPosts() {
  if (!fs.existsSync(CONTENT)) return []
  const posts = []
  const seen = new Set()
  for (const file of fs.readdirSync(CONTENT).sort()) {
    if (!file.endsWith('.md') || file.startsWith('_') || file.toLowerCase() === 'readme.md') continue
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(CONTENT, file), 'utf8'))
    const problems = []
    if (!data.title) problems.push('missing title')
    if (!data.description) problems.push('missing description')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) problems.push('date must be YYYY-MM-DD')
    if (!body.trim()) problems.push('empty body')
    const slug = slugify(data.slug || file.replace(/\.md$/, ''))
    if (!slug) problems.push('no usable slug')
    if (seen.has(slug)) problems.push(`duplicate slug "${slug}"`)
    if (problems.length) {
      console.warn(`[blog] skipped ${file}: ${problems.join(', ')}`)
      continue
    }
    if (String(data.draft).toLowerCase() === 'true') continue
    seen.add(slug)
    const keywords = Array.isArray(data.keywords) ? data.keywords : String(data.keywords || '').split(',').map(s => s.trim()).filter(Boolean)
    posts.push({ ...data, slug, keywords, body, file, updated: /^\d{4}-\d{2}-\d{2}$/.test(data.updated || '') ? data.updated : data.date })
  }
  // Newest first; never publish posts dated in the future.
  const today = new Date().toISOString().slice(0, 10)
  return posts.filter(p => p.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1))
}

function renderMarkdown(md) {
  const toc = []
  const used = new Set()
  const marked = new Marked({ gfm: true })
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens)
        // Plain text for the anchor and table of contents: drop tags, decode entities.
        const plain = text.replace(/<[^>]+>/g, '').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        let id = slugify(plain) || 'section'
        while (used.has(id)) id += '-x'
        used.add(id)
        // The page already has the title as its only <h1>; demote any h1 in the body.
        const level = Math.max(2, depth)
        if (level === 2) toc.push({ id, text: plain })
        return `<h${level} id="${id}">${text}</h${level}>\n`
      },
      image({ href, title, text }) {
        return `<figure><img src="${esc(href)}" alt="${esc(text)}" loading="lazy" decoding="async">${title ? `<figcaption>${esc(title)}</figcaption>` : ''}</figure>`
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens)
        const external = /^https?:\/\//.test(href) && !href.startsWith(SITE)
        return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}${external ? ' rel="noopener" target="_blank"' : ''}>${text}</a>`
      },
    },
  })
  const html = marked.parse(md)
  const words = md.replace(/[#>*_`~[\]()!-]/g, ' ').split(/\s+/).filter(Boolean).length
  return { html, toc, minutes: Math.max(1, Math.round(words / 200)) }
}

function labFor(post) {
  const hay = `${post.title} ${post.keywords.join(' ')} ${post.description}`.toLowerCase()
  let best = null
  let bestScore = 0
  for (const lab of LABS) {
    const score = lab.words.reduce((s, w) => s + (hay.includes(w) ? w.length : 0), 0)
    if (score > bestScore) { best = lab; bestScore = score }
  }
  return best
}

function related(post, all) {
  const mine = new Set(post.keywords.map(k => k.toLowerCase()))
  return all
    .filter(p => p.slug !== post.slug)
    .map(p => ({ p, score: p.keywords.filter(k => mine.has(k.toLowerCase())).length }))
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, 3)
    .map(x => x.p)
}

// ── page shell ───────────────────────────────────────────────

const CSS = `
:root{--bg:#F7F3EB;--card:#FFFFFF;--ink:#1C1713;--muted:#6D6254;--line:#E2D6C3;--accent:#936C06;--cta:#002B66;--cta-ink:#FFFFFF;--soft:#EFE8DC;--max:1180px}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif;font-size:17px;line-height:1.6}
a{color:var(--cta)}a:hover{color:#0B3F94}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:var(--max);margin:0 auto;padding:0 24px}
.skip{position:absolute;left:-999px}.skip:focus{left:16px;top:16px;background:#fff;padding:8px 12px;z-index:10}
header.site{position:sticky;top:0;z-index:5;background:rgba(247,243,235,.92);backdrop-filter:saturate(160%) blur(12px);border-bottom:1px solid var(--line)}
header.site .wrap{display:flex;align-items:center;gap:24px;height:68px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-weight:800;font-size:19px;letter-spacing:-.01em}
.brand img{width:32px;height:32px;border-radius:8px}
nav.top{display:flex;gap:22px;margin-left:auto;align-items:center}
nav.top a{color:var(--ink);text-decoration:none;font-weight:600;font-size:15px}nav.top a:hover{color:var(--accent)}
nav.top a[aria-current]{color:var(--accent)}
.btn{display:inline-flex;align-items:center;gap:8px;background:var(--cta);color:var(--cta-ink)!important;text-decoration:none;font-weight:700;font-size:15px;padding:11px 18px;border-radius:10px}
.btn:hover{background:#0B3F94}
.crumbs{font-size:14px;color:var(--muted);margin:36px 0 18px}.crumbs a{color:var(--muted);text-decoration:none}.crumbs a:hover{color:var(--ink)}
.kicker{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)}
h1,h2,h3{font-family:'Playfair Display',Georgia,serif;letter-spacing:-.01em;line-height:1.2;color:var(--ink)}
.post-head{max-width:820px}
.post-head h1{font-size:clamp(32px,4.6vw,52px);margin:10px 0 16px}
.lede{font-size:20px;line-height:1.55;color:var(--muted);margin:0 0 20px}
.meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:14px;color:var(--muted)}
.hero-img{margin:32px 0 8px;border-radius:18px;overflow:hidden;border:1px solid var(--line);background:var(--soft);aspect-ratio:16/9}
.hero-img img{width:100%;height:100%;object-fit:cover}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:56px;margin-top:40px}
.toc{position:sticky;top:96px;align-self:start;font-size:14px;border-left:2px solid var(--line);padding-left:16px}
.toc p{margin:0 0 10px;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.toc ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}.toc a{color:var(--muted);text-decoration:none}.toc a:hover{color:var(--ink)}
.prose{max-width:720px;font-size:18px;line-height:1.75}
.prose h2{font-size:30px;margin:48px 0 14px;scroll-margin-top:90px}
.prose h3{font-size:22px;margin:32px 0 10px;scroll-margin-top:90px}
.prose p{margin:0 0 20px}.prose ul,.prose ol{margin:0 0 20px;padding-left:24px}.prose li{margin:6px 0}
.prose blockquote{margin:28px 0;padding:16px 22px;border-radius:12px;background:var(--card);border:1px solid var(--line);font-size:19px}
.prose figure{margin:28px 0}.prose figure img{border-radius:14px;border:1px solid var(--line)}
.prose figcaption{font-size:14px;color:var(--muted);margin-top:8px;text-align:center}
.prose code{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.88em;background:var(--soft);padding:2px 6px;border-radius:6px}
.prose pre{background:#1C1713;color:#F7F3EB;padding:18px;border-radius:12px;overflow-x:auto}.prose pre code{background:none;padding:0;color:inherit}
.prose table{width:100%;border-collapse:collapse;margin:24px 0;font-size:16px;display:block;overflow-x:auto}
.prose th,.prose td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left}.prose th{font-weight:800}
.prose hr{border:0;border-top:1px solid var(--line);margin:40px 0}
.cta{display:flex;gap:24px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:48px 0;padding:28px;border-radius:18px;background:#1C1713;color:#F7F3EB}
.cta h2{color:#F7F3EB;margin:4px 0 6px;font-size:26px}.cta p{margin:0;color:#D9CDB8}.cta .kicker{color:#E2C17D}
.cta .btn{background:#E2C17D;color:#1C1713!important}.cta .btn:hover{background:#F0DDA8}
.related h2{font-size:28px;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px}
.card{display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;text-decoration:none;color:var(--ink);transition:transform .15s ease,box-shadow .15s ease}
.card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(28,23,19,.08);color:var(--ink)}
.card .thumb{aspect-ratio:16/9;background:var(--soft)}.card .thumb img{width:100%;height:100%;object-fit:cover}
.cover{width:100%;height:100%;display:flex;align-items:flex-end;padding:20px;background:radial-gradient(120% 90% at 85% 10%,#E2C17D 0%,rgba(226,193,125,0) 55%),linear-gradient(135deg,#1C1713 0%,#3A2E24 100%)}
.cover span{font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:700;color:#F7F3EB;text-transform:capitalize;line-height:1.1}
.card .body{padding:18px 20px 22px;display:flex;flex-direction:column;gap:8px;flex:1}
.card h3{font-size:21px;margin:0}.card p{margin:0;color:var(--muted);font-size:15px}
.card .meta{margin-top:auto;padding-top:8px}
.blog-hero{padding:56px 0 36px;max-width:760px}.blog-hero h1{font-size:clamp(36px,5vw,58px);margin:10px 0 14px}
.empty{padding:48px;border:1px dashed var(--line);border-radius:16px;text-align:center;color:var(--muted)}
footer.site{margin-top:80px;border-top:1px solid var(--line);padding:32px 0 48px;font-size:14px;color:var(--muted)}
footer.site .wrap{display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap}footer.site a{color:var(--muted)}
@media (max-width:900px){.layout{grid-template-columns:1fr}.toc{display:none}nav.top a:not(.btn){display:none}.prose{font-size:17px}.prose h2{font-size:26px}}
`

function shell({ title, description, canonical, ogImage, ogType = 'website', jsonLd = [], body, current }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:site_name" content="${BRAND}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n<meta name="twitter:image" content="${esc(ogImage)}">` : ''}
<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="alternate" type="application/rss+xml" title="${BRAND} Blog" href="${SITE}/blog/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
${jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap">
<a class="brand" href="/"><img src="/logo.png" alt="" width="32" height="32">${BRAND}</a>
<nav class="top" aria-label="Main">
<a href="/">Labs</a>
<a href="/blog"${current === 'blog' ? ' aria-current="page"' : ''}>Blog</a>
<a class="btn" href="/">Try the labs free</a>
</nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="site"><div class="wrap">
<span>© ${new Date().getUTCFullYear()} ${BRAND} — physics you can play with.</span>
<span><a href="/blog">Blog</a> · <a href="/blog/feed.xml">RSS</a> · <a href="/sitemap.xml">Sitemap</a></span>
</div></footer>
</body>
</html>
`
}

function card(p) {
  const r = renderMarkdown(p.body)
  return `<a class="card" href="/blog/${p.slug}">
<div class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.imageAlt || p.title)}" loading="lazy" decoding="async" width="640" height="360">` : `<div class="cover" aria-hidden="true"><span>${esc(p.keywords[0] || 'Physics')}</span></div>`}</div>
<div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
<div class="meta"><time datetime="${p.date}">${fmtDate(p.date)}</time><span>·</span><span>${r.minutes} min read</span></div></div>
</a>`
}

function postPage(post, all) {
  const { html, toc, minutes } = renderMarkdown(post.body)
  const url = `${SITE}/blog/${post.slug}`
  const image = post.image ? abs(post.image) : null
  const lab = labFor(post)
  const rel = related(post, all)
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      ...(image ? { image: [image] } : {}),
      datePublished: post.date,
      dateModified: post.updated,
      author: post.author ? { '@type': 'Person', name: post.author } : { '@type': 'Organization', name: BRAND, url: SITE },
      publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      ...(post.keywords.length ? { keywords: post.keywords.join(', ') } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: BRAND, item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ]
  const body = `<article class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">${BRAND}</a> › <a href="/blog">Blog</a> › <span>${esc(post.title)}</span></nav>
<div class="post-head">
${post.keywords[0] ? `<span class="kicker">${esc(post.keywords[0])}</span>` : ''}
<h1>${esc(post.title)}</h1>
<p class="lede">${esc(post.description)}</p>
<div class="meta"><span>By ${esc(post.author || `${BRAND} team`)}</span><span>·</span><time datetime="${post.date}">${fmtDate(post.date)}</time>${post.updated !== post.date ? `<span>·</span><span>Updated <time datetime="${post.updated}">${fmtDate(post.updated)}</time></span>` : ''}<span>·</span><span>${minutes} min read</span></div>
</div>
${post.image ? `<div class="hero-img"><img src="${esc(post.image)}" alt="${esc(post.imageAlt || post.title)}" width="1600" height="900" fetchpriority="high"></div>` : ''}
<div class="layout">
<div>
<div class="prose">
${html}
</div>
${lab ? `<aside class="cta" aria-label="Try it yourself"><div><span class="kicker">Try it yourself</span><h2>${esc(lab.name)}</h2><p>${esc(lab.blurb)}</p></div><a class="btn" href="${lab.path}">Open the ${esc(lab.name)}</a></aside>` : ''}
</div>
${toc.length >= 2 ? `<nav class="toc" aria-label="On this page"><p>On this page</p><ol>${toc.map(t => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : '<div></div>'}
</div>
${rel.length ? `<section class="related" aria-labelledby="more"><h2 id="more">Keep reading</h2><div class="grid">${rel.map(card).join('\n')}</div></section>` : ''}
</article>`
  return shell({
    title: `${post.title} | ${BRAND}`,
    description: post.description,
    canonical: url,
    ogImage: image,
    ogType: 'article',
    jsonLd,
    body,
    current: 'blog',
  })
}

function indexPage(posts) {
  const url = `${SITE}/blog`
  const body = `<div class="wrap">
<section class="blog-hero"><span class="kicker">The ${BRAND} blog</span><h1>Physics, explained so it sticks</h1>
<p class="lede">Clear, accurate explanations of Class 8–10 science topics — each one paired with an interactive lab you can play with.</p></section>
${posts.length ? `<div class="grid">${posts.map(card).join('\n')}</div>` : '<p class="empty">The first articles are on their way.</p>'}
</div>`
  return shell({
    title: `Blog — physics explained visually | ${BRAND}`,
    description: 'Clear, accurate explanations of Class 8–10 physics topics, each paired with an interactive lab.',
    canonical: url,
    ogImage: posts[0]?.image ? abs(posts[0].image) : `${SITE}/logo.png`,
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'Blog', name: `${BRAND} Blog`, url, blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/blog/${p.slug}`, datePublished: p.date })) }],
    body,
    current: 'blog',
  })
}

// ── write everything ─────────────────────────────────────────

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('[blog] dist/ not found — run vite build first')
    process.exit(1)
  }
  // The admin portal is built from the same code (VITE_APP_TARGET=admin). It must
  // not publish a duplicate blog, and nothing on it should be indexed.
  if (process.env.VITE_APP_TARGET === 'admin') {
    fs.writeFileSync(path.join(DIST, 'robots.txt'), 'User-agent: *\nDisallow: /\n')
    console.log('[blog] admin build: blog skipped, robots.txt disallows indexing')
    return
  }
  const posts = loadPosts()
  fs.mkdirSync(path.join(DIST, 'blog'), { recursive: true })
  for (const p of posts) fs.writeFileSync(path.join(DIST, 'blog', `${p.slug}.html`), postPage(p, posts))
  fs.writeFileSync(path.join(DIST, 'blog.html'), indexPage(posts))

  fs.writeFileSync(
    path.join(DIST, 'blog', 'posts.json'),
    JSON.stringify(posts.map(p => ({ title: p.title, slug: p.slug, url: `${SITE}/blog/${p.slug}`, description: p.description, keywords: p.keywords, date: p.date })), null, 2)
  )

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${BRAND} Blog</title><link>${SITE}/blog</link><description>Physics explained visually</description>
<atom:link href="${SITE}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${posts.slice(0, 30).map(p => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}</link><guid>${SITE}/blog/${p.slug}</guid><pubDate>${new Date(`${p.date}T00:00:00Z`).toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join('\n')}
</channel></rss>
`
  fs.writeFileSync(path.join(DIST, 'blog', 'feed.xml'), rss)

  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    { loc: `${SITE}/`, lastmod: today },
    { loc: `${SITE}/blog`, lastmod: posts[0]?.updated || today },
    ...posts.map(p => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: p.updated })),
  ]
  fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`
  )
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)

  console.log(`[blog] ${posts.length} post(s) → dist/blog (site ${SITE})`)
}

main()
