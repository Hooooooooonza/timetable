# Rozvrh (3.E + 6.E + 7.E)

## Nasazení
1. Nahraj složku na GitHub a propoj s Netlify (nebo `npm i -g netlify-cli && netlify deploy --prod`).
   Drag & drop složky nestačí, funkce potřebují build.
2. Site settings → Environment variables:
   - `BAKALARI_URL` – adresa Bakalářů bez lomítka na konci, např. `https://skola.example.cz`
   - `ADMIN_PASSWORD` – heslo pro přepínání

## Úpravy pravidel
Všechno je v `public/rules.js` (ID tříd: 3.E = WF, 6.E = W5, 7.E = W4).
Pokud se některé praktikum nebo předmět nechytí, uprav jeho `match`.
