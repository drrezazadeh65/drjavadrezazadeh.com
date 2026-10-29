"""Native GUI access to existing JREI 8092 abilities, not a parallel engine.

Every read and owner action goes through the original authenticated local API.
No source unreviewed execute/promotion, model installation, new storage, cloud
submission, site publication or unconsented training takes place here.
"""
from __future__ import annotations

from io import BytesIO
import json
import re
import tkinter as tk
from tkinter import messagebox, simpledialog
from urllib.parse import quote


class FeatureHubMixin:
    """Methods mixed into the ORIGINAL JREI desktop class."""

    def open_capability_center(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("JREI | مرکز قابلیت‌های یکپارچه")
        dlg.geometry("710x660")
        dlg.minsize(560, 510)
        dlg.configure(bg="#111319")
        dlg.transient(self.root)
        self._label(dlg, "مرکز قابلیت‌های JREI",
                    fg="#d7b577", bg="#111319",
                    bold=True, size=16).pack(pady=(17, 7))
        self._label(dlg,
            "همهٔ بخش‌ها به موتور خصوصی ۸۰۹۲ و حافظهٔ موجود متصل‌اند.",
            fg="#a7abb4", bg="#111319").pack(pady=(0, 10))
        endpoints = (
            ("تحقیق متن‌باز و مطالعهٔ چندمخزنی",
             "/api/open-source/multiforge"),
            ("مطالعهٔ سورس‌های عمومی با شناسهٔ ثابت",
             "/api/open-source/studies"),
            ("پژوهش مستمر و خلأهای فنی",
             "/api/open-source/mission"),
            ("یادگیری مستمر و شواهد آموزشی",
             "/api/learning"),
            ("حافظهٔ مستند JREI",
             "/api/learning/memory"),
            ("پیشرفت خودتوسعه و اصلاح کد",
             "/api/open-source/improvement-progress"),
            ("تجربه و بازخورد کدنویسی",
             "/api/code-experience"),
            ("بازبینی مستقل کدهای پیشنهادی",
             "/api/open-source/static-reviews"),
            ("مدل اختصاصی و وضعیت واقعی موتور",
             "/api/status"),
        )
        for title, endpoint in endpoints:
            self._button(dlg, title,
                lambda t=title, p=endpoint: self._feature_report(t, p),
                color="#20242c").pack(fill="x", padx=28, pady=2)
        actions = tk.Frame(dlg, bg="#111319")
        actions.pack(fill="x", padx=18, pady=(13, 6))
        self._button(actions, "استودیو تصویرسازی",
                     self.open_image_studio, color="#423624",
                     foreground="#d7b577").pack(side="right", padx=4)
        self._button(actions, "جستجوی متن‌باز",
                     self.open_live_oss_search, color="#423624",
                     foreground="#d7b577").pack(side="right", padx=4)
        self._button(actions, "پیشنویس کد",
                     self._prefill_code_request, color="#423624",
                     foreground="#d7b577").pack(side="left", padx=4)
        self._label(dlg,
            "کد پژوهش‌شده یا تصویر تولیدشده هرگز خودکار منتشر نمی‌شود.",
            fg="#a7abb4", bg="#111319").pack(pady=(0, 6))
        self._button(dlg, "بستن", dlg.destroy).pack(side="right",
                                                    padx=22, pady=(0, 15))

    def _feature_report(self, title: str, path: str):
        if not self.online:
            messagebox.showwarning(
                "JREI", "موتور خصوصی ۸۰۹۲ هنوز احراز نشده است.",
                parent=self.root)
            return
        self.status_text.set("در حال دریافت مدارک واقعی: " + title)
        self.fetch("jrei_feature_report", lambda: {
            "title": title, "payload": self.api.request(path)})

    def _display_feature_report(self, result: dict):
        title = str(result.get("title", "گزارش JREI"))[:90]
        value = result.get("payload")
        content = json.dumps(value, ensure_ascii=False, indent=2,
                             sort_keys=True)
        if len(content) > 48000:
            content = content[:48000] + "\n[نمایش گزارش به دلیل حجم محدود شد]"
        dlg = tk.Toplevel(self.root)
        dlg.title("JREI | " + title)
        dlg.geometry("830x620")
        dlg.configure(bg="#111319")
        dlg.transient(self.root)
        self._label(dlg, title, bg="#111319", fg="#d7b577",
                    bold=True, size=14).pack(padx=18, pady=(14, 8))
        reader = tk.Text(dlg, bg="#20242c", fg="#f4f0e8",
                         wrap="word", font=self._font(10),
                         padx=13, pady=12)
        reader.pack(fill="both", expand=True, padx=18, pady=(0, 9))
        reader.insert("1.0", content)
        reader.configure(state="disabled")
        self._button(dlg, "کپی گزارش", lambda t=content: self._copy(t),
                     foreground="#d7b577").pack(side="left",
                                                 padx=18, pady=(0, 12))
        self._button(dlg, "بستن", dlg.destroy).pack(
            side="right", padx=18, pady=(0, 12))
        self.status_text.set("مدارک واقعی دریافت شد: " + title)

    def open_live_oss_search(self):
        search = simpledialog.askstring(
            "JREI | پژوهش متن‌باز",
            "موضوع فنی برای جستجوی واقعی مخازن عمومی:",
            parent=self.root)
        if search is None:
            return
        search = search.strip()
        if not 4 <= len(search) <= 75:
            messagebox.showwarning(
                "JREI", "موضوع باید بین ۴ و ۷۵ نویسه باشد.",
                parent=self.root)
            return
        self._feature_report(
            "جستجوی متن‌باز: " + search[:45],
            "/api/open-source/search?q=" + quote(search, safe=""))

    def _prefill_code_request(self):
        # The existing owner-agent approval gates remain mandatory.
        self._prefill(
            "در مخزن موجود JREI، کد مرتبط با این نیاز را پیدا کن و "
            "به همراه شواهد متن‌باز معتبر مطالعه کن. فقط پیش‌نویس "
            "ایزولهٔ قابل بازبینی بساز؛ هیچ کدی را بدون تأیید جداگانه "
            "اجرا یا روی GitHub/سایت منتشر نکن. موضوع: ")
        self.root.lift()

    def open_image_studio(self):
        if not self.online:
            messagebox.showwarning(
                "JREI", "موتور ۸۰۹۲ هنوز متصل نیست.",
                parent=self.root)
            return
        dlg = tk.Toplevel(self.root)
        dlg.title("JREI | استودیو تصویرسازی خصوصی")
        dlg.geometry("700x665")
        dlg.minsize(580, 520)
        dlg.configure(bg="#111319")
        dlg.transient(self.root)
        self._label(dlg, "استودیو تصویرسازی JREI",
                    fg="#d7b577", bg="#111319",
                    bold=True, size=15).pack(pady=(13, 5))
        self._label(dlg,
            "فعلاً طرح مفهومی اصیل، بدون چهره و بدون انتشار خودکار؛ "
            "تولید عصبی تصویر نیازمند وزن‌های مدل است.",
            fg="#a7abb4", bg="#111319", size=9).pack(pady=(0, 10))
        purpose = tk.StringVar(value="BLOG")
        aspect = tk.StringVar(value="WIDE_16_9")
        selectors = tk.Frame(dlg, bg="#111319")
        selectors.pack(fill="x", padx=20, pady=5)
        tk.OptionMenu(selectors, purpose, "BLOG", "SERVICE", "HOMEPAGE",
                      "NEWS_CONCEPT", "SOCIAL").pack(side="right", padx=7)
        tk.OptionMenu(selectors, aspect, "WIDE_16_9", "SQUARE_1_1",
                      "PORTRAIT_4_5").pack(side="right", padx=7)
        widgets = {}
        fields = (
            ("page_path", "مسیر صفحه (مثلاً /fa/)", "/fa/"),
            ("subject", "موضوع تصویر", ""),
            ("visual_brief", "شرح و مشخصات بصری", ""),
            ("alt_fa", "توضیح جایگزین فارسی", ""),
            ("alt_en", "English alt text", ""),
        )
        for key, label, default in fields:
            self._label(dlg, label, bg="#111319",
                        fg="#a7abb4").pack(anchor="e",
                                             padx=24, pady=(5, 1))
            entry = tk.Entry(dlg, bg="#20242c", fg="#f4f0e8",
                             insertbackground="#d7b577", justify="right",
                             relief="flat", font=self._font(10))
            entry.pack(fill="x", padx=22, ipady=7)
            if default:
                entry.insert(0, default)
            widgets[key] = entry

        def submit():
            payload = {key: item.get().strip()
                       for key, item in widgets.items()}
            if not all(payload.values()):
                messagebox.showwarning(
                    "JREI", "تمام فیلدها باید تکمیل شوند.",
                    parent=dlg)
                return
            payload.update({
                "purpose": purpose.get(), "aspect": aspect.get(),
                "documentary": False, "human_faces": False,
                "confirm": True})
            if not messagebox.askyesno(
                "JREI | تأیید تصویرسازی",
                "یک تصویر مفهومی اصیل در صف پردازش محلی ثبت شود؟\n"
                "این کار مدل عصبی یا انتشار سایت نیست.\n"
                "بازبینی شما برای انتشار ضروری است.",
                parent=dlg):
                return
            dlg.destroy()
            self.fetch("jrei_image_enqueue",
                       lambda p=payload: self.api.request(
                           "/api/site-images/enqueue", p))
        controls = tk.Frame(dlg, bg="#111319")
        controls.pack(fill="x", padx=20, pady=(16, 9))
        self._button(controls, "درخواست تصویر",
                     submit, color="#d7b577",
                     foreground="#111319").pack(side="right")
        self._button(controls, "گالری و وضعیت صف",
                     self.show_image_jobs, foreground="#d7b577"
                     ).pack(side="left", padx=6)
        self._button(controls, "بستن",
                     dlg.destroy).pack(side="left")

    def show_image_jobs(self):
        self.fetch("jrei_image_jobs", lambda:
                   self.api.request("/api/site-images/jobs"))

    def _display_image_jobs(self, response):
        items = [x for x in response.get("items", [])[:50]
                 if isinstance(x, dict)]
        dlg = tk.Toplevel(self.root)
        dlg.title("JREI | گالری و صف تصاویر خصوصی")
        dlg.geometry("790x520")
        dlg.configure(bg="#111319")
        dlg.transient(self.root)
        self._label(dlg, "گالری و صف تصویرسازی محلی",
                    bg="#111319", fg="#d7b577", bold=True,
                    size=14).pack(pady=14)
        listing = tk.Listbox(dlg, bg="#20242c", fg="#f4f0e8",
                             selectbackground="#59462c",
                             font=self._font(10))
        listing.pack(fill="both", expand=True, padx=20, pady=7)
        for item in items:
            listing.insert("end", str(item.get("state", "UNKNOWN"))[:28] +
                           " | " + str(item.get("subject", ""))[:65])
        if not items:
            listing.insert("end", "هنوز تصویری در صف ثبت نشده است.")

        def preview():
            indices = listing.curselection()
            if not indices or indices[0] >= len(items):
                return
            item = items[indices[0]]
            variants = item.get("variants") or []
            if not variants:
                messagebox.showinfo(
                    "JREI", "تصویر هنوز آماده نیست. وضعیت: " +
                    str(item.get("state", "UNKNOWN")), parent=dlg)
                return
            ident = str(item.get("id", ""))
            name = str(variants[0])
            self.fetch("jrei_image_preview", lambda: {
                "bytes": self.api.request_image(ident, name),
                "subject": str(item.get("subject", ""))[:180],
                "name": name})
        bar = tk.Frame(dlg, bg="#111319")
        bar.pack(fill="x", padx=20, pady=14)
        self._button(bar, "پیش‌نمایش تصویر",
                     preview, color="#423624",
                     foreground="#d7b577").pack(side="right")
        self._button(bar, "بازخوانی وضعیت",
                     self.show_image_jobs).pack(side="left", padx=8)
        self._button(bar, "بستن",
                     dlg.destroy).pack(side="left")

    def _display_image_preview(self, result):
        from PIL import Image, ImageTk
        with Image.open(BytesIO(result["bytes"])) as source:
            if source.format != "WEBP":
                raise ValueError("JREI_PRIVATE_IMAGE_FORMAT_INVALID")
            preview = source.copy()
        preview.thumbnail((900, 630))
        dlg = tk.Toplevel(self.root)
        dlg.title("JREI | پیش‌نمایش: " + result["name"])
        dlg.configure(bg="#111319")
        dlg.transient(self.root)
        photograph = ImageTk.PhotoImage(preview, master=dlg)
        label = tk.Label(dlg, image=photograph, bg="#111319")
        label.image = photograph
        label.pack(padx=12, pady=12)
        self._label(dlg, result["subject"], bg="#111319",
                    fg="#f4f0e8").pack(pady=4)
        self._label(dlg, "اثر محلی؛ تا تأیید مالک منتشر نمی‌شود",
                    bg="#111319", fg="#d7b577").pack(pady=6)
        self._button(dlg, "بستن", dlg.destroy).pack(pady=(0, 12))
