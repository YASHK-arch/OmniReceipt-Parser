## Getting Started

1. Clone the repository and run `npm install`.

   > **⚠️ IMPORTANT:** If `npm` warns you about vulnerabilities, **DO NOT run `npm audit fix --force`**. This will aggressively downgrade Next.js to v9.3.3 and break the application (resulting in `next.config.ts is not supported` errors). It is safe to ignore these audit warnings for the purpose of this local review.
2. Copy `.env.example` to `.env` and add your `GOOGLE_GENERATIVE_AI_API_KEY`.
3. Run `npx prisma db push` to initialize the local SQLite database.
4. Run `npm run dev` to start the development server.

