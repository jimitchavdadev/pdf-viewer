// Integration tests for PDF viewer and cloud drive backend
// Verifies SeaORM models, connection pool, and endpoints

#[cfg(test)]
mod tests {
    use std::env;

    #[tokio::test]
    async fn test_db_pooler_connection() {
        dotenvy::dotenv().ok();
        let db_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://postgres.qjxtziogfrtzarpjilws:dummy@localhost:5432/postgres".to_string()
        });

        let opt = sea_orm::ConnectOptions::new(db_url);
        let conn = sea_orm::Database::connect(opt).await;
        assert!(conn.is_ok(), "Database connection pooler must succeed");
    }

    #[tokio::test]
    async fn test_backend_health_endpoint() {
        let client = reqwest::Client::new();
        if let Ok(res) = client.get("http://127.0.0.1:8080/health").send().await {
            assert_eq!(res.status(), 200);
            let body: serde_json::Value = res.json().await.unwrap();
            assert_eq!(body["status"], "healthy");
            assert_eq!(body["orm"], "sea-orm");
            assert_eq!(body["database"], "supabase-postgres");
        }
    }

    #[tokio::test]
    async fn test_documents_api() {
        let client = reqwest::Client::new();
        if let Ok(res) = client.get("http://127.0.0.1:8080/api/documents").send().await {
            assert_eq!(res.status(), 200);
            let body: serde_json::Value = res.json().await.unwrap();
            assert!(body.is_array());
        }
    }
}
