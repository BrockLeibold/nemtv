#!/usr/bin/env python3
"""Rebuild the data files for the NHL Teams Guide artifact (all 32 teams).

Usage:  python3 -I tools/build.py <site_dir>
  <site_dir> holds tools/notes.json (hand-written notes) and receives:
    data/league.json      standings + team list for navigation (conference, points, colours, logo path)
    data/<ABBR>.json      one file per team: roster with bios, career teams, stats, headshot (embedded webp), schedule
    data/schedule.json    every league game this season (for the Games view)
    data/box/<YYYY-MM>.json  box scores (skater/goalie stat lines, scoring, three stars) for every finished game, by month
    logos/<ABBR>.svg      transparent team logos (downloaded if missing)
Pulls everything from the NHL stats API (api-web.nhle.com) and merges the notes.
Teams whose notes have "detail": "full" (Bruins, Leafs) get a report of players missing notes or contracts.
"""
import json, os, sys, io, base64, urllib.request, datetime
from concurrent.futures import ThreadPoolExecutor

SITE = sys.argv[1] if len(sys.argv) > 1 else '.'
SEASON = '20262027'
API = 'https://api-web.nhle.com/v1'
COLORS = {  # primary, secondary (official team colours)
 'ANA':('#FC4C02','#000000'),'BOS':('#FFB81C','#000000'),'BUF':('#003087','#FFB81C'),'CGY':('#C8102E','#F1BE48'),
 'CAR':('#CE1126','#000000'),'CHI':('#CF0A2C','#000000'),'COL':('#6F263D','#236192'),'CBJ':('#002654','#CE1126'),
 'DAL':('#006847','#8F8F8C'),'DET':('#CE1126','#FFFFFF'),'EDM':('#041E42','#FF4C00'),'FLA':('#C8102E','#041E42'),
 'LAK':('#111111','#A2AAAD'),'MIN':('#154734','#A6192E'),'MTL':('#AF1E2D','#192168'),'NSH':('#FFB81C','#041E42'),
 'NJD':('#CE1126','#000000'),'NYI':('#00539B','#F47D30'),'NYR':('#0038A8','#CE1126'),'OTT':('#C52032','#C2912C'),
 'PHI':('#F74902','#000000'),'PIT':('#000000','#FCB514'),'SJS':('#006D75','#EA7200'),'SEA':('#001628','#99D9D9'),
 'STL':('#002F87','#FCB514'),'TBL':('#002868','#FFFFFF'),'TOR':('#00205B','#FFFFFF'),'UTA':('#010101','#6CACE4'),
 'VAN':('#00205B','#00843D'),'VGK':('#B4975A','#333F42'),'WSH':('#041E42','#C8102E'),'WPG':('#041E42','#004C97')}
ABBR = {'Utah Hockey Club':'UTA','Arizona Coyotes':'ARI','Phoenix Coyotes':'PHX','Montreal Canadiens':'MTL',
        'Atlanta Thrashers':'ATL','Mighty Ducks of Anaheim':'ANA'}
PRE_OK = {'AHL','WHL','USHL','OHL','NCAA','QMJHL','SHL','KHL','Sweden','Sweden-2','HockeyAllsvenskan','MHL',
          'DEL','ICEHL','CzRep','Liiga','BCHL','NTDP','USDP','ECHL','VHL','Russia','Big Ten','NLA','Swiss','Czech','Finland'}
RENAME = {'Boston':'Boston University','Maine':'University of Maine','Sodertalje':'Södertälje SK','Brynas':'Brynäs IF',
          'Rogle':'Rögle BK','Liberec':'Bili Tygri Liberec','London':'London Knights','San Antonio':'San Antonio Rampage',
          'Omaha':'Omaha Lancers','Indiana':'Indiana Ice','Providence':'Providence Bruins','Sarnia':'Sarnia Sting',
          'Albany':'Albany Devils','Sioux Falls':'Sioux Falls Stampede','USNTDP':'U.S. NTDP'}
COUNTRY = {'USA':'United States','CAN':'Canada','SWE':'Sweden','CZE':'Czechia','RUS':'Russia','DEU':'Germany',
           'FIN':'Finland','LVA':'Latvia','FRA':'France','CHE':'Switzerland','SVK':'Slovakia','DNK':'Denmark',
           'AUT':'Austria','NOR':'Norway','BLR':'Belarus','KAZ':'Kazakhstan','SVN':'Slovenia','GBR':'Great Britain',
           'UKR':'Ukraine','AUS':'Australia','NLD':'Netherlands','POL':'Poland','JPN':'Japan','ITA':'Italy','HUN':'Hungary'}

