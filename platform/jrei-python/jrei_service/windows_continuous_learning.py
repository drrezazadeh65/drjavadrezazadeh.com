"""JREI Windows local, provenance-first continuous learning runtime.

Uses the EXISTING owner-private missions.sqlite3 and existing command-centre
process. Never starts an unsanctioned crawler, trains model weights, publishes,
runs a shell or grants a model permission to choose outbound URLs. Exact
owner-reviewed HTTPS seeds + robots + public pinned DNS + adaptive headroom
are necessary for each network fetch; discovered links only enter review.
"""
from __future__ import annotations

import ctypes
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import socket
import sqlite3
import ssl
import time
from urllib.parse import urlsplit, urlunsplit, urljoin
from urllib.robotparser import RobotFileParser

from jrei_service.windows_document_retrieval import _manifest_and_text

USER_AGENT = "JREI-Owner-Research/1.0"
MAX_RESPONSE = 786_432
MAX_ROBOTS = 128_000
MIN_HOST_PAUSE_SECONDS = 60
MAX_INDEXED_CHARS = 120_000
PASSAGE_SIZE = 900
MAX_SEARCH_PASSAGES = 6
DOMAIN = re.compile(r"^[a-z0-9](?:[a-z0-9.-]{1,251}[a-z0-9])$")
IDENT = re.compile(r"^[a-f0-9]{32}$")
ALLOWED_MIME = frozenset(("text/plain", "text/html"))
RIGHTS = frozenset(("PUBLIC_REUSE_APPROVED", "PRIVATE_OWNER_GRANTED"))
TRUST = frozenset(("OFFICIAL", "INSTITUTIONAL", "PEER_REVIEWED", "OWNER_PRIVATE"))


def _db(path: Path):
    db = sqlite3.connect(path, timeout=15, isolation_level=None)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=15000")
    return db


