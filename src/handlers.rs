pub fn index() -> String {
    format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nWelcome!")
}

pub fn hello() -> String {
    format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nHello HTTP1")
}

pub fn not_found() -> String {
    format!("HTTP/1.1 404 NOT FOUND\r\nContent-Type: text/plain\r\n\r\nNot Found")
}
