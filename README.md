# SkillSwap 🔄

> A hyperlocal community platform where neighbors exchange skills without spending money.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)

---

## What is SkillSwap?

SkillSwap connects people in the same neighborhood to trade skills — one person teaches guitar, another teaches cooking, a third helps with web development. No money changes hands, just knowledge.

---

## Features

**Core**
-  Email authentication with profile setup
-  Hyperlocal feed filtered by pin code
-  Post skill offers and requests with media uploads
-  Real time messaging with post-specific chat sessions
-  Ratings, reviews and reputation score
-  Real time notifications

**Community**
-  Neighborhood announcements board with presence indicators
-  Neighborhood leaderboard with custom scoring
-  Invite neighbors via shareable links
-  Swap history timeline with expired posts

**Discovery**
-  Search and filter by skill, category, or type
-  Save posts for later
-  Interactive weekly availability calendar
-  Skill categories (Music, Tech, Food, Fitness and more)

**Trust & Safety**
-  Block and report users
-  Read receipts in chat
-  Swap count and response rate on profiles
-  Row Level Security on all database tables

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & Backend | Next.js 15 + TypeScript |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Real Time | Supabase Realtime |
| Storage | Supabase Storage |
| Styling | Tailwind CSS + Framer Motion |
| Icons | Lucide React |
| 3D Animation | Three.js (LiquidEther hero) |
| Deployment | Vercel |

---

## Getting Started

**Prerequisites:** Node.js 18+, a Supabase account

```bash
# Clone the repository
git clone https://github.com/yourusername/skillswap.git
cd skillswap

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

Add your Supabase credentials to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SECRET_KEY=your_secret_key
```

```bash
# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Database Setup

Run the SQL scripts in your Supabase SQL Editor in this order:

1. `profiles` — user profiles with skills, bio and availability
2. `posts` — skill offers and requests
3. `messages` — chat messages
4. `reviews` — ratings and reviews
5. `likes`, `saved_posts`, `notifications` — engagement tables
6. `announcements`, `announcement_likes` — community board
7. `blocked_users`, `reports` — trust and safety
8. `invites` — invite link system
9. `subscriptions`, `subscription_plans` — monetization

---

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # Reusable components (Sidebar, etc.)
  lib/           # Supabase client and subscription utilities
```

---

## Deployment

This project is deployed on Vercel. To deploy your own:

1. Push your code to GitHub
2. Import the repository on [vercel.com](https://vercel.com)
3. Add your environment variables in the Vercel dashboard
4. Deploy

---

## Roadmap

- [ ] Video calling between chat users
- [ ] Smart skill matching
- [ ] Weekly digest email
- [ ] Razorpay payment integration for Plus and Pro
- [ ] Mobile app

---

## License

MIT License — feel free to use this project for learning or building your own community platform.

---

Built by [Samakcha Mishra](https://github.com/Samakcha)
