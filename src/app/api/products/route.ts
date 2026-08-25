import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const products = db.prepare(`
      SELECT p.id, p.name, p.price, c.name as category 
      FROM products p 
      JOIN categories c ON p.category_id = c.id
    `).all();
    
    const categories = db.prepare(`SELECT * FROM categories`).all();
    
    return NextResponse.json({ products, categories });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, price, categoryName } = await req.json();
    
    let categoryId: number;
    const category = db.prepare(`SELECT id FROM categories WHERE name = ?`).get(categoryName) as { id: number } | undefined;
    
    if (category) {
      categoryId = category.id;
    } else {
      const info = db.prepare(`INSERT INTO categories (name) VALUES (?)`).run(categoryName);
      categoryId = info.lastInsertRowid as number;
    }

    const result = db.prepare(`INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)`).run(name, price, categoryId);
    
    return NextResponse.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 });
  }
}
