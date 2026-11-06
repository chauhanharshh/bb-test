import prisma from "./prisma.js";
import { getStoreProfile } from "./profile.js";

export interface InvoiceLineItem {
  sno: number;
  name: string;
  ageGroup: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
}

export interface InvoiceData {
  id: number;
  invoiceNumber: string;
  orderId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string;
  storeName: string;
  storeGstNumber: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;
  items: InvoiceLineItem[];
  createdAt: string | Date;
}

let invoiceTableEnsured = false;

export async function ensureInvoiceTable() {
  if (invoiceTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" SERIAL PRIMARY KEY,
        "invoiceNumber" TEXT NOT NULL UNIQUE,
        "orderId" INTEGER NOT NULL UNIQUE,
        "customerName" TEXT NOT NULL,
        "customerEmail" TEXT DEFAULT '',
        "customerPhone" TEXT DEFAULT '',
        "customerAddress" TEXT DEFAULT '',
        "paymentMethod" TEXT DEFAULT 'COD',
        "storeName" TEXT NOT NULL DEFAULT 'Baby Bloom',
        "storeGstNumber" TEXT DEFAULT '',
        "storeAddress" TEXT DEFAULT '',
        "storePhone" TEXT DEFAULT '',
        "storeEmail" TEXT DEFAULT '',
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "cgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "sgstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "itemsJson" TEXT NOT NULL DEFAULT '[]',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    invoiceTableEnsured = true;
  } catch (e) {
    console.warn("Could not ensure Invoice table:", e);
  }
}

function numberToIndianWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n === 0) return "";
    let str = "";
    if (Math.floor(n / 10000000) > 0) {
      str += inWords(Math.floor(n / 10000000)) + "Crore ";
      n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
      str += inWords(Math.floor(n / 100000)) + "Lakh ";
      n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
      str += inWords(Math.floor(n / 1000)) + "Thousand ";
      n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
      str += inWords(Math.floor(n / 100)) + "Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) str += a[n];
      else str += b[Math.floor(n / 10)] + " " + a[n % 10];
    }
    return str;
  }

  const rounded = Math.round(num);
  if (rounded === 0) return "Zero Rupees Only";
  return (inWords(rounded).trim() + " Rupees Only").replace(/\s+/g, " ");
}

