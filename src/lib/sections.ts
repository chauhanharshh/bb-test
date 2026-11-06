import prisma from "./prisma.js";

export type SectionType =
  | "CATEGORY"
  | "DISCOUNT"
  | "PRICE_UNDER"
  | "OFFER"
  | "BEST_SELLERS"
  | "NEWEST"
  | "CURATED";

export interface HomeSectionItem {
  id: number;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  type: SectionType;
  category?: string | null;
  subcategory?: string | null;
  minDiscount?: number | null;
  maxPrice?: number | null;
  offerId?: number | null;
  productIds?: number[];
  limit?: number;
  order: number;
  isActive: boolean;
  viewAllUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export const DEFAULT_SECTIONS: HomeSectionItem[] = [
  {
    id: 1,
    title: "♥ Our Best Sellers ♥",
    subtitle: "Most loved outfits by parents & little trendsetters",
    badge: "POPULAR",
    type: "BEST_SELLERS",
    category: null,
    subcategory: null,
    minDiscount: null,
    maxPrice: null,
    offerId: null,
    productIds: [],
    limit: 6,
    order: 1,
    isActive: true,
    viewAllUrl: "/shop",
  },
  {
    id: 2,
    title: "🌸 Little Princess Frocks & Dresses 🌸",
    subtitle: "Comfortable and pretty dresses crafted with soft fabrics",
    badge: "GIRLS",
    type: "CATEGORY",
    category: "Girls",
    subcategory: null,
    minDiscount: null,
    maxPrice: null,
    offerId: null,
    productIds: [],
    limit: 6,
    order: 2,
    isActive: true,
    viewAllUrl: "/girls",
  },
  {
    id: 3,
    title: "⚡ Smart Boys Cool Fits ⚡",
    subtitle: "Dungarees, sets, and casual tees for everyday adventures",
    badge: "BOYS",
    type: "CATEGORY",
    category: "Boys",
    subcategory: null,
    minDiscount: null,
    maxPrice: null,
    offerId: null,
    productIds: [],
    limit: 6,
    order: 3,
    isActive: true,
    viewAllUrl: "/boys",
  },
  {
    id: 4,
    title: "👶 Newborn Soft Essentials 👶",
    subtitle: "Gentle rompers and 100% skin-safe cotton comfort",
    badge: "0-12 MONTHS",
    type: "CATEGORY",
    category: "Newborn",
    subcategory: null,
    minDiscount: null,
    maxPrice: null,
    offerId: null,
    productIds: [],
    limit: 6,
    order: 4,
    isActive: true,
    viewAllUrl: "/newborn",
  },
  {
    id: 5,
    title: "🏷️ Flat 20%+ OFF Special Deals",
    subtitle: "Big savings on stylish collections for a limited time",
    badge: "SALE",
    type: "DISCOUNT",
    category: null,
    subcategory: null,
    minDiscount: 20,
    maxPrice: null,
    offerId: null,
    productIds: [],
    limit: 6,
    order: 5,
    isActive: true,
    viewAllUrl: "/shop?discount=20",
  },
  {
    id: 6,
    title: "💰 Budget Corner: Under ₹799 Store",
    subtitle: "Pocket-friendly fashion without compromising on quality",
    badge: "VALUE PACK",
    type: "PRICE_UNDER",
    category: null,
    subcategory: null,
    minDiscount: null,
    maxPrice: 799,
    offerId: null,
    productIds: [],
    limit: 6,
    order: 6,
    isActive: true,
    viewAllUrl: "/shop?maxPrice=799",
  },
];

let homeSectionTableEnsured = false;

export async function ensureHomeSectionTable(): Promise<void> {
  if (homeSectionTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HomeSection" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "badge" TEXT,
        "type" TEXT NOT NULL DEFAULT 'CATEGORY',
        "category" TEXT,
        "subcategory" TEXT,
        "minDiscount" DOUBLE PRECISION,
        "maxPrice" DOUBLE PRECISION,
        "offerId" INTEGER,
        "productIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
        "limit" INTEGER NOT NULL DEFAULT 6,
        "order" INTEGER NOT NULL DEFAULT 0,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "viewAllUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const count: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM "HomeSection";`);
    const total = parseInt(count[0]?.cnt || "0", 10);
    if (total === 0) {
      for (const s of DEFAULT_SECTIONS) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "HomeSection" ("title", "subtitle", "badge", "type", "category", "subcategory", "minDiscount", "maxPrice", "offerId", "productIds", "limit", "order", "isActive", "viewAllUrl")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`,
          s.title,
          s.subtitle || null,
          s.badge || null,
          s.type,
          s.category || null,
          s.subcategory || null,
          s.minDiscount || null,
          s.maxPrice || null,
          s.offerId || null,
          s.productIds || [],
          s.limit || 6,
          s.order,
          s.isActive,
          s.viewAllUrl || null
        );
      }
    }

    homeSectionTableEnsured = true;
  } catch (err) {
    console.warn("Could not ensure HomeSection table, will fallback to defaults:", err);
  }
}

export async function dbGetAllSections(activeOnly = false): Promise<HomeSectionItem[]> {
  try {
    await ensureHomeSectionTable();
    const whereClause = activeOnly ? `WHERE "isActive" = true` : "";
    const rows = await prisma.$queryRawUnsafe<HomeSectionItem[]>(
      `SELECT * FROM "HomeSection" ${whereClause} ORDER BY "order" ASC, "id" ASC;`
    );
    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (e) {
    console.warn("Failed to fetch HomeSection from database, falling back to defaults:", e);
  }

  return activeOnly ? DEFAULT_SECTIONS.filter((s) => s.isActive) : DEFAULT_SECTIONS;
}

export async function dbGetSectionById(id: number): Promise<HomeSectionItem | null> {
  try {
    await ensureHomeSectionTable();
    const rows = await prisma.$queryRawUnsafe<HomeSectionItem[]>(
      `SELECT * FROM "HomeSection" WHERE "id" = $1 LIMIT 1;`,
      id
    );
    return rows[0] || null;
  } catch {
    return DEFAULT_SECTIONS.find((s) => s.id === id) || null;
  }
}

export async function dbCreateSection(data: Partial<HomeSectionItem>): Promise<HomeSectionItem> {
  await ensureHomeSectionTable();
  const title = data.title || "New Showcase Section";
  const subtitle = data.subtitle || null;
  const badge = data.badge || null;
  const type = data.type || "CATEGORY";
  const category = data.category || null;
  const subcategory = data.subcategory || null;
  const minDiscount = data.minDiscount !== undefined && data.minDiscount !== null ? Number(data.minDiscount) : null;
  const maxPrice = data.maxPrice !== undefined && data.maxPrice !== null ? Number(data.maxPrice) : null;
  const offerId = data.offerId ? Number(data.offerId) : null;
  const productIds = Array.isArray(data.productIds) ? data.productIds : [];
  const limit = data.limit ? Number(data.limit) : 6;
  const order = data.order !== undefined ? Number(data.order) : 0;
  const isActive = data.isActive !== undefined ? Boolean(data.isActive) : true;
  const viewAllUrl = data.viewAllUrl || null;

  const rows = await prisma.$queryRawUnsafe<HomeSectionItem[]>(
    `INSERT INTO "HomeSection" ("title", "subtitle", "badge", "type", "category", "subcategory", "minDiscount", "maxPrice", "offerId", "productIds", "limit", "order", "isActive", "viewAllUrl")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING *;`,
    title,
    subtitle,
    badge,
    type,
    category,
    subcategory,
    minDiscount,
    maxPrice,
    offerId,
    productIds,
    limit,
    order,
    isActive,
    viewAllUrl
  );

  return rows[0];
}

export async function dbUpdateSection(id: number, data: Partial<HomeSectionItem>): Promise<HomeSectionItem | null> {
  await ensureHomeSectionTable();
  const current = await dbGetSectionById(id);
  if (!current) return null;

  const title = data.title !== undefined ? data.title : current.title;
  const subtitle = data.subtitle !== undefined ? data.subtitle : current.subtitle;
  const badge = data.badge !== undefined ? data.badge : current.badge;
  const type = data.type !== undefined ? data.type : current.type;
  const category = data.category !== undefined ? data.category : current.category;
  const subcategory = data.subcategory !== undefined ? data.subcategory : current.subcategory;
  const minDiscount = data.minDiscount !== undefined ? (data.minDiscount !== null ? Number(data.minDiscount) : null) : current.minDiscount;
  const maxPrice = data.maxPrice !== undefined ? (data.maxPrice !== null ? Number(data.maxPrice) : null) : current.maxPrice;
  const offerId = data.offerId !== undefined ? (data.offerId !== null ? Number(data.offerId) : null) : current.offerId;
  const productIds = data.productIds !== undefined ? data.productIds : current.productIds;
  const limit = data.limit !== undefined ? Number(data.limit) : current.limit;
  const order = data.order !== undefined ? Number(data.order) : current.order;
  const isActive = data.isActive !== undefined ? Boolean(data.isActive) : current.isActive;
  const viewAllUrl = data.viewAllUrl !== undefined ? data.viewAllUrl : current.viewAllUrl;

  const rows = await prisma.$queryRawUnsafe<HomeSectionItem[]>(
    `UPDATE "HomeSection"
     SET "title" = $1, "subtitle" = $2, "badge" = $3, "type" = $4, "category" = $5, "subcategory" = $6,
         "minDiscount" = $7, "maxPrice" = $8, "offerId" = $9, "productIds" = $10, "limit" = $11,
         "order" = $12, "isActive" = $13, "viewAllUrl" = $14, "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = $15
     RETURNING *;`,
    title,
    subtitle,
    badge,
    type,
    category,
    subcategory,
    minDiscount,
    maxPrice,
    offerId,
    productIds,
    limit,
    order,
    isActive,
    viewAllUrl,
    id
  );

  return rows[0] || null;
}

export async function dbDeleteSection(id: number): Promise<boolean> {
  await ensureHomeSectionTable();
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "HomeSection" WHERE "id" = $1;`, id);
    return true;
  } catch {
    return false;
  }
}

