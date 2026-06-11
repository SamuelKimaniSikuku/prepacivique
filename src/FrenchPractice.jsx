import { useState, useRef, useCallback, useEffect } from "react";
import { FRENCH_LEVELS, FRENCH_CATEGORIES, FRENCH_QUESTIONS } from "./data/french_questions";

const EXAM_INFO = {
  DILF: { full:"Diplôme Initial de Langue Française", org:"Ministère de l'Éducation nationale", validity:"Illimitée", levels:"A1.1", desc:"Certification élémentaire, uniquement disponible en France.", url:"https://www.ciep.fr/dilf" },
  DELF: { full:"Diplôme d'Études en Langue Française", org:"Ministère de l'Éducation nationale", validity:"Illimitée", levels:"A1 → B2", desc:"Certification officielle reconnue dans 170 pays.", url:"https://www.ciep.fr/delf-dalf" },
  DALF: { full:"Diplôme Approfondi de Langue Française", org:"Ministère de l'Éducation nationale", validity:"Illimitée", levels:"C1 → C2", desc:"Le plus haut niveau de certification en français langue étrangère.", url:"https://www.ciep.fr/delf-dalf" },
  TCF:  { full:"Test de Connaissance du Français", org:"France Éducation International", validity:"2 ans", levels:"A1.1 → C2", desc:"Test standardisé (pas de mention échec). Il existe une version TCF IRN pour la nationalité.", url:"https://www.france-education-international.fr/tcf" },
  TEF:  { full:"Test d'Évaluation de Français", org:"CCI Paris Île-de-France", validity:"2 ans", levels:"A1 → C2", desc:"Créé en 1998. Reconnu pour les permis de travail au Canada et en France.", url:"https://www.lefrancaisdesaffaires.fr/tef" },
};

const CEFR_COLORS = {
  "A1.1":"#2D6A4F","A1":"#2D6A4F","A2":"#B8720A","B1":"#C41E3A","B2":"#6B21A8","C1":"#1C1917","C2":"#1C1917"
};

function ProgressBar({ value, max, color }) {
  return (
    <div style={{background:"#eee",borderRadius:6,height:6,overflow:"hidden"}}>
      <div style={{width:`${Math.min(100,(value/max)*100)}%`,height:"100%",background:color,borderRadius:6,transition:"width .4s ease"}}/>
    </div>
  );
}

