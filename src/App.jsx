import { useState, useMemo } from 'react'
import { useAuth }          from './hooks/useAuth'
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
