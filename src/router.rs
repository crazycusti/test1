use crate::handlers;

pub fn route(request: &str) -> String {
    let request_line = request.lines().next().unwrap_or("");
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/");

    match (method, path) {
        ("GET", "/") => handlers::index(),
        ("GET", "/hello") => handlers::hello(),
        _ => handlers::not_found(),
    }
}
