"""Public GitLab and Codeberg open-source research for the ORIGINAL JREI.

Use the existing missions.sqlite3, original loopback scheduler and resource
admission. GitLab.com and Codeberg.org are fixed trusted transport hosts,
NOT assumed trustworthy code publishers. Repositories are discovered without
popularity thresholds; GitLab public source is inspected at a pinned commit.
This module does not run upstream code, install dependencies, train models,
change owner source, commit to GitHub or publish anything.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request

from jrei_service.windows_open_source_study import _source_signatures, _notes

SCHEMA = "jr.jrei.multiforge-source-research.v1"
PROVIDERS = ("gitlab", "codeberg")
HOSTS = {"gitlab": "https://gitlab.com", "codeberg": "https://codeberg.org"}
PROJECT = re.compile(r"^[A-Za-z0-9_.-]{1,80}(?:/[A-Za-z0-9_.-]{1,90}){1,4}$")
SHA = re.compile(r"^[0-9a-f]{40}$")
CODE = (".py", ".js", ".mjs", ".ts", ".go", ".rs", ".java", ".c", ".cpp")
MAX_JSON = 240000
MAX_BLOB = 45000
SEARCH_REFRESH = 12 * 3600
SOURCE_REFRESH = 24 * 3600
RETRY = 40 * 60
LEASE = 120


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, url):
        raise ValueError("JREI_MULTIFORGE_REDIRECT_REJECTED")


def _db(path):
    db = sqlite3.connect(path, timeout=12)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(path):
    with closing(_db(path)) as db:
        db.executescript("""CREATE TABLE IF NOT EXISTS jrei_oss_forge_rounds(
            provider TEXT NOT NULL, domain TEXT NOT NULL,
            last_attempt INTEGER, next_due INTEGER NOT NULL DEFAULT 0,
            lease_until INTEGER NOT NULL DEFAULT 0,
            last_state TEXT NOT NULL DEFAULT 'NEVER_SEARCHED',
            attempts INTEGER NOT NULL DEFAULT 0,
            searches INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY(provider,domain));
        CREATE TABLE IF NOT EXISTS jrei_oss_forge_candidates(
            provider TEXT NOT NULL, domain TEXT NOT NULL,
            repository TEXT NOT NULL, project_id INTEGER,
            description TEXT NOT NULL, stars INTEGER NOT NULL,
            first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
            source_last_attempt INTEGER, source_next_due INTEGER NOT NULL DEFAULT 0,
            source_revision TEXT, source_path TEXT, source_sha256 TEXT,
            signatures_json TEXT NOT NULL DEFAULT '[]',
            research_notes_json TEXT NOT NULL DEFAULT '[]',
            source_state TEXT NOT NULL DEFAULT 'NEVER_READ',
            PRIMARY KEY(provider,domain,repository));""")
        db.commit()


def _transport(provider, route, *, binary=False):
    if provider not in PROVIDERS or len(route) > 600:
        raise ValueError("JREI_FORGE_ROUTE_INVALID")
    prefix = "/api/v4/projects" if provider == "gitlab" else "/api/v1/repos"
    if not route.startswith(prefix) or ".." in route or "//" in route:
        raise ValueError("JREI_FORGE_ROUTE_REJECTED")
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}), _NoRedirect())
    request = urllib.request.Request(
        HOSTS[provider] + route, method="GET",
        headers={"Accept": "application/json" if not binary else "*/*",
                 "User-Agent": "JREI-OSS-Research/1.0"})
    try:
        with opener.open(request, timeout=12) as response:
            if response.status != 200:
                raise ValueError("JREI_FORGE_RESPONSE_NOT_OK")
            if not binary and "json" not in (
                    response.headers.get("Content-Type") or "").lower():
                raise ValueError("JREI_FORGE_RESPONSE_NOT_JSON")
            data = response.read((MAX_BLOB if binary else MAX_JSON) + 1)
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise ValueError("JREI_FORGE_RATE_LIMITED") from exc
        raise ValueError("JREI_FORGE_UPSTREAM_HTTP_ERROR") from exc
    if len(data) > (MAX_BLOB if binary else MAX_JSON):
        raise ValueError("JREI_FORGE_RESPONSE_TOO_LARGE")
    return data if binary else json.loads(data.decode("utf-8"))


def _query(text):
    # GitLab public projects search uses AND semantics; broad identifiers
    # still let unknown small repositories enter the candidate collection.
    tokens = [v for v in re.findall(r"[a-z]{3,}", text.lower())
              if v not in ("python", "javascript", "from", "with", "code")]
    return " ".join(tokens[:2])[:70] if tokens else "machine learning"


def _find(provider, query):
    term = _query(query)
    if provider == "gitlab":
        params = urllib.parse.urlencode(
            {"search": term, "visibility": "public", "simple": "true",
             "per_page": "12"})
        data = _transport(provider, "/api/v4/projects?" + params)
        if not isinstance(data, list):
            raise ValueError("JREI_GITLAB_PROJECT_LIST_INVALID")
        entries = []
        for item in data[:12]:
            if not isinstance(item, dict):
                continue
            name = item.get("path_with_namespace")
            project_id = item.get("id")
            if (not isinstance(name, str) or not PROJECT.fullmatch(name)
                    or not isinstance(project_id, int) or project_id <= 0):
                continue
            entries.append({
                "repository": name, "project_id": project_id,
                "description": str(item.get("description") or "")[:260],
                "stars": max(0,int(item.get("star_count") or 0)),
            })
        return entries
    params = urllib.parse.urlencode({"q": term, "limit": "12"})
    data = _transport(provider, "/api/v1/repos/search?" + params)
    if not isinstance(data, dict) or not isinstance(data.get("data"), list):
        raise ValueError("JREI_CODEBERG_SEARCH_INVALID")
    entries = []
    for item in data["data"][:12]:
        if not isinstance(item, dict):
            continue
        name = item.get("full_name")
        if not isinstance(name, str) or not PROJECT.fullmatch(name):
            continue
        entries.append({
            "repository": name, "project_id": None,
            "description": str(item.get("description") or "")[:260],
            "stars": max(0,int(item.get("stars_count") or 0)),
        })
    return entries


def _enabled(db):
    row = db.execute("""SELECT enabled FROM jrei_oss_controls
        WHERE name='public_github_research'""").fetchone()
    return row is not None and row[0] == 1


def discover_once(path, *, resources_available, owner_active=False):
    if not resources_available or owner_active:
        return {"schema": SCHEMA, "state": "HELD_RESOURCES"}
    now = int(time.time())
    with closing(_db(path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if not _enabled(db):
            db.rollback()
            return {"schema": SCHEMA, "state": "RESEARCH_DISABLED"}
        row = db.execute("""SELECT p.provider,t.domain,t.query
            FROM jrei_oss_topics t
            CROSS JOIN (SELECT 'gitlab' AS provider
                UNION ALL SELECT 'codeberg') p
            LEFT JOIN jrei_oss_forge_rounds s
              ON s.provider=p.provider AND s.domain=t.domain
            WHERE (t.domain LIKE 'self_%' OR t.domain LIKE 'problem_%')
              AND COALESCE(s.next_due,0)<=?
              AND COALESCE(s.lease_until,0)<=?
            ORDER BY COALESCE(s.last_attempt,0),t.domain,p.provider
            LIMIT 1""",(now,now)).fetchone()
        if not row:
            db.rollback()
            return {"schema": SCHEMA, "state": "NO_FORGE_TOPIC_DUE"}
        provider, domain, query = row
        db.execute("""INSERT INTO jrei_oss_forge_rounds(
            provider,domain,last_attempt,next_due,lease_until,attempts)
            VALUES(?,?,?,?,?,1)
            ON CONFLICT(provider,domain) DO UPDATE SET
            last_attempt=excluded.last_attempt,
            next_due=excluded.next_due,
            lease_until=excluded.lease_until, attempts=attempts+1""",
            (provider,domain,now,now+RETRY,now+LEASE))
        db.commit()
    state = "UPSTREAM_UNAVAILABLE"
    found = []
    try:
        found = _find(provider, query)
        state = "PUBLIC_REPOSITORIES_DISCOVERED_UNVERIFIED"
    except (ValueError, OSError, TypeError, OverflowError,
            json.JSONDecodeError, urllib.error.URLError):
        pass
    with closing(_db(path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if state == "PUBLIC_REPOSITORIES_DISCOVERED_UNVERIFIED":
            for item in found:
                db.execute("""INSERT INTO jrei_oss_forge_candidates(
                    provider,domain,repository,project_id,description,stars,
                    first_seen,last_seen)
                    VALUES(?,?,?,?,?,?,?,?)
                    ON CONFLICT(provider,domain,repository) DO UPDATE SET
                    description=excluded.description,stars=excluded.stars,
                    last_seen=excluded.last_seen""",
                    (provider,domain,item["repository"],item["project_id"],
                     item["description"],item["stars"],now,now))
        db.execute("""UPDATE jrei_oss_forge_rounds SET
            next_due=?,lease_until=0,last_state=?,searches=searches+?
            WHERE provider=? AND domain=?""",
            (now+(SEARCH_REFRESH if
                  state == "PUBLIC_REPOSITORIES_DISCOVERED_UNVERIFIED"
                  else RETRY),state,
             int(state=="PUBLIC_REPOSITORIES_DISCOVERED_UNVERIFIED"),
             provider,domain))
        db.commit()
    return {"schema": SCHEMA, "state": state,
            "provider": provider, "candidate_count": len(found),
            "source_code_read": False, "code_executed": False}


def _gitlab_source(project_id, query):
    if type(project_id) is not int or project_id <= 0:
        raise ValueError("JREI_GITLAB_PROJECT_ID_INVALID")
    base = "/api/v4/projects/" + str(project_id)
    project = _transport("gitlab", base)
    if not isinstance(project, dict):
        raise ValueError("JREI_GITLAB_PROJECT_INVALID")
    branch = project.get("default_branch")
    if not isinstance(branch, str) or not 1 <= len(branch) <= 150:
        raise ValueError("JREI_GITLAB_DEFAULT_BRANCH_MISSING")
    commit = _transport("gitlab", base + "/repository/commits/" +
                        urllib.parse.quote(branch, safe=""))
    revision = commit.get("id") if isinstance(commit, dict) else None
    if not isinstance(revision, str) or not SHA.fullmatch(revision):
        raise ValueError("JREI_GITLAB_REVISION_INVALID")
    tree = _transport("gitlab", base + "/repository/tree?" +
                      urllib.parse.urlencode({"ref":revision,"per_page":"100"}))
    if not isinstance(tree, list):
        raise ValueError("JREI_GITLAB_TREE_INVALID")
    blobs = [item for item in tree if isinstance(item, dict) and
             item.get("type") == "blob" and
             str(item.get("path","")).lower().endswith(CODE) and
             SHA.fullmatch(str(item.get("id","")))]
    if not blobs:
        dirs = [item for item in tree if isinstance(item, dict) and
                item.get("type") == "tree" and
                item.get("name") in ("src","lib","python","app","core")]
        if dirs:
            deep = _transport("gitlab", base + "/repository/tree?" +
                              urllib.parse.urlencode({
                                  "ref":revision, "per_page":"100",
                                  "path":str(dirs[0]["path"])}))
            blobs = [item for item in deep if isinstance(item, dict) and
                     item.get("type") == "blob" and
                     str(item.get("path","")).lower().endswith(CODE) and
                     SHA.fullmatch(str(item.get("id","")))]
    if not blobs:
        return {"revision":revision,"source":None,"sha":None,"functions":[],
                "notes":[]}
    terms = set(re.findall(r"[a-z]{3,}", query.lower()))
    blobs.sort(key=lambda item: (
        -len(terms & set(re.findall(
            r"[a-z]{3,}",str(item["path"]).lower()))),
        str(item["path"])))
    source = blobs[0]
    blob_sha = source["id"]
    raw = _transport("gitlab",
        base + "/repository/blobs/" + blob_sha + "/raw",binary=True)
    git_hash = hashlib.sha1(
        b"blob "+str(len(raw)).encode("ascii")+b"\x00"+raw).hexdigest()
    if git_hash != blob_sha:
        raise ValueError("JREI_GITLAB_BLOB_SHA_MISMATCH")
    return {"revision": revision,
            "source": str(source["path"])[:190],
            "sha": hashlib.sha256(raw).hexdigest(),
            "functions": _source_signatures(raw, str(source["path"])),
            "notes": _notes(raw, query, label="code")}


def _codeberg_source(repository, query):
    """Read Forgejo public content at the exact latest commit.

    Codeberg uses the Forgejo/Gitea repository contents interface. If this
    instance cannot provide a revision-pinned content receipt, return a
    recorded unavailable outcome rather than falling back to an unpinned URL.
    """
    if not isinstance(repository, str) or not PROJECT.fullmatch(repository):
        raise ValueError("JREI_CODEBERG_REPOSITORY_INVALID")
    if repository.count("/") != 1:
        # This Forgejo API uses one owner and one repository path.
        raise ValueError("JREI_CODEBERG_NESTED_PATH_UNSUPPORTED")
    base = "/api/v1/repos/" + repository
    metadata = _transport("codeberg", base)
    if (not isinstance(metadata, dict) or
            metadata.get("full_name") != repository):
        raise ValueError("JREI_CODEBERG_REPOSITORY_MISMATCH")
    branch = metadata.get("default_branch")
    if not isinstance(branch, str) or not 1 <= len(branch) <= 130:
        raise ValueError("JREI_CODEBERG_DEFAULT_BRANCH_UNKNOWN")
    history = _transport("codeberg", base + "/commits?" +
                         urllib.parse.urlencode({"sha":branch,"limit":"1"}))
    if not isinstance(history, list) or not history:
        raise ValueError("JREI_CODEBERG_HEAD_UNAVAILABLE")
    revision = history[0].get("sha") if isinstance(history[0],dict) else None
    if not isinstance(revision,str) or not SHA.fullmatch(revision):
        raise ValueError("JREI_CODEBERG_COMMIT_UNPINNED")
    tree = _transport("codeberg", base + "/contents?" +
                      urllib.parse.urlencode({"ref":revision}))
    if not isinstance(tree,list):
        raise ValueError("JREI_CODEBERG_TREE_INVALID")
    files = [v for v in tree if isinstance(v,dict) and
             v.get("type") == "file" and
             str(v.get("path","")).lower().endswith(CODE)]
    if not files:
        folders = [v for v in tree if isinstance(v,dict) and
                   v.get("type") == "dir" and
                   v.get("name") in ("src","lib","core","app","python")]
        if folders:
            folder = str(folders[0].get("path",""))
            if re.fullmatch(r"[A-Za-z0-9._/-]{1,170}",folder):
                more = _transport("codeberg",base+"/contents/"+
                    urllib.parse.quote(folder,safe="/")+"?"+
                    urllib.parse.urlencode({"ref":revision}))
                if isinstance(more,list):
                    files = [v for v in more if isinstance(v,dict) and
                             v.get("type") == "file" and
                             str(v.get("path","")).lower().endswith(CODE)]
    if not files:
        return {"revision":revision,"source":None,"sha":None,"functions":[]}
    terms = set(re.findall(r"[a-z]{3,}",query.lower()))
    files.sort(key=lambda item:(
        -len(terms & set(re.findall(
            r"[a-z]{3,}",str(item.get("path","")).lower()))),
        str(item.get("path",""))))
    source_path = str(files[0].get("path",""))
    if not re.fullmatch(r"[A-Za-z0-9._/+@-]{1,190}",source_path):
        raise ValueError("JREI_CODEBERG_SOURCE_PATH_INVALID")
    obj = _transport("codeberg",base+"/contents/"+
        urllib.parse.quote(source_path,safe="/")+"?"+
        urllib.parse.urlencode({"ref":revision}))
    if not isinstance(obj,dict) or obj.get("encoding") != "base64":
        raise ValueError("JREI_CODEBERG_FILE_FORMAT_INVALID")
    import base64
    import binascii
    encoded = obj.get("content")
    if not isinstance(encoded,str):
        raise ValueError("JREI_CODEBERG_FILE_CONTENT_MISSING")
    try:
        raw = base64.b64decode(encoded,validate=False)
    except (ValueError,binascii.Error) as exc:
        raise ValueError("JREI_CODEBERG_BASE64_INVALID") from exc
    if len(raw) > MAX_BLOB:
        raise ValueError("JREI_CODEBERG_BLOB_TOO_LARGE")
    reported = obj.get("sha")
    calculated = hashlib.sha1(
        b"blob "+str(len(raw)).encode("ascii")+b"\x00"+raw).hexdigest()
    if reported != calculated:
        raise ValueError("JREI_CODEBERG_BLOB_MISMATCH")
    return {"revision":revision,"source":source_path,
            "sha":hashlib.sha256(raw).hexdigest(),
            "functions":_source_signatures(raw,source_path),
            "notes":_notes(raw,query,label="code")}


def read_once(path, *, resources_available, owner_active=False):
    """Read one GitLab/Codeberg source file at an independently pinned SHA."""
    if not resources_available or owner_active:
        return {"schema":SCHEMA,"state":"HELD_RESOURCES"}
    now = int(time.time())
    with closing(_db(path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if not _enabled(db):
            db.rollback()
            return {"schema":SCHEMA,"state":"RESEARCH_DISABLED"}
        row = db.execute("""SELECT c.provider,c.domain,c.repository,
                c.project_id,t.query
            FROM jrei_oss_forge_candidates c JOIN jrei_oss_topics t
                ON t.domain=c.domain
            WHERE c.provider IN ('gitlab','codeberg')
              AND c.source_next_due<=?
            ORDER BY COALESCE(c.source_last_attempt,0),
                c.last_seen DESC LIMIT 1""",(now,)).fetchone()
        if not row:
            db.rollback()
            return {"schema":SCHEMA,"state":"NO_FORGE_SOURCE_DUE"}
        provider,domain,repository,project_id,query=row
        db.execute("""UPDATE jrei_oss_forge_candidates
            SET source_last_attempt=?,source_next_due=?
            WHERE provider=? AND domain=? AND repository=?""",
            (now,now+RETRY,provider,domain,repository))
        db.commit()
    info = None
    state = "UPSTREAM_SOURCE_UNAVAILABLE"
    try:
        info = (_gitlab_source(project_id,query) if provider == 'gitlab'
                else _codeberg_source(repository,query))
        state = ("PINNED_PUBLIC_CODE_STUDIED" if info["sha"]
                 else "REVISION_READ_NO_SMALL_CODE_FILE")
    except (ValueError, OSError, TypeError, KeyError, OverflowError,
            json.JSONDecodeError, urllib.error.URLError):
        pass
    with closing(_db(path)) as db:
        db.execute("""UPDATE jrei_oss_forge_candidates SET
            source_next_due=?,source_revision=?,source_path=?,
            source_sha256=?,signatures_json=?,research_notes_json=?,
            source_state=?
            WHERE provider=? AND domain=? AND repository=?""",
            (now+(SOURCE_REFRESH if info else RETRY),
             info["revision"] if info else None,
             info["source"] if info else None,
             info["sha"] if info else None,
             json.dumps(info["functions"],sort_keys=True) if info else "[]",
             json.dumps(info["notes"],ensure_ascii=False) if info else "[]",
             state,provider,domain,repository))
        db.commit()
    return {"schema":SCHEMA,"provider":provider,"state":state,
            "repository":repository,
            "source_read":bool(info and info["sha"]),
            "source_excerpt_count":len(info["notes"]) if info else 0,
            "code_executed":False}


def snapshot(path):
    with closing(_db(path)) as db:
        rounds = db.execute("""SELECT provider,COUNT(*),
            COALESCE(SUM(searches),0) FROM jrei_oss_forge_rounds
            GROUP BY provider""").fetchall()
        sources = db.execute("""SELECT provider,COUNT(*),
            COALESCE(SUM(CASE WHEN source_sha256 IS NOT NULL
            THEN 1 ELSE 0 END),0) FROM jrei_oss_forge_candidates
            GROUP BY provider""").fetchall()
    return {
        "schema":SCHEMA,
        "searches":{p:{"topics":n,"completed":c} for p,n,c in rounds},
        "code_reads":{p:{"candidates":n,"with_code_sha":c}
                      for p,n,c in sources},
        "gitlab_public_pinned_code_reading":True,
        "codeberg_repository_discovery":True,
        "codeberg_code_reading_implemented":True,
        "external_code_executed":False,
        "external_license_assumed":False,
        "production_changed":False,
    }
