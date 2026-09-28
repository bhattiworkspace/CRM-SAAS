# CRM SaaS — Multi-Tenant B2B CRM Platform

A production-ready, multi-tenant CRM SaaS application built with Next.js 14, React 18, TypeScript, Prisma, and Tailwind CSS.

## Architecture Overview

```
Next.js 14 (App Router)
├── Authentication (NextAuth v4 / JWT)
├── Multi-Tenant Isolation (organizationId scoping)
├── RBAC (4 roles, 41+ granular permissions)
├── Provider Abstraction Layer
│   ├── AI (Mock / OpenAI / Anthropic)
│   ├── Email (Mock / Resend / SendGrid)
│   ├── WhatsApp (Mock / WhatsApp Business API)
│   ├── SMS (Mock / Twilio)
│   ├── Enrichment (Mock / Clearbit)
│   └── Billing (Local / Stripe)
├── Background Job Service (Development / Redis)
├── Cache Service (Memory / Redis)
└── Prisma ORM (SQLite dev / PostgreSQL prod)
```

## Local Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone and install
cd crm-saas
npm install

# Create environment configuration
cp .env.example .env
# Edit .env with your values (defaults work for local development)

# Generate Prisma client
npx prisma generate

# Apply database schema
npx prisma db push

# Seed development data
npm run prisma:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Credentials

| Email | Password | Organization | Role |
|-------|----------|-------------|------|
| demo@acme.com | password123 | Acme Enterprise Solutions | Owner |
| sales@acme.com | password123 | Acme Enterprise Solutions | Sales Rep |
| beta@beta.com | password123 | Beta Systems Inc. | Owner |

## Environment Variables

See `.env.example` for all configuration variables. The application runs fully with mock providers and no external API keys.

### Provider Configuration

| Variable | Options | Default |
|----------|---------|---------|
| `AI_PROVIDER` | mock, openai, anthropic | mock |
| `EMAIL_PROVIDER` | mock, resend, sendgrid | mock |
| `WHATSAPP_PROVIDER` | mock, whatsapp_business | mock |
| `SMS_PROVIDER` | mock, twilio | mock |
| `ENRICHMENT_PROVIDER` | mock, clearbit | mock |
| `BILLING_PROVIDER` | local, stripe | local |

## Commands

```bash
npm run dev              # Start development server
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run prisma:generate  # Generate Prisma client
npm run prisma:push      # Push schema to database
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed development data
npm test                 # Run tests
```

## Database

### Development
SQLite is used for local development. No external database required.

### Production Migration to PostgreSQL
1. Update `DATABASE_URL` in `.env` to PostgreSQL connection string
2. Change `provider` in `prisma/schema.prisma` from `"sqlite"` to `"postgresql"`
3. Run `npx prisma migrate dev --name init` to create initial migration
4. Run `npx prisma db seed` to seed data

### Migration Workflow
```bash
# Create a new migration
npx prisma migrate dev --name description_of_change

# Apply migrations in production
npx prisma migrate deploy

# Validate schema
npx prisma validate
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login page
│   ├── (dashboard)/     # Protected dashboard pages
│   │   ├── dashboard/   # Main dashboard
│   │   ├── leads/       # Lead management
│   │   ├── contacts/    # Contact management
│   │   ├── companies/   # Company management
│   │   ├── deals/       # Deal/pipeline management
│   │   ├── activities/  # Activity logging
│   │   ├── tasks/       # Task management
│   │   ├── communications/ # Unified inbox
│   │   ├── sequences/   # Follow-up sequences
│   │   ├── workflows/   # Automation workflows
│   │   ├── ai/          # AI Sales Assistant
│   │   ├── business-finder/ # Business discovery
│   │   ├── reports/     # Analytics & reports
│   │   ├── settings/    # Organization settings
│   │   └── audit-logs/  # Audit trail
│   └── api/             # API routes
├── components/
│   ├── layout/          # Sidebar, Topbar, AppShell
│   ├── providers/       # React context providers
│   └── ui/              # Reusable UI components
├── config/              # Application configuration
└── lib/
    ├── auth.ts          # Authentication & tenant resolution
    ├── audit.ts         # Audit logging
    ├── permissions.ts   # RBAC permission definitions
    ├── prisma.ts        # Prisma client singleton
    ├── cache/           # Cache service abstraction
    ├── jobs/            # Background job service
    ├── services/        # Provider abstractions & business logic
    ├── storage/         # File storage abstraction
    ├── utils/           # JSON helpers, error handling, logging
    └── validations/     # Zod validation schemas
```

