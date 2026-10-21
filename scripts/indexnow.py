#!/usr/bin/env python3
"""Notify IndexNow only after the exact sitemap and verification key are live."""
from pathlib import Path
import json
import concurrent.futures
import hashlib
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
    config=json.loads((ROOT/'content/seo-pages.json').read_text())
    targets={page['url']:(ROOT/page['path']).read_bytes() for page in config['pages']}
    for path in ['sitemap.xml','robots.txt','rss.xml','llms.txt']:
        targets[BASE+path]=(ROOT/path).read_bytes()
    def is_current(pair):
        url,source=pair
        try:
            stamp=hashlib.sha256(source).hexdigest()[:16]
            status,body=request(url+'?indexnow-check='+stamp)
            return url,status==200 and body==source
        except (urllib.error.URLError,TimeoutError):return url,False
    pending=dict(targets)
    for attempt in range(25):
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            results=list(pool.map(is_current,pending.items()))
        pending={url:targets[url] for url,ok in results if not ok}
        if not pending:break
        if attempt==24:raise SystemExit('Deployment is not current; refusing to submit stale URLs: '+', '.join(pending))
        time.sleep(6)
    print(f'Verified {len(targets)} live files match the deployment source.')
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
