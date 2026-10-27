# Pink & Purple Adventure

Česká HTML5 Canvas plošinovka: tři úrovně, mince, nepřátelé, propasti, okurkové schopnosti a Luna s lokálními dialogy.

**[Hrát online na GitHub Pages](https://adamferencz.github.io/pink-purple-adventure-codex/)**

Otevři `dist/index.html` přímo v prohlížeči. Není třeba instalace, backend ani API klíč. Fonty z Google Fonts jsou volitelné; offline hra používá systémové písmo. Pro místní webový náhled spusť `python -m http.server 4173 --directory dist`.

- Šipky nebo A/D: pohyb, mezerník / W / šipka nahoru: skok.
- E: rozhovor s Lunou v její blízkosti, Escape: pauza / návrat.
- Dotyková tlačítka podporují současné držení pohybu a skoku.
- Nepřítele porazíš skokem shora. Boční kontakt a propasti ubírají život.
- V první úrovni poblíž začátku spí Noctis, velký démonický jednorožec s ohnivou hřívou a netopýřími křídly. Při přiblížení se probudí. Před výpadem varuje; třemi skoky na hřbet ho porazíš za 500 bodů a 15 mincí. Souboj je volitelný.
- Zelená okurka: vyšší skok na 10 s; zlatá: nezranitelnost na 8 s; růžová: rychlost na 10 s.
- Luna přijímá 10 / 25 / 50 mincí za 5 / 15 / 35 náklonnosti. Při 50 přidá život do maxima tří, při 80 jednorázový štít. Odměny lze získat jen jednou za hru.
- Mince dávají 10 bodů, nepřátelé 50, okurky 25 a dokončení úrovně 200.
- Osobní rekord se ukládá do localStorage, pokud je v prohlížeči dostupné.

Všechna grafika vzniká procedurálně. Zvuk je volitelný (tlačítko ♪), syntetizovaný přes Web Audio.

## GitHub Pages

Web se publikuje z kořene větve `gh-pages`, která obsahuje soubory z `dist/`. Po změnách hry a jejich commitnutí spusť `git subtree push --prefix dist github gh-pages` (remote `github` směřuje na tento repozitář). GitHub následně web automaticky nasadí. Ve standardním klonu s remote `origin` použij místo `github` název `origin`.

Ověření herních mechanik a průchodu všemi úrovněmi: `node test-game.cjs`.

Rychlá kontrola souboje s bossem a základních mechanik bez průchodu úrovněmi: `node test-game.cjs --boss`.
