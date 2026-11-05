const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 5000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'health-data.json');
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ records: [], vitals: [] }, null, 2));
const readData = () => JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const writeData = data => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
const send = (res, status, body, type='application/json; charset=utf-8') => { res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
const readBody = req => new Promise((resolve,reject)=>{ let raw=''; req.on('data', chunk=>{ raw+=chunk; if(raw.length>1_000_000) req.destroy(); }); req.on('end',()=>{ try { resolve(raw ? JSON.parse(raw) : {}); } catch(e) { reject(e); } }); req.on('error',reject); });
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const data = readData();
      if (req.method === 'GET' && url.pathname === '/api/data') return send(res,200,data);
      if (req.method === 'POST' && url.pathname === '/api/records') {
        const body = await readBody(req);
        if (!body.title || !String(body.title).trim()) return send(res,400,{error:'Record title is required'});
        const item = { id: crypto.randomUUID(), title:String(body.title).trim().slice(0,120), type:String(body.type||'Other').slice(0,40), date:body.date || new Date().toISOString().slice(0,10), doctor:String(body.doctor||'').slice(0,100), notes:String(body.notes||'').slice(0,2000), createdAt:new Date().toISOString() };
        data.records.unshift(item); writeData(data); return send(res,201,item);
      }
      if (req.method === 'DELETE' && url.pathname.startsWith('/api/records/')) {
        const id = decodeURIComponent(url.pathname.split('/').pop()); data.records=data.records.filter(x=>x.id!==id); writeData(data); return send(res,200,{ok:true});
      }
      if (req.method === 'POST' && url.pathname === '/api/vitals') {
        const body=await readBody(req); const allowed=['Blood pressure','Heart rate','Temperature','Weight','SpO2'];
        if (!allowed.includes(body.type) || body.value===undefined || body.value==='' || !Number.isFinite(Number(body.value))) return send(res,400,{error:'Choose a valid vital and numeric value'});
        const item={id:crypto.randomUUID(),type:body.type,value:Number(body.value),unit:String(body.unit||''),date:body.date||new Date().toISOString().slice(0,10),createdAt:new Date().toISOString()};
        data.vitals.unshift(item); writeData(data); return send(res,201,item);
      }
      if (req.method === 'DELETE' && url.pathname.startsWith('/api/vitals/')) {
        const id=decodeURIComponent(url.pathname.split('/').pop()); data.vitals=data.vitals.filter(x=>x.id!==id); writeData(data); return send(res,200,{ok:true});
      }
      if (req.method === 'POST' && url.pathname === '/api/import') {
        const body=await readBody(req); if(!body || !Array.isArray(body.records) || !Array.isArray(body.vitals)) return send(res,400,{error:'Invalid backup format'});
        writeData({records:body.records,vitals:body.vitals}); return send(res,200,{ok:true});
      }
      return send(res,404,{error:'API route not found'});
    }
    if (req.method !== 'GET') return send(res,405,{error:'Method not allowed'});
    const requested=url.pathname==='/'?'public/index.html':url.pathname.replace(/^\/+/, '');
    const file=path.resolve(ROOT,requested);
    if (!file.startsWith(ROOT+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res,404,'Not found','text/plain; charset=utf-8');
    const ext=path.extname(file); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
    send(res,200,fs.readFileSync(file),types[ext]||'application/octet-stream');
  } catch(err) { console.error(err); send(res,500,{error:'Internal server error'}); }
});
server.listen(PORT,()=>console.log(`Dharth HealthTwin running at http://localhost:${PORT}`));
