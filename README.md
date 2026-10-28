# HotelPro — Hotel Booking & Management

Full-stack hotel booking site: React + Vite frontend, Node/Express API (also deployable as Vercel serverless functions), MongoDB or a local JSON file for storage.

## Run locally
```bash
npm install
npm run dev
```
- Customer site: http://localhost:5173
- **Admin panel:** click **Sign in** on the customer site, choose the **Admin** tab, and sign in (you are taken to http://localhost:5173/admin). You can also open `/admin` directly.
- API: http://localhost:3000

Data is stored in MongoDB when `MONGODB_URI` in `.env` is valid and reachable; otherwise automatically in `data/hotelpro-local-db.json`. Demo hotels and rooms are added the first time the server starts.

## Two separate logins
| | Customer | Admin |
|---|---|---|
| Where | Sign in → **Customer** tab (or Create account) | Sign in → **Admin** tab on the same popup, or `/admin` directly |
| Credentials | Registered by the customer | `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` (fixed, cannot be registered) |
| Token | `hotelpro_token` | `hotelpro_admin_token` |

Every admin API call is checked on the server; a customer token cannot create, edit or delete hotels, rooms or other people's bookings.

## Features
**Customer:** search hotels by city/name, dates and guests; see only rooms that are free for the chosen dates; 3-step booking (stay → guest details → payment); payment by card, UPI, net banking or pay-at-hotel; My bookings with details, cancel (refund marked) and delete; saved rooms; profile; settings.

**Admin:** dashboard (revenue, bookings, customers, occupancy); add/edit/delete hotels and rooms with photo upload; set a room to Available / Maintenance / Hidden; view, search, filter, update status of, or delete any booking; mark payments paid/pending/refunded; list customers.

**Rules enforced by the server:** no double-booking of a room, no past dates, guest count ≤ room capacity, prices and taxes (12%) calculated server-side, customers can only see their own bookings, a booking must be cancelled before it can be deleted by the customer, hotels/rooms with active bookings cannot be deleted.

## Chatbot, support tickets & WhatsApp
- **Chat assistant** (green "Chat with us" button, bottom-right): understands Hindi / Hinglish / English. It can show available rooms for chosen city + dates + guests, open the booking form for a room, show or cancel the customer's bookings, answer payment / refund / ID questions, raise **support tickets**, and check ticket status.
- **Rude or abusive language:** the bot stays calm, asks the customer to keep it respectful and offers customer support; on repeat it auto-opens a High-priority "escalated" ticket plus WhatsApp / call / email buttons.
- **WhatsApp button** (bottom-right, above chat): opens a WhatsApp chat with your number. Set it in `.env`: `VITE_WHATSAPP_NUMBER=91XXXXXXXXXX` (country code + number, digits only). Restart `npm run dev` after changing it.
- **Admin → Tickets:** see all tickets (with chat transcript), change status, reply (customer sees the reply in the chatbot via "ticket status"), reply on WhatsApp.
- **Call appointment:** the chatbot's "Book a call" lets a customer pick a date + time slot and phone number; it appears in Admin → Tickets (category *Call appointment*), and the customer can confirm it on WhatsApp. Edit the time slots in `src/lib/support.js` and `routes/tickets.js`.
- API: `GET|POST|PUT /api/tickets` (PUT uses `?id=`).

## Payments
Payments are **simulated** (no real money moves). Only the card brand and last 4 digits are stored — the full card number and CVV never leave the browser form. To accept real payments, integrate a gateway such as Razorpay or Stripe in `lib/booking.js` / `src/BookingFlow.jsx`.

## Deploy to Vercel (free plan OK)
The whole API runs as **one** serverless function (`api/[...path].js`), so the 12-function free-plan limit is not an issue. Handlers live in `routes/`.
1. Push the project to GitHub (`.env` is git-ignored — never upload it) and import it in Vercel. Framework: **Vite** (build `npm run build`, output `dist` — already set in `vercel.json`).
2. Project → Settings → Environment Variables, add: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, **`VITE_WHATSAPP_NUMBER`** (e.g. `919876543210`), `VITE_SUPPORT_PHONE`, `VITE_SUPPORT_EMAIL`.
3. Deploy. Without MongoDB, Vercel storage is temporary — always use MongoDB in production (in Atlas → Network Access allow `0.0.0.0/0` for Vercel).

## API
`POST /api/auth/register|login|admin-login`, `GET /api/auth/me`, `GET|POST /api/hotels`, `GET|PUT|DELETE /api/hotels/:id`, `GET|POST /api/rooms`, `GET|PUT|DELETE /api/rooms/:id`, `GET|POST /api/bookings`, `GET|PUT|DELETE /api/bookings/:id`, `GET /api/admin/stats`, `GET /api/admin/users`, `DELETE /api/admin/users/:id`.
