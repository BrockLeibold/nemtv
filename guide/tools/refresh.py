"""NEMTV guide refresh: lines/pairs/goalies/out + per-team news from free sources, then build, commit, push, docker.

Sources (all free, no key): DailyFaceoff line combinations (page __NEXT_DATA__), ESPN injuries + news JSON,
NHL roster API for name -> player id. Only touches notes.json lines/pairs/goalies/out/linesAsOf (+updated) and
news.json items/injuries (+updated). A failed source or an unmapped name keeps the old value (logged).
Run: cd guide && python -I tools/refresh.py   (stdlib only). Exit code 1 on failure.
Flags: --no-publish (data only), --no-docker.
"""
import json, os, re, urllib.parse, subprocess, sys, time, unicodedata, urllib.request, datetime as dt

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
REPO = os.path.dirname(SITE)
NOTES = os.path.join(HERE, 'notes.json')
NEWS = os.path.join(SITE, 'news.json')
LOG = os.path.join(HERE, 'refresh.log')
UA = {'User-Agent': 'Mozilla/5.0'}
ARGS = set(sys.argv[1:])

# ---------- logging ----------
if os.path.exists(LOG) and os.path.getsize(LOG) > 200_000:
    try: os.replace(LOG, LOG + '.1')
    except OSError: pass
_lf = open(LOG, 'a', encoding='utf-8')
def log(*a):
    s = ' '.join(str(x) for x in a)
    line = f"{dt.datetime.now():%Y-%m-%d %H:%M:%S} {s}"
    _lf.write(line + '\n'); _lf.flush()
    try: print(line)
    except Exception: print(line.encode('ascii', 'replace').decode())

# ---------- time (America/Toronto without tzdata) ----------
def toronto_now():
    u = dt.datetime.now(dt.timezone.utc)
    y = u.year
    def nth_sun(month, n):
        d = dt.date(y, month, 1)
        d += dt.timedelta(days=(6 - d.weekday()) % 7 + 7 * (n - 1))
        return d
    start = dt.datetime.combine(nth_sun(3, 2), dt.time(2)) + dt.timedelta(hours=5)   # 2am EST in UTC
    end = dt.datetime.combine(nth_sun(11, 1), dt.time(2)) + dt.timedelta(hours=4)    # 2am EDT in UTC
    off = -4 if start <= u.replace(tzinfo=None) < end else -5
    return u.astimezone(dt.timezone(dt.timedelta(hours=off)))
NOW = toronto_now()
STAMP = NOW.strftime('%Y-%m-%dT%H:%M:%S') + f"{NOW.strftime('%z')[:3]}:{NOW.strftime('%z')[3:]}"

# ---------- http ----------
def fetch(url, tries=3):
    err = None
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read().decode('utf-8')
        except Exception as e:
            err = e; time.sleep(1.5 * (i + 1))
    raise err

def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[^a-z0-9 ]", ' ', s.replace('-', ' '))
    return re.sub(r'\s+', ' ', s).strip()

def slug(name): return norm(name).replace(' ', '-')

SUFFIX = {'jr', 'sr', 'ii', 'iii', 'iv'}
def lastname(n):
    p = [w for w in norm(n).split() if w not in SUFFIX]
    return p[-1] if p else ''

# ---------- load ----------
notes = json.load(open(NOTES, encoding='utf-8'))
news = json.load(open(NEWS, encoding='utf-8'))
teams = sorted(notes['teams'])
stats = {'mapped': 0, 'total': 0, 'teams_changed': set(), 'unmapped': []}

def teamdata(ab):
    return json.load(open(os.path.join(SITE, 'data', f'{ab}.json'), encoding='utf-8', errors='replace'))

