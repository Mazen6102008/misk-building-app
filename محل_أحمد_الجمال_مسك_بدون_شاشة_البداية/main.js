const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(app.getPath('documents'), 'محل أحمد الجمال');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const JOURNAL_DIR = path.join(DATA_DIR, 'اليوميات');
const BACKUP_DIR = path.join(DATA_DIR, 'نسخ احتياطية');
const ensureDataDir = () => { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(JOURNAL_DIR)) fs.mkdirSync(JOURNAL_DIR, { recursive: true }); if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true }); };

function monthKey(date) { return String(date || '').slice(0, 7); }
function buildMonthlyJournal(db, month) {
  const sales = (db.invoices || []).filter(x => monthKey(x.date) === month);
  const quick = (db.quickSales || []).filter(x => monthKey(x.date) === month);
  const itemMap = {};
  const addItem = (name, qty, total, source) => { const k=String(name||''); itemMap[k] ||= {name:k, qty:0, total:0, sales:0, purchases:0}; itemMap[k].qty += Number(qty)||0; itemMap[k].total += Number(total)||0; itemMap[k][source] += Number(qty)||0; };
  sales.forEach(inv => (inv.items||[]).forEach(i => addItem(i.name, i.qty, (Number(i.qty)||0)*(Number(i.price)||0), 'sales')));
  quick.forEach(x => addItem(x.name, x.qty, x.total, 'sales'));
  const salesTotal = sales.reduce((a,x)=>a+(Number(x.total)||0),0)+quick.reduce((a,x)=>a+(Number(x.total)||0),0);
  const paid = sales.reduce((a,x)=>a+(Number(x.paid)||0),0)+quick.reduce((a,x)=>a+(Number(x.total)||0),0);
  const due = sales.reduce((a,x)=>a+(Number(x.due)||0),0);
  const cost = sales.reduce((a,x)=>a+(x.items||[]).reduce((c,i)=>c+(Number(i.qty)||0)*(Number(i.cost)||0),0),0)+quick.reduce((a,x)=>a+(Number(x.qty)||0)*(Number(x.cost)||0),0);
  return { month, closedAt: new Date().toISOString(), stats: { invoices:sales.length, quickSales:quick.length, salesTotal, paid, due, cost, grossProfit:salesTotal-cost }, items:Object.values(itemMap).sort((a,b)=>b.total-a.total), invoices:sales, quickSales:quick };
}
function syncMonthlyArchives(db) {
  ensureDataDir();
  const current = monthKey(new Date().toISOString());
  const months = new Set();
  [...(db.invoices||[]), ...(db.quickSales||[])].forEach(x=>{ const m=monthKey(x.date); if(m && m !== current) months.add(m); });
  months.forEach(m=>{ const f=path.join(JOURNAL_DIR, `اليوميات_${m}.json`); fs.writeFileSync(f, JSON.stringify(buildMonthlyJournal(db,m), null, 2), 'utf8'); });
}
function autoBackup(db) {
  if (!db.settings?.autoBackup) return;
  const day = new Date().toISOString().slice(0,10);
  const exists = fs.readdirSync(BACKUP_DIR).some(x => x.startsWith(`نسخة_احتياطية_${day}`));
  if (exists) return;
  const f=path.join(BACKUP_DIR, `نسخة_احتياطية_${day}.json`);
  fs.writeFileSync(f, JSON.stringify(db,null,2), 'utf8');
}

ipcMain.handle('data:path', () => DATA_FILE);
ipcMain.handle('journal:path', () => JOURNAL_DIR);
ipcMain.handle('journal:list', () => { ensureDataDir(); return fs.readdirSync(JOURNAL_DIR).filter(x=>x.endsWith('.json')).sort().reverse(); });
ipcMain.handle('journal:read', (_event, name) => { ensureDataDir(); if(!/^اليوميات_\d{4}-\d{2}\.json$/.test(name)) return null; const f=path.join(JOURNAL_DIR,name); try{return fs.existsSync(f)?JSON.parse(fs.readFileSync(f,'utf8')):null}catch{return null} });
ipcMain.handle('data:load', () => {
  try { ensureDataDir(); return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : null; }
  catch { return null; }
});
ipcMain.handle('data:save', (_event, data) => {
  ensureDataDir();
  syncMonthlyArchives(data);
  autoBackup(data);
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1100, minHeight: 700,
    title: 'مسك للحديد والبويات', icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#f5f7fa', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}
app.whenReady().then(() => { Menu.setApplicationMenu(null); createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
