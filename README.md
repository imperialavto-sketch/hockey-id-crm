# Hockey ID CRM

Modern CRM for hockey schools: team management, player profiles, training schedules, and player passports with statistics.

## Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API routes (Node.js)
- **Database**: PostgreSQL with Prisma ORM

## Features

1. **School registration** – Add and manage hockey schools
2. **Team management** – Create teams by age group, assign players
3. **Player profiles** – Full player data and relationships
4. **Training schedule** – Plan and view training sessions
5. **Player passport** – Statistics (games, goals, assists, points, PIM)

## User roles

- **School Admin** – Full access to schools, teams, players, schedule
- **Coach** – Manage teams, players, and schedule
- **Parent** – View children's profiles, stats, and schedule

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure database**

   Create `.env` from `.env.example` and set your PostgreSQL connection:

   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/hockey_crm?schema=public"
   ```

3. **Initialize database**

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

4. **Run development server**

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## Demo accounts

After running the seed:

| Role  | Email                | Password  |
|-------|----------------------|-----------|
| Admin | admin@hockey.edu     | admin123  |
| Coach | coach@hockey.edu     | admin123  |
| Parent| parent@example.com   | admin123  |

## Project structure

```
src/
├── app/
│   ├── (dashboard)/       # Dashboard layout + protected routes
│   │   ├── dashboard/
│   │   ├── schools/
│   │   ├── teams/
│   │   ├── players/
│   │   └── schedule/
│   ├── api/               # API routes
│   │   ├── auth/
│   │   ├── schools/
│   │   ├── teams/
│   │   ├── players/
│   │   └── trainings/
│   ├── layout.tsx
│   ├── page.tsx           # Login
│   └── globals.css
├── components/
├── contexts/
│   └── AuthContext.tsx
└── lib/
    ├── db.ts
    └── utils.ts
prisma/
├── schema.prisma
└── seed.ts
```
