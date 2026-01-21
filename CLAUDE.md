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
# Development
bunx convex dev                    # Start Convex dev server

# Running functions
bunx convex run <function>         # Run a Convex function
bunx convex run <function> --prod  # Run against production

# Passing arguments (JSON format)
bunx convex run migrations:updateQuestionAuthorForClass '{"classId": "jn725vf213tkzqcd1y5685wd757z55df", "firstName": "Brayden", "lastName": "Dyer"}'

# Useful flags
#   --prod    Target production deployment
#   --watch   Live updates for query results
#   --push    Deploy code before running
```

### Migrations
Run migrations from `src/convex/migrations.ts`:

```bash
bunx convex run migrations:backfillAllFlagCounts
bunx convex run migrations:resetFlagCounts
bunx convex run migrations:backfillFlagCounts '{"batchSize": 50}'
```

## Tech Stack
- SvelteKit 2 with Svelte 5 (runes)
- Convex for backend/database
- TailwindCSS 4 + DaisyUI 5
- Clerk for authentication
- UploadThing for file uploads
- Google Gemini API for AI processing
