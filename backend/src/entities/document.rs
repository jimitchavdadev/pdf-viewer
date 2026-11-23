use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "documents")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub title: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub page_count: i32,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_one = "super::reading_progress::Entity")]
    ReadingProgress,
    #[sea_orm(has_many = "super::annotation::Entity")]
    Annotation,
    #[sea_orm(has_many = "super::comment::Entity")]
    Comment,
}

impl Related<super::reading_progress::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ReadingProgress.def()
    }
}

impl Related<super::annotation::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Annotation.def()
    }
}

impl Related<super::comment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Comment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