def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception:
            if i == tries - 1: raise

def getj(path): return json.loads(get(API + path))

try:
    from PIL import Image
except ImportError:
    Image = None

def photo(url):
    """Download a headshot and return a small embedded webp data URI (keeps the artifact's file count low)."""
    raw = get(url)
    if Image is None: return 'data:image/png;base64,' + base64.b64encode(raw).decode()
    im = Image.open(io.BytesIO(raw)).convert('RGBA'); im.thumbnail((128, 128))
    b = io.BytesIO(); im.save(b, 'WEBP', quality=72)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

notes = json.load(open(os.path.join(SITE, 'tools', 'notes.json')))
for d in ('data', 'logos'): os.makedirs(os.path.join(SITE, d), exist_ok=True)
standings = {t['teamAbbrev']['default']: t for t in getj('/standings/now')['standings']}
for ab, t in standings.items(): ABBR[t['teamName']['default']] = ab
report = []
generated = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
def yy(n): return str(n)[:4]

def player(ab, meta, pid, grp, rp):
    land = getj(f'/player/{pid}/landing')
    full = meta.get('detail') == 'full'
    n = dict(meta.get('players', {}).get(str(pid)) or {})
    pos = land.get('position') if rp is None else rp['positionCode']
    grp = grp or ('G' if pos == 'G' else 'D' if pos == 'D' else 'F')
    try: ph = photo(land.get('headshot') or f'https://assets.nhle.com/mugs/nhl/{SEASON}/{ab}/{pid}.png')
    except Exception as e:
        ph = None; report.append(f'{ab} {pid}: headshot failed {e}')
    dd = land.get('draftDetails')
    draft = f"{dd['year']} · Rd {dd['round']} · #{dd['overallPick']} · {dd['teamAbbrev']}" if dd else 'Undrafted'
    name = f"{land['firstName']['default']} {land['lastName']['default']}"
    if 'acq' not in n:
        if dd and dd['teamAbbrev'] == ab:
            n.update(acq='draft', when=str(dd['year']), how=f"Drafted {dd['overallPick']} overall by {ab} in {dd['year']}.")
        elif not dd:
            n.update(acq='undrafted', when='', how='Undrafted. Joined the team as a free agent or by trade.')
        else:
            n.update(acq='other', when='', how=f"Drafted by {dd['teamAbbrev']} ({dd['year']}, #{dd['overallPick']} overall); joined {ab} later by trade, waivers or free agency.")
        if full: report.append(f"{ab} {pid} {name}: NO NOTES (add to tools/notes.json)")
    n.setdefault('role', ''); n.setdefault('story', ''); n.setdefault('status', 'Active')
    if full and not n.get('contract'):
        report.append(f"{ab} {pid} {name}: NO CONTRACT (add contract {{aav, ends, fa, note?}} to tools/notes.json)")
    nhl, pre, seen, seasons = [], [], set(), []
    prev = now = None
    def add(acc, s):
        acc = acc or {'gp':0,'g':0,'a':0,'pts':0,'w':0,'l':0,'otl':0,'ga':0,'sa':0}
        acc['gp'] += s.get('gamesPlayed') or 0
        for k, f in (('g','goals'),('a','assists'),('pts','points'),('w','wins'),('l','losses'),('otl','otLosses'),('ga','goalsAgainst'),('sa','shotsAgainst')):
            acc[k] += s.get(f) or 0
        return acc
    for s in land.get('seasonTotals', []):
        if s['gameTypeId'] != 2: continue
        t = s['teamName']['default']; yr = s['season']
        row = {'s': yr, 'lg': s['leagueAbbrev'], 'gp': s.get('gamesPlayed') or 0}
        if grp == 'G':
            row.update(w=s.get('wins') or 0, l=s.get('losses') or 0, otl=s.get('otLosses') or s.get('ties') or 0, ga=s.get('goalsAgainst') or 0, sa=s.get('shotsAgainst') or 0, gaa=s.get('goalsAgainstAvg'), svp=s.get('savePctg'))
        else:
            row.update(g=s.get('goals') or 0, a=s.get('assists') or 0, p=s.get('points') or 0, pim=s.get('pim') or 0)
        if s['leagueAbbrev'] == 'NHL':
            a = ABBR.get(t, t[:3].upper())
            seasons.append(dict(row, t=a))
            if nhl and nhl[-1]['team'] == a: nhl[-1]['to'] = yr
            else: nhl.append({'team': a, 'name': t, 'from': yr, 'to': yr})
            if yr == int(SEASON) - 10001: prev = add(prev, s)
            if yr == int(SEASON): now = add(now, s)
        elif s['leagueAbbrev'] in PRE_OK:
            nm = RENAME.get(t.replace(' Univ.', '').replace('Univ. of ', '').strip(), t.replace(' Univ.', '').replace('Univ. of ', '').strip())
            seasons.append(dict(row, t=nm))
            if nm in seen: continue
            seen.add(nm); pre.append({'team': nm, 'league': s['leagueAbbrev'], 'from': yr})
    for st in (prev, now):
        if st and grp == 'G' and st['sa']: st['sv'] = round(1 - st['ga'] / st['sa'], 3)
    first_nhl = nhl[0]['from'] if nhl else 99999999
    pre = [x for x in pre if x['from'] < first_nhl or x['league'] == 'AHL'][-5:]
    status = n['status']
    for t in nhl: t['label'] = f"{yy(t['from'])}–{str(t['to'])[6:]}"
    if nhl and nhl[-1]['team'] == ab and status != 'AHL': nhl[-1]['label'] = yy(nhl[-1]['from']) + '–now'
    stints = [t for t in nhl if t['team'] == ab]
    bp = (land.get('birthStateProvince') or {}).get('default', '')
    return {
        'id': pid, 'num': land.get('sweaterNumber') or (rp or {}).get('sweaterNumber'),
        'first': land['firstName']['default'], 'last': land['lastName']['default'],
        'pos': {'C':'C','L':'LW','R':'RW','D':'D','G':'G'}.get(pos, pos), 'group': grp,
        'shoots': land.get('shootsCatches', ''), 'born': land.get('birthDate', ''),
        'city': (land.get('birthCity') or {}).get('default', ''), 'region': bp, 'country': land.get('birthCountry', ''),
        'countryName': COUNTRY.get(land.get('birthCountry'), land.get('birthCountry', '')),
        'ht': land.get('heightInInches'), 'wt': land.get('weightInPounds'), 'draft': draft, 'photo': ph,
        'nhl': [{'team': t['team'], 'name': t['name'], 'label': t['label']} for t in nhl],
        'pre': [{'team': x['team'], 'league': x['league']} for x in pre],
        'acq': n['acq'], 'when': n['when'], 'how': n['how'], 'role': n['role'], 'story': n['story'],
        'captain': pid == meta.get('captain'), 'status': status, 'contract': n.get('contract'),
        'since': int(yy(stints[-1]['from'])) if stints else None, 'prev': prev, 'now': now, 'seasons': seasons}

