# 🚀 Deployment Guide: Class-Quiz Portal

Follow these steps to host your student-teacher assessment portal on **Vercel** securely.

## Step 1: Push Code to GitHub
Ensure you have initialized a Git repository and pushed your code.
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```
> [!IMPORTANT]
> Your `.gitignore` is now configured to **automatically hide** your `.env` files from GitHub. Your keys are safe!

## Step 2: Import Project to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **"Add New"** > **"Project"**.
3. Import your `class-quiz-portal` repository.

## Step 3: Configure Environment Variables
Before clicking "Deploy", scroll down to the **"Environment Variables"** section. Add the following keys:

| Key | Value (Copy from your .env.local) |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGc...` |

> [!TIP]
> Make sure the keys start with `VITE_` as Vite requires this prefix to make them available in your frontend code.

## Step 4: Deploy 🚀
1. Click **"Deploy"**.
2. Once finished, Vercel will give you a public URL (e.g., `class-quiz-portal.vercel.app`).
3. **Crucial:** Go to your **Supabase Dashboard** > **Authentication** > **URL Configuration** and add your new Vercel URL to the **Redirect URLs** list.

## Step 5: Professional domain (Optional)
You can connect a custom domain (like `quiz.yourdomain.com`) in the Vercel Project Settings > Domains.

---
### 🔒 Security Checklits (Must Read)
- [ ] **Row Level Security (RLS)**: Go to Supabase > Table Editor and ensure RLS is **ON** for every table.
- [ ] **Policies**: Create policies so students can only read their own attempts and teachers can manage everything.
- [ ] **Anon Key**: The `anon` key is fine to be public in the browser *if* RLS is enabled. Never use the `service_role` key here.
