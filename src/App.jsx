import { useState, useMemo, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useVehicules }     from './hooks/useVehicules'
import { useMissions }      from './hooks/useMissions'
import { useEntretiens }    from './hooks/useEntretiens'
import { useCarburant }     from './hooks/useCarburant'
import { useNotifications } from './hooks/useNotifications'
import { usePaysSites }     from './hooks/usePaysSites'

const E_NEXT  = { 'Planifie': 'En cours', 'En cours': 'Effectue' }
const E_STEPS = ['Planifie', 'En cours', 'Effectue']
const fmt     = n => (n || 0).toLocaleString('fr-FR')
const daysDiff = d => Math.ceil((new Date(d) - new Date()) / 86400000)

function exportHTML(title, headers, rows, fname) {
  const th = headers.map(h => `<th style="background:#00536A;color:#fff;padding:8px">${h}</th>`).join('')
  const tr = rows.map((r, i) =>
    `<tr style="background:${i % 2 ? '#f0f4f6' : '#fff'}">${
      r.map(c => `<td style="padding:7px 10px;border-bottom:1px solid #e5e7eb">${c ?? ''}</td>`).join('')
    }</tr>`).join('')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title></head>
     <body style="font-family:Arial;padding:20px">
     <h2 style="color:#00536A">ONG MUSO — ${title}</h2>
     <table style="width:100%;border-collapse:collapse;margin-top:14px">
     <thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table></body></html>`
  ], { type: 'text/html' }))
  a.download = fname + '.html'
  a.click()
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;font-family:'Inter',sans-serif;}
body{background:#eef2f5;}
.shell{display:flex;min-height:100vh;}
.sidebar{width:230px;background:linear-gradient(180deg,#00536A,#004558);display:flex;flex-direction:column;position:fixed;height:100vh;z-index:30;transition:transform .3s;}
.slogo{padding:18px 14px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px;}
.slogo-icon{width:36px;height:36px;background:linear-gradient(135deg,#00919E,#FF8725);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-radius:10px;margin:2px 8px;color:rgba(255,255,255,.65);font-size:13px;font-weight:600;transition:all .2s;}
.nav-item:hover{background:rgba(255,255,255,.1);color:white;}
.nav-item.active{background:rgba(255,255,255,.15);color:white;box-shadow:inset 3px 0 0 #FF8725;}
.nav-icon{font-size:17px;width:22px;text-align:center;flex-shrink:0;}
.nav-badge{background:#FF8725;color:white;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700;margin-left:auto;}
.sfoot{margin-top:auto;padding:10px 8px;border-top:1px solid rgba(255,255,255,.1);}
.main{flex:1;margin-left:230px;display:flex;flex-direction:column;}
.topbar{background:white;padding:0 24px;height:58px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e5e7eb;position:sticky;top:0;z-index:20;box-shadow:0 1px 4px rgba(0,83,106,.07);}
.topbar-title{font-size:17px;font-weight:800;color:#00536A;}
.user-pill{display:flex;align-items:center;gap:8px;background:#f0f4f6;border-radius:20px;padding:5px 12px 5px 6px;}
.avatar{width:28px;height:28px;background:linear-gradient(135deg,#00536A,#00919E);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;}
.page{padding:22px;max-width:1400px;}
.ph{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;}
.pt{font-size:19px;font-weight:800;color:#00536A;}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.card{background:white;border-radius:14px;padding:18px;box-shadow:0 2px 8px rgba(0,83,106,.07);}
.csm{background:white;border-radius:12px;padding:14px;box-shadow:0 2px 6px rgba(0,83,106,.06);margin-bottom:10px;}
.ccomb{border-left:4px solid #00919E;}
.kpi{background:white;border-radius:14px;padding:16px;box-shadow:0 2px 8px rgba(0,83,106,.07);display:flex;align-items:center;gap:14px;}
.kpi-box{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.kpi-lbl{font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;}
.kpi-val{font-size:20px;font-weight:800;color:#00536A;line-height:1.1;}
.kpi-sub{font-size:10px;color:#9ca3af;margin-top:1px;}
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;}
.b-dispo{background:#d1fae5;color:#065f46;}.b-mission{background:#e6f2f5;color:#00536A;}.b-entretien{background:#fff3e8;color:#d97706;}.b-hs{background:#fee2e2;color:#dc2626;}.b-attente{background:#fef9e8;color:#d97706;}.b-validee{background:#d1fae5;color:#065f46;}.b-terminee{background:#f3f4f6;color:#6b7280;}.b-rejetee{background:#fee2e2;color:#dc2626;}.b-planifie{background:#ede9fe;color:#6d28d9;}.b-encours{background:#dbeafe;color:#1d4ed8;}.b-effectue{background:#d1fae5;color:#065f46;}
.btn{border:none;border-radius:9px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .15s;}
.btn-p{background:linear-gradient(135deg,#00536A,#00919E);color:white;}
.btn-a{background:linear-gradient(135deg,#FF8725,#ff9e50);color:white;}
.btn-outline{background:white;color:#00536A;border:2px solid #00536A;}
.btn-ghost{background:#f3f4f6;color:#374151;}
.btn-danger{background:#fee2e2;color:#dc2626;}
.btn-success{background:#d1fae5;color:#065f46;}
.btn-sm{padding:6px 12px;font-size:12px;}.btn-xs{padding:4px 9px;font-size:11px;border-radius:7px;}
.tw{overflow-x:auto;border-radius:14px;box-shadow:0 2px 8px rgba(0,83,106,.07);}
table{width:100%;border-collapse:collapse;background:white;}
th{background:#f8fafc;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:11px 14px;text-align:left;border-bottom:1px solid #e5e7eb;}
td{padding:11px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:#fafbfc;}
.fi{width:100%;border:1.5px solid #e5e7eb;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;transition:all .2s;background:#fafafa;}
.fi:focus{border-color:#00919E;background:white;box-shadow:0 0 0 3px rgba(0,145,158,.1);}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.ffull{grid-column:1/-1;}.fg{margin-bottom:12px;}.fl{display:block;font-size:11px;font-weight:700;color:#00536A;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}
.moverlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;}
.modal{background:white;border-radius:18px;width:100%;max-width:540px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);}
.mhead{padding:18px 22px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:white;z-index:1;}
.mtitle{font-size:16px;font-weight:800;color:#00536A;}
.mbody{padding:22px;}.mfoot{padding:14px 22px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;}
.dbar{height:11px;border-radius:5px;overflow:hidden;display:flex;background:#f3f4f6;margin:5px 0;}
.dseg{transition:width .4s;}.pbar{height:9px;border-radius:4px;overflow:hidden;display:flex;background:#f3f4f6;margin:4px 0;}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.stat-box{border-radius:12px;padding:14px;text-align:center;}
.chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;}
.chip{border:1.5px solid #e5e7eb;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600;background:white;cursor:pointer;color:#6b7280;}
.chip.active{background:#00536A;color:white;border-color:#00536A;}
.chip-r{color:#dc2626;border-color:#dc2626;}
.notif-panel{position:absolute;top:54px;right:0;background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,83,106,.16);width:290px;z-index:50;border:1px solid #e5e7eb;overflow:hidden;}
.ni{padding:11px 14px;border-bottom:1px solid #f3f4f6;font-size:12px;}.ni-u{background:#e6f2f5;}
.toast{position:fixed;top:18px;right:22px;padding:11px 18px;border-radius:11px;color:white;font-weight:700;font-size:13px;z-index:200;box-shadow:0 4px 20px rgba(0,0,0,.2);animation:slideIn .3s ease;}
@keyframes slideIn{from{transform:translateX(30px);opacity:0;}to{transform:translateX(0);opacity:1;}}
.ts{background:linear-gradient(135deg,#00536A,#00919E);}.te{background:#dc2626;}
.cov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px;}
.cbox{background:white;border-radius:18px;padding:26px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.22);}
.alertc{border-radius:12px;padding:13px 15px;display:flex;gap:11px;margin-bottom:9px;}
.adanger{background:#fee2e2;border:1px solid #fca5a5;}.awarning{background:#fff3e8;border:1px solid #fdba74;}
.stepper{display:flex;gap:3px;margin-top:8px;}.step{flex:1;height:4px;border-radius:2px;background:#e5e7eb;}.step-done{background:#00919E;}.step-cur{background:#FF8725;}
.ham{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:#6b7280;font-size:19px;display:none;}
.mnav{display:none;position:fixed;bottom:0;left:0;right:0;background:white;border-top:1px solid #e5e7eb;z-index:30;padding:4px 0;}
.mnav-inner{display:flex;justify-content:space-around;}
.mnbtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 8px;cursor:pointer;border:none;background:none;font-size:10px;font-weight:600;color:#9ca3af;}
.mnbtn.active{color:#00536A;}.mnicon{font-size:19px;}
.spin{display:inline-block;width:20px;height:20px;border:3px solid rgba(0,83,106,.2);border-top-color:#00536A;border-radius:50%;animation:spin .7s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
@media(max-width:1024px){.grid4{grid-template-columns:1fr 1fr;}.stat-grid{grid-template-columns:1fr 1fr;}.grid3{grid-template-columns:1fr 1fr;}}
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);}.sidebar.open{transform:translateX(0);}
  .main{margin-left:0!important;}.ham{display:flex!important;}.mnav{display:block;}
  .page{padding:12px;padding-bottom:78px;}
  .grid2,.grid3,.grid4,.stat-grid{grid-template-columns:1fr 1fr;}
  .fgrid{grid-template-columns:1fr;}.ffull{grid-column:1;}
  .topbar{padding:0 12px;height:52px;}
  .moverlay{align-items:flex-end;padding:0;}.modal{border-radius:18px 18px 0 0;max-height:92vh;}
}
@media(max-width:480px){.grid2,.stat-grid{grid-template-columns:1fr;}}
`

function SBadge({ s }) {
  const m = {
    'Disponible':'b-dispo','En mission':'b-mission','En entretien':'b-entretien',
    'Hors service':'b-hs','En attente':'b-attente','Validee':'b-validee',
    'Terminee':'b-terminee','Rejetee':'b-rejetee','Planifie':'b-planifie',
    'En cours':'b-encours','Effectue':'b-effectue'
  }
  return <span className={`badge ${m[s] || 'b-terminee'}`}>{s}</span>
}

function KPICard({ icon, label, value, sub, bg, ic }) {
  return (
    <div className="kpi">
      <div className="kpi-box" style={{ background: bg || '#e6f2f5' }}>
        <span style={{ color: ic || '#00536A' }}>{icon}</span>
      </div>
      <div>
        <div className="kpi-lbl">{label}</div>
        <div className="kpi-val">{value}</div>
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  )
}

function DispoBar({ label, dispo, mission, entretien, hs, total }) {
  const pw = v => total > 0 ? Math.round(v / total * 100) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'#00536A' }}>{label}</span>
        <span style={{ fontSize:11, color:'#9ca3af' }}>{total} veh.</span>
      </div>
      <div className="dbar">
        {dispo     > 0 && <div className="dseg" style={{ width:pw(dispo)+'%',     background:'#059669' }} />}
        {mission   > 0 && <div className="dseg" style={{ width:pw(mission)+'%',   background:'#00919E' }} />}
        {entretien > 0 && <div className="dseg" style={{ width:pw(entretien)+'%', background:'#FF8725' }} />}
        {hs        > 0 && <div className="dseg" style={{ width:pw(hs)+'%',        background:'#dc2626' }} />}
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        {dispo     > 0 && <span style={{ fontSize:11, color:'#059669', fontWeight:600 }}>● Disponible ({dispo})</span>}
        {mission   > 0 && <span style={{ fontSize:11, color:'#00919E', fontWeight:600 }}>● Mission ({mission})</span>}
        {entretien > 0 && <span style={{ fontSize:11, color:'#FF8725', fontWeight:600 }}>● Entretien ({entretien})</span>}
        {hs        > 0 && <span style={{ fontSize:11, color:'#dc2626', fontWeight:600 }}>● H.S. ({hs})</span>}
      </div>
    </div>
  )
}

