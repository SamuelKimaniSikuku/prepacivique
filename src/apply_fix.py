import sys, os
path = "App.jsx"
content = open(path).read()
start = "  // \u2500\u2500\u2500 DETECT PAYMENT SUCCESS FROM URL \u2500\u2500\u2500"
end = "  },[]);"
si = content.find(start)
ei = content.find(end, si) + len(end)
new_block = """  // \u2500\u2500\u2500 DETECT PAYMENT SUCCESS FROM URL \u2500\u2500\u2500
  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const payment=params.get("payment");
    const email=params.get("email");
    const sessionId=params.get("session_id");
    if(payment==="success"){
      window.history.replaceState({},"",window.location.pathname);
      if(email) setPayEmail(email);
      setPaymentSuccess(true);
      setCodeLoading(true);
      setScreen("payment-success");
      (async()=>{
        try{
          await new Promise(r=>setTimeout(r,3000));
          for(let attempt=0;attempt<8;attempt++){
            let url="";
            if(sessionId){
              url=`${SUPABASE_URL}/rest/v1/activation_codes?stripe_session_id=eq.${encodeURIComponent(sessionId)}&used=eq.true&select=code,customer_email&order=used_at.desc&limit=1`;
            } else if(email){
              url=`${SUPABASE_URL}/rest/v1/activation_codes?customer_email=eq.${encodeURIComponent(email)}&used=eq.true&select=code,customer_email&order=used_at.desc&limit=1`;
            } else {
              setCodeLoading(false);
              return;
            }
            const res=await fetch(url,{headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`}});
            if(res.ok){
              const data=await res.json();
              if(data&&data.length>0){
                setAssignedCode(data[0].code);
                if(data[0].customer_email) setPayEmail(data[0].customer_email);
                setCodeLoading(false);
                return;
              }
            }
            await new Promise(r=>setTimeout(r,2000));
          }
          setCodeLoading(false);
        }catch{ setCodeLoading(false); }
      })();
    }
  },[]);"""
content = content[:si] + new_block + content[ei:]
open(path, "w").write(content)
print("Done!")
