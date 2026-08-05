# VISIORA — AI Physics Learning Platform

An AI-powered interactive physics learning platform built with **React + Vite** (frontend) and **FastAPI + Uvicorn** (backend).

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| Python | ≥ 3.11 |
| pip | latest |

---

## Project Structure

```
mini-ai-video/
├── backend/          # FastAPI server (Python)
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
└── frontend/         # React + Vite app
    ├── src/
    ├── package.json
    └── .env.example
```

---

## 1. Environment Setup

### Backend

```bash
cd backend
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to your Firebase service account JSON |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `ALLOWED_ORIGINS` | CORS origins, e.g. `["http://localhost:5173"]` |

### Frontend

```bash
cd frontend
cp .env.example .env.local
```

Open `.env.local` and fill in the required values:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL (default: `http://localhost:8000`) |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

---

## 2. Install Dependencies

### Backend

```bash
cd backend
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

---

## 3. Running the Services

Open **two separate terminal windows/tabs**.

### Terminal 1 — Backend (FastAPI)

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API will be available at:
- **Base URL:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

### Terminal 2 — Frontend (Vite)

```bash
cd frontend
npm run dev
```

The app will be available at:
- **App:** `http://localhost:5173`

---

## 4. Stopping the Services

In each terminal, press **`Ctrl + C`** to stop the server.

---

## 5. Other Useful Commands

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run Oxlint linter |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

### Backend

| Command | Description |
|---------|-------------|
| `uvicorn app.main:app --reload --port 8000` | Start dev server with auto-reload |
| `uvicorn app.main:app --port 8000` | Start production server |

---

## Tech Stack

**Frontend**
- React 19, Vite 8, Three.js, React Three Fiber
- Zustand (state), Framer Motion (animations), Firebase (auth)

**Backend**
- FastAPI, Uvicorn, Pydantic
- Gemini LLM, Firebase Admin SDK
