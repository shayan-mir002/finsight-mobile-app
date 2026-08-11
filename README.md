# FinSight — AI-Powered Personal Finance

FinSight is a full-stack personal finance application that helps you track income and expenses, manage budgets, reach savings goals, and understand your money with the help of an AI assistant.

![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi) ![MongoDB](https://img.shields.io/badge/MongoDB-Motor-47A248?logo=mongodb) ![Groq](https://img.shields.io/badge/AI-Groq%20LLaMA-FF6500)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend](#1-backend)
  - [2. Mobile App](#2-mobile-app)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [License](#license)

---

## Features

- **Dashboard** — monthly income/expense overview, spending charts, and recent activity at a glance.
- **Transactions** — add, edit, and delete income or expenses with categories, payment methods, and notes.
- **Budgets** — set a monthly limit per category and track how much is left.
- **Goals** — create savings goals with a deadline and contribute toward them over time.
- **AI Insights** — get personalized, data-driven observations about your spending habits.
- **AI Chat Assistant** — ask questions like *"Where did I spend the most this month?"* and get grounded answers built from your real data.
- **Secure Auth** — JWT-based registration and login with encrypted passwords.

## Tech Stack

| Layer     | Technology                                                        |
|-----------|-------------------------------------------------------------------|
| Mobile    | React Native 0.81, TypeScript, React Navigation, Gifted Charts, AsyncStorage |
| Backend   | Python 3, FastAPI, Uvicorn                                        |
| Database  | MongoDB (via Motor async driver)                                  |
| Auth      | JWT (PyJWT) + bcrypt                                              |
| AI        | Groq API (LLaMA 3.3 70B), with rule-based fallbacks when offline  |

## Architecture

```
┌─────────────────┐        HTTPS        ┌──────────────────┐
│  React Native   │ ──────────────────► │     FastAPI      │
│     Mobile      │   /api/...          │      Backend     │
│      App        │ ◄────────────────── │                  │
└─────────────────┘    JSON responses   └────────┬─────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │   MongoDB   │
                                          └─────────────┘
                                                 │
                                          ┌──────▼──────┐
                                          │    Groq     │
                                          │   (AI API)  │
                                          └─────────────┘
```

The mobile app talks to the backend REST API over HTTP(S). The backend owns all business logic, persists data in MongoDB, and calls Groq for AI features.

## Project Structure

```
finsight-mobile-app/
├── backend/                  # FastAPI REST API
│   ├── app/
│   │   ├── main.py           # App entry point, routes, CORS
│   │   ├── config.py         # Environment configuration
│   │   ├── database.py       # MongoDB (Motor) connection
│   │   ├── models.py         # Pydantic request/response models
│   │   ├── auth.py           # Password hashing + JWT helpers
│   │   ├── routers/          # auth, transactions, budgets, goals, ai
│   │   └── services/ai.py    # Groq integration + fallbacks
│   ├── requirements.txt
│   └── .env.example
└── mobile/                   # React Native app
    ├── App.tsx               # Root component
    ├── src/
    │   ├── api/              # HTTP client + typed endpoints
    │   ├── context/          # Auth provider
    │   ├── navigation/       # Stack + tab navigation
    │   ├── screens/          # Dashboard, Expenses, Budgets, Goals, Chat, Auth
    │   ├── components/       # Reusable UI
    │   ├── theme.ts          # Design tokens
    │   └── types.ts          # Shared TypeScript types
    └── .env.example
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 20 and npm
- [Python](https://www.python.org) ≥ 3.10
- [MongoDB](https://www.mongodb.com) running locally (or a MongoDB Atlas cluster)
- Android Studio / Xcode for running the mobile app (or a connected device)
- (Optional) A [Groq](https://console.groq.com) API key for AI features

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file (copy from `.env.example`):

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB=expense
JWT_SECRET=change-me-to-a-random-secret
GROQ_API_KEY=your-groq-api-key
```

Start the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API docs (Swagger UI): http://localhost:8000/docs
- Health check: http://localhost:8000/health

### 2. Mobile App

```bash
cd mobile
npm install
```

Copy `.env.example` to `.env` and set your API URL:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000
```

> For a physical device, use your machine's LAN IP (e.g. `http://192.168.18.69:8000`). For the Android emulator, use `http://10.0.2.2:8000`.

Run the app:

```bash
npm start        # start Metro
npm run android  # build & run on Android (in another terminal)
npm run ios      # build & run on iOS (macOS only)
```

## Environment Variables

### Backend (`backend/.env`)

| Variable         | Required | Default                   | Description                              |
|------------------|----------|---------------------------|------------------------------------------|
| `MONGO_URI`      | Yes      | `mongodb://localhost:27017` | MongoDB connection string              |
| `MONGO_DB`       | No       | `expense`                 | Database name                            |
| `JWT_SECRET`     | Yes      | —                         | Secret used to sign auth tokens          |
| `GROQ_API_KEY`   | No       | —                         | Groq key for AI features (falls back to rule-based if empty) |

### Mobile (`mobile/.env`)

| Variable              | Required | Description                         |
|-----------------------|----------|-------------------------------------|
| `EXPO_PUBLIC_API_URL` | Yes      | Base URL of the backend API         |

> `EXPO_PUBLIC_*` values are inlined at **build time** — rebuild the app after changing them.

## API Reference

| Method | Endpoint                        | Description                          |
|--------|---------------------------------|--------------------------------------|
| POST   | `/api/auth/register`            | Create an account                    |
| POST   | `/api/auth/login`               | Log in, returns JWT token            |
| GET    | `/api/auth/me`                  | Current user profile                 |
| GET    | `/api/transactions`             | List transactions (filter by `type`/`month`) |
| POST   | `/api/transactions`             | Add a transaction                    |
| PUT    | `/api/transactions/{id}`        | Update a transaction                 |
| DELETE | `/api/transactions/{id}`        | Delete a transaction                 |
| GET    | `/api/transactions/summary`     | Monthly income/expense summary       |
| GET    | `/api/transactions/history`     | Spending history for charts          |
| GET    | `/api/budgets?month=YYYY-MM`    | List budgets for a month             |
| POST   | `/api/budgets`                  | Create a budget                      |
| DELETE | `/api/budgets/{id}`             | Delete a budget                      |
| GET    | `/api/goals`                    | List savings goals                   |
| POST   | `/api/goals`                    | Create a goal                        |
| POST   | `/api/goals/{id}/contribute`    | Add money to a goal                  |
| DELETE | `/api/goals/{id}`               | Delete a goal                        |
| GET    | `/api/ai/insights`              | Personalized spending insights       |
| POST   | `/api/ai/chat`                  | Chat with the AI finance assistant   |
| GET    | `/health`                       | Health check                         |

All endpoints except auth/health require a `Authorization: Bearer <token>` header.

## Deployment

Deploying the backend to the cloud keeps the app working even when your local machine is off.

### Database — MongoDB Atlas (free)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user and allow network access from `0.0.0.0/0`.
3. Copy the connection string (`mongodb+srv://user:password@cluster...`).

### Backend — Render (free)

1. Push this repository to GitHub.
2. In [Render](https://render.com): **New → Web Service**, connect the repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free
4. Add the environment variables from the [table above](#backend-backendenv).
5. Deploy and verify: `https://<service>.onrender.com/health` should return `{"status":"ok"}`.

> Render's free tier sleeps after 15 minutes of inactivity. Set up a free [UptimeRobot](https://uptimerobot.com) monitor pinging `/health` every 5 minutes to keep it awake.

### Mobile App

Point `EXPO_PUBLIC_API_URL` at your deployed backend (e.g. `https://<service>.onrender.com`) and rebuild the app.

## License

This project is licensed under the MIT License.