class Roster:
    """name -> NHL id for one team: live roster API plus the last built data file."""
    def __init__(self, ab):
        self.ab, self.extra = ab, set()
        self.people = []   # (id, norm full, norm last, pos group)
        try:
            r = json.loads(fetch(f'https://api-web.nhle.com/v1/roster/{ab}/current'))
            for key in ('forwards', 'defensemen', 'goalies'):
                for p in r.get(key, []):
                    full = f"{p['firstName']['default']} {p['lastName']['default']}"
                    self.people.append((p['id'], norm(full), norm(p['lastName']['default']), p.get('positionCode', '')))
        except Exception as e:
            log(ab, 'roster API failed, using data file:', e)
        have = {p[0] for p in self.people}
        try:
            for p in teamdata(ab)['players']:
                if p['id'] not in have:
                    self.people.append((p['id'], norm(f"{p['first']} {p['last']}"), norm(p['last']), p.get('pos', '')))
        except Exception as e:
            log(ab, 'data file read failed:', e)

    def find(self, name, pos=None):
        stats['total'] += 1
        n = norm(name)
        hit = [p for p in self.people if p[1] == n]
        if len(hit) != 1:
            ln = lastname(name)
            c = [p for p in self.people if p[2].split(' ')[-1] == ln]
            if pos: c = [p for p in c if self._ok(p[3], pos)] or ([] if len(c) > 1 else c)
            hit = c if len(c) == 1 else (hit or [])
        if len(hit) == 1:
            stats['mapped'] += 1; return hit[0][0]
        pid = self.search(name)
        if pid:
            stats['mapped'] += 1; stats['search'] = stats.get('search', 0) + 1; return pid
        stats['unmapped'].append(name); return None

    def search(self, name):
        """Fallback for players the roster endpoint omits (IR/LTIR): NHL search, exact name on this team only.
        The id goes into notes extras so build.py keeps the player."""
        try:
            q = urllib.parse.quote(name)
            r = json.loads(fetch(f'https://search.d3.nhle.com/api/v1/search/player?culture=en-us&limit=8&q={q}&active=true', 2))
        except Exception as e:
            log(self.ab, 'search failed for', name, e); return None
        c = [p for p in r if norm(p['name']) == norm(name) and self.ab in (p.get('teamAbbrev'), p.get('lastTeamAbbrev'))]
        if len(c) != 1: return None
        pid = int(c[0]['playerId'])
        self.extra.add(pid); return pid

    @staticmethod
    def _ok(code, pos):
        if pos in ('lw', 'rw', 'c'): return code in ('L', 'R', 'C', 'W')
        if pos in ('ld', 'rd'): return code == 'D'
        if pos in ('g1', 'g2'): return code == 'G'
        return True

