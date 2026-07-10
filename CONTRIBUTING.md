# Contributing to Skincare Stock Reconciliation System

First off, thank you for considering contributing to this project! It's people like you that make the open-source community such an amazing place to learn, inspire, and create.

## 🧠 Philosophy

This project is built on the philosophy of **Data Integrity First**. Because this is a financial and operational ledger, we prioritize strict typing, rigorous database constraints, and append-only architecture over quick hacks.

## 🛠️ Development Setup

1. **Fork the repo** and clone it locally.
2. **Install dependencies:** `npm install`
3. **Set up Supabase:** You need a local Supabase instance or a cloud project.
4. **Run migrations:** Ensure you run the `.sql` files in exact order to set up the schema and triggers.
5. **Start development server:** `npm run dev`

## 🌿 Git Workflow

We use a standard Feature Branch workflow.

1. **Branching:**
   - Create a branch for your feature: `git checkout -b feature/your-feature-name`
   - For bugs: `git checkout -b fix/issue-number-description`

2. **Committing:**
   - We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
   - Format: `type(scope): description`
   - Example: `feat(ledger): add batch tracking support`
   - Example: `fix(auth): resolve middleware redirect loop`

## 💻 Coding Standards

*   **TypeScript:** Strict mode is enforced. Avoid `any`. Use interfaces and Zod schemas.
*   **React:** Use Functional Components and Hooks. Favor React Server Components (RSC) by default; only use `"use client"` when interactivity or React state is absolutely required.
*   **Database:** All business-critical logic that mutates stock MUST be implemented via PostgreSQL Stored Procedures or Triggers, not in the Next.js API layer.

## 🔄 Pull Request Process

1. Ensure your code passes linting: `npm run lint`.
2. Update the README.md with details of changes to the interface or architecture, if applicable.
3. Submit the PR against the `main` branch.
4. Fill out the PR template completely.
5. Wait for code review. A maintainer will review your code and may request changes.

Thank you for your contribution!