function Stepper({ statut }) {
  const idx = E_STEPS.indexOf(statut)
  return (
    <div>
      <div className="stepper">
        {E_STEPS.map((s, i) => (
          <div key={s} className={`step ${i < idx ? 'step-done' : i === idx ? 'step-cur' : ''}`} />
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        {E_STEPS.map((s, i) => (
          <span key={s} style={{ fontSize:9, fontWeight:700, textAlign:'center', flex:1,
            color: i < idx ? '#059669' : i === idx ? '#FF8725' : '#d1d5db' }}>{s}</span>
        ))}
      </div>
    </div>
  )
}

function Modal({ title, onClose, onSubmit, children, wide, submitLabel, loading }) {
  return (
    <div className="moverlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: wide ? 660 : 520 }}>
        <div className="mhead">
          <div className="mtitle">{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'#9ca3af', cursor:'pointer' }}>×</button>
        </div>
        <div className="mbody">{children}</div>
        {onSubmit && (
          <div className="mfoot">
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn-p" onClick={onSubmit} disabled={loading}>
              {loading ? <><span className="spin" style={{ width:14, height:14, borderWidth:2 }} /> Chargement…</> : submitLabel || 'Enregistrer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Confirm({ msg, onOk, onCancel, danger }) {
  return (
    <div className="cov">
      <div className="cbox">
        <div style={{ fontSize:38, textAlign:'center', marginBottom:10 }}>{danger ? '⚠️' : '❓'}</div>
        <div style={{ fontWeight:700, fontSize:15, color:'#111827', textAlign:'center', marginBottom:8 }}>Confirmation</div>
        <div style={{ fontSize:13, color:'#6b7280', textAlign:'center', marginBottom:22, lineHeight:1.5 }}>{msg}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel}>Annuler</button>
          <button className="btn" style={{ flex:1, background: danger ? '#dc2626' : '#00536A', color:'white' }} onClick={onOk}>Confirmer</button>
        </div>
      </div>
    </div>
  )
}

function FI({ label, value, onChange, type='text', placeholder, full }) {
  return (
    <div className={full ? 'fg ffull' : 'fg'}>
      <label className="fl">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="fi" />
    </div>
  )
}

function FS({ label, value, onChange, options, full }) {
  return (
    <div className={full ? 'fg ffull' : 'fg'}>
      <label className="fl">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="fi">
        <option value="">-- Choisir --</option>
        {options.map(o => (
          <option key={typeof o === 'object' ? o.v : o} value={typeof o === 'object' ? o.v : o}>
            {typeof o === 'object' ? o.l : o}
          </option>
        ))}
      </select>
    </div>
  )
}

function MissionCard({ m, profil, avail, onValider, onRejeter, onCloturer }) {
  const [sv, setSv] = useState('')
  const [kr, setKr] = useState('')
  const demandeurs = m.demandeurs?.map(d => d.demandeur?.nom).join(', ') || '—'
  return (
    <div className={`csm ${m.combinee ? 'ccomb' : ''}`}>
      {m.combinee && <span className="badge b-mission" style={{ marginBottom:6, display:'inline-flex' }}>🔗 Combinée</span>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:15, color:'#00536A' }}>📍 {m.destination}</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:3 }}>{demandeurs} · {m.objet}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>📅 {m.depart} → {m.retour} · 👥 {m.passagers} pass.</div>
          {m.vehicule && <div style={{ fontSize:12, color:'#00919E', fontWeight:600, marginTop:4 }}>🚗 {m.vehicule.immat} · {m.chauffeur?.nom}</div>}
          {m.km_retour > 0 && <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>🛣 {fmt(m.km_retour - m.km_depart)} km</div>}
        </div>
        <SBadge s={m.statut} />
      </div>
      {profil === 'Supply Chain' && m.statut === 'En attente' && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f3f4f6' }}>
          <select value={sv} onChange={e => setSv(e.target.value)} className="fi" style={{ marginBottom:8, fontSize:13 }}>
            <option value="">-- Assigner un véhicule --</option>
            {avail.map(v => <option key={v.id} value={v.id}>{v.immat} · {v.marque} {v.modele}</option>)}
          </select>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-success btn-sm" style={{ flex:1 }} onClick={() => sv && onValider(m, sv)}>✅ Valider</button>
            <button className="btn btn-danger btn-sm"  style={{ flex:1 }} onClick={() => onRejeter(m)}>❌ Rejeter</button>
          </div>
        </div>
      )}
      {profil === 'Supply Chain' && m.statut === 'Validee' && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f3f4f6', display:'flex', gap:8, flexWrap:'wrap' }}>
          <input type="number" placeholder="Km retour" value={kr} onChange={e => setKr(e.target.value)} className="fi" style={{ flex:1, minWidth:110, fontSize:13 }} />
          <button className="btn btn-p btn-sm" onClick={() => kr && onCloturer(m, kr)}>🏁 Clôturer</button>
        </div>
      )}
    </div>
  )
}

