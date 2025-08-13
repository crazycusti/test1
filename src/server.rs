use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};

use crate::router;

pub fn run(addr: &str) -> std::io::Result<()> {
    let listener = TcpListener::bind(addr)?;
    println!("Listening on {}", addr);

    for stream in listener.incoming() {
        match stream {
            Ok(mut stream) => handle_connection(&mut stream),
            Err(e) => eprintln!("Connection failed: {}", e),
        }
    }

    Ok(())
}

fn handle_connection(stream: &mut TcpStream) {
    let mut buffer = [0; 1024];
    if let Ok(_bytes) = stream.read(&mut buffer) {
        let request = String::from_utf8_lossy(&buffer);
        let response = router::route(&request);
        if let Err(e) = stream.write_all(response.as_bytes()) {
            eprintln!("Failed to send response: {}", e);
        }
    }
}
