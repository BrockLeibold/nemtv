# PC preview: serves assets/ and mimics the app's guide interceptor (dark css + nav.js injected)
import http.server,os,sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'assets'))
class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(s):
        p=s.path.split('?')[0]
        if p.startswith('/guide/') and not p.startswith('/guide/data') or p in('/_nav.js','/_dark.css'):
            f={'/_nav.js':'gx/nav.js','/_dark.css':'gx/dark.css'}.get(p) or ('../guide/'+p[7:] if os.path.exists('../guide/'+p[7:]) else None)
            if p=='/guide/' or p=='/guide': f='../guide/index.html'
            if f and os.path.isfile(f):
                d=open(f,'rb').read()
                if f.endswith('index.html'): d=d.replace(b'</body>',b'<link rel=stylesheet href=/_dark.css><script src=/_nav.js></script></body>')
                s.send_response(200);s.send_header('Content-Type','image/svg+xml' if f.endswith('svg') else 'text/html' if f.endswith('html') else 'text/css' if f.endswith('css') else 'application/javascript');s.end_headers();s.wfile.write(d);return
        if p.startswith('/guide/data') or p.startswith('/guide/news'):
            s.path='/../guide/'+p[7:]
            s.directory=os.path.abspath('.')
            try:
                d=open('../guide/'+p[7:],'rb').read();s.send_response(200);s.send_header('Content-Type','application/json');s.end_headers();s.wfile.write(d);return
            except Exception: s.send_error(404);return
        return super().do_GET()
    def log_message(*a):pass
http.server.ThreadingHTTPServer(('',8099),H).serve_forever()
