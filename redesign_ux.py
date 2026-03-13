print("Reading file...")
with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
print(f"Loaded: {len(content)} chars")

changes = 0

def rep(label, old, new):
    global content, changes
    if old in content:
        content = content.replace(old, new)
        print(f"✅ {label}")
        changes += 1
    else:
        print(f"❌ {label}: not found")

# 1. CSS
rep("CSS", """      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%,100%{opacity:.35}50%{opacity:.85}}
        @keyframes wv0{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        @keyframes wv1{0%,100%{transform:scaleY(.8)}50%{transform:scaleY(.3)}}
        @keyframes wv2{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}
        @keyframes wv3{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.4)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(26,58,143,.35)}60%{box-shadow:0 0 0 10px rgba(26,58,143,0)}}
        .fade{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) forwards}
        .lift{transition:transform .2s cubic-bezier(.16,1,.3,1),box-shadow .2s;cursor:pointer}
        .lift:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.14)!important}
        .cBtn{transition:all .18s cubic-bezier(.16,1,.3,1);border:2px solid #e0e4f0;background:white;width:100%;cursor:pointer;font-family:inherit;border-radius:12px}
        .cBtn:not(:disabled):hover{border-color:#1a3a8f;background:#f0f4ff;transform:translateX(3px)}
        .cReveal{border-color:#1a7a4a!important;background:linear-gradient(135deg,#e6f7ee,#d0f0e0)!important;transform:none!important}
        .cWrong{border-color:#c0392b!important;background:linear-gradient(135deg,#fdecea,#fdd)!important;transform:none!important}
        .cSpeaking{border-color:#1a3a8f!important;background:#e8f0ff!important}
        .shimmer{animation:shimmer 1.2s ease infinite}
        .pulse{animation:pulse 1.8s infinite}
        .themeCard{transition:all .2s cubic-bezier(.16,1,.3,1)}
        .themeCard:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(0,0,0,.12)!important}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}
        @media(max-width:600px){.hide-mobile{display:none!important}}
      `}</style>""",
"""      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%,100%{opacity:.35}50%{opacity:.85}}
        @keyframes wv0{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
        @keyframes wv1{0%,100%{transform:scaleY(.8)}50%{transform:scaleY(.3)}}
        @keyframes wv2{0%,100%{transform:scaleY(.5)}50%{transform:scaleY(1)}}
        @keyframes wv3{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.4)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(45,79,170,.4)}70%{box-shadow:0 0 0 12px rgba(45,79,170,0)}}
        @keyframes timerBlink{0%,100%{opacity:1}50%{opacity:.5}}
        .fade{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) forwards}
        .lift{transition:transform .22s cubic-bezier(.16,1,.3,1),box-shadow .22s;cursor:pointer}
        .lift:hover{transform:translateY(-5px);box-shadow:0 20px 48px rgba(0,0,0,.12)!important}
        .lift:active{transform:translateY(-2px)}
        .cBtn{transition:all .2s cubic-bezier(.16,1,.3,1);border:1.5px solid #e8ebf5;background:white;width:100%;cursor:pointer;font-family:'Inter',sans-serif;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .cBtn:not(:disabled):hover{border-color:#2d4faa;background:#f4f7ff;transform:translateX(4px);box-shadow:0 4px 16px rgba(45,79,170,.1)}
        .cReveal{border-color:#2f9e44!important;background:linear-gradient(135deg,#ebfbee,#d3f9d8)!important;transform:none!important;box-shadow:0 4px 16px rgba(47,158,68,.12)!important}
        .cWrong{border-color:#e03131!important;background:linear-gradient(135deg,#fff5f5,#ffe3e3)!important;transform:none!important}
        .cSpeaking{border-color:#2d4faa!important;background:#eef2ff!important;box-shadow:0 4px 16px rgba(45,79,170,.12)!important}
        .shimmer{animation:shimmer 1.2s ease infinite}
        .pulse{animation:pulse 2s infinite}
        .timerBlink{animation:timerBlink 1s ease infinite}
        .themeCard{transition:all .22s cubic-bezier(.16,1,.3,1);cursor:pointer}
        .themeCard:hover{transform:translateY(-6px);box-shadow:0 24px 48px rgba(0,0,0,.09)!important}
        .navBtn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);border-radius:22px;color:white;cursor:pointer;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;padding:6px 13px;transition:all .18s;display:inline-flex;align-items:center;gap:5px}
        .navBtn:hover{background:rgba(255,255,255,.2);border-color:rgba(255,255,255,.35)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#d0d5e8;border-radius:4px}
        @media(max-width:600px){.hide-mobile{display:none!important}}
      `}</style>""")

# 2. Font family
rep("Font", "fontFamily:\"'Georgia',serif\"", "fontFamily:\"'Inter',sans-serif\"")

# 3. Background
rep("BG", 'background:"#f0f2f7"', 'background:"#f3f5fb"')

