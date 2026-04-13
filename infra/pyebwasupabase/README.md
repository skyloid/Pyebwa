# Pyebwa Supabase Isolation Scaffold

This directory is the starting point for the Pyebwa-only Supabase environment described in:

- [docs/PYEBWA_ENV_EXTRACTION_HANDOFF.md](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/docs/PYEBWA_ENV_EXTRACTION_HANDOFF.md:1)
- [docs/PYEBWA_ENV_EXTRACTION_IMPLEMENTATION_PLAN.md](/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/docs/PYEBWA_ENV_EXTRACTION_IMPLEMENTATION_PLAN.md:1)

## Purpose

This scaffold creates a dedicated `pyebwasupabase` compose project with:

- `pyebwa-db`
- `pyebwa-auth`
- `pyebwa-rest`
- `pyebwa-realtime`
- `pyebwa-storage`
- `pyebwa-kong`
- `pyebwa-meta`
- `pyebwa-imgproxy`
- `pyebwa-studio`

and publishes:

- Kong HTTP: `127.0.0.1:8201 -> 8000`
- auth debug: `127.0.0.1:10998 -> 9999`
- REST debug: `127.0.0.1:14939 -> 3000`

## Important Constraints

- Do not reuse the shared JWT secret.
- Do not reuse the shared Postgres password.
- Do not reuse the shared anon or service-role keys.
- Do not point this stack at `supabase_default`.
- Do not remove Pyebwa from the current shared environment until this stack is healthy and validated end-to-end.

## Setup

1. Copy `.env.example` to `.env`.
2. Replace every placeholder secret with newly generated Pyebwa-only values.
3. Pin image tags to the exact versions you intend to validate in production.
4. Review `kong.yml` and confirm the routed paths match the Supabase services you are actually exposing.
5. Bring the stack up with:

```bash
docker compose --env-file .env -f infra/pyebwasupabase/compose.yml up -d
```

## First Validation Targets

After bring-up, validate:

```bash
curl -i http://127.0.0.1:8201/auth/v1/settings
curl -i http://127.0.0.1:10998/health
curl -i http://127.0.0.1:14939/
docker compose --env-file .env -f infra/pyebwasupabase/compose.yml ps
```

## Known Follow-Up Work

This scaffold does not complete the migration by itself. You still need to:

- seed and validate the isolated Pyebwa DB
- verify GoTrue auth schema compatibility
- repoint app/helper auth URLs to the new stack
- harden service-worker behavior for auth
- cut over `rasin.pyebwa.com/supabase` only after end-to-end validation
