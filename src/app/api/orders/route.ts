import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const orders = db.prepare(`SELECT * FROM orders WHERE status != 'paid' ORDER BY created_at DESC`).all() as any[];
    
    for (let order of orders) {
      order.items = db.prepare(`
        SELECT oi.*, p.name as product_name 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE order_id = ?
      `).all(order.id);
    }
    
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tableNumber, items } = await req.json();
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
    let orderId: number = 0;
    db.transaction(() => {
      const info = db.prepare(`INSERT INTO orders (table_number, total) VALUES (?, ?)`).run(tableNumber, total);
      orderId = info.lastInsertRowid as number;
      
      const insertItem = db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`);
      for (const item of items) {
        insertItem.run(orderId, item.productId, item.quantity, item.price);
      }
    })();
    
    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { orderId, status } = await req.json();
    db.prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, orderId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
