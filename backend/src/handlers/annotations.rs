use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, EntityTrait, ModelTrait, QueryFilter, QueryOrder, Set,
};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    dtos::CreateAnnotationDto,
    entities::{annotation, Annotation},
    handlers::documents::AppState,
};

#[derive(Debug, Deserialize)]
pub struct AnnotationFilter {
    pub page: Option<i32>,
}

pub async fn list_annotations(
    State(state): State<Arc<AppState>>,
    Path(doc_id): Path<Uuid>,
    Query(filter): Query<AnnotationFilter>,
) -> Result<Json<Vec<annotation::Model>>, (StatusCode, String)> {
    let mut query = Annotation::find()
        .filter(annotation::Column::DocumentId.eq(doc_id))
        .order_by_asc(annotation::Column::CreatedAt);

    if let Some(page) = filter.page {
        query = query.filter(annotation::Column::PageNumber.eq(page));
    }

    let annotations = query
        .all(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?;

    Ok(Json(annotations))
}

pub async fn create_annotation(
    State(state): State<Arc<AppState>>,
    Path(doc_id): Path<Uuid>,
    Json(payload): Json<CreateAnnotationDto>,
) -> Result<(StatusCode, Json<annotation::Model>), (StatusCode, String)> {
    let now = Utc::now().into();
    let model = annotation::ActiveModel {
        id: Set(Uuid::new_v4()),
        document_id: Set(doc_id),
        page_number: Set(payload.page_number),
        annotation_type: Set(payload.annotation_type),
        data: Set(payload.data),
        created_at: Set(now),
        updated_at: Set(now),
    };

    let inserted = model
        .insert(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Insert annotation error: {}", e)))?;

    Ok((StatusCode::CREATED, Json(inserted)))
}

pub async fn delete_annotation(
    State(state): State<Arc<AppState>>,
    Path((_doc_id, annotation_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    let anno = Annotation::find_by_id(annotation_id)
        .one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("DB error: {}", e)))?
        .ok_or((StatusCode::NOT_FOUND, "Annotation not found".to_string()))?;

    anno.delete(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Delete annotation error: {}", e)))?;

    Ok(StatusCode::NO_CONTENT)
}
