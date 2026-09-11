import {readFile, writeFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const label = (item) => `설치사례 ${String(item.number).padStart(2, '0')}`;
const sizes = '(max-width: 600px) 46vw, (max-width: 900px) 30vw, 390px';

function image(photo, className = '') {
  return `<img${className ? ` class="${className}"` : ''} src="${escape(photo.thumbnail)}" srcset="${escape(photo.thumbnail)} ${Math.min(768, photo.width)}w, ${escape(photo.image)} ${photo.width}w" sizes="${sizes}" width="${photo.width}" height="${photo.height}" alt="${escape(photo.alt)}" loading="lazy" decoding="async">`;
}

function card(item) {
  const name = label(item);
  const albumId = `${item.id}-photos`;
  const count = item.photos.length;
  const cover = [item.cover, ...item.highlights].map((index, position) => image(item.photos[index], position ? 'case-project__extra' : '')).join('\n              ');
  const photos = item.photos.map((photo) => `            <figure class="case-photo-card">
              <a class="case-photo" href="${escape(photo.image)}" data-case-photo data-case-title="${escape(photo.title)}" aria-label="${escape(name)} ${escape(photo.title)} 사진 크게 보기">${image(photo)}</a>
              <figcaption>${escape(photo.title)}</figcaption>
            </figure>`).join('\n');
  return `        <article class="case-project" id="${item.id}" data-case-album data-case-name="${escape(name)}">
          <a class="case-project__cover" href="#${albumId}" data-case-open aria-label="${escape(name)} ${escape(item.title)} 사진 ${count}장 보기">
              ${cover}
          </a>
          <div class="case-project__info">
            <div>
              <p class="case-project__number">${escape(name)}</p>
              <h3>${escape(item.title)}</h3>
              <ul class="case-project__tags">${item.tags.map((tag) => `<li>${escape(tag)}</li>`).join('')}</ul>
            </div>
            <a class="case-project__view" href="#${albumId}" data-case-open aria-label="${escape(name)} 사진 ${count}장 보기">사진 ${count}장 보기 <span aria-hidden="true">+</span></a>
          </div>
          <details class="case-album" id="${albumId}">
            <summary>${escape(name)} 사진 전체 펼쳐 보기</summary>
            <div class="case-photo-grid">
${photos}
            </div>
          </details>
        </article>`;
}

export function renderSection(cases, home = false) {
  const visible = home ? cases.slice(0, 12) : cases;
  return `  <section class="installation-cases" id="installation-cases" aria-labelledby="installation-cases-title">
    <div class="installation-cases__inner">
      <div class="installation-cases__heading">
        <p class="installation-cases__eyebrow">REAL INSTALLATION</p>
        <h2 id="installation-cases-title">성인인증기 <span>실제 설치사례</span></h2>
      </div>
      <div class="case-project-grid">
${visible.map(card).join('\n')}
      </div>${home ? '\n      <div class="installation-cases__footer"><a class="installation-cases__link" href="adult-verification.html#installation-cases">설치사례 전체 보기 <span aria-hidden="true">→</span></a></div>' : ''}
    </div>
  </section>`;
}

async function main() {
  const {cases} = JSON.parse(await readFile(resolve(root, 'content/installation-cases.json'), 'utf8'));
  if (!Array.isArray(cases) || !cases.length) throw new Error('At least one documented installation is required.');
  const ids = new Set();
  const numbers = new Set();
  for (const item of cases) {
    if (!/^installation-\d+$/.test(item.id) || ids.has(item.id) || !Number.isInteger(item.number) || item.number < 1 || numbers.has(item.number)) throw new Error('Installation IDs and numbers must be unique.');
    ids.add(item.id); numbers.add(item.number);
    if (!item.title || !Array.isArray(item.tags) || !item.photos?.length || !Array.isArray(item.highlights) || item.highlights.length > 2) throw new Error(`Incomplete installation: ${item.id}`);
    const covers = [item.cover, ...item.highlights];
    if (new Set(covers).size !== covers.length || covers.some((index) => !Number.isInteger(index) || !item.photos[index])) throw new Error(`Invalid cover: ${item.id}`);
    for (const photo of item.photos) {
      if (!photo.title || !photo.alt || !Number.isInteger(photo.width) || !Number.isInteger(photo.height) || photo.width < 1 || photo.height < 1) throw new Error(`Incomplete photo: ${item.id}`);
      for (const path of [photo.image, photo.thumbnail]) {
        if (!/^assets\/images\/installations\/[a-zA-Z0-9_/-]+\.webp$/.test(path)) throw new Error(`Invalid photo path: ${path}`);
        await access(resolve(root, path));
      }
    }
  }
  const start = '  <!-- INSTALLATION_CASES_START -->';
  const end = '  <!-- INSTALLATION_CASES_END -->';
  for (const name of ['index.html', 'adult-verification.html']) {
    const path = resolve(root, name);
    const source = await readFile(path, 'utf8');
    const first = source.indexOf(start), last = source.indexOf(end);
    if (first < 0 || last < first) throw new Error(`Missing installation section markers in ${name}`);
    await writeFile(path, source.slice(0, first) + start + '\n' + renderSection(cases, name === 'index.html') + '\n' + source.slice(last));
  }
  console.log(`Rendered ${cases.length} installation album(s) on both pages.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
