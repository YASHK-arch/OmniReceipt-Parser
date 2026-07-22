import { openai } from "@ai-sdk/openai";
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
      model: openai("gpt-4o-mini"),
      schema: receiptSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the following information from the receipt image. For line items, ONLY include purchased physical goods or food. Strictly EXCLUDE taxes, tips, delivery fees, surge pricing, GST, packing charges, and handling fees.",
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
    });
  }
}
