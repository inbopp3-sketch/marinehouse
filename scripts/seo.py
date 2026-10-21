#!/usr/bin/env python3
"""Build the public sitemap and validate crawlability without third-party packages.

Update lastmod in content/seo-pages.json only when the corresponding page changes.
After editing installations: node scripts/render-installation-cases.mjs
Then: python3 scripts/seo.py --write-sitemap && python3 scripts/seo.py
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, unquote
from urllib.robotparser import RobotFileParser
from datetime import date
import argparse
import collections
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / 'content/seo-pages.json').read_text())
BASE = CONFIG['origin']
NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'
IMAGES = 'http://www.google.com/schemas/sitemap-image/1.1'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.tags = []
        self.feed(source)
    def find(self, tag, **attrs):
        return [a for t,a in self.tags if t == tag and all(a.get(k) == v for k,v in attrs.items())]
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

def local_file(url):
    parsed = urlparse(url)
    if parsed.netloc != urlparse(BASE).netloc:
        return None
    p = ROOT / unquote(parsed.path).lstrip('/')
    return p / 'index.html' if p.is_dir() else p

def build():
    ET.register_namespace('', NS)
    ET.register_namespace('image', IMAGES)
    doc = ET.Element(f'{{{NS}}}urlset')
    for page in CONFIG['pages']:
        row = ET.SubElement(doc, f'{{{NS}}}url')
        ET.SubElement(row, f'{{{NS}}}loc').text = page['url']
        ET.SubElement(row, f'{{{NS}}}lastmod').text = page['lastmod']
        # Each installation photo has one representative owner in the sitemap.
        # Existing visible albums on the homepage and product page remain intact.
        if page['path'] == 'cases.html':
            cases = json.loads((ROOT/'content/installation-cases.json').read_text())['cases']
            for case in cases:
                for photo in case['photos']:
                    image = ET.SubElement(row, f'{{{IMAGES}}}image')
                    ET.SubElement(image, f'{{{IMAGES}}}loc').text = urljoin(BASE, photo['image'])
    ET.indent(doc, space='  ')
    return ET.tostring(doc, encoding='unicode', xml_declaration=True) + '\n'

def validate():
    errors=[]
    def check(ok, text):
        if not ok: errors.append(text)
    robots = RobotFileParser()
    robots.parse((ROOT/'robots.txt').read_text().splitlines())
    sitemap = ET.parse(ROOT/'sitemap.xml')
    sitemap_urls = [e.text for e in sitemap.findall(f'.//{{{NS}}}loc')]
    expected_urls=[p['url'] for p in CONFIG['pages']]
    check(len(sitemap_urls)==len(set(sitemap_urls)), 'Duplicate sitemap URLs')
    check(set(sitemap_urls)==set(expected_urls), 'Sitemap does not match public canonical pages')
    check((ROOT/'sitemap.xml').read_text()==build(), 'Sitemap is stale; run python3 scripts/seo.py --write-sitemap')
    check(BASE+'sitemap.xml' in (ROOT/'robots.txt').read_text(), 'Missing sitemap discovery in robots.txt')
    parsed_pages={}
    sources={}
    for f in ROOT.rglob('*.html'):
        if '.git' in f.parts or f.name.startswith('naver'):continue
        source=f.read_text();sources[f]=source;parsed_pages[f]=Page(source)
    all_titles=[];all_descriptions=[]
    for record in CONFIG['pages']:
        path,url=record['path'],record['url'];f=ROOT/path
        check(f.exists(), f'{path}: missing file')
        if not f.exists():continue
        source,parsed=sources[f],parsed_pages[f]
        titles=re.findall(r'<title>(.*?)</title>',source,re.S|re.I)
        check(len(titles)==1 and bool(titles[0].strip()),f'{path}: expected one title')
        all_titles.extend(titles)
        descriptions=parsed.find('meta',name='description')
        check(len(descriptions)==1 and bool(descriptions[0].get('content')),f'{path}: expected one description')
        all_descriptions.extend([d.get('content') for d in descriptions])
        check(len(parsed.find('h1'))==1,f'{path}: expected one H1')
        check(len(parsed.find('link',rel='canonical'))==1 and parsed.find('link',rel='canonical')[0].get('href')==url,f'{path}: wrong canonical')
        for agent in ['Googlebot','Yeti','bingbot','OAI-SearchBot']:
            check(robots.can_fetch(agent,url),f'{path}: robots blocks {agent}')
        for m in parsed.find('meta'):
            if m.get('name','').lower() in ['robots','googlebot','bingbot','yeti']:
                check(not re.search(r'\b(noindex|none)\b',m.get('content',''),re.I),f'{path}: page is noindex')
        check(not parsed.find('meta',**{'http-equiv':'refresh'}),f'{path}: meta refresh on canonical page')
        for key in ['og:title','og:description','og:url','og:image','og:type','og:site_name','og:locale','og:image:alt']:
            tags=parsed.find('meta',property=key);check(len(tags)==1 and bool(tags[0].get('content')),f'{path}: missing/duplicate {key}')
        og=parsed.find('meta',property='og:url');check(bool(og) and og[0].get('content')==url,f'{path}: OG URL differs from canonical')
        for key in ['og:image','twitter:image']:
            tags=parsed.find('meta',**({'property':key} if key.startswith('og:') else {'name':key}))
            check(len(tags)==1 and tags[0].get('content','').startswith('https://'),f'{path}: {key} needs absolute HTTPS URL')
            if tags:
                image=local_file(tags[0].get('content',''));check(image is not None and image.is_file(),f'{path}: missing share image')
        for image in parsed.find('img'):
            check('alt' in image,f'{path}: image without alt')
            check(all(image.get(k,'').isdigit() and int(image[k])>0 for k in ['width','height']),f'{path}: image without intrinsic dimensions {image.get("src")}')
        ids=[a['id'] for _,a in parsed.tags if 'id' in a]
        check(len(ids)==len(set(ids)),f'{path}: duplicate element IDs')
        blocks=re.findall(r'<script\b[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',source,re.S)
        check(bool(blocks),f'{path}: missing structured data')
        graph=[]
        for b in blocks:
            try:
                d=json.loads(b);check(d.get('@context')=='https://schema.org',f'{path}: wrong schema context');graph.extend(d.get('@graph',[d]))
            except Exception as e:errors.append(f'{path}: invalid JSON-LD: {e}')
        web=[n for n in graph if n.get('@id')==url+'#webpage'];check(len(web)==1,f'{path}: missing canonical WebPage node')
        if path!='index.html':
            crumbs=[n for n in graph if n.get('@type')=='BreadcrumbList'];check(len(crumbs)==1,f'{path}: missing breadcrumb schema')
        if path=='adult-verification.html':
            for node in graph:
                if node.get('@type')=='FAQPage':
                    for question in node['mainEntity']:
                        check(question['name'] in source and question['acceptedAnswer']['text'] in source,f'{path}: schema FAQ differs from visible content: {question["name"]}')
        date.fromisoformat(record['lastmod'])
    check(len(all_titles)==len(set(all_titles)), 'Duplicate public page titles')
    check(len(all_descriptions)==len(set(all_descriptions)), 'Duplicate public page descriptions')
    # Every canonical page must be reachable from the homepage using HTML links.
    links=collections.defaultdict(set)
    for f,parsed in parsed_pages.items():
        if f.name.startswith('_'):continue  # editorial templates contain intentional placeholder URLs
        url=urljoin(BASE,str(f.relative_to(ROOT)))
        for tag,a in parsed.tags:
            attrs=['src'] if tag in ['img','script','iframe'] else ['href'] if tag in ['a','link'] else []
            resources=[a[k] for k in attrs if a.get(k)]
            if tag in ['img','source'] and a.get('srcset'):
                resources.extend(v.strip().split()[0] for v in a['srcset'].split(','))
            for resource in resources:
                resolved=urljoin(url,resource);p=local_file(resolved)
                if p is None:continue
                check(p.exists(),f'{f.relative_to(ROOT)}: missing local target {resource}')
                if tag=='a' and p in parsed_pages:
                    links[f].add(p)
                    fragment=unquote(urlparse(resolved).fragment)
                    if fragment:check(any(a.get('id')==fragment for _,a in parsed_pages[p].tags),f'{f.relative_to(ROOT)}: broken fragment {resource}')
    reached=set();pending=[ROOT/'index.html']
    while pending:
        p=pending.pop()
        if p in reached:continue
        reached.add(p);pending.extend(links[p]-reached)
    for p in CONFIG['pages']:check(ROOT/p['path'] in reached,f'{p["path"]}: orphan canonical page')
    for e in sitemap.findall(f'.//{{{IMAGES}}}loc'):
        p=local_file(e.text);check(p is not None and p.is_file(),f'Missing sitemap image {e.text}')
    for f in ['404.html','_press_template.html','_press_upload_guide.html','1/privacy.html','startup/privacy.html']:
        p=parsed_pages[ROOT/f];check(any('noindex' in a.get('content','') for a in p.find('meta',name='robots')),f'{f}: utility page must be noindex')
    if errors:
        print('\n'.join(errors));return 1
    print(f'SEO checks passed: {len(expected_urls)} canonical pages; {len(sitemap.findall(f".//{{{IMAGES}}}loc"))} installation images; metadata, JSON-LD, crawlability, links, images and sitemap agree.')
    return 0

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--write-sitemap',action='store_true');args=parser.parse_args()
    if args.write_sitemap:(ROOT/'sitemap.xml').write_text(build());print('Wrote sitemap.xml')
    sys.exit(validate())
