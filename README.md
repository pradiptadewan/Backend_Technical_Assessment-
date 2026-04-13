# Otomotif Marketplace API

REST API untuk marketplace otomotif (cars & motorcycles) dengan autentikasi JWT, kategori bertingkat, pencarian full-text + faceted search, dan cursor pagination.

## Setup Lokal

1. Install dependencies

```bash
npm install
```

2. Siapkan environment

```bash
cp .env.example .env
```

Isi `.env`:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- (optional) `REDIS_URL` (untuk caching)
- (optional) `CACHE_TTL_SECONDS` (default 60)
- (optional) `JWT_ACCESS_EXPIRES` dan `JWT_REFRESH_EXPIRES`

3. Jalankan server

```bash
npm run dev
```

Server berjalan di `http://localhost:5000/api`.

## Seed Data (>= 500 listings)

```bash
npm run seed -- --reset
```

Script akan membuat:
- kategori bertingkat
- filter attributes
- user admin, seller, buyer
- 500+ listings

Default akun:
- Admin: `admin@otomotif.local` / `Admin123!`
- Seller: `seller@otomotif.local` / `Seller123!`
- Buyer: `buyer@otomotif.local` / `Buyer123!`

## Arsitektur & Desain

### Category Tree (Materialized Path)
Kategori menyimpan `parentId`, `ancestors[]`, dan `depth`. Dengan ini:
- subtree lookup: `Category.find({ ancestors: categoryId })`
- listing per kategori + sub-kategori: query `categoryId` dengan daftar descendants.

### Listing Filters & Search
- Field utama tersimpan sebagai kolom (make, model, year, price, dll).
- Dynamic attributes disimpan sebagai array `attributes[]` dengan `key` + `value*`.
- Pencarian full-text menggunakan MongoDB text index.

### Pagination
Cursor pagination berbasis `sortField` + `_id`. Format cursor:

```
base64({ value, id })
```

Contoh query:

```
/listings?limit=20&sort=price:asc&cursor=...
```

### Indexing (MongoDB)
- text index untuk `title`, `description`, `make`, `model`, `location.city`
- compound index untuk `categoryId`, `status`, `isRemoved`, `createdAt`
- index untuk `price`, `year`, `mileage`
- index untuk `attributes.key` + `value*`

## API Docs

OpenAPI spec tersedia di:

- `docs/openapi.yaml`

## Diagram Skema

Mermaid diagram di:

- `docs/schema.mmd`

Draw.io diagram di:

- `docs/schema.drawio`

## Redis Cache (Bonus)

Caching dipakai untuk:
- `GET /filters`
- `GET /filters/:categoryId`
- `GET /categories`
- `GET /listings/search/suggest`

Jika `REDIS_URL` tidak diisi, otomatis fallback ke in-memory cache.

## Docker (Bonus)

Build & run:

```bash
docker compose up --build
```

Untuk Docker, gunakan `MONGODB_URI=mongodb://mongo:27017/otomotif_marketplace`.
Contoh environment khusus Docker ada di `.env.docker`.

## Endpoint Ringkas

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Listings:
- `POST /listings` (seller/admin)
- `GET /listings` (filters + cursor pagination)
- `GET /listings/:id`
- `PATCH /listings/:id` (owner/admin)
- `DELETE /listings/:id` (soft delete)

Search & Filters:
- `GET /listings/search`
- `GET /listings/search/suggest`
- `GET /filters`
- `GET /filters/:categoryId`

Categories:
- `GET /categories`
- `GET /categories/:id`
- `GET /categories/:id/listings`
- `POST /categories` (admin)
- `PATCH /categories/:id` (admin)

Users:
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/:id/listings`

## Deployment

Base URL (isi setelah deploy):

```
https://<your-deployment-url>/api
```
