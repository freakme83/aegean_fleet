# Aegean Fleet

Harita tabanlı, mevsimsel talep ve filo ekonomisi prototipi.

## Mevcut ulaşım ağı

- Ayvalık ↔ Midilli
- Ayvalık ↔ Çeşme
- Çeşme ↔ Sakız

Çeşme–Midilli ve Sakız–Midilli doğrudan hatları tanımlı değildir. Sakız’dan Midilli’ye gitmek isteyen yolcular şu zorunlu aktarmayı kullanır:

`Sakız → Çeşme → Ayvalık → Midilli`

İleride Sakız–Midilli doğrudan rotası eklendiğinde yolcular otomatik olarak doğrudan hattı tercih edecektir.

## Açılış gereksinimleri

- Çeşme Limanı: €20.000
- Sakız Limanı: €25.000
- Midilli Limanı: €30.000
- Balıkesir Otogarı: €10.000

Hat lisans bedeli yoktur. İki terminal satın alındığında aralarında tanımlı bağlantı varsa otomatik ve ücretsiz etkinleşir.

## Geliştirme araçları

Rotaları düzenlemek için `/tools/route-editor.html` kullanılabilir.

## Karayolu genişlemesi

- Balıkesir ↔ Ayvalık karayolu bağlantısı
- Minibüs: 20 yolcu
- Otobüs: 50 yolcu
- Kara taşıtlarında menzil sınırı yoktur.
- Karayolu waypointleri `/tools/route-editor.html` üzerinden sarı yollar izlenerek düzenlenebilir.
- İki terminal de açıldığında tanımlı bağlantı ücretsiz ve otomatik etkinleşir.

Balıkesir yolcuları Ayvalık üzerinden deniz hatlarına, deniz hatlarından gelen yolcular da Ayvalık üzerinden Balıkesir'e aktarma yapabilir.

## Talep ve hizmet güveni

- Doğrudan hatlarda sakin dönemlerde de asgari yolcu akışı korunur.
- Kuyruk üç araç kapasitesini geçtiğinde yeni talep yavaşlar, beş araç kapasitesinde durur.
- Ortalama beş saatten uzun bekleyen yolcular kademeli olarak vazgeçer.
- Vazgeçen her yolcu €0,50 hizmet telafisi ve terminal hizmet güveni kaybı oluşturur.
- Başarılı taşımalar hizmet güvenini geri kazandırır; güven ayrıca oyun günü başına bir puan kendiliğinden toparlanır.
- Aktarmalı talep, doğrudan talebin sınırlı bir bölümüdür ve devam hatlarında çalışan araç yoksa daha da azalır.
- Yeni terminal talebi dört oyun gününde `%30 → %55 → %80 → %100` şeklinde açılır.
- Liman satın alma ekranı tahmini saatlik talebi, önerilen kapasiteyi ve mevcut uygun kapasiteyi gösterir.

Talep dengeleme kontrollerini çalıştırmak için `npm test` kullanılabilir.
