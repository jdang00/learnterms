# LearnTerms

LearnTerms is an open-source study platform for health-professions cohorts. Students practice with course-aligned questions and custom tests; student and faculty curators build and maintain the shared question bank.

The project began as a medical terminology study tool for the Northeastern State University Oklahoma College of Optometry Class of 2028. It has since grown into a platform for organizing course content, studying, and reviewing progress.

[Visit LearnTerms](https://learnterms.com) · [Explore features](https://learnterms.com/features) · [Pricing](https://learnterms.com/pricing)

## What you can do

- **Study by course and module:** practice multiple-choice, multiple-select, fill-in-the-blank, matching, and free-response questions with explanations and source references.
- **Build practice tests:** select course material and practice with a timed test.
- **Review your work:** revisit missed or flagged questions, add notes and highlights, and track progress.
- **Curate content:** organize classes and modules, edit questions, and manage course documents for a cohort.
- **Draft questions with AI:** Question Studio helps curators generate source-grounded drafts for review before they are saved. AI output still needs human review.

Student access is free; the hosted service also offers a paid curator plan. See the [pricing page](https://learnterms.com/pricing) for current details. The source code is available under the [MIT License](LICENSE); running your own instance requires external services and may incur costs.

## Technology

The frontend uses SvelteKit 3, Svelte 5, TypeScript, Tailwind CSS 4, and shadcn-svelte components. Convex provides the database, server functions, and reactive data; Clerk handles authentication. Course documents and question media use Cloudflare R2, while AI workflows use OpenAI, OpenRouter, and Datalab. The hosted app deploys to Vercel.

## Local development

### Prerequisites

- [Bun](https://bun.sh/) 1.3.5, as specified in `package.json`.
- Node.js 22.17 or later; SvelteKit tooling runs under Node.
- A Convex development deployment and a Clerk application. Optional features require additional service configuration described below.

Use Bun for dependency installation and project commands.

```sh
bun install --frozen-lockfile
```

Configure your own development services before starting the app:

1. Run `bun run dev:convex` and follow the Convex CLI prompts to connect a development deployment. Keep this process running to sync backend changes.
2. Configure a Clerk JWT template named `convex`, and set `PUBLIC_CLERK_FRONTEND_API_URL` on the Convex deployment to your Clerk frontend API URL. The Convex auth configuration uses that URL and the `convex` application ID.
3. Set the following in a local environment file such as `.env.local` for the SvelteKit app:

   ```dotenv
   PUBLIC_CONVEX_URL=<your-convex-deployment-url>
   PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
   CLERK_SECRET_KEY=<your-clerk-secret-key>
   ```

4. In another terminal, run `bun run dev` and open the local URL printed by Vite.

Use development credentials and keep secrets out of Git. A new deployment also needs its own cohort, class, and user data; connecting the services alone does not copy production content or grant curator access. This setup describes the required integration points and has not yet been verified from a clean clone.

### Feature-specific services

Configure these on the Convex deployment when working on the corresponding features:

| Feature                              | Configuration                                                                                                                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document and question-image storage  | Cloudflare R2: `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. Browser uploads also need bucket CORS configured for the app origin. See [question image uploads](docs/question-image-uploads.md). |
| AI question generation and retrieval | `OPENAI_API_KEY` and `OPENROUTER_API_KEY`, depending on the workflow.                                                                                                                                                         |
| Document OCR                         | `DATALAB_API_KEY`.                                                                                                                                                                                                            |
| Hosted subscriptions                 | Polar integration and product configuration; see `src/convex/polar.ts`.                                                                                                                                                       |

## Commands

| Command               | Purpose                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `bun run dev`         | Start the SvelteKit development server.                             |
| `bun run dev:convex`  | Run the Convex development sync.                                    |
| `bun run build`       | Build the app.                                                      |
| `bun run verify`      | Run Svelte and Convex checks, lint, and all tests; also used by CI. |
| `bun run verify:fast` | Run checks and lint without tests.                                  |
| `bun run test:unit`   | Run Bun unit tests.                                                 |
| `bun run test:convex` | Run Convex tests.                                                   |
| `bun run test:state`  | Run state and auth tests.                                           |

## Project structure

```text
src/routes/                  SvelteKit pages and server loads
src/lib/components/          Shared study UI and component primitives
src/lib/admin/               Curator and administration components
src/convex/                  Schema, backend functions, AI workflows, and migrations
tests/                       Bun unit tests
convex-tests/                Convex and authorization tests
docs/                        Feature and operational documentation
scripts/                     Backfills, evaluations, and maintenance tools
```

The development-only `/design-system` route documents shared UI components and feature showcases. See [AGENTS.md](AGENTS.md) for project conventions and [the backfill guide](scripts/BACKFILL_README.md) for migration procedures.

## Contributing

Issues, feedback, and contributions are welcome. For code changes, use Bun, follow the project conventions in [AGENTS.md](AGENTS.md), and run `bun run verify` before opening a pull request. CI runs the same verification command on pull requests and pushes to `main`.

## License

LearnTerms is licensed under the [MIT License](LICENSE).
