# LearnTerms - Claude Code Notes

## Package Manager
Use **bun** exclusively. Never use npm or yarn.

```bash
bun install           # Install dependencies
bun add <package>     # Add a package
bun remove <package>  # Remove a package
bun run <script>      # Run package.json scripts
bunx <command>        # Execute packages (replaces npx)
```

## Key Commands
- `bun run dev` - Start SvelteKit dev server
- `bun run dev:convex` - Start Convex dev server
- `bun run build` - Production build
- `bun run check` - TypeScript/Svelte checks

## Convex CLI
Always use `bunx` instead of `npx` for Convex commands:

```bash
bunx convex dev                    # Start Convex dev server
bunx convex run <function>         # Run a Convex function
bunx convex run migrations:backfillAllFlagCounts  # Example migration
```

## Tech Stack
- SvelteKit 2 with Svelte 5 (runes)
- Convex for backend/database
- TailwindCSS 4 + DaisyUI 5
- Clerk for authentication
- UploadThing for file uploads
- Google Gemini API for AI processing
