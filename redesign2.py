with open('src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0
def rep(label, old, new):
    global content, changes
    if old in content:
        content = content.replace(old, new)
        print(f"✅ {label}")
        changes += 1
    else:
        print(f"❌ {label}")

# 1. Card variable
rep("Card var",
    'const card={background:"white",borderRadius:16,boxShadow:"0 2px 20px rgba(0,0,0,.07)",padding:"20px",marginBottom:14};',
    'const card={background:"white",borderRadius:20,boxShadow:"0 2px 16px rgba(0,0,0,.05)",border:"1px solid #eef0f8",padding:"20px",marginBottom:14};')

# 2. Hero card
rep("Hero",
    """<div style={{...card,background:"linear-gradient(135deg,#0a1a4a,#1a3a8f,#2a5298)",color:"white",padding:"28px 26px",borderRadius:20,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,.05)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:-20,left:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,215,0,.08)",pointerEvents:"none"}}/>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
                <div>
                  <h1 style={{margin:"0 0 6px",fontSize:22,fontWeight:800,lineHeight:1.3}}>Préparez votre<br/>Examen Civique 🇫🇷</h1>
                  <p style={{margin:0,opacity:.8,fontSize:13,lineHeight:1.7}}>Obligatoire depuis le <strong>1er janv. 2026</strong></p>
                </div>
                {isPremium&&<div style={{background:"linear-gradient(135deg,#ffd700,#ffb300)",color:"#5a3a00",borderRadius:12,padding:"6px 12px",fontSize:11,fontWeight:800,flexShrink:0}}>⭐ PREMIUM</div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[[`${ALL_QUESTIONS.length}`,"Questions","🗂️"],["🎧","Écoute",""],["11","Langues","🌍"],["80%","Seuil requis","🎯"]].map(([v,l,icon])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.18)",borderRadius:12,padding:"12px 6px",textAlign:"center",border:"1px solid rgba(255,255,255,.25)"}}>
                    <div style={{fontSize:16,fontWeight:800,letterSpacing:.5}}>{v}</div>
                    <div style={{fontSize:9.5,opacity:.85,marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>""",
    """<div style={{background:"linear-gradient(145deg,#0d1b4b,#1a3480,#1e5ca0)",color:"white",padding:"30px 26px",borderRadius:24,position:"relative",overflow:"hidden",marginBottom:16,boxShadow:"0 12px 48px rgba(13,27,75,.4)"}}>
              <div style={{position:"absolute",top:-50,right:-50,width:220,height:220,borderRadius:"50%",background:"rgba(255,255,255,.04)",pointerEvents:"none"}}/>
              <div style={{position:"absolute",bottom:-40,left:20,width:160,height:160,borderRadius:"50%",background:"rgba(245,196,0,.06)",pointerEvents:"none"}}/>
              <div style={{marginBottom:20}}>
                <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.13)",border:"1px solid rgba(255,255,255,.2)",borderRadius:20,padding:"4px 12px",fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:14}}>🇫🇷 Programme officiel 2026</div>
                <h1 style={{margin:"0 0 8px",fontSize:26,fontWeight:800,lineHeight:1.2,fontFamily:"'Sora',sans-serif",letterSpacing:-.5}}>Préparez votre<br/>Examen Civique</h1>
                <p style={{margin:0,opacity:.72,fontSize:13,lineHeight:1.6}}>Obligatoire depuis le <strong style={{opacity:1,fontWeight:700}}>1er janvier 2026</strong></p>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[[`${ALL_QUESTIONS.length}`,"Questions"],["🎧","Écoute"],["11","Langues"],["80%","Seuil"]].map(([v,l])=>(
                  <div key={l} style={{background:"rgba(255,255,255,.12)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.18)",borderRadius:14,padding:"13px 6px",textAlign:"center"}}>
                    <div style={{fontSize:17,fontWeight:800,fontFamily:"'Sora',sans-serif"}}>{v}</div>
                    <div style={{fontSize:9,opacity:.75,marginTop:3,fontWeight:600,textTransform:"uppercase",letterSpacing:.8}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>""")

# 3. Listen home card background
rep("Listen home bg",
    'background:"linear-gradient(135deg,#1a0a3a,#3b1f7a)",color:"white",padding:"22px"}}',
    'background:"linear-gradient(145deg,#130e30,#251860,#1a2f6e)",color:"white",padding:"24px",borderRadius:22,boxShadow:"0 8px 36px rgba(19,14,48,.32)"}}')

# 4. Quiz question text
rep("Q text",
    '<div style={{fontSize:17,fontWeight:700,lineHeight:1.65,flex:1}}>{q.q}</div>',
    '<div style={{fontSize:18,fontWeight:700,lineHeight:1.6,flex:1,fontFamily:"\'Sora\',sans-serif",color:"#0d1a3a",letterSpacing:-.2}}>{q.q}</div>')

# 5. Quiz progress bar card
rep("Quiz progress card",
    '<div style={{...card,padding:"12px 16px",marginBottom:11}}>',
    '<div style={{background:"white",borderRadius:18,border:"1px solid #eef0f8",boxShadow:"0 2px 12px rgba(0,0,0,.05)",padding:"14px 18px",marginBottom:12}}>')

# 6. Next button
rep("Next btn",
    'style={{background:"linear-gradient(135deg,#0d2060,#1a3a8f)",color:"white",border:"none",borderRadius:10,padding:"11px 24px",cursor:"pointer",fontSize:14,fontWeight:700}}',
    'style={{background:"linear-gradient(135deg,#0d1b4b,#2d4faa)",color:"white",border:"none",borderRadius:14,padding:"12px 26px",cursor:"pointer",fontSize:14,fontWeight:700,boxShadow:"0 4px 16px rgba(45,79,170,.3)",fontFamily:"\'Inter\',sans-serif"}}')

# 7. Results card
rep("Results card",
    'style={{...card,background:passed?"linear-gradient(135deg,#0a4020,#1a7a4a)":"linear-gradient(135deg,#5a0f0f,#c0392b)",color:"white",textAlign:"center",padding:"30px 22px"}}',
    'style={{background:passed?"linear-gradient(145deg,#083d1a,#0f6b30,#1a9a48)":"linear-gradient(145deg,#3d0808,#8b1a1a,#c0392b)",color:"white",textAlign:"center",padding:"40px 24px",borderRadius:24,marginBottom:16,boxShadow:passed?"0 12px 48px rgba(15,107,48,.4)":"0 12px 48px rgba(139,26,26,.4)"}}'
)

# 8. Results score
rep("Results score",
    '<div style={{fontSize:56,fontWeight:800,lineHeight:1}}>{totalScore}<span style={{fontSize:22,opacity:.75}}> / {quizQs.length}</span></div>\n              <div style={{fontSize:22,fontWeight:700,marginTop:6,opacity:.95}}>{Math.round((totalScore/quizQs.length)*100)}%</div>\n              <div style={{marginTop:10,fontSize:13,opacity:.9}}>{passed?`✓ Seuil atteint (${passMark}/${quizQs.length})`:`Il manque ${passMark-totalScore} point(s) pour 80 %`}</div>',
    '<div style={{fontSize:64,fontWeight:800,lineHeight:1,fontFamily:"\'Sora\',sans-serif",letterSpacing:-2}}>{totalScore}<span style={{fontSize:26,opacity:.6,fontWeight:600}}> / {quizQs.length}</span></div>\n              <div style={{fontSize:30,fontWeight:800,marginTop:8,fontFamily:"\'Sora\',sans-serif"}}>{Math.round((totalScore/quizQs.length)*100)}%</div>\n              <div style={{marginTop:14,fontSize:12.5,fontWeight:600,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.2)",display:"inline-flex",padding:"7px 18px",borderRadius:20}}>{passed?`✓ Seuil atteint (${passMark}/${quizQs.length})`:`Il manque ${passMark-totalScore} point(s) pour 80 %`}</div>'
)

# 9. Upsell card on results
rep("Upsell card",
    'style={{...card,background:"linear-gradient(135deg,#1a0a3a,#3b1f7a)",color:"white",textAlign:"center",padding:"24px"}}',
    'style={{background:"linear-gradient(145deg,#130e30,#251860,#1e3480)",color:"white",textAlign:"center",padding:"28px",borderRadius:22,marginBottom:16,boxShadow:"0 8px 36px rgba(19,14,48,.35)"}}')

# 10. Wrong answers card header color
rep("Wrong answers",
    '<div style={{fontWeight:700,fontSize:13,color:"#c0392b"}}>🔁 À revoir',
    '<div style={{fontWeight:700,fontSize:13,color:"#e03131"}}>🔁 À revoir')

# 11. Action buttons
rep("Action btns",
    """<div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>startQuiz(null)} style={{background:"linear-gradient(135deg,#0d2060,#1a3a8f)",color:"white",border:"none",borderRadius:10,padding:"10px 22px",cursor:"pointer",fontSize:13,fontWeight:700}}>🔄 Recommencer</button>
              {isPremium&&<button onClick={()=>startListen("all")} style={{background:"linear-gradient(135deg,#1a0a3a,#3b1f7a)",color:"white",border:"none",borderRadius:10,padding:"10px 22px",cursor:"pointer",fontSize:13,fontWeight:700}}>🎧 Tout écouter</button>}
              <button onClick={()=>{stopAll();setScreen("home");}} style={{background:"white",color:"#1a3a8f",border:"2px solid #1a3a8f",borderRadius:10,padding:"10px 22px",cursor:"pointer",fontSize:13,fontWeight:700}}>🏠 Accueil</button>
            </div>""",
    """<div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <button className="lift" onClick={()=>startQuiz(null)} style={{background:"linear-gradient(135deg,#0d1b4b,#2d4faa)",color:"white",border:"none",borderRadius:14,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 16px rgba(45,79,170,.28)"}}>🔄 Recommencer</button>
              {isPremium&&<button className="lift" onClick={()=>startListen("all")} style={{background:"linear-gradient(145deg,#130e30,#251860)",color:"white",border:"none",borderRadius:14,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 16px rgba(19,14,48,.3)"}}>🎧 Tout écouter</button>}
              <button className="lift" onClick={()=>{stopAll();setScreen("home");}} style={{background:"white",color:"#0d1b4b",border:"1.5px solid #e2e6f3",borderRadius:14,padding:"12px 24px",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>🏠 Accueil</button>
            </div>""")

# 12. Theme cards
rep("Theme cards",
    'style={{...card,borderTop:`4px solid ${t.color}`,padding:"14px 16px",marginBottom:0}}',
    'style={{background:"white",borderRadius:18,border:"1px solid #eef0f8",borderTop:`3px solid ${t.color}`,boxShadow:"0 2px 12px rgba(0,0,0,.05)",padding:"18px 16px",marginBottom:0,transition:"all .22s cubic-bezier(.16,1,.3,1)",cursor:"pointer"}}')

# 13. Timer box refinement
rep("Timer box",
    'background:urgent?"#fdecea":"#eef2ff",borderRadius:10,padding:"8px 14px",border:`1px solid ${urgent?"#c0392b":"#1a3a8f"}`',
    'background:urgent?"linear-gradient(135deg,#fff5f5,#ffe3e3)":"linear-gradient(135deg,#eef2ff,#e8efff)",borderRadius:12,padding:"10px 16px",border:`1.5px solid ${urgent?"#e03131":"#3b5bdb"}`,boxShadow:`0 4px 12px ${urgent?"rgba(224,49,49,.12)":"rgba(59,91,219,.1)"}`,marginTop:10')

print(f"\n{changes}/13 changes applied")
with open('src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Saved!")
