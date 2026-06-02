# CompeteIntel Frontend

## Local run
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the frontend:
   ```bash
   npm run dev
   ```

The Vite dev server proxies `/api` to `http://localhost:8000`.

## Backend
Run the FastAPI backend separately:
```bash
uvicorn app.main:app --reload
```
