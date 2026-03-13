content = open('App.jsx').read()
marker = "Programme officiel 2026"
last = content.rfind(marker)
end = content.find("}", last) + 1
clean = content[:end]
open('App.jsx', 'w').write(clean)
print("Done! Lines:", clean.count("\n"))
