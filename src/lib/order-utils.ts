/**
 * Utility for parsing customer details stored in the Order.customerName field.
 */

export interface ParsedCustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  paymentMethod: string;
}

export function parseCustomerInfo(raw: unknown): ParsedCustomerInfo {
  const result: ParsedCustomerInfo = {
    name: "Customer",
    email: "",
    phone: "",
    address: "",
    paymentMethod: "COD",
  };

  if (!raw) return result;

  // 1. Array wrapper: [ ... ]
  if (Array.isArray(raw)) {
    if (raw.length === 0) return result;
    return parseCustomerInfo(raw[0]);
  }

  // 2. Already an object
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return {
      name: (obj.name || obj.customerName || result.name)?.toString().trim() || "Customer",
      email: (obj.email || obj.customerEmail || "")?.toString().trim(),
      phone: (obj.phone || obj.customerPhone || "")?.toString().trim(),
      address: (obj.address || obj.customerAddress || "")?.toString().trim(),
      paymentMethod: (obj.paymentMethod || "COD")?.toString().trim(),
    };
  }

  // 3. String representation
  if (typeof raw === "string") {
    let str = raw.trim();

    // Remove wrapping parentheses if present: e.g. ( ... )
    if (str.startsWith("(") && str.endsWith(")")) {
      str = str.slice(1, -1).trim();
    }

    // Try parsing if string looks like an array: [ ... ]
    if (str.startsWith("[") && str.endsWith("]")) {
      try {
        const parsedArr = JSON.parse(str);
        if (Array.isArray(parsedArr) && parsedArr.length > 0) {
          return parseCustomerInfo(parsedArr[0]);
        }
      } catch {}
    }

    // Try parsing if string looks like JSON object: { ... }
    if (str.startsWith("{") && str.endsWith("}")) {
      try {
        const parsedObj = JSON.parse(str);
        if (typeof parsedObj === "object" && parsedObj !== null) {
          return parseCustomerInfo(parsedObj);
        }
      } catch {}
    }

    // Try unquoting if wrapped in outer quotes: e.g. "..."
    if (
      (str.startsWith('"') && str.endsWith('"')) ||
      (str.startsWith("'") && str.endsWith("'"))
    ) {
      try {
        const unquoted = JSON.parse(str);
        if (typeof unquoted === "string" && unquoted !== str) {
          return parseCustomerInfo(unquoted);
        }
      } catch {}
    }

    // Regex fallback if JSON parsing failed or string contains key-value pairs
    if (/name/i.test(str)) {
      const nameMatch = str.match(/(?:name)[\\\"\s]*[:=][\\\"\s]*([^\\\",}\]]+)/i);
      if (nameMatch && nameMatch[1]) {
        const candidate = nameMatch[1].replace(/[\\\"\']/g, "").trim();
        if (
          candidate &&
          candidate.toLowerCase() !== "null" &&
          candidate.toLowerCase() !== "undefined"
        ) {
          result.name = candidate;
        }
      }

      const emailMatch = str.match(/(?:email)[\\\"\s]*[:=][\\\"\s]*([^\\\",}\]]+)/i);
      if (emailMatch && emailMatch[1]) {
        result.email = emailMatch[1].replace(/[\\\"\']/g, "").trim();
      }

      const phoneMatch = str.match(/(?:phone)[\\\"\s]*[:=][\\\"\s]*([^\\\",}\]]+)/i);
      if (phoneMatch && phoneMatch[1]) {
        result.phone = phoneMatch[1].replace(/[\\\"\']/g, "").trim();
      }

      const addressMatch = str.match(/(?:address)[\\\"\s]*[:=][\\\"\s]*([^\\\",}\]]+)/i);
      if (addressMatch && addressMatch[1]) {
        result.address = addressMatch[1].replace(/[\\\"\']/g, "").trim();
      }

      if (result.name !== "Customer" || result.email || result.phone) {
        return result;
      }
    }

    // Clean plain string
    const cleaned = str.replace(/[\[\]{}"'\\]/g, "").trim();
    if (cleaned) {
      result.name = cleaned;
    }
  }

  return result;
}