def team(ab):
    s = standings[ab]
    meta = notes['teams'].get(ab) or {}
    roster = getj(f'/roster/{ab}/current')
    entries = [(p, g) for key, g in (('forwards','F'),('defensemen','D'),('goalies','G')) for p in roster[key]]
    on_roster = {p['id'] for p, _ in entries}
    ids = [(p['id'], g, p) for p, g in entries] + [(x, None, None) for x in meta.get('extras', []) if x not in on_roster]
    with ThreadPoolExecutor(8) as ex:
        players = list(ex.map(lambda a: player(ab, meta, *a), ids))
    if meta.get('detail') == 'full':
        for pid in meta.get('players', {}):
            if int(pid) not in on_roster and int(pid) not in meta.get('extras', []):
                report.append(f"{ab} {pid}: in notes but no longer on the NHL roster (remove or add to extras with a status)")
    valid = {p['id'] for p in players}
    clean = lambda l: [x for x in l if x in valid]
    for key in ('lines', 'pairs'):
        for l in meta.get(key, []):
            for x in l:
                if x not in valid: report.append(f"{ab}: {key} uses {x}, not on the roster")
    sched = getj(f'/club-schedule-season/{ab}/{SEASON}')['games']
    for g in sched:
        if g['gameType'] in (2, 3): ALL_GAMES[g['id']] = g
    games = []
    for g in sched:
        if g['gameType'] not in (2, 3): continue
        home = g['homeTeam']['abbrev'] == ab
        us, them = (g['homeTeam'], g['awayTeam']) if home else (g['awayTeam'], g['homeTeam'])
        games.append({'id': g['id'], 'date': g['gameDate'], 'start': g['startTimeUTC'], 'type': g['gameType'],
                      'home': home, 'opp': them['abbrev'],
                      'oppName': f"{them['placeName']['default']} {them['commonName']['default']}", 'oppShort': them['commonName']['default'],
                      'venue': g['venue']['default'], 'state': g['gameState'],
                      'us': us.get('score'), 'them': them.get('score'),
                      'ot': (g.get('gameOutcome') or {}).get('lastPeriodType'),
                      'tv': sorted({b['network'] for b in g.get('tvBroadcasts', [])})})
    logo = os.path.join(SITE, 'logos', f'{ab}.svg')
    if not os.path.exists(logo):
        try: open(logo, 'wb').write(get(s.get('teamLogo') or f'https://assets.nhle.com/logos/nhl/svg/{ab}_light.svg'))
        except Exception as e: report.append(f'{ab}: logo failed {e}')
    out = {'generated': generated, 'notesUpdated': notes.get('updated'), 'contractsSource': notes.get('contractsSource') if meta.get('detail') == 'full' else None,
        'abbrev': ab, 'name': s['teamName']['default'], 'short': s['teamCommonName']['default'], 'place': s['placeName']['default'],
        'conference': s.get('conferenceName'), 'logo': f'logos/{ab}.svg', 'colors': COLORS.get(ab, ('#141217', '#827C89')),
        'detail': meta.get('detail', 'auto'), 'coach': meta.get('coach', ''), 'gm': meta.get('gm'),
        'record': f"{s.get('wins',0)}-{s.get('losses',0)}-{s.get('otLosses',0)}", 'points': s.get('points'),
        'gp': s.get('gamesPlayed'), 'division': s.get('divisionName'), 'divRank': s.get('divisionSequence'), 'confRank': s.get('conferenceSequence'),
        'streak': f"{s.get('streakCode','')}{s.get('streakCount','')}",
        'linesAsOf': meta.get('linesAsOf', ''), 'lines': [clean(l) for l in meta.get('lines', [])], 'pairs': [clean(l) for l in meta.get('pairs', [])],
        'goalies': clean(meta.get('goalies', [])), 'out': clean(meta.get('out', [])), 'players': players, 'schedule': games}
    json.dump(out, open(os.path.join(SITE, 'data', f'{ab}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    return ab, len(players), len(games)

ALL_GAMES = {}
results = [team(ab) for ab in sorted(standings)]

# ---- league schedule (Games view)
FINAL = ('OFF', 'FINAL')
sched_out = []
for g in sorted(ALL_GAMES.values(), key=lambda g: (g['startTimeUTC'], g['id'])):
    sched_out.append({'id': g['id'], 'date': g['gameDate'], 'start': g['startTimeUTC'], 'type': g['gameType'], 'state': g['gameState'],
        'away': g['awayTeam']['abbrev'], 'home': g['homeTeam']['abbrev'],
        'as': g['awayTeam'].get('score'), 'hs': g['homeTeam'].get('score'),
        'ot': (g.get('gameOutcome') or {}).get('lastPeriodType'), 'venue': g['venue']['default'],
        'tv': sorted({b['network'] for b in g.get('tvBroadcasts', [])})})
json.dump({'generated': generated, 'games': sched_out}, open(os.path.join(SITE, 'data', 'schedule.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

# ---- box scores for finished games, bundled by month
# skater row: [id, num, name, pos, G, A, P, +/-, PIM, SOG, HIT, BLK, TOI, FO%]
# goalie row: [id, num, name, SV, SA, GA, SV%, TOI, decision, starter]
def box(gid):
    b = getj(f'/gamecenter/{gid}/boxscore')
    try: l = getj(f'/gamecenter/{gid}/landing')
    except Exception: l = {}
    sk = lambda p: [p['playerId'], p.get('sweaterNumber'), p['name']['default'], p.get('position'), p.get('goals', 0), p.get('assists', 0), p.get('points', 0),
                    p.get('plusMinus', 0), p.get('pim', 0), p.get('sog', 0), p.get('hits', 0), p.get('blockedShots', 0), p.get('toi', ''),
                    round(p['faceoffWinningPctg'] * 100) if p.get('faceoffWinningPctg') else None]
    gk = lambda p: [p['playerId'], p.get('sweaterNumber'), p['name']['default'], p.get('saves', 0), p.get('shotsAgainst', 0), p.get('goalsAgainst', 0),
                    p.get('savePctg'), p.get('toi', ''), p.get('decision', ''), bool(p.get('starter'))]
    side = lambda k: {'abbrev': b[k]['abbrev'], 'score': b[k].get('score'), 'sog': b[k].get('sog'),
                      'skaters': [sk(p) for p in b['playerByGameStats'][k].get('forwards', []) + b['playerByGameStats'][k].get('defense', [])],
                      'goalies': [gk(p) for p in b['playerByGameStats'][k].get('goalies', []) if p.get('toi') not in (None, '00:00')]}
    summ = l.get('summary') or {}
    scoring = []
    for per in summ.get('scoring', []):
        pd = per['periodDescriptor']; lab = {'REG': f"P{pd['number']}", 'OT': 'OT', 'SO': 'SO'}.get(pd.get('periodType'), str(pd['number']))
        for gl in per.get('goals', []):
            scoring.append({'per': lab, 't': gl.get('timeInPeriod'), 'team': (gl.get('teamAbbrev') or {}).get('default'), 'who': gl['name']['default'],
                            'n': gl.get('goalsToDate'), 'ast': [f"{a['name']['default']} ({a.get('assistsToDate')})" for a in gl.get('assists', [])],
                            'str': gl.get('strength'), 'mod': gl.get('goalModifier'), 'score': f"{gl.get('awayScore')}-{gl.get('homeScore')}"})
    stars = [{'star': x['star'], 'name': x['name']['default'], 'team': x.get('teamAbbrev'), 'pos': x.get('position'),
              'line': (f"{x.get('goals', 0)}G {x.get('assists', 0)}A" if x.get('position') != 'G' else (f"{x['savePctg']:.3f} SV%".replace('0.', '.') if x.get('savePctg') is not None else ''))}
             for x in summ.get('threeStars', [])]
    return gid, {'id': gid, 'date': b.get('gameDate'), 'ot': (b.get('gameOutcome') or {}).get('lastPeriodType'),
                 'away': side('awayTeam'), 'home': side('homeTeam'), 'scoring': scoring, 'stars': stars}

finals = [g for g in sched_out if g['state'] in FINAL]
boxes = {}
with ThreadPoolExecutor(12) as ex:
    for gid, bx in ex.map(lambda g: box(g["id"]), finals):
        boxes[gid] = bx
os.makedirs(os.path.join(SITE, 'data', 'box'), exist_ok=True)
months = {}
for g in finals: months.setdefault(g['date'][:7], {})[g['id']] = boxes[g['id']]
for m, d in months.items():
    json.dump(d, open(os.path.join(SITE, 'data', 'box', f'{m}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('league games:', len(sched_out), 'box scores:', len(boxes), 'months:', sorted(months))
league = {'generated': generated, 'season': SEASON, 'teams': sorted([{
    'abbrev': ab, 'name': s['teamName']['default'], 'short': s['teamCommonName']['default'], 'place': s['placeName']['default'],
    'conference': s.get('conferenceName'), 'division': s.get('divisionName'), 'points': s.get('points'), 'gp': s.get('gamesPlayed'),
    'record': f"{s.get('wins',0)}-{s.get('losses',0)}-{s.get('otLosses',0)}", 'confRank': s.get('conferenceSequence'),
    'divRank': s.get('divisionSequence'), 'leagueRank': s.get('leagueSequence'), 'streak': f"{s.get('streakCode','')}{s.get('streakCount','')}",
    'l10': f"{s.get('l10Wins',0)}-{s.get('l10Losses',0)}-{s.get('l10OtLosses',0)}",
    'home': f"{s.get('homeWins',0)}-{s.get('homeLosses',0)}-{s.get('homeOtLosses',0)}", 'road': f"{s.get('roadWins',0)}-{s.get('roadLosses',0)}-{s.get('roadOtLosses',0)}",
    'gf': s.get('goalFor'), 'ga': s.get('goalAgainst'), 'diff': s.get('goalDifferential'), 'ppct': s.get('pointPctg'),
    'logo': f'logos/{ab}.svg', 'colors': COLORS.get(ab, ('#141217', '#827C89'))} for ab, s in standings.items()],
    key=lambda t: (t['conference'] != 'Eastern', t['confRank'] or 99))}
json.dump(league, open(os.path.join(SITE, 'data', 'league.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('teams written:', len(results), 'players:', sum(r[1] for r in results))
print('\n'.join(report) or 'No notes missing.')
