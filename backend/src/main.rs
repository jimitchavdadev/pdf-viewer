use axum::{
    extract::DefaultBodyLimit,
    response::Json,
    routing::{delete, get, post},
    Router,
};
use serde_json::json;
use std::{net::SocketAddr, sync::Arc};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

mod config;
mod db;
mod dtos;
mod entities;
mod handlers;
mod services;

use config::Config;
use db::init_db;
use handlers::{
    create_annotation, create_comment, delete_annotation, delete_comment, delete_document,
    get_attachment, get_document, get_document_file, get_progress, list_annotations,
    list_comments, list_documents, update_progress, upload_attachment, upload_document, AppState,
};
use services::StorageService;

async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "healthy",
        "service": "pdf-viewer-backend",
        "orm": "sea-orm",
        "database": "supabase-postgres",
        "version": "1.0.0"
    }))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let config = Config::from_env();
    info!("Starting PDF Viewer backend service...");

    let db = init_db(&config.database_url).await?;
    let storage = StorageService::new(&config.storage_dir).await?;

    let state = Arc::new(AppState { db, storage });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/health", get(health_check))
        // Documents
        .route("/api/documents", get(list_documents))
        .route("/api/documents/upload", post(upload_document))
        .route("/api/documents/{id}", get(get_document))
        .route("/api/documents/{id}/file", get(get_document_file))
        .route("/api/documents/{id}", delete(delete_document))
        // Reading Progress
        .route("/api/documents/{id}/progress", get(get_progress))
        .route("/api/documents/{id}/progress", post(update_progress))
        // Annotations & Scribbles
        .route("/api/documents/{id}/annotations", get(list_annotations))
        .route("/api/documents/{id}/annotations", post(create_annotation))
        .route("/api/documents/{id}/annotations/{annotation_id}", delete(delete_annotation))
        // Comments & Attachments
        .route("/api/documents/{id}/comments", get(list_comments))
        .route("/api/documents/{id}/comments", post(create_comment))
        .route("/api/comments/{comment_id}", delete(delete_comment))
        .route("/api/comments/{comment_id}/attachments", post(upload_attachment))
        .route("/api/attachments/{id}", get(get_attachment))
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024)) // Strict 10MB maximum limit
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("PDF Viewer Backend listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
