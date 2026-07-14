# Police Medical Claims Intelligence & Transparency System (PMCITS)

The application has been configured for secure production deployment.

## Production Readiness Overview
- **Secrets Management**: All sensitive configurations are managed through `.env` environment variables.
- **Security Middleware**: Configured `helmet` for HTTP header security, `express-rate-limit` for DDoS/brute-force protection, and `compression` for faster payload delivery.
- **Configuration Modules**: Centralized configuration management for DB, Email, and JWT using typed environment variables.
- **Continuous Deployment**: Ready for integration with Render or other PaaS providers via `render.yaml`.

## Deployment Guide

### Prerequisites
1. A Supabase project (PostgreSQL).
2. An SMTP Provider (Mailtrap, SendGrid, etc).
3. A Render account (or similar).
4. OpenAI API Key (optional but recommended for AI features).

### Local Setup & Testing
To start the application locally:
1. Clone the repository.
2. Copy `backend/.env.example` to `backend/.env` and update the values.
3. Copy `frontend/.env.example` to `frontend/.env.local` and update the values.
4. Run `npm install` in both `frontend` and `backend` directories.
5. In the backend, run `npm run dev`.
6. In the frontend, run `npm run dev`.

### GitHub Setup Guide
1. Before committing to GitHub, verify that your `.gitignore` files are correctly set up and are not tracking `.env` files.
2. The repository already includes robust `.gitignore` files at the root, frontend, and backend levels.
3. Simply commit the codebase: `git add . && git commit -m "Prepare for production"` and push to your remote repository.

### Render Setup Guide
The repository contains a `render.yaml` file to automate deployment via Blueprint.

1. Go to the [Render Dashboard](https://dashboard.render.com).
2. Click **New** > **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the `render.yaml` file and prompt you to set the **required secrets** (marked with `sync: false` in the configuration).
5. Provide the necessary values for:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`
   - `OPENAI_API_KEY`, `OCR_API_KEY`
6. Click **Apply**.
7. Render will automatically build and deploy both the Node.js backend and the Next.js frontend services.

## Environment Variable Guide

### Backend (`backend/.env`)
- `PORT`: Server port (default: 5000).
- `NODE_ENV`: 'development' or 'production'.
- `FRONTEND_URL`: URL to your frontend app.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_ANON_KEY`: Supabase Anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service role key (used by admin).
- `JWT_SECRET`: A strong secret for signing JWTs.
- `JWT_EXPIRES_IN`: E.g., '24h' or '7d'.
- `EMAIL_PROVIDER`: SMTP or similar.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`: Mail credentials.

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`: URL to your backend server.
- `NEXT_PUBLIC_APP_NAME`: Name displayed in the UI.
- `NEXT_PUBLIC_ENVIRONMENT`: 'development' or 'production'.