function LoginScreen({ login }) {
  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [err,     setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true); setErr('')
    const { error } = await login(email, pw)
    if (error) { setErr(error.message); setLoading(false) }
  }

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#00536A 0%,#00919E 60%,#003d50 100%)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ background:'white', borderRadius:22, padding:36, width:'100%', maxWidth:400,
          boxShadow:'0 24px 80px rgba(0,0,0,.22)' }}>
          <div style={{ textAlign:'center', marginBottom:28 }}>
            <div style={{ width:70, height:70, background:'linear-gradient(135deg,#00536A,#00919E)',
              borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:36, margin:'0 auto 14px' }}>🚘</div>
            <div style={{ fontSize:24, fontWeight:800, color:'#00536A' }}>ONG MUSO</div>
            <div style={{ fontSize:13, color:'#9ca3af', marginTop:4 }}>Système de gestion de flotte</div>
          </div>
          <div className="fg">
            <label className="fl">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.org" className="fi" />
          </div>
          <div className="fg">
            <label className="fl">Mot de passe</label>
            <input type="password" value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" className="fi" />
          </div>
          {err && <div style={{ color:'#dc2626', fontSize:13, marginBottom:14, background:'#fee2e2', padding:'8px 12px', borderRadius:8, textAlign:'center' }}>{err}</div>}
          <button onClick={handleLogin} disabled={loading}
            style={{ width:'100%', padding:'13px', fontSize:15, fontWeight:700, borderRadius:11, border:'none',
              cursor:'pointer', color:'white', justifyContent:'center', display:'flex', alignItems:'center', gap:8,
              background:'linear-gradient(135deg,#00536A,#00919E)', opacity: loading ? 0.7 : 1 }}>
            {loading ? <><span className="spin" style={{ width:16, height:16, borderWidth:2 }} /> Connexion…</> : 'Se connecter →'}
          </button>
          <div style={{ marginTop:16, fontSize:12, color:'#9ca3af', textAlign:'center' }}>
            Mot de passe oublié ? Contactez votre administrateur.
          </div>
        </div>
      </div>
    </>
  )
}
export default function App() {
  const { user, profil, loading: authLoading, login, logout } = useAuth()
  const [fP, setFP] = useState('')
  const [fS, setFS] = useState('')
  const [fM, setFM] = useState('')
  const { vehicules, loading: vLoad, ajouter: ajV, supprimer: supV } = useVehicules(fP, fS)
  const { missions, creer: crM, valider: valM, cloturer: cloM, rejeter: rejM, combiner: combM } = useMissions(fP, fS)
  const { entretiens, ajouter: ajE, avancer: avE } = useEntretiens(fP, fS)
  const { carburant, ajouter: ajC } = useCarburant(fP, fS)
  const { notifs, nonLues, envoyer: envN, toutMarquerLu } = useNotifications(user?.id)
  const { ps, psNoms, ajouterPays, ajouterSite, supprimerSite, renommerPays, renommerSite } = usePaysSites()

  const [tab, setTab]         = useState('dashboard')
  const [mobOpen, setMobOpen] = useState(false)
  const [bell, setBell]       = useState(false)
  const [toast, setToast]     = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet]     = useState(null)
  const [saving, setSaving]   = useState(false)
  const [editPS, setEditPS]   = useState(false)
  const [psForm, setPsForm]   = useState(null)
  const [selComb, setSelComb] = useState([])
  const [combObj, setCombObj] = useState('')
  const [combineModal, setCombineModal] = useState(false)
  const [newPays, setNewPays] = useState('')
  const [newSite, setNewSite] = useState({ pays:'', val:'' })

  const [mf, setMf] = useState({ destination:'', depart:'', retour:'', objet:'', passagers:1, pays:'', site:'' })
  const [vf, setVf] = useState({ immat:'', marque:'', modele:'', annee:'', km:'', pays:'', site:'', assurance:'', visite:'', statut:'Disponible' })
  const [ef, setEf] = useState({ vehicule_id:'', type:'', date:'', km:'', cout:'', prestataire:'', notes:'' })
  const [cf, setCf] = useState({ vehicule_id:'', date:'', litres:'', cout:'', station:'', km:'' })

  const notify = (msg, type='success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const save = async (fn) => {
    setSaving(true)
    try { await fn(); setSheet(null); setCombineModal(false) }
    catch (e) { notify(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleValider = async (m, vehiculeId) => {
    const veh = vehicules.find(v => v.id === vehiculeId)
    await save(async () => {
      await valM(m.id, vehiculeId, veh?.chauffeur_id)
      const dIds = m.demandeurs?.map(d => d.demandeur?.id).filter(Boolean) || []
      for (const uid of dIds) await envN(uid, `✅ Mission "${m.destination}" validée — ${veh?.immat}`)
      notify('Mission validée !')
    })
  }

  const handleRejeter = async (m) => {
    await save(async () => {
      await rejM(m.id)
      const dIds = m.demandeurs?.map(d => d.demandeur?.id).filter(Boolean) || []
      for (const uid of dIds) await envN(uid, `❌ Mission "${m.destination}" rejetée.`)
      notify('Mission rejetée.', 'error')
    })
  }

  const handleCloturer = async (m, kmRetour) => {
    await save(async () => {
      await cloM(m.id, m.vehicule?.id, parseInt(kmRetour))
      notify('Mission clôturée !')
    })
  }

  const handleAvancer = async (e) => {
    await save(async () => {
      await avE(e.id, e.vehicule?.id, e.statut)
      notify(e.statut === 'En cours' ? 'Entretien Effectué — véhicule Disponible !' : 'Statut mis à jour.')
    })
    setConfirm(null)
  }

  const handleSupprimer = async (v) => {
    const actif = missions.some(m => m.vehicule_id === v.id && m.statut === 'Validee')
    if (actif) { notify('Véhicule en mission active.', 'error'); setConfirm(null); return }
    await save(async () => { await supV(v.id); notify(`${v.immat} supprimé.`) })
    setConfirm(null)
  }

  const handleCombiner = async () => {
    if (selComb.length < 2) { notify('Sélectionnez au moins 2 missions.', 'error'); return }
    const tm = missions.filter(m => selComb.includes(m.id))
    const dIds = [...new Set(tm.flatMap(m => m.demandeurs?.map(d => d.demandeur?.id).filter(Boolean) || []))]
    await save(async () => {
      const nm = await combM(selComb, {
        destination: tm.map(m => m.destination).join(' / '),
        depart: tm.map(m => m.depart).sort()[0],
        retour: tm.map(m => m.retour).sort().reverse()[0],
        objet: combObj || tm.map(m => m.objet).join(' + '),
        passagers: tm.reduce((s, m) => s + (m.passagers || 0), 0),
        pays: tm[0].pays, site: tm[0].site
      }, dIds)
      for (const uid of dIds) await envN(uid, `🔗 Mission combinée : "${nm.destination}"`)
      setSelComb([]); setCombObj('')
      notify('Missions combinées !')
    })
  }

  const fMis  = useMemo(() => fM ? missions.filter(m => m.depart?.startsWith(fM))  : missions,   [missions, fM])
  const fEnt  = useMemo(() => fM ? entretiens.filter(e => e.date?.startsWith(fM))  : entretiens, [entretiens, fM])
  const fCarb = useMemo(() => fM ? carburant.filter(c => c.date?.startsWith(fM))   : carburant,  [carburant, fM])

  const allMois = useMemo(() => {
    const m = new Set([...missions.map(x => x.depart?.slice(0,7)), ...carburant.map(x => x.date?.slice(0,7)), ...entretiens.map(x => x.date?.slice(0,7))].filter(Boolean))
    return [...m].sort().reverse()
  }, [missions, carburant, entretiens])

  const allSites = fP ? (psNoms[fP] || []) : [...new Set(vehicules.map(v => v.site))]

  const dispo = useMemo(() => {
    const byP = {}
    vehicules.forEach(v => {
      if (!byP[v.pays]) byP[v.pays] = { dispo:0, mission:0, entretien:0, hs:0, total:0 }
      byP[v.pays].total++
      if      (v.statut === 'Disponible')   byP[v.pays].dispo++
      else if (v.statut === 'En mission')   byP[v.pays].mission++
      else if (v.statut === 'En entretien') byP[v.pays].entretien++
      else if (v.statut === 'Hors service') byP[v.pays].hs++
    })
    return { byP, g: {
      dispo:     vehicules.filter(v => v.statut === 'Disponible').length,
      mission:   vehicules.filter(v => v.statut === 'En mission').length,
      entretien: vehicules.filter(v => v.statut === 'En entretien').length,
      hs:        vehicules.filter(v => v.statut === 'Hors service').length,
      total:     vehicules.length
    }}
  }, [vehicules])

  const alerts = useMemo(() => {
    const res = []
    vehicules.forEach(v => {
      [{ label:'Assurance', date:v.assurance }, { label:'Visite technique', date:v.visite }].forEach(d => {
        if (!d.date) return
        const days = daysDiff(d.date)
        if (days <= 60) res.push({ vehicule:v.immat, label:d.label, days, date:d.date, type: days <= 14 ? 'danger' : 'warning' })
      })
    })
    return res
  }, [vehicules])

  const mPer = useMemo(() => {
    const r = {}
    fMis.forEach(m => {
      const mo = m.depart?.slice(0,7); if (!mo) return
      if (!r[mo]) r[mo] = { v:0, t:0, a:0, r2:0, tot:0 }
      r[mo].tot++
      if      (m.statut === 'Validee')    r[mo].v++
      else if (m.statut === 'Terminee')   r[mo].t++
      else if (m.statut === 'En attente') r[mo].a++
      else if (m.statut === 'Rejetee')    r[mo].r2++
    })
    return r
  }, [fMis])

  const showMissions = profil?.profil === 'Chauffeur'
    ? missions.filter(m => m.chauffeur_id === user?.id)
    : profil?.profil === 'Staff'
      ? missions.filter(m => m.demandeurs?.some(d => d.demandeur?.id === user?.id))
      : fMis

  const avail   = vehicules.filter(v => v.statut === 'Disponible')
  const pending = missions.filter(m => m.statut === 'En attente')

  const SC_TABS = [
    { k:'dashboard', l:'Tableau de bord', icon:'📊' },
    { k:'vehicules', l:'Véhicules',       icon:'🚗' },
    { k:'missions',  l:'Missions',        icon:'📋' },
    { k:'carburant', l:'Carburant',       icon:'⛽' },
    { k:'entretien', l:'Entretiens',      icon:'🔧' },
    { k:'alertes',   l:'Alertes',         icon:'🔔', badge: alerts.length },
  ]
  const ALL_TABS = profil?.profil === 'Admin'
    ? [{ k:'backend', l:'Backend', icon:'🖥️' }, ...SC_TABS]
    : profil?.profil === 'Supply Chain' ? SC_TABS
    : [{ k:'missions', l: profil?.profil === 'Chauffeur' ? 'Mes missions' : 'Mes demandes', icon: profil?.profil === 'Chauffeur' ? '🚗' : '📋' }]

  const Chips = () => (
    <div className="chips">
      {Object.keys(psNoms).map(p => (
        <button key={p} className={`chip ${fP === p ? 'active' : ''}`} onClick={() => { setFP(fP === p ? '' : p); setFS('') }}>🌍 {p}</button>
      ))}
      {fP && allSites.map(s => (
        <button key={s} className={`chip ${fS === s ? 'active' : ''}`} onClick={() => setFS(fS === s ? '' : s)}>📍 {s}</button>
      ))}
      {allMois.map(m => (
        <button key={m} className={`chip ${fM === m ? 'active' : ''}`} onClick={() => setFM(fM === m ? '' : m)}>📅 {m}</button>
      ))}
      {(fP || fS || fM) && <button className="chip chip-r" onClick={() => { setFP(''); setFS(''); setFM('') }}>✕ Reset</button>}
    </div>
  )

 if (authLoading) return (
  <>
    <style>{CSS}</style>
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', 
      justifyContent:'center', background:'#eef2f5', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:48 }}>🚘</div>
      <div style={{ fontSize:14, fontWeight:600, color:'#00536A' }}>Chargement…</div>
      <button 
        onClick={() => window.location.reload()} 
        style={{ marginTop:16, padding:'8px 20px', background:'#00536A', 
          color:'white', border:'none', borderRadius:8, cursor:'pointer', fontSize:13 }}>
        Cliquer ici si ça ne charge pas
      </button>
    </div>
  </>
)

  if (!user) return <LoginScreen login={login} />

  return (
    <>
      <style>{CSS}</style>
      {toast   && <div className={`toast ${toast.type === 'error' ? 'te' : 'ts'}`}>{toast.msg}</div>}
      {confirm && <Confirm msg={confirm.msg} danger={confirm.danger} onOk={confirm.onOk} onCancel={() => setConfirm(null)} />}

      <div className="shell">
        <div className={`sidebar ${mobOpen ? 'open' : ''}`}>
          <div className="slogo">
            <div className="slogo-icon">🚘</div>
            <div>
              <div style={{ color:'white', fontWeight:800, fontSize:14 }}>ONG MUSO</div>
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:10 }}>Gestion de Flotte</div>
            </div>
          </div>
          <div style={{ padding:'10px 0', flex:1, overflowY:'auto' }}>
            {ALL_TABS.map(t => (
              <div key={t.k} className={`nav-item ${tab === t.k ? 'active' : ''}`} onClick={() => { setTab(t.k); setMobOpen(false) }}>
                <span className="nav-icon">{t.icon}</span>
                <span>{t.l}</span>
                {t.badge > 0 && <span className="nav-badge">{t.badge}</span>}
              </div>
            ))}
          </div>
          <div className="sfoot">
            <div className="nav-item" onClick={logout}><span className="nav-icon">⏏️</span><span>Déconnexion</span></div>
          </div>
        </div>
        {mobOpen && <div onClick={() => setMobOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:25 }} />}

        <div className="main">
          <div className="topbar">
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button className="ham" onClick={() => setMobOpen(s => !s)}>☰</button>
              <div className="topbar-title">{ALL_TABS.find(t => t.k === tab)?.l || ''}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ position:'relative' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setBell(b => !b); toutMarquerLu() }}>
                  🔔 {nonLues > 0 && <span style={{ background:'#FF8725', color:'white', borderRadius:20, padding:'1px 6px', fontSize:10, fontWeight:700 }}>{nonLues}</span>}
                </button>
                {bell && (
                  <div className="notif-panel">
                    <div style={{ padding:'11px 14px', fontWeight:700, fontSize:13, color:'#00536A', borderBottom:'1px solid #f3f4f6' }}>🔔 Notifications</div>
                    {notifs.length === 0
                      ? <div style={{ padding:16, textAlign:'center', color:'#9ca3af', fontSize:13 }}>Aucune notification</div>
                      : notifs.map(n => (
                        <div key={n.id} className={`ni ${n.lu ? '' : 'ni-u'}`}>
                          <div style={{ marginBottom:2 }}>{n.message}</div>
                          <div style={{ fontSize:10, color:'#9ca3af' }}>{new Date(n.created_at).toLocaleString('fr-FR')}</div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              <div className="user-pill">
                <div className="avatar">{profil?.initiales || '?'}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#00536A', lineHeight:1.2 }}>{profil?.nom}</div>
                  <div style={{ fontSize:10, color:'#9ca3af' }}>{profil?.profil}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={logout}>⏏️ Déco.</button>
            </div>
          </div>

          <div className="page">

            {tab === 'dashboard' && (
              <div>
                <Chips />
                <div className="grid4" style={{ marginBottom:14 }}>
                  <KPICard icon="🚗" label="Flotte"    value={`${vehicules.length} véh.`} sub={`${dispo.g.dispo} disponibles`} bg="#e6f2f5" />
                  <KPICard icon="📍" label="Km total"  value={fmt(vehicules.reduce((s,v) => s+v.km, 0))} sub="km" bg="#e6f5f1" ic="#059669" />
                  <KPICard icon="⛽" label="Carburant" value={fmt(fCarb.reduce((s,c) => s+c.litres, 0))+'  L'} bg="#fff3e8" ic="#FF8725" />
                  <KPICard icon="💰" label="Coûts"     value={fmt((fCarb.reduce((s,c) => s+c.cout,0)+fEnt.reduce((s,e) => s+e.cout,0))/1000)+' k FCFA'} bg="#fee2e2" ic="#dc2626" />
                </div>
                {alerts.length > 0 && (
                  <div onClick={() => setTab('alertes')} style={{ background:'#fff3e8', border:'1px solid #fdba74', borderRadius:12, padding:'12px 16px', marginBottom:14, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:700, color:'#FF8725', fontSize:14 }}>⚠️ {alerts.length} alerte(s)</div>
                      <div style={{ fontSize:12, color:'#9a6900', marginTop:2 }}>{alerts.filter(a=>a.type==='danger').length} critique(s) · {alerts.filter(a=>a.type==='warning').length} avertissement(s)</div>
                    </div>
                    <span style={{ color:'#FF8725', fontSize:20 }}>›</span>
                  </div>
                )}
                <div className="grid2" style={{ marginBottom:14 }}>
                  <div className="card">
                    <div style={{ fontWeight:700, fontSize:14, color:'#00536A', marginBottom:12 }}>🚦 Statuts véhicules</div>
                    <div className="stat-grid">
                      {[
                        { l:'Disponibles', n:dispo.g.dispo,     bg:'#d1fae5', c:'#065f46', icon:'✅' },
                        { l:'En mission',  n:dispo.g.mission,   bg:'#e6f2f5', c:'#00536A', icon:'🚗' },
                        { l:'Entretien',   n:dispo.g.entretien, bg:'#fff3e8', c:'#d97706', icon:'🔧' },
                        { l:'Hors service',n:dispo.g.hs,        bg:'#fee2e2', c:'#dc2626', icon:'⛔' },
                      ].map(s => (
                        <div key={s.l} className="stat-box" style={{ background:s.bg }}>
                          <div style={{ fontSize:20 }}>{s.icon}</div>
                          <div style={{ fontSize:26, fontWeight:800, color:s.c, lineHeight:1.1, marginTop:3 }}>{s.n}</div>
                          <div style={{ fontSize:10, fontWeight:600, color:s.c, opacity:.8, marginTop:2 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <div style={{ fontWeight:700, fontSize:14, color:'#00536A', marginBottom:12 }}>📊 Disponibilité par zone</div>
                    <DispoBar label="Flotte globale" {...dispo.g} />
                    {Object.entries(dispo.byP).map(([p,s]) => <DispoBar key={p} label={p} {...s} />)}
                  </div>
                </div>
                <div className="card">
                  <div style={{ fontWeight:700, fontSize:14, color:'#00536A', marginBottom:12 }}>📅 Missions par période</div>
                  {Object.entries(mPer).sort(([a],[b]) => b.localeCompare(a)).map(([mois,s]) => (
                    <div key={mois} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>{mois}</span>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>{s.tot}</span>
                      </div>
                      <div className="pbar">
                        {s.t  > 0 && <div style={{ width:Math.round(s.t /s.tot*100)+'%', background:'#9ca3af' }} />}
                        {s.v  > 0 && <div style={{ width:Math.round(s.v /s.tot*100)+'%', background:'#00919E' }} />}
                        {s.a  > 0 && <div style={{ width:Math.round(s.a /s.tot*100)+'%', background:'#FF8725' }} />}
                        {s.r2 > 0 && <div style={{ width:Math.round(s.r2/s.tot*100)+'%', background:'#dc2626' }} />}
                      </div>
                      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                        {s.t  > 0 && <span style={{ fontSize:10, color:'#9ca3af', fontWeight:600 }}>● Terminées ({s.t})</span>}
                        {s.v  > 0 && <span style={{ fontSize:10, color:'#00919E', fontWeight:600 }}>● Validées ({s.v})</span>}
                        {s.a  > 0 && <span style={{ fontSize:10, color:'#FF8725', fontWeight:600 }}>● En attente ({s.a})</span>}
                        {s.r2 > 0 && <span style={{ fontSize:10, color:'#dc2626', fontWeight:600 }}>● Rejetées ({s.r2})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'alertes' && (
              <div>
                {alerts.length === 0
                  ? <div className="card" style={{ textAlign:'center', color:'#059669', fontWeight:700, padding:32 }}>✅ Aucune alerte</div>
                  : alerts.map((a,i) => (
                    <div key={i} className={`alertc ${a.type==='danger'?'adanger':'awarning'}`}>
                      <div style={{ fontSize:26 }}>{a.type==='danger'?'🚨':'⚠️'}</div>
                      <div>
                        <div style={{ fontWeight:800, color:a.type==='danger'?'#dc2626':'#d97706' }}>{a.vehicule}</div>
                        <div style={{ fontSize:13, color:'#374151', marginTop:2 }}>{a.label}</div>
                        <div style={{ fontSize:12, fontWeight:700, marginTop:3, color:a.type==='danger'?'#dc2626':'#d97706' }}>
                          {a.days<=0?`⛔ Expiré depuis ${Math.abs(a.days)} j`:`⏳ J-${a.days} (${a.date})`}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {tab === 'vehicules' && (
              <div>
                <div className="ph">
                  <div className="pt">Véhicules ({vehicules.length})</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => exportHTML('Parc',['Immat.','Marque','Km','Statut','Pays','Site'],vehicules.map(v=>[v.immat,`${v.marque} ${v.modele}`,fmt(v.km),v.statut,v.pays,v.site]),'vehicules')}>📄 Export</button>
                    <button className="btn btn-p btn-sm" onClick={() => setSheet('vehicule')}>+ Ajouter</button>
                  </div>
                </div>
                <Chips />
                {vLoad ? <div style={{ textAlign:'center', padding:32 }}><div className="spin" /></div> : (
                  <div className="tw">
                    <table>
                      <thead><tr><th>Immatriculation</th><th>Véhicule</th><th>Km</th><th>Statut</th><th>Site</th><th>Assurance</th><th>Visite</th><th>Actions</th></tr></thead>
                      <tbody>
                        {vehicules.map(v => {
                          const aD=v.assurance?daysDiff(v.assurance):999, viD=v.visite?daysDiff(v.visite):999
                          return (
                            <tr key={v.id}>
                              <td><b style={{ color:'#00536A' }}>{v.immat}</b></td>
                              <td>{v.marque} {v.modele} <span style={{ color:'#9ca3af', fontSize:11 }}>({v.annee})</span></td>
                              <td>{fmt(v.km)} km</td>
                              <td><SBadge s={v.statut} /></td>
                              <td>{v.pays}/{v.site}</td>
                              <td style={{ color:aD<=30?'#dc2626':aD<=60?'#d97706':'inherit' }}>
                                {v.assurance||'—'}{aD<=60&&<div style={{ fontSize:10, fontWeight:700 }}>{aD<=0?'⛔ Expirée':`J-${aD}`}</div>}
                              </td>
                              <td style={{ color:viD<=30?'#dc2626':viD<=60?'#d97706':'inherit' }}>
                                {v.visite||'—'}{viD<=60&&<div style={{ fontSize:10, fontWeight:700 }}>{viD<=0?'⛔ Expirée':`J-${viD}`}</div>}
                              </td>
                              <td>
                                <button className="btn btn-danger btn-xs" onClick={() => setConfirm({ msg:`Supprimer ${v.immat} ?`, danger:true, onOk:()=>handleSupprimer(v) })}>🗑</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'missions' && (
              <div>
                <div className="ph">
                  <div className="pt">{profil?.profil==='Chauffeur'?'Mes missions':profil?.profil==='Staff'?'Mes demandes':'Missions'}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {profil?.profil==='Supply Chain' && pending.length>=2 && <button className="btn btn-a btn-sm" onClick={()=>setCombineModal(true)}>🔗 Combiner</button>}
                    {profil?.profil==='Supply Chain' && <button className="btn btn-outline btn-sm" onClick={()=>exportHTML('Missions',['Destination','Demandeur','Véhicule','Départ','Statut'],fMis.map(m=>[m.destination,m.demandeurs?.map(d=>d.demandeur?.nom).join(', '),m.vehicule?.immat||'—',m.depart,m.statut]),'missions')}>📄 Export</button>}
                    {profil?.profil!=='Chauffeur' && <button className="btn btn-p btn-sm" onClick={()=>setSheet('mission')}>+ Nouvelle</button>}
                  </div>
                </div>
                {profil?.profil==='Supply Chain' && <Chips />}
                <div className="grid2">
                  {showMissions.map(m => <MissionCard key={m.id} m={m} profil={profil?.profil} avail={avail} onValider={handleValider} onRejeter={handleRejeter} onCloturer={handleCloturer} />)}
                </div>
              </div>
            )}

            {tab === 'carburant' && (
              <div>
                <div className="ph">
                  <div className="pt">Suivi carburant</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-outline btn-sm" onClick={()=>exportHTML('Carburant',['Véhicule','Date','Litres','Coût','Station'],fCarb.map(c=>[c.vehicule?.immat,c.date,c.litres+' L',fmt(c.cout)+' FCFA',c.station]),'carburant')}>📄 Export</button>
                    <button className="btn btn-p btn-sm" onClick={()=>setSheet('carburant')}>+ Ravitaillement</button>
                  </div>
                </div>
                <Chips />
                <div className="grid2" style={{ marginBottom:14 }}>
                  <KPICard icon="⛽" label="Total" value={fmt(fCarb.reduce((s,c)=>s+c.litres,0))+' L'} bg="#fff3e8" ic="#FF8725" />
                  <KPICard icon="💰" label="Coût"  value={fmt(fCarb.reduce((s,c)=>s+c.cout,0))+' FCFA'} bg="#fee2e2" ic="#dc2626" />
                </div>
                <div className="tw">
                  <table>
                    <thead><tr><th>Véhicule</th><th>Date</th><th>Litres</th><th>Coût (FCFA)</th><th>Station</th><th>Km</th></tr></thead>
                    <tbody>{fCarb.map(c=><tr key={c.id}><td><b>{c.vehicule?.immat}</b></td><td>{c.date}</td><td style={{color:'#FF8725',fontWeight:700}}>{c.litres} L</td><td>{fmt(c.cout)}</td><td>{c.station}</td><td>{fmt(c.km)}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'entretien' && (
              <div>
                <div className="ph">
                  <div className="pt">Entretiens & Maintenance</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-outline btn-sm" onClick={()=>exportHTML('Entretiens',['Véhicule','Type','Date','Coût','Statut'],fEnt.map(e=>[e.vehicule?.immat,e.type,e.date,fmt(e.cout)+' FCFA',e.statut]),'entretiens')}>📄 Export</button>
                    <button className="btn btn-p btn-sm" onClick={()=>setSheet('entretien')}>+ Planifier</button>
                  </div>
                </div>
                <Chips />
                <div style={{ background:'#e6f2f5', border:'1px solid #b2d8df', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#00536A' }}>
                  <b>Workflow :</b> Planifie → En cours → Effectue. À <b>Effectue</b>, le véhicule repasse <b>Disponible</b>.
                </div>
                <div className="tw">
                  <table>
                    <thead><tr><th>Véhicule</th><th>Type</th><th>Date</th><th>Km</th><th>Coût</th><th>Prestataire</th><th>Statut</th><th>Progression</th><th>Action</th></tr></thead>
                    <tbody>
                      {fEnt.map(e=>(
                        <tr key={e.id}>
                          <td><b>{e.vehicule?.immat}</b></td><td>{e.type}</td><td>{e.date}</td><td>{fmt(e.km)}</td><td>{fmt(e.cout)} FCFA</td><td>{e.prestataire}</td>
                          <td><SBadge s={e.statut} /></td>
                          <td style={{ minWidth:150 }}><Stepper statut={e.statut} /></td>
                          <td>{E_NEXT[e.statut]
                            ? <button className="btn btn-p btn-xs" onClick={()=>setConfirm({ msg:`Marquer "${E_NEXT[e.statut]}" ?`, onOk:()=>handleAvancer(e) })}>→ {E_NEXT[e.statut]}</button>
                            : <span style={{ fontSize:12, color:'#059669', fontWeight:700 }}>✅ Terminé</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'backend' && profil?.profil === 'Admin' && (
              <div>
                <div className="ph"><div className="pt">🖥️ Backend</div><span style={{ fontSize:12, background:'#fee2e2', color:'#dc2626', padding:'4px 10px', borderRadius:20, fontWeight:700 }}>🔒 Admin</span></div>
                <div style={{ background:'#e6f2f5', border:'1px solid #b2d8df', borderRadius:10, padding:'10px 14px', marginBottom:18, fontSize:13, color:'#00536A' }}>
                  ✅ Données réelles depuis Supabase PostgreSQL.
                </div>
                {[
                  { label:'🚗 VEHICULES',  data:vehicules,  cols:['immat','marque','statut','km','pays','site'],        r:v=>({ immat:v.immat, marque:`${v.marque} ${v.modele}`, statut:v.statut, km:fmt(v.km), pays:v.pays, site:v.site }) },
                  { label:'📋 MISSIONS',   data:missions,   cols:['destination','statut','depart','passagers'],          r:m=>({ destination:m.destination, statut:m.statut, depart:m.depart, passagers:m.passagers }) },
                  { label:'⛽ CARBURANT',  data:carburant,  cols:['vehicule','date','litres','cout','station'],          r:c=>({ vehicule:c.vehicule?.immat, date:c.date, litres:c.litres, cout:fmt(c.cout), station:c.station }) },
                  { label:'🔧 ENTRETIENS', data:entretiens, cols:['vehicule','type','statut','date','cout'],             r:e=>({ vehicule:e.vehicule?.immat, type:e.type, statut:e.statut, date:e.date, cout:fmt(e.cout) }) },
                ].map(t=>(
                  <div key={t.label} style={{ marginBottom:22 }}>
                    <div style={{ fontWeight:800, fontSize:13, color:'#00536A', marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                      {t.label}<span style={{ fontSize:11, background:'#e6f2f5', color:'#00919E', padding:'2px 9px', borderRadius:20 }}>{t.data.length} lignes</span>
                    </div>
                    <div className="tw"><table><thead><tr>{t.cols.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{t.data.map((row,i)=>{const r=t.r(row);return<tr key={i}>{t.cols.map(c=><td key={c}>{String(r[c]??'')}</td>)}</tr>})}</tbody></table></div>
                  </div>
                ))}
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:'#00536A', marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    🌍 PAYS &amp; SITES
                    <button className="btn btn-p btn-xs" onClick={()=>setEditPS(e=>!e)}>{editPS?'✕ Fermer':'✏️ Modifier'}</button>
                  </div>
                  <div className="tw" style={{ marginBottom:editPS?14:0 }}>
                    <table>
                      <thead><tr><th>Pays</th><th>Site</th>{editPS&&<th>Actions</th>}</tr></thead>
                      <tbody>
                        {Object.entries(ps).flatMap(([pays,sites])=>sites.map((s,i)=>(
                          <tr key={pays+s.site}>
                            {i===0&&<td rowSpan={sites.length} style={{ fontWeight:700, color:'#00536A', verticalAlign:'top', paddingTop:14 }}>
                              {editPS?<div style={{ display:'flex', gap:5, alignItems:'center' }}>{pays}<button className="btn btn-ghost btn-xs" onClick={()=>setPsForm({ mode:'pays', pays, val:pays })}>✏️</button></div>:pays}
                            </td>}
                            <td>{s.site}</td>
                            {editPS&&<td><div style={{ display:'flex', gap:5 }}>
                              <button className="btn btn-ghost btn-xs" onClick={()=>setPsForm({ mode:'site', pays, id:s.id, oldVal:s.site, val:s.site })}>✏️</button>
                              <button className="btn btn-danger btn-xs" onClick={()=>setConfirm({ msg:`Supprimer "${s.site}" ?`, danger:true, onOk:async()=>{await supprimerSite(s.id);setConfirm(null);notify('Site supprimé.')} })}>🗑</button>
                            </div></td>}
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                  {editPS&&(
                    <div className="grid2">
                      <div className="card" style={{ padding:14 }}>
                        <div style={{ fontWeight:700, color:'#00536A', marginBottom:10, fontSize:13 }}>+ Ajouter un pays</div>
                        <div className="fg"><label className="fl">Nom du pays</label><input value={newPays} onChange={e=>setNewPays(e.target.value)} placeholder="Ex: Côte d'Ivoire" className="fi"/></div>
                        <button className="btn btn-p btn-sm" style={{ width:'100%', justifyContent:'center' }} onClick={async()=>{await ajouterPays(newPays);setNewPays('');notify('Pays ajouté.')}}>Ajouter</button>
                      </div>
                      <div className="card" style={{ padding:14 }}>
                        <div style={{ fontWeight:700, color:'#00536A', marginBottom:10, fontSize:13 }}>+ Ajouter un site</div>
                        <div className="fg"><label className="fl">Pays</label>
                          <select value={newSite.pays} onChange={e=>setNewSite({...newSite,pays:e.target.value})} className="fi">
                            <option value="">-- Choisir --</option>
                            {Object.keys(ps).map(p=><option key={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="fg"><label className="fl">Nom du site</label><input value={newSite.val} onChange={e=>setNewSite({...newSite,val:e.target.value})} placeholder="Ex: Tombouctou" className="fi"/></div>
                        <button className="btn btn-p btn-sm" style={{ width:'100%', justifyContent:'center' }} onClick={async()=>{await ajouterSite(newSite.pays,newSite.val);setNewSite({pays:'',val:''});notify('Site ajouté.')}}>Ajouter</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mnav">
            <div className="mnav-inner">
              {ALL_TABS.slice(0,6).map(t=>(
                <button key={t.k} className={`mnbtn ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>
                  <span className="mnicon">{t.icon}</span><span>{t.l.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {sheet==='mission'&&<Modal title="Nouvelle demande" onClose={()=>setSheet(null)} onSubmit={()=>save(async()=>{await crM({destination:mf.destination,depart:mf.depart,retour:mf.retour,objet:mf.objet,passagers:parseInt(mf.passagers)||1,pays:mf.pays,site:mf.site,statut:'En attente'},user.id);setMf({destination:'',depart:'',retour:'',objet:'',passagers:1,pays:'',site:''});notify('Demande soumise!')})} submitLabel="Soumettre" loading={saving}>
        <div className="fgrid"><FI full label="Destination" value={mf.destination} onChange={v=>setMf({...mf,destination:v})}/><FI label="Date départ" type="date" value={mf.depart} onChange={v=>setMf({...mf,depart:v})}/><FI label="Date retour" type="date" value={mf.ret} onChange={v=>setMf({...mf,retour:v})}/><FI full label="Objet" value={mf.objet} onChange={v=>setMf({...mf,objet:v})}/><FI label="Passagers" type="number" value={mf.passagers} onChange={v=>setMf({...mf,passagers:v})}/><FS label="Pays" value={mf.pays} onChange={v=>setMf({...mf,pays:v,site:''})} options={Object.keys(psNoms)}/><FS full label="Site" value={mf.site} onChange={v=>setMf({...mf,site:v})} options={mf.pays?psNoms[mf.pays]:[]}/></div>
      </Modal>}

      {sheet==='vehicule'&&<Modal title="Ajouter un véhicule" onClose={()=>setSheet(null)} onSubmit={()=>save(async()=>{await ajV({immat:vf.immat,marque:vf.marque,modele:vf.modele,annee:parseInt(vf.annee)||null,km:parseInt(vf.km)||0,pays:vf.pays,site:vf.site,assurance:vf.assurance||null,visite:vf.visite||null,statut:vf.statut});setVf({immat:'',marque:'',modele:'',annee:'',km:'',pays:'',site:'',assurance:'',visite:'',statut:'Disponible'});notify('Véhicule ajouté!')})} loading={saving}>
        <div className="fgrid"><FI label="Immatriculation" value={vf.immat} onChange={v=>setVf({...vf,immat:v})}/><FI label="Marque" value={vf.marque} onChange={v=>setVf({...vf,marque:v})}/><FI label="Modèle" value={vf.modele} onChange={v=>setVf({...vf,modele:v})}/><FI label="Année" type="number" value={vf.annee} onChange={v=>setVf({...vf,annee:v})}/><FI label="Km actuel" type="number" value={vf.km} onChange={v=>setVf({...vf,km:v})}/><FS label="Statut" value={vf.statut} onChange={v=>setVf({...vf,statut:v})} options={['Disponible','En entretien','Hors service']}/><FS label="Pays" value={vf.pays} onChange={v=>setVf({...vf,pays:v,site:''})} options={Object.keys(psNoms)}/><FS label="Site" value={vf.site} onChange={v=>setVf({...vf,site:v})} options={vf.pays?psNoms[vf.pays]:[]}/><FI label="Fin assurance" type="date" value={vf.assurance} onChange={v=>setVf({...vf,assurance:v})}/><FI label="Fin visite tech." type="date" value={vf.visite} onChange={v=>setVf({...vf,visite:v})}/></div>
      </Modal>}

      {sheet==='entretien'&&<Modal title="Planifier un entretien" onClose={()=>setSheet(null)} onSubmit={()=>save(async()=>{await ajE({vehicule_id:ef.vehicule_id,type:ef.type,date:ef.date,km:parseInt(ef.km)||0,cout:parseInt(ef.cout)||0,prestataire:ef.prestataire,notes:ef.notes,pays:vehicules.find(v=>v.id===ef.vehicule_id)?.pays||'',site:vehicules.find(v=>v.id===ef.vehicule_id)?.site||''});setEf({vehicule_id:'',type:'',date:'',km:'',cout:'',prestataire:'',notes:''});notify('Entretien planifié!')})} loading={saving}>
        <div className="fgrid"><FS full label="Véhicule" value={ef.vehicule_id} onChange={v=>setEf({...ef,vehicule_id:v})} options={vehicules.map(v=>({v:v.id,l:`${v.immat} · ${v.marque} ${v.modele}`}))}/><FS label="Type" value={ef.type} onChange={v=>setEf({...ef,type:v})} options={['Vidange','Révision générale','Changement pneus','Freins','Climatisation','Réparation moteur','Autre']}/><FI label="Date prévue" type="date" value={ef.date} onChange={v=>setEf({...ef,date:v})}/><FI label="Km compteur" type="number" value={ef.km} onChange={v=>setEf({...ef,km:v})}/><FI label="Coût FCFA" type="number" value={ef.cout} onChange={v=>setEf({...ef,cout:v})}/><FI label="Prestataire" value={ef.prestataire} onChange={v=>setEf({...ef,prestataire:v})}/><FI full label="Notes" value={ef.notes} onChange={v=>setEf({...ef,notes:v})} placeholder="Ex: En attente de pièces…"/></div>
      </Modal>}

      {sheet==='carburant'&&<Modal title="Ravitaillement" onClose={()=>setSheet(null)} onSubmit={()=>save(async()=>{await ajC({vehicule_id:cf.vehicule_id,date:cf.date,litres:parseFloat(cf.litres)||0,cout:parseInt(cf.cout)||0,station:cf.station,km:parseInt(cf.km)||0,pays:vehicules.find(v=>v.id===cf.vehicule_id)?.pays||'',site:vehicules.find(v=>v.id===cf.vehicule_id)?.site||''});setCf({vehicule_id:'',date:'',litres:'',cout:'',station:'',km:''});notify('Ravitaillement enregistré!')})} loading={saving}>
        <div className="fgrid"><FS full label="Véhicule" value={cf.vehicule_id} onChange={v=>setCf({...cf,vehicule_id:v})} options={vehicules.map(v=>({v:v.id,l:`${v.immat} · ${v.marque}`}))}/><FI label="Date" type="date" value={cf.date} onChange={v=>setCf({...cf,date:v})}/><FI label="Km compteur" type="number" value={cf.km} onChange={v=>setCf({...cf,km:v})}/><FI label="Litres" type="number" value={cf.litres} onChange={v=>setCf({...cf,litres:v})}/><FI label="Coût FCFA" type="number" value={cf.cout} onChange={v=>setCf({...cf,cout:v})}/><FI full label="Station" value={cf.station} onChange={v=>setCf({...cf,station:v})}/></div>
      </Modal>}

      {combineModal&&<Modal title="🔗 Combiner des missions" wide onClose={()=>{setCombineModal(false);setSelComb([]);setCombObj('')}} onSubmit={handleCombiner} submitLabel="Combiner" loading={saving}>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:12 }}>Sélectionnez les demandes à regrouper :</p>
        <div style={{ maxHeight:260, overflowY:'auto', marginBottom:14 }}>
          {pending.map(m=>(
            <div key={m.id} onClick={()=>setSelComb(s=>s.includes(m.id)?s.filter(x=>x!==m.id):[...s,m.id])}
              style={{ border:`2px solid ${selComb.includes(m.id)?'#00919E':'#e5e7eb'}`, borderRadius:10, padding:'10px 12px', marginBottom:7, cursor:'pointer', background:selComb.includes(m.id)?'#e6f2f5':'white', display:'flex', gap:10 }}>
              <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:2, border:`2px solid ${selComb.includes(m.id)?'#00919E':'#d1d5db'}`, background:selComb.includes(m.id)?'#00919E':'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {selComb.includes(m.id)&&<span style={{ color:'white', fontSize:11, fontWeight:700 }}>✓</span>}
              </div>
              <div><div style={{ fontWeight:700, color:'#00536A' }}>📍 {m.destination}</div><div style={{ fontSize:12, color:'#6b7280' }}>{m.demandeurs?.map(d=>d.demandeur?.nom).join(', ')} · {m.objet}</div></div>
            </div>
          ))}
        </div>
        {selComb.length>=2&&<><div style={{ background:'#e6f2f5', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#00536A' }}><b>Récap :</b> {missions.filter(m=>selComb.includes(m.id)).reduce((s,m)=>s+(m.passagers||0),0)} pass. · {missions.filter(m=>selComb.includes(m.id)).map(m=>m.destination).join(' + ')}</div>
        <div className="fg ffull"><label className="fl">Objet (optionnel)</label><input value={combObj} onChange={e=>setCombObj(e.target.value)} placeholder="Ex: Tournée terrain" className="fi"/></div></>}
      </Modal>}

      {psForm&&<Modal title={psForm.mode==='pays'?`✏️ Renommer "${psForm.pays}"`:`✏️ Renommer "${psForm.oldVal}"`} onClose={()=>setPsForm(null)} onSubmit={async()=>{try{if(psForm.mode==='pays')await renommerPays(psForm.pays,psForm.val);else await renommerSite(psForm.id,psForm.pays,psForm.oldVal,psForm.val);notify('Renommé!')}catch(e){notify(e.message,'error')}setPsForm(null)}}>
        <div className="fg ffull"><label className="fl">Nouveau nom</label><input value={psForm.val} onChange={e=>setPsForm({...psForm,val:e.target.value})} className="fi" autoFocus/></div>
      </Modal>}
    </>
  )
}
