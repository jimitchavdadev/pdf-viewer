use axum::{
    body::Body,
    extract::{Multipart, Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, ModelTrait, QueryFilter, QueryOrder, Set,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    dtos::{CommentAttachmentDto, CommentWithAttachmentsDto, CreateCommentDto},
    entities::{
        comment, comment_attachment, Comment, CommentAttachment,
    },
    handlers::documents::AppState,
};

pub async fn list_comments(
    State(state): State<Arc<AppState>>,
    Path(doc_id): Path<Uuid>,
) -> Result<Json<Vec<CommentWithAttachmentsDto>>, (StatusCode, String)> {
    let comments = Comment::find()
        .filter(comment::Column::DocumentId.eq(doc_id))
        .order_by_asc(comment::Column::CreatedAt)
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?;

    let mut result = Vec::new();
    for c in comments {
        let attachments = c
            .find_related(CommentAttachment)
            .all(&state.db)
            .await
            .unwrap_or_default();

        let attachment_dtos = attachments
            .into_iter()
            .map(|a| CommentAttachmentDto {
                id: a.id,
                file_name: a.file_name,
                file_size: a.file_size,
                mime_type: a.mime_type,
                url: format!("/api/attachments/{}", a.id),
                created_at: a.created_at,
            })
            .collect();

        result.push(CommentWithAttachmentsDto {
            id: c.id,
            document_id: c.document_id,
            page_number: c.page_number,
            position_x: c.position_x,
            position_y: c.position_y,
            author_name: c.author_name,
            content: c.content,
            attachments: attachment_dtos,
            created_at: c.created_at,
            updated_at: c.updated_at,
        });
    }

    Ok(Json(result))
}

pub async fn create_comment(
    State(state): State<Arc<AppState>>,
    Path(doc_id): Path<Uuid>,
    Json(payload): Json<CreateCommentDto>,
) -> Result<(StatusCode, Json<CommentWithAttachmentsDto>), (StatusCode, String)> {
    let now = Utc::now().into();
    let comment_id = Uuid::new_v4();

    let model = comment::ActiveModel {
        id: Set(comment_id),
        document_id: Set(doc_id),
        page_number: Set(payload.page_number),
        position_x: Set(payload.position_x),
        position_y: Set(payload.position_y),
        author_name: Set(payload.author_name.unwrap_or_else(|| "Reader".to_string())),
        content: Set(payload.content),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let inserted = model
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Insert comment error: {}", e)))?;

    Ok((
        StatusCode::CREATED,
        Json(CommentWithAttachmentsDto {
            id: inserted.id,
            document_id: inserted.document_id,
            page_number: inserted.page_number,
            position_x: inserted.position_x,
            position_y: inserted.position_y,
            author_name: inserted.author_name,
            content: inserted.content,
            attachments: vec![],
            created_at: inserted.created_at,
            updated_at: inserted.updated_at,
        }),
    ))
}

pub async fn delete_comment(
    State(state): State<Arc<AppState>>,
    Path(comment_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let comment = Comment::find_by_id(comment_id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".to_string()))?;

    // Delete associated attachment files from disk
    let attachments = comment
        .find_related(CommentAttachment)
        .all(&state.db)
        .await
        .unwrap_or_default();

    for att in attachments {
        let _ = state.storage.delete_file(&att.file_path).await;
    }

    comment
        .delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete error: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}

pub const MAX_ATTACHMENT_SIZE_BYTES: usize = 10 * 1024 * 1024; // 10 MB

pub async fn upload_attachment(
    State(state): State<Arc<AppState>>,
    Path(comment_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<CommentAttachmentDto>), (StatusCode, String)> {
    let _comment = Comment::find_by_id(comment_id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".to_string()))?;

    let mut file_bytes: Option<Vec<u8>> = None;
    let mut original_filename: Option<String> = None;
    let mut mime_type = "image/png".to_string();

    while let Some(mut field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Multipart stream error: {}", e)))?
    {
        if let Some(content_type) = field.content_type() {
            mime_type = content_type.to_string();
        }
        if let Some(filename) = field.file_name() {
            original_filename = Some(filename.to_string());
        }
        let mut chunks = Vec::new();
        while let Some(chunk) = field
            .chunk()
            .await
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Failed reading attachment chunk: {}", e)))?
        {
            if chunks.len() + chunk.len() > MAX_ATTACHMENT_SIZE_BYTES {
                return Err((
                    StatusCode::PAYLOAD_TOO_LARGE,
                    format!("Attachment size exceeds the 10 MB limit."),
                ));
            }
            chunks.extend_from_slice(&chunk);
        }
        file_bytes = Some(chunks);
    }

    let bytes = file_bytes.ok_or((StatusCode::BAD_REQUEST, "Missing attachment file".to_string()))?;
    let orig_name = original_filename.unwrap_or_else(|| "attachment.png".to_string());
    let extension = orig_name.rsplit('.').next().unwrap_or("png");

    let att_id = Uuid::new_v4();
    let saved_rel_path = state
        .storage
        .save_attachment(&att_id.to_string(), extension, &bytes)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Save attachment error: {}", e)))?;

    let now = Utc::now().into();
    let model = comment_attachment::ActiveModel {
        id: Set(att_id),
        comment_id: Set(comment_id),
        file_name: Set(orig_name.clone()),
        file_path: Set(saved_rel_path),
        file_size: Set(bytes.len() as i64),
        mime_type: Set(mime_type.clone()),
        created_at: Set(now),
    };

    let inserted = model
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB insert attachment error: {}", e)))?;

    Ok((
        StatusCode::CREATED,
        Json(CommentAttachmentDto {
            id: inserted.id,
            file_name: inserted.file_name,
            file_size: inserted.file_size,
            mime_type: inserted.mime_type,
            url: format!("/api/attachments/{}", inserted.id),
            created_at: inserted.created_at,
        }),
    ))
}

pub async fn get_attachment(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Response, (StatusCode, String)> {
    let att = CommentAttachment::find_by_id(id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Attachment not found".to_string()))?;

    let bytes = state
        .storage
        .read_file(&att.file_path)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, format!("Read file error: {}", e)))?;

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, att.mime_type)
        .header(header::CONTENT_LENGTH, bytes.len().to_string())
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::CACHE_CONTROL, "public, max-age=86400")
        .body(Body::from(bytes))
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(response)
}
