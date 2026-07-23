# OmniReceipt Parser

> A lightweight, full-stack Next.js web application designed to transform photos of physical or digital receipts into structured, editable data using Google's Gemini Vision API and Vercel AI SDK. 

### 🔵 What did I build?
I built a full-stack Next.js web application that takes an image of a physical receipt, processes it through Google Gemini's multimodal API via the Vercel AI SDK to extract structured JSON data (merchant, date, line items, currency, and total), and saves the validated records to a SQLite database using Prisma. The application includes a React frontend that allows users to upload images or select from a library of integrated test cases, view the parsed data alongside a built-in image clarity confidence score, edit the fields to correct LLM hallucinations, and save the final record to a persistent history log.

### 🔵 What are the biggest tradeoffs I made, and why?


1. **Using SQLite with Prisma vs. a Hosted Database:** For this take-home project, I opted for a local SQLite database (`dev.db`). While this breaks persistency if deployed to Vercel's serverless environment, it drastically simplified local setup and review for yours reviewing team by not requiring them to provision external Postgres credentials or run Docker containers.

2. **Forcing categorical Enums over Continuous Values:** Instead of just returning a raw confidence score (0-100), the LLM is forced by Zod to output a categorical `imageQualityStatus` enum (e.g., "Poor", "Moderate"). This adds artificial constraints to the LLM but makes rendering conditional UI (like the slide-out Analysis Log warnings) much safer and type-predictable on the frontend compared to trusting raw LLM text output.This approach may look a bit weird for the users, as it is not a widely used approach, but for development its a good method from my pov as I know how images got classified?, why they got rejected? and why they got approved? If got a low score , then what fields of data it couldn't find?

     - This approach helped to handle a edge case, where specifically no currency was mentioned directly, currency was decided by the address of the merchant, well this assumption made by LLM may not be true everytime, but this approach helps in parsing in testcases where we get some capture distortion in images or some part of reciept got cropped or not visble properly in image

     - Sometimes its possible that date can be mentioned twice at different locations, if one position looks distorted and it can't be made clear what exactly is written, then we have another position from where it can be inferred, this ensures that we don't miss out on any information

3. **Exclusion of taxes/fees from line items:** Receipts like Blinkit and Zomato mix physical goods with handling fees, surge pricing, and GST. I decided to instruct the LLM strictly to exclude these from the lineItems array. The tradeoff is that the sum of line items rarely matches the receipt total, triggering my UI's "Math Mismatch" warning constantly. I defend this because it forces the user to manually verify if the missing amount is a standard tax or if the LLM hallucinated/missed a physical item, ensuring higher data integrity.

    - for this I could have added other fields to allow all details to be added, but this could be inconstent with other reciepts, for example some reciepts don't have taxes/fees mentioned, some may implement different taxation systems, different calculation methods, and also reciept could be just for a single item, where breakdown is not necessary. So to make the parser consistent and also handle various types of reciepts this was the best approach from my pov. 





### 🔵 Where did you use an LLM, and for what?

- **During Development:** I used an IDE(Cursor) throughout the development process. Specifically, I used the AI agent to build the frontend UI, set up the Prisma schema and SQLite connection, implement the `Zod` parsing schema for structured LLM outputs, write the API route handlers.

- I designed the History section myself, how pop-ups should be displayed? What data should be displayed in History?

- I architectured the Fallback logic myself, I decided the edge cases, stuctured them into categories, then I designed the Confidence score logic and a Analysis logging system and added categorical enums(discussed in tradeoffs).
How the Pop-ups should work when there is High confidence score, when confidence score is average, and when score is critically low, should it show the breakdown of how the score was calculated, should it show something else?

- I made the sample good and bad testcases containers myself, with auto-upload feature on clicking and made ui fixes like disabling other reciept options until the first one gets analyzed completely to prevent rate-limit issues.






### 🔵 What would you do with another week?
- **Move to a robust, hosted Database:** Migrate from SQLite to Vercel Postgres or Supabase to support actual cloud deployment without data loss.

- **Client-side Image Compression:** Implement an image compression library (like `browser-image-compression`) before the `FormData` upload to ensure high-resolution smartphone photos don't breach Vercel's strict 4.5MB serverless payload limit.

- **Authentication & Multi-tenant Data:** Add NextAuth to allow users to sign in and securely save receipts to their own accounts rather than a global history log.

- **Application Version:** I would make the site fully responsive (currently it is made only for desktop), add a direct photo-taking feature instead of upload-only, and convert the app into a PWA (Progressive Web App) so that it can be installed on mobile devices.

- **Multi-Image Feature:** Add support for multi-image uploads and parsing of multiple receipts at once. This is especially important when receipts are too long to fit in a single frame.

- **PDF Parsing:** Add support for parsing PDF files (designed taking into account that nowadays most receipts are generated digitally and are received in PDF format).


### 🔵 What's one thing in this spec you'd push back on if I were your PM?
I would strongly push back on the instruction to only extract *(name + amount)* for the line items. While I agree with the product decision to exclude internal granular details like taxes and discounts to keep the UX clean, capturing the item quantity is essential.

If you look at standard e-commerce or grocery invoices (like Amazon or Blinkit), they explicitly break down purchases as: **Unit Price × Quantity = Net Amount**. To save space and avoid redundant database entries, modern receipts do not list duplicate items on separate lines. Instead, they list the item name once alongside separate quantity, unit price, and total amount columns.

> If a user buys 4 bottles of liquid cleaner for *₹400 total*, the current spec forces the app to extract **{ name: "cleaner", amount: 400 }**. This destroys crucial consumer context, making it look like they bought one ridiculously expensive item. By underspecifying these fields in the take-home PDF, we lose data that is highly relevant to the consumer. Without extracting the quantity and the original per-unit price, the app fails to help users do meaningful price-tracking or spot price hikes over time. A receipt tool designed for consumers must track how many items were bought, not just the final lumped sum.