export async function createOrGetInvoiceForOrder(orderId: number): Promise<InvoiceData | null> {
  await ensureInvoiceTable();

  try {
    const existing = await prisma.invoice.findUnique({
      where: { orderId },
    });

    if (existing) {
      let parsedItems: InvoiceLineItem[] = [];
      try {
        parsedItems = JSON.parse(existing.itemsJson);
      } catch {}

      return {
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        orderId: existing.orderId,
        customerName: existing.customerName,
        customerEmail: existing.customerEmail || "",
        customerPhone: existing.customerPhone || "",
        customerAddress: existing.customerAddress || "",
        paymentMethod: existing.paymentMethod || "COD",
        storeName: existing.storeName,
        storeGstNumber: existing.storeGstNumber || "",
        storeAddress: existing.storeAddress || "",
        storePhone: existing.storePhone || "",
        storeEmail: existing.storeEmail || "",
        subtotal: existing.subtotal,
        cgstAmount: existing.cgstAmount,
        sgstAmount: existing.sgstAmount,
        totalTax: existing.totalTax,
        grandTotal: existing.grandTotal,
        amountInWords: numberToIndianWords(existing.grandTotal),
        items: parsedItems,
        createdAt: existing.createdAt,
      };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return null;

    const store = await getStoreProfile();

    const gstRate = 5; // 5% GST on apparel
    const cgstRate = 2.5;
    const sgstRate = 2.5;

    let subtotalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;

    const items: InvoiceLineItem[] = (order.items || []).map((it, idx) => {
      const lineTotal = it.price * it.quantity;
      const taxable = Math.round((lineTotal / (1 + gstRate / 100)) * 100) / 100;
      const taxAmount = lineTotal - taxable;
      const cgst = Math.round((taxAmount / 2) * 100) / 100;
      const sgst = Math.round((taxAmount - cgst) * 100) / 100;

      subtotalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;

      return {
        sno: idx + 1,
        name: it.name,
        ageGroup: it.ageGroup || "N/A",
        hsnCode: "6111", // Baby garments HSN code
        quantity: it.quantity,
        unitPrice: it.price,
        lineTotal,
        gstRate,
        taxableValue: taxable,
        cgstRate,
        cgstAmount: cgst,
        sgstRate,
        sgstAmount: sgst,
      };
    });

    const grandTotal = order.total;
    const totalTax = Math.round((totalCgst + totalSgst) * 100) / 100;
    const subtotal = Math.round((grandTotal - totalTax) * 100) / 100;

    const dateStr = new Date().toISOString().slice(2, 7).replace("-", ""); // e.g. 2611
    const invoiceNumber = `BB-INV-${dateStr}-${String(order.id).padStart(4, "0")}`;

    const fullStoreAddress = [
      store.addressLine1,
      store.addressLine2,
      store.city,
      store.state ? `${store.state} - ${store.pincode}` : store.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    const created = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        customerName: order.customerName,
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
        paymentMethod: "COD",
        storeName: store.storeName,
        storeGstNumber: store.gstNumber || "",
        storeAddress: fullStoreAddress,
        storePhone: store.phone,
        storeEmail: store.email,
        subtotal,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        totalTax,
        grandTotal,
        itemsJson: JSON.stringify(items),
      },
    });

    return {
      id: created.id,
      invoiceNumber: created.invoiceNumber,
      orderId: created.orderId,
      customerName: created.customerName,
      customerEmail: created.customerEmail || "",
      customerPhone: created.customerPhone || "",
      customerAddress: created.customerAddress || "",
      paymentMethod: created.paymentMethod || "COD",
      storeName: created.storeName,
      storeGstNumber: created.storeGstNumber || "",
      storeAddress: created.storeAddress || "",
      storePhone: created.storePhone || "",
      storeEmail: created.storeEmail || "",
      subtotal: created.subtotal,
      cgstAmount: created.cgstAmount,
      sgstAmount: created.sgstAmount,
      totalTax: created.totalTax,
      grandTotal: created.grandTotal,
      amountInWords: numberToIndianWords(created.grandTotal),
      items,
      createdAt: created.createdAt,
    };
  } catch (error) {
    console.error("createOrGetInvoiceForOrder error:", error);
    return null;
  }
}

export async function getAllInvoices(): Promise<InvoiceData[]> {
  await ensureInvoiceTable();
  try {
    const records = await prisma.invoice.findMany({
      orderBy: { id: "desc" },
    });

    return records.map((inv) => {
      let items: InvoiceLineItem[] = [];
      try {
        items = JSON.parse(inv.itemsJson);
      } catch {}
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderId: inv.orderId,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail || "",
        customerPhone: inv.customerPhone || "",
        customerAddress: inv.customerAddress || "",
        paymentMethod: inv.paymentMethod || "COD",
        storeName: inv.storeName,
        storeGstNumber: inv.storeGstNumber || "",
        storeAddress: inv.storeAddress || "",
        storePhone: inv.storePhone || "",
        storeEmail: inv.storeEmail || "",
        subtotal: inv.subtotal,
        cgstAmount: inv.cgstAmount,
        sgstAmount: inv.sgstAmount,
        totalTax: inv.totalTax,
        grandTotal: inv.grandTotal,
        amountInWords: numberToIndianWords(inv.grandTotal),
        items,
        createdAt: inv.createdAt,
      };
    });
  } catch {
    return [];
  }
}

