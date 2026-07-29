# Aegean Fleet

Harita tabanlı, mevsimsel talep ve filo ekonomisi prototipi.

## Mevcut liman ağı

- Ayvalık ↔ Midilli
- Ayvalık ↔ Çeşme
- Çeşme ↔ Sakız

Çeşme–Midilli doğrudan hattı tanımlı değildir. Sakız’dan Midilli’ye gitmek isteyen yolcular şu zorunlu aktarmayı kullanır:

`Sakız → Çeşme → Ayvalık → Midilli`

İleride Sakız–Midilli doğrudan rotası eklendiğinde yolcular otomatik olarak doğrudan hattı tercih edecektir.

## Açılış gereksinimleri

- Çeşme Limanı: €20.000
- Sakız hattı: Çeşme açık olmalı + €25.000

## Geliştirme araçları

Rotaları düzenlemek için `/tools/route-editor.html` kullanılabilir.
