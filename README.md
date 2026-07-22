# OmniReceipt Parser

A lightweight, full-stack Next.js web application designed to transform photos of physical or digital receipts into structured, editable data using Google's Gemini Vision API and Vercel AI SDK. 

## Key Product Decisions & Tradeoffs

### 1. What constitutes a "Line Item"?
**The Problem**: Receipts from platforms like Zomato or Blinkit contain numerous non-product items (delivery fees, surge pricing, GST, packing charges, etc.).
**The Decision**: "Line items" are strictly defined as purchased physical goods or food. Taxes, tips, and fees are NOT considered line items.
**Mitigation**: The system explicitly prompts the LLM (`gemini-2.5-flash`) via Zod descriptions to exclude taxes and fees from the `lineItems` array. The side-by-side human-in-the-loop UX acts as the ultimate filter to delete any fees that slip through.

### 2. Error Handling & Malformed Output
**The Problem**: LLMs can timeout, hallucinate, or return incomplete JSON.
**The Decision**: The backend enforces a strict schema using the Vercel AI SDK and Zod. If parsing fails, the backend catches the error gracefully and returns an empty template.
**UX Impact**: Instead of crashing the app, the user is presented with a blank correction UI, allowing them to fall back to manual entry. The app gracefully degrades and never blocks the user.

### 3. Low-Confidence & The Correction UX
**Visual Cues**: A side-by-side split view ensures users don't have to bounce between windows to verify data. 
**Math Checks**: A real-time mathematical validation runs on the frontend: if the sum of all line items doesn't match the extracted Total Amount, an amber warning icon ("Math mismatch") appears, prompting the user to take a closer look at the receipt image.

### 4. Model Selection
**Choice**: `gemini-2.5-flash` (via Google Generative AI)
**Why**: Google offers an extremely generous free tier (1,500 requests per day) for Gemini 2.5 Flash, meaning no immediate quota issues or rate limits for standard use. It also boasts incredible vision OCR capabilities and natively supports structured JSON outputs through the Vercel AI SDK.

## Getting Started

1. Clone the repository and run `npm install`.
2. Copy `.env.example` to `.env` and add your `GOOGLE_GENERATIVE_AI_API_KEY`.
3. Run `npx prisma db push` to initialize the local SQLite database.
4. Run `npm run dev` to start the development server.
