import { Router, Request, Response } from "express";
import {
  getAllInvoices,
  createOrGetInvoiceForOrder,
  generateGstInvoiceHtml,
} from "../lib/invoices.js";
import { requireAdminAuth } from "../lib/auth.js";

export const invoicesRouter = Router();

// GET /api/invoices
invoicesRouter.get("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const orderIdParam = req.query.orderId as string | undefined;
    const format = req.query.format as string | undefined;

    if (orderIdParam && format === "html") {
      const inv = await createOrGetInvoiceForOrder(parseInt(orderIdParam, 10));
      if (!inv) {
        return res.status(404).send("Invoice not found");
      }
      const html = generateGstInvoiceHtml(inv);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    const invoices = await getAllInvoices();
    res.set("Cache-Control", "no-store, max-age=0");
    return res.json({ success: true, invoices });
  } catch (error) {
    console.error("GET /api/invoices error:", error);
    return res.status(500).json({ success: false, error: "Failed to load invoices" });
  }
});

// POST /api/invoices - Generate / retrieve invoice
invoicesRouter.post("/", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, error: "orderId is required" });
    }

    const invoice = await createOrGetInvoiceForOrder(Number(orderId));
    if (!invoice) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    return res.json({ success: true, invoice });
  } catch (error) {
    console.error("POST /api/invoices error:", error);
    return res.status(500).json({ success: false, error: "Failed to process invoice" });
  }
});

