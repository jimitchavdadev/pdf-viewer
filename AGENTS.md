# Agent Operational Guide: PDF Viewer & Cloud Drive

This repository houses a high-performance, eye-friendly PDF viewer and cloud drive system with full annotation, scribbling, reading progress synchronization, and threaded comments with image attachment support.

## 1. Architectural Architecture & Stack

| Layer | Technology | Responsibilities |
|---|---|---|
| **Backend** | **Rust (Axum + SeaORM + Tokio)** | High-throughput REST API, file streaming, PDF parsing, SeaORM ORM data models, comment attachment handling. |
| **Frontend Web** | **Next.js (App Router, TailwindCSS, PDF.js / Canvas)** | Responsive Desktop & Mobile PDF Drive, Eye-comfort Reading Engine (Light, Sepia, Night), Annotation Canvas (drawing/highlights), Threaded Comments with Image Support. |
| **Mobile App** | **React Native (Expo)** | Native touch-optimized reader, scribble gestures, offline/online sync, image picker for comments, connected to common Rust API. |
| **Database & Storage** | **Supabase PostgreSQL & Object Storage** | Relational schemas, ACID transactions, pooler connectivity, binary file storage. |

### Strict Architecture Invariants
1. **NO Direct Database Calls from Frontend/Mobile**:
   - Web frontend and mobile clients MUST NEVER query Supabase directly via SQL or Supabase JS client.
   - All operations MUST route through the Rust Axum Backend (`/api/...`).
2. **Rust ORM Mandate**:
   - All Rust database operations MUST use **SeaORM** (ActiveModel, Entity, QuerySelect, Relation) instead of raw inline SQL strings.
3. **Reading-Centric UI/UX**:
   - Eye-friendly design is paramount. High contrast blinding white must be tempered with warm paper sepia (`#F6F0E6`) and deep OLED night (`#131416`).
   - Clean, minimal toolbars that stay out of the reader's line of sight.

---

## 2. Directory Structure

```
pdf-viewer/
├── AGENTS.md                  # Comprehensive agent guidelines & system contracts
├── docs/                      # Architectural specifications & system design
│   ├── ARCHITECTURE.md
│   └── DATABASE_SCHEMA.sql
├── backend/                   # Rust Axum Backend
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs            # Axum server entry & router
│   │   ├── config.rs          # Environment & Supabase pooler config
│   │   ├── db.rs              # SeaORM DatabaseConnection setup
│   │   ├── entities/          # SeaORM entities (documents, progress, annotations, comments)
│   │   │   ├── mod.rs
│   │   │   ├── document.rs
│   │   │   ├── reading_progress.rs
│   │   │   ├── annotation.rs
│   │   │   ├── comment.rs
│   │   │   └── comment_attachment.rs
│   │   ├── handlers/          # HTTP request handlers
│   │   │   ├── mod.rs
│   │   │   ├── documents.rs
│   │   │   ├── annotations.rs
│   │   │   ├── comments.rs
│   │   │   └── progress.rs
│   │   ├── services/          # Business logic & file system / storage operations
│   │   │   ├── mod.rs
│   │   │   ├── storage.rs
│   │   │   └── pdf.rs
│   │   └── dtos/              # Request / Response JSON DTOs
│   │       └── mod.rs
│   └── tests/                 # Backend integration tests
├── web/                       # Next.js Web Application
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/               # App Router pages (/drive, /viewer/[id])
│   │   ├── components/
│   │   │   ├── drive/         # Drive file browser, upload, search, stats
│   │   │   ├── viewer/        # PDF viewer viewport, canvas, zoom, pages
│   │   │   ├── canvas/        # Drawing & scribble layer, highlights
│   │   │   ├── toolbar/       # Reading mode (Light/Sepia/Night), pen, highlighter, comment pin
│   │   │   ├── comments/      # Comments drawer, image upload preview, reactions
│   │   │   └── ui/            # Reusable accessible components
│   │   ├── lib/               # Utilities & constants
│   │   ├── hooks/             # Custom React hooks (useReadingProgress, useCanvasDrawing, etc.)
│   │   └── services/          # Pure Rust Backend HTTP client
└── mobile/                    # React Native Expo Mobile App
    ├── package.json
    ├── app/                   # Expo Router screens
    ├── components/            # Touch-friendly reader & annotation components
    └── services/              # API client connecting to Rust backend
```

---

## 3. Database & SeaORM Conventions

- Connection string: `postgres://postgres.qjxtziogfrtzarpjilws:<PASSWORD>@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require`
- Tables utilize UUID primary keys with `gen_random_uuid()`.
- SeaORM entities define typed `ActiveModelBehavior`, `RelationDef`, and `DeriveEntityModel`.
- Migrations are structured and reversible.
- Timestamps: `TIMESTAMPTZ` with `now()`.

---

## 4. Reading UX & Eye Strain Elimination Principles

1. **Warm Sepia Mode**:
   - Background: `#F6F0E6` (Warm linen paper)
   - Foreground / Text: `#2C2523` (Charcoal ink, 0% harsh glare)
   - Paper accent: `#EADFC9`
2. **Night / Dark Mode**:
   - Background: `#131416`
   - Foreground / Text: `#DDE1E5`
   - Border / Accents: `#26292E`
3. **Natural Daylight Mode**:
   - Background: `#FAFAF8`
   - Foreground: `#18181B`
4. **Distraction-Free Controls**:
   - Auto-hiding or floating rounded toolbars that don't obscure content.
   - Smooth gesture-based zoom and continuous scrolling.
   - Reading progress percentage and page indicator persistent in view.

---

## 5. Verification & Testing Playbook

- **Backend (Rust)**:
  `cargo test -- --nocapture`
  `cargo clippy -- -D warnings`
- **Web Frontend (Next.js)**:
  `pnpm build`
  `pnpm test`
- **End-to-End**:
  1. Upload sample PDF -> Verify document created in Supabase via SeaORM and stored.
  2. Open PDF in Viewer -> Verify pages rendered with PDF.js canvas.
  3. Change Reading Mode -> Test Light, Sepia, Night filters.
  4. Scribble & Highlight -> Save annotations, reload page, verify exact coordinate preservation.
  5. Add Comment with Image -> Upload image attachment, verify comment renders on page pin and in sidebar.
  6. Scroll & Change Page -> Verify reading progress automatically updates in Rust backend.
