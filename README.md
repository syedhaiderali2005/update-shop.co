# SHOP.CO Full-Stack Workspace

Three separate applications share one REST API and MongoDB database:

- `backend/` — JavaScript CommonJS, Express 4, Mongoose 8, port **4000**
- `shop/` — React + Vite customer storefront, port **5173**
- `admin/` — React + TanStack admin application, port **5174**

The storefront catalogue, customer orders, admin catalogue, categories, banners, settings, customer list, order status and dashboard statistics use the API. The storefront no longer falls back to a hardcoded product catalogue. Add products in the Admin Panel before expecting products to appear in the Shop.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB Atlas database user with read/write access
- Atlas Network Access configured for your current public IP

## 1. Configure MongoDB and secrets

From the workspace root in PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```

Set these values in `backend/.env`:

```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<DB_USER>:<DB_PASSWORD>@<YOUR_CLUSTER>.mongodb.net/shopco?retryWrites=true&w=majority
JWT_SECRET=<RANDOM_SECRET_AT_LEAST_32_CHARACTERS>
JWT_EXPIRES_IN=7d
CLIENT_ORIGINS=http://localhost:5173,http://localhost:5174
ADMIN_NAME=Store Administrator
ADMIN_EMAIL=admin@shop.co
ADMIN_PASSWORD=<STRONG_PASSWORD_AT_LEAST_12_CHARACTERS>
```

Generate a JWT secret in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Use a new MongoDB database password. The password previously shared in chat should be rotated. Never put MongoDB credentials or `JWT_SECRET` in either frontend `.env` file or commit any `.env` file.

## 2. Install dependencies

From the workspace root:

```powershell
npm.cmd run install:all
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` for commands. If the combined install fails, install separately:

```powershell
cd backend
npm.cmd install
cd ..\shop
npm.cmd install
cd ..\admin
npm.cmd install
```

## 3. Create the first admin account

Open Terminal 1:

```powershell
cd backend
npm.cmd run create-admin
npm.cmd run dev
```

The admin bootstrap creates an admin user from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. It intentionally does not promote an existing customer account. If the email already belongs to a customer, choose a different admin email in `.env` and rerun the bootstrap.

Expected API URL: `http://localhost:4000/api/health`

## 4. Run the customer storefront

Open Terminal 2:

```powershell
cd shop
Copy-Item .env.example .env -ErrorAction SilentlyContinue
npm.cmd run dev
```

Open `http://localhost:5173`.

## 5. Run the Admin Panel

Open Terminal 3:

```powershell
cd admin
Copy-Item .env.example .env -ErrorAction SilentlyContinue
npm.cmd run dev
```

Open `http://localhost:5174` and sign in using the admin credentials configured in `backend/.env`.

## First-use workflow

1. Sign in to the Admin Panel.
2. Create categories in **Categories**.
3. Create products in **Products**. Each product requires a name, price, stock quantity, category name and valid HTTP(S) image URL.
4. Optional: create promotional banners in **Banners** and key/value entries in **Settings**.
5. Open the Shop. The public product API supplies the catalogue and category filters.
6. Register a customer account on the Shop, add products to the cart, enter a delivery address and place a Cash on Delivery order.
7. The Admin Panel's Orders page displays real orders and lets an admin update their status. Cancelling an order restores its reserved stock; cancelled orders cannot be reopened automatically.

## Security

- Customer registration always assigns the `customer` role. A request cannot self-assign `admin`.
- Admin creation is restricted to the bootstrap script.
- Admin API routes require a valid JWT and the `admin` role; customer JWTs receive `403`.
- Passwords are hashed with bcryptjs. JWT and database secrets remain server-side.
- Helmet, CORS allow-list, JSON body size limit, authentication rate limiting, Mongoose validation and centralized API errors are enabled.
- Checkout validates product IDs and quantities on the server and reserves stock with conditional atomic updates.

## Useful API routes

Public: `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/products`, `GET /api/products/:id`, `GET /api/categories`, `GET /api/banners`.

Customer: `GET /api/auth/me`, `GET /api/orders/mine`, `POST /api/orders`, `GET /api/orders/:id`.

Admin: `/api/admin/products`, `/api/admin/categories`, `/api/admin/banners`, `/api/admin/settings`, `/api/admin/users`, `/api/admin/orders`, `GET /api/admin/stats`. Admin routes require an admin JWT.

## Checks

From the workspace root:

```powershell
npm.cmd run check:backend
npm.cmd run typecheck:shop
npm.cmd run typecheck:admin
npm.cmd run build:shop
npm.cmd run build:admin
```

The source was type-checked for both frontends and backend JavaScript syntax-checked during preparation. Full Vite production builds and a live MongoDB Atlas end-to-end test could not be completed in this environment because dependency installation/build tooling was unavailable here. Run the commands above on your Windows PC after `npm.cmd run install:all`; configure a valid Atlas URI before starting the backend.
