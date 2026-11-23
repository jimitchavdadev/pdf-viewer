use axum::{
    body::Body,
    extract::{Multipart, Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use chrono::Utc;
use rust_decimal::Decimal;
use sea_orm::{
    ActiveModelTrait, DatabaseConnection, EntityTrait, ModelTrait, QueryOrder, Set,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    dtos::DocumentWithProgressDto,
    entities::{document, reading_progress, Document, ReadingProgress},
    services::{extract_pdf_info, StorageService},
};

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub storage: StorageService,
}

pub const MAX_FILE_SIZE_BYTES: usize = 10 * 1024 * 1024; // 10 MB

pub async fn upload_document(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<DocumentWithProgressDto>), (StatusCode, String)> {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut original_filename: Option<String> = None;

    while let Some(mut field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Multipart stream error: {}", e)))?
    {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" {
            if let Some(filename) = field.file_name() {
                original_filename = Some(filename.to_string());
            }

            let mut chunks = Vec::new();
            while let Some(chunk) = field
                .chunk()
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed reading file chunk: {}", e)))?
            {
                if chunks.len() + chunk.len() > MAX_FILE_SIZE_BYTES {
                    return Err((
                        StatusCode::PAYLOAD_TOO_LARGE,
                        format!("File size exceeds the 10 MB limit (database capacity safeguard)."),
                    ));
                }
                chunks.extend_from_slice(&chunk);
            }
            file_bytes = Some(chunks);
        }
    }

    let bytes = file_bytes.ok_or((StatusCode::BAD_REQUEST, "Missing 'file' field in multipart".to_string()))?;
    let orig_name = original_filename.unwrap_or_else(|| "document.pdf".to_string());
    let title = orig_name.strip_suffix(".pdf").unwrap_or(&orig_name).to_string();

    let doc_id = Uuid::new_v4();
    let file_size = bytes.len() as i64;
    let pdf_info = extract_pdf_info(&bytes);
    let final_title = pdf_info.title.unwrap_or(title);

    let saved_rel_path = state
        .storage
        .save_document(&doc_id.to_string(), "pdf", &bytes)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to save file: {}", e)))?;

    let now = Utc::now().into();

    let doc_model = document::ActiveModel {
        id: Set(doc_id),
        title: Set(final_title.clone()),
        file_path: Set(saved_rel_path),
        file_size: Set(file_size),
        mime_type: Set("application/pdf".to_string()),
        page_count: Set(pdf_info.page_count),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let inserted_doc = doc_model
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB insert document error: {}", e)))?;

    let progress_model = reading_progress::ActiveModel {
        id: Set(Uuid::new_v4()),
        document_id: Set(doc_id),
        current_page: Set(1),
        total_pages: Set(pdf_info.page_count),
        percentage: Set(Decimal::new(0, 2)),
        zoom_level: Set(Decimal::new(100, 2)), // 1.00
        scroll_position_y: Set(Decimal::new(0, 2)),
        last_read_at: Set(now),
    };

    let inserted_progress = progress_model
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB insert progress error: {}", e)))?;

    let response = DocumentWithProgressDto {
        id: inserted_doc.id,
        title: inserted_doc.title,
        file_size: inserted_doc.file_size,
        mime_type: inserted_doc.mime_type,
        page_count: inserted_doc.page_count,
        current_page: inserted_progress.current_page,
        reading_percentage: inserted_progress.percentage,
        zoom_level: inserted_progress.zoom_level,
        scroll_position_y: inserted_progress.scroll_position_y,
        last_read_at: Some(inserted_progress.last_read_at),
        created_at: inserted_doc.created_at,
        updated_at: inserted_doc.updated_at,
    };

    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn list_documents(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<DocumentWithProgressDto>>, (StatusCode, String)> {
    let docs = Document::find()
        .order_by_desc(document::Column::UpdatedAt)
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB query error: {}", e)))?;

    let mut result = Vec::new();
    for doc in docs {
        let progress = doc
            .find_related(ReadingProgress)
            .one(&state.db)
            .await
            .unwrap_or(None);

        let (current_page, percentage, zoom_level, scroll_y, last_read) = match progress {
            Some(p) => (
                p.current_page,
                p.percentage,
                p.zoom_level,
                p.scroll_position_y,
                Some(p.last_read_at),
            ),
            None => (1, Decimal::new(0, 2), Decimal::new(100, 2), Decimal::new(0, 2), None),
        };

        result.push(DocumentWithProgressDto {
            id: doc.id,
            title: doc.title,
            file_size: doc.file_size,
            mime_type: doc.mime_type,
            page_count: doc.page_count,
            current_page,
            reading_percentage: percentage,
            zoom_level,
            scroll_position_y: scroll_y,
            last_read_at: last_read,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        });
    }

    Ok(Json(result))
}

pub async fn get_document(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<DocumentWithProgressDto>, (StatusCode, String)> {
    let doc = Document::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB query error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Document not found".to_string()))?;

    let progress = doc
        .find_related(ReadingProgress)
        .one(&state.db)
        .await
        .unwrap_or(None);

    let (current_page, percentage, zoom_level, scroll_y, last_read) = match progress {
        Some(p) => (
            p.current_page,
            p.percentage,
            p.zoom_level,
            p.scroll_position_y,
            Some(p.last_read_at),
        ),
        None => (1, Decimal::new(0, 2), Decimal::new(100, 2), Decimal::new(0, 2), None),
    };

    Ok(Json(DocumentWithProgressDto {
        id: doc.id,
        title: doc.title,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        page_count: doc.page_count,
        current_page,
        reading_percentage: percentage,
        zoom_level,
        scroll_position_y: scroll_y,
        last_read_at: last_read,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
    }))
}

pub async fn get_document_file(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Response, (StatusCode, String)> {
    let doc = Document::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Document not found".to_string()))?;

    let bytes = state
        .storage
        .read_file(&doc.file_path)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, format!("File read error: {}", e)))?;

    let content_disposition = format!("inline; filename=\"{}.pdf\"", doc.title);

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/pdf")
        .header(header::CONTENT_DISPOSITION, content_disposition)
        .header(header::CONTENT_LENGTH, bytes.len().to_string())
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .body(Body::from(bytes))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(response)
}

pub async fn delete_document(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let doc = Document::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Document not found".to_string()))?;

    // Delete file from disk
    let _ = state.storage.delete_file(&doc.file_path).await;

    // Delete from DB (cascade deletes reading_progress, annotations, comments, attachments)
    doc.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB delete error: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}
