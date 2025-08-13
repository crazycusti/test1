mod handlers;
mod router;
mod server;

fn main() {
    if let Err(e) = server::run("127.0.0.1:8080") {
        eprintln!("Server error: {}", e);
    }
}