export function generateGstInvoiceHtml(inv: InvoiceData): string {
  const rows = inv.items
    .map(
      (it) => `
    <tr>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${it.sno}</td>
      <td style="padding: 8px; border: 1px solid #ddd;"><strong>${it.name}</strong><br/><small style="color: #666;">Age: ${it.ageGroup}</small></td>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${it.hsnCode}</td>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${it.quantity}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">₹${it.unitPrice.toFixed(2)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">₹${it.taxableValue.toFixed(2)}</td>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${it.cgstRate}%</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">₹${it.cgstAmount.toFixed(2)}</td>
      <td style="text-align: center; padding: 8px; border: 1px solid #ddd;">${it.sgstRate}%</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">₹${it.sgstAmount.toFixed(2)}</td>
      <td style="text-align: right; padding: 8px; border: 1px solid #ddd; font-weight: bold;">₹${it.lineTotal.toFixed(2)}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tax Invoice - ${inv.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; color: #222; }
    .invoice-box { max-width: 850px; margin: auto; padding: 25px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); }
    table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; font-size: 13px; }
    .header-table td { padding: 5px 0; }
    .brand-title { color: #ff2b75; font-size: 24px; font-weight: 800; margin: 0; }
    .invoice-title { font-size: 20px; font-weight: 800; color: #333; text-align: right; margin: 0; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="brand-title">${inv.storeName}</h1>
          <p style="margin: 4px 0; font-size: 12px; color: #555;">${inv.storeAddress}</p>
          <p style="margin: 2px 0; font-size: 12px; color: #555;">Phone: ${inv.storePhone} | Email: ${inv.storeEmail}</p>
          ${inv.storeGstNumber ? `<p style="margin: 2px 0; font-size: 12px; font-weight: bold; color: #ff2b75;">GSTIN: ${inv.storeGstNumber}</p>` : ""}
        </td>
        <td style="vertical-align: top; text-align: right;">
          <h2 class="invoice-title">TAX INVOICE</h2>
          <p style="margin: 4px 0; font-size: 13px;"><strong>Invoice No:</strong> ${inv.invoiceNumber}</p>
          <p style="margin: 2px 0; font-size: 13px;"><strong>Order ID:</strong> #${inv.orderId}</p>
          <p style="margin: 2px 0; font-size: 13px;"><strong>Date:</strong> ${new Date(inv.createdAt).toLocaleDateString("en-IN")}</p>
          <p style="margin: 2px 0; font-size: 13px;"><strong>Payment:</strong> ${inv.paymentMethod}</p>
        </td>
      </tr>
    </table>

    <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;"/>

    <table style="margin-bottom: 20px;">
      <tr>
        <td style="background: #f9f9f9; padding: 12px; border-radius: 6px;">
          <strong style="color: #444; font-size: 13px;">BILLED TO:</strong>
          <p style="margin: 4px 0; font-weight: bold; font-size: 14px;">${inv.customerName}</p>
          ${inv.customerAddress ? `<p style="margin: 2px 0; font-size: 12px;">${inv.customerAddress}</p>` : ""}
          ${inv.customerPhone ? `<p style="margin: 2px 0; font-size: 12px;">Phone: ${inv.customerPhone}</p>` : ""}
        </td>
      </tr>
    </table>

    <table style="width: 100%; border: 1px solid #ddd; margin-bottom: 15px;">
      <thead>
        <tr style="background: #ffeef3; color: #ff2b75; font-size: 11px; text-transform: uppercase;">
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">#</th>
          <th style="padding: 8px; border: 1px solid #ddd;">Description</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">HSN</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rate</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Taxable</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">CGST</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">CGST ₹</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">SGST</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">SGST ₹</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background: #fafafa; font-weight: bold;">
          <td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal:</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${inv.subtotal.toFixed(2)}</td>
          <td style="border: 1px solid #ddd;"></td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${inv.cgstAmount.toFixed(2)}</td>
          <td style="border: 1px solid #ddd;"></td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${inv.sgstAmount.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #ff2b75; font-size: 15px;">₹${inv.grandTotal.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    <p style="font-size: 12px; margin-top: 10px;"><strong>Amount in Words:</strong> ${inv.amountInWords}</p>

    <div style="margin-top: 35px; padding-top: 15px; border-top: 1px dashed #ccc; display: flex; justify-content: space-between; font-size: 11px; color: #777;">
      <div>
        <p style="margin: 0;">This is a computer generated invoice and does not require a physical signature.</p>
        <p style="margin: 2px 0;">Thank you for shopping with <strong>${inv.storeName}</strong>!</p>
      </div>
      <div style="text-align: right;">
        <p style="margin: 0; font-weight: bold; color: #333;">For ${inv.storeName}</p>
        <p style="margin-top: 25px;">Authorized Signatory</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

