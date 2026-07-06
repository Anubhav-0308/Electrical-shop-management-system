# Shri Krishna Lighthouse Bhonti — Shop Website

A full website + billing system for an electrical/electronics shop.
Built with **HTML, CSS, JavaScript, Node.js (Express), and MongoDB.**

Owner: **Anubhav Kanthariya**
Shop: **Shri Krishna Lighthouse Bhonti**

---

## 1. What's included

- **Home page** with a scrolling banner of featured products, category grid (Switch, 5‑Pin Socket, MCB, Wire, LED Bulb, Fan, etc.), and customer reviews.
- **Products page** — click a category (e.g. "Switch") to see every switch you stock; search bar works across all products.
- **Automatic billing** — customer adds products + quantity, the total is calculated automatically from the owner's current rate (never trusted from the browser), then the customer enters phone/email and a bill is generated instantly, downloadable as a real PDF invoice.
- **Owner dashboard** (opens automatically when the shop's Gmail + password are used to log in):
  - Add / edit / delete **products** and change the **rate at any time**
  - Add / delete **brands**
  - See every **order/bill**, update its status, see who ordered what
  - See every **contact message**
  - Live stats (total bills, paid revenue, unread messages)
- **Customer dashboard**: profile, full bill/order history with PDF downloads, star ratings & reviews.
- **Contact page** with the owner's permanent name/phone/email plus Instagram, Facebook, YouTube, LinkedIn, Twitter links (also in every page's footer).
- **Payments** — a working "demo payment" flow (marks a bill Paid instantly) with a clearly marked spot to plug in a real gateway like Razorpay/Stripe.
- **Notifications bell** — the owner sees new bills/messages as soon as they log in.
- **AI shop assistant (chat bubble, bottom-right)** — answers only electrical/electronics questions (switches, sockets, wires, MCBs, prices, etc.) using a built-in offline logic; optionally connect a real AI API (see section 7).
- **REST API** powering everything under `/api/...` (see section 6).
- **`public/src/images/`** folder — put all your real photos here (product photos, brand logos, your shop logo). Placeholder SVGs are already inside so the site looks complete even before you add real photos.

---

## 2. Before you start — install two things on your computer

1. **Node.js** (v18 or newer) — https://nodejs.org (download the "LTS" version and install it, like any normal program).
2. **MongoDB** — you have two options, pick whichever is easier for you:
   - **Easiest — MongoDB Atlas (free, cloud, no install):** go to https://www.mongodb.com/cloud/atlas/register, create a free cluster, click "Connect" → "Drivers" and copy the connection string (it looks like `mongodb+srv://user:password@cluster.mongodb.net/...`).
   - **Or install MongoDB locally:** https://www.mongodb.com/try/download/community — then it runs at `mongodb://127.0.0.1:27017`.

You do **not** need to know how to code to do the steps below — just follow them exactly.

---

## 3. Running it on your own computer

1. Unzip the project. Open a terminal (Command Prompt / PowerShell / Terminal) inside the unzipped `shri-krishna-lighthouse` folder.
2. Install the dependencies:
   ```
   npm install
   ```
3. Create your settings file: copy `.env.example` to a new file named `.env` in the same folder.
   - If you're using MongoDB Atlas, paste your connection string into `MONGO_URI=`.
   - If you're using local MongoDB, you can leave `MONGO_URI` as it is.
   - Everything else (owner email, password, phone, social links) is already filled in with your details — change anything you like.
4. Create the owner account and some sample products (run this once):
   ```
   npm run seed
   ```
   You should see: `Login as OWNER using: anubhavkantharia@gmail.com / annu.0308`
5. Start the website:
   ```
   npm start
   ```
6. Open your browser at **http://localhost:5000** — the site is now running.

### Logging in
- **As the owner:** go to Login, enter `anubhavkantharia@gmail.com` and `annu.0308` → you'll land straight on the **Owner Dashboard**.
- **As a customer:** click "Create an account" and register with any name/email/phone/password → you'll land on the **Customer Dashboard**. Anyone can also generate a bill without logging in (guest checkout) as long as they give a phone number and email.

### Adding your real images
Put your photos in `public/src/images/` (e.g. `switch1.jpg`, `logo.png`). Then:
- For a **product photo**: in the Owner Dashboard, when adding/editing a product, there's an `image` field available via the API — the simplest way is to open `public/js/admin-dashboard.js` and extend the product form with an image URL field pointing to `/src/images/yourfile.jpg`, or ask a developer to wire it up — the backend (`models/Product.js`) already supports an `image` path.
- For the **shop logo** in the header/footer: replace the ⚡ emoji in `public/partials/header.html` and `public/partials/footer.html` with `<img src="/src/images/logo.png" style="width:32px;height:32px;">` once you've added your real logo file there.

---

## 4. Sharing a link "that anyone can use"

Right now the site only runs on **your own computer** (`localhost`) — other people can't open that link because it only exists on your machine. To get a real link anyone in the world can open, you need to **deploy** it to a hosting service. Recommended free/cheap options:

