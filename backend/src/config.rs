use std::env;

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub host: String,
    pub port: u16,
    pub storage_dir: String,
    pub supabase_url: Option<String>,
    pub supabase_publishable_key: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();

        let database_url = env::var("DATABASE_URL").expect(
            "DATABASE_URL must be set in environment or .env file (e.g. postgres://postgres.xxx:password@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require)",
        );

        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
        let port = env::var("PORT")
            .ok()
            .and_then(|p| p.parse().ok())
            .unwrap_or(8080);

        let storage_dir = env::var("STORAGE_DIR").unwrap_or_else(|_| "./uploads".to_string());

        let supabase_url = env::var("SUPABASE_URL").ok();
        let supabase_publishable_key = env::var("SUPABASE_PUBLISHABLE_KEY").ok();

        Self {
            database_url,
            host,
            port,
            storage_dir,
            supabase_url,
            supabase_publishable_key,
        }
    }
}
