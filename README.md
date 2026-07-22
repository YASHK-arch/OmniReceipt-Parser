# OmniReceipt Parser

A lightweight, full-stack Next.js web application designed to transform photos of physical or digital receipts into structured, editable data using Groq's Vision API and Vercel AI SDK. 

## Key Product Decisions & Tradeoffs

### 1. What constitutes a "Line Item"?
**The Problem**: Receipts from platforms like Zomato or Blinkit contain numerous non-product items (delivery fees, surge pricing, GST, packing charges, etc.).
**The Decision**: "Line items" are strictly defined as purchased physical goods or food. Taxes, tips, and fees are NOT considered line items.
**Mitigation**: The system explicitly prompts the LLM (`llama-3.2-90b-vision-preview`) via Zod descriptions to exclude taxes and fees from the `lineItems` array. The side-by-side human-in-the-loop UX acts as the ultimate filter to delete any fees that slip through.

### 2. Error Handling & Malformed Output
**The Problem**: LLMs can timeout, hallucinate, or return incomplete JSON.
**The Decision**: The backend enforces a strict schema using the Vercel AI SDK and Zod. If parsing fails, the backend catches the error gracefully and returns an empty template.
**UX Impact**: Instead of crashing the app, the user is presented with a blank correction UI, allowing them to fall back to manual entry. The app gracefully degrades and never blocks the user.

### 3. Low-Confidence & The Correction UX
**Visual Cues**: A side-by-side split view ensures users don't have to bounce between windows to verify data. 
**Math Checks**: A real-time mathematical validation runs on the frontend: if the sum of all line items doesn't match the extracted Total Amount, an amber warning icon ("Math mismatch") appears, prompting the user to take a closer look at the receipt image.

### 4. Model Selection
**Choice**: `llama-3.2-90b-vision-preview` (via Groq)
**Why**: It offers incredibly fast inference speeds for vision/OCR tasks. Groq natively supports JSON structured outputs seamlessly with the Vercel AI SDK.

## Getting Started

1. Clone the repository and run `npm install`.
2. Copy `.env.example` to `.env` and add your `GROQ_API_KEY`.
3. Run `npx prisma db push` to initialize the local SQLite database.
4. Run `npm run dev` to start the development server.
