import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const receipt = await prisma.receipt.create({
      data: {
        merchant: data.merchant,
        date: data.date,
        totalAmount: data.totalAmount,
        lineItems: {
          create: data.lineItems.map((item: { description: string; amount: number }) => ({
            description: item.description,
            amount: item.amount,
          })),
        },
      },
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.error("Error saving receipt:", error);
    return NextResponse.json({ error: "Failed to save receipt" }, { status: 500 });
  }
}
