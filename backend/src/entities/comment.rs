use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "comments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub document_id: Uuid,
    pub page_number: i32,
    pub position_x: Option<Decimal>,
    pub position_y: Option<Decimal>,
    pub author_name: String,
    pub content: String,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::document::Entity",
        from = "Column::DocumentId",
        to = "super::document::Column::Id",
        on_update = "NoAction",
        on_delete = "Cascade"
    )]
    Document,
    #[sea_orm(has_many = "super::comment_attachment::Entity")]
    CommentAttachment,
}

impl Related<super::document::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Document.def()
    }
}

impl Related<super::comment_attachment::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CommentAttachment.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
