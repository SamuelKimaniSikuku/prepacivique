import { useState, useEffect, useRef, useCallback } from "react";
import ALL_QUESTIONS from './data/questions';
import { normalizeCode, requestActivation, CODE_MESSAGES } from './activation';

const STRIPE_LINK = "https://buy.stripe.com/9B63cxewr3QW3w2bXG0sU00";
const TRIAL_PER_THEME = 10;
const SUPABASE_URL = "https://vnctdsnfxvwvmkxqygaw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZuY3Rkc25meHZ3dm1reHF5Z2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDk1NjcsImV4cCI6MjA4NjgyNTU2N30.qGAMzs2doeMFo3HoIlp4ao2s-crYR2JoOL_A7xrRCm8";

const THEMES = [
  { id:"valeurs",      label:"Principes & Valeurs",        icon:"⚖️",  color:"#C41E3A" },
  { id:"institutions", label:"Institutions & Politique",   icon:"🏛️", color:"#2D6A4F" },
  { id:"droits",       label:"Droits & Devoirs",           icon:"📜",  color:"#C41E3A" },
  { id:"histoire",     label:"Histoire, Géo & Culture",    icon:"🗺️", color:"#6B21A8" },
  { id:"societe",      label:"Vie en Société",             icon:"🤝",  color:"#B8720A" },
];

// CSP / CR / NAT levels mapping
const LEVELS = [
  {
    id: "CSP",
    label: "Préparer CSP",
    fullLabel: "Préparation CSP",
    sub: "Carte de séjour pluriannuelle",
    icon: "🎓",
    color: "#1A3A5C",
    bg: "#F0F4F8",
    themes: ["valeurs","societe","droits"],
    desc: "Multi-year residence permit",
  },
  {
    id: "CR",
    label: "Préparer CR",
    fullLabel: "Préparation CR",
    sub: "Carte de résident",
    icon: "🏅",
    color: "#2E7D52",
    bg: "#EDF7F2",
    themes: ["valeurs","institutions","droits","histoire","societe"],
    desc: "Resident card",
  },
  {
    id: "NAT",
    label: "Préparer NAT",
    fullLabel: "Préparation NAT",
    sub: "Naturalisation",
    icon: "👑",
    color: "#7C3AED",
    bg: "#F5F3FF",
    themes: ["valeurs","institutions","droits","histoire","societe"],
    desc: "Naturalization",
  },
];

const LANGUAGES = [
  { code:"fr", label:"Français",   flag:"🇫🇷", native:"Français",  tts:"fr-FR" },
  { code:"en", label:"English",    flag:"🇬🇧", native:"English",   tts:"en-GB" },
  { code:"ar", label:"Arabic",     flag:"🇹🇳", native:"العربية",  tts:"ar-SA", rtl:true },
  { code:"es", label:"Spanish",    flag:"🇪🇸", native:"Español",   tts:"es-ES" },
  { code:"pt", label:"Portuguese", flag:"🇵🇹", native:"Português", tts:"pt-PT" },
  { code:"it", label:"Italian",    flag:"🇮🇹", native:"Italiano",  tts:"it-IT" },
  { code:"de", label:"German",     flag:"🇩🇪", native:"Deutsch",   tts:"de-DE" },
  { code:"tr", label:"Turkish",    flag:"🇹🇷", native:"Türkçe",    tts:"tr-TR" },
  { code:"zh", label:"Chinese",    flag:"🇨🇳", native:"中文",       tts:"zh-CN" },
  { code:"ro", label:"Romanian",   flag:"🇷🇴", native:"Română",    tts:"ro-RO" },
  { code:"pl", label:"Polish",     flag:"🇵🇱", native:"Polski",    tts:"pl-PL" },
];

const SPEEDS = [{ label:"0.75×", v:0.75 },{ label:"1×", v:1 },{ label:"1.25×", v:1.25 },{ label:"1.5×", v:1.5 }];

const BATCH_SIZE = 5;
// Translation runs through the Supabase Edge Function "translate" so the
// Anthropic key stays server-side and is never shipped in the browser bundle.
const TRANSLATION_ENDPOINT = `${SUPABASE_URL}/functions/v1/translate`;

async function translateBatch(questions, targetLangCode) {
  const res = await fetch(TRANSLATION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ questions: questions.map(q=>({q:q.q,c:q.c,e:q.e})), lang: targetLangCode }),
  });
  if (!res.ok) throw new Error(`Translation failed (${res.status})`);
  const data = await res.json();
  const parsed = data.translations;
  if (!Array.isArray(parsed)) throw new Error("Bad translation response");
  return parsed.map((translated, idx) => {
    const original = questions[idx];
    if (!translated || !Array.isArray(translated.c) || translated.c.length !== original.c.length) return original;
    return translated;
  });
}

function Waveform({ active, color="#fff", size=16 }) {
  if (!active) return null;
  return <span style={{display:"inline-flex",alignItems:"center",gap:2,height:size}}>{[.4,.9,.6,1,.7,.85,.4].map((h,i)=><span key={i} style={{display:"inline-block",width:2.5,borderRadius:2,background:color,height:size*h,animation:`wv${i%4} .8s ease-in-out ${i*0.09}s infinite`}}/>)}</span>;
}

// ── PAYWALL MODAL ─────────────────────────────────────────────────────────────
function PaywallModal({ reason, onClose, codeInput, setCodeInput, codeStatus, handleCodeSubmit }) {
  const reasons = {
    quiz:   { icon:"🔒", title:"Essai terminé !", sub:`Vous avez exploré les ${TRIAL_PER_THEME} questions d'essai de ce thème.` },
    listen: { icon:"🎧", title:"Fonctionnalité Premium", sub:"Le mode écoute complet est réservé aux abonnés." },
    lang:   { icon:"🌐", title:"Fonctionnalité Premium", sub:"La traduction en 11 langues est réservée aux abonnés." },
  };
  const r = reasons[reason]||reasons.quiz;
  const statusColor = codeStatus==="ok"?"#2E7D52":(codeStatus==="invalid"||codeStatus==="unavailable")?"#C0392B":"#C0392B";
  const statusMsg = CODE_MESSAGES[codeStatus];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:12,padding:"32px 28px",maxWidth:420,width:"100%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,.18)",position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:16,background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9CA3AF"}}>✕</button>
        <div style={{fontSize:44,marginBottom:10}}>{r.icon}</div>
        <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:"#0F1923"}}>{r.title}</h2>
        <p style={{margin:"0 0 20px",color:"#6B7280",fontSize:13,lineHeight:1.7}}>{r.sub}</p>
        <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" style={{display:"block",background:"#0F1923",color:"white",borderRadius:8,padding:"13px",fontWeight:700,fontSize:14,textDecoration:"none",marginBottom:16}}>
          💳 Accès complet — 5,00 € →
        </a>
        <div style={{background:"#F5F6F8",borderRadius:8,padding:"14px",border:"1px solid #E5E7EB"}}>
          <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>Code d'activation</div>
          <div style={{display:"flex",gap:7}}>
            <input value={codeInput} onChange={e=>{setCodeInput(e.target.value);if(codeStatus!=="checking")setCodeStatus(null);}} disabled={codeStatus==="checking"} aria-label="Code d’activation" autoComplete="off" spellCheck={false} onKeyDown={e=>e.key==="Enter"&&handleCodeSubmit()} placeholder="CIVIC-XXXX-XXXX-XXXX"
              style={{flex:1,padding:"9px 11px",borderRadius:6,border:`1.5px solid ${(codeStatus==="invalid"||codeStatus==="unavailable")?"#C0392B":codeStatus==="ok"?"#2E7D52":"#D1D5DB"}`,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
            <button onClick={handleCodeSubmit} disabled={codeStatus==="checking"||codeStatus==="ok"}
              style={{background:"#0F1923",color:"white",border:"none",borderRadius:6,padding:"9px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>
              {codeStatus==="checking"?"…":"OK"}
            </button>
          </div>
          {statusMsg&&<div style={{marginTop:7,fontSize:12,fontWeight:600,color:statusColor}} role="status">{statusMsg}</div>}
        </div>
        <button onClick={onClose} style={{marginTop:12,background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:12}}>Continuer l'essai gratuit</button>
      </div>
    </div>
  );
}

// ── STATS CARD ────────────────────────────────────────────────────────────────
function StatsCard({ label, value }) {
  return (
    <div style={{background:"white",borderRadius:10,border:"1px solid #EAECEF",borderTop:"3px solid #1A3A5C",padding:"20px 16px",textAlign:"center",flex:1,minWidth:100}}>
      <div style={{fontSize:13,color:"#6B7280",marginBottom:8}}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color:"#0F1923"}}>{value}</div>
    </div>
  );
}

