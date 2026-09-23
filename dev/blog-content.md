# Blog content

The blog uses local Svelte articles and a shared reading layout. It has no CMS or database dependency.

- Index: `src/routes/blog/+page.svelte`
- Metadata, dates, summaries, and old URL aliases: `src/lib/content/blog.ts`
- Article bodies: `src/lib/components/blog/`
- Article lookup and redirects: `src/routes/blog/[slug]/+page.server.ts`
- Shared article layout and component map: `src/routes/blog/[slug]/+page.svelte`
- Public metadata and sitemap discovery: `src/lib/seo.ts`

To add a post, create its article component, add metadata at the top of `blogPosts`, and register the component in the shared page's `articles` map. Use the publication date for a new article. Set `archived` only for restored historical posts. Unknown slugs return 404; legacy slugs redirect permanently.

## Restored posts

Recovered from Git at the existing `HEAD` under `src/lib/archive/blog/`. Those files had already been deleted from the working tree; the restoration does not undo those deletions.

- `LearnTerms 1.0/+page.svelte`
- `LENS/+page.svelte`
- `LearnTerms v2 Beta/+page.svelte`
- `LearnTerms v2/+page.svelte`

The original article prose is retained. Old page wrappers, oversized graphics, repeated author blocks, and presentation classes were removed. Screenshots and document links are retained. Retired `/terms` (formerly terminology decks, now legal terms) and `/student-of-the-week` links were converted to ordinary text. The old changelog link uses the current internal route.

Dates use the original archive index, corroborated by release history. The v2 and beta article headings incorrectly said 2024; the corresponding commits and index date them to 2025. The 1.0 index and release commit use September 23, 2024, while the article heading said September 22. Visible archive notes explain these discrepancies.

## V3 article

`VersionThree.svelte` is a new retrospective dated September 22, 2026, written in the direct first-person tone of the About page. Its scope comes from the user's release notes:

https://github.com/jdang00/learnterms/releases/tag/v3

GitHub's publication timestamp is March 20, 2026 (UTC). The article does not backdate its own publication or describe later free-response, source-citation, or mastery additions as part of the original release. The campus image was supplied by the user and is stored in `src/lib/assets/blog/nsu-optometry-campus.png`.
