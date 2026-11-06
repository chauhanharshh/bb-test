import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { sendOrderNotificationEmail } from "../lib/email.js";
import { requireAdminAuth } from "../lib/auth.js";
import { getActiveOffers, calculateProductOffer } from "../lib/offers.js";
import { createOrGetInvoiceForOrder } from "../lib/invoices.js";

function sanitizeInput(val?: string, maxLen = 200): string {
  if (!val || typeof val !== "string") return "";
  return val
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

export const ordersRouter = Router();

// GET /api/orders - List all orders (Admin only)
ordersRouter.get("/", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// GET /api/orders/:id
ordersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({ error: "Failed to fetch order" });
  }
});

// POST /api/orders - Place a new order
ordersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { cart, customerName, customerEmail, phone, address, paymentMethod } = req.body as {
      cart: { id: string | number; name: string; price: number; quantity: number; ageGroup?: string }[];
      customerName?: string;
      customerEmail?: string;
      phone?: string;
      address?: string;
      paymentMethod?: string;
    };

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Verify products and prices server-side
    const productIdsInCart = Array.from(
      new Set(
        cart
          .map((i) => parseInt(String(i.id), 10))
          .filter((n) => !Number.isNaN(n))
      )
    );

    const [dbProductsForPricing, activeOffers] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIdsInCart } },
        select: { id: true, name: true, price: true, category: true, categories: true, stock: true },
      }),
      getActiveOffers(),
    ]);

    const verifiedPriceMap = new Map<number, { price: number; name: string; stock: number }>();
    for (const p of dbProductsForPricing) {
      const offer = calculateProductOffer(p.id, p.category, p.price, activeOffers, p.categories);
      verifiedPriceMap.set(p.id, { price: offer.price, name: p.name, stock: p.stock });
    }

    // Check stock & sanitize cart items
    for (const item of cart) {
      const pid = parseInt(String(item.id), 10);
      const verified = verifiedPriceMap.get(pid);
      if (verified && verified.stock < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for "${verified.name}". Only ${verified.stock} available.`,
        });
      }
    }

    const sanitizedCart = cart.map((item) => {
      const pid = parseInt(String(item.id), 10);
      const verified = !Number.isNaN(pid) ? verifiedPriceMap.get(pid) : undefined;
      const safeQty = Math.max(1, Math.min(100, Math.floor(Number(item.quantity) || 1)));
      const safePrice = verified ? verified.price : Math.max(1, Number(item.price) || 1);
      const safeName = verified ? verified.name : sanitizeInput(item.name, 120) || "BabyBloom Item";
      return {
        ...item,
        productId: pid,
        name: safeName,
        price: safePrice,
        quantity: safeQty,
        ageGroup: sanitizeInput(item.ageGroup, 40) || "0-1 Yrs",
      };
    });

    const total = sanitizedCart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const safeCustomerName = sanitizeInput(customerName, 80) || "Store Customer";
    const safeCustomerEmail = sanitizeInput(customerEmail, 100);
    const safePhone = sanitizeInput(phone, 20);
    const safeAddress = sanitizeInput(address, 300);
    const safePaymentMethod = sanitizeInput(paymentMethod, 30) || "COD";

    // Database transaction: create order and decrement product stock
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          customerName: safeCustomerName,
          total,
          status: "pending",
          items: {
            create: sanitizedCart.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              ageGroup: item.ageGroup,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of sanitizedCart) {
        if (!Number.isNaN(item.productId)) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return newOrder;
    });

    // Auto-generate invoice in background
    createOrGetInvoiceForOrder(order.id).catch((err) =>
      console.warn("Auto-invoice generation error:", err)
    );

    // Send email notifications in background
    sendOrderNotificationEmail({
      orderId: order.id,
      customerName: safeCustomerName,
      customerEmail: safeCustomerEmail,
      phone: safePhone,
      address: safeAddress,
      paymentMethod: safePaymentMethod,
      total,
      items: sanitizedCart.map((it) => ({
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        ageGroup: it.ageGroup,
      })),
    }).catch((err) => console.warn("Email sending error:", err));

    return res.status(201).json(order);
  } catch (error: any) {
    console.error("Error creating order:", error);
    return res.status(500).json({ error: error.message || "Failed to create order" });
  }
});

// PATCH /api/orders/:id - Update order status (Admin only)
ordersRouter.patch("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const { status } = req.body;
    if (!status || typeof status !== "string") {
      return res.status(400).json({ error: "Order status is required" });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: status.trim() },
      include: {
        items: true,
      },
    });

    return res.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return res.status(500).json({ error: "Failed to update order" });
  }
});

// DELETE /api/orders/:id - Delete order (Admin only)
ordersRouter.delete("/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    await prisma.order.delete({
      where: { id },
    });

    return res.json({ success: true, message: "Order deleted" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return res.status(500).json({ error: "Failed to delete order" });
  }
});

