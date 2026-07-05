# Liminal.ai - Proje Vizyonu

## Problemler
Birçok insan ne yapması gerektiğini bilir fakat yapamaz. Sorun bilgi eksikliği değildir. Temel sorunlar:
* Dikkat kaybı
* Kaçış davranışları
* Anlık dopamin kaynaklarına yönelme
* Gün içinde farkındalık kaybı
* Plan ile gerçek davranış arasındaki kopukluk

Bu ürünün amacı kullanıcının:
* Ne yaptığını görmesini,
* Neden yaptığını anlamasını,
* Davranış kalıplarını keşfetmesini,
* Ertesi gün için daha doğru kararlar almasını sağlamaktır.

---

## Hedef Kullanıcı Grubu
* Sürekli erteleyen (procrastinator) kişiler
* Yazılımcılar
* Öğrenciler
* Freelance çalışanlar
* Oyun / sosyal medya tüketimi yüksek kişiler
* Ne yapacağını bilmesine rağmen uygulayamayan kişiler

---

## Temel Hipotez
> İnsanlar başarısız oldukları için değil; davranışlarını yeterince gözlemleyemedikleri için aynı döngüleri tekrar ederler.

Eğer kişi:
* Gününü objektif olarak görebilirse,
* Kaçış anlarını fark edebilirse,
* Gün sonu davranış analizi alabilirse,
daha bilinçli kararlar verebilir.

---

## Ürün Vizyonu
**Liminal.ai;**
* Bir görev (todo) uygulaması değildir.
* Bir alışkanlık takip (habit tracker) uygulaması değildir.
* Bir **davranış aynasıdır**.

Kullanıcının gün içerisindeki davranışlarını toplar, analiz eder, görselleştirir ve ertesi gün için yönlendirme üretir.

---

## Kullanıcı Döngüsü
1. **Gün içinde veri toplama:** Aktivitelerin ve modların girilmesi.
2. **Davranışları kaydetme:** Davranış modlarının (Focus, Drift vb.) işaretlenmesi.
3. **Gün sonu analiz:** Toplanan verilerin özetlenmesi.
4. **Davranış kalıbı çıkarımı:** Kaçış noktalarının tespiti.
5. **Ertesi gün plan önerisi:** Rayına oturmak için ufak adımlı planlar.
6. **Tekrar.**

---

## Toplanacak Veriler

### 1. Günlük Genel Bilgiler
* Uyanma saati
* Uyku süresi
* Enerji seviyesi (1-5 veya 1-10 arası)
* Duygu durumu (Mutlu, Odaklanmış, Yorgun vb.)

### 2. Aktivite Bilgileri
Her bir aktivite için başlangıç saati, bitiş saati ve süre bilgisi tutulur:
* Derin çalışma (Deep Work)
* Oyun
* Reels / Kısa videolar
* YouTube
* Sosyal medya
* Spor
* Boş zaman
* Dinlenme

### 3. Davranış Durumları (State)
* **Focus State (Odak):** Kullanıcı üretim halindedir. (Örn: kod yazmak, araştırma yapmak, proje geliştirmek).
* **Drift State (Sapma/Kaçış):** Kullanıcı planladığı şeyden uzaklaşmıştır. (Örn: reels, gereksiz gezinme, amaçsız oyun).
* **Recovery State (Geri Kazanım):** Kullanıcı tekrar odaklanmaya dönmüştür. (Örn: oyundan çıkıp çalışmaya dönmek, sosyal medyadan çıkıp göreve dönmek).

### 4. Drift (Sapma) Sebepleri
* Sıkılma
* Belirsizlik (Görevin net olmaması)
* Zor görev
* Yorgunluk
* "Bir bakayım" hissi
* Diğer

---

## En Önemli Metrikler

1. **Focus Time (Odak Süresi):** Gerçek üretim süresi.
2. **Drift Time (Sapma Süresi):** Kaçış süresi.
3. **Recovery Count (Geri Kazanım Sayısı):** Kullanıcının gün içerisinde odak durumuna kaç kez geri dönebildiği. (Sistemin en kritik metriğidir).
4. **Control Score (Kontrol Skoru):** Kullanıcının günü ne kadar yönettiğini gösteren özel bir algoritma skoru.

---

## Gün Sonu Analizi
Sistem gün sonunda şu analizleri üretir:
* **Gün Özeti:** Bugün ne yapıldı, zaman nereye harcandı?
* **Kaçış Analizi:** En büyük dikkat dağıtıcı, en sık kaçış noktası, en problemli zaman aralığı.
* **Davranış Yorumu (Koç Tonu):** 
  * *Örnek:* "Bugün en büyük kopuş öğleden sonra başladı. Çalışma bloğu sonrası doğrudan oyuna geçildi ve geri dönüş (recovery) gerçekleşmedi."

---

## Yarın Planı
Amaç kullanıcıyı sıfırdan mükemmel yapmak değil, onu tekrar rayına oturtmaktır.
* *Örnek Plan:* 
  * 45 dk çalışma
  * 15 dk mola
  * 45 dk çalışma
  * Spor
  * Kontrollü oyun süresi

---

## Ürün Tonu
* **Sert ama yapıcı.**
* Sistem yargılamaz, suçluluk hissettirmez, ancak gerçekleri saklamaz.
* Objektif bir koç gibi davranır.

---

## MVP (İlk Versiyon) Kapsamı
Uygulama 4 ana ekrandan oluşacaktır:
* **Sayfa 1: Günlük Veri Girişi:** Günlük genel bilgilerin ve gün içindeki aktivitelerin/durumların girilebileceği arayüz.
* **Sayfa 2: Günlük Zaman Haritası:** Günün nasıl geçtiğini görselleştiren zaman çizelgesi/harita (timeline).
* **Sayfa 3: Gün Sonu Analiz Ekranı:** Focus/Drift süreleri, Recovery sayısı, Control skoru ve koç yorumları.
* **Sayfa 4: Yarın Planı:** Bir sonraki gün için önerilen yapılandırılmış plan.

---

## Gelecek Özellikler (Yol Haritası)
* AI koç entegrasyonu (LLM destekli analizler)
* Otomatik davranış analizi ve kaçış kalıbı tespiti
* Haftalık raporlar ve aylık davranış haritaları
* Yapay zeka destekli tahminleme sistemi ve gelecek simülasyonu
