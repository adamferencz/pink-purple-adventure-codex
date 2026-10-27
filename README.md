# Pink & Purple Adventure

Česká HTML5 Canvas plošinovka: tři úrovně, mince, nepřátelé, propasti, okurkové schopnosti a Luna s lokálními dialogy.

Otevři `dist/index.html` přímo v prohlížeči. Není třeba instalace, backend ani API klíč. Fonty z Google Fonts jsou volitelné; offline hra používá systémové písmo. Pro místní webový náhled spusť `python -m http.server 4173 --directory dist`.

- Šipky nebo A/D: pohyb, mezerník / W / šipka nahoru: skok.
- E: rozhovor s Lunou v její blízkosti, Escape: pauza / návrat.
- Dotyková tlačítka podporují současné držení pohybu a skoku.
- Nepřítele porazíš skokem shora. Boční kontakt a propasti ubírají život.
- Zelená okurka: vyšší skok na 10 s; zlatá: nezranitelnost na 8 s; růžová: rychlost na 10 s.
- Luna přijímá 10 / 25 / 50 mincí za 5 / 15 / 35 náklonnosti. Při 50 přidá život do maxima tří, při 80 jednorázový štít. Odměny lze získat jen jednou za hru.
- Mince dávají 10 bodů, nepřátelé 50, okurky 25 a dokončení úrovně 200.
- Osobní rekord se ukládá do localStorage, pokud je v prohlížeči dostupné.

Všechna grafika vzniká procedurálně. Zvuk je volitelný (tlačítko ♪), syntetizovaný přes Web Audio.
