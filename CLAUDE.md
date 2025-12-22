# LearnTerms - Claude Code Notes

## Package Manager
Use **bun** for all package management (not npm/yarn).

```bash
bun install           # Install dependencies
bun add <package>     # Add a package
bun remove <package>  # Remove a package
bun run dev          # Start dev server
```

## Key Commands
- `bun run dev` - Start SvelteKit dev server
- `bun run dev:convex` - Start Convex dev server
- `bun run build` - Production build
- `bun run check` - TypeScript/Svelte checks

## Tech Stack
- SvelteKit 2 with Svelte 5 (runes)
- Convex for backend/database
- TailwindCSS 4 + DaisyUI 5
- Clerk for authentication
- UploadThing for file uploads
- Google Gemini API for AI processing