# ---------- ESPN ----------
espn_inj, espn_news = None, None
try:
    espn_inj = {norm(t['displayName']): t['injuries'] for t in json.loads(fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries'))['injuries']}
    log('ESPN injuries ok:', len(espn_inj), 'teams')
except Exception as e:
    log('ESPN injuries FAILED, keeping old injuries:', e)
try:
    espn_news = json.loads(fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/news?limit=100'))['articles']
    log('ESPN news ok:', len(espn_news), 'articles')
except Exception as e:
    log('ESPN news FAILED, keeping old items:', e)

def short_status(s):
    s = (s or '').strip()
    low = s.lower()
    if low.startswith('injured reserve'): return 'IR'
    if 'long term' in low or low == 'ltir': return 'LTIR'
    return low.replace('day-to-day', 'day-to-day')

def inj_text(name, status, short):
    m = re.search(r'\(([^)]+)\)', short or '')
    detail = m.group(1) if m else ''
    st = short_status(status)
    inner = ', '.join(dict.fromkeys(x for x in (detail, st) if x))
    return f"{name} ({inner})" if inner else name

# ---------- per team ----------
changed_news = 0
for i, ab in enumerate(teams):
    meta = notes['teams'][ab]
    full = teamdata(ab)['name']
    roster = Roster(ab)
    try:
        if i: time.sleep(1.0)   # throttle DailyFaceoff: 1 request/second
        html = fetch(f'https://www.dailyfaceoff.com/teams/{slug(full)}/line-combinations')
        data = json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))
        comb = data['props']['pageProps']['combinations']
        pl = comb['players']
    except Exception as e:
        log(ab, 'DailyFaceoff FAILED, keeping old lines:', e)
        pl = None

    lineup_ids = set()
    if pl:
        def grp(prefix, positions, size):
            rows = []
            for g in range(1, size + 1):
                by = {p['positionIdentifier']: p for p in pl if p['groupName'] == f'{prefix} {g}'}
                if not all(k in by for k in positions): return None
                rows.append([roster.find(by[k]['name'], k) for k in positions])
            return rows
        ok = lambda rows, w: rows and all(len(r) == w and None not in r for r in rows) and len({x for r in rows for x in r}) == w * len(rows)
        F = grp('Forwards', ['lw', 'c', 'rw'], 4)
        D = grp('Defense', ['ld', 'rd'], 3)
        gl = {p['positionIdentifier']: p for p in pl if p['groupName'] == 'Goalies'}
        G = [roster.find(gl[k]['name'], k) for k in ('g1', 'g2') if k in gl]
        date = ''
        try:
            u = dt.datetime.fromisoformat(comb['updatedAt'].replace('Z', '+00:00')).astimezone(NOW.tzinfo)
            date = f"{u.strftime('%b')} {u.day}"
        except Exception:
            date = f"{NOW.strftime('%b')} {NOW.day}"
        touched = False
        if ok(F, 3): meta['lines'] = F; touched = True
        else: log(ab, 'forward lines not fully mapped, kept old')
        if ok(D, 2): meta['pairs'] = D; touched = True
        else: log(ab, 'D pairs not fully mapped, kept old')
        if len(G) == 2 and None not in G: meta['goalies'] = G; touched = True
        elif len(G) == 1 and G[0]: meta['goalies'] = G; touched = True
        else: log(ab, 'goalies not mapped, kept old')
        lineup_ids = {x for r in (meta.get('lines', []) + meta.get('pairs', [])) for x in r} | set(meta.get('goalies', []))
        ex = meta.setdefault('extras', [])
        ex += [x for x in sorted(roster.extra) if x not in ex and x in lineup_ids]
        if touched: meta['linesAsOf'] = f"DailyFaceoff {date}"; stats['teams_changed'].add(ab)

    # injuries / out
    inj = espn_inj.get(norm(full), []) if espn_inj is not None else None
    dfo_ir = [p for p in (pl or []) if p['groupName'] == 'Injured Reserve']
    if inj is not None or pl:
        entries, seen = [], set()
        for e in (inj or []):
            nm = e['athlete']['displayName']
            pid = roster.find(nm, None)
            entries.append((pid, nm, e.get('status'), e.get('shortComment'), norm(nm)))
        espn_names = {x[4] for x in entries}
        for p in dfo_ir:
            if norm(p['name']) in espn_names: continue
            stt = (p.get('injuryStatus') or '').lower()
            entries.append((roster.find(p['name'], None), p['name'], {'ir': 'Injured Reserve'}.get(stt, stt), '', norm(p['name'])))
        out_ids = []
        for pid, nm, stt, sc, _ in entries:
            if pid and pid not in lineup_ids and pid not in out_ids:
                out_ids.append(pid)
                if pid in roster.extra and pid not in meta.setdefault('extras', []): meta['extras'].append(pid)
        if (inj is not None or dfo_ir) and (out_ids or inj is not None):
            if out_ids != meta.get('out'):
                meta['out'] = out_ids; stats['teams_changed'].add(ab)
        if inj is not None:
            t = news['teams'].setdefault(ab, {})
            lst = [inj_text(nm, stt, sc) for _, nm, stt, sc, _ in entries][:8]
            if lst != t.get('injuries'):
                t['injuries'] = lst; changed_news += 1

# ---------- news items ----------
if espn_news is not None:
    name2ab = {norm(teamdata(ab)['name']): ab for ab in teams}
    cutoff = (NOW - dt.timedelta(days=7)).date().isoformat()
    for a in espn_news:
        href = (a.get('links') or {}).get('web', {}).get('href', '')
        if not href or '/video/' in href or not a.get('headline'): continue
        abs_ = {name2ab[norm(c.get('description'))] for c in a.get('categories', []) if c.get('type') == 'team' and norm(c.get('description')) in name2ab}
        if not abs_ or len(abs_) > 2: continue
        item = {'title': a['headline'].strip(), 'summary': (a.get('description') or '').strip(), 'source': 'ESPN', 'url': href, 'date': (a.get('published') or '')[:10]}
        if item['date'] < cutoff: continue
        for ab in abs_:
            t = news['teams'].setdefault(ab, {})
            items = t.setdefault('items', [])
            if any(x.get('url') == href or norm(x.get('title')) == norm(item['title']) for x in items): continue
            items.append(item); changed_news += 1
    for ab, t in news['teams'].items():
        items = t.get('items', [])
        if len(items) > 8:
            items.sort(key=lambda x: x.get('date', ''), reverse=True)   # stable: keeps order within a day
            t['items'] = items[:8]
        else:
            items.sort(key=lambda x: x.get('date', ''), reverse=True)

# ---------- write ----------
notes['updated'] = STAMP
news['updated'] = STAMP
def dump(obj, path): open(path, 'w', encoding='utf-8').write(json.dumps(obj, ensure_ascii=False, indent=1))
dump(notes, NOTES); dump(news, NEWS)
log(f"mapping {stats['mapped']}/{stats['total']} names; teams with notes changes {len(stats['teams_changed'])}/32; news/injury edits {changed_news}")
if stats['unmapped']: log('unmapped:', '; '.join(sorted(set(stats['unmapped']))))
if len(stats['teams_changed']) < 16:
    log('FAIL: fewer than half the teams updated, sources likely broken'); sys.exit(1)

# ---------- build / publish ----------
def run(cmd, cwd, shell=False):
    log('$', cmd if isinstance(cmd, str) else ' '.join(cmd))
    r = subprocess.run(cmd, cwd=cwd, shell=shell, capture_output=True, text=True, encoding='utf-8', errors='replace')
    tail = (r.stdout + r.stderr).strip().splitlines()[-12:]
    for l in tail: log('  ', l)
    return r.returncode

if run([sys.executable, '-I', '-X', 'utf8', 'tools/build.py', '.'], SITE): log('FAIL build.py'); sys.exit(1)
if '--no-publish' in ARGS: sys.exit(0)

PATHS = ['guide/data', 'guide/news.json', 'guide/tools']   # never deck.css/heroes/etc: only what refresh owns
if run(['git', 'add', '--'] + PATHS, REPO): sys.exit(1)
if subprocess.run(['git', 'diff', '--cached', '--quiet', '--'] + PATHS, cwd=REPO).returncode == 0:
    log('no guide changes to commit')
else:
    msg = f"Guide refresh {NOW:%Y-%m-%d} {'am' if NOW.hour < 12 else 'pm'}"
    if run(['git', '-c', 'user.name=Brock Leibold', '-c', 'user.email=broxton.leibold@gmail.com', 'commit', '-m', msg, '--only', '--'] + PATHS, REPO): log('FAIL commit'); sys.exit(1)
    if run(['git', 'push', 'origin', 'main'], REPO): log('FAIL push'); sys.exit(1)

if '--no-docker' in ARGS: sys.exit(0)
steps = ['bash build.sh', 'node web/stage.js',
         'docker compose -f web/docker-compose.yml build nemtv', 'docker rm -f nemtv',
         'docker compose -f web/docker-compose.yml create nemtv']
for s in steps:
    if run(s, REPO, shell=True): log('FAIL', s); sys.exit(1)
log('refresh done')
