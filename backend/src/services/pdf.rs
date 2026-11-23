use lopdf::Document;
use std::io::Cursor;
use tracing::warn;

pub struct PdfInfo {
    pub page_count: i32,
    pub title: Option<String>,
}

pub fn extract_pdf_info(bytes: &[u8]) -> PdfInfo {
    match Document::load_from(Cursor::new(bytes)) {
        Ok(doc) => {
            let page_count = doc.get_pages().len() as i32;
            let page_count = if page_count <= 0 { 1 } else { page_count };

            let mut title = None;
            if let Ok(info) = doc.get_object(doc.trailer.get(b"Info").unwrap_or(&lopdf::Object::Null).as_reference().unwrap_or((0, 0))) {
                if let Ok(dict) = info.as_dict() {
                    if let Ok(title_obj) = dict.get(b"Title") {
                        if let Ok(title_str) = title_obj.as_str() {
                            let clean_title = String::from_utf8_lossy(title_str).trim().to_string();
                            if !clean_title.is_empty() {
                                title = Some(clean_title);
                            }
                        }
                    }
                }
            }

            PdfInfo {
                page_count,
                title,
            }
        }
        Err(e) => {
            warn!("Failed to parse PDF with lopdf: {}, defaulting to 1 page", e);
            PdfInfo {
                page_count: 1,
                title: None,
            }
        }
    }
}
