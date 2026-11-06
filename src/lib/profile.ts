import prisma from "./prisma.js";

export interface StoreProfileData {
  id?: number;
  storeName: string;
  tagline: string;
  ownerName: string;
  gstNumber: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  instagramUrl: string;
  facebookUrl: string;
  aboutText: string;

  codEnabled: boolean;
  codNote: string;
  upiEnabled: boolean;
  upiId: string;
  upiQrUrl: string;
  cardEnabled: boolean;
  netbankingEnabled: boolean;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

export const DEFAULT_STORE_PROFILE: StoreProfileData = {
  id: 1,
  storeName: "Baby Bloom",
  tagline: "Everyday outfits for your little trendsetters",
  ownerName: "Harsh Chauhan",
  gstNumber: "",
  phone: "+91 95200 42719",
  whatsappNumber: "919520042719",
  email: "babybloom.bb2024@gmail.com",
  addressLine1: "Khanna Nagar, House no. 41",
  addressLine2: "Opposite Kaushik Academy",
  city: "Haridwar",
  state: "Uttarakhand",
  pincode: "249401",
  instagramUrl: "https://instagram.com",
  facebookUrl: "https://facebook.com",
  aboutText: "Everyday outfits for your little trendsetters. Premium baby and kids wear for ages 0 to 6 years.",

  codEnabled: true,
  codNote: "Pay in cash when order arrives at your doorstep.",
  upiEnabled: true,
  upiId: "9520042719@upi",
  upiQrUrl: "",
  cardEnabled: true,
  netbankingEnabled: true,
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  accountHolderName: "",
};

let storeProfileTableEnsured = false;

export async function ensureStoreProfileTable(): Promise<void> {
  if (storeProfileTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "StoreProfile" (
        "id" INTEGER PRIMARY KEY DEFAULT 1,
        "storeName" TEXT NOT NULL DEFAULT 'Baby Bloom',
        "tagline" TEXT DEFAULT 'Everyday outfits for your little trendsetters',
        "ownerName" TEXT DEFAULT 'Baby Bloom Store',
        "gstNumber" TEXT DEFAULT '',
        "phone" TEXT NOT NULL DEFAULT '+91 95200 42719',
        "whatsappNumber" TEXT NOT NULL DEFAULT '919520042719',
        "email" TEXT NOT NULL DEFAULT 'babybloom.bb2024@gmail.com',
        "addressLine1" TEXT DEFAULT 'Khanna Nagar, House no. 41',
        "addressLine2" TEXT DEFAULT 'Opposite Kaushik Academy',
        "city" TEXT DEFAULT 'Haridwar',
        "state" TEXT DEFAULT 'Uttarakhand',
        "pincode" TEXT DEFAULT '249401',
        "instagramUrl" TEXT DEFAULT 'https://instagram.com',
        "facebookUrl" TEXT DEFAULT 'https://facebook.com',
        "aboutText" TEXT DEFAULT 'Everyday outfits for your little trendsetters. Clothes for 1-6 years.',
        "codEnabled" BOOLEAN NOT NULL DEFAULT true,
        "codNote" TEXT DEFAULT 'Pay in cash when your order arrives at your doorstep.',
        "upiEnabled" BOOLEAN NOT NULL DEFAULT true,
        "upiId" TEXT DEFAULT '9520042719@upi',
        "upiQrUrl" TEXT,
        "cardEnabled" BOOLEAN NOT NULL DEFAULT true,
        "netbankingEnabled" BOOLEAN NOT NULL DEFAULT true,
        "bankName" TEXT,
        "accountNumber" TEXT,
        "ifscCode" TEXT,
        "accountHolderName" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    storeProfileTableEnsured = true;
  } catch (err) {
    console.warn("Could not ensure StoreProfile table:", err);
  }
}

export async function getStoreProfile(): Promise<StoreProfileData> {
  try {
    await ensureStoreProfileTable();
    const profile = await prisma.storeProfile.findUnique({
      where: { id: 1 },
    });

    if (profile) {
      return {
        id: profile.id,
        storeName: profile.storeName || DEFAULT_STORE_PROFILE.storeName,
        tagline: profile.tagline || DEFAULT_STORE_PROFILE.tagline,
        ownerName: profile.ownerName || DEFAULT_STORE_PROFILE.ownerName,
        gstNumber: profile.gstNumber || DEFAULT_STORE_PROFILE.gstNumber,
        phone: profile.phone || DEFAULT_STORE_PROFILE.phone,
        whatsappNumber: profile.whatsappNumber || DEFAULT_STORE_PROFILE.whatsappNumber,
        email: profile.email || DEFAULT_STORE_PROFILE.email,
        addressLine1: profile.addressLine1 || DEFAULT_STORE_PROFILE.addressLine1,
        addressLine2: profile.addressLine2 || DEFAULT_STORE_PROFILE.addressLine2,
        city: profile.city || DEFAULT_STORE_PROFILE.city,
        state: profile.state || DEFAULT_STORE_PROFILE.state,
        pincode: profile.pincode || DEFAULT_STORE_PROFILE.pincode,
        instagramUrl: profile.instagramUrl || DEFAULT_STORE_PROFILE.instagramUrl,
        facebookUrl: profile.facebookUrl || DEFAULT_STORE_PROFILE.facebookUrl,
        aboutText: profile.aboutText || DEFAULT_STORE_PROFILE.aboutText,
        codEnabled: profile.codEnabled ?? true,
        codNote: profile.codNote || DEFAULT_STORE_PROFILE.codNote,
        upiEnabled: profile.upiEnabled ?? true,
        upiId: profile.upiId || DEFAULT_STORE_PROFILE.upiId,
        upiQrUrl: profile.upiQrUrl || "",
        cardEnabled: profile.cardEnabled ?? true,
        netbankingEnabled: profile.netbankingEnabled ?? true,
        bankName: profile.bankName || "",
        accountNumber: profile.accountNumber || "",
        ifscCode: profile.ifscCode || "",
        accountHolderName: profile.accountHolderName || "",
      };
    }
  } catch (e) {
    console.warn("Failed to fetch store profile from DB, using defaults:", e);
  }

  return DEFAULT_STORE_PROFILE;
}

export async function updateStoreProfile(data: Partial<StoreProfileData>): Promise<StoreProfileData> {
  await ensureStoreProfileTable();
  const updated = await prisma.storeProfile.upsert({
    where: { id: 1 },
    update: {
      ...data,
      updatedAt: new Date(),
    },
    create: {
      id: 1,
      ...DEFAULT_STORE_PROFILE,
      ...data,
    },
  });

  return {
    ...DEFAULT_STORE_PROFILE,
    ...updated,
    id: 1,
    tagline: updated.tagline || DEFAULT_STORE_PROFILE.tagline,
    ownerName: updated.ownerName || DEFAULT_STORE_PROFILE.ownerName,
    gstNumber: updated.gstNumber || DEFAULT_STORE_PROFILE.gstNumber,
    addressLine1: updated.addressLine1 || DEFAULT_STORE_PROFILE.addressLine1,
    addressLine2: updated.addressLine2 || DEFAULT_STORE_PROFILE.addressLine2,
    city: updated.city || DEFAULT_STORE_PROFILE.city,
    state: updated.state || DEFAULT_STORE_PROFILE.state,
    pincode: updated.pincode || DEFAULT_STORE_PROFILE.pincode,
    instagramUrl: updated.instagramUrl || DEFAULT_STORE_PROFILE.instagramUrl,
    facebookUrl: updated.facebookUrl || DEFAULT_STORE_PROFILE.facebookUrl,
    aboutText: updated.aboutText || DEFAULT_STORE_PROFILE.aboutText,
    codNote: updated.codNote || DEFAULT_STORE_PROFILE.codNote,
    upiId: updated.upiId || DEFAULT_STORE_PROFILE.upiId,
    upiQrUrl: updated.upiQrUrl || "",
    bankName: updated.bankName || "",
    accountNumber: updated.accountNumber || "",
    ifscCode: updated.ifscCode || "",
    accountHolderName: updated.accountHolderName || "",
  };
}

