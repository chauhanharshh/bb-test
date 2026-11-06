import prisma from "./prisma.js";

export interface Offer {
  id: number;
  title: string;
  description?: string | null;
  discountPercent: number;
  scope: string; // "SITEWIDE", "PRODUCTS", "CATEGORY"
  targetCategory?: string | null;
  productIds: number[];
  couponCode?: string | null;
  bannerText?: string | null;
  isActive: boolean;
}

export async function getActiveOffers(): Promise<Offer[]> {
  try {
    const offers = await prisma.offer.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return offers;
  } catch (error) {
    console.error("Error fetching active offers:", error);
    return [];
  }
}

export function calculateProductOffer(
  productId: number,
  category: string,
  price: number,
  activeOffers: Offer[],
  categories?: string[]
): {
  originalPrice: number;
  price: number;
  discountPercent: number;
  appliedOffer: Offer | null;
} {
  let bestOffer: Offer | null = null;
  let maxDiscount = 0;

  for (const offer of activeOffers) {
    if (!offer.isActive) continue;

    let applies = false;

    if (offer.scope === "SITEWIDE") {
      applies = true;
    } else if (offer.scope === "PRODUCTS" && offer.productIds.includes(productId)) {
      applies = true;
    } else if (
      offer.scope === "CATEGORY" &&
      offer.targetCategory &&
      (offer.targetCategory.toLowerCase() === category.toLowerCase() ||
        (categories &&
          categories.some(
            (c) => c.toLowerCase() === offer.targetCategory?.toLowerCase()
          )))
    ) {
      applies = true;
    }

    if (applies && offer.discountPercent > maxDiscount) {
      maxDiscount = offer.discountPercent;
      bestOffer = offer;
    }
  }

  if (bestOffer && maxDiscount > 0) {
    const discountedPrice = Math.round(price * (1 - maxDiscount / 100));
    return {
      originalPrice: price,
      price: discountedPrice,
      discountPercent: maxDiscount,
      appliedOffer: bestOffer,
    };
  }

  return {
    originalPrice: price,
    price: price,
    discountPercent: 0,
    appliedOffer: null,
  };
}

