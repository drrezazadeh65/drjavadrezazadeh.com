"""JREI Desktop — first-party native Windows GUI for the existing JREI owner AI.

No browser, WebView, embedded external chatbot, cloud model, model download,
or second server. This is a GUI/client ONLY: the original owner-private
127.0.0.1:8092 Windows command center is the single authority for conversations,
messages, jobs, memory and owner approvals.

Packaging via PyInstaller and the single-file Inno Setup installer is a BUILD
operation on a Windows GitHub runner, never a requirement to install those
tools on the user's Windows PC. Python/Tkinter are part of the compiled GUI.
"""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import sys
import threading
import time
import tkinter as tk
from tkinter import messagebox
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8092"
TASK_PATTERN = re.compile(r"^[a-f0-9]{32}$")
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{50,128}$")
COLORS = {
    "bg": "#151618", "sidebar": "#1e2024", "surface": "#202226",
    "surface2": "#292c30", "text": "#eeece7", "muted": "#a8abb2",
    "gold": "#d9b66f", "line": "#36383e", "user": "#272a2e",
    "danger": "#e19a90", "ok": "#b4d6ae",
}
FONT = "Segoe UI"
PERSIAN_FONT = "Segoe UI"
ACTIVE_STATES = {"QUEUED", "RUNNING", "CLAIMED", "STARTED", "CANCELLING"}
END_STATES = {"SUCCEEDED", "FAILED", "CANCELLED", "INTERRUPTED"}

PRIVATE = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "JREI" / "command-center"
TOKEN_FILE = PRIVATE / "owner-token"


def _token() -> str:
    if not TOKEN_FILE.is_file() or TOKEN_FILE.is_symlink():
        raise RuntimeError("توکن خصوصی JREI پیدا نشد. موتور فعلی ویندوز را راه‌اندازی کنید.")
    if TOKEN_FILE.stat().st_size > 256:
        raise RuntimeError("توکن خصوصی JREI نامعتبر است.")
    token = TOKEN_FILE.read_text(encoding="ascii").strip()
    if not TOKEN_PATTERN.fullmatch(token):
        raise RuntimeError("توکن خصوصی JREI نامعتبر است.")
    return token


class LocalAPI:
    """Bounded JSON over loopback only; no system/network proxy involvement."""

    def __init__(self):
        self._opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def call(self, route: str, body: dict | None = None, *, timeout: int = 12) -> dict:
        if not isinstance(route, str) or not route.startswith("/api/") or \
                route.startswith("//") or len(route) > 400:
            raise ValueError("JREI_DESKTOP_INVALID_ROUTE")
        headers = {
            "Authorization": "Bearer " + _token(),
            "Accept": "application/json",
            "Cache-Control": "no-store",
        }
        payload = None
        if body is not None:
            payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
            if len(payload) > 40_000:
                raise ValueError("JREI_DESKTOP_REQUEST_TOO_LARGE")
            headers["Content-Type"] = "application/json; charset=utf-8"
        request = urllib.request.Request(
            BASE + route, data=payload, headers=headers,
            method="GET" if body is None else "POST",
        )
        try:
            with self._opener.open(request, timeout=timeout) as response:
                if response.status not in (200, 202):
                    raise RuntimeError("JREI_DESKTOP_UNEXPECTED_STATUS")
                content = response.read(1_200_001)
                if len(content) > 1_200_000:
                    raise RuntimeError("پاسخ JREI بیش از حد بزرگ است.")
                parsed = json.loads(content.decode("utf-8"))
                if not isinstance(parsed, dict):
                    raise RuntimeError("پاسخ نامعتبر از موتور JREI.")
                return parsed
        except urllib.error.HTTPError as exc:
            raise RuntimeError(
                "JREI خطای " + str(exc.code) + " برگرداند. اتصال یا مجوز را بررسی کنید."
            ) from exc
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            raise RuntimeError(
                "موتور JREI روی این رایانه پاسخ نمی‌دهد. «راه‌اندازی موتور» را بزنید."
            ) from exc


