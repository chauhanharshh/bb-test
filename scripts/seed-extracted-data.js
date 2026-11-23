const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Support running from root or backend folder
const possibleDirs = [
  path.join(__dirname, "newdata", "extracted_json"),
  path.join(__dirname, "..", "newdata", "extracted_json"),
  path.join(__dirname, "..", "..", "newdata", "extracted_json"),
  path.join(process.cwd(), "newdata", "extracted_json"),
  path.join(process.cwd(), "..", "newdata", "extracted_json"),
];

const DATA_DIR = possibleDirs.find((d) => fs.existsSync(d)) || possibleDirs[0];

function loadJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

async function syncSequence(tableName) {
  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"public"."' || '${tableName}' || '"', 'id'), COALESCE((SELECT MAX(id) FROM "public"."${tableName}"), 1));`
    );
  } catch (err) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${tableName}"), 1));`
      );
    } catch {}
  }
}

async function main() {
  console.log("=== Starting Database Seed with Extracted Data ===");
  console.log(`Loading JSON files from: ${DATA_DIR}\n`);

  // 1. Admin Credentials
  const admins = loadJson("admincredentials.json");
  console.log(`Seeding Admin Credentials (${admins.length})...`);
  for (const a of admins) {
    await prisma.adminCredential.upsert({
      where: { id: a.id },
      update: {
        username: a.username,
        passwordHash: a.passwordHash,
        updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
      },
      create: {
        id: a.id,
        username: a.username,
        passwordHash: a.passwordHash,
        updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("AdminCredential");

  // 2. Age Ranges
  const ageRanges = loadJson("ageranges.json");
  console.log(`Seeding Age Ranges (${ageRanges.length})...`);
  for (const ar of ageRanges) {
    await prisma.ageRange.upsert({
      where: { id: ar.id },
      update: {
        name: ar.name,
        order: ar.order || 0,
        updatedAt: ar.updatedAt ? new Date(ar.updatedAt) : new Date(),
      },
      create: {
        id: ar.id,
        name: ar.name,
        order: ar.order || 0,
        createdAt: ar.createdAt ? new Date(ar.createdAt) : new Date(),
        updatedAt: ar.updatedAt ? new Date(ar.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("AgeRange");

  // 3. Categories
  const categories = loadJson("categorys.json");
  console.log(`Seeding Categories (${categories.length})...`);
  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("Category");

  // 4. Subcategories
  const subcategories = loadJson("subcategorys.json");
  console.log(`Seeding Subcategories (${subcategories.length})...`);
  for (const s of subcategories) {
    await prisma.subcategory.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        slug: s.slug,
        categoryId: s.categoryId,
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
      },
      create: {
        id: s.id,
        name: s.name,
        slug: s.slug,
        categoryId: s.categoryId,
        createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("Subcategory");

  // 5. Store Profile
  const storeProfiles = loadJson("storeprofiles.json");
  console.log(`Seeding Store Profile (${storeProfiles.length})...`);
  for (const sp of storeProfiles) {
    await prisma.storeProfile.upsert({
      where: { id: sp.id },
      update: {
        storeName: sp.storeName,
        tagline: sp.tagline,
        ownerName: sp.ownerName,
        phone: sp.phone,
        whatsappNumber: sp.whatsappNumber,
        email: sp.email,
        addressLine1: sp.addressLine1,
        addressLine2: sp.addressLine2,
        city: sp.city,
        state: sp.state,
        pincode: sp.pincode,
        instagramUrl: sp.instagramUrl,
        facebookUrl: sp.facebookUrl,
        aboutText: sp.aboutText,
        codEnabled: !!sp.codEnabled,
        codNote: sp.codNote,
        upiEnabled: !!sp.upiEnabled,
        upiId: sp.upiId,
        upiQrUrl: sp.upiQrUrl,
        cardEnabled: !!sp.cardEnabled,
        netbankingEnabled: !!sp.netbankingEnabled,
        bankName: sp.bankName,
        accountNumber: sp.accountNumber,
        ifscCode: sp.ifscCode,
        accountHolderName: sp.accountHolderName,
        gstNumber: sp.gstNumber,
        updatedAt: sp.updatedAt ? new Date(sp.updatedAt) : new Date(),
      },
      create: {
        id: sp.id,
        storeName: sp.storeName,
        tagline: sp.tagline,
        ownerName: sp.ownerName,
        phone: sp.phone,
        whatsappNumber: sp.whatsappNumber,
        email: sp.email,
        addressLine1: sp.addressLine1,
        addressLine2: sp.addressLine2,
        city: sp.city,
        state: sp.state,
        pincode: sp.pincode,
        instagramUrl: sp.instagramUrl,
        facebookUrl: sp.facebookUrl,
        aboutText: sp.aboutText,
        codEnabled: !!sp.codEnabled,
        codNote: sp.codNote,
        upiEnabled: !!sp.upiEnabled,
        upiId: sp.upiId,
        upiQrUrl: sp.upiQrUrl,
        cardEnabled: !!sp.cardEnabled,
        netbankingEnabled: !!sp.netbankingEnabled,
        bankName: sp.bankName,
        accountNumber: sp.accountNumber,
        ifscCode: sp.ifscCode,
        accountHolderName: sp.accountHolderName,
        gstNumber: sp.gstNumber,
        createdAt: sp.createdAt ? new Date(sp.createdAt) : new Date(),
        updatedAt: sp.updatedAt ? new Date(sp.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("StoreProfile");

  // 6. Banners
  const banners = loadJson("banners.json");
  console.log(`Seeding Banners (${banners.length})...`);
  for (const b of banners) {
    await prisma.banner.upsert({
      where: { id: b.id },
      update: {
        imageUrl: b.imageUrl,
        title: b.title,
        alt: b.alt,
        linkUrl: b.linkUrl,
        order: b.order || 0,
        isActive: b.isActive !== undefined ? !!b.isActive : true,
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
      },
      create: {
        id: b.id,
        imageUrl: b.imageUrl,
        title: b.title,
        alt: b.alt,
        linkUrl: b.linkUrl,
        order: b.order || 0,
        isActive: b.isActive !== undefined ? !!b.isActive : true,
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("Banner");

  // 7. Offers
  const offers = loadJson("offers.json");
  console.log(`Seeding Offers (${offers.length})...`);
  for (const o of offers) {
    await prisma.offer.upsert({
      where: { id: o.id },
      update: {
        title: o.title,
        description: o.description,
        discountPercent: o.discountPercent,
        scope: o.scope || "ALL",
        targetCategory: o.targetCategory,
        productIds: Array.isArray(o.productIds) ? o.productIds : [],
        couponCode: o.couponCode,
        bannerText: o.bannerText,
        isActive: o.isActive !== undefined ? !!o.isActive : true,
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date(),
      },
      create: {
        id: o.id,
        title: o.title,
        description: o.description,
        discountPercent: o.discountPercent,
        scope: o.scope || "ALL",
        targetCategory: o.targetCategory,
        productIds: Array.isArray(o.productIds) ? o.productIds : [],
        couponCode: o.couponCode,
        bannerText: o.bannerText,
        isActive: o.isActive !== undefined ? !!o.isActive : true,
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        updatedAt: o.updatedAt ? new Date(o.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("Offer");

  // 8. Products
  const products = loadJson("products.json");
  console.log(`Seeding Products (${products.length})...`);
  for (const p of products) {
    const imagesList = Array.isArray(p.images) && p.images.length > 0
      ? p.images
      : (p.imageUrl ? [p.imageUrl] : []);

    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        price: parseFloat(p.price) || 0,
        imageUrl: p.imageUrl,
        images: imagesList,
        ageGroup: p.ageGroup || "0-1 Yrs",
        ageGroups: Array.isArray(p.ageGroups) ? p.ageGroups : [p.ageGroup || "0-1 Yrs"],
        category: p.category || "Girls",
        categories: Array.isArray(p.categories) ? p.categories : [p.category || "Girls"],
        stock: parseInt(p.stock, 10) || 0,
        style: p.style || "Regular",
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price) || 0,
        imageUrl: p.imageUrl,
        images: imagesList,
        ageGroup: p.ageGroup || "0-1 Yrs",
        ageGroups: Array.isArray(p.ageGroups) ? p.ageGroups : [p.ageGroup || "0-1 Yrs"],
        category: p.category || "Girls",
        categories: Array.isArray(p.categories) ? p.categories : [p.category || "Girls"],
        stock: parseInt(p.stock, 10) || 0,
        style: p.style || "Regular",
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      },
    });
  }
  await syncSequence("Product");

  // 9. Orders
  const orders = loadJson("orders.json");
  console.log(`Seeding Orders (${orders.length})...`);
  for (const o of orders) {
    await prisma.order.upsert({
      where: { id: o.id },
      update: {
        total: parseFloat(o.total) || 0,
        status: o.status || "pending",
        customerName: typeof o.customerName === "object" ? JSON.stringify(o.customerName) : o.customerName,
      },
      create: {
        id: o.id,
        total: parseFloat(o.total) || 0,
        status: o.status || "pending",
        customerName: typeof o.customerName === "object" ? JSON.stringify(o.customerName) : o.customerName,
        createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
      },
    });
  }
  await syncSequence("Order");

  // 10. Order Items
  const orderItems = loadJson("orderitems.json");
  console.log(`Seeding Order Items (${orderItems.length})...`);
  for (const oi of orderItems) {
    await prisma.orderItem.upsert({
      where: { id: oi.id },
      update: {
        orderId: oi.orderId,
        productId: oi.productId,
        name: oi.name,
        price: parseFloat(oi.price) || 0,
        quantity: parseInt(oi.quantity, 10) || 1,
        ageGroup: oi.ageGroup,
      },
      create: {
        id: oi.id,
        orderId: oi.orderId,
        productId: oi.productId,
        name: oi.name,
        price: parseFloat(oi.price) || 0,
        quantity: parseInt(oi.quantity, 10) || 1,
        ageGroup: oi.ageGroup,
      },
    });
  }
  await syncSequence("OrderItem");

  // 11. Invoices
  const invoices = loadJson("invoices.json");
  console.log(`Seeding Invoices (${invoices.length})...`);
  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {
        invoiceNumber: inv.invoiceNumber,
        orderId: inv.orderId,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail,
        customerPhone: inv.customerPhone,
        customerAddress: inv.customerAddress,
        paymentMethod: inv.paymentMethod,
        storeName: inv.storeName,
        storeGstNumber: inv.storeGstNumber,
        storeAddress: inv.storeAddress,
        storePhone: inv.storePhone,
        storeEmail: inv.storeEmail,
        subtotal: parseFloat(inv.subtotal) || 0,
        cgstAmount: parseFloat(inv.cgstAmount) || 0,
        sgstAmount: parseFloat(inv.sgstAmount) || 0,
        totalTax: parseFloat(inv.totalTax) || 0,
        grandTotal: parseFloat(inv.grandTotal) || 0,
        itemsJson: typeof inv.itemsJson === "object" ? JSON.stringify(inv.itemsJson) : inv.itemsJson,
      },
      create: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderId: inv.orderId,
        customerName: inv.customerName,
        customerEmail: inv.customerEmail,
        customerPhone: inv.customerPhone,
        customerAddress: inv.customerAddress,
        paymentMethod: inv.paymentMethod,
        storeName: inv.storeName,
        storeGstNumber: inv.storeGstNumber,
        storeAddress: inv.storeAddress,
        storePhone: inv.storePhone,
        storeEmail: inv.storeEmail,
        subtotal: parseFloat(inv.subtotal) || 0,
        cgstAmount: parseFloat(inv.cgstAmount) || 0,
        sgstAmount: parseFloat(inv.sgstAmount) || 0,
        totalTax: parseFloat(inv.totalTax) || 0,
        grandTotal: parseFloat(inv.grandTotal) || 0,
        itemsJson: typeof inv.itemsJson === "object" ? JSON.stringify(inv.itemsJson) : inv.itemsJson,
        createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
      },
    });
  }
  await syncSequence("Invoice");

  console.log("\n=== ALL EXTRACTED DATA SEEDED SUCCESSFULLY! ===");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
