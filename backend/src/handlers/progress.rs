use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, QueryFilter, Set,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    dtos::UpdateProgressDto,
    entities::{reading_progress, ReadingProgress},
    handlers::documents::AppState,
};

pub async fn get_progress(
    State(state): State<Arc<AppState>>,
    Path(doc_id): Path<Uuid>,
) -> Result<Json<reading_progress::Model>, (StatusCode, String)> {
    let progress = ReadingProgress::find()
        .filter(reading_progress::Column::DocumentId.eq(doc_id))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB query error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Reading progress not found".to_string()))?;

    Ok(Json(progress))
}

pub async fn update_progress(
    State(state): State<Arc<AppState>>,
    Path(doc_id): Path<Uuid>,
    Json(payload): Json<UpdateProgressDto>,
) -> Result<Json<reading_progress::Model>, (StatusCode, String)> {
    let existing = ReadingProgress::find()
        .filter(reading_progress::Column::DocumentId.eq(doc_id))
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?;

    let now = Utc::now().into();

    let updated_model = match existing {
        Some(existing_progress) => {
            let mut active: reading_progress::ActiveModel = existing_progress.into();
            active.current_page = Set(payload.current_page);
            active.total_pages = Set(payload.total_pages);
            active.percentage = Set(payload.percentage);
            active.zoom_level = Set(payload.zoom_level);
            active.scroll_position_y = Set(payload.scroll_position_y);
            active.last_read_at = Set(now);
            active
                .update(&state.db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Update progress error: {}", e)))?
        }
        None => {
            let active = reading_progress::ActiveModel {
                id: Set(Uuid::new_v4()),
                document_id: Set(doc_id),
                current_page: Set(payload.current_page),
                total_pages: Set(payload.total_pages),
                percentage: Set(payload.percentage),
                zoom_level: Set(payload.zoom_level),
                scroll_position_y: Set(payload.scroll_position_y),
                last_read_at: Set(now),
            };
            active
                .insert(&state.db)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Insert progress error: {}", e)))?
        }
    };

    Ok(Json(updated_model))
}
