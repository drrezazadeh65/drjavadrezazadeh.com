#!/usr/bin/env python3
"""Loopback-only TLS SMTP sink for isolated account tests.
Never use against production SMTP or real recipients. Does not relay mail.
Messages remain in a temporary GitHub Actions runner file, never in logs.
"""
import json
import os
import socket
import ssl
import sys
import threading

cert, key, mailbox = sys.argv[1:4]
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile=cert, keyfile=key)
lock = threading.Lock()
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("127.0.0.1", 465))
server.listen(12)


def serve(conn):
    try:
        with context.wrap_socket(conn, server_side=True) as s:
            f = s.makefile("rwb", buffering=0)
            def reply(value):
                f.write((value + "\r\n").encode())
            reply("220 qa.local.test ESMTP")
            auth_step = 0
            message = None
            while True:
                raw = f.readline()
                if not raw:
                    break
                cmd = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                upper = cmd.upper()
                if message is not None:
                    if cmd == ".":
                        with lock:
                            with open(mailbox, "a", encoding="utf-8") as out:
                                out.write(json.dumps({"message": "\n".join(message)}, ensure_ascii=False) + "\n")
                                out.flush()
                                os.fsync(out.fileno())
                        message = None
                        reply("250 accepted")
                    else:
                        message.append(cmd)
                elif auth_step in (1, 2):
                    if auth_step == 1:
                        auth_step = 2
                        reply("334 UGFzc3dvcmQ6")
                    else:
                        auth_step = 0
                        reply("235 authenticated")
                elif upper.startswith("EHLO ") or upper.startswith("HELO "):
                    reply("250 qa.local.test")
                elif upper == "AUTH LOGIN":
                    auth_step = 1
                    reply("334 VXNlcm5hbWU6")
                elif upper.startswith("MAIL FROM:") or upper.startswith("RCPT TO:"):
                    reply("250 accepted")
                elif upper == "DATA":
                    message = []
                    reply("354 end with .")
                elif upper == "QUIT":
                    reply("221 bye")
                    break
                else:
                    reply("500 unsupported")
    except Exception:
        # A rejected TLS handshake is not grounds to expose SMTP data in CI.
        pass


while True:
    conn, _ = server.accept()
    threading.Thread(target=serve, args=(conn,), daemon=True).start()
