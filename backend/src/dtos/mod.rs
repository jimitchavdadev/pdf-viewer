use chrono::{DateTime, FixedOffset};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgressDto {
    pub current_page: i32,
    pub total_pages: i32,
    pub percentage: Decimal,
    pub zoom_level: Decimal,
    pub scroll_position_y: Decimal,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAnnotationDto {
    pub page_number: i32,
    pub annotation_type: String, // 'highlight', 'scribble', 'text', 'rectangle'
    pub data: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCommentDto {
    pub page_number: i32,
    pub position_x: Option<Decimal>,
    pub position_y: Option<Decimal>,
    pub author_name: Option<String>,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommentAttachmentDto {
    pub id: Uuid,
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub url: String,
    pub created_at: DateTime<FixedOffset>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommentWithAttachmentsDto {
    pub id: Uuid,
    pub document_id: Uuid,
    pub page_number: i32,
    pub position_x: Option<Decimal>,
    pub position_y: Option<Decimal>,
    pub author_name: String,
    pub content: String,
    pub attachments: Vec<CommentAttachmentDto>,
    pub created_at: DateTime<FixedOffset>,
    pub updated_at: DateTime<FixedOffset>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentWithProgressDto {
    pub id: Uuid,
    pub title: String,
    pub file_size: i64,
    pub mime_type: String,
    pub page_count: i32,
    pub current_page: i32,
    pub reading_percentage: Decimal,
    pub zoom_level: Decimal,
    pub scroll_position_y: Decimal,
    pub last_read_at: Option<DateTime<FixedOffset>>,
    pub created_at: DateTime<FixedOffset>,
    pub updated_at: DateTime<FixedOffset>,
}
