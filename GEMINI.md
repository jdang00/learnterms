
# Gemini Codebase Guide

This document provides a set of optimized instructions for Gemini to effectively interact with the LearnTerms codebase. By following these guidelines, Gemini can understand and modify the code in a way that is consistent with the existing patterns and technologies.

## Core Technologies

- **Framework**: Svelte 5 (using the new Svelte 5 syntax, including runes)
- **UI Components**: Daisy UI 5, with a custom theme.
- **Styling**: TailwindCSS 4, with PostCSS.
- **Build Tool**: Vite
- **Language**: TypeScript
- **Authentication**: Clerk
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Generative AI (Gemini)
- **Deployment**: Vercel

## Key Architectural Patterns

- **File-based Routing**: The application uses SvelteKit's file-based routing system. Routes are defined in the `src/routes` directory.
- **Server-side Logic**: Server-side logic is handled in `+page.server.ts` and `+server.ts` files.
- **Component-based Architecture**: The UI is built with Svelte components, located in `src/lib/components` and within the `src/routes` directory.
- **State Management**: Svelte 5 runes are used for state management (e.g., `$state`, `$derived`).
- **Styling**: Utility-first CSS with TailwindCSS is the primary styling method. Daisy UI provides a component library that is customized with a theme.
- **API Routes**: API endpoints are defined in `src/routes/api`.

## Instructions for Gemini

### 1. Code Generation and Modification

- **Svelte Components**: When creating or modifying Svelte components, use Svelte 5 syntax. This includes using `$props()` for props, `$state()` for reactive state, and `$derived()` for derived state.
- **Styling**: Use TailwindCSS utility classes for all styling. Adhere to the existing design system and color palette defined in `tailwind.config.js` and the Daisy UI theme.
- **TypeScript**: Use TypeScript for all new code. Ensure that all new code is type-safe and that types are defined in `src/lib/types.ts` or locally within a component.
- **Authentication**: When working with user authentication, use the `svelte-clerk` library.
- **Database**: When interacting with the database, use the Supabase client defined in `src/lib/supabaseClient.ts`.

### 2. File Structure

- **Routes**: New pages should be created as directories in `src/routes`, with a `+page.svelte` file.
- **Components**: Reusable components should be placed in `src/lib/components`.
- **API Routes**: New API endpoints should be created in `src/routes/api`.
- **Types**: All new types should be added to `src/lib/types.ts`.

### 3. Best Practices

- **Code Style**: Adhere to the existing code style. Use the Prettier and ESLint configurations in the project to format and lint the code.
- **Component Design**: Keep components small and focused on a single responsibility.
- **State Management**: Use Svelte 5 runes for state management. Avoid complex, nested stores.
- **Error Handling**: Implement proper error handling for all API requests and other asynchronous operations.
- **Security**: Be mindful of security best practices, especially when handling user data and interacting with external APIs.

By following these instructions, Gemini can effectively contribute to the LearnTerms codebase while maintaining consistency and quality.
