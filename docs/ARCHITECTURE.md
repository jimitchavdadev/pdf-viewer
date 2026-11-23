# System Design & Architecture: PDF Viewer & Cloud Drive

## 1. System Overview

A modern, cloud-connected PDF Drive and Reading Application engineered for optimal eye comfort, responsive navigation, rich markup (scribbling and annotations), real-time progress syncing, and threaded comments with image attachments.

### System Architecture Diagram

```
+-----------------------------------------------------------+
|                      Clients Layer                        |
|                                                           |
|    +----------------------------+   +-------------------+ |
|    |      Next.js Web Client    |   | React Native App  | |
|    | (Desktop, Tablet, Mobile)  |   | (iOS / Android)   | |
|    +-------------+--------------+   +---------+---------+ |
+------------------|----------------------------|-----------+
                   |                            |
                   | HTTP / REST (JSON & Binary)|
                   v                            v
+-----------------------------------------------------------+
|                   Backend Service Layer                   |
|                   (Rust Axum Engine)                      |
|                                                           |
|  +-----------------------------------------------------+  |
|  | Routers & Middleware (CORS, Trace, Multipart, Auth) |  |
|  +---------------------------+-------------------------+  |
|                              |                            |
|  +---------------------------v-------------------------+  |
|  | Handlers (Documents, Progress, Annotations, Comments|  |
|  +---------------------------+-------------------------+  |
|                              |                            |
|  +---------------------------v-------------------------+  |
|  | SeaORM Layer (Entities, ActiveModels, QueryBuilders)|  |
|  +-------------+-----------------------------+---------+  |
|                |                             |            |
+----------------|-----------------------------|------------+
                 |                             |
                 | SQL Connections (Pooler)    | File Storage
                 v                             v
+---------------------------------+  +----------------------+
|       Supabase PostgreSQL       |  |  Blob/File Storage   |
| (Documents, Progress, Anno,     |  | (Original PDFs,      |
|  Comments, Attachments)         |  |  Comment Images)     |
+---------------------------------+  +----------------------+
```

---

## 2. API Contract Specification

All endpoints are hosted under `http://127.0.0.1:8080/api`.

### Storage & File Size Quotas
- **Database Allocation**: 512 MB (Supabase PostgreSQL tier).
- **Maximum File Size**: Strict **10 MB** limit per PDF or image attachment enforced at:
  1. Backend HTTP layer via `DefaultBodyLimit::max(10 * 1024 * 1024)`.
  2. Multipart streaming chunk validator (`MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024`).
  3. Client-side Drag & Drop validation before upload transmission.
  4. Mobile Document & Image Picker size checks.
- `GET /api/documents`
  - Returns: List of all uploaded documents with attached reading progress stats.
  - Query Params: `?search=<term>&sort=recent`
- `POST /api/documents/upload`
  - Content-Type: `multipart/form-data`
  - Body: `file` (PDF binary)
  - Returns: `201 Created` with Document entity.
- `GET /api/documents/:id`
  - Returns: Complete Document metadata, page count, and latest reading progress.
- `GET /api/documents/:id/file`
  - Returns: Binary `application/pdf` stream for rendering/downloading.
- `DELETE /api/documents/:id`
  - Returns: `204 No Content` (Cascade cleans progress, annotations, comments, and files).

### Reading Progress API
- `GET /api/documents/:id/progress`
  - Returns: `{ current_page, total_pages, percentage, zoom_level, scroll_position_y, last_read_at }`
- `POST /api/documents/:id/progress`
  - Body: `{ current_page, total_pages, percentage, zoom_level, scroll_position_y }`
  - Returns: Updated progress record. Upsert logic ensures seamless resume across devices.

### Annotations & Scribble API
- `GET /api/documents/:id/annotations?page=<page_number>`
  - Returns: Array of annotations for the document/page.
- `POST /api/documents/:id/annotations`
  - Body: `{ page_number, annotation_type, data }`
  - `data` schema for scribbles:
    ```json
    {
      "points": [{"x": 120.5, "y": 85.2}, {"x": 124.0, "y": 88.0}],
      "color": "#e11d48",
      "strokeWidth": 3.0,
      "opacity": 0.85
    }
    ```
  - `data` schema for highlights:
    ```json
    {
      "rects": [{"x": 45.0, "y": 120.0, "width": 210.0, "height": 16.0}],
      "color": "#fef08a",
      "opacity": 0.5
    }
    ```
- `DELETE /api/documents/:id/annotations/:annotation_id`
  - Returns: `204 No Content`.

### Comments & Image Attachment API
- `GET /api/documents/:id/comments`
  - Returns: List of comments with nested `attachments: [{ id, file_name, mime_type, url }]`.
- `POST /api/documents/:id/comments`
  - Body: `{ page_number, position_x, position_y, author_name, content }`
  - Returns: `201 Created` with new Comment entity.
- `POST /api/comments/:comment_id/attachments`
  - Content-Type: `multipart/form-data`
  - Body: `image` (PNG, JPG, WebP)
  - Returns: Attachment entity with accessible URL.
- `GET /api/attachments/:id`
  - Returns: Image stream with appropriate caching and mime-type.
- `DELETE /api/comments/:comment_id`
  - Returns: `204 No Content`.

---

## 3. Eye Comfort UI/UX Standards

Reading documents requires eliminating harsh blue-light glare and visual noise:
- **Theme Modes**:
  1. **Paper Sepia**: Warm organic background `#F6F0E6`, charcoal text `#2D251E`. Ideal for long reading sessions and ambient daylight.
  2. **Soft Night**: Deep low-contrast `#131416`, soft light gray text `#DDE1E5`. Prevents eye strain in dark environments.
  3. **Crisp Natural**: Clean off-white `#FAFAF8`, dark slate text `#18181B`.
- **Canvas Rendering**:
  - Crisp high-DPI PDF page rendering.
  - Overlay vector SVG/Canvas layer for instantaneous pen scribbling with sub-pixel Bézier curve smoothing.
  - Floating auto-dimming reading toolbar with quick zoom, page jump, and tool switching.