# 4. Card style
rep("Card", 
    'const card={background:"white",borderRadius:20,boxShadow:"0 2px 16px rgba(0,0,0,.06),0 0 0 1px rgba(0,0,0,.04)",padding:"20px",marginBottom:14};',
    'const card={background:"white",borderRadius:20,boxShadow:"0 2px 16px rgba(0,0,0,.05)",border:"1px solid #eef0f8",padding:"20px",marginBottom:14};')

# 5. Header
rep("Header",
    'background:"linear-gradient(135deg,#1a2f6e,#2d4faa)"',
    'background:"linear-gradient(160deg,#131f4f,#1e3480,#2d4faa)"')

# 6. Hero
rep("Hero",
    """<div style={{background:"linear-gradient(135deg,#1a2f6e,#2d4faa,#1a6898)",color:"white",padding:"28px 26px",borderRadius:22,position:"relative",overflow:"hidden",marginBottom:16,boxShadow:"0 8px 40px rgba(26,47,110,.35)"}}>
              <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:-30,left:40,width:140,height:140,borderRadius:"50%",background:"rgba(245,196,0,.07)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",top:20,right:80,width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>
              <div style={{marginBottom:18,position:"relative"}}>
                <div style={{fontSize:11,fontWeight:700,opacity:.7,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Programme officiel 2026</div>
                <h1 style={{margin:"0 0 6px",fontSize:24,fontWeight:800,lineHeight:1.25,fontFamily:"'Sora',sans-serif"}}>Préparez votre<br/>Examen Civique</h1>
                <p style={{margin:0,opacity:.75,fontSize:13,lineHeight:1.6}}>Obligatoire depuis le <strong>1er janvier 2026</strong></p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,position:"relative"}}>
                {[[`${ALL_QUESTIONS.length}`,"Questions"],["🎧","Écoute"],["11","Langues"],["80%","Seuil"]].map(([v,l])=>(
                  <div key={l} className="statCard">
                    <div style={{fontSize:17,fontWeight:800,fontFamily:"'Sora',sans-serif"}}>{v}</div>
                    <div style={{fontSize:9,opacity:.8,marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>""",
    """<div style={{background:"linear-gradient(145deg,#111d4a,#1e3480,#2060a0)",color:"white",padding:"30px 26px",borderRadius:24,position:"relative",overflow:"hidden",marginBottom:16,boxShadow:"0 12px 48px rgba(17,29,74,.4)"}}>
              <div style={{position:"absolute",top:-50,right:-50,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:-40,left:20,width:160,height:160,borderRadius:"50%",background:"rgba(245,196,0,.06)",pointerEvents:"none"}}/>
              <div style={{marginBottom:20,position:"relative"}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.18)",borderRadius:20,padding:"4px 12px",fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>🇫🇷 Programme officiel 2026</div>
                <h1 style={{margin:"0 0 8px",fontSize:26,fontWeight:800,lineHeight:1.2,fontFamily:"'Sora',sans-serif",letterSpacing:-.5}}>Préparez votre<br/>Examen Civique</h1>
                <p style={{margin:0,opacity:.72,fontSize:13.5,lineHeight:1.6}}>Obligatoire depuis le <strong style={{opacity:1}}>1er janvier 2026</strong></p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,position:"relative"}}>
                {[[`${ALL_QUESTIONS.length}`,"Questions"],["🎧","Écoute"],["11","Langues"],["80%","Seuil"]].map(([v,l])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.11)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.16)",borderRadius:14,padding:"13px 6px",textAlign:"center",transition:"all .2s"}}>
                    <div style={{fontSize:17,fontWeight:800,fontFamily:"'Sora',sans-serif",letterSpacing:-.3}}>{v}</div>
                    <div style={{fontSize:9,opacity:.75,marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>""")

# 7. Theme card
rep("Theme card",
    """<div key={t.id} className="themeCard" style={{background:"white",borderRadius:18,boxShadow:"0 2px 12px rgba(0,0,0,.06)",padding:"18px 16px",marginBottom:0,borderTop:`3px solid ${t.color}`,border:`1px solid #eef0f6`,borderTopColor:t.color,borderTopWidth:3}}>""",
    """<div key={t.id} className="themeCard" style={{background:"white",borderRadius:18,boxShadow:"0 2px 12px rgba(0,0,0,.05)",padding:"18px 16px",marginBottom:0,border:"1px solid #eef0f8",borderTop:`3px solid ${t.color}`}}>""")

# 8. Quiz question text
rep("Q text",
    """<div style={{fontSize:18,fontWeight:700,lineHeight:1.6,flex:1,fontFamily:"'Sora',sans-serif",color:"#111827"}}>{q.q}</div>""",
    """<div style={{fontSize:17,fontWeight:700,lineHeight:1.65,flex:1,fontFamily:"'Sora',sans-serif",color:"#0d1a3a",letterSpacing:-.2}}>{q.q}</div>""")

