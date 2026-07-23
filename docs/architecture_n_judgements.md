# Architecture & Judgments

![alt text](<diagram (3).png>)

## System Architecture

The application is built as a **Full-Stack Next.js (App Router)** application, designed for a seamless, decoupled flow between the client UI, the AI parsing engine, and the database.

1. **Frontend (Client UI):** Built with React and Tailwind CSS. The UI handles state management for file uploads, selecting built-in test cases, rendering the extracted receipt data into editable form fields, and displaying conditional alerts based on validation rules (like math mismatch warnings).
2. **AI Extraction API (`/api/parse`):** A Next.js serverless route. When an image is uploaded, it is sent to **Google's `gemini-2.5-flash`** model. I utilize the **Vercel AI SDK (`@ai-sdk/google`)** in combination with **Zod** schemas. This forces the LLM to output strictly typed JSON, eliminating unpredictable string parsing on the frontend.
3. **Database & Persistence (`/api/receipts`):** Once the user verifies and edits the extracted data, the payload is sent to the persistence layer. I used **Prisma ORM** connected to a local **SQLite** database (`dev.db`). This layer handles schema validation, relationships (one receipt to many line items), and data storage for the History view.

---

## Technical Judgments

### What is a line item? Where do you draw the line? Does it matter?
I drew the line strictly at **purchased physical goods**. I instructed the LLM via the prompt and schema to deliberately exclude structural fees like taxes, tips, delivery fees, and surge pricing from the `lineItems` array. 

Yes, it absolutely matters. Mixing metadata (like a $2 tip or a $1 state tax) into the physical item array ruins down-stream analysis for the consumer (e.g., historical price tracking of a gallon of milk). The tradeoff here is that the sum of the line items almost never matches the `totalAmount` on standard receipts, which constantly triggers my UI's "Math Mismatch" warning. I defend this tradeoff because it forces the user to manually verify if the missing amount is a standard tax or if the LLM hallucinated an item, ensuring much higher long-term data integrity.

### What happens when the LLM returns malformed output?
At the application layer, returning malformed output is virtually impossible due to the architecture. By using the Vercel AI SDK's `generateObject` method bound to a strict **Zod** schema, the SDK handles schema enforcement and JSON repair automatically under the hood. 

If the model severely hallucinates and fails the Zod validation entirely, the API throws a 500 error. The frontend catches this and fails gracefully, displaying a toast notification asking the user to try again. There is no silent failure; it fails loudly but cleanly.

### How do you handle low-confidence extractions?
Instead of just hoping the extraction worked, I forced the LLM to self-evaluate. The Zod schema requires the LLM to output a categorical enum `imageQualityStatus` ("High", "Moderate", "Poor", "Unreadable") and a descriptive `analysisLog`. 

On the frontend, this data drives conditional UI. If the score is "Poor" or "Unreadable", a bright warning banner slides out detailing *why* it failed (e.g., "Blurry text", "Image heavily cropped") using the LLM's own analysis log. This sets user expectations immediately before they even look at the data fields.

### How does the user know what to correct? Do you surface anything beyond the raw fields?
I surface multiple layers of feedback to guide the user's corrections:
1. **The Analysis Log:** Displays the LLM's own uncertainty and reasons for low confidence.
2. **Deterministic Math Validation:** The UI calculates the sum of the extracted line items against the extracted `totalAmount`. If they don't match, a red `WARN: sum_mismatch` banner with an alert icon is displayed right above the line items, prompting the user to find the discrepancy.
3. **Side-by-Side Verification:** The original image is always displayed adjacent to the parsed, editable form fields, allowing the user to seamlessly cross-reference and correct OCR mistakes before saving the record to the database.

### Which model did you pick, and why?
I chose **Google `gemini-2.5-flash`**. 
In the triad of Cost, Latency, and Accuracy, I optimized heavily for **Latency** and **Cost**. 

For a consumer-facing receipt app, waiting 15-20 seconds for an LLM to parse an image creates a terrible user experience. `gemini-2.5-flash` is incredibly fast (returning structured multimodal JSON in just a few seconds) and drastically cheaper than flagship models like GPT-4o or Claude 3.5 Sonnet. Receipt parsing is a relatively solved multimodal task, making a massive "Pro" model overkill. To mitigate the slight accuracy drop that comes with a "Flash" model, I relied on strict Zod schemas and contextual prompting (e.g., inferring missing currency from the merchant's address) to keep the extractions highly accurate and on rails.