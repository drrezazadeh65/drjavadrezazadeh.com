#!/usr/bin/env python3
"""Read-only source contract checks. Run from repository root. No network or deploy."""
import json,pathlib
from html.parser import HTMLParser
root=pathlib.Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.attrs={};self.links=[];self.robots=""
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="html": self.attrs=a
        if tag=="a" and a.get("href"):self.links.append(a["href"])
        if tag=="meta" and a.get("name")=="robots":self.robots=a.get("content","")
def load(path):
    p=Page();p.feed((root/path).read_text(encoding="utf-8"));return p
def main():
    r=json.loads((root/"platform/jrei-commercial-preview-registry.json").read_text(encoding="utf-8"))
    assert r["default_locale"]=="fa"
    for l in r["locales"]:
        for route in ["jrei","jrei-academic","forge","forge/workspace","jrei/seo"]:
            path=f"{l}/{route}/index.html";p=load(path)
            assert p.attrs.get("lang")==l,path
            assert p.attrs.get("dir")==("ltr" if l=="en" else "rtl"),path
            assert "noindex" in p.robots and "nofollow" in p.robots,path
            for href in p.links:
                if href.startswith("/") and not href.startswith("//") and "#" not in href and "?" not in href:
                    dest=root/href.lstrip("/")
                    assert dest.exists() or (dest/"index.html").exists(),(path,href)
        h=load(f"{l}/jrei/index.html")
        for field in ["login","dashboard","orders_route"]:
            assert r["existing_authority"][field][l] in h.links,(l,field)
    for product in r["products"]:
        assert all(product[x] is False for x in ["checkout_enabled","engine_enabled","entitlement_grant_enabled"])
        assert product["price"] is None and product["catalog_service_id"] is None
        for l,path in [("fa","fa/customer-dashboard/index.html"),("en","en/account/index.html")]:
            assert product["routes"][l] in load(path).links
            assert product["routes"][l] in load(f"{l}/index.html").links
    print("PASS: 15 preview pages, locale, robots, navigation and disabled commerce contract")
if __name__=="__main__":main()
