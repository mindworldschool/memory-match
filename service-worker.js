// v2: переход на общую оболочку trainer-shell. Новое имя удаляет старый кэш у посетителей.
const CACHE = 'memory-match-v2';

// базовые статические ресурсы
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  // основные картинки/звуки
  'assets/leo_mascot.png',
  'assets/ui/wrong_overlay.png',
  'assets/sfx/scroll.wav',
  'assets/sfx/correct.wav',
  'assets/sfx/wrong_user.mp3',
  'assets/sfx/finish.wav',
  'assets/sfx/drop.wav',
  'assets/sounds/triumf.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  // Новая версия включается сразу, не дожидаясь закрытия всех вкладок
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Чужие адреса (шрифты Google, аналитика) — без вмешательства
  if (url.origin !== self.location.origin) return;

  // Сеть в приоритете для страницы, кода, стилей, оболочки и JSON-списков:
  // так правки на сайте доходят сразу, а кэш нужен только без сети.
  const isCode = request.mode === 'navigate' ||
    /\.(html|js|css|json)$/.test(url.pathname) ||
    url.pathname.endsWith('/') ||
    url.pathname.startsWith('/trainer-shell/');

  if (isCode) {
    event.respondWith(
      fetch(request).then((r) => {
        if (r.ok && url.pathname.startsWith(self.registration.scope.replace(self.location.origin, ''))) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return r;
      }).catch(() => caches.match(request))
    );
  } else {
    // Картинки и звуки — из кэша, если уже есть
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
