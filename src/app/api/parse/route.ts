import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { NextResponse } from "next/server";

const receiptSchema = z.object({
  merchant: z.string().describe("The name of the merchant or store."),
  date: z.string().describe("The date of the receipt in ISO 8601 format (YYYY-MM-DD). If not found, leave empty."),
  lineItems: z.array(
    z.object({
      description: z.string().describe("The name of the purchased item. Do not include taxes, tips, or delivery fees."),
      amount: z.number().describe("The price/amount of the item."),
    })
  ).describe("The list of purchased physical goods or food. Exclude taxes, tips, delivery fees, and handling fees."),
  totalAmount: z.number().describe("The total amount paid on the receipt."),
  currency: z.string().describe("The currency symbol (e.g. $, ₹, £, €). Infer from context if not explicitly mentioned. If completely unknown, return 🪙 (coin emoji)."),
  confidenceScore: z.number().describe("Image Clarity / Confidence Score (0-100) representing how confidently the model believes the image can be analyzed."),
  imageQualityStatus: z.enum(["Excellent", "Good", "Moderate", "Poor", "Extremely Poor"]).describe("Categorical status based on confidence score (e.g., Excellent: 90-100%, Good: 70-89%, Moderate: 40-69%, Poor: 10-39%, Extremely Poor: 0-9%)."),
  analysisSummary: z.string().describe("A summary of the extraction process, including what was readable, what was unreadable, and any warnings."),
  missingFields: z.array(z.string()).describe("List of fields that were partially or completely unreadable and could not be extracted (e.g., ['date', 'lineItems'])."),
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { object } = await generateObject({
      model: google("gemini-flash-latest"),
      schema: receiptSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract the following information from the receipt image. For line items, ONLY include purchased physical goods or food. Strictly EXCLUDE taxes, tips, delivery fees, surge pricing, GST, packing charges, and handling fees.

IMPORTANT: Provide an analysis log and confidence score.
- If fully readable, score 90-100%, status 'Excellent'. Extract all fields.
- If partially visible/cropped, score 40-89%, status 'Good' or 'Moderate'. Extract visible data, list unavailable fields in missingFields, and note cropped areas in analysisSummary.
- If blurry/distorted, score 10-39%, status 'Poor'. Extract only if reliable, avoid guessing, note blurriness in analysisSummary.
- If completely unreadable (e.g., heavy blur, AI generated nonsense, very low res), score 0-9%, status 'Extremely Poor'. Do not extract data, note failure reason in analysisSummary.
`,
            },
            {
              type: "image",
              image: buffer,
            },
          ],
        },
      ],
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("Error parsing receipt:", error);
    // Graceful fallback as per PRD
    return NextResponse.json({
      merchant: "",
      date: new Date().toISOString().split("T")[0],
      lineItems: [],
      totalAmount: 0,
      currency: "🪙",
      confidenceScore: 0,
      imageQualityStatus: "Extremely Poor",
      analysisSummary: "Failed to process image due to a backend error.",
      missingFields: ["merchant", "date", "lineItems", "totalAmount"],
      _backendError: error instanceof Error ? error.message : String(error),
    });
  }
}