## Security Model

Every server-side operation follows:
```
Authentication → Organization Membership → Permission → Entitlement → Tenant Scope → Business Logic
```

- All data queries are scoped to the authenticated user's organization
- Role-Based Access Control with 4 default roles and 41+ permissions
- Server-side entitlement and usage limit enforcement
- AI context builder prevents prompt injection and data leakage
- Audit logging for all significant operations
- Webhook signature verification
- Rate limiting on API routes
- Secret sanitization in logs

## Billing Architecture

Four subscription tiers with configurable limits:

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| AI Requests | 50/mo | 500/mo | 5,000/mo | Unlimited |
| Emails | 100/mo | 1,000/mo | 10,000/mo | Unlimited |
| WhatsApp | — | 500/mo | 5,000/mo | Unlimited |
| SMS | — | 250/mo | 2,500/mo | Unlimited |
| Automation | 50/mo | 500/mo | 5,000/mo | Unlimited |
| Business Search | 100/mo | 1,000/mo | 5,000/mo | Unlimited |
| Enrichment | 10/mo | 100/mo | 500/mo | Unlimited |
| Analytics | Basic | Advanced | Advanced | Advanced |

## Communication Provider Architecture

```
Provider Interface
├── Mock (Development — no external calls)
├── Resend / SendGrid (Email)
├── WhatsApp Business API (WhatsApp)
└── Twilio (SMS)

Webhook Flow:
Provider → Webhook → Signature Verify → Idempotency → Tenant Resolve → Message Create → Automation Trigger → Audit
```

## Background Worker Architecture

Development mode uses immediate execution. Production-ready interface for:
- Redis + BullMQ
- Managed queue services

Job types: workflow execution, sequence steps, AI scoring, message sending, enrichment, notifications.

## Architectural Decisions

1. **SQLite for development** — Zero-config local setup. PostgreSQL for production.
2. **Provider abstraction** — Business logic never couples to specific vendors.
3. **Mock-first development** — All features work without external API keys.
4. **Server-side only trust** — Organization, role, plan, permissions resolved server-side.
5. **Immediate job execution in dev** — Clean interface boundary for production queue workers.
6. **Prisma ORM** — Type-safe database access with migration support.

## Final Launch Checklist

This CRM is architected for production, but specific external configurations must be applied before a commercial launch:

### 1. Database Migration
- [ ] Provision a production PostgreSQL instance.
- [ ] Update `DATABASE_URL` in `.env`.
- [ ] Change the provider in `prisma/schema.prisma` to `"postgresql"`.
- [ ] Run `npx prisma migrate deploy` in the production environment.

### 2. External Providers
- [ ] **AI Provider**: Change `AI_PROVIDER` from `mock` to `openai` or `anthropic` and add respective API keys (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`).
- [ ] **Email Provider**: Configure `EMAIL_PROVIDER` with a transactional email service (e.g., Resend, SendGrid).
- [ ] **SMS Provider**: Configure `SMS_PROVIDER` with Twilio.
- [ ] **WhatsApp Provider**: Configure `WHATSAPP_PROVIDER` with WhatsApp Business API.
- [ ] **Enrichment Provider**: Configure `ENRICHMENT_PROVIDER` with Clearbit or a similar provider.

### 3. Asynchronous Jobs
- [ ] Replace the in-memory development job executor (`src/lib/jobs/index.ts`) with a robust production queue like Redis + BullMQ or AWS SQS.

### 4. Background Infrastructure
- [ ] Set up a CRON job or long-running worker process to consume the `process_sequence_steps` and `workflow_trigger` tasks from the job queue.
- [ ] Ensure webhooks from external communication providers are securely routed to the `POST /api/webhooks/communications` endpoint.
