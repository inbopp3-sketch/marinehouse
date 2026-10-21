#!/usr/bin/env python3
"""Notify IndexNow only after the exact sitemap and verification key are live."""
from pathlib import Path
import json
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent.parent
BASE='https://www.marinehouse.kr/'
KEY='fb1a9eebc00bcd84bd4bf2a288b49519'

def request(url, data=None):
    req=urllib.request.Request(url,data=data,headers={'User-Agent':'Marinehouse-SEO/1.0','Content-Type':'application/json; charset=utf-8'} if data else {'User-Agent':'Marinehouse-SEO/1.0'})
    with urllib.request.urlopen(req,timeout=30) as response:
        return response.status,response.read()

def main():
    expected=(ROOT/'sitemap.xml').read_bytes()
    for attempt in range(25):
        try:
            status,body=request(BASE+'sitemap.xml')
            if status==200 and body==expected:break
        except (urllib.error.URLError,TimeoutError):pass
        if attempt==24:raise SystemExit('Deployment sitemap is not current; refusing to submit stale URLs.')
        time.sleep(6)
    status,body=request(BASE+KEY+'.txt')
    if status!=200 or body.decode().strip()!=KEY:raise SystemExit('IndexNow verification key is not live.')
    doc=ET.fromstring(expected)
    urls=[e.text for e in doc.findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    payload=json.dumps({'host':'www.marinehouse.kr','key':KEY,'keyLocation':BASE+KEY+'.txt','urlList':urls}).encode()
    failures=[]
    for endpoint in ['https://searchadvisor.naver.com/indexnow','https://api.indexnow.org/indexnow']:
        try:
            code,_=request(endpoint,payload)
            print(f'{endpoint}: HTTP {code}; submitted {len(urls)} URLs (not proof of indexing).')
        except (urllib.error.URLError,TimeoutError) as exc:
            failures.append(endpoint);print(f'{endpoint}: submission failed: {exc}')
    return bool(failures)

if __name__=='__main__':raise SystemExit(main())
