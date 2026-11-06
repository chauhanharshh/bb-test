import nodemailer from "nodemailer";
import { config } from "../config.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export interface OrderEmailData {
  orderId: number;
  customerName?: string;
  customerEmail?: string;
  phone?: string;
  address?: string;
  paymentMethod?: string;
  total: number;
  items: {
    name: string;
    price: number;
    quantity: number;
    ageGroup?: string;
  }[];
}

export async function sendOrderNotificationEmail(order: OrderEmailData) {
  try {
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name} (${item.ageGroup || "N/A"})</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #ff2b75; text-align: center;">🛍️ New Order Received! (Order #${order.orderId})</h2>
        <p>A new order has been placed on <strong>BabyBloom Store</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Customer Details:</h3>
          <p><strong>Name:</strong> ${order.customerName || "N/A"}</p>
          <p><strong>Phone:</strong> ${order.phone || "N/A"}</p>
          <p><strong>Email:</strong> ${order.customerEmail || "N/A"}</p>
          <p><strong>Address:</strong> ${order.address || "N/A"}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod || "COD"}</p>
        </div>

        <h3>Order Summary:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #ffeef3;">
              <th style="padding: 8px; text-align: left;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 16px;">Grand Total:</td>
              <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 16px; color: #ff2b75;">₹${order.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Send to store owner
    await transporter.sendMail({
      from: `"BabyBloom Store" <${config.smtp.user}>`,
      to: config.smtp.user,
      subject: `🚨 New Order #${order.orderId} from ${order.customerName || "Customer"} - ₹${order.total}`,
      html: emailHtml,
    });

    // Send copy to customer if email is provided
    if (order.customerEmail && order.customerEmail.includes("@")) {
      await transporter.sendMail({
        from: `"BabyBloom Store" <${config.smtp.user}>`,
        to: order.customerEmail,
        subject: `Your BabyBloom Order Confirmation #${order.orderId}`,
        html: emailHtml,
      });
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to send order email:", err);
    return { success: false, error: err };
  }
}

