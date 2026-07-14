# Local Installation Guide - PMCITS Project

Step-by-step instructions to configure and launch the PMCITS project on your local machine.

---

## 1. Prerequisites
Ensure you have the following installed:
*   **Node.js** (v18.x or newer)
*   **npm** (v9.x or newer)
*   **Supabase Account** or local Dockerized PostgreSQL instance.

---

## 2. Database Migration Steps

Execute the database script files in the following exact sequence using your Supabase SQL Editor or command-line client:

1.  **[schema.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/schema.sql)**: Sets up tables, enums, indexing, and foreign key relations.
2.  **[seed.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/seed.sql)**: Populates hospitals, doctors, and demo system users.
3.  **[functions.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/functions.sql)**: Compiles internal database calculation hooks.
4.  **[triggers.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/triggers.sql)**: Attaches automatic timeline-history loggers.
5.  **[policies.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/policies.sql)**: Enables Row Level Security (RLS) constraints.
6.  **[storage.sql](file:///c:/Users/lenovo/Desktop/AI-Learning/pmcits/database/storage.sql)**: Creates the secure `claim-documents` bucket.

---

## 3. Express API Server Installation

1.  Navigate to the `backend/` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file at the root of the backend folder:
    ```env
    PORT=5000
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_ANON_KEY=your_supabase_anon_public_key
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    OPENAI_API_KEY=your_openai_api_key
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
    *The API will be available at [http://localhost:5000](http://localhost:5000).*

---

## 4. Next.js Client Installation

1.  Navigate to the `frontend/` directory:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env.local` file:
    ```env
    NEXT_PUBLIC_API_URL=http://localhost:5000
    ```
4.  Launch the development app:
    ```bash
    npm run dev
    ```
    *The portal will open at [http://localhost:3000](http://localhost:3000).*

---

## 5. Local Testing Credentials (Seed Users)
For testing, use the following logins seeded in the database:
*   **Employee**: `employee@police.gov.in` / `Password123`
*   **Medical Officer**: `medical_officer@police.gov.in` / `Password123`
*   **Accounts Officer**: `accounts_officer@police.gov.in` / `Password123`
*   **DDO**: `ddo@police.gov.in` / `Password123`
*   **Treasury**: `treasury@police.gov.in` / `Password123`
*   **Administrator**: `admin@police.gov.in` / `Password123`
