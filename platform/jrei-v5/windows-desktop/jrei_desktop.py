"""JREI native Windows desktop client, bundled as one EXE using PyInstaller.

A dedicated Tk/ttk window: NOT a browser, WebView, Electron, cloud chatbot,
another model, new database, privileged agent, or external web client. Uses
the pre-existing owner-private 127.0.0.1:8092 JREI service and its database.
All conversations, jobs and authorizations stay in the original JREI backend.
No credentials are bundled; owner token is read from the current profile.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import queue
import re
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog, ttk, font as tkfont
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8092"
TOKEN_FILE = Path(os.environ.get("LOCALAPPDATA", Path.home())) / "JREI" / "command-center" / "owner-token"
FINAL = {"SUCCEEDED", "FAILED", "CANCELLED", "INTERRUPTED",
         "SUCCEEDED_AFTER_CANCEL_REQUEST", "FAILED_AFTER_CANCEL_REQUEST"}
PHASE = {
    "QUEUED": "در صف JREI",
    "RUNNING": "در حال پردازش",
    "STARTING": "آغاز بررسی",
    "READING_DOCUMENT": "در حال خواندن سند",
    "RETRIEVING_EVIDENCE": "در حال بازیابی شواهد",
    "SYNTHESIZING": "در حال ترکیب اطلاعات",
    "RESEARCHING_REPOSITORY": "در حال بررسی مخزن",
    "ROUTING_TOOL": "در حال انتخاب ابزار",
    "GENERATING_RESPONSE": "در حال آماده‌سازی پاسخ",
    "PERSISTING_RESULT": "در حال ذخیرهٔ پاسخ",
    "SUCCEEDED": "پاسخ آماده است",
    "FAILED": "وظیفه انجام نشد",
    "CANCELLED": "لغو شد",
    "INTERRUPTED": "پردازش قطع شد",
}
BG = "#111319"
SIDE = "#191c23"
SURFACE = "#20242c"
USER = "#2d3440"
GOLD = "#d7b577"
FG = "#f4f0e8"
MUTED = "#a7abb4"
LINE = "#353945"
ERROR = "#e2a7a5"
IDENT = re.compile(r"^[a-f0-9]{32}$")
FILES = {".txt", ".md", ".csv", ".json", ".py", ".js", ".mjs",
         ".css", ".html", ".docx", ".pdf", ".pptx", ".xlsx"}


class JREIClient:
    def __init__(self):
        # Explicitly bypass system/browser proxy configuration; the owner
        # bearer token must NEVER leave the loopback interface.
        self.http = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(self, route: str, data: dict | None = None) -> dict:
        if not route.startswith("/api/") or "://" in route or "#" in route:
            raise ValueError("JREI_LOCAL_ROUTE_REQUIRED")
        if not TOKEN_FILE.is_file() or TOKEN_FILE.is_symlink():
            raise RuntimeError("توکن مالک JREI روی این ویندوز یافت نشد. موتور خصوصی باید قبلاً راه‌اندازی شده باشد.")
        token = TOKEN_FILE.read_text(encoding="ascii").strip()
        if not re.fullmatch(r"[A-Za-z0-9_-]{50,128}", token):
            raise ValueError("JREI_OWNER_TOKEN_FORMAT_INVALID")
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8") if data is not None else None
        req = urllib.request.Request(BASE + route, data=payload,
            headers={"Authorization": "Bearer " + token,
                     "Accept": "application/json",
                     **({"Content-Type": "application/json; charset=utf-8"}
                        if data is not None else {})},
            method="POST" if data is not None else "GET")
        try:
            with self.http.open(req, timeout=12) as response:
                if response.status not in (200, 202):
                    raise RuntimeError("JREI_HTTP_RESPONSE_INVALID")
                raw = response.read(8_000_001)
                if len(raw) > 8_000_000:
                    raise ValueError("JREI_API_RESPONSE_TOO_LARGE")
                if response.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    raise ValueError("JREI_API_NOT_JSON")
                output = json.loads(raw.decode("utf-8"))
                if not isinstance(output, dict):
                    raise ValueError("JREI_API_SHAPE_INVALID")
                return output
        except urllib.error.HTTPError as exc:
            raw = exc.read(1500)
            try:
                message = json.loads(raw.decode("utf-8")).get("error", "HTTP_ERROR")
            except (ValueError, UnicodeError, AttributeError):
                message = "HTTP_ERROR"
            raise RuntimeError(f"JREI HTTP {exc.code}: {str(message)[:160]}") from exc
        except urllib.error.URLError as exc:
            raise ConnectionError("موتور خصوصی JREI روی 127.0.0.1:8092 پاسخ نمی‌دهد.") from exc


class Desktop:
    def __init__(self):
        self.api = JREIClient()
        self.root = tk.Tk()
        self.root.title("JREI | هوش مصنوعی شخصی")
        self.root.geometry("1130x755")
        self.root.minsize(720, 480)
        self.root.configure(bg=BG)
        # Segoe UI contains a space. String/tuple font specifications can
        # be misparsed by Tcl into [Segoe, UI, size] and fail with
        # "expected integer but got UI" (actual owner Windows crash).
        # Real Tk named font objects preserve the family as one field.
        self._fonts = {}
        self.root.option_add("*Font", "TkDefaultFont")
        self.ui_queue: queue.Queue = queue.Queue()
        self.busy_send = False
        self.conversation = None
        self.threads = []
        self.messages = []
        self.active_job = None
        self.attachments = []
        self.online = False
        self.real_engine_status = None
        self.approval_dialog = None
        self.approval_items = []
        self.approval_context = None
        self.approval_busy = False
        self.poll_in_flight = False
        self.last_draft = None
        self._build()
        self.root.after(90, self._drain)
        self.root.after(1100, self._start_poll)
        self.fetch("connect", self._bootstrap)

    def _font(self, size=10, bold=False):
        key = (int(size), bool(bold))
        if key not in self._fonts:
            self._fonts[key] = tkfont.Font(
                root=self.root, family="Segoe UI", size=key[0],
                weight="bold" if key[1] else "normal")
        return self._fonts[key]

    def _label(self, parent, text, *, fg=FG, bg=None, size=10, bold=False, **kwargs):
        return tk.Label(parent, text=text, fg=fg, bg=bg or parent.cget("bg"),
                        font=self._font(size, bold), **kwargs)

    def _button(self, parent, title, action, *, color=SURFACE, foreground=FG, **kwargs):
        return tk.Button(parent, text=title, command=action, bg=color, fg=foreground,
                         activebackground="#41444d", activeforeground=FG,
                         relief="flat", borderwidth=0, cursor="hand2",
                         font=self._font(10), padx=12, pady=8, **kwargs)

    def _build(self):
        root = self.root
        body = tk.Frame(root, bg=BG)
        body.pack(fill="both", expand=True)
        self.side = tk.Frame(body, bg=SIDE, width=267)
        self.side.pack(side="left", fill="y")
        self.side.pack_propagate(False)
        header = tk.Frame(self.side, bg=SIDE)
        header.pack(fill="x", padx=15, pady=(19, 13))
        self._label(header, "JR", fg=GOLD, bg=SIDE, size=22, bold=True).pack(side="left")
        self._label(header, "JREI", bg=SIDE, size=16, bold=True).pack(side="left", padx=10)
        self._button(self.side, "＋  گفتگوی جدید", self.new_chat, color="#383127",
                     foreground=GOLD).pack(fill="x", padx=13, pady=(0, 12))
        self.search = tk.StringVar()
        self.search.trace_add("write", lambda *_: self._render_threads())
        self.search_input = tk.Entry(self.side, textvariable=self.search, bg="#242730",
                                     fg=FG, insertbackground=GOLD, relief="flat",
                                     font=self._font(10))
        self.search_input.pack(fill="x", padx=13, ipady=9)
        self._label(self.side, "گفتگوهای من", bg=SIDE, fg=MUTED).pack(anchor="e", padx=17, pady=(15, 5))
        self.thread_list = tk.Listbox(self.side, bg=SIDE, fg=FG, selectbackground="#433a2b",
                                     selectforeground=FG, relief="flat", borderwidth=0,
                                     highlightthickness=0, activestyle="none",
                                     font=self._font(10))
        self.thread_list.pack(fill="both", expand=True, padx=10, pady=(0, 8))
        self.thread_list.bind("<<ListboxSelect>>", self._choose_thread)
        self._button(self.side, "وضعیت واقعی مغز و یادگیری",
                     self.show_engine_status, color=SIDE,
                     foreground=GOLD).pack(fill="x", padx=13, pady=(4, 7))
        self._button(self.side, "مشاهده منابع و GPU این رایانه",
                     self.show_local_hardware, color=SIDE,
                     foreground=GOLD).pack(fill="x", padx=13, pady=(0, 7))
        self._label(self.side, "خصوصی · فقط روی رایانهٔ شما", fg=MUTED, bg=SIDE, size=9).pack(pady=12)

        self.main = tk.Frame(body, bg=BG)
        self.main.pack(side="left", fill="both", expand=True)
        top = tk.Frame(self.main, bg=BG, height=62)
        top.pack(fill="x", padx=24, pady=(13, 6))
        self._label(top, "JREI  ·  Personal AI", fg=GOLD, bold=True, size=15).pack(side="left")
        self.status_text = tk.StringVar(value="در حال اتصال به موتور خصوصی…")
        self._label(top, "", fg=MUTED).pack(side="left", padx=5)
        self._button(top, "بازخوانی", self.refresh).pack(side="right")
        self._button(top, "تأیید تغییرات", self.show_approvals,
                     color="#423624", foreground=GOLD).pack(side="right", padx=6)
        self._button(top, "روشن‌کردن موتور JREI", self.start_existing_engine, foreground=GOLD).pack(side="right", padx=6)
        self._label(top, "", fg=MUTED).pack(side="right")
        self._button(top, "قطع / لغو", self.cancel_job, foreground=ERROR).pack(side="right", padx=5)
        status = tk.Frame(self.main, bg=BG)
        status.pack(fill="x", padx=25)
        self._label(status, "●", fg=GOLD).pack(side="left")
        self._label(status, "", fg=MUTED).pack(side="left", padx=2)
        self._label(status, "JREI", fg=MUTED).pack(side="left")
        tk.Label(status, textvariable=self.status_text, bg=BG, fg=MUTED,
                 font=self._font(9), anchor="e").pack(side="right")

        center = tk.Frame(self.main, bg=BG)
        center.pack(fill="both", expand=True, padx=(18, 20), pady=(8, 0))
        self.canvas = tk.Canvas(center, bg=BG, borderwidth=0, highlightthickness=0)
        scroll = ttk.Scrollbar(center, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        self.canvas.pack(side="left", fill="both", expand=True)
        self.stream = tk.Frame(self.canvas, bg=BG)
        self.canvas_window = self.canvas.create_window((0, 0), window=self.stream, anchor="nw")
        self.stream.bind("<Configure>", self._resize_scroll)
        self.canvas.bind("<Configure>", self._resize_width)
        self.canvas.bind_all("<MouseWheel>", self._wheel)

        foot = tk.Frame(self.main, bg=BG)
        foot.pack(fill="x", padx=29, pady=(3, 18))
        self.attach_view = tk.StringVar(value="")
        self._label(foot, "", fg=MUTED).pack(side="left")
        tk.Label(foot, textvariable=self.attach_view, fg=MUTED, bg=BG,
                 font=self._font(9), anchor="e").pack(fill="x")
        frame = tk.Frame(foot, bg=SURFACE, highlightbackground=LINE,
                         highlightthickness=1, padx=9, pady=8)
        frame.pack(fill="x")
        self.editor = tk.Text(frame, height=3, wrap="word", bg=SURFACE, fg=FG,
                              insertbackground=GOLD, relief="flat", borderwidth=0,
                              font=self._font(11), undo=True, padx=9, pady=8)
        self.editor.pack(side="top", fill="x")
        self.editor.bind("<Return>", self._on_return)
        actions = tk.Frame(frame, bg=SURFACE)
        actions.pack(fill="x")
        self._button(actions, "📎  افزودن فایل", self.select_file, color=SURFACE).pack(side="left")
        self._label(actions, "Shift+Enter: سطر تازه", fg=MUTED, bg=SURFACE, size=9).pack(side="left")
        self.send_button = self._button(actions, "ارسال ←", self.send,
                                        color=GOLD, foreground="#15161b")
        self.send_button.pack(side="right")
        self._label(foot, "پاسخ‌ها و توانایی‌های JREI به مدل و شواهد واقعاً فعال بستگی دارند.",
                    fg=MUTED, bg=BG, size=9).pack(pady=(5, 0))
        self._empty()

    def _resize_scroll(self, _event):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _resize_width(self, event):
        self.canvas.itemconfigure(self.canvas_window, width=event.width)

    def _wheel(self, event):
        self.canvas.yview_scroll(-1 if event.delta > 0 else 1, "units")

    def _scroll_bottom(self):
        self.root.after(50, lambda: self.canvas.yview_moveto(1.0))

    def _empty(self):
        for child in self.stream.winfo_children():
            child.destroy()
        card = tk.Frame(self.stream, bg=BG)
        card.pack(fill="both", padx=40, pady=90)
        self._label(card, "JREI", fg=GOLD, bg=BG, size=32, bold=True).pack()
        self._label(card, "امروز چه کمکی از من برمی‌آید؟", bg=BG, size=16).pack(pady=10)
        self._label(card, "گفتگو، پژوهش، حافظه، تحلیل منابع و ابزارهای کدنویسی",
                    bg=BG, fg=MUTED, size=10).pack()
        choices = tk.Frame(card, bg=BG)
        choices.pack(pady=(20, 0))
        starters = [
            ("توانایی‌های واقعی JREI", "چه کارهایی بلدی"),
            ("بررسی ساختار پروژه", "فهرست فایل‌های کد در مخزن را نشان بده"),
            ("یافتن فایل مربوط", "در مخزن کد فایل مربوط به مدیریت گفتگو را پیدا کن"),
        ]
        for title, prompt in starters:
            self._button(
                choices, title, lambda p=prompt: self._prefill(p),
                color=SURFACE, foreground=GOLD).pack(
                    fill="x", padx=6, pady=4)

    def _turn(self, role, content, *, temporary=False):
        user = role == "user"
        container = tk.Frame(self.stream, bg=BG)
        container.pack(fill="x", padx=14, pady=(5, 12))
        bubble = tk.Frame(container, bg=USER if user else BG, padx=17, pady=12)
        bubble.pack(anchor="e" if user else "w", padx=8,
                    fill="none" if user else "x")
        self._label(bubble, "شما" if user else "JREI", bg=USER if user else BG,
                    fg=GOLD if not user else FG, bold=True, size=10).pack(anchor="e" if user else "w")
        # Read-only Tk text supports native selection/copy, RTL justification,
        # wrapped Persian/English code excerpts and keyboard navigation.
        txt = tk.Text(bubble, bg=USER if user else BG, fg=MUTED if temporary else FG,
                      font=self._font(11), wrap="word", borderwidth=0,
                      highlightthickness=0, relief="flat", cursor="xterm",
                      padx=0, pady=5)
        text = str(content)[:12000]
        rows = text.count("\n") + sum(max(1, len(line) // 86 + 1)
                                      for line in text.split("\n"))
        txt.configure(height=min(35, max(2, rows)), width=46 if user else 74)
        txt.tag_configure("rtl", justify="right")
        txt.tag_configure("ltr", justify="left")
        txt.insert("1.0", text)
        txt.tag_add("rtl" if re.search(r"[\u0600-\u06ff]", text) else "ltr",
                    "1.0", "end")
        txt.configure(state="disabled")
        txt.pack(fill="x")
        if not temporary:
            self._button(bubble, "کپی", lambda t=text: self._copy(t),
                         color=USER if user else BG, foreground=MUTED).pack(anchor="w")
        self._scroll_bottom()

    def _copy(self, text):
        self.root.clipboard_clear()
        self.root.clipboard_append(text)
        self.status_text.set("متن کپی شد")

    def _render_messages(self):
        for child in self.stream.winfo_children():
            child.destroy()
        if not self.messages:
            self._empty()
        for entry in self.messages[-120:]:
            if entry.get("role") in ("user", "assistant"):
                self._turn(entry["role"], entry.get("content", ""))
        if self.active_job:
            self._turn("assistant", "●  " + self.active_job.get("phase", "در حال پردازش…"),
                       temporary=True)

    def _render_threads(self):
        filter_text = self.search.get().strip().casefold()
        self.thread_list.delete(0, "end")
        self.shown_threads = []
        for item in self.threads:
            title = str(item.get("title", "گفتگوی جدید"))[:68]
            if filter_text and filter_text not in title.casefold():
                continue
            self.shown_threads.append(item)
            self.thread_list.insert("end", "  " + title)
            if item.get("id") == self.conversation:
                self.thread_list.selection_set(len(self.shown_threads) - 1)

    def _choose_thread(self, _event):
        indices = self.thread_list.curselection()
        if indices and indices[0] < len(self.shown_threads):
            value = self.shown_threads[indices[0]].get("id")
            if isinstance(value, str) and IDENT.fullmatch(value):
                self.conversation = value
                self.messages = []
                self.active_job = None
                self.fetch("thread", lambda: self.api.request(
                    "/api/conversation?id=" + urllib.parse.quote(value)))

    def _done(self, key, data):
        if key == "connect":
            self.online = True
            self.real_engine_status = dict(data)
            model = bool(data.get("model_connected"))
            native = data.get("native_evidence_answering") == "AVAILABLE_NO_EXTERNAL_WEIGHTS"
            # An answering private HTTP service does NOT prove new JREI
            # source is installed or that neural language weights exist.
            # Show the engine's own pinned build receipt, not the EXE version.
            active_sha = data.get("windows_app_source_commit")
            valid_sha = isinstance(active_sha, str) and bool(
                re.fullmatch(r"[a-f0-9]{40}", active_sha))
            version_label = (f" · موتور {active_sha[:8]}"
                             if valid_sha else " · نسخهٔ موتور تأییدنشده")
            label = ("مدل زبانیِ پیکربندی‌شده متصل است" if model else
                     "هستهٔ شواهد موجود است؛ مدل عصبی آماده نیست" if native else
                     "موتور قدیمی/نامشخص؛ مدل زبانی آماده نیست")
            self.status_text.set(label + version_label)
            self.fetch("threads", lambda: self.api.request("/api/conversations"))
        elif key == "threads":
            self.threads = data.get("items", [])[:100]
            self._render_threads()
            if self.conversation is None and self.threads:
                self.conversation = self.threads[0].get("id")
                self.fetch("thread", lambda: self.api.request(
                    "/api/conversation?id=" + self.conversation))
        elif key == "new":
            self.conversation = data.get("id")
            self.messages = []
            self._empty()
            self.fetch("threads", lambda: self.api.request("/api/conversations"))
            self.editor.focus_set()
        elif key == "thread":
            if data.get("id") == self.conversation:
                self.messages = data.get("items", [])[:300]
                self._render_messages()
                cid = self.conversation
                self.fetch("task_list", lambda: {
                    "conversation_id": cid,
                    "items": self.api.request(
                        "/api/tasks?conversation_id=" + cid)["items"]})
        elif key == "task_list":
            if data.get("conversation_id") != self.conversation:
                return
            if self.active_job is None:
                for item in data.get("items", [])[:50]:
                    if item.get("status") in (
                            "QUEUED", "RUNNING", "CANCEL_REQUESTED"):
                        p = item.get("progress") or {}
                        self.active_job = {
                            "id": item["id"],
                            "phase": PHASE.get(
                                p.get("phase"),
                                PHASE.get(item["status"], "در حال پردازش"))
                        }
                        self._render_messages()
                        break
        elif key == "sent":
            self.busy_send = False
            self.send_button.configure(state="normal")
            self.last_draft = None
            # A brand-new conversation is created by the backend before
            # submission and becomes selected only on the Tk/UI thread.
            returned = data.get("conversation_id")
            if self.conversation is None and isinstance(returned, str):
                if IDENT.fullmatch(returned):
                    self.conversation = returned
            self.active_job = {"id": data["id"], "phase": PHASE["QUEUED"]}
            self._render_messages()
            self.fetch("threads", lambda: self.api.request("/api/conversations"))
        elif key == "job":
            self.poll_in_flight = False
            if not self.active_job or self.active_job["id"] != data.get("id"):
                return
            status = str(data.get("status", "QUEUED"))
            if status in FINAL:
                self.active_job = None
                if status not in ("SUCCEEDED", "SUCCEEDED_AFTER_CANCEL_REQUEST"):
                    self.status_text.set(PHASE.get(status, status) +
                                         ": " + str(data.get("error_code") or "")[:80])
                current = self.conversation
                self.fetch("thread", lambda: self.api.request(
                    "/api/conversation?id=" + current))
                self.fetch("threads", lambda: self.api.request("/api/conversations"))
            else:
                # The ORIGINAL owner_tasks API reports a single verified
                # progress object {phase, updated}, not a list of steps.
                # Never invent or simulate phase transitions in the UI.
                checkpoint = data.get("progress")
                phase = (checkpoint.get("phase") if isinstance(checkpoint, dict)
                         else None) or status
                self.active_job["phase"] = PHASE.get(
                    phase, PHASE.get(status, str(phase)[:45]))
                self._render_messages()
        elif key == "attachment":
            if "id" in data:
                self.attachments.append(data["id"])
                self.attach_view.set(f"پیوست‌های انتخاب‌شده: {len(self.attachments)} از ۲")
        elif key == "cancel":
            self.status_text.set("درخواست لغو ثبت شد؛ عملیات جاری ممکن است به پایان برسد.")
        elif key == "service":
            self.status_text.set("درخواست اجرای سرویس موجود JREI ثبت شد.")
            self.root.after(1400, self.refresh)
        elif key == "approvals":
            if (self.approval_dialog is None or
                    not self.approval_dialog.winfo_exists() or
                    data.get("conversation_id") != self.conversation):
                return
            self.approval_context = self.conversation
            self.approval_items = [
                item for item in data.get("items", [])[:12]
                if isinstance(item, dict) and
                re.fullmatch(r"[A-Za-z0-9_-]{24,60}", str(item.get("id", "")))
                and item.get("tool") in (
                    "edit_local", "generate_project", "rollback_local")
            ]
            self._show_approvals()
        elif key == "draft_diff":
            self._display_local_diff(data)
        elif key == "draft_bundle":
            self._display_local_bundle(data)
        elif key == "hardware_inventory":
            self._display_local_hardware(data)
        elif key == "approval_result":
            self.approval_busy = False
            state = str(data.get("state", "UNKNOWN"))[:100]
            self.status_text.set("نتیجهٔ تأیید: " + state)
            if self.approval_dialog is not None and self.approval_dialog.winfo_exists():
                messagebox.showinfo(
                    "JREI · نتیجهٔ عملیات", "وضعیت: " + state +
                    "\nفقط محیط خصوصی توسعه؛ هیچ انتشار سایتی انجام نشده است.",
                    parent=self.approval_dialog)
                self._load_approvals()
            if state == "LOCAL_CODE_WRITTEN_UNTESTED":
                # This is a post-edit, pre-GitHub review of the exact private
                # draft. It never grants consent to push/deploy or run code.
                try:
                    receipt = json.loads(
                        (data.get("tool") or {}).get("receipt") or "{}")
                    draft_id = receipt.get("id")
                    if isinstance(draft_id, str) and re.fullmatch(
                            r"\d{8}T\d{6}Z-[a-f0-9]{12}", draft_id):
                        self.fetch("draft_diff", lambda rid=draft_id:
                            self.api.request("/api/workspace/diff?id=" + rid))
                except (TypeError, ValueError, json.JSONDecodeError):
                    self.status_text.set(
                        "پیش‌نویس ذخیره شد؛ رسید بازبینی قابل استخراج نبود.")
            if self.conversation:
                cid = self.conversation
                self.fetch("thread", lambda: self.api.request(
                    "/api/conversation?id=" + cid))

    def _error(self, key, error):
        self.status_text.set(str(error)[:170])
        if key == "connect":
            self.online = False
        if key == "sent":
            self.busy_send = False
            self.send_button.configure(state="normal")
            # The request might have reached the backend before a socket
            # timeout. Never silently auto-resend and risk duplicate work.
            # Preserve the owner's typed draft and document references.
            if self.last_draft is not None:
                if not self.editor.get("1.0", "end-1c").strip():
                    self.editor.insert("1.0", self.last_draft["text"])
                self.attachments = self.last_draft["attachments"]
                self.attach_view.set(
                    f"پیوست‌های انتخاب‌شده: {len(self.attachments)} از ۲")
            messagebox.showerror(
                "JREI · وضعیت ارسال نامشخص",
                "پاسخ ارسال دریافت نشد. متن و پیوست‌ها حفظ شدند. "
                "پیش از ارسال دوباره، تاریخچه را بازخوانی کنید؛ "
                "ممکن است درخواست اول در موتور ثبت شده باشد.\n\n" +
                str(error)[:300], parent=self.root)
        if key == "attachment":
            messagebox.showerror("JREI · فایل", str(error)[:500], parent=self.root)
        if key == "draft_diff":
            messagebox.showerror(
                "JREI · بازبینی کد",
                "رسید یا فایل پیش‌نویس معتبر نیست، یا محتوا پس از ایجاد تغییر کرده است.\n"
                + str(error)[:220], parent=self.root)
        if key == "draft_bundle":
            messagebox.showerror(
                "JREI · بستهٔ بازبینی",
                "رسیدهای این بسته معتبر نیستند، تغییر کرده‌اند یا حجم Diff مجاز نیست.\n"
                + str(error)[:160], parent=self.root)
        if key == "job":
            self.poll_in_flight = False
        if key == "approval_result":
            self.approval_busy = False
        if key == "approvals" and self.approval_dialog is not None:
            if self.approval_dialog.winfo_exists():
                self.approval_status.set("درخواست‌ها دریافت نشد: " + str(error)[:100])

    def _bootstrap(self):
        return self.api.request("/api/status")

    def fetch(self, name, fn):
        def worker():
            try:
                answer = fn()
                self.ui_queue.put((name, answer, None))
            except (OSError, RuntimeError, ValueError, TypeError) as exc:
                self.ui_queue.put((name, None, exc))
        threading.Thread(target=worker, name="jrei-private-request", daemon=True).start()

    def _drain(self):
        for _ in range(30):
            try:
                name, data, error = self.ui_queue.get_nowait()
            except queue.Empty:
                break
            if error:
                self._error(name, error)
            else:
                self._done(name, data)
        self.root.after(110, self._drain)

    def _start_poll(self):
        # Never overlap 12-second HTTP requests during a long mission.
        if self.active_job and not self.busy_send and not self.poll_in_flight:
            self.poll_in_flight = True
            ident = self.active_job["id"]
            self.fetch("job", lambda: self.api.request("/api/task?id=" + ident))
        self.root.after(1800, self._start_poll)

    def refresh(self):
        self.fetch("connect", self._bootstrap)
        if self.conversation:
            current = self.conversation
            self.fetch("thread", lambda: self.api.request(
                "/api/conversation?id=" + current))

    def new_chat(self):
        if self.active_job:
            if not messagebox.askyesno("JREI", "وظیفهٔ قبلی هنوز در حال اجراست. گفتگوی تازه باز شود؟",
                                       parent=self.root):
                return
        self.active_job = None
        self.conversation = None
        self.attachments.clear()
        self.attach_view.set("")
        self.fetch("new", lambda: self.api.request("/api/conversation/new", {}))

    def _on_return(self, event):
        if event.state & 0x0001:  # Shift+Enter: newline.
            return None
        self.send()
        return "break"

    def send(self):
        text = self.editor.get("1.0", "end-1c").strip()
        if not text or self.busy_send or self.active_job:
            return
        if len(text) > 9000:
            messagebox.showwarning("JREI", "پیام باید حداکثر ۹۰۰۰ نویسه باشد.", parent=self.root)
            return
        self.busy_send = True
        self.send_button.configure(state="disabled")
        snapshot = list(self.attachments)
        self.last_draft = {"text": text, "attachments": snapshot}
        self.attachments.clear()
        self.attach_view.set("")
        self.editor.delete("1.0", "end")
        self.messages.append({"role": "user", "content": text})
        self._render_messages()
        def submit():
            conversation = self.conversation
            if not conversation:
                response = self.api.request("/api/conversation/new", {})
                conversation = response["id"]
            result = self.api.request("/api/task/submit", {
                "conversation_id": conversation, "message": text,
                "attachments": snapshot})
            return {"id": result["id"], "conversation_id": conversation,
                    "status": result.get("status", "QUEUED")}
        self.fetch("sent", submit)


    def _prefill(self, prompt: str):
        """Explicit user click populates a draft; no silent task execution."""
        if self.busy_send:
            return
        if self.editor.get("1.0", "end-1c").strip():
            if not messagebox.askyesno(
                    "JREI", "متن فعلی را با پیشنهاد جدید جایگزین کنید؟",
                    parent=self.root):
                return
        self.editor.delete("1.0", "end")
        self.editor.insert("1.0", prompt)
        self.editor.focus_set()

    def show_engine_status(self):
        """Only report source-backed, locally observed capabilities."""
        data = self.real_engine_status
        if not isinstance(data, dict):
            messagebox.showinfo(
                "JREI · وضعیت موتور",
                "هنوز پاسخ معتبری از موتور محلی ثبت نشده است. "
                "روی «بازخوانی» بزنید.", parent=self.root)
            return
        digest = data.get("windows_app_source_commit")
        version = (digest[:12] if isinstance(digest, str) and
                   re.fullmatch(r"[a-f0-9]{40}", digest)
                   else "بدون شناسهٔ نسخهٔ تأییدشده")
        native = data.get("native_neural_training") or {}
        if not isinstance(native, dict):
            native = {}
        learning = data.get("continuous_learning") or {}
        if not isinstance(learning, dict):
            learning = {}
        metacognition = data.get("native_metacognition") or {}
        if not isinstance(metacognition, dict):
            metacognition = {}
        study_window = data.get("tehran_study_priority") or {}
        if not isinstance(study_window, dict):
            study_window = {}
        res = data.get("local_pc_real_resources") or {}
        if not isinstance(res, dict):
            res = {}
        resource_state = res.get("resources") or {}
        if not isinstance(resource_state, dict):
            resource_state = {}
        information = [
            "بررسی واقعی و بدون نصب / آموزش / انتشار",
            "",
            "نسخهٔ موتور خصوصی: " + version,
            "مدل زبانی خارجی/پیکربندی‌شده متصل: " +
                ("بله، اما نه الزاماً مدل اختصاصی" if
                 data.get("model_connected") else "خیر"),
            "مدل عصبیِ ساخته‌شده توسط JREI: " +
                str(native.get("state") or "تأیید نشده"),
            "مرحلهٔ ثبت‌شدهٔ مدل آزمایشی: " +
                str(native.get("lifecycle") or "UNKNOWN_UNVERIFIED"),
            "SHA256 ثبت‌شدهٔ checkpoint: " +
                str(native.get("registered_checkpoint_sha256") or "موجود نیست"),
            "صحت فعلی فایل checkpoint: " +
                ("بررسی نشده" if native.get("checkpoint_integrity_verified_now") is False
                 else "بدون دادهٔ معتبر"),
            "آموزش مدل زبانی اختصاصی: " +
                str(data.get("native_language_model_training", "تأیید نشده")),
            "موتور شواهد: " +
                str(data.get("native_evidence_answering", "نامشخص")),
            "یادگیری پیوسته (وضعیت ثبت‌شده): " +
                str(learning.get("state") or learning.get("enabled") or "نامشخص"),
            "شکاف‌های دانشی مشاهده‌شده (هش خصوصی): " +
                str(learning.get("observed_gap_hashes", "نامشخص")),
            "موضوعات یادگیری با سابقهٔ دو چرخه: " +
                str(metacognition.get("topics_with_two_recent_cycles", "نامشخص")),
            "افزایش پوشش واژگانی مشاهده‌شده (نه کیفیت مدل): " +
                str(metacognition.get("observed_coverage_increase", "نامشخص")),
            "منابع بررسی‌شدهٔ آمادهٔ بازخوانی: " +
                str(metacognition.get("approved_sources_currently_due_for_refresh", "نامشخص")),
            "اولویت پردازش ۲–۵ بامداد تهران: " +
                ("فعال" if study_window.get("priority_active") is True
                 else "غیرفعال یا نامشخص"),
            "این بازه مجوز خزش، آموزش یا مصرف منابع اضافی نمی‌دهد.",
            "RAM آزاد اندازه‌گیری‌شده: " +
                str(resource_state.get("free_ram_mb", "نامشخص")) + " MB",
            "پردازش GPU آموزش‌دیده: تأیید نشده",
            "",
            "این‌ها فقط وضعیت‌های اعلام‌شده توسط همان موتور محلی‌اند؛ "
            "نه گواه توانایی معادل ChatGPT.",
        ]
        dialog = tk.Toplevel(self.root)
        dialog.title("JREI | وضعیت مغز و یادگیری")
        dialog.geometry("610x450")
        dialog.configure(bg=BG)
        dialog.transient(self.root)
        self._label(dialog, "مغز و یادگیری JREI", bg=BG,
                    fg=GOLD, bold=True, size=15).pack(
                        fill="x", padx=16, pady=(18, 6))
        reading = tk.Text(dialog, bg=SURFACE, fg=FG,
                          insertbackground=GOLD, font=self._font(11),
                          wrap="word", relief="flat",
                          padx=16, pady=14)
        reading.pack(fill="both", expand=True, padx=16, pady=8)
        reading.tag_configure("rtl", justify="right")
        reading.insert("1.0", "\n".join(information))
        reading.tag_add("rtl", "1.0", "end")
        reading.configure(state="disabled")
        self._button(dialog, "بستن", dialog.destroy).pack(
            side="right", padx=16, pady=(0, 14))

    def show_approvals(self):
        """Owner-only confirmation UX for ORIGINAL one-time 10-min actions."""
        if self.approval_dialog is not None and self.approval_dialog.winfo_exists():
            self.approval_dialog.lift()
            self._load_approvals()
            return
        if not self.conversation or not IDENT.fullmatch(self.conversation):
            messagebox.showinfo("JREI", "ابتدا گفتگو را انتخاب کنید.",
                                parent=self.root)
            return
        dlg = tk.Toplevel(self.root)
        dlg.title("JREI | بررسی عملیات خصوصی")
        dlg.geometry("720x400")
        dlg.minsize(520, 320)
        dlg.configure(bg=BG)
        dlg.transient(self.root)
        self.approval_dialog = dlg
        self.approval_status = tk.StringVar(value="در حال دریافت درخواست‌ها…")
        self._label(dlg, "تأیید یک‌بارهٔ تغییرات ایزوله", bg=BG, fg=GOLD,
                    size=15, bold=True).pack(fill="x", padx=18, pady=(14, 4))
        self._label(dlg, "تأیید فقط برای محیط توسعه است؛ نه GitHub یا سایت.",
                    bg=BG, fg=MUTED).pack(fill="x", padx=18)
        tk.Label(dlg, textvariable=self.approval_status, bg=BG, fg=MUTED,
                 font=self._font(9)).pack(fill="x", padx=18, pady=8)
        self.approval_list = tk.Listbox(
            dlg, bg=SURFACE, fg=FG, selectbackground="#59462c",
            font=self._font(10), activestyle="none", relief="flat",
            highlightthickness=1, highlightbackground=LINE)
        self.approval_list.pack(fill="both", expand=True, padx=18, pady=5)
        self.approval_list.bind("<<ListboxSelect>>", self._approval_selected)
        controls = tk.Frame(dlg, bg=BG)
        controls.pack(fill="x", padx=18, pady=14)
        self._button(controls, "بازخوانی", self._load_approvals).pack(side="left")
        self._button(controls, "نمایش Diff پیش‌نویس", self.show_local_diff,
                     foreground=GOLD).pack(side="left", padx=8)
        self._button(controls, "بازبینی بستهٔ چندفایلی", self.show_local_bundle,
                     foreground=GOLD).pack(side="left", padx=8)
        self._button(controls, "بستن", dlg.destroy).pack(side="right")
        self._button(controls, "تأیید عملیات انتخاب‌شده",
                     self._confirm_selected, color=GOLD,
                     foreground=BG).pack(side="right", padx=8)
        self._load_approvals()

    def _load_approvals(self):
        dlg = self.approval_dialog
        if dlg is None or not dlg.winfo_exists():
            return
        cid = self.conversation
        if not cid or not IDENT.fullmatch(cid):
            self.approval_status.set("شناسهٔ گفتگو معتبر نیست.")
            return
        self.approval_items = []
        self.approval_list.delete(0, "end")
        self.approval_status.set("در حال دریافت تأییدها از موتور JREI…")
        self.fetch("approvals", lambda: {
            "conversation_id": cid,
            "items": self.api.request(
                "/api/approvals?conversation_id=" + cid)["items"]})

    def _show_approvals(self):
        names = {
            "edit_local": "ویرایش کد خصوصی",
            "generate_project": "ساخت پروژهٔ خصوصی",
            "rollback_local": "بازگردانی پیش‌نویس"
        }
        self.approval_list.delete(0, "end")
        self.approval_status.set(
            f"{len(self.approval_items)} درخواست؛ اعتبار هر درخواست حداکثر ۱۰ دقیقه")
        for item in self.approval_items:
            self.approval_list.insert(
                "end", names.get(item["tool"], item["tool"]) +
                " | " + str(item.get("target", ""))[:110])
        if not self.approval_items:
            self.approval_list.insert("end", "درخواست تأیید فعالی وجود ندارد.")

    def _approval_selected(self, _event=None):
        selected = self.approval_list.curselection()
        if selected and selected[0] < len(self.approval_items):
            self.approval_status.set(
                "مقصد: " + str(self.approval_items[selected[0]]
                                .get("target", ""))[:150])

    def _confirm_selected(self):
        if self.approval_busy or self.approval_context != self.conversation:
            return
        selected = self.approval_list.curselection()
        if not selected or selected[0] >= len(self.approval_items):
            self.approval_status.set("یک درخواست فعال انتخاب کنید.")
            return
        item = self.approval_items[selected[0]]
        cid, action_id = self.conversation, item["id"]
        if (not IDENT.fullmatch(cid) or
                not re.fullmatch(r"[A-Za-z0-9_-]{24,60}", action_id)):
            return
        warning = (
            "آیا این تغییر را بررسی و تأیید می‌کنید؟\n\n" +
            "نوع: " + item["tool"] + "\n" +
            "مقصد: " + str(item.get("target", ""))[:110] + "\n\n" +
            "این تأیید اجازهٔ اجرای کد، انتشار سایت، یا Push به GitHub نمی‌دهد.")
        if not messagebox.askyesno("JREI · تأیید مالک", warning,
                                   icon="warning", parent=self.approval_dialog):
            return
        self.approval_busy = True
        self.approval_status.set("در حال ارسال تأیید یک‌باره…")
        self.fetch("approval_result", lambda: self.api.request(
            "/api/assistant/confirm",
            {"confirm": True, "conversation_id": cid,
             "action_id": action_id}))

    def show_local_hardware(self):
        """Owner-initiated, read-only inventory for this Windows PC ONLY."""
        if not self.online:
            messagebox.showinfo(
                "JREI · منابع سخت‌افزاری",
                "موتور خصوصی این رایانه متصل نیست. دادهٔ دستگاه دیگر حدس زده نمی‌شود.",
                parent=self.root)
            return
        self.status_text.set("در حال خواندن مشخصات واقعی این رایانه…")
        self.fetch("hardware_inventory", lambda: self.api.request(
            "/api/resources/inventory"))

    def _display_local_hardware(self, data):
        if (not isinstance(data, dict)
                or data.get("schema") != "jr.jrei.owner-local-hardware-inventory.v1"
                or data.get("remote_node_observed") is not False
                or data.get("cross_pc_vram_pooled") is not False):
            self.status_text.set("نتیجهٔ سخت‌افزار معتبر نیست.")
            return
        local = data.get("local_node") or {}
        if not isinstance(local, dict):
            self.status_text.set("پاسخ منابع ناقص است.")
            return
        gpu = local.get("gpu_compute") or {}
        resources = local.get("resources") or {}
        if not isinstance(gpu, dict) or not isinstance(resources, dict):
            self.status_text.set("پاسخ منابع ناقص است.")
            return
        info = [
            "این گزارش فقط از همین رایانه است؛ اطلاعات رایانهٔ دوم دریافت نشده.",
            "زمان مشاهده (Unix UTC): " + str(local.get("observation_epoch_seconds", "نامشخص")),
            "RAM فیزیکی (MB): " + str(resources.get("physical_ram_mb", "نامشخص")),
            "RAM آزاد (MB): " + str(resources.get("free_ram_mb", "نامشخص")),
            "CPU load: " + str(resources.get("cpu_fraction", "نامشخص")),
            "آخرین فعالیت مالک (ثانیه): " + str(local.get("owner_idle_seconds", "نامشخص")),
            "",
            "GPU probe: " + str(gpu.get("status", "نامشخص")),
            "نام GPU محلی: " + str(gpu.get("device_name") or "اندازه‌گیری نشده"),
            "Backend: " + str(gpu.get("backend") or "نامشخص"),
            "تعداد CUDA device: " + str(gpu.get("device_count", "نامشخص")),
            "VRAM کل/آزاد (MB): " + str(gpu.get("total_memory_mb", "نامشخص"))
              + " / " + str(gpu.get("free_memory_mb", "نامشخص")),
            "Driver version: " + str(gpu.get("driver_version") or "اندازه‌گیری نشده"),
            "آموزش مدل آغاز شده: خیر",
            "تجمیع VRAM دو رایانه: خیر",
            "",
            "عدم دسترسی به CUDA لزوماً نبود GPU را اثبات نمی‌کند.",
            "AMD/Vulkan/DirectML به بررسی مستقل در پذیرش نهایی نیاز دارند.",
        ]
        window = tk.Toplevel(self.root)
        window.title("JREI | منابع واقعی این رایانه")
        window.geometry("670x600")
        window.minsize(500, 360)
        window.configure(bg=BG)
        window.transient(self.root)
        self._label(window, "مشاهدات محلی CPU / RAM / GPU", bg=BG,
                    fg=GOLD, size=14, bold=True).pack(
                        fill="x", padx=18, pady=(18, 8))
        view = tk.Text(window, bg=SURFACE, fg=FG, wrap="word",
                       font=self._font(10), padx=15, pady=12)
        view.pack(fill="both", expand=True, padx=18, pady=(0, 10))
        view.insert("1.0", "\n".join(info))
        view.configure(state="disabled")
        self._button(window, "بستن", window.destroy).pack(
            side="right", padx=18, pady=(0, 14))
        self.status_text.set("مشاهدات همین رایانه دریافت شد؛ GPU دوم نامشخص است.")

    def show_local_bundle(self):
        """Review existing owner-approved isolated drafts as ONE read-only list."""
        value = simpledialog.askstring(
            "JREI · بازبینی چندفایلی",
            "شناسه‌های ۲ تا ۵ رسید ویرایش محلی را با کاما جدا کنید:",
            parent=self.root)
        if value is None:
            return
        ids = [part.strip() for part in value.split(",")]
        if (len(value) > 220 or not 2 <= len(ids) <= 5
                or len(set(ids)) != len(ids)
                or any(not re.fullmatch(
                    r"\d{8}T\d{6}Z-[a-f0-9]{12}", item) for item in ids)):
            messagebox.showwarning(
                "JREI", "فقط ۲ تا ۵ شناسهٔ یکتا و معتبر مجاز است.",
                parent=self.root)
            return
        query = urllib.parse.quote(",".join(ids), safe=",")
        self.fetch("draft_bundle", lambda: self.api.request(
            "/api/workspace/bundle?ids=" + query))

    def _display_local_bundle(self, data):
        """No local edit, merge, build, test or GitHub write from this view."""
        if (not isinstance(data, dict)
                or data.get("schema") != "jr.jrei.workspace-multi-file-review.v1"
                or data.get("state") != "LOCAL_MULTI_FILE_REVIEW_ONLY"
                or data.get("github_pushed") is not False
                or data.get("production_changed") is not False
                or data.get("multi_file_atomic_write_performed") is not False):
            self.status_text.set("بستهٔ بازبینی معتبر نیست.")
            return
        files = data.get("files")
        count = data.get("file_count")
        if (not isinstance(files, list) or not isinstance(count, int)
                or not 2 <= count <= 5 or len(files) != count
                or not re.fullmatch(
                    r"[a-f0-9]{64}", str(data.get("bundle_manifest_sha256", "")))):
            self.status_text.set("بستهٔ بازبینی ناقص است.")
            return
        patch = data.get("diff")
        if not isinstance(patch, str) or not patch or len(patch) > 36000:
            self.status_text.set("Diff بسته فراتر از ظرفیت بازبینی است.")
            return
        window = tk.Toplevel(self.root)
        window.title("JREI | بررسی گروهی پیش‌نویس‌ها؛ فقط خواندنی")
        window.geometry("930x690")
        window.minsize(610, 390)
        window.configure(bg=BG)
        window.transient(self.root)
        self._label(window, "بستهٔ بازبینی چند فایل", fg=GOLD, bg=BG,
                    bold=True, size=14).pack(fill="x", padx=16, pady=(14, 5))
        entries = [
            str(item.get("target", ""))[:105] +
            " | " + str(item.get("receipt_id", ""))[:40]
            for item in files if isinstance(item, dict)]
        summary = (
            "تعداد فایل‌ها: " + str(count) +
            "\nاثر انگشت بسته: " + str(data["bundle_manifest_sha256"]) +
            "\n" + "\n".join(entries) +
            "\nاین صفحه تنها گردآوریِ رسیدهای پیش‌نویس قبلاً تأییدشده است."
            "\nهیچ اعمال اتمیک چندفایلی، تست، Push یا انتشار انجام نشده است.")
        self._label(window, summary, bg=BG, fg=MUTED, size=9,
                    justify="left", anchor="w").pack(
                        fill="x", padx=16, pady=(0, 8))
        body = tk.Frame(window, bg=BG)
        body.pack(fill="both", expand=True, padx=16, pady=4)
        scroll = ttk.Scrollbar(body, orient="vertical")
        reading = tk.Text(body, bg=SURFACE, fg=FG, font=self._font(10),
                          wrap="none", relief="flat",
                          padx=12, pady=10, yscrollcommand=scroll.set)
        scroll.configure(command=reading.yview)
        scroll.pack(side="right", fill="y")
        reading.pack(side="left", fill="both", expand=True)
        reading.insert("1.0", patch)
        reading.configure(state="disabled")
        controls = tk.Frame(window, bg=BG)
        controls.pack(fill="x", padx=16, pady=(4, 14))
        self._button(controls, "کپی Diffها", lambda: self._copy(patch),
                     foreground=GOLD).pack(side="left")
        self._button(controls, "بستن", window.destroy).pack(side="right")

    def show_local_diff(self):
        """Read-only review of an owner-private receipt; no patch execution."""
        value = simpledialog.askstring(
            "JREI · بررسی کد", "شناسهٔ رسید ویرایش محلی را وارد کنید:",
            parent=self.root)
        if value is None:
            return
        receipt = value.strip()
        if not re.fullmatch(r"\d{8}T\d{6}Z-[a-f0-9]{12}", receipt):
            messagebox.showwarning(
                "JREI", "شناسهٔ رسید ویرایش معتبر نیست.", parent=self.root)
            return
        self.fetch("draft_diff", lambda: self.api.request(
            "/api/workspace/diff?id=" + receipt))

    def _display_local_diff(self, data):
        """Show only authenticated, hash-verified source text; never run it."""
        if (not isinstance(data, dict)
                or data.get("schema") != "jr.jrei.workspace-diff-review.v1"
                or data.get("state") != "LOCAL_DRAFT_UNTESTED_REVIEW_ONLY"
                or data.get("production_changed") is not False
                or data.get("github_pushed") is not False):
            self.status_text.set("پاسخ رسید بازبینی کد معتبر نیست.")
            return
        receipt = str(data.get("receipt_id", ""))
        content = str(data.get("diff", ""))[:18000]
        if not content or not re.fullmatch(
                r"\d{8}T\d{6}Z-[a-f0-9]{12}", receipt):
            self.status_text.set("Diff تأییدشده‌ای برای نمایش موجود نیست.")
            return
        window = tk.Toplevel(self.root)
        window.title("JREI | بازبینی پیش‌نویس، بدون اجرا یا انتشار")
        window.geometry("900x630")
        window.minsize(600, 370)
        window.configure(bg=BG)
        window.transient(self.root)
        self._label(window, "بازبینی تغییرات کد در فضای خصوصی", fg=GOLD,
                    bg=BG, bold=True, size=14).pack(
                        fill="x", padx=16, pady=(14, 5))
        metadata = ("فایل: " + str(data.get("target", ""))[:180]
                    + "\nرسید: " + receipt
                    + "\nSHA پیشین: " + str(data.get("before_sha256", ""))
                    + "\nSHA جدید: " + str(data.get("after_sha256", ""))
                    + "\nصرفاً پیش‌نویس؛ تست، Push، اجرای کد و انتشار انجام نشده.")
        self._label(window, metadata, bg=BG, fg=MUTED, size=9,
                    justify="left", anchor="w").pack(
                        fill="x", padx=16, pady=(0, 8))
        body = tk.Frame(window, bg=BG)
        body.pack(fill="both", expand=True, padx=16, pady=4)
        scroll = ttk.Scrollbar(body, orient="vertical")
        reading = tk.Text(body, bg=SURFACE, fg=FG, font=self._font(10),
                          wrap="none", relief="flat",
                          padx=12, pady=10, yscrollcommand=scroll.set)
        scroll.configure(command=reading.yview)
        scroll.pack(side="right", fill="y")
        reading.pack(side="left", fill="both", expand=True)
        reading.insert("1.0", content)
        reading.configure(state="disabled")
        buttons = tk.Frame(window, bg=BG)
        buttons.pack(fill="x", padx=16, pady=(4, 14))
        self._button(buttons, "کپی Diff", lambda: self._copy(content),
                     foreground=GOLD).pack(side="left")
        self._button(buttons, "بستن", window.destroy).pack(side="right")

    def start_existing_engine(self):
        """Only request the ORIGINAL owner Scheduled Task, never install/replace it."""
        if sys.platform != "win32":
            self.status_text.set("راه‌اندازی موتور فقط در ویندوز پشتیبانی می‌شود.")
            return
        if not messagebox.askyesno(
            "JREI", "سرویس خصوصی JREI که قبلاً روی همین ویندوز ثبت شده، اجرا شود؟ "
                    "هیچ برنامه یا مدل تازه‌ای نصب نمی‌شود.", parent=self.root):
            return
        def invoke():
            # Delegate validation to the existing JREI owner-only task
            # controller, never run an arbitrary or replaced scheduled task.
            script = (Path(os.environ.get("LOCALAPPDATA", str(Path.home())))
                / "JREI-Python" / "repo" / "platform" / "jrei-v5"
                / "windows-worker" / "jrei-command-center-startup.ps1")
            if not script.is_file() or script.is_symlink():
                raise RuntimeError("کنترل‌کنندهٔ امن موتور JREI در این رایانه یافت نشد.")
            controller = os.path.join(
                os.environ.get("SystemRoot", r"C:\Windows"), "System32",
                "WindowsPowerShell", "v1.0", "powershell.exe")
            completed = subprocess.run(
                [controller, "-NoProfile", "-NonInteractive", "-ExecutionPolicy",
                 "Bypass", "-File", str(script), "-Mode", "Start"],
                shell=False, stdin=subprocess.DEVNULL,
                capture_output=True, timeout=35, check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            if completed.returncode != 0:
                raise RuntimeError(
                    "سرویس ثبت‌شدهٔ JREI قابل اجرا نیست. نصب و پذیرش موتور "
                    "اصلی ویندوز باید جداگانه تکمیل شود.")
            return {"state": "EXISTING_JREI_TASK_START_REQUESTED"}
        self.fetch("service", invoke)

    def cancel_job(self):
        if not self.active_job:
            self.status_text.set("وظیفهٔ در حال اجرا وجود ندارد.")
            return
        if messagebox.askyesno("JREI", "لغو وظیفهٔ در حال اجرا درخواست شود؟", parent=self.root):
            ident = self.active_job["id"]
            self.fetch("cancel", lambda: self.api.request("/api/task/cancel", {"id": ident}))

    def select_file(self):
        if len(self.attachments) >= 2:
            messagebox.showinfo("JREI", "حداکثر دو پیوست برای هر پیام.", parent=self.root)
            return
        path = filedialog.askopenfilename(parent=self.root,
            filetypes=[("JREI documents", "*.txt *.md *.csv *.json *.py *.js *.mjs *.css *.html *.docx *.pdf *.pptx *.xlsx"),
                       ("All files", "*.*")])
        if not path:
            return
        doc = Path(path)
        if (doc.suffix.lower() not in FILES or not doc.is_file()
                or doc.stat().st_size > 4_000_000):
            messagebox.showwarning("JREI", "نوع فایل مجاز نیست یا اندازه از ۴ مگابایت بیشتر است.",
                                   parent=self.root)
            return
        self.status_text.set("در حال افزودن سند به مخزن خصوصی…")
        def upload():
            raw = doc.read_bytes()
            return self.api.request("/api/documents/import", {
                "name": doc.name, "data": base64.b64encode(raw).decode("ascii")})
        self.fetch("attachment", upload)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    Desktop().run()
