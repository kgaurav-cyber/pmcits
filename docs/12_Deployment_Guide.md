# Deployment Guide - PMCITS Project

This guide outlines deployment parameters, server configurations, and security checks required to deploy the PMCITS project.

---

## 1. Environment Configurations

Below are the required environment variables. Ensure these are defined in your secure container storage or secrets manager before launching.

### A. Express Backend (`.env` variables)
| Variable | Description | Recommended Production Setting |
| :--- | :--- | :--- |
| `PORT` | Listening server port | `5000` or dynamic cloud port |
| `SUPABASE_URL` | Supabase API connection string | Active production project URL |
| `SUPABASE_ANON_KEY` | Public access key | Production anonymized API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin authorization key | Keep encrypted; used for database modifications |
| `OPENAI_API_KEY` | OpenAI GPT credentials | Dynamic billing token for GPT-4o audits |
| `NODE_ENV` | Mode execution flag | Set to `production` |

### B. Next.js Frontend (`.env.local` variables)
*   `NEXT_PUBLIC_API_URL`: Points to your deployed Express backend URL (must use `https://`).

---

## 2. Production Security Checklist

Ensure the following actions are validated before opening traffic:

### 1. Row Level Security (RLS)
*   Execute SQL check to confirm that RLS is active on all core tables:
    ```sql
    ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
    ```
*   Never bypass RLS rules unless using the admin service key exclusively within audited backend service classes.

### 2. HTTP headers (Helmet.js)
*   Ensure that the Express server loads `helmet()` middleware in production:
    ```typescript
    import helmet from 'helmet';
    app.use(helmet());
    ```
*   This prevents clickjacking, MIME sniffing, and enforces SSL.

### 3. Disable Swagger specs in Production
*   Guard the `/api-docs` route so it is only loaded under `NODE_ENV !== 'production'` to prevent enumeration of endpoints.

### 4. Enable Rate Limiting
*   Configure Express Rate Limiter middleware (`express-rate-limit`) to limit request floods:
    ```typescript
    import rateLimit from 'express-rate-limit';
    const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
    app.use('/api/', limiter);
    ```
