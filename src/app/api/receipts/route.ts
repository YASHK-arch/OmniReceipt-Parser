import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const receipt = await prisma.receipt.create({
      data: {
        merchant: String(data.merchant || ""),
        date: String(data.date || new Date().toISOString().split("T")[0]),
        // DEFENSIVE: coerce strings from HTML inputs → Float for SQLite
        totalAmount: parseFloat(data.totalAmount) || 0,
        currency: String(data.currency || "🪙"),
        lineItems: {
          create: (data.lineItems || []).map(
            (item: { description: string; amount: number | string }) => ({
              description: String(item.description || ""),
              amount: parseFloat(String(item.amount)) || 0,
            })
          ),
        },
      },
      include: { lineItems: true },
    });

    return NextResponse.json({ success: true, record: receipt }, { status: 201 });
  } catch (error) {
    console.error("Error saving receipt:", error);
    return NextResponse.json(
      { error: "Failed to save receipt", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const receipts = await prisma.receipt.findMany({
      include: { lineItems: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(receipts);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts", detail: String(error) },
      { status: 500 }
    );
  }
}