export default function FrenchPractice({ isPremium, onBack }) {
  const [view, setView]             = useState("home"); // home | quiz | results | info
  const [selectedLevel, setLevel]   = useState(null);
  const [selectedCat, setCat]       = useState("all");
  const [quizQs, setQuizQs]         = useState([]);
  const [qIdx, setQIdx]             = useState(0);
  const [selected, setSelected]     = useState(null);
  const [answered, setAnswered]     = useState(false);
  const [scores, setScores]         = useState({});
  const [wrong, setWrong]           = useState([]);
  const [infoExam, setInfoExam]     = useState(null);
  const [speaking, setSpeaking]     = useState(false);
  // ── Listen mode (mode écoute) ──
  const [listenQs, setListenQs]     = useState([]);
  const [listenIdx, setListenIdx]   = useState(0);
  const [listenPlaying, setPlaying] = useState(false);
  const [listenPhase, setPhase]     = useState("question"); // question | answer | explanation | pause
  const [speed, setSpeed]           = useState(1);
  const synthRef = useRef(window.speechSynthesis);
  const listenRef = useRef({ active:false, idx:0, qs:[], speed:1, paused:false });

  useEffect(() => () => synthRef.current?.cancel(), []);

  const SPEEDS = [0.75, 1, 1.25, 1.5];

  const speak = useCallback((text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    if (speaking) { setSpeaking(false); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "fr-FR"; utt.rate = 0.9;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synthRef.current.speak(utt);
  }, [speaking]);

  // ── Listen mode engine ──────────────────────────────────────────────────────
  const speakOne = useCallback((text, onEnd) => {
    if (!synthRef.current) { onEnd?.(); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "fr-FR";
    utt.rate = 0.95 * (listenRef.current.speed || 1);
    utt.onend = () => onEnd?.();
    utt.onerror = () => onEnd?.();
    synthRef.current.speak(utt);
  }, []);

  const runListenFrom = useCallback((idx) => {
    const st = listenRef.current;
    if (!st.active || st.paused) return;
    const qs = st.qs;
    if (idx >= qs.length) { st.active = false; setPlaying(false); setPhase("question"); return; }
    st.idx = idx;
    setListenIdx(idx);
    const q = qs[idx];
    setPhase("question");
    speakOne(`Question ${idx + 1} sur ${qs.length}. ${q.q}`, () => {
      if (!st.active || st.paused) return;
      setPhase("answer");
      speakOne(`La bonne réponse est : ${q.c[q.a]}.`, () => {
        if (!st.active || st.paused) return;
        setPhase("explanation");
        speakOne(q.e, () => {
          if (!st.active || st.paused) return;
          setPhase("pause");
          runListenFrom(idx + 1);
        });
      });
    });
  }, [speakOne]);

  const startListen = (levelId, catId = "all") => {
    synthRef.current?.cancel(); setSpeaking(false);
    let pool = FRENCH_QUESTIONS.filter(q => q.level === levelId);
    if (catId !== "all") pool = pool.filter(q => q.cat === catId);
    pool = [...pool].sort(() => Math.random() - 0.5);
    if (!pool.length) return;
    setListenQs(pool);
    setListenIdx(0); setPhase("question"); setPlaying(true);
    listenRef.current = { active:true, idx:0, qs:pool, speed, paused:false };
    setView("listen");
    runListenFrom(0);
  };

  const toggleListenPause = () => {
    const st = listenRef.current;
    if (st.paused) {
      st.paused = false; setPlaying(true);
      runListenFrom(st.idx);
    } else {
      st.paused = true; setPlaying(false);
      synthRef.current?.cancel();
    }
  };

  const skipTo = (i) => {
    const st = listenRef.current;
    if (i < 0 || i >= st.qs.length) return;
    synthRef.current?.cancel();
    st.idx = i; st.paused = false; st.active = true;
    setListenIdx(i); setPlaying(true);
    runListenFrom(i);
  };

  const changeSpeed = (s) => {
    setSpeed(s);
    listenRef.current.speed = s;
    if (listenRef.current.active && !listenRef.current.paused) {
      synthRef.current?.cancel();
      runListenFrom(listenRef.current.idx);
    }
  };

  const stopListen = () => {
    listenRef.current.active = false; listenRef.current.paused = false;
    synthRef.current?.cancel();
    setPlaying(false); setPhase("question");
    setView("home");
  };

  const startQuiz = (levelId, catId = "all") => {
    synthRef.current?.cancel();
    let pool = FRENCH_QUESTIONS.filter(q => q.level === levelId);
    if (catId !== "all") pool = pool.filter(q => q.cat === catId);
    pool = [...pool].sort(() => Math.random() - 0.5);
    setQuizQs(pool); setQIdx(0); setSelected(null); setAnswered(false);
    setScores({}); setWrong([]);
    setView("quiz");
  };

  const handleAnswer = (idx) => {
    if (answered) return;
    synthRef.current?.cancel(); setSpeaking(false);
    setSelected(idx); setAnswered(true);
    const correct = idx === quizQs[qIdx].a;
    setScores(p => ({ ...p, [qIdx]: correct }));
    if (!correct) setWrong(p => [...p, quizQs[qIdx]]);
  };

  const nextQ = () => {
    synthRef.current?.cancel(); setSpeaking(false);
    if (qIdx + 1 >= quizQs.length) { setView("results"); return; }
    setQIdx(c => c + 1); setSelected(null); setAnswered(false);
  };

  const totalScore = Object.values(scores).filter(Boolean).length;
  const totalAnswered = Object.values(scores).length;
  const pct = quizQs.length ? Math.round((totalScore / quizQs.length) * 100) : 0;
  const lv = FRENCH_LEVELS.find(l => l.id === selectedLevel);

  const card = { background:"white", borderRadius:6, border:"1px solid #eef0f8", padding:"20px", marginBottom:14, boxShadow:"0 2px 12px rgba(0,0,0,.04)" };

  // ── HOME ────────────────────────────────────────────────────────────────────
  if (view === "home") return (
    <div className="fade">
      {/* Hero */}
      <div style={{background:"linear-gradient(160deg,#1C1917,#2D1832,#6B21A8)",color:"white",borderRadius:8,padding:"30px 26px",marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"6px",background:"rgba(255,255,255,.04)"}}/>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.2)",borderRadius:6,padding:"4px 12px",fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>🇫🇷 Pratique du Français</div>
        <h2 style={{margin:"0 0 8px",fontSize:22,fontWeight:800,lineHeight:1.25,fontFamily:"'Playfair Display',serif"}}>Préparez votre certification<br/>de langue française</h2>
        <p style={{margin:"0 0 20px",opacity:.75,fontSize:13,lineHeight:1.65}}>DILF · DELF · DALF · TCF · TEF — du niveau A1.1 au C2</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
          {[["429+","Questions"],["7","Niveaux"],["CEFR","Certifié"],["🆓","Gratuit"]].map(([v,l])=>(
            <div key={l} style={{background:"rgba(255,255,255,.12)",borderRadius:4,padding:"11px 6px",textAlign:"center",border:"1px solid rgba(255,255,255,.15)"}}>
              <div style={{fontSize:16,fontWeight:800}}>{v}</div>
              <div style={{fontSize:9,opacity:.75,marginTop:2,textTransform:"uppercase",letterSpacing:.7,fontWeight:600}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exam info cards */}
      <div style={{fontWeight:700,fontSize:13,color:"#4A4540",marginBottom:10}}>📋 Les certifications officielles</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:20}}>
        {Object.entries(EXAM_INFO).map(([key, info]) => (
          <div key={key} onClick={() => { setInfoExam(key); setView("info"); }}
            className="lift"
            style={{background:"white",borderRadius:6,border:"1px solid #eef0f8",padding:"16px 14px",cursor:"pointer",boxShadow:"none"}}>
            <div style={{fontWeight:800,fontSize:16,color:"#C41E3A",marginBottom:4}}>{key}</div>
            <div style={{fontSize:11,fontWeight:600,color:"#4A4540",marginBottom:6}}>{info.levels}</div>
            <div style={{fontSize:11,color:"#8A8480",lineHeight:1.5,marginBottom:8}}>{info.desc.slice(0,60)}…</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#B0A898"}}>
              <span>⏱ Validité : {info.validity}</span>
              <span style={{color:"#C41E3A",fontWeight:700}}>En savoir + →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Level selector */}
      <div style={{fontWeight:700,fontSize:13,color:"#4A4540",marginBottom:10}}>🎯 Choisissez votre niveau pour pratiquer</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,marginBottom:16}}>
        {FRENCH_LEVELS.map(lv => {
          const count = FRENCH_QUESTIONS.filter(q => q.level === lv.id).length;
          return (
            <div key={lv.id} className="lift"
              style={{background:lv.bg,borderRadius:6,border:`2px solid ${lv.border}`,padding:"20px 18px",cursor:"pointer"}}
              onClick={() => { setLevel(lv.id); setCat("all"); }}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                <span style={{background:lv.dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.07)",color:lv.dark?"white":lv.color,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>{lv.badge}</span>
                <span style={{background:lv.dark?"rgba(255,255,255,.1)":"rgba(0,0,0,.05)",color:lv.dark?"rgba(255,255,255,.8)":lv.color,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>{lv.cefr}</span>
              </div>
              <div style={{fontWeight:800,fontSize:14,color:lv.dark?"white":"#1C1917",marginBottom:5}}>{lv.label}</div>
              <div style={{fontSize:12,color:lv.dark?"rgba(255,255,255,.7)":"#4A4540",lineHeight:1.6,marginBottom:12}}>{lv.desc}</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:lv.dark?"rgba(255,255,255,.6)":"#8A8480"}}>{count} questions</span>
                <div style={{display:"flex",gap:6}}>
                  <button
                    onClick={e => { e.stopPropagation(); startListen(lv.id); }}
                    title="Mode écoute"
                    style={{background:lv.dark?"rgba(255,255,255,.15)":"rgba(0,0,0,.06)",color:lv.dark?"white":lv.color,border:"none",borderRadius:4,padding:"6px 10px",cursor:"pointer",fontWeight:700,fontSize:12}}>
                    🎧
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); startQuiz(lv.id); }}
                    style={{background:lv.color,color:"white",border:"none",borderRadius:4,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>
                    Commencer →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category filter when level is selected */}
      {selectedLevel && (
        <div style={{...card}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>
            🗂 Catégories pour {FRENCH_LEVELS.find(l=>l.id===selectedLevel)?.label}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>
            <button onClick={() => setCat("all")}
              style={{padding:"6px 14px",borderRadius:4,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:selectedCat==="all"?"#1C1917":"#f0f0f0",color:selectedCat==="all"?"white":"#1C1917"}}>
              Tout ({FRENCH_QUESTIONS.filter(q=>q.level===selectedLevel).length})
            </button>
            {FRENCH_CATEGORIES.map(cat => {
              const cnt = FRENCH_QUESTIONS.filter(q=>q.level===selectedLevel&&q.cat===cat.id).length;
              if (!cnt) return null;
              return (
                <button key={cat.id} onClick={() => setCat(cat.id)}
                  style={{padding:"6px 14px",borderRadius:4,border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:selectedCat===cat.id?"#C41E3A":"#f0f0f0",color:selectedCat===cat.id?"white":"#1C1917"}}>
                  {cat.icon} {cat.label} ({cnt})
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={() => startQuiz(selectedLevel, selectedCat)}
              style={{flex:1,background:"linear-gradient(135deg,#1C1917,#C41E3A)",color:"white",border:"none",borderRadius:4,padding:"12px 18px",cursor:"pointer",fontWeight:700,fontSize:14,boxShadow:"0 4px 16px rgba(196,30,58,.2)"}}>
              🎯 Commencer {selectedCat === "all" ? "toutes les catégories" : FRENCH_CATEGORIES.find(c=>c.id===selectedCat)?.label}
            </button>
            <button onClick={() => startListen(selectedLevel, selectedCat)}
              title="Écouter les questions"
              style={{background:"#6B21A8",color:"white",border:"none",borderRadius:4,padding:"12px 18px",cursor:"pointer",fontWeight:700,fontSize:14,whiteSpace:"nowrap"}}>
              🎧 Écouter
            </button>
          </div>
        </div>
      )}

      {/* Tips */}
      <div style={{...card,borderLeft:"4px solid #C41E3A"}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>💡 Conseils de préparation</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {[
            ["📅","Planifiez","Commencez 2–3 mois avant votre examen. 30 minutes par jour suffisent."],
            ["👂","Écoutez","Regardez des films et écoutez la radio française quotidiennement."],
            ["✍️","Écrivez","Tenez un journal en français. L'écriture ancre le vocabulaire."],
            ["💬","Parlez","Cherchez des partenaires de conversation ou des groupes de pratique."],
          ].map(([icon,title,desc])=>(
            <div key={title} style={{display:"flex",gap:10}}>
              <span style={{fontSize:20,flexShrink:0}}>{icon}</span>
              <div>
                <div style={{fontWeight:700,fontSize:12,color:"#1C1917",marginBottom:3}}>{title}</div>
                <div style={{fontSize:11.5,color:"#4A4540",lineHeight:1.6}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── EXAM INFO ───────────────────────────────────────────────────────────────
  if (view === "info" && infoExam) {
    const info = EXAM_INFO[infoExam];
    const examLevels = FRENCH_LEVELS.filter(l => l.exam === infoExam);
    return (
      <div className="fade">
        <button onClick={() => setView("home")} style={{background:"none",border:"none",color:"#C41E3A",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:16,padding:0}}>← Retour</button>
        <div style={{background:"linear-gradient(135deg,#1C1917,#C41E3A)",color:"white",borderRadius:8,padding:"28px 24px",marginBottom:16}}>
          <div style={{fontSize:40,fontWeight:900,marginBottom:8}}>{infoExam}</div>
          <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>{info.full}</div>
          <div style={{opacity:.8,fontSize:13,lineHeight:1.65}}>{info.desc}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {[["🏛️","Organisme",info.org],["⏱️","Validité",info.validity],["📊","Niveaux",info.levels],["🌍","Reconnaissance","Internationale"]].map(([icon,label,val])=>(
            <div key={label} style={{...card,marginBottom:0,textAlign:"center",padding:"16px"}}>
              <div style={{fontSize:24,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:11,color:"#8A8480",marginBottom:4}}>{label}</div>
              <div style={{fontWeight:700,fontSize:13,color:"#1C1917"}}>{val}</div>
            </div>
          ))}
        </div>
        {examLevels.length > 0 && (
          <div style={card}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>Niveaux disponibles pour l'entraînement :</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {examLevels.map(lv => {
                const cnt = FRENCH_QUESTIONS.filter(q=>q.level===lv.id).length;
                return (
                  <div key={lv.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 14px",background:lv.bg,borderRadius:4,border:`1.5px solid ${lv.border}`}}>
                    <div>
                      <span style={{fontWeight:700,fontSize:13,color:lv.dark?"white":"#1C1917"}}>{lv.label}</span>
                      <span style={{fontSize:11,color:lv.dark?"rgba(255,255,255,.6)":"#8A8480",marginLeft:8}}>{cnt} questions</span>
                    </div>
                    <button onClick={() => { setLevel(lv.id); startQuiz(lv.id); }}
                      style={{background:lv.color,color:"white",border:"none",borderRadius:4,padding:"6px 14px",cursor:"pointer",fontWeight:700,fontSize:12}}>
                      S'entraîner →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <a href={info.url} target="_blank" rel="noopener noreferrer"
          style={{display:"block",textAlign:"center",background:"white",border:"2px solid #C41E3A",borderRadius:4,padding:"12px",color:"#C41E3A",fontWeight:700,fontSize:14,textDecoration:"none",marginBottom:8}}>
          🔗 Site officiel {infoExam} →
        </a>
      </div>
    );
  }

  // ── LISTEN (mode écoute) ────────────────────────────────────────────────────
  if (view === "listen" && listenQs.length > 0) {
    const q = listenQs[listenIdx];
    const lvInfo = FRENCH_LEVELS.find(l => l.id === q.level);
    const catInfo = FRENCH_CATEGORIES.find(c => c.id === q.cat);
    const showAnswer = listenPhase === "answer" || listenPhase === "explanation" || listenPhase === "pause";
    const showExpl = listenPhase === "explanation" || listenPhase === "pause";
    const phaseLabel = { question:"🎙 Question", answer:"✅ Réponse", explanation:"💡 Explication", pause:"⏸ Suivant…" }[listenPhase] || "";
    return (
      <div className="fade">
        <button onClick={stopListen} style={{background:"none",border:"none",color:"#C41E3A",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:16,padding:0}}>← Retour</button>

        {/* Player card */}
        <div style={{background:"linear-gradient(160deg,#1C1917,#2D1832,#6B21A8)",color:"white",borderRadius:8,padding:"26px 24px",marginBottom:14,position:"relative",overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.2)",borderRadius:6,padding:"4px 12px",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>
              🎧 Mode Écoute · {lvInfo?.cefr}
            </div>
            <span style={{fontSize:12,fontWeight:700,opacity:.85}}>{listenIdx+1} / {listenQs.length}</span>
          </div>

          {/* Progress */}
          <div style={{background:"rgba(255,255,255,.15)",borderRadius:6,height:5,overflow:"hidden",marginBottom:18}}>
            <div style={{width:`${((listenIdx+1)/listenQs.length)*100}%`,height:"100%",background:"#fff",borderRadius:6,transition:"width .4s ease"}}/>
          </div>

          <div style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",opacity:.7,marginBottom:8}}>
            {catInfo?.icon} {catInfo?.label} · {phaseLabel}
          </div>
          <div style={{fontSize:18,fontWeight:700,lineHeight:1.5,fontFamily:"'Playfair Display',serif",marginBottom:14}}>{q.q}</div>

          {showAnswer && (
            <div className="fade" style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:6,padding:"12px 14px",marginBottom:showExpl?10:0}}>
              <div style={{fontSize:10,fontWeight:700,opacity:.7,marginBottom:4,textTransform:"uppercase",letterSpacing:.8}}>Bonne réponse</div>
              <div style={{fontSize:14,fontWeight:700}}>{q.c[q.a]}</div>
            </div>
          )}
          {showExpl && (
            <div className="fade" style={{fontSize:12.5,lineHeight:1.7,opacity:.85}}>{q.e}</div>
          )}

          {/* Controls */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:18,marginTop:22}}>
            <button onClick={() => skipTo(listenIdx-1)} disabled={listenIdx===0}
              style={{background:"none",border:"none",color:"white",cursor:listenIdx===0?"default":"pointer",opacity:listenIdx===0?.3:1,fontSize:22,padding:0}}>⏮</button>
            <button onClick={toggleListenPause}
              style={{background:"white",color:"#6B21A8",border:"none",borderRadius:"50%",width:54,height:54,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:20,boxShadow:"0 4px 14px rgba(0,0,0,.3)"}}>
              {listenPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={() => skipTo(listenIdx+1)} disabled={listenIdx>=listenQs.length-1}
              style={{background:"none",border:"none",color:"white",cursor:listenIdx>=listenQs.length-1?"default":"pointer",opacity:listenIdx>=listenQs.length-1?.3:1,fontSize:22,padding:0}}>⏭</button>
          </div>

          {/* Speed */}
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:18}}>
            {SPEEDS.map(s => (
              <button key={s} onClick={() => changeSpeed(s)}
                style={{background:speed===s?"#fff":"rgba(255,255,255,.12)",color:speed===s?"#6B21A8":"white",border:"1px solid rgba(255,255,255,.2)",borderRadius:6,padding:"4px 11px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Playlist */}
        <div style={card}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:12}}>📃 Liste de lecture ({listenQs.length})</div>
          <div style={{maxHeight:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
            {listenQs.map((lq, i) => (
              <div key={i} onClick={() => skipTo(i)}
                style={{display:"flex",alignItems:"center",gap:11,padding:"10px 12px",borderRadius:4,cursor:"pointer",
                  background:i===listenIdx?"#F3EAFB":"#fafafa",border:`1px solid ${i===listenIdx?"#6B21A8":"#eef0f8"}`}}>
                <span style={{width:24,height:24,borderRadius:"50%",flexShrink:0,background:i===listenIdx?"#6B21A8":"#e2e6f3",color:i===listenIdx?"white":"#6B21A8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>
                  {i===listenIdx && listenPlaying ? "▶" : i+1}
                </span>
                <span style={{fontSize:12.5,color:"#1C1917",fontWeight:i===listenIdx?700:400,lineHeight:1.45,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{lq.q}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ────────────────────────────────────────────────────────────────────
  if (view === "quiz" && quizQs.length > 0) {
    const q = quizQs[qIdx];
    const lvInfo = FRENCH_LEVELS.find(l => l.id === q.level);
    const catInfo = FRENCH_CATEGORIES.find(c => c.id === q.cat);
    return (
      <div className="fade">
        {/* Progress bar */}
        <div style={{background:"white",borderRadius:6,border:"1px solid #eef0f8",padding:"14px 18px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
            <span style={{fontWeight:600,color:lvInfo?.color}}>
              {lvInfo?.badge} {lvInfo?.cefr} · {catInfo?.icon} {catInfo?.label}
            </span>
            <span style={{fontWeight:700,color:"#C41E3A"}}>
              {qIdx+1}/{quizQs.length} · ✓{totalScore} ✗{totalAnswered-totalScore}
            </span>
          </div>
          <ProgressBar value={qIdx} max={quizQs.length} color={lvInfo?.color || "#C41E3A"} />
        </div>

        {/* Question card */}
        <div key={qIdx} className="fade" style={card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:16}}>
            <div style={{fontSize:17,fontWeight:700,lineHeight:1.6,flex:1,fontFamily:"'Playfair Display',serif",color:"#1C1917"}}>{q.q}</div>
            <button onClick={() => speak(q.q)}
              title={speaking ? "Arrêter" : "Écouter"}
              style={{background:speaking?"#C41E3A":"#FEF3EE",border:speaking?"none":"1.5px solid #EBCAC4",color:speaking?"white":"#C41E3A",borderRadius:6,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0}}>
              {speaking
                ? <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="4" height="10" rx="1"/><rect x="8" y="2" width="4" height="10" rx="1"/></svg>
                : <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-6 9a6 6 0 0 0 12 0h-2a4 4 0 0 1-8 0H4zm6 7v-2h-1v2H7v1h6v-1h-2z"/></svg>
              }
            </button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {q.c.map((ch, idx) => {
              let extraStyle = {};
              if (answered) {
                if (idx === q.a) extraStyle = {borderColor:"#2D6A4F",background:"linear-gradient(135deg,#D8F0E5,#B7DFD0)"};
                else if (idx === selected) extraStyle = {borderColor:"#C41E3A",background:"linear-gradient(135deg,#fff5f5,#ffe3e3)"};
              }
              const iconBg = answered && idx === q.a ? "#2D6A4F" : answered && idx === selected && idx !== q.a ? "#C41E3A" : "#dde4f5";
              const iconTx = answered && (idx === q.a || (idx === selected && idx !== q.a)) ? "white" : "#C41E3A";
              const icon = answered && idx === q.a ? "✓" : answered && idx === selected && idx !== q.a ? "✗" : String.fromCharCode(65+idx);
              return (
                <button key={idx} className="cBtn" onClick={() => handleAnswer(idx)} disabled={answered}
                  style={{display:"flex",alignItems:"flex-start",gap:12,padding:"13px 16px",borderRadius:4,textAlign:"left",fontSize:13.5,lineHeight:1.5,fontFamily:"'DM Sans',sans-serif",...extraStyle}}>
                  <span style={{width:25,height:25,borderRadius:"6px",background:iconBg,color:iconTx,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0,marginTop:2}}>{icon}</span>
                  <span style={{color:answered&&idx===q.a?"#2D6A4F":"#1C1917",fontWeight:answered&&idx===q.a?700:400}}>{ch}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <div className="fade" style={{marginTop:14,padding:"12px 14px",background:selected===q.a?"#D8F0E5":"#fdf6ec",borderRadius:4,borderLeft:`4px solid ${selected===q.a?"#2D6A4F":"#B8720A"}`}}>
              <div style={{fontWeight:700,color:selected===q.a?"#2D6A4F":"#B8720A",fontSize:13,marginBottom:6}}>
                {selected===q.a ? "✓ Bonne réponse !" : "✗ Réponse incorrecte"}
              </div>
              <div style={{fontSize:12.5,color:"#4A4540",lineHeight:1.8}}>{q.e}</div>
            </div>
          )}
        </div>

        {answered && (
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <button onClick={nextQ} style={{background:"linear-gradient(135deg,#1C1917,#C41E3A)",color:"white",border:"none",borderRadius:4,padding:"12px 26px",cursor:"pointer",fontSize:14,fontWeight:700,boxShadow:"0 4px 16px rgba(196,30,58,.2)"}}>
              {qIdx+1>=quizQs.length ? "Voir les résultats →" : "Suivant →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── RESULTS ─────────────────────────────────────────────────────────────────
  if (view === "results") {
    const passed = pct >= 60;
    return (
      <div className="fade">
        <div style={{background:passed?"linear-gradient(145deg,#1B4332,#2D6A4F)":"linear-gradient(145deg,#3D0000,#C41E3A)",color:"white",textAlign:"center",padding:"36px 24px",borderRadius:8,marginBottom:16}}>
          <div style={{fontSize:48,marginBottom:8}}>{pct>=80?"🏆":pct>=60?"🎉":"📚"}</div>
          <div style={{fontSize:60,fontWeight:800,fontFamily:"'Playfair Display',serif",letterSpacing:-2}}>
            {totalScore}<span style={{fontSize:24,opacity:.6}}>/{quizQs.length}</span>
          </div>
          <div style={{fontSize:28,fontWeight:800,marginTop:6}}>{pct}%</div>
          <div style={{marginTop:12,display:"inline-flex",padding:"7px 18px",background:"rgba(255,255,255,.15)",borderRadius:6,fontSize:13,fontWeight:600}}>
            {pct>=80?"✓ Excellent — niveau maîtrisé":pct>=60?"✓ Bien — continuez à pratiquer":"À revoir — plus de pratique nécessaire"}
          </div>
        </div>

        {wrong.length > 0 && (
          <div style={card}>
            <div style={{fontWeight:700,fontSize:13,color:"#C41E3A",marginBottom:12}}>🔁 Points à revoir ({wrong.length})</div>
            {wrong.map((wq, i) => (
              <div key={i} style={{marginBottom:10,padding:"11px 13px",background:"#FEF8EE",borderRadius:4,borderLeft:"4px solid #B8720A"}}>
                <div style={{fontWeight:700,fontSize:12.5,marginBottom:4}}>{wq.q}</div>
                <div style={{fontSize:12.5,color:"#2D6A4F",fontWeight:600,marginBottom:4}}>✓ {wq.c[wq.a]}</div>
                <div style={{fontSize:11.5,color:"#4A4540",fontStyle:"italic"}}>{wq.e}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
          <button className="lift" onClick={() => startQuiz(selectedLevel || quizQs[0]?.level)}
            style={{background:"linear-gradient(135deg,#1C1917,#C41E3A)",color:"white",border:"none",borderRadius:4,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700}}>
            🔄 Recommencer
          </button>
          <button className="lift" onClick={() => { setView("home"); setLevel(null); }}
            style={{background:"white",color:"#1C1917",border:"1.5px solid #e2e6f3",borderRadius:4,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700}}>
            📚 Choisir un niveau
          </button>
        </div>
      </div>
    );
  }

  return null;
}
