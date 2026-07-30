# Aegean Fleet

Harita tabanlı, mevsimsel talep ve filo ekonomisi prototipi.

## Mevcut liman ağı

- Ayvalık ↔ Midilli
- Ayvalık ↔ Çeşme
- Çeşme ↔ Sakız

Çeşme–Midilli ve Sakız–Midilli doğrudan hatları tanımlı değildir. Sakız’dan Midilli’ye gitmek isteyen yolcular şu zorunlu aktarmayı kullanır:

`Sakız → Çeşme → Ayvalık → Midilli`

İleride Sakız–Midilli doğrudan rotası eklendiğinde yolcular otomatik olarak doğrudan hattı tercih edecektir.

## Açılış gereksinimleri

- Çeşme Limanı: €20.000
- Sakız hattı: Çeşme açık olmalı + €25.000

## Geliştirme araçları

Rotaları düzenlemek için `/tools/route-editor.html` kullanılabilir.

## Karayolu genişlemesi

- Balıkesir Otogarı: €10.000
- Balıkesir ↔ Ayvalık karayolu bağlantısı
- Minibüs: 20 yolcu
- Otobüs: 50 yolcu
- Karayolu waypointleri `/tools/route-editor.html` üzerinden sarı yollar izlenerek düzenlenebilir.
- İki terminal de açıldığında tanımlı bağlantı ücretsiz ve otomatik etkinleşir.

Balıkesir yolcuları Ayvalık üzerinden deniz hatlarına, deniz hatlarından gelen yolcular da Ayvalık üzerinden Balıkesir'e aktarma yapabilir.
