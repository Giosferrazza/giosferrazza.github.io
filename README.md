# giosferrazza.github.io
Portfolio website

## Posting Checklist (Blog)
Use this flow whenever you publish a new post.

1. Duplicate template:
   - Copy `blog-post-template.html`
2. Rename file:
   - Example: `blog-kpi-design.html`
3. Update post content in the new file:
   - `<meta name="description" ...>`
   - `<h1>[Post Title]</h1>`
   - `Published [Month Year]`
   - Body paragraphs and bullet points
4. Add card on Blog index:
   - Edit `blog.html`
   - Add/update an `<article class="card">` with title, summary, and `Read` link to your new file
5. Test locally:
   - Start server: `python3 -m http.server 8000`
   - Open: `http://localhost:8000/blog.html`
6. Deploy:
   - Commit + push to GitHub Pages branch

## Updating Assets
Place these files in `assets/`.

- Profile photo:
  - Path: `assets/profile.jpg`
  - Used in Home hero section
- Favicon:
  - Path: `assets/favicon.png`
  - Used in all page tabs
- Resume PDF:
  - Path: `assets/giovanni-sferrazza-resume.pdf`
  - Used by Download Resume buttons on Home + Contact

## Common Content Updates
- Hero headline/subtitle:
  - File: `index.html`
- About + Skills sections:
  - File: `index.html`
- Projects page content:
  - File: `projects.html`
- Experience page content:
  - File: `experience.html`
- Contact form email:
  - File: `contact.html`
  - Update form action: `action="mailto:you@example.com"`

## Analytics
Google tag `G-D4QYVYDGEP` is installed in:
- `index.html`
- `projects.html`
- `experience.html`
- `blog.html`
- `contact.html`
- `blog-sql-investigation.html`
- `blog-post-template.html`
