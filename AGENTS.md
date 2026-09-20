# Agent Instructions

## Package Manager Policy

- Use **Bun only** for this repository.
- Do **not** use `npm`, `npx`, `yarn`, or `pnpm`.
- Use `bun run <script>` for scripts and `bunx <cli>` for binaries.

## Command Examples

- `bun install`
- `bun run dev`
- `bun run check`
- `bunx convex dev`
- `bunx convex run <function>`

## Notes

- If older comments or generated files mention `npm`/`npx`, treat them as stale and use Bun equivalents.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`src/convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