// ── SIDEBAR NAV ───────────────────────────────────────────────────────────────
function Sidebar({ activeLevel, setActiveLevel, screen, setScreen, isPremium, stats, stopAll, onNavigate }) {
  const navItems = [
    { id:"home", label:"Accueil", icon:"🏠" },
    ...LEVELS.map(l => ({ id:`level-${l.id}`, label:l.label, icon:l.icon, levelId:l.id })),
    { id:"profile", label:"Profil", icon:"👤" },
  ];

  return (
    <div style={{width:220,flexShrink:0,background:"#0F1923",borderRight:"none",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
      {/* Logo */}
      <div style={{padding:"20px 20px 16px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>📖</span>
          <div>
            <span style={{fontWeight:800,fontSize:14,color:"#E8B84B"}}>prépa</span>
            <span style={{fontWeight:800,fontSize:14,color:"#FFFFFF"}}>civique</span>
          </div>
        </div>
        {isPremium && <div style={{marginTop:6,background:"rgba(232,184,75,.2)",color:"#E8B84B",borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700,display:"inline-block"}}>⭐ PREMIUM</div>}
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:"12px 10px"}}>
        {navItems.map(item => {
          const isActive = item.id === "home" ? screen === "home" && !activeLevel
            : item.levelId ? activeLevel === item.levelId
            : screen === item.id;
          return (
            <button key={item.id} onClick={() => {
              stopAll();
              if (item.id === "home") { setActiveLevel(null); setScreen("home"); }
              else if (item.levelId) { setActiveLevel(item.levelId); setScreen("level"); }
              else { setActiveLevel(null); setScreen(item.id); }
              onNavigate?.();
            }} style={{
              display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",
              borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",marginBottom:2,
              background:isActive?"rgba(232,184,75,.15)":"transparent",
              color:isActive?"#E8B84B":"rgba(255,255,255,.7)",fontWeight:isActive?600:400,fontSize:13,
            }}>
              <span style={{fontSize:15}}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Unlock banner */}
      {!isPremium && (
        <div style={{margin:"10px",background:"#1A3A5C",borderRadius:8,padding:"14px 12px",color:"white",cursor:"pointer"}} onClick={() => { setScreen("pricing"); onNavigate?.(); }}>
          <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>🔓 Débloquer l'accès</div>
          <div style={{fontSize:11,opacity:.7,marginBottom:8}}>{ALL_QUESTIONS.length} questions · 11 langues · Audio</div>
          <div style={{background:"#1A3A5C",borderRadius:6,padding:"6px",textAlign:"center",fontWeight:700,fontSize:12}}>5,00 € →</div>
        </div>
      )}
    </div>
  );
}

// ── LEVEL DASHBOARD ───────────────────────────────────────────────────────────
function LevelDashboard({ level, stats, onStartQuiz, onPromptQuiz, onStartMockExam, onStartListen, isPremium, checkPremium }) {
  const lv = LEVELS.find(l => l.id === level);
  const levelQuestions = ALL_QUESTIONS.filter(q => lv.themes.includes(q.theme));
  const levelStats = stats[level] || { answered:0, correct:0, exams:0, scores:[] };
  const successRate = levelStats.answered > 0 ? Math.round((levelStats.correct / levelStats.answered) * 100) : 0;
  const avgScore = levelStats.scores.length > 0 ? Math.round(levelStats.scores.reduce((a,b)=>a+b,0)/levelStats.scores.length) : null;

  return (
    <div>
      <div style={{marginBottom:6,fontSize:13,color:"#6B7280",cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4}}>
        ← Retour au tableau de bord
      </div>
      <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:"#0F1923"}}>{lv.fullLabel}</h1>
      <div style={{color:"#6B7280",fontSize:14,marginBottom:20}}>{lv.sub}</div>

      {/* Stats row */}
      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <StatsCard label="Questions répondues" value={levelStats.answered} />
        <StatsCard label="Réponses correctes" value={levelStats.correct} />
        <StatsCard label="Taux de réussite" value={`${successRate}%`} />
        <StatsCard label="Examens passés" value={levelStats.exams} />
        <StatsCard label="Score moyen" value={avgScore !== null ? `${avgScore}%` : "—"} />
      </div>

      {/* Action cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14,marginBottom:24}}>
        {/* Practice */}
        <div onClick={() => onPromptQuiz(null, lv.themes)}
          style={{background:"white",borderRadius:10,border:"2px solid #0F1923",padding:"22px",cursor:"pointer",transition:"all .2s"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"#F3F4F6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📖</div>
            {isPremium
              ? <span style={{background:"#DCFCE7",color:"#166534",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>✓ Accès complet</span>
              : <span style={{background:"#FEF9C3",color:"#854D0E",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>🆓 10 questions d'essai</span>
            }
          </div>
          <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:4}}>Pratiquer par sections</div>
          <div style={{fontSize:12,color:"#6B7280"}}>{isPremium ? `Accès aux ${ALL_QUESTIONS.length} questions d'entraînement` : "Entraînez-vous sur les 5 thèmes de l'examen"}</div>
        </div>

        {/* Mock exam */}
        <div onClick={() => { if(!checkPremium("quiz")) return; onStartMockExam(); }}
          style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"22px",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"#F3F4F6",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📝</div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontSize:11,color:"#9CA3AF"}}>26 examens</span>
              {!isPremium && <span style={{fontSize:12}}>🔒</span>}
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:4}}>Passer un examen blanc</div>
          <div style={{fontSize:12,color:"#6B7280"}}>Simulez l'examen officiel (40 questions, 45 min)</div>
        </div>

        {/* Listen - Réviser erreurs */}
        <div onClick={() => { if(!checkPremium("listen")) return; onStartListen(null, lv.themes); }}
          style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"22px",cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.08)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"#FEF3EE",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎧</div>
            {!isPremium && <span style={{fontSize:12}}>🔒</span>}
          </div>
          <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:4}}>Écouter ce niveau</div>
          <div style={{fontSize:12,color:"#6B7280"}}>Questions + réponses + explications audio pour ce niveau</div>
        </div>

        {/* Play All */}
        <div onClick={() => { if(!checkPremium("listen")) return; onStartListen(null, lv.themes); }}
          style={{background:"linear-gradient(135deg,#1a0a3a,#3b1f7a)",borderRadius:10,border:"1px solid #3b1f7a",padding:"22px",cursor:"pointer",color:"white"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(107,33,168,.35)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"rgba(255,255,255,.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>▶</div>
            <span style={{background:"rgba(255,255,255,.15)",color:"white",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>{levelQuestions.length} questions</span>
          </div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Tout écouter</div>
          <div style={{fontSize:12,opacity:.8}}>Audio complet — questions · réponses · explications</div>
        </div>

        {/* Quiz All */}
        <div onClick={() => { if(!checkPremium("quiz")) return; onPromptQuiz(null, lv.themes); }}
          style={{background:"linear-gradient(135deg,#1C1917,#C41E3A)",borderRadius:10,border:"none",padding:"22px",cursor:"pointer",color:"white",position:"relative"}}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(196,30,58,.35)"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
            <div style={{width:40,height:40,background:"rgba(255,255,255,.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🎯</div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{background:"rgba(255,255,255,.15)",color:"white",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>{levelQuestions.length} questions</span>
              {!isPremium && <span style={{fontSize:14}}>🔒</span>}
            </div>
          </div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Quiz complet</div>
          <div style={{fontSize:12,opacity:.8}}>{isPremium ? "Choisir le nombre de questions · sans minuterie" : "Fonctionnalité Premium — débloquez l'accès complet"}</div>
        </div>
      </div>

      {/* Progression by section */}
      <div style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:20,color:"#0F1923"}}>Progression par section</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:20}}>
          {THEMES.map(t => {
            const themeProgress = (stats[level]?.byTheme?.[t.id] || 0);
            const total = ALL_QUESTIONS.filter(q=>q.theme===t.id).length;
            const pct = total > 0 ? Math.round((themeProgress/total)*100) : 0;
            return (
              <div key={t.id} style={{textAlign:"center"}}>
                <div style={{position:"relative",width:72,height:72,margin:"0 auto 10px"}}>
                  <svg viewBox="0 0 72 72" style={{width:72,height:72,transform:"rotate(-90deg)"}}>
                    <circle cx="36" cy="36" r="28" fill="none" stroke="#F3F4F6" strokeWidth="6"/>
                    <circle cx="36" cy="36" r="28" fill="none" stroke="#E8B84B" strokeWidth="6"
                      strokeDasharray={`${2*Math.PI*28}`}
                      strokeDashoffset={`${2*Math.PI*28*(1-pct/100)}`}
                      strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#0F1923"}}>{pct}%</div>
                </div>
                <div style={{fontSize:11,color:"#6B7280",lineHeight:1.4}}>{t.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── HOME DASHBOARD ────────────────────────────────────────────────────────────
function HomeDashboard({ stats, onSelectLevel }) {
  const totalAnswered = Object.values(stats).reduce((a,b)=>a+(b.answered||0),0);
  const totalCorrect  = Object.values(stats).reduce((a,b)=>a+(b.correct||0),0);
  const totalExams    = Object.values(stats).reduce((a,b)=>a+(b.exams||0),0);
  const allScores     = Object.values(stats).flatMap(b=>b.scores||[]);
  const avgScore      = allScores.length > 0 ? Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length) : null;
  const successRate   = totalAnswered > 0 ? Math.round((totalCorrect/totalAnswered)*100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div>
      <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:700,color:"#0F1923"}}>{greeting} !</h1>
      <p style={{margin:"0 0 24px",color:"#6B7280",fontSize:14}}>Choisissez votre niveau de préparation pour l'examen civique français.</p>

      {/* Global stats */}
      <div style={{display:"flex",gap:12,marginBottom:28,flexWrap:"wrap"}}>
        <StatsCard label="Questions répondues" value={totalAnswered} />
        <StatsCard label="Réponses correctes" value={totalCorrect} />
        <StatsCard label="Taux de réussite" value={`${successRate}%`} />
        <StatsCard label="Examens passés" value={totalExams} />
        <StatsCard label="Score moyen" value={avgScore !== null ? `${avgScore}%` : "—"} />
      </div>

      {/* Continue preparation */}
      <div style={{fontWeight:700,fontSize:15,marginBottom:14,color:"#0F1923"}}>Continuer votre préparation</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:28}}>
        {LEVELS.map(lv => (
          <div key={lv.id} onClick={() => onSelectLevel(lv.id)}
            style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"18px 16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#1A3A5C";e.currentTarget.style.boxShadow="0 2px 12px rgba(37,99,235,.1)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E7EB";e.currentTarget.style.boxShadow="none";}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:8,background:lv.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{lv.icon}</div>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:"#0F1923"}}>{lv.label}</div>
                <div style={{fontSize:11,color:"#9CA3AF"}}>{lv.sub}</div>
              </div>
            </div>
            <span style={{color:"#9CA3AF",fontSize:16}}>›</span>
          </div>
        ))}

      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]         = useState("home");
  const [activeLevel, setActiveLevel] = useState(null); // "CSP" | "CR" | "NAT"
  const [isPremium, setIsPremium]   = useState(() => { try { return localStorage.getItem("prepacivique_premium")==="true"; } catch { return false; } });
  const [trialUsed, setTrialUsed]   = useState(() => { try { const s = localStorage.getItem("prepacivique_trial_v2"); return s ? JSON.parse(s) : {valeurs:0,institutions:0,droits:0,histoire:0,societe:0}; } catch { return {valeurs:0,institutions:0,droits:0,histoire:0,societe:0}; } });
  const [globalStats, setGlobalStats] = useState(() => { try { const s = localStorage.getItem("prepacivique_stats"); return s ? JSON.parse(s) : {}; } catch { return {}; } });
  const [codeInput, setCodeInput]   = useState("");
  const [codeStatus, setCodeStatus] = useState(null);
  const [paywallReason, setPaywallReason] = useState(null);
  const [lang, setLang]             = useState(() => { try { return localStorage.getItem("prepacivique_lang")||"fr"; } catch { return "fr"; } });
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [translations, setTranslations] = useState({});
  const [xlateProgress, setXlateProgress] = useState(0);
  const [xlateError, setXlateError] = useState(null);
  const [speed, setSpeed]           = useState(1);
  const [listenIncludeExpl, setListenIncludeExpl] = useState(true);
  const [listenBilingual, setListenBilingual] = useState(true);
  const [quizQs, setQuizQs]         = useState([]);
  const [qIdx, setQIdx]             = useState(0);
  const [selected, setSelected]     = useState(null);
  const [answered, setAnswered]     = useState(false);
  const [scores, setScores]         = useState({});
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [allWrongAnswers, setAllWrongAnswers] = useState([]);
  const [mockTimeLeft, setMockTimeLeft] = useState(null);
  const [isMockExam, setIsMockExam] = useState(false);
  const [currentQuizTheme, setCurrentQuizTheme] = useState(null);
  const [feedbackMode, setFeedbackMode] = useState("immediate"); // "immediate" | "end"
  const [showFeedbackPicker, setShowFeedbackPicker] = useState(false);
  const [pendingQuizTheme, setPendingQuizTheme] = useState(null);
  const [pendingQuizThemes, setPendingQuizThemes] = useState(null);
  const [quizLimit, setQuizLimit] = useState(null); // null = all
  const [listenQs, setListenQs]     = useState([]);
  const [listenIdx, setListenIdx]   = useState(0);
  const [listenPlaying, setListenPlaying] = useState(false);
  const [listenPhase, setListenPhase] = useState("");
  const [readingChoiceIdx, setReadingChoiceIdx] = useState(null);
  const [isSpeakingQuiz, setIsSpeakingQuiz] = useState(false);
  const [autoReadQuiz, setAutoReadQuiz] = useState(false);
  const [assignedCode, setAssignedCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentRetry, setPaymentRetry] = useState(0);
  const [paymentSessionId] = useState(() => new URLSearchParams(window.location.search).get("session_id"));
  const [returnedFromPayment] = useState(() => new URLSearchParams(window.location.search).get("payment") === "success");
  const codeSubmittingRef = useRef(false);

  const quizSpeakAbortRef = useRef(false);
  const synthRef = useRef(null);
  const translatingRef = useRef(false);
  const listenRef = useRef({playing:false,idx:0,questions:[]});

  useEffect(() => { synthRef.current = window.speechSynthesis; return () => synthRef.current?.cancel(); }, []);
  useEffect(() => { try { localStorage.setItem("prepacivique_premium", isPremium?"true":"false"); } catch {} }, [isPremium]);
  useEffect(() => { try { localStorage.setItem("prepacivique_trial_v2", JSON.stringify(trialUsed)); } catch {} }, [trialUsed]);
  useEffect(() => { try { localStorage.setItem("prepacivique_lang", lang); } catch {} }, [lang]);
  useEffect(() => { try { localStorage.setItem("prepacivique_stats", JSON.stringify(globalStats)); } catch {} }, [globalStats]);

  useEffect(() => {
    if (!returnedFromPayment) return;
    const controller = new AbortController();
    setScreen("payment-success");
    setCodeLoading(true);
    setPaymentError("");
    (async () => {
      try {
        if (!paymentSessionId) {
          setPaymentError("Le lien de retour ne contient pas de référence de paiement. Saisissez le code reçu après votre achat.");
          return;
        }
        for (let attempt = 0; attempt < 15; attempt++) {
          const result = await requestActivation(SUPABASE_URL, SUPABASE_KEY, { action: "lookup", sessionId: paymentSessionId }, {
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
          });
          if (controller.signal.aborted) return;
          if (result.status === "ready" && result.code) {
            setAssignedCode(result.code);
            window.history.replaceState({}, "", window.location.pathname);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (controller.signal.aborted) return;
        }
        setPaymentError("Votre code n’est pas encore disponible. Réessayez dans quelques instants. Si vous avez déjà payé, ne payez pas une seconde fois.");
      } catch {
        if (!controller.signal.aborted) setPaymentError("Impossible de récupérer votre code pour le moment. Réessayez sans effectuer un nouveau paiement.");
      } finally {
        if (!controller.signal.aborted) setCodeLoading(false);
      }
    })();
    return () => controller.abort();
  }, [returnedFromPayment, paymentSessionId, paymentRetry]);

  const handleCodeSubmit = async () => {
    const code = normalizeCode(codeInput);
    if (!code || codeSubmittingRef.current || codeStatus === "ok") return;
    codeSubmittingRef.current = true;
    setCodeInput(code);
    setCodeStatus("checking");
    try {
      const result = await requestActivation(SUPABASE_URL, SUPABASE_KEY, { action: "activate", code });
      if (result.valid === true) {
        setIsPremium(true); setCodeStatus("ok"); setPaywallReason(null);
        setTimeout(() => { setCodeInput(""); setCodeStatus(null); setScreen("home"); }, 1200);
      } else {
        setCodeStatus("invalid");
      }
    } catch {
      setCodeStatus("unavailable");
    } finally {
      codeSubmittingRef.current = false;
    }
  };

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const isRTL = !!currentLang.rtl;
  const getT = useCallback((idx) => (lang==="fr"||!translations[lang]||!isPremium) ? null : translations[lang][idx]||null, [lang,translations,isPremium]);
  const requirePremium = (r) => setPaywallReason(r);
  const checkPremium   = (r) => { if (isPremium) return true; requirePremium(r); return false; };
  const isLoading = isPremium && lang !== "fr" && !translations[lang];
  const loadPct = Math.round((xlateProgress / ALL_QUESTIONS.length) * 100);

  useEffect(() => {
    if (!isPremium || lang === "fr" || translations[lang]) return;
    if (translatingRef.current) return;
    translatingRef.current = true;
    setXlateProgress(0); setXlateError(null);
    (async () => {
      const result = [];
      for (let i = 0; i < ALL_QUESTIONS.length; i += BATCH_SIZE) {
        try {
          const tr = await translateBatch(ALL_QUESTIONS.slice(i, i+BATCH_SIZE), lang);
          result.push(...tr);
          setXlateProgress(result.length);
        } catch (err) {
          setXlateError(err instanceof Error ? err.message : "Erreur de traduction.");
          translatingRef.current = false; return;
        }
      }
      setTranslations(prev => ({...prev, [lang]: result}));
      setXlateProgress(ALL_QUESTIONS.length);
      translatingRef.current = false;
    })();
  }, [lang, isPremium]);

  const stopAll = useCallback(() => {
    synthRef.current?.cancel();
    listenRef.current.playing = false;
    setListenPlaying(false); setListenPhase(""); setReadingChoiceIdx(null);
    setIsSpeakingQuiz(false);
  }, []);

  useEffect(() => {
    if (!isMockExam || mockTimeLeft === null) return;
    const interval = setInterval(() => {
      setMockTimeLeft(t => {
        if (t === null || t <= 1) { clearInterval(interval); setScreen("results"); setIsMockExam(false); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isMockExam]);

  const speakOne = useCallback((text, langCode, onEnd) => {
    if (!synthRef.current) { onEnd?.(); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = LANGUAGES.find(l=>l.code===langCode)?.tts||"fr-FR"; utt.rate = speed;
    utt.onend = onEnd||null; utt.onerror = onEnd||null;
    synthRef.current.speak(utt);
  }, [speed]);

  const runListenFrom = useCallback((idx, questions, bilingual) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const playQ = (i) => {
      if (!listenRef.current.playing || i >= questions.length) { setListenPlaying(false); setListenPhase(""); return; }
      listenRef.current.idx = i; setListenIdx(i);
      const q = questions[i];
      const t = bilingual ? getT(q.origIdx ?? ALL_QUESTIONS.findIndex(x=>x.q===q.q)) : null;
      const segs = [
        { text:`Question ${i+1} sur ${questions.length}.`, lang:"fr", phase:"question" },
        { text:q.q, lang:"fr", phase:"question" },
        ...(t&&lang!=="fr"?[{text:t.q,lang,phase:"question"}]:[]),
        { text:`La bonne réponse est : ${q.c[q.a]}`, lang:"fr", phase:"answer", ci:q.a },
        ...(t&&lang!=="fr"?[{text:t.c[q.a],lang,phase:"answer",ci:q.a}]:[]),
        ...(listenIncludeExpl?[{text:q.e,lang:"fr",phase:"explanation"},...(t&&lang!=="fr"?[{text:t.e,lang,phase:"explanation"}]:[])]:[] ),
      ];
      let si = 0;
      const next = () => {
        if (!listenRef.current.playing) return;
        if (si >= segs.length) { setListenPhase("pause"); setTimeout(() => { if(listenRef.current.playing) playQ(i+1); }, 800); return; }
        const seg = segs[si++]; setListenPhase(seg.phase);
        if (seg.ci !== undefined) setReadingChoiceIdx(seg.ci); else setReadingChoiceIdx(null);
        speakOne(seg.text, seg.lang, next);
      };
      next();
    };
    playQ(idx);
  }, [lang, listenIncludeExpl, getT, speakOne]);

  const startListen = (themeFilter, themes=null) => {
    if (!checkPremium("listen")) return;
    stopAll();
    const pool = (themeFilter
      ? ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i})).filter(q=>q.theme===themeFilter)
      : themes
        ? ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i})).filter(q=>themes.includes(q.theme))
        : ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i}))
    );
    setListenQs(pool); setListenIdx(0);
    listenRef.current = {playing:true,idx:0,questions:pool};
    setListenPlaying(true); setScreen("listen");
    setTimeout(() => runListenFrom(0, pool, listenBilingual), 200);
  };

  const toggleListenPause = () => {
    if (listenPlaying) { synthRef.current?.cancel(); listenRef.current.playing=false; setListenPlaying(false); }
    else { listenRef.current.playing=true; setListenPlaying(true); runListenFrom(listenIdx, listenRef.current.questions, listenBilingual); }
  };

  const skipTo = (i) => {
    synthRef.current?.cancel(); setListenIdx(i); listenRef.current.idx = i;
    if (listenPlaying) setTimeout(() => runListenFrom(i, listenRef.current.questions, listenBilingual), 150);
  };

  // Show feedback mode picker before starting quiz
  const promptQuizStart = (themeId, themes=null) => {
    setPendingQuizTheme(themeId);
    setPendingQuizThemes(themes);
    setQuizLimit(null); // null = all questions, pre-selected
    setShowFeedbackPicker(true);
  };

  const startQuiz = (themeId=null, themes=null, limit=null) => {
    stopAll();
    setShowFeedbackPicker(false);
    let pool = (themeId
      ? ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i})).filter(q=>q.theme===themeId)
      : themes
        ? ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i})).filter(q=>themes.includes(q.theme))
        : ALL_QUESTIONS.map((q,i)=>({...q,origIdx:i}))
    ).slice();
    for (let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    // Shuffle choices within each question
    pool = pool.map(q => {
      const indices = [0,1,2,3];
      for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
      const newC = indices.map(i => q.c[i]);
      const newA = indices.indexOf(q.a);
      return {...q, c: newC, a: newA};
    });
    if (isPremium && limit) { pool = pool.slice(0, limit); }
    if (!isPremium) {
      if (themeId) { pool = pool.slice(0, TRIAL_PER_THEME); }
      else {
        const byTheme = {};
        pool = pool.filter(q => { byTheme[q.theme]=(byTheme[q.theme]||0); if(byTheme[q.theme]<TRIAL_PER_THEME){byTheme[q.theme]++;return true;}return false; });
      }
    }
    setCurrentQuizTheme(themeId);
    setQuizQs(pool); setQIdx(0); setSelected(null); setAnswered(false); setScores({}); setWrongAnswers([]);
    setIsMockExam(false); setMockTimeLeft(null); setAutoReadQuiz(false);
    setScreen("quiz");
  };

  const startMockExam = () => {
    if (!checkPremium("quiz")) return;
    let pool = [...ALL_QUESTIONS].map((q,i)=>({...q,origIdx:i})).sort(()=>Math.random()-.5).slice(0,40);
    pool = pool.map(q => {
      const indices = [0,1,2,3];
      for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[indices[i],indices[j]]=[indices[j],indices[i]];}
      const newC = indices.map(i => q.c[i]);
      const newA = indices.indexOf(q.a);
      return {...q, c: newC, a: newA};
    });
    setQuizQs(pool); setQIdx(0); setSelected(null); setAnswered(false); setScores({}); setWrongAnswers([]);
    setCurrentQuizTheme(null); setIsMockExam(true); setMockTimeLeft(45*60); setScreen("quiz");
  };

  const handleAnswer = (idx) => {
    if (answered) return;
    quizSpeakAbortRef.current = true;
    setSelected(idx); setAnswered(true);
    const correct = idx === quizQs[qIdx].a;
    setScores(p => ({...p,[qIdx]:correct}));
    if (!correct) setWrongAnswers(p => [...p, quizQs[qIdx]]);
    if (!isPremium) { const theme=quizQs[qIdx].theme; setTrialUsed(u=>({...u,[theme]:Math.max(u[theme]||0,qIdx+1)})); }
    // Update global stats
    if (activeLevel) {
      setGlobalStats(prev => {
        const lv = prev[activeLevel] || {answered:0,correct:0,exams:0,scores:[],byTheme:{}};
        const byTheme = {...(lv.byTheme||{})};
        byTheme[quizQs[qIdx].theme] = (byTheme[quizQs[qIdx].theme]||0) + 1;
        return {...prev,[activeLevel]:{...lv,answered:lv.answered+1,correct:lv.correct+(correct?1:0),byTheme}};
      });
    }
    stopAll();
  };

  const nextQ = () => {
    quizSpeakAbortRef.current = true; stopAll();
    if (qIdx+1 >= quizQs.length) {
      setAllWrongAnswers(prev => { const prevQs=prev.map(q=>q.q); return [...prev,...wrongAnswers.filter(q=>!prevQs.includes(q.q))]; });
      // If mock exam, record score
      if (isMockExam && activeLevel) {
        const sc = Math.round((Object.values(scores).filter(Boolean).length / quizQs.length) * 100);
        setGlobalStats(prev => { const lv=prev[activeLevel]||{answered:0,correct:0,exams:0,scores:[],byTheme:{}}; return {...prev,[activeLevel]:{...lv,exams:lv.exams+1,scores:[...(lv.scores||[]),sc]}}; });
      }
      setScreen("results"); return;
    }
    setQIdx(c => c+1); setSelected(null); setAnswered(false);
  };

  const readCurrentQuiz = () => {
    if (isSpeakingQuiz) { quizSpeakAbortRef.current=true; synthRef.current?.cancel(); setIsSpeakingQuiz(false); setReadingChoiceIdx(null); return; }
    quizSpeakAbortRef.current = false; synthRef.current?.cancel();
    const q = quizQs[qIdx];
    const segs = [{text:q.q,lang:"fr"},...q.c.map((ch,i)=>({text:`${String.fromCharCode(65+i)}. ${ch}`,lang:"fr",ci:i}))];
    setIsSpeakingQuiz(true); let si=0;
    const next = () => {
      if (quizSpeakAbortRef.current||si>=segs.length){setReadingChoiceIdx(null);setIsSpeakingQuiz(false);return;}
      const seg=segs[si++]; if(seg.ci!==undefined)setReadingChoiceIdx(seg.ci);else setReadingChoiceIdx(null);
      const utt=new SpeechSynthesisUtterance(seg.text); utt.lang="fr-FR"; utt.rate=speed;
      utt.onend=next; utt.onerror=next; synthRef.current?.speak(utt);
    };
    setTimeout(next, 50);
  };

  const totalScore   = Object.values(scores).filter(Boolean).length;
  const totalAnswered = Object.values(scores).length;
  const passMark     = Math.ceil(quizQs.length * 0.8);
  const passed       = totalScore >= passMark;
  const listenCurQ   = listenQs[listenIdx];
  const phaseLabel   = {question:"🗣️ Question",answer:"✅ Réponse",explanation:"💡 Explication",pause:"⏸ Pause"};

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#F5F6F8",fontFamily:"'DM Sans','Outfit',system-ui,sans-serif",direction:isRTL?"rtl":"ltr"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes wv0{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        @keyframes wv1{0%,100%{transform:scaleY(.8)}50%{transform:scaleY(.3)}}
        @keyframes wv2{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}
        @keyframes wv3{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.4)}}
        @keyframes shimmer{0%,100%{opacity:.4}50%{opacity:.9}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,.3)}70%{box-shadow:0 0 0 10px rgba(37,99,235,0)}}
        .fade{animation:fadeUp .35s ease forwards}
        .choice-btn{transition:all .15s ease;border:1.5px solid #E5E7EB;background:white;width:100%;cursor:pointer;border-radius:8px;font-family:inherit}
        .choice-btn:not(:disabled):hover{border-color:#1A3A5C;background:#F0F4F8}
        .choice-correct{border-color:#2E7D52!important;background:#EDF7F2!important}
        .choice-wrong{border-color:#C0392B!important;background:#FDF0EF!important}
        .shimmer{animation:shimmer 1.2s ease infinite}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:4px}
        .mobile-only{display:none}
        @media(max-width:640px){.sidebar{display:none!important}.mobile-only{display:flex!important}}
        @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
      `}</style>

      {/* Paywall */}
      {paywallReason && <PaywallModal reason={paywallReason} onClose={() => setPaywallReason(null)} codeInput={codeInput} setCodeInput={setCodeInput} codeStatus={codeStatus} handleCodeSubmit={handleCodeSubmit}/>}

      {/* Feedback mode picker modal */}
      {showFeedbackPicker && (() => {
        const totalQs = pendingQuizThemes
          ? ALL_QUESTIONS.filter(q => pendingQuizThemes.includes(q.theme)).length
          : pendingQuizTheme
            ? ALL_QUESTIONS.filter(q => q.theme === pendingQuizTheme).length
            : ALL_QUESTIONS.length;
        const limitOptions = [
          { label:"40 Q", val:40, desc:"Format examen blanc" },
          { label:"100 Q", val:100, desc:"Session rapide" },
          { label:"200 Q", val:200, desc:"Entraînement intensif" },
          { label:`${totalQs} Q`, val:null, desc:"Toutes les questions" },
        ].filter(o => o.val === null || o.val < totalQs);
        return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"white",borderRadius:12,padding:"32px 28px",maxWidth:480,width:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.15)"}}>
            <h2 style={{margin:"0 0 6px",fontSize:17,fontWeight:700,color:"#0F1923"}}>
              {pendingQuizThemes ? "Quiz complet" : THEMES.find(t=>t.id===pendingQuizTheme)?.label||"Quiz"} — {totalQs} questions disponibles
            </h2>
            <p style={{margin:"0 0 20px",color:"#6B7280",fontSize:13}}>Personnalisez votre session d'entraînement</p>

            {/* Question count selector */}
            <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:"#0F1923"}}>Nombre de questions</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
              {limitOptions.map(opt => (
                <button key={opt.label} onClick={() => setQuizLimit(opt.val)}
                  style={{padding:"12px 6px",borderRadius:8,border:`2px solid ${quizLimit===opt.val?"#0F1923":"#E5E7EB"}`,background:quizLimit===opt.val?"#0F1923":"white",color:quizLimit===opt.val?"white":"#374151",cursor:"pointer",textAlign:"center",transition:"all .15s",fontFamily:"inherit"}}>
                  <div style={{fontWeight:700,fontSize:14}}>{opt.label}</div>
                  <div style={{fontSize:10,opacity:.7,marginTop:2}}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Feedback mode */}
            <div style={{fontWeight:600,fontSize:14,marginBottom:10,color:"#0F1923"}}>Mode de feedback</div>
            {[
              {id:"immediate",label:"Immédiat",desc:"Voir la bonne réponse et l'explication après chaque question."},
              {id:"end",label:"À la fin",desc:"Voir toutes les réponses uniquement à la fin du test"},
            ].map(opt => (
              <label key={opt.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderRadius:8,border:`1.5px solid ${feedbackMode===opt.id?"#1A3A5C":"#E5E7EB"}`,background:feedbackMode===opt.id?"#F0F4F8":"white",cursor:"pointer",marginBottom:10}}>
                <input type="radio" checked={feedbackMode===opt.id} onChange={() => setFeedbackMode(opt.id)} style={{marginTop:2,accentColor:"#1A3A5C"}}/>
                <div>
                  <div style={{fontWeight:600,fontSize:13,color:"#0F1923"}}>{opt.label}</div>
                  <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>{opt.desc}</div>
                </div>
              </label>
            ))}
            <div style={{display:"flex",gap:10,marginTop:20}}>
              <button onClick={() => setShowFeedbackPicker(false)} style={{flex:1,padding:"12px",borderRadius:8,border:"1.5px solid #E5E7EB",background:"white",cursor:"pointer",fontWeight:600,fontSize:14,color:"#374151"}}>Annuler</button>
              <button onClick={() => startQuiz(pendingQuizTheme, pendingQuizThemes, quizLimit)} style={{flex:2,padding:"12px",borderRadius:8,border:"none",background:"#0F1923",color:"white",cursor:"pointer",fontWeight:700,fontSize:14}}>
                Commencer {quizLimit ? `(${quizLimit} Q)` : `(${totalQs} Q)`} →
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Sidebar (desktop) */}
      <div className="sidebar">
        <Sidebar activeLevel={activeLevel} setActiveLevel={setActiveLevel} screen={screen} setScreen={setScreen} isPremium={isPremium} stats={globalStats} stopAll={stopAll}/>
      </div>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div onClick={() => setMobileNavOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:300,display:"flex"}}>
          <div onClick={e=>e.stopPropagation()} style={{animation:"slideIn .25s ease",boxShadow:"4px 0 24px rgba(0,0,0,.25)"}}>
            <Sidebar activeLevel={activeLevel} setActiveLevel={setActiveLevel} screen={screen} setScreen={setScreen} isPremium={isPremium} stats={globalStats} stopAll={stopAll} onNavigate={() => setMobileNavOpen(false)}/>
          </div>
          <button onClick={() => setMobileNavOpen(false)} aria-label="Fermer le menu"
            style={{position:"absolute",top:14,right:16,background:"rgba(255,255,255,.15)",border:"none",color:"white",borderRadius:8,width:38,height:38,fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
      )}

      {/* Main content */}
      <div style={{flex:1,overflowY:"auto"}}>
        {/* Top bar */}
        <div style={{background:"white",borderBottom:"1px solid #EAECEF",padding:"0 24px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <button className="mobile-only" onClick={() => setMobileNavOpen(true)} aria-label="Ouvrir le menu"
              style={{alignItems:"center",justifyContent:"center",background:"none",border:"1px solid #E5E7EB",borderRadius:6,padding:"5px 9px",cursor:"pointer",color:"#374151",fontSize:16,lineHeight:1}}>
              ☰
            </button>
            {(screen!=="home"||activeLevel) && (
              <button onClick={() => { stopAll(); if(screen==="quiz"||screen==="results"||screen==="listen"){setScreen(activeLevel?"level":"home");}else{setActiveLevel(null);setScreen("home");} }}
                style={{background:"none",border:"none",cursor:"pointer",color:"#6B7280",fontSize:13,display:"flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:6,fontWeight:500}}>
                ← {activeLevel ? `Retour à ${LEVELS.find(l=>l.id===activeLevel)?.label}` : "Retour"}
              </button>
            )}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isLoading && <div style={{fontSize:11,color:"#6B7280",display:"flex",alignItems:"center",gap:6}}><span className="shimmer" style={{width:8,height:8,borderRadius:"50%",background:"#1A3A5C",display:"inline-block"}}/>Traduction {loadPct}%</div>}
            {/* Settings */}
            <div style={{position:"relative"}}>
              <button onClick={() => {setShowSettings(v=>!v);setShowLangMenu(false);}} style={{background:"none",border:"1px solid #E5E7EB",borderRadius:6,padding:"5px 10px",cursor:"pointer",color:"#374151",fontSize:13}}>⚙️</button>
              {showSettings && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"white",borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,.12)",padding:"16px",minWidth:220,zIndex:120,border:"1px solid #E5E7EB"}}>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:12,color:"#0F1923"}}>Paramètres audio</div>
                  <div style={{fontSize:11,color:"#6B7280",marginBottom:6}}>Vitesse de lecture</div>
                  <div style={{display:"flex",gap:4,marginBottom:12}}>
                    {SPEEDS.map(s=><button key={s.v} onClick={()=>setSpeed(s.v)} style={{flex:1,padding:"5px 0",borderRadius:6,border:speed===s.v?"1.5px solid #1A3A5C":"1.5px solid #E5E7EB",background:speed===s.v?"#F0F4F8":"white",color:speed===s.v?"#1A3A5C":"#374151",fontSize:11,fontWeight:600,cursor:"pointer"}}>{s.label}</button>)}
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:8,fontSize:12,color:"#374151"}}>
                    <input type="checkbox" checked={listenIncludeExpl} onChange={e=>setListenIncludeExpl(e.target.checked)}/>Inclure les explications
                  </label>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:12,color:"#374151"}}>
                    <input type="checkbox" checked={listenBilingual} onChange={e=>setListenBilingual(e.target.checked)}/>Lecture bilingue
                  </label>
                </div>
              )}
            </div>
            {/* Language */}
            <div style={{position:"relative"}}>
              <button onClick={() => { if(!isPremium&&lang==="fr"){requirePremium("lang");return;} setShowLangMenu(v=>!v);setShowSettings(false); }}
                style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"1px solid #E5E7EB",borderRadius:6,padding:"5px 10px",cursor:"pointer",color:"#374151",fontSize:12}}>
                <span>{currentLang.flag}</span><span style={{fontWeight:600}}>{lang==="fr"?"FR":lang.toUpperCase()}</span>
                {!isPremium&&<span style={{fontSize:10}}>🔒</span>}
              </button>
              {showLangMenu && isPremium && (
                <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:"white",borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,.12)",overflow:"hidden",minWidth:180,zIndex:120,maxHeight:320,overflowY:"auto",border:"1px solid #E5E7EB"}}>
                  {LANGUAGES.map(l=>(
                    <button key={l.code} onClick={()=>{setLang(l.code);setShowLangMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",border:"none",borderBottom:"1px solid #F3F4F6",background:lang===l.code?"#F0F4F8":"white",cursor:"pointer",width:"100%",textAlign:"left"}}>
                      <span style={{fontSize:15}}>{l.flag}</span>
                      <span style={{fontSize:12,fontWeight:lang===l.code?700:400,color:"#0F1923"}}>{l.native}</span>
                      {lang===l.code&&<span style={{marginLeft:"auto",color:"#1A3A5C",fontSize:12}}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Premium badge or unlock */}
            {isPremium
              ? <div style={{background:"#FEF9C3",color:"#854D0E",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700}}>⭐ Premium</div>
              : <button onClick={()=>setScreen("pricing")} style={{background:"#0F1923",color:"white",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>🔓 Débloquer</button>
            }
          </div>
        </div>

        {/* Page content */}
        <div style={{padding:"28px 28px",maxWidth:900,margin:"0 auto"}} onClick={() => { showLangMenu&&setShowLangMenu(false); showSettings&&setShowSettings(false); }}>

          {/* HOME */}
          {screen==="home" && !activeLevel && (
            <div className="fade">
              <HomeDashboard stats={globalStats} onSelectLevel={(id) => { setActiveLevel(id); setScreen("level"); }}/>
            </div>
          )}

          {/* LEVEL */}
          {screen==="level" && activeLevel && (
            <div className="fade">
              <LevelDashboard
                level={activeLevel}
                stats={globalStats}
                onStartQuiz={(themeId) => promptQuizStart(themeId)}
                onPromptQuiz={promptQuizStart}
                onStartMockExam={startMockExam}
                onStartListen={startListen}
                isPremium={isPremium}
                checkPremium={checkPremium}
              />
            </div>
          )}

          {/* PAYMENT SUCCESS */}
          {screen==="payment-success" && (
            <div className="fade" style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:56,marginBottom:16}}>{codeLoading?"⏳":assignedCode?"🎉":"🧾"}</div>
              <h2 style={{fontSize:22,fontWeight:700,color:"#0F1923",marginBottom:8}}>{codeLoading?"Récupération de votre code…":assignedCode?"Votre code est prêt !":"Récupération de votre accès"}</h2>
              {codeLoading
                ? <p style={{color:"#6B7280"}}>Veuillez patienter…</p>
                : <>
                    {assignedCode && (
                      <div style={{background:"#F5F6F8",border:"2px solid #1A3A5C",borderRadius:10,padding:"20px",marginBottom:20,display:"inline-block"}}>
                        <div style={{fontSize:11,color:"#6B7280",marginBottom:6}}>Votre code d'activation :</div>
                        <div style={{fontFamily:"monospace",fontSize:20,fontWeight:700,color:"#0F1923",letterSpacing:2,marginBottom:12}}>{assignedCode}</div>
                        <p style={{fontSize:12,color:"#6B7280",maxWidth:320}}>Conservez ce code pour retrouver votre accès sur un autre appareil.</p>
                        <button onClick={() => { navigator.clipboard.writeText(assignedCode); alert("Copié !"); }} style={{background:"white",border:"1px solid #1A3A5C",borderRadius:6,padding:"6px 16px",cursor:"pointer",fontSize:12,color:"#1A3A5C",fontWeight:600}}>📋 Copier</button>
                      </div>
                    )}
                    {paymentError && <p role="status" style={{color:"#9A3412",maxWidth:480,margin:"0 auto 16px",lineHeight:1.6}}>{paymentError}</p>}
                    {!assignedCode && paymentSessionId && <button onClick={() => setPaymentRetry(n => n + 1)} style={{padding:"10px 18px",marginBottom:16,cursor:"pointer"}}>Réessayer</button>}
                    <div style={{marginTop:12}}>
                      <button onClick={() => { setCodeInput(assignedCode); setScreen("pricing"); }} style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"12px 28px",cursor:"pointer",fontSize:14,fontWeight:700}}>
                        {assignedCode ? "Activer mon accès →" : "Saisir mon code →"}
                      </button>
                    </div>
                  </>
              }
            </div>
          )}

          {/* PRICING */}
          {screen==="pricing" && (
            <div className="fade">
              <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:700,color:"#0F1923"}}>Accès complet</h2>
              <p style={{margin:"0 0 24px",color:"#6B7280"}}>{ALL_QUESTIONS.length} questions d'entraînement · Mode écoute · 11 langues</p>
              <div style={{background:"white",borderRadius:12,border:"2px solid #1A3A5C",padding:"28px",maxWidth:420,marginBottom:20}}>
                <div style={{fontWeight:800,fontSize:28,color:"#0F1923",marginBottom:4}}>5,00 €</div>
                <div style={{color:"#6B7280",fontSize:13,marginBottom:20}}>Paiement unique · Accès à vie</div>
                {["✓ "+ALL_QUESTIONS.length+" questions d'entraînement","✓ Mode écoute Play All","✓ 11 langues + traduction IA","✓ Résultats et analyses détaillés","✓ Vitesse audio réglable","✓ Accès à vie"].map(f=>(
                  <div key={f} style={{fontSize:13,color:"#374151",marginBottom:8,fontWeight:500}}>{f}</div>
                ))}
                <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:20,background:"#0F1923",color:"white",borderRadius:8,padding:"13px",fontWeight:700,fontSize:14,textDecoration:"none",textAlign:"center"}}>
                  💳 Acheter maintenant
                </a>
              </div>
              {!isPremium && (
                <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",maxWidth:420}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"#0F1923"}}>🔑 Vous avez déjà un code ?</div>
                  <div style={{display:"flex",gap:8}}>
                    <input value={codeInput} onChange={e=>{setCodeInput(e.target.value);if(codeStatus!=="checking")setCodeStatus(null);}} disabled={codeStatus==="checking"} aria-label="Code d’activation" autoComplete="off" spellCheck={false} onKeyDown={e=>e.key==="Enter"&&handleCodeSubmit()} placeholder="CIVIC-XXXX-XXXX-XXXX"
                      style={{flex:1,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${(codeStatus==="invalid"||codeStatus==="unavailable")?"#C0392B":codeStatus==="ok"?"#2E7D52":"#D1D5DB"}`,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
                    <button onClick={handleCodeSubmit} disabled={codeStatus==="checking"||codeStatus==="ok"}
                      style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>
                      {codeStatus==="checking"?"…":"Activer"}
                    </button>
                  </div>
                  {codeStatus&&<div role="status" style={{marginTop:8,fontSize:12,color:codeStatus==="ok"?"#2E7D52":"#C0392B",fontWeight:600}}>
                    {CODE_MESSAGES[codeStatus]}
                  </div>}
                </div>
              )}
            </div>
          )}

          {/* LISTEN MODE */}
          {screen==="listen" && listenCurQ && (
            <div className="fade">
              <div style={{background:"linear-gradient(160deg,#1C1917,#2D1832,#6B21A8)",color:"white",borderRadius:12,padding:"24px",marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <div style={{padding:"4px 12px",borderRadius:6,background:"rgba(255,255,255,.15)",fontSize:12,fontWeight:600}}>
                    {listenPlaying?(phaseLabel[listenPhase]||"⏳"):"⏸ En pause"}
                  </div>
                  {listenPlaying && <Waveform active={true} color="rgba(255,255,255,.9)" size={16}/>}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,opacity:.8,marginBottom:6}}>
                  <span>Question {listenIdx+1} / {listenQs.length}</span>
                  <span>{Math.round(((listenIdx+1)/listenQs.length)*100)}%</span>
                </div>
                <div style={{background:"rgba(255,255,255,.2)",borderRadius:4,height:5,marginBottom:18}}>
                  <div style={{width:`${((listenIdx+1)/listenQs.length)*100}%`,height:"100%",background:"white",borderRadius:4,transition:"width .5s"}}/>
                </div>
                <div style={{fontSize:15,fontWeight:600,lineHeight:1.65,marginBottom:8}}>{listenCurQ.q}</div>
                {(listenPhase==="answer"||listenPhase==="explanation"||listenPhase==="pause") && (
                  <div style={{background:"rgba(255,255,255,.15)",borderRadius:8,padding:"10px 14px",marginBottom:10}}>
                    <div style={{fontSize:11,opacity:.7,marginBottom:3}}>✅ Bonne réponse</div>
                    <div style={{fontWeight:700,fontSize:14}}>{listenCurQ.c[listenCurQ.a]}</div>
                  </div>
                )}
                {(listenPhase==="explanation"||listenPhase==="pause") && (
                  <div style={{background:"rgba(255,255,255,.1)",borderRadius:8,padding:"10px 14px",fontSize:12,lineHeight:1.75}}>💡 {listenCurQ.e}</div>
                )}
                <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:14,marginTop:20}}>
                  <button onClick={()=>skipTo(Math.max(0,listenIdx-1))} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",borderRadius:8,width:40,height:40,cursor:"pointer",fontSize:16}}>⏮</button>
                  <button onClick={toggleListenPause} style={{background:"white",border:"none",color:"#6B21A8",borderRadius:8,width:56,height:56,cursor:"pointer",fontSize:22,fontWeight:700,boxShadow:"0 4px 16px rgba(0,0,0,.2)"}}>
                    {listenPlaying?"⏸":"▶"}
                  </button>
                  <button onClick={()=>skipTo(Math.min(listenQs.length-1,listenIdx+1))} style={{background:"rgba(255,255,255,.15)",border:"none",color:"white",borderRadius:8,width:40,height:40,cursor:"pointer",fontSize:16}}>⏭</button>
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:12}}>
                  {SPEEDS.map(s=><button key={s.v} onClick={()=>setSpeed(s.v)} style={{padding:"4px 10px",borderRadius:4,border:"none",background:speed===s.v?"white":"rgba(255,255,255,.15)",color:speed===s.v?"#6B21A8":"white",fontSize:11,fontWeight:600,cursor:"pointer"}}>{s.label}</button>)}
                </div>
              </div>
              {/* Playlist */}
              <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"16px"}}>
                <div style={{fontWeight:600,fontSize:13,marginBottom:10,color:"#0F1923"}}>Playlist — {listenQs.length} questions</div>
                <div style={{maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
                  {listenQs.map((q,i)=>{
                    const th=THEMES.find(t=>t.id===q.theme);
                    const isCur=i===listenIdx,isPast=i<listenIdx;
                    return (
                      <div key={i} onClick={()=>skipTo(i)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:6,background:isCur?"#F0F4F8":isPast?"#F9FAFB":"white",border:`1px solid ${isCur?"#1A3A5C":"#F3F4F6"}`,cursor:"pointer"}}>
                        <div style={{width:22,height:22,borderRadius:4,background:isCur?"#1A3A5C":isPast?"#D1D5DB":"#F3F4F6",color:isCur||isPast?"white":"#9CA3AF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0}}>
                          {isCur&&listenPlaying?<Waveform active={true} color="white" size={9}/>:i+1}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:isCur?600:400,color:isCur?"#1A3A5C":isPast?"#9CA3AF":"#374151",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{q.q}</div>
                          <div style={{fontSize:10,color:th?.color,marginTop:1}}>{th?.icon} {th?.label}</div>
                        </div>
                        {isPast&&<span style={{color:"#2E7D52",fontSize:12}}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* QUIZ */}
          {screen==="quiz" && quizQs.length>0 && (()=>{
            const q=quizQs[qIdx];
            const t=getT(q.origIdx??ALL_QUESTIONS.findIndex(x=>x.q===q.q));
            const th=THEMES.find(x=>x.id===q.theme);
            return (
              <div className="fade">
                {/* Quiz header */}
                <div style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"14px 18px",marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{fontSize:12,color:th?.color,fontWeight:600}}>{th?.icon} {th?.label}</div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <button onClick={() => { const n=!autoReadQuiz; setAutoReadQuiz(n); if(!n){quizSpeakAbortRef.current=true;synthRef.current?.cancel();setIsSpeakingQuiz(false);setReadingChoiceIdx(null);} }}
                        style={{display:"flex",alignItems:"center",gap:5,background:autoReadQuiz?"#1A3A5C":"#F3F4F6",border:"none",color:autoReadQuiz?"white":"#6B7280",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>
                        🎙 {autoReadQuiz?"Voix ON":"Voix OFF"}
                      </button>
                      <span style={{fontSize:13,fontWeight:600,color:"#374151"}}>{qIdx+1}/{quizQs.length}</span>
                      <span style={{fontSize:13,color:"#2E7D52",fontWeight:600}}>✓{totalScore}</span>
                      <span style={{fontSize:13,color:"#C0392B",fontWeight:600}}>✗{totalAnswered-totalScore}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{background:"#F3F4F6",borderRadius:4,height:5}}>
                    <div style={{width:`${(qIdx/quizQs.length)*100}%`,height:"100%",background:th?.color||"#1A3A5C",borderRadius:4,transition:"width .5s ease"}}/>
                  </div>
                  {/* Timer */}
                  {isMockExam && mockTimeLeft!==null && (()=>{
                    const m=Math.floor(mockTimeLeft/60), s=mockTimeLeft%60, urgent=mockTimeLeft<300;
                    return (
                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:10,padding:"8px 14px",borderRadius:8,background:urgent?"#FDF0EF":"#F9FAFB",border:`1px solid ${urgent?"#FCA5A5":"#E5E7EB"}`}}>
                        <span style={{fontSize:14}}>{urgent?"⚠️":"⏱️"}</span>
                        <span style={{fontWeight:700,fontSize:15,color:urgent?"#C0392B":"#374151",fontFamily:"monospace",letterSpacing:2}}>{String(m).padStart(2,"0")}:{String(s).padStart(2,"0")}</span>
                        <span style={{fontSize:11,color:urgent?"#C0392B":"#6B7280"}}>{urgent?"Dépêchez-vous !":"restant"}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Question card */}
                <div key={qIdx} className="fade" style={{background:"white",borderRadius:10,border:"1px solid #E5E7EB",padding:"24px",marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:t?6:20}}>
                    <div style={{fontSize:17,fontWeight:600,lineHeight:1.6,flex:1,color:"#0F1923"}}>{q.q}</div>
                    <button onClick={readCurrentQuiz} style={{background:isSpeakingQuiz?"#1A3A5C":"#F3F4F6",border:"none",color:isSpeakingQuiz?"white":"#6B7280",borderRadius:8,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
                      {isSpeakingQuiz
                        ? <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="4" height="10" rx="1"/><rect x="8" y="2" width="4" height="10" rx="1"/></svg>
                        : <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-6 9a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H4zm6 7v-2h-1v2H7v1h6v-1h-2z"/></svg>
                      }
                    </button>
                  </div>
                  {t && <div style={{fontSize:13,color:"#6B7280",fontStyle:"italic",marginBottom:18,lineHeight:1.6,borderLeft:"3px solid #D1D5DB",paddingLeft:10,direction:isRTL?"rtl":"ltr"}}>{t.q}</div>}

                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {q.c.map((ch,idx)=>{
                      let extraCls = "choice-btn";
                      const showResult = feedbackMode==="immediate" ? answered : false;
                      if(showResult){if(idx===q.a)extraCls+=" choice-correct";else if(idx===selected)extraCls+=" choice-wrong";}
                      const letterBg = showResult&&idx===q.a?"#2E7D52":showResult&&idx===selected&&idx!==q.a?"#C0392B":readingChoiceIdx===idx?"#1A3A5C":"#F3F4F6";
                      const letterTx = (showResult&&(idx===q.a||(idx===selected&&idx!==q.a)))||readingChoiceIdx===idx?"white":"#6B7280";
                      const letter = showResult&&idx===q.a?"✓":showResult&&idx===selected&&idx!==q.a?"✗":readingChoiceIdx===idx?<Waveform active={true} color="white" size={10}/>:String.fromCharCode(65+idx);
                      return (
                        <button key={idx} className={extraCls} onClick={()=>handleAnswer(idx)} disabled={answered}
                          style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",textAlign:"left",fontSize:14,lineHeight:1.5,fontFamily:"inherit"}}>
                          <span style={{width:26,height:26,borderRadius:6,background:letterBg,color:letterTx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0,marginTop:1,transition:"all .15s"}}>{letter}</span>
                          <div>
                            <div style={{color:showResult&&idx===q.a?"#2E7D52":"#0F1923",fontWeight:showResult&&idx===q.a?600:400}}>{ch}</div>
                            {t?.c?.[idx]&&lang!=="fr"&&<div style={{fontSize:11.5,color:"#9CA3AF",fontStyle:"italic",marginTop:2,direction:isRTL?"rtl":"ltr"}}>{t.c[idx]}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation (immediate mode only) */}
                  {answered && feedbackMode==="immediate" && (
                    <div className="fade" style={{marginTop:16,padding:"14px 16px",background:selected===q.a?"#EDF7F2":"#FEF9C3",borderRadius:8,borderLeft:`3px solid ${selected===q.a?"#2E7D52":"#D97706"}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{fontWeight:600,color:selected===q.a?"#2E7D52":"#D97706",fontSize:13}}>
                          {selected===q.a?"✓ Bonne réponse !":"✗ Réponse incorrecte"}
                        </div>
                        <button onClick={()=>{
                          if(isSpeakingQuiz){quizSpeakAbortRef.current=true;synthRef.current?.cancel();setIsSpeakingQuiz(false);return;}
                          quizSpeakAbortRef.current=false;synthRef.current?.cancel();setIsSpeakingQuiz(true);
                          const txt=`La bonne réponse est : ${q.c[q.a]}. ${q.e}`;
                          const utt=new SpeechSynthesisUtterance(txt); utt.lang="fr-FR"; utt.rate=speed;
                          utt.onend=()=>setIsSpeakingQuiz(false); utt.onerror=()=>setIsSpeakingQuiz(false);
                          setTimeout(()=>synthRef.current?.speak(utt),50);
                        }} style={{background:"none",border:"none",cursor:"pointer",color:"#6B7280",padding:4,display:"flex",alignItems:"center",gap:4,fontSize:11,fontWeight:500}}>
                          {isSpeakingQuiz?"⏹ Stop":"🔊 Écouter"}
                        </button>
                      </div>
                      <div style={{fontSize:13,color:"#374151",lineHeight:1.7}}>{q.e}</div>
                      {t?.e&&lang!=="fr"&&<div style={{marginTop:8,fontSize:12.5,color:"#6B7280",fontStyle:"italic",lineHeight:1.7,direction:isRTL?"rtl":"ltr",borderTop:"1px solid rgba(0,0,0,.06)",paddingTop:8}}>{t.e}</div>}
                    </div>
                  )}
                </div>

                {answered && (
                  <div style={{display:"flex",justifyContent:"flex-end"}}>
                    <button onClick={nextQ} style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"12px 28px",cursor:"pointer",fontSize:14,fontWeight:700}}>
                      {qIdx+1>=quizQs.length?"Voir les résultats →":"Suivant →"}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* RESULTS */}
          {screen==="results" && (
            <div className="fade">
              {/* Score banner */}
              <div style={{background:passed?"linear-gradient(145deg,#1B4332,#2D6A4F)":"linear-gradient(145deg,#7F1D1D,#C0392B)",color:"white",textAlign:"center",padding:"40px 24px",borderRadius:12,marginBottom:20}}>
                <div style={{fontSize:48,marginBottom:8}}>{passed?"🎉":"📚"}</div>
                <div style={{fontSize:60,fontWeight:700,lineHeight:1,letterSpacing:-2}}>{totalScore}<span style={{fontSize:24,opacity:.6}}> / {quizQs.length}</span></div>
                <div style={{fontSize:28,fontWeight:700,marginTop:8}}>{Math.round((totalScore/quizQs.length)*100)}%</div>
                <div style={{marginTop:14,fontSize:13,fontWeight:600,background:"rgba(255,255,255,.15)",display:"inline-flex",padding:"7px 18px",borderRadius:6}}>
                  {passed?`✓ Score minimum atteint (${passMark}/${quizQs.length})`:`Il manque ${passMark-totalScore} point(s) pour 80 %`}
                </div>
              </div>

              {/* Detailed review (end mode or wrong answers) */}
              {(feedbackMode==="end" || wrongAnswers.length>0) && (
                <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:15,color:"#0F1923",marginBottom:16}}>Révision complète des réponses</div>
                  {(feedbackMode==="end" ? quizQs.map((_,i)=>({q:quizQs[i],correct:scores[i]})) : wrongAnswers.map(q=>({q,correct:false}))).map((item,i)=>{
                    const wq = feedbackMode==="end" ? item.q : item.q;
                    const correct = feedbackMode==="end" ? item.correct : false;
                    return (
                      <div key={i} style={{marginBottom:16,paddingBottom:16,borderBottom:"1px solid #F3F4F6"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div style={{fontSize:12,color:"#6B7280"}}>Question {i+1}</div>
                          <span style={{background:correct?"#DCFCE7":"#FEE2E2",color:correct?"#166534":"#991B1B",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:600}}>
                            {correct?"✓ Correcte":"✗ Incorrecte"}
                          </span>
                        </div>
                        <div style={{fontWeight:600,fontSize:13,color:"#0F1923",marginBottom:8}}>{wq.q}</div>
                        {!correct && feedbackMode==="end" && (
                          <div style={{fontSize:12,color:"#C0392B",marginBottom:4}}>Votre réponse : {wq.c?.[selected]||"—"}</div>
                        )}
                        <div style={{fontSize:12,color:"#2E7D52",fontWeight:600,marginBottom:8}}>Bonne réponse : {wq.c?.[wq.a]}</div>
                        <div style={{fontSize:12,color:"#6B7280",lineHeight:1.7,background:"#F5F6F8",borderRadius:6,padding:"10px 12px"}}>
                          <strong>Explication : </strong>{wq.e}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Premium upsell */}
              {!isPremium && (
                <div style={{background:"#0F1923",color:"white",borderRadius:12,padding:"24px",textAlign:"center",marginBottom:16}}>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>🚀 Débloquez les {ALL_QUESTIONS.length} questions</div>
                  <div style={{fontSize:13,opacity:.8,marginBottom:16}}>Mode écoute, 11 langues, analyses détaillées — 5,00 € une seule fois.</div>
                  <a href={STRIPE_LINK} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:"#1A3A5C",color:"white",borderRadius:8,padding:"11px 24px",fontWeight:700,fontSize:14,textDecoration:"none"}}>
                    Accès complet →
                  </a>
                </div>
              )}

              <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                <button onClick={() => startQuiz(currentQuizTheme)} style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700}}>🔄 Recommencer</button>
                {isPremium&&<button onClick={()=>startListen("all")} style={{background:"white",color:"#0F1923",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:600}}>🎧 Mode écoute</button>}
                <button onClick={()=>{stopAll();setScreen(activeLevel?"level":"home");}} style={{background:"white",color:"#0F1923",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:600}}>🏠 Accueil</button>
              </div>
            </div>
          )}

          {/* PROFILE */}
          {screen==="profile" && (
            <div className="fade">
              <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:700,color:"#0F1923"}}>Profil</h2>
              <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",marginBottom:16}}>
                <div style={{fontWeight:600,fontSize:14,marginBottom:16,color:"#0F1923"}}>Statut</div>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>👤</div>
                  <div>
                    <div style={{fontWeight:600,fontSize:14,color:"#0F1923"}}>{isPremium?"Compte Premium":"Compte Gratuit"}</div>
                    <div style={{fontSize:12,color:"#6B7280"}}>{isPremium?"Accès complet à toutes les questions":"10 questions par thème"}</div>
                  </div>
                  {isPremium && <div style={{marginLeft:"auto",background:"#FEF9C3",color:"#854D0E",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:700}}>⭐ Premium</div>}
                </div>
              </div>
              {!isPremium && (
                <div style={{background:"white",borderRadius:12,border:"1px solid #E5E7EB",padding:"24px",marginBottom:16}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:12,color:"#0F1923"}}>🔑 Code d'activation</div>
                  <div style={{display:"flex",gap:8}}>
                    <input value={codeInput} onChange={e=>{setCodeInput(e.target.value);if(codeStatus!=="checking")setCodeStatus(null);}} disabled={codeStatus==="checking"} aria-label="Code d’activation" autoComplete="off" spellCheck={false} onKeyDown={e=>e.key==="Enter"&&handleCodeSubmit()} placeholder="CIVIC-XXXX-XXXX-XXXX"
                      style={{flex:1,padding:"10px 12px",borderRadius:8,border:`1.5px solid ${(codeStatus==="invalid"||codeStatus==="unavailable")?"#C0392B":codeStatus==="ok"?"#2E7D52":"#D1D5DB"}`,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
                    <button onClick={handleCodeSubmit} disabled={codeStatus==="checking"||codeStatus==="ok"}
                      style={{background:"#0F1923",color:"white",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontWeight:700,fontSize:13}}>
                      {codeStatus==="checking"?"…":"Activer"}
                    </button>
                  </div>
                  {codeStatus&&<div role="status" style={{marginTop:8,fontSize:12,color:codeStatus==="ok"?"#2E7D52":"#C0392B",fontWeight:600}}>
                    {CODE_MESSAGES[codeStatus]}
                  </div>}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
