# BabyBloom Dedicated Express Backend 🚀

This is the standalone, production-grade **Node.js + Express.js + Prisma ORM** backend service for BabyBloom.

---

## 📁 Architecture & Features

- **Framework:** Express.js + TypeScript
- **ORM:** Prisma Client with PostgreSQL (`babybloom_db` on VPS)
- **Authentication:** HMAC SHA-256 secure session cookies & Bearer tokens for Admin Panel
- **Security:** CORS with allowed origin validation, HTTP-only cookies, sanitized inputs
- **Features Supported:**
  - `/api/products`: Full catalog CRUD with multi-category & age-group arrays
  - `/api/categories` & `/api/subcategories`: Hierarchical category and subcategory management
  - `/api/sections`: Dynamic homepage showcase sections (categories, discounts, budget stores, curated picks)
  - `/api/orders`: Secure order placement, server-side price verification, inventory stock decrement
  - `/api/offers`: Sitewide, category-wise, and product-specific promotional discounts
  - `/api/banners`: Hero slider banner management
  - `/api/invoices`: Automated GST invoice calculations, Indian Rupees words conversion, printable HTML invoice generator
  - `/api/profile`: Store metadata, contact details, payment toggles (COD, UPI, Bank Transfer)
  - `/api/admin/auth`: Session verification, login, logout, password change
  - `/api/keep-alive` & `/health`: Service & database heartbeat monitoring

---

## 🛠️ Local Development

```bash
cd backend
npm install
npx prisma generate
npm run dev
```

The server starts at `http://localhost:5000`.

---

## 🌐 VPS Deployment Guide (`api.babyybloom.com`)

### 1. SSH into your VPS & Pull Code
```bash
ssh root@YOUR_VPS_IP
cd /path/to/babybloom/backend
git pull origin main
```

### 2. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
npm run build
```

### 3. Start with PM2
```bash
# Start backend service
pm2 start ecosystem.config.cjs

# Save PM2 process list to persist on system reboot
pm2 save
```

### 4. Nginx Configuration for `api.babyybloom.com`
Ensure your Nginx server block for `api.babyybloom.com` proxies requests to port 5000:

```nginx
server {
    server_name api.babyybloom.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    # ssl_certificate ...
    # ssl_certificate_key ...
}
```

Reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

Check health:
```bash
curl https://api.babyybloom.com/health
```