1. **Render.com** (easiest for beginners):
   - Push this project to a GitHub repository (create a free GitHub account, create a new repo, upload these files).
   - On https://render.com, click "New +" → "Web Service", connect your GitHub repo.
   - Build command: `npm install`   Start command: `npm start`
   - Add your `.env` values under Render's "Environment" tab (never upload your real `.env` file to GitHub).
   - Also set up a free MongoDB Atlas cluster (section 2) and put its connection string in `MONGO_URI` on Render.
   - Render gives you a public link like `https://shri-krishna-lighthouse.onrender.com` — **that's the link you share** with customers, family, anyone. They just open it in any browser, no installation needed.
2. **Railway.app** or **Vercel** work similarly for Node.js + MongoDB apps.

Once deployed:
- **You (the owner)** log in with your Gmail + password to reach the Owner Dashboard from anywhere, on any device.
- **Any customer** who opens the link can create their own account (or checkout as a guest), browse products, generate bills, pay, and leave reviews — all from their own phone or computer.

If you'd like, a developer can do this deployment step for you in about 15–20 minutes — it just requires a GitHub account, a Render account, and the free MongoDB Atlas cluster.

---

## 5. About payments

The site ships with a **working demo payment**: clicking "Pay Online" instantly marks the bill as Paid, so you can test the whole flow end-to-end. This is intentional — accepting *real* online money legally requires a registered payment gateway account (e.g. Razorpay, PayU, Stripe) in the shop's/owner's name, which only you can set up (it needs your bank details and business KYC).

To switch to real payments later:
1. Create a free Razorpay (or similar) account and get your `Key ID` / `Key Secret`.
2. Put them in `.env` (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — placeholders already included).
3. In `routes/orderRoutes.js`, replace the `/:id/pay` route with a real Razorpay order + verification flow (Razorpay's docs have a copy-paste Node.js example: https://razorpay.com/docs/payments/server-integration/nodejs/).

---

## 6. API reference (for developers)

All endpoints are prefixed with `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Create a customer account |
| POST | `/auth/login` | Login (owner or customer) |
| GET | `/auth/me` | Current logged-in user |
| GET | `/products?search=&category=&brand=&featured=` | List/filter products |
| GET | `/products/categories` | Distinct category list |
| POST/PUT/DELETE | `/products/:id` | Owner-only: add/edit/delete products & rates |
| GET/POST/PUT/DELETE | `/brands` | Brand management (owner-only to write) |
| POST | `/orders` | Generate a bill (auto-calculated from current rates) |
| POST | `/orders/:id/pay` | Mark a bill as paid (demo payment) |
| GET | `/orders/my` | Logged-in customer's own bills |
| GET | `/orders` | Owner-only: all bills |
| GET | `/orders/:id/invoice` | Download/print the PDF invoice |
| POST | `/contact` | Send a message to the owner |
| GET | `/contact` | Owner-only: view messages |
| GET/POST | `/reviews` | Ratings & reviews |
| POST | `/bot` | Ask the electronics-only chat assistant |
| GET | `/shop-info` | Owner name/phone/email/social links |

---

## 7. Connecting a real AI bot (optional)

By default the chat assistant works **completely offline** using built-in rules, so it never costs anything and always stays "electronics-only" as required. If you'd like it to be smarter using a real AI model:

1. Get an API key (e.g. from Anthropic or OpenAI).
2. Put it in `.env` as `AI_API_KEY`.
3. Open `routes/botRoutes.js` and replace the placeholder block (search for `AI_API_KEY`) with a real API call, using a system prompt like:
   *"You are an assistant for an electrical/electronics shop. Only answer questions about electrical and electronic products, wiring, and related topics. Politely decline anything else."*

---

## 8. Project structure

```
shri-krishna-lighthouse/
├── server.js              # Express app entry point
├── config/db.js           # MongoDB connection
├── models/                # Mongoose schemas (User, Product, Brand, Order, Contact, Review)
├── routes/                # API routes
├── middleware/auth.js     # Login/owner-only protection
├── seed/seed.js           # Creates the owner account + sample products
├── public/                # Everything the browser loads
│   ├── index.html, about.html, products.html, contact.html,
│   │   login.html, register.html, admin-dashboard.html, customer-dashboard.html
│   ├── css/style.css
│   ├── js/                # Page logic (api.js, layout.js, products.js, etc.)
│   ├── partials/          # Shared header/footer, injected by js/layout.js
│   └── src/images/        # ALL PHOTOS GO HERE (products, brand logos, your shop logo)
├── .env.example           # Copy to .env and fill in your values
└── package.json
```

---

## 9. Security notes

- Passwords are never stored in plain text — they're hashed with bcrypt.
- The owner login is just a normal account seeded with the email/password from `.env`; keep your `.env` file private and never upload it to a public GitHub repo.
- Change `JWT_SECRET` in `.env` to a long random value before you deploy publicly.
- If you ever want to change the owner password, edit `OWNER_PASSWORD` in `.env` and re-run `npm run seed`.
