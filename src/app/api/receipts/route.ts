/**
 * API Endpoint: /api/receipts
 * Methods: GET, POST
 * 
 * Functionality:
 * - POST: Receives parsed receipt data in JSON format and saves it to the database
 *   (via Prisma). Handles defensive coercion of data types to ensure they match
 *   the expected database schema (e.g., parsing strings to floats for SQLite).
 * - GET: Retrieves all saved receipts from the database, ordered by creation date
 *   in descending order (newest first). Includes associated line items.
 */

// ==========================================
// 1. IMPORTS & DEPENDENCIES
// ==========================================
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ==========================================
// 2. CREATE RECEIPT (POST)
// ==========================================
/**
 * POST Handler
 * 
 * Saves a new receipt and its associated line items to the database.
 * 
 * @param req - The incoming HTTP request containing the receipt JSON data.
 * @returns A JSON response indicating success with the created record, or an error.
 */
export async function POST(req: Request) {
  try {
    // Parse the JSON body from the request
    const data = await req.json();

    // ==========================================
    // 2a. DATABASE INSERTION
    // ==========================================
    // Create a new receipt record along with its line items
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

    // ==========================================
    // 2b. SUCCESS RESPONSE
    // ==========================================
    return NextResponse.json({ success: true, record: receipt }, { status: 201 });
  } catch (error) {
    // ==========================================
    // 2c. ERROR HANDLING
    // ==========================================
    console.error("Error saving receipt:", error);
    return NextResponse.json(
      { error: "Failed to save receipt", detail: String(error) },
      { status: 500 }
    );
  }
}

// ==========================================
// 3. FETCH RECEIPTS (GET)
// ==========================================
/**
 * GET Handler
 * 
 * Retrieves all saved receipts from the database.
 * 
 * @returns A JSON response containing an array of receipts (including line items).
 */
export async function GET() {
  try {
    // ==========================================
    // 3a. DATABASE QUERY
    // ==========================================
    // Fetch all receipts, including their line items, ordered by newest first
    const receipts = await prisma.receipt.findMany({
      include: { lineItems: true },
      orderBy: { createdAt: "desc" },
    });

    // ==========================================
    // 3b. SUCCESS RESPONSE
    // ==========================================
    return NextResponse.json(receipts);
  } catch (error) {
    // ==========================================
    // 3c. ERROR HANDLING
    // ==========================================
    console.error("Error fetching receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipts", detail: String(error) },
      { status: 500 }
    );
  }
}