def initialize(path: Path) -> None:
    """Additive private tables only; never modify the Bertina mother DB."""
    with _db(path) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS learning_sources(
              id TEXT PRIMARY KEY, url TEXT UNIQUE NOT NULL, rights TEXT NOT NULL,
              issuer TEXT NOT NULL, licence TEXT NOT NULL, trust TEXT NOT NULL,
              reviewed INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 0,
              interval_seconds INTEGER NOT NULL, next_due INTEGER NOT NULL DEFAULT 0,
              last_fetch INTEGER, last_sha TEXT, error_code TEXT,
              created INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS learning_versions(
              id TEXT PRIMARY KEY, source_id TEXT NOT NULL
                  REFERENCES learning_sources(id) ON DELETE CASCADE,
              sha256 TEXT NOT NULL, created INTEGER NOT NULL, bytes INTEGER NOT NULL,
              state TEXT NOT NULL, UNIQUE(source_id,sha256));
            CREATE TABLE IF NOT EXISTS learning_passages(
              id TEXT PRIMARY KEY, source_id TEXT NOT NULL
                  REFERENCES learning_sources(id) ON DELETE CASCADE,
              version_id TEXT NOT NULL
                  REFERENCES learning_versions(id) ON DELETE CASCADE,
              anchor TEXT NOT NULL, text TEXT NOT NULL, sha256 TEXT NOT NULL,
              created INTEGER NOT NULL);
            CREATE INDEX IF NOT EXISTS learning_passages_source
              ON learning_passages(source_id,version_id);
            CREATE INDEX IF NOT EXISTS learning_sources_due
              ON learning_sources(active,next_due);
            CREATE TABLE IF NOT EXISTS learning_discoveries(
              url_sha256 TEXT PRIMARY KEY, parent_source_id TEXT NOT NULL
                  REFERENCES learning_sources(id) ON DELETE CASCADE,
              url TEXT NOT NULL, discovered INTEGER NOT NULL,
              state TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED');
            CREATE TABLE IF NOT EXISTS learning_gaps(
              query_sha256 TEXT PRIMARY KEY, first_seen INTEGER NOT NULL,
              last_seen INTEGER NOT NULL, occurrences INTEGER NOT NULL,
              state TEXT NOT NULL, reason TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS learning_observations(
              id INTEGER PRIMARY KEY AUTOINCREMENT, created INTEGER NOT NULL,
              operation TEXT NOT NULL, state TEXT NOT NULL, source_id TEXT,
              evidence_sha256 TEXT, detail_code TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS learning_observations_created
              ON learning_observations(created DESC);
        """)


def _sha(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def _public_url(raw: str) -> str:
    if not isinstance(raw, str) or not 10 <= len(raw) <= 600 or any(
        ord(c) <= 32 for c in raw
    ) or "\\" in raw:
        raise ValueError("LEARNING_URL_INVALID")
    parsed = urlsplit(raw)
    if (parsed.scheme != "https" or not parsed.hostname or parsed.username or
        parsed.password or parsed.fragment or parsed.port not in (None, 443)):
        raise ValueError("LEARNING_HTTPS_PUBLIC_URL_REQUIRED")
    host = parsed.hostname
    if (not DOMAIN.fullmatch(host) or "." not in host or
        host.endswith((".local", ".internal", ".localhost", ".test", ".example",
                       ".invalid")) or host == "localhost" or
        host.startswith("xn--") and host.count(".") == 0):
        raise ValueError("LEARNING_PUBLIC_HOST_REQUIRED")
    if not parsed.path.startswith("/") and parsed.path:
        raise ValueError("LEARNING_PATH_NOT_ABSOLUTE")
    return urlunsplit(("https", host, parsed.path or "/", parsed.query, ""))


def register_source(path: Path, entry: dict) -> dict:
    """A human owner action, never a model-selected or discovered URL."""
    if not isinstance(entry, dict):
        raise ValueError("LEARNING_SOURCE_OBJECT_REQUIRED")
    url = _public_url(entry.get("url"))
    if entry.get("owner_approval") is not True or entry.get("rights_reviewed") is not True:
        raise ValueError("LEARNING_OWNER_AND_RIGHTS_APPROVAL_REQUIRED")
    rights, trust = entry.get("rights"), entry.get("trust")
    issuer, licence = entry.get("issuer"), entry.get("licence")
    if (rights != "PUBLIC_REUSE_APPROVED" or trust not in TRUST - {"OWNER_PRIVATE"}
            or not isinstance(issuer, str) or not 3 <= len(issuer) <= 120
            or not isinstance(licence, str)
            or not re.fullmatch(r"[a-zA-Z0-9._:+/-]{3,90}", licence)):
        raise ValueError("LEARNING_SOURCE_RIGHTS_OR_IDENTITY_INVALID")
    interval = entry.get("interval_seconds", 21600)
    if not isinstance(interval, int) or not 3600 <= interval <= 31_536_000:
        raise ValueError("LEARNING_SOURCE_REVISIT_INTERVAL_INVALID")
    source_id = secrets.token_hex(16)
    with _db(path) as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("""INSERT INTO learning_sources(
            id,url,rights,issuer,licence,trust,reviewed,active,interval_seconds,
            next_due,created) VALUES(?,?,?,?,?,?,1,1,?,0,?)""",
            (source_id,url,rights,issuer,licence,trust,interval,int(time.time())))
        db.commit()
    return {"id": source_id, "state": "APPROVED_SOURCE_REGISTERED",
            "scope": "LOCAL_PRIVATE_ONLY", "url": url,
            "network_fetch_executed": False}


def ingest_owner_document(path: Path, private: Path, document_id: str,
                          *, reviewed: bool, permitted_for_retrieval: bool) -> dict:
    """Explicit owner opt-in, not implicit reuse of a private file as training data."""
    if (not isinstance(document_id, str) or not IDENT.fullmatch(document_id)
            or reviewed is not True or permitted_for_retrieval is not True):
        raise ValueError("LEARNING_PRIVATE_DOCUMENT_APPROVAL_REQUIRED")
    _, manifest, content = _manifest_and_text(private, document_id)
    source_id = document_id
    raw_sha = manifest["sha256"]
    now = int(time.time())
    with _db(path) as db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("""INSERT OR REPLACE INTO learning_sources
          (id,url,rights,issuer,licence,trust,reviewed,active,
           interval_seconds,next_due,last_fetch,last_sha,created)
          VALUES(?,?,'PRIVATE_OWNER_GRANTED','OWNER_LOCAL',
            'OWNER_CONSENT','OWNER_PRIVATE',1,0,31536000,0,?,?,?)""",
          (source_id,"private-document:"+document_id,now,raw_sha,now))
        # Same document digest is not automatically an independent fact check.
        version = _version(db,source_id,raw_sha,len(content.encode("utf-8")),now)
        _replace_passages(db,source_id,version,content,now,"extract")
        _observe(db,"LOCAL_DOCUMENT","PRIVATE_RETRIEVAL_INDEXED",source_id,raw_sha,
                 "OWNER_OPT_IN_NON_TRAINING")
        db.commit()
    return {"state":"PRIVATE_RETRIEVAL_INDEXED","source_id":source_id,
            "source_sha256":raw_sha,"training_performed":False,
            "independently_verified":False,"production_changed":False}


def revoke_owner_document(path: Path, document_id: str) -> None:
    if not isinstance(document_id, str) or not IDENT.fullmatch(document_id):
        raise ValueError("LEARNING_DOCUMENT_ID_INVALID")
    with _db(path) as db:
        db.execute("DELETE FROM learning_sources WHERE id=? AND rights='PRIVATE_OWNER_GRANTED'",
                   (document_id,))


def _version(db, source_id: str, sha: str, length: int, now: int) -> str:
    old = db.execute(
        "SELECT id FROM learning_versions WHERE source_id=? AND sha256=?",
        (source_id,sha)).fetchone()
    if old:
        return old[0]
    ident = secrets.token_hex(16)
    db.execute("""INSERT INTO learning_versions
      (id,source_id,sha256,created,bytes,state)
      VALUES(?,?,?,?,?,'INDEXED_UNVERIFIED')""",
      (ident,source_id,sha,now,length))
    return ident


def _replace_passages(db, source: str, version: str, content: str,
                      now: int, anchor_prefix: str) -> int:
    # Chunk overlap helps preserve context without copying entire books into
    # responses. Content remains private in the owner Windows SQLite store.
    accepted = content[:MAX_INDEXED_CHARS]
    existing = db.execute(
        "SELECT COUNT(*) FROM learning_passages WHERE version_id=?",
        (version,)).fetchone()[0]
    if existing:
        return existing
    created = 0
    for n, index in enumerate(range(0,len(accepted),PASSAGE_SIZE - 120),1):
        text = accepted[index:index+PASSAGE_SIZE].strip()
        if len(text) < 60:
            continue
        db.execute("""INSERT INTO learning_passages(
          id,source_id,version_id,anchor,text,sha256,created)
          VALUES(?,?,?,?,?,?,?)""",
          (secrets.token_hex(16),source,version,
           f"{anchor_prefix} chars {index+1}-{index+len(text)}",
           text,_sha(text),now))
        created += 1
    return created


class _ReadableHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignore = 0
        self.parts: list[str] = []
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        tag=tag.lower()
        if tag in ("script","style","svg","noscript","nav","footer","form"):
            self.ignore += 1
        if tag == "a" and not self.ignore:
            for key, value in attrs:
                if key == "href" and isinstance(value,str) and len(value)<500:
                    self.links.append(value)
        if tag in ("p","div","section","article","li","h1","h2","h3","h4","br"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag.lower() in ("script","style","svg","noscript","nav","footer","form"):
            self.ignore = max(0,self.ignore-1)

    def handle_data(self, data):
        if not self.ignore:
            self.parts.append(data)

    def text(self):
        return re.sub(r"[ \t]+"," ","".join(self.parts)).strip()[:MAX_INDEXED_CHARS]


def _ip_list(host: str):
    try:
        results = socket.getaddrinfo(host,443,type=socket.SOCK_STREAM,
                                      proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise ValueError("LEARNING_PUBLIC_DNS_UNAVAILABLE") from exc
    addresses = []
    for row in results:
        ip=ipaddress.ip_address(row[4][0].split("%")[0])
        if not ip.is_global:
            raise ValueError("LEARNING_DNS_PRIVATE_OR_RESERVED_ADDRESS")
        if str(ip) not in addresses:
            addresses.append(str(ip))
    if not addresses:
        raise ValueError("LEARNING_DNS_NO_PUBLIC_ADDRESS")
    return addresses


class _PinnedTLS(http.client.HTTPSConnection):
    def __init__(self,host,ip,timeout):
        super().__init__(host,port=443,timeout=timeout,
                         context=ssl.create_default_context())
        self._pin=ip

    def connect(self):
        sock=socket.create_connection((self._pin,443),timeout=self.timeout)
        try:
            self.sock=self._context.wrap_socket(sock,server_hostname=self.host)
        except BaseException:
            sock.close()
            raise


def _fetch_exact(url: str, cap: int) -> tuple[str,bytes]:
    parsed=urlsplit(_public_url(url))
    ips=_ip_list(parsed.hostname)
    # No proxies, redirects, cookies, credentials, retry storms or DNS
    # rebinding between validation and connection. Hostname is SNI-checked.
    endpoint=(parsed.path or "/")+("?" +parsed.query if parsed.query else "")
    last_error=None
    for ip in ips[:2]:
        conn=_PinnedTLS(parsed.hostname,ip,timeout=11)
        try:
            conn.request("GET",endpoint,headers={
                "Host":parsed.hostname,"User-Agent":USER_AGENT,
                "Accept":"text/plain,text/html;q=0.9",
                "Accept-Encoding":"identity","Connection":"close"})
            response=conn.getresponse()
            if response.status != 200:
                raise ValueError("LEARNING_FETCH_HTTP_NOT_200")
            mime=response.getheader("Content-Type","").split(";",1)[0].lower().strip()
            if mime not in ALLOWED_MIME and not url.endswith("/robots.txt"):
                raise ValueError("LEARNING_CONTENT_TYPE_UNSUPPORTED")
            if response.getheader("Content-Encoding","identity").lower()!="identity":
                raise ValueError("LEARNING_COMPRESSED_CONTENT_REJECTED")
            declared=response.getheader("Content-Length")
            if declared is not None and int(declared)>cap:
                raise ValueError("LEARNING_DECLARED_SIZE_EXCEEDED")
            data=response.read(cap+1)
            if len(data)>cap:
                raise ValueError("LEARNING_RESPONSE_SIZE_EXCEEDED")
            return mime,data
        except (socket.timeout,OSError,ssl.SSLError) as exc:
            last_error=exc
        finally:
            conn.close()
    raise ValueError("LEARNING_NETWORK_TRANSFER_FAILED") from last_error


def _robots_allowed(url: str) -> bool:
    parsed=urlsplit(url)
    robots="https://"+parsed.hostname+"/robots.txt"
    _,data=_fetch_exact(robots,MAX_ROBOTS)
    policy=RobotFileParser()
    policy.parse(data.decode("utf-8",errors="replace").splitlines())
    return policy.can_fetch(USER_AGENT,url)


def _observe(db, operation: str, state: str, sid: str|None,
             evidence: str|None, detail: str) -> None:
    db.execute("""INSERT INTO learning_observations
      (created,operation,state,source_id,evidence_sha256,detail_code)
      VALUES(?,?,?,?,?,?)""",
      (int(time.time()),operation,state,sid,evidence,detail))


def _windows_resources() -> dict:
    """Read actual Windows load and headroom without starting executables."""
    available = total = None
    cpu = None
    try:
        if os.name=="nt":
            class MEMORY(ctypes.Structure):
                _fields_=[("length",ctypes.c_ulong),("load",ctypes.c_ulong),
                          ("total_phys",ctypes.c_ulonglong),
                          ("avail_phys",ctypes.c_ulonglong),
                          ("total_page",ctypes.c_ulonglong),
                          ("avail_page",ctypes.c_ulonglong),
                          ("total_virtual",ctypes.c_ulonglong),
                          ("avail_virtual",ctypes.c_ulonglong),
                          ("avail_extended",ctypes.c_ulonglong)]
            mem=MEMORY();mem.length=ctypes.sizeof(MEMORY)
            if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem)):
                raise OSError("MEMORY_SAMPLE_UNAVAILABLE")
            available=mem.avail_phys
            total=mem.total_phys
            class FILETIME(ctypes.Structure):
                _fields_=[("low",ctypes.c_ulong),("high",ctypes.c_ulong)]
                def number(self):return (self.high<<32)|self.low
            def sample():
                idle,kernel,user=FILETIME(),FILETIME(),FILETIME()
                if not ctypes.windll.kernel32.GetSystemTimes(
                        ctypes.byref(idle),ctypes.byref(kernel),ctypes.byref(user)):
                    raise OSError("CPU_SAMPLE_UNAVAILABLE")
                return idle.number(),kernel.number()+user.number()
            idle1,all1=sample()
            time.sleep(0.15)
            idle2,all2=sample()
            cpu=max(0.,min(1.,1-(idle2-idle1)/max(1,all2-all1)))
        else:
            # This runtime is Windows-specific: never infer Windows capacity
            # from a different machine's process or a default model setting.
            return {"eligible":False,"reason":"WINDOWS_RUNTIME_ONLY"}
        disk=os.statvfs if False else None
        import shutil
        free=shutil.disk_usage(Path.home()).free
        min_free=max(3*1024**3,int(total*.12))
        eligible=(available is not None and available>=min_free
                  and cpu is not None and cpu<0.85 and free>8*1024**3)
        return {"eligible":eligible,"reason":"HEADROOM_OK" if eligible
                else "RESOURCE_HEADROOM_LOW",
                "cpu_fraction":round(cpu,3) if cpu is not None else None,
                "free_ram_mb":int(available/1048576) if available else None,
                "free_disk_gb":int(free/1073741824)}
    except (OSError,ValueError,AttributeError):
        return {"eligible":False,"reason":"RESOURCE_TELEMETRY_UNAVAILABLE"}


def tick(db_path: Path, *, permit_network: bool, user_active: bool=False) -> dict:
    """At most one owner-approved exact-URL retrieval per bounded tick.

    The private runtime never auto-approves a discovered link. The owner
    controls network mode; queueing information isn't authorization.
    """
    if not permit_network:
        return {"state":"OFF_NETWORK_NOT_AUTHORIZED","network_requests":0}
    if user_active:
        return {"state":"DEFER_USER_ACTIVE","network_requests":0}
    resource=_windows_resources()
    if not resource["eligible"]:
        return {"state":"DEFER_"+resource["reason"],"network_requests":0,
                "resources":resource}
    now=int(time.time())
    with _db(db_path) as db:
        row=db.execute("""SELECT id,url,interval_seconds FROM learning_sources
          WHERE reviewed=1 AND active=1 AND rights='PUBLIC_REUSE_APPROVED'
          AND next_due<=? ORDER BY next_due,id LIMIT 1""",(now,)).fetchone()
        if not row:
            return {"state":"NO_APPROVED_SOURCE_DUE","network_requests":0}
        sid,url,interval=row
        host=urlsplit(url).hostname
        # Host-wide spacing across all approved source URLs.
        last=db.execute("""SELECT MAX(last_fetch) FROM learning_sources
          WHERE url LIKE ?""", ("https://"+host+"/%",)).fetchone()[0]
        if last and now-last<MIN_HOST_PAUSE_SECONDS:
            return {"state":"DOMAIN_POLITENESS_DEFERRED","network_requests":0}
        # Lease before I/O so retries/restarts do not create fetch storms.
        db.execute("UPDATE learning_sources SET next_due=? WHERE id=?",
                   (now+max(interval,3600),sid))
    try:
        if not _robots_allowed(url):
            raise ValueError("LEARNING_ROBOTS_DISALLOWED")
        mime,raw=_fetch_exact(url,MAX_RESPONSE)
        if len(raw)<80:
            raise ValueError("LEARNING_SOURCE_TOO_SHORT")
        charset="utf-8"
        if mime=="text/html":
            extractor=_ReadableHTML()
            extractor.feed(raw.decode(charset,errors="replace"))
            content=extractor.text()
            links=extractor.links[:80]
        else:
            content=raw.decode(charset,errors="replace")[:MAX_INDEXED_CHARS]
            links=[]
        if len(content)<120:
            raise ValueError("LEARNING_EXTRACTED_TEXT_INSUFFICIENT")
        digest=_sha(raw)
        stamp=int(time.time())
        with _db(db_path) as db:
            db.execute("BEGIN IMMEDIATE")
            v=_version(db,sid,digest,len(raw),stamp)
            count=_replace_passages(db,sid,v,content,stamp,
                                    "html" if mime=="text/html" else "text")
            for value in links:
                try:
                    candidate=_public_url(urljoin(url,value))
                    if urlsplit(candidate).hostname!=host or candidate==url:
                        continue
                    db.execute("""INSERT OR IGNORE INTO learning_discoveries
                      (url_sha256,parent_source_id,url,discovered)
                      VALUES(?,?,?,?)""",(_sha(candidate),sid,candidate,stamp))
                except (ValueError,sqlite3.IntegrityError):
                    continue
            db.execute("""UPDATE learning_sources SET
              last_fetch=?,last_sha=?,error_code=NULL WHERE id=?""",
              (stamp,digest,sid))
            _observe(db,"RETRIEVE","LOCAL_UNVERIFIED_INDEXED",sid,digest,
                     "SOURCE_RIGHTS_REVIEWED_BUT_CLAIMS_NOT_VERIFIED")
            db.commit()
        return {"state":"LOCAL_UNVERIFIED_INDEXED","source_id":sid,
                "source_sha256":digest,"passages":count,
                "model_weights_updated":False,"production_changed":False}
    except (ValueError,OSError,ssl.SSLError,http.client.HTTPException) as exc:
        # No raw HTML, URLs with private parameters or exception details
        # are written to operational receipts.
        code=str(exc) if isinstance(exc,ValueError) and
             re.fullmatch(r"[A-Z0-9_]{4,90}",str(exc)) else "FETCH_UNAVAILABLE"
        with _db(db_path) as db:
            db.execute("UPDATE learning_sources SET error_code=? WHERE id=?",
                       (code,sid))
            _observe(db,"RETRIEVE","HELD",sid,None,code)
        return {"state":"HELD","reason":code,"source_id":sid,
                "model_weights_updated":False}


def retrieve(db_path: Path, question: str, max_passages: int=4) -> dict:
    """Deterministic lexical grounding; provenance is not truth validation."""
    if not isinstance(question,str) or not 1<=len(question)<=6000:
        raise ValueError("LEARNING_QUERY_INVALID")
    normalized=re.sub(r"[^\w\u0600-\u06ff]+"," ",question.casefold().replace("ي","ی").replace("ك","ک"))
    stop={"برای","این","آن","است","هست","درباره","کدام","چه","چطور",
          "چگونه","های","یک","the","and","from","with","what","why","how"}
    words=[x for x in dict.fromkeys(normalized.split()) if len(x)>=3 and x not in stop][:12]
    if not words:
        return {"evidence":[],"state":"NO_SEARCH_TERMS"}
    with _db(db_path) as db:
        # Exclude withdrawn sources and older versions. Limit candidate
        # scans to bound latency/CPU, not a permanent corpus size ceiling.
        rows=db.execute("""SELECT s.url,s.issuer,s.rights,s.licence,v.sha256,
          p.anchor,p.text,p.sha256
          FROM learning_passages p
          JOIN learning_sources s ON s.id=p.source_id
          JOIN learning_versions v ON v.id=p.version_id
          WHERE s.reviewed=1 AND (s.active=1 OR s.rights='PRIVATE_OWNER_GRANTED')
            AND s.last_sha=v.sha256
          ORDER BY p.created DESC,p.id DESC LIMIT 2500""").fetchall()
    scored=[]
    for url,issuer,rights,licence,source_hash,anchor,text,p_hash in rows:
        lowered=text.casefold().replace("ي","ی").replace("ك","ک")
        hits=sum(1 for w in words if w in lowered)
        if not hits:
            continue
        scored.append((hits,url,anchor,{
            "source":url if rights!="PRIVATE_OWNER_GRANTED" else "PRIVATE_OWNER_DOCUMENT",
            "issuer":issuer,"rights":rights,"licence":licence,
            "source_sha256":source_hash,"anchor":anchor,
            "text_sha256":p_hash,"excerpt":text[:1000],
            "independently_fact_checked":False}))
    scored.sort(key=lambda x:(-x[0],x[1],x[2]))
    output=[x[3] for x in scored[:min(MAX_SEARCH_PASSAGES,max(1,max_passages))]]
    return {"evidence":output,"state":"EVIDENCE_RETRIEVED" if output else
            "NO_MATCHING_REVIEWED_SOURCE","model_weights_changed":False}


def note_gap(db_path: Path, question: str, reason: str="NO_SOURCE_MATCH") -> None:
    """Store irreversible SHA only, never raw prompts or personal data."""
    if not isinstance(question,str) or reason not in (
        "NO_SOURCE_MATCH","ANSWER_NOT_GROUNDED","OWNER_CORRECTION"):
        raise ValueError("LEARNING_GAP_INVALID")
    now=int(time.time())
    digest=_sha(question.strip().casefold())
    with _db(db_path) as db:
        db.execute("""INSERT INTO learning_gaps(
          query_sha256,first_seen,last_seen,occurrences,state,reason)
          VALUES(?,?,?,1,'GAP_OBSERVED_UNVERIFIED',?)
          ON CONFLICT(query_sha256) DO UPDATE SET
          occurrences=occurrences+1,last_seen=excluded.last_seen,
          reason=excluded.reason""",(digest,now,now,reason))


def snapshot(db_path: Path) -> dict:
    with _db(db_path) as db:
        query=lambda sql:db.execute(sql).fetchone()[0]
        sources=query("SELECT COUNT(*) FROM learning_sources WHERE active=1")
        versions=query("SELECT COUNT(*) FROM learning_versions")
        passages=query("SELECT COUNT(*) FROM learning_passages")
        discoveries=query("SELECT COUNT(*) FROM learning_discoveries WHERE state='REVIEW_REQUIRED'")
        gaps=query("SELECT COUNT(*) FROM learning_gaps")
        logs=db.execute("""SELECT created,operation,state,detail_code FROM
           learning_observations ORDER BY id DESC LIMIT 8""").fetchall()
    return {"schema":"jr.jrei.windows-learning-runtime.v1",
            "reviewed_sources":sources,"versioned_observations":versions,
            "private_passages":passages,"unreviewed_discovered_links":discoveries,
            "observed_gap_hashes":gaps,
            "latest":[{"at":t,"operation":op,"state":s,"detail":d}
                      for t,op,s,d in logs],
            "scientific_quality_verified":False,
            "model_weights_updated":False,"website_changed":False}
