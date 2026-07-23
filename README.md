# OmniReceipt Parser

A lightweight, full-stack Next.js web application designed to transform photos of physical or digital receipts into structured, editable data using Google's Gemini Vision API and Vercel AI SDK. 

### What did you build?
I built a full-stack Next.js web application that takes an image of a physical receipt, processes it through Google Gemini's multimodal API via the Vercel AI SDK to extract structured JSON data (merchant, date, line items, currency, and total), and saves the validated records to a SQLite database using Prisma. The application includes a React frontend that allows users to upload images or select from a library of integrated test cases, view the parsed data alongside a built-in image clarity confidence score, edit the fields to correct LLM hallucinations, and save the final record to a persistent history log.

### What are the biggest tradeoffs you made, and why?
1. **Using SQLite with Prisma vs. a Hosted Database:** For this take-home project, I opted for a local SQLite database (`dev.db`). While this breaks persistency if deployed to Vercel's serverless environment, it drastically simplified local setup and review for the hiring team by not requiring them to provision external Postgres credentials or run Docker containers.

2. **Heavy reliance on Client-Side state for Test Cases:** The test case folders (`good_testcases`, `low_quality_edge_testcases`) are exposed via the `public` directory, and their structure is hardcoded in the frontend rather than dynamically parsed via Node.js `fs`. This tradeoff sacrificed some flexibility but eliminated the need for complex API routes or SSR just to read file directories, keeping the frontend fast and decoupled.

3. **Forcing categorical Enums over Continuous Values:** Instead of just returning a raw confidence score (0-100), the LLM is forced by Zod to output a categorical `imageQualityStatus` enum (e.g., "Poor", "Moderate"). This adds artificial constraints to the LLM but makes rendering conditional UI (like the slide-out Analysis Log warnings) much safer and type-predictable on the frontend compared to trusting raw LLM text output.





### Where did you use an LLM, and for what?

- **During Development:** I used an IDE(Cursor) throughout the development process. Specifically, I used the AI agent to build the frontend UI, set up the Prisma schema and SQLite connection, implement the `Zod` parsing schema for structured LLM outputs, write the API route handlers.

- I designed the History section myself, how pop-ups should be displayed? What data should be displayed in History?

- I architectured the Fallback logic myself, I decided the edge cases, stuctured them into categories, then I designed the Confidence score logic and a Analysis logging system and added categorical enums(discussed in tradeoffs).
How the Pop-ups should work when there is High confidence score, when confidence score is average, and when score is critically low, should it show the breakdown of how the score was calculated, should it show something else?

- I made the sample good and bad testcases containers myself, with auto-upload feature on clicking and made ui fixes like disabling other reciept options until the first one gets analyzed completely to prevent rate-limit issues.






### What would you do with another week?
- **Move to a robust, hosted Database:** Migrate from SQLite to Vercel Postgres or Supabase to support actual cloud deployment without data loss.

- **Client-side Image Compression:** Implement an image compression library (like `browser-image-compression`) before the `FormData` upload to ensure high-resolution smartphone photos don't breach Vercel's strict 4.5MB serverless payload limit.

- **Authentication & Multi-tenant Data:** Add NextAuth to allow users to sign in and securely save receipts to their own accounts rather than a global history log.

- **Application Version:** I would make the site fully responsive (currently it is made only for desktop), add a direct photo-taking feature instead of upload-only, and convert the app into a PWA (Progressive Web App) so that it can be installed on mobile devices.

- **Multi-Image Feature:** Add support for multi-image uploads and parsing of multiple receipts at once. This is especially important when receipts are too long to fit in a single frame.

- **PDF Parsing:** Add support for parsing PDF files (designed taking into account that nowadays most receipts are generated digitally and are received in PDF format).


### What's one thing in this spec you'd push back on if I were your PM?
If the spec assumes that extracting strictly "purchased physical goods" as `lineItems` is sufficient to validate the `totalAmount`, I would push back heavily. By excluding taxes, tips, and delivery fees from the extracted data, it becomes mathematically impossible to validate the total amount against the sum of the line items. The system should extract *all* financial line items (including tax/tip) and explicitly categorize them, so we can run a reliable arithmetic check (`sum(items) + tax + tip = total`). Currently, the app warns the user about a "Math Mismatch," but the mismatch is practically guaranteed on any receipt that includes tax, creating a poor and confusing user experience.

## Getting Started

1. Clone the repository and run `npm install`.
2. Copy `.env.example` to `.env` and add your `GOOGLE_GENERATIVE_AI_API_KEY`.
3. Run `npx prisma db push` to initialize the local SQLite database.
4. Run `npm run dev` to start the development server.
