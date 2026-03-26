# Emils Dashboard – Projektinstruktioner

## VIKTIGT: Uppdatera PROJEKT_INFO.txt vid varje ändring
Efter varje ändring i projektet ska `PROJEKT_INFO.txt` uppdateras:
- Lägg till nya moduler/datakällor under "MODULER & DATAKÄLLOR"
- Lägg till en rad under "SENASTE ÄNDRINGAR" med datum och beskrivning
- Inkludera `PROJEKT_INFO.txt` i git-commiten

## Deploy
Alla ändringar måste pushas till **både** `main` och `gh-pages`:
```
git add <filer> PROJEKT_INFO.txt
git commit -m "beskrivning"
git push origin main
git checkout gh-pages && git merge main && git push origin gh-pages && git checkout main
```

## Cache-busting
Vid ändringar i `dashboard.js` — kontrollera om `?v=N` i `index.html` behöver höjas.