# 9. Results card
rep("Results",
    """<div style={{background:passed?"linear-gradient(135deg,#0a3d1f,#1a7a4a)":"linear-gradient(135deg,#4a0a0a,#c0392b)",color:"white",textAlign:"center",padding:"36px 24px",borderRadius:22,marginBottom:16,boxShadow:passed?"0 8px 40px rgba(26,122,74,.35)":"0 8px 40px rgba(192,57,43,.35)",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
              <div style={{fontSize:52,marginBottom:12}}>{passed?"🎉":"📚"}</div>
              <div style={{fontSize:60,fontWeight:800,lineHeight:1,fontFamily:"'Sora',sans-serif"}}>{totalScore}<span style={{fontSize:24,opacity:.65,fontWeight:600}}> / {quizQs.length}</span></div>
              <div style={{fontSize:28,fontWeight:800,marginTop:8,fontFamily:"'Sora',sans-serif"}}>{Math.round((totalScore/quizQs.length)*100)}%</div>
              <div style={{marginTop:12,fontSize:13,opacity:.85,fontWeight:500,background:"rgba(255,255,255,.12)",display:"inline-block",padding:"6px 16px",borderRadius:20}}>{passed?`✓ Seuil atteint (${passMark}/${quizQs.length})`:`Il manque ${passMark-totalScore} point(s) pour 80 %`}</div>
            </div>""",
    """<div style={{background:passed?"linear-gradient(145deg,#083d1a,#0f6b30,#1a9a48)":"linear-gradient(145deg,#3d0808,#8b1a1a,#c0392b)",color:"white",textAlign:"center",padding:"40px 24px",borderRadius:24,marginBottom:16,boxShadow:passed?"0 12px 48px rgba(15,107,48,.4)":"0 12px 48px rgba(139,26,26,.4)",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:-20,left:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>
              <div style={{fontSize:56,marginBottom:14}}>{passed?"🎉":"📚"}</div>
              <div style={{fontSize:64,fontWeight:800,lineHeight:1,fontFamily:"'Sora',sans-serif",letterSpacing:-2}}>{totalScore}<span style={{fontSize:26,opacity:.6,fontWeight:600,letterSpacing:0}}> / {quizQs.length}</span></div>
              <div style={{fontSize:30,fontWeight:800,marginTop:8,fontFamily:"'Sora',sans-serif",letterSpacing:-1}}>{Math.round((totalScore/quizQs.length)*100)}%</div>
              <div style={{marginTop:14,fontSize:12.5,fontWeight:600,background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.18)",display:"inline-flex",alignItems:"center",gap:6,padding:"7px 18px",borderRadius:20}}>{passed?`✓ Seuil atteint (${passMark}/${quizQs.length})`:`Il manque ${passMark-totalScore} point(s) pour 80 %`}</div>
            </div>""")

# 10. Action buttons
rep("Action btns",
    """<div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="lift" onClick={()=>startQuiz(null)} style={{background:"linear-gradient(135deg,#1a2f6e,#2d4faa)",color:"white",border:"none",borderRadius:14,padding:"11px 22px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif"}}>🔄 Recommencer</button>
              {isPremium&&<button className="lift" onClick={()=>startListen("all")} style={{background:"linear-gradient(135deg,#1a0f3a,#2d1f6e)",color:"white",border:"none",borderRadius:14,padding:"11px 22px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif"}}>🎧 Tout écouter</button>}
              <button className="lift" onClick={()=>{stopAll();setScreen("home");}} style={{background:"white",color:"#1a2f6e",border:"1.5px solid #dde2f0",borderRadius:14,padding:"11px 22px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>🏠 Accueil</button>
            </div>""",
    """<div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="lift" onClick={()=>startQuiz(null)} style={{background:"linear-gradient(135deg,#111d4a,#2d4faa)",color:"white",border:"none",borderRadius:14,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif",boxShadow:"0 4px 16px rgba(45,79,170,.3)"}}>🔄 Recommencer</button>
              {isPremium&&<button className="lift" onClick={()=>startListen("all")} style={{background:"linear-gradient(135deg,#1a0f3a,#2d1f6e)",color:"white",border:"none",borderRadius:14,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif",boxShadow:"0 4px 16px rgba(26,15,58,.3)"}}>🎧 Tout écouter</button>}
              <button className="lift" onClick={()=>{stopAll();setScreen("home");}} style={{background:"white",color:"#111d4a",border:"1.5px solid #e2e6f3",borderRadius:14,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Inter',sans-serif",boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>🏠 Accueil</button>
            </div>""")

# 11. Listen home card
rep("Listen home",
    'background:"linear-gradient(135deg,#1a0f3a,#2d1f6e)",color:"white",padding:"22px",borderRadius:20,marginBottom:14,boxShadow:"0 6px 32px rgba(26,15,58,.3)"',
    'background:"linear-gradient(145deg,#130e30,#251860,#1a2f6e)",color:"white",padding:"24px",borderRadius:22,marginBottom:14,boxShadow:"0 8px 36px rgba(19,14,48,.35)"')

print(f"\n{changes} changes applied")
with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ File saved!")