class JREIDesktop(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("JREI — هوش مصنوعی شخصی")
        self.geometry("1120x760")
        self.minsize(780, 560)
        self.configure(bg=COLORS["bg"])
        self.protocol("WM_DELETE_WINDOW", self._close)
        self.api = LocalAPI()
        self.pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="jrei-desktop")
        self.events: queue.Queue = queue.Queue()
        self.closed = False
        self.selected: str | None = None
        self.conversations: list[dict] = []
        self.pending: dict[str, dict] = {}
        self.last_message_version = ""
        self._last_messages: list[dict] = []
        self._job_inflight = False
        self._status_inflight = False
        self._threads_inflight = False
        self._conversation_inflight = False
        self._refresh_generation = 0
        self._search = tk.StringVar()
        self._status = tk.StringVar(value="در حال اتصال به موتور خصوصی JREI…")
        self._current_title = tk.StringVar(value="JREI")
        self._make_widgets()
        self.after(120, self._drain_events)
        self.after(250, self._refresh_start)
        self.after(4000, self._poll)
        self.after(1800, self._refresh_status)
        self.bind("<Control-n>", lambda event: self._new_chat())
        self.bind("<Control-r>", lambda event: self._refresh_start())
        self.bind("<Escape>", lambda event: self.composer.focus_set())

    def _label(self, parent, text, *, size=11, bold=False, color=None, bg=None):
        return tk.Label(
            parent, text=text, bg=bg or parent.cget("bg"), fg=color or COLORS["text"],
            font=(PERSIAN_FONT, size, "bold" if bold else "normal"),
            anchor="e", justify="right",
        )

    def _button(self, parent, text, action, *, accent=False, width=None):
        return tk.Button(
            parent, text=text, command=action,
            fg=COLORS["bg"] if accent else COLORS["text"],
            bg=COLORS["gold"] if accent else COLORS["surface2"],
            activebackground="#e4c787" if accent else "#3b3e44",
            activeforeground=COLORS["bg"] if accent else COLORS["text"],
            relief=tk.FLAT, borderwidth=0, cursor="hand2",
            font=(PERSIAN_FONT, 10, "bold"),
            padx=13, pady=8, width=width, takefocus=True,
        )

    def _make_widgets(self):
        left = tk.Frame(self, bg=COLORS["sidebar"], width=274)
        left.pack(side="left", fill="y")
        left.pack_propagate(False)
        self._label(left, "JREI", size=26, bold=True, color=COLORS["gold"]).pack(
            fill="x", padx=22, pady=(21, 1))
        self._label(left, "دستیار اختصاصی ویندوز", size=9, color=COLORS["muted"]).pack(
            fill="x", padx=22, pady=(0, 22))
        self._button(left, "＋  گفتگوی جدید", self._new_chat, accent=True).pack(
            fill="x", padx=15, pady=(0, 12))
        search_box = tk.Entry(
            left, textvariable=self._search, fg=COLORS["text"],
            insertbackground=COLORS["gold"], bg=COLORS["surface2"],
            highlightthickness=1, highlightcolor=COLORS["gold"],
            highlightbackground=COLORS["line"], relief=tk.FLAT,
            font=(PERSIAN_FONT, 10), justify="right",
        )
        search_box.pack(fill="x", padx=15, ipady=9, pady=(0, 10))
        self._search.trace_add("write", lambda *_: self._draw_threads())
        self.threads = tk.Listbox(
            left, borderwidth=0, highlightthickness=0,
            selectborderwidth=0, activestyle="none",
            bg=COLORS["sidebar"], fg=COLORS["text"], selectbackground="#414044",
            selectforeground=COLORS["gold"],
            font=(PERSIAN_FONT, 10), height=25,
            exportselection=False,
        )
        self.threads.pack(fill="both", expand=True, padx=10)
        self.threads.bind("<<ListboxSelect>>", self._select_thread)
        self._thread_index: list[str] = []
        sidebar_bottom = tk.Frame(left, bg=COLORS["sidebar"])
        sidebar_bottom.pack(side="bottom", fill="x", padx=13, pady=13)
        self._button(sidebar_bottom, "↻  تازه‌سازی", self._refresh_start).pack(
            side="left", padx=(0, 6))
        self._button(sidebar_bottom, "راه‌اندازی موتور", self._start_backend).pack(
            side="right")

        main = tk.Frame(self, bg=COLORS["bg"])
        main.pack(side="right", fill="both", expand=True)
        top = tk.Frame(main, bg=COLORS["bg"], height=74)
        top.pack(fill="x", padx=27)
        top.pack_propagate(False)
        self._label(top, "گفتگو با JREI", bold=True, size=17).pack(
            side="right", pady=20)
        self._label(top, "مستقل، محلی و خصوصی", size=9, color=COLORS["muted"]).pack(
            side="left", pady=24)
        tk.Frame(main, bg=COLORS["line"], height=1).pack(fill="x")

        area = tk.Frame(main, bg=COLORS["bg"])
        area.pack(fill="both", expand=True, padx=20, pady=(11, 0))
        scroll = tk.Scrollbar(area, width=10)
        scroll.pack(side="right", fill="y")
        self.transcript = tk.Text(
            area, wrap="word", state="disabled", cursor="arrow",
            bg=COLORS["bg"], fg=COLORS["text"], borderwidth=0,
            highlightthickness=0, font=(PERSIAN_FONT, 12), padx=22, pady=14,
            yscrollcommand=scroll.set, spacing1=8, spacing3=13,
        )
        self.transcript.pack(fill="both", expand=True)
        scroll.config(command=self.transcript.yview)
        self.transcript.tag_configure(
            "name_user", foreground=COLORS["gold"],
            font=(PERSIAN_FONT, 10, "bold"), justify="right",
        )
        self.transcript.tag_configure(
            "name_ai", foreground=COLORS["gold"],
            font=(PERSIAN_FONT, 10, "bold"), justify="right",
        )
        self.transcript.tag_configure(
            "user", foreground=COLORS["text"],
            lmargin1=65, lmargin2=65, rmargin=14, justify="right",
            background=COLORS["user"],
        )
        self.transcript.tag_configure(
            "ai", foreground=COLORS["text"], lmargin1=32, lmargin2=32,
            rmargin=18, justify="right",
        )
        self.transcript.tag_configure(
            "meta", foreground=COLORS["muted"],
            font=(PERSIAN_FONT, 10, "italic"), justify="right",
        )
        self.transcript.tag_configure(
            "waiting", foreground=COLORS["gold"],
            font=(PERSIAN_FONT, 10, "italic"), justify="right",
        )
        self._render_messages([])

        entry = tk.Frame(main, bg=COLORS["bg"])
        entry.pack(fill="x", padx=28, pady=(0, 12))
        self._label(entry, "یک پیام بنویسید. Enter: ارسال | Shift+Enter: خط جدید",
                    size=9, color=COLORS["muted"]).pack(fill="x", pady=(0, 5))
        compose_box = tk.Frame(entry, bg=COLORS["surface"], highlightthickness=1,
                               highlightbackground=COLORS["line"])
        compose_box.pack(fill="x")
        self.composer = tk.Text(
            compose_box, height=3, wrap="word", undo=True,
            bg=COLORS["surface"], fg=COLORS["text"], borderwidth=0,
            highlightthickness=0, insertbackground=COLORS["gold"],
            font=(PERSIAN_FONT, 12), padx=14, pady=12,
        )
        self.composer.pack(side="left", fill="both", expand=True)
        self.composer.tag_configure("right", justify="right")
        self.composer.bind("<Return>", self._enter_send)
        self.composer.bind("<Shift-Return>", self._enter_newline)
        self.send = self._button(compose_box, "ارسال", self._send, accent=True)
        self.send.pack(side="right", padx=9, pady=9)
        status_bar = tk.Frame(main, bg=COLORS["surface"])
        status_bar.pack(fill="x", side="bottom")
        tk.Label(
            status_bar, textvariable=self._status, bg=COLORS["surface"],
            fg=COLORS["muted"], font=(PERSIAN_FONT, 9),
            anchor="e", justify="right",
        ).pack(fill="x", padx=17, pady=6)

    def _work(self, kind: str, function, *args):
        if self.closed:
            return

        def run():
            try:
                result = function(*args)
                self.events.put((kind, result, None))
            except Exception as exc:
                self.events.put((kind, None, str(exc)[:270]))

        try:
            self.pool.submit(run)
        except RuntimeError:
            pass

    def _drain_events(self):
        if self.closed:
            return
        for _ in range(30):
            try:
                kind, data, error = self.events.get_nowait()
            except queue.Empty:
                break
            self._receive(kind, data, error)
        self.after(125, self._drain_events)

    def _receive(self, kind, data, error):
        if kind == "status":
            self._status_inflight = False
            if error:
                self._status.set(error)
            elif data.get("schema") == "jr.jrei.windows-command-center.v2" and \
                    data.get("owner_private") is True:
                neural = data.get("model_connected") is True
                self._status.set(
                    "JREI خصوصی متصل • " +
                    ("مدل محلی متصل" if neural else
                     "هستهٔ دانش فعال • مدل زبانی آموزش‌دیده هنوز تأیید نشده")
                )
            else:
                self._status.set("پاسخ موتور با نسخهٔ JREI سازگار نیست.")
        elif kind == "threads":
            self._threads_inflight = False
            if error:
                self._status.set(error)
                return
            self.conversations = data.get("items", [])
            self._draw_threads()
            if not self.selected and self.conversations:
                self._open_chat(self.conversations[0]["id"])
            elif not self.selected and not self.conversations:
                self._new_chat()
        elif kind == "created":
            if error:
                self._status.set(error)
                return
            self.conversations.insert(
                0, {"id": data["id"], "title": "گفتگوی جدید"})
            self._draw_threads()
            self._open_chat(data["id"])
            self.composer.focus_set()
        elif kind == "messages":
            generation, ident, result = data if not error else (None, None, None)
            self._conversation_inflight = False
            if error:
                self._status.set(error)
                return
            if generation != self._refresh_generation or ident != self.selected:
                return
            messages = result.get("items", [])
            self._last_messages = messages
            signature = repr([
                (m.get("id"), m.get("role"), m.get("content")) for m in messages])
            if signature != self.last_message_version or self.pending:
                self.last_message_version = signature
                self._render_messages(messages)
        elif kind == "submitted":
            self.send.config(state="normal")
            if error:
                self._status.set(error)
                self._refresh_messages()
                return
            job = data.get("job") or {}
            if not TASK_PATTERN.fullmatch(str(job.get("id") or "")):
                self._status.set("شناسهٔ وظیفهٔ دریافتی نامعتبر است.")
                return
            if data.get("conversation_id") == self.selected:
                self.pending[job["id"]] = {
                    **job, "prompt": data.get("prompt", "")}
                self._render_messages(self._last_messages)
            self._status.set("پیام دریافت شد؛ JREI در حال پردازش است…")
            self._refresh_messages()
        elif kind == "polled":
            self._job_inflight = False
            if error:
                self._status.set(error)
                return
            pending = data.get("items", [])
            active = {
                item["id"]: {
                    **item, "prompt": self.pending.get(item["id"], {}).get("prompt", "")}
                for item in pending if
                item.get("status") not in END_STATES and
                TASK_PATTERN.fullmatch(str(item.get("id", "")))
            }
            if any(item.get("status") in END_STATES for item in pending):
                self._refresh_messages()
                self._refresh_threads()
            self.pending = active
            if pending:
                current = pending[0]
                status = str(current.get("status", ""))[:60]
                phase = (current.get("progress") or {}).get("phase", "")
                self._status.set(
                    "پردازش JREI: " + (str(phase)[:65] if phase else status)
                )
            if not active and self.selected and pending:
                self._refresh_messages()
        elif kind == "service":
            if error:
                self._status.set(error)
                messagebox.showwarning("JREI", error, parent=self)
            else:
                self._status.set("دستور راه‌اندازی موتور ارسال شد.")
                self.after(1500, self._refresh_status)
                self.after(1750, self._refresh_start)

    def _draw_threads(self):
        term = self._search.get().strip().casefold()
        self.threads.delete(0, tk.END)
        self._thread_index = []
        for item in self.conversations:
            title = str(item.get("title") or "گفتگوی جدید")
            if term and term not in title.casefold():
                continue
            ident = item.get("id")
            if not isinstance(ident, str) or not TASK_PATTERN.fullmatch(ident):
                continue
            self.threads.insert(tk.END, title[:42])
            self._thread_index.append(ident)
        if self.selected in self._thread_index:
            index = self._thread_index.index(self.selected)
            self.threads.selection_set(index)
            self.threads.see(index)

    def _select_thread(self, _event):
        selected = self.threads.curselection()
        if selected and selected[0] < len(self._thread_index):
            ident = self._thread_index[selected[0]]
            if ident != self.selected:
                self._open_chat(ident)

    def _new_chat(self):
        self._work("created", self.api.call, "/api/conversation/new", {})

    def _open_chat(self, ident):
        if not TASK_PATTERN.fullmatch(str(ident)):
            return
        self.selected = ident
        self.pending = {}
        self.last_message_version = ""
        self._last_messages = []
        self._refresh_generation += 1
        self._draw_threads()
        self._render_messages([])
        self._refresh_messages()

    def _refresh_start(self):
        self._refresh_threads()
        self._refresh_status()
        if self.selected:
            self._refresh_messages()

    def _refresh_threads(self):
        if self._threads_inflight:
            return
        self._threads_inflight = True
        self._work("threads", self.api.call, "/api/conversations")

    def _refresh_status(self):
        if self._status_inflight:
            return
        self._status_inflight = True
        self._work("status", self.api.call, "/api/status")

    def _refresh_messages(self):
        if not self.selected or self._conversation_inflight:
            return
        self._conversation_inflight = True
        ident, generation = self.selected, self._refresh_generation

        def request():
            return generation, ident, self.api.call(
                "/api/conversation?id=" + urllib.parse.quote(ident))

        self._work("messages", request)

    def _render_messages(self, messages):
        widget = self.transcript
        widget.config(state="normal")
        widget.delete("1.0", tk.END)
        if not messages:
            widget.insert(tk.END, "\n\n")
            widget.insert(
                tk.END,
                "JREI\n\n", "name_ai")
            widget.insert(
                tk.END,
                "امروز چه کاری می‌توانم برای شما انجام بدهم؟\n"
                "پرسش، پژوهش، آموزش، کدنویسی یا بررسی سایت را مطرح کنید.\n\n",
                "ai",
            )
        for entry in messages:
            content = str(entry.get("content") or "")[:14_000]
            name = "شما" if entry.get("role") == "user" else "JREI"
            widget.insert(tk.END, "\n" + name + "\n",
                          "name_user" if name == "شما" else "name_ai")
            widget.insert(tk.END, content + "\n", "user" if name == "شما" else "ai")
            if entry.get("state") and name == "JREI":
                widget.insert(tk.END, str(entry["state"])[:90] + "\n", "meta")
        if self.pending:
            for task in self.pending.values():
                prompt = str(task.get("prompt") or "")
                if prompt and not any(m.get("role") == "user" and
                                      m.get("content") == prompt for m in messages[-4:]):
                    widget.insert(tk.END, "\nشما\n", "name_user")
                    widget.insert(tk.END, prompt + "\n", "user")
            widget.insert(tk.END, "\nJREI\n", "name_ai")
            widget.insert(tk.END, "در حال پردازش درخواست شما…\n", "waiting")
        widget.config(state="disabled")
        widget.see(tk.END)

    def _enter_send(self, event):
        self._send()
        return "break"

    def _enter_newline(self, event):
        self.composer.insert(tk.INSERT, "\n")
        return "break"

    def _send(self):
        text = self.composer.get("1.0", "end-1c").strip()
        if not text:
            return
        if len(text) > 11_000:
            self._status.set("پیام طولانی است؛ متن را کوتاه‌تر کنید.")
            return
        if not self.selected:
            self._status.set("ابتدا گفتگوی جدید بسازید.")
            return
        ident = self.selected
        self.composer.delete("1.0", tk.END)
        self.send.config(state="disabled")
        self.transcript.config(state="normal")
        self.transcript.insert(tk.END, "\nشما\n", "name_user")
        self.transcript.insert(tk.END, text + "\n", "user")
        self.transcript.insert(tk.END, "\nJREI\nدر صف پردازش…\n", "waiting")
        self.transcript.config(state="disabled")
        self.transcript.see(tk.END)
        def submit():
            result = self.api.call("/api/task/submit", {
                "conversation_id": ident, "message": text,
                "attachments": []})
            return {"job": result, "prompt": text,
                    "conversation_id": ident}
        self._work("submitted", submit)

    def _poll(self):
        if self.closed:
            return
        if self.selected and not self._job_inflight:
            self._job_inflight = True
            ident = self.selected
            self._work(
                "polled", self.api.call, "/api/tasks?conversation_id=" +
                urllib.parse.quote(ident))
        self.after(2200 if self.pending else 5300, self._poll)

    def _start_backend(self):
        if os.name != "nt":
            self._status.set("راه‌اندازی موتور فقط در ویندوز پشتیبانی می‌شود.")
            return
        self._status.set("درخواست راه‌اندازی موتور خصوصی موجود…")

        def start():
            script = Path(os.environ["LOCALAPPDATA"]) / "JREI-Python" / "repo" / \
                "platform" / "jrei-v5" / "windows-worker" / "jrei-command-center-startup.ps1"
            if not script.is_file() or script.is_symlink():
                raise RuntimeError(
                    "موتور JREI در این رایانه نصب نشده است؛ ابتدا نسخهٔ موجود را فعال کنید.")
            powershell = Path(os.environ.get("SystemRoot", r"C:\Windows")) / \
                "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"
            completed = subprocess.run(
                [str(powershell), "-NoProfile", "-NonInteractive",
                 "-ExecutionPolicy", "Bypass", "-File", str(script), "-Mode", "Start"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                text=True, timeout=35, check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            if completed.returncode:
                raise RuntimeError(
                    "راه‌اندازی موتور موفق نبود. کد: " +
                    str(completed.returncode) + ". نسخهٔ فعلی JREI را بررسی کنید."
                )
            return {"started": True}

        self._work("service", start)

    def _close(self):
        self.closed = True
        self.pool.shutdown(wait=False, cancel_futures=True)
        self.destroy()


def main():
    if os.name != "nt":
        raise SystemExit("JREI Desktop requires Windows")
    app = JREIDesktop()
    app.mainloop()


if __name__ == "__main__":
    main()
