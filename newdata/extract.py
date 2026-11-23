import os
import json
import csv
import re

base_dir = r"H:\babybloom\newdata\2026-11-23T09_23Z.dir\2026-11-23T09_23Z\babybloom"
out_json_dir = r"H:\babybloom\newdata\extracted_json"
out_csv_dir = r"H:\babybloom\newdata\extracted_csv"
out_sql_path = r"H:\babybloom\newdata\extracted_database.sql"

os.makedirs(out_json_dir, exist_ok=True)
os.makedirs(out_csv_dir, exist_ok=True)

# File mappings from toc inspection
table_files = {
    "Product": {
        "file": "3534.dat",
        "columns": ["id", "name", "description", "price", "imageUrl", "createdAt", "updatedAt", "ageGroup", "category", "stock", "style", "ageGroups", "categories"]
    },
    "Order": {
        "file": "3536.dat",
        "columns": ["id", "total", "status", "createdAt", "customerName"]
    },
    "OrderItem": {
        "file": "3538.dat",
        "columns": ["id", "orderId", "productId", "name", "price", "quantity", "ageGroup"]
    },
    "Banner": {
        "file": "3540.dat",
        "columns": ["id", "imageUrl", "title", "alt", "linkUrl", "order", "isActive", "createdAt", "updatedAt"]
    },
    "Offer": {
        "file": "3542.dat",
        "columns": ["id", "title", "description", "discountPercent", "scope", "targetCategory", "productIds", "couponCode", "bannerText", "isActive", "createdAt", "updatedAt"]
    },
    "Category": {
        "file": "3544.dat",
        "columns": ["id", "name", "slug", "description", "imageUrl", "createdAt", "updatedAt"]
    },
    "Subcategory": {
        "file": "3546.dat",
        "columns": ["id", "name", "slug", "categoryId", "createdAt", "updatedAt"]
    },
    "StoreProfile": {
        "file": "3547.dat",
        "columns": ["id", "storeName", "tagline", "ownerName", "phone", "whatsappNumber", "email", "addressLine1", "addressLine2", "city", "state", "pincode", "instagramUrl", "facebookUrl", "aboutText", "codEnabled", "codNote", "upiEnabled", "upiId", "upiQrUrl", "cardEnabled", "netbankingEnabled", "bankName", "accountNumber", "ifscCode", "accountHolderName", "createdAt", "updatedAt", "gstNumber"]
    },
    "AgeRange": {
        "file": "3549.dat",
        "columns": ["id", "name", "order", "createdAt", "updatedAt"]
    },
    "Invoice": {
        "file": "3551.dat",
        "columns": ["id", "invoiceNumber", "orderId", "customerName", "customerEmail", "customerPhone", "customerAddress", "paymentMethod", "storeName", "storeGstNumber", "storeAddress", "storePhone", "storeEmail", "subtotal", "cgstAmount", "sgstAmount", "totalTax", "grandTotal", "itemsJson", "createdAt"]
    },
    "AdminCredential": {
        "file": "3552.dat",
        "columns": ["id", "username", "passwordHash", "updatedAt"]
    }
}

def unescape_pg_copy(val):
    if val == r"\N":
        return None
    # unescape standard pg escapes
    val = val.replace(r"\t", "\t").replace(r"\n", "\n").replace(r"\\", "\\")
    # handle postgres array literal like {a,b,c}
    if val.startswith("{") and val.endswith("}"):
        inner = val[1:-1]
        if not inner:
            return []
        # split by comma handling quotes
        return [item.strip().strip('"') for item in inner.split(",") if item.strip()]
    # handle numeric
    if val.isdigit():
        return int(val)
    try:
        if "." in val:
            float_val = float(val)
            return float_val
    except ValueError:
        pass
    # handle boolean
    if val.lower() == "t":
        return True
    if val.lower() == "f":
        return False
    # handle json if looks like json
    if (val.startswith("{") and val.endswith("}")) or (val.startswith("[") and val.endswith("]")):
        try:
            return json.loads(val)
        except Exception:
            pass
    return val

summary = {}
sql_statements = []

for table_name, info in table_files.items():
    dat_path = os.path.join(base_dir, info["file"])
    cols = info["columns"]
    if not os.path.exists(dat_path):
        print(f"Warning: {dat_path} does not exist.")
        continue

    rows = []
    with open(dat_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\r\n")
            if not line or line == r"\.":
                continue
            parts = line.split("\t")
            # map to columns
            row_dict = {}
            for i, col in enumerate(cols):
                raw_val = parts[i] if i < len(parts) else r"\N"
                row_dict[col] = unescape_pg_copy(raw_val)
            rows.append(row_dict)

    summary[table_name] = len(rows)

    # 1. Save JSON
    json_path = os.path.join(out_json_dir, f"{table_name.lower()}s.json")
    with open(json_path, "w", encoding="utf-8") as jf:
        json.dump(rows, jf, indent=2, ensure_ascii=False)

    # 2. Save CSV
    csv_path = os.path.join(out_csv_dir, f"{table_name.lower()}s.csv")
    with open(csv_path, "w", encoding="utf-8", newline="") as cf:
        writer = csv.DictWriter(cf, fieldnames=cols)
        writer.writeheader()
        for r in rows:
            # format arrays/dicts for csv
            csv_row = {}
            for k, v in r.items():
                if isinstance(v, (list, dict)):
                    csv_row[k] = json.dumps(v, ensure_ascii=False)
                elif v is None:
                    csv_row[k] = ""
                else:
                    csv_row[k] = v
            writer.writerow(csv_row)

    # 3. Generate SQL INSERT statements
    sql_statements.append(f"-- Table: {table_name} ({len(rows)} rows)")
    for r in rows:
        val_strs = []
        for col in cols:
            v = r.get(col)
            if v is None:
                val_strs.append("NULL")
            elif isinstance(v, bool):
                val_strs.append("TRUE" if v else "FALSE")
            elif isinstance(v, (int, float)):
                val_strs.append(str(v))
            elif isinstance(v, list):
                # pg text array
                items = "{" + ",".join(f'"{item}"' for item in v) + "}"
                items_escaped = items.replace("'", "''")
                val_strs.append(f"'{items_escaped}'")
            elif isinstance(v, dict):
                json_str = json.dumps(v).replace("'", "''")
                val_strs.append(f"'{json_str}'")
            else:
                str_v = str(v).replace("'", "''")
                val_strs.append(f"'{str_v}'")
        col_list_str = ", ".join(f'"{c}"' for c in cols)
        sql_statements.append(f'INSERT INTO "public"."{table_name}" ({col_list_str}) VALUES ({", ".join(val_strs)}) ON CONFLICT (id) DO NOTHING;')
    sql_statements.append("")

with open(out_sql_path, "w", encoding="utf-8") as sf:
    sf.write("\n".join(sql_statements))

print("EXTRACTION COMPLETE!")
print(json.dumps(summary, indent=2))
