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
- Balıkesir ↔ Küçükkuyu karayolu bağlantısı (128,6 km)
- Minibüs: 20 yolcu
- Otobüs: 50 yolcu
- Her iki kara taşıtı için Balıkesir–Küçükkuyu yaz tarifesi: €9
- Kara taşıtlarında menzil sınırı yoktur.
- Karayolu waypointleri `/tools/route-editor.html` üzerinden sarı yollar izlenerek düzenlenebilir.
- İki terminal de açıldığında tanımlı bağlantı ücretsiz ve otomatik etkinleşir.

Balıkesir yolcuları Ayvalık üzerinden deniz hatlarına, deniz hatlarından gelen yolcular da Ayvalık üzerinden Balıkesir'e aktarma yapabilir.

## Hava yolu genişlemesi

- İstanbul Havalimanı: €80.000
- İzmir Adnan Menderes Havalimanı: €50.000
- İstanbul ↔ İzmir elle düzenlenmiş hava rotası: 363,8 km
- Anadolu Bölgesel 40: 40 yolcu, 430 km/sa, €120.000, yaz bileti €60, yaklaşık 81 dakika
- Ege Jet 100: 100 yolcu, 780 km/sa, €280.000, yaz bileti €75, yaklaşık 63 dakika
- Uçuş süresi seyir hızına ek olarak taksi, kalkış, tırmanış ve yaklaşma süresini içerir.
- Otomatik rota `/tools/route-editor.html` içinden elle düzenlenip `manual-air-route-editor` kaynağıyla dışa aktarılabilir.

İzmir Adnan Menderes Havalimanı, Çeşme’ye 93,7 km’lik ve 31 waypointli elle düzenlenmiş karayolu rotasıyla bağlanır. Minibüs ve otobüs için yaz tarifesi €8’dir. İzmir–Ayvalık bağlantısı sonraki genişleme için ayrılmıştır.

## Büyük feribot

- Aegean Grand 120: 120 yolcu, 77 km/sa, 520 km menzil
- Satın alma: €220.000
- Boş operasyon: €16/km; terminal vergisi: €0,12/dk
- Bakım: 700 km’de bir €650
- Standart deniz tarifesinin `%20` üzerinde premium bilet uygular.
- Örnek yaz tarifeleri: Ayvalık–Küçükkuyu €19, Ayvalık–Midilli €30, Ayvalık–Çeşme €38, Çeşme–Sakız €26, Sakız–Midilli €41

## Talep ve hizmet güveni

- Doğrudan hatlarda sakin dönemlerde de asgari yolcu akışı korunur.
- Kuyruk üç araç kapasitesini geçtiğinde yeni talep yavaşlar, beş araç kapasitesinde durur.
- Ortalama beş saatten uzun bekleyen yolcular kademeli olarak vazgeçer.
- Vazgeçen her yolcu €0,50 hizmet telafisi ve terminal hizmet güveni kaybı oluşturur.
- Başarılı taşımalar hizmet güvenini geri kazandırır; güven ayrıca oyun günü başına bir puan kendiliğinden toparlanır.
- Aktarmalı talep, doğrudan talebin sınırlı bir bölümüdür ve devam hatlarında çalışan araç yoksa daha da azalır.
- Bir hedefe birden fazla aktarmalı güzergâh varsa yolcular; seyahat süresi, bilet toplamı, kuyruk, aktif kapasite ve hizmet güvenine göre koridorlara ağırlıklı olarak dağılır.
- Yeni gelen yolcular yoğunlaşan veya hizmet verilmeyen koridordan çalışan alternatife kayar; tercih tamamen deterministik olmadığı için makul ikinci güzergâh da yolcu alır.
- Bekleyen gruplar güzergâh kararlarını saatte bir yeniden değerlendirir; ani salınımı önlemek için kuyruğun en fazla `%20`si bir değerlendirmede koridor değiştirir.
- Yeni terminal talebi dört oyun gününde `%30 → %55 → %80 → %100` şeklinde açılır.
- Liman satın alma ekranı tahmini saatlik talebi, önerilen kapasiteyi ve mevcut uygun kapasiteyi gösterir.

Talep dengeleme kontrollerini çalıştırmak için `npm test` kullanılabilir.
