# Liminal.ai - Proje Arayüzü ve Sistem Mimarisi

Bu belge, Liminal.ai uygulamasının genel yapısını, veri modellerini, temel algoritmalarını ve çalışma prensiplerini detaylandırarak projeye hızlıca hakim olmanızı sağlamak için hazırlanmıştır.

---

## 1. Genel Bakış ve Amaç
Liminal.ai, kullanıcıların günlük dikkat seviyelerini, erteleme (sapma/drift) alışkanlıklarını, ruh hallerini ve uyku verilerini takip ederek odaklanma disiplinlerini artırmayı hedefleyen **yerel öncelikli (local-first)** bir bilişsel takip ve AI koçluk arayüzüdür. 

Uygulama, verilerini tamamen kullanıcının tarayıcısında (`localStorage`) depolar, masaüstü etkinliklerini otomatik olarak izlemek için **ActivityWatch** ile senkronize olur ve kişiselleştirilmiş haftalık/günlük gelişim tavsiyeleri sunmak için doğrudan **Google Gemini API** entegrasyonu kullanır.

---

## 2. Teknoloji Yığını ve Dosya Yapısı
Uygulama, minimum bağımlılıkla maksimum performans ve esneklik sağlamak amacıyla saf web teknolojileriyle kurulmuştur:
*   **index.html**: Uygulamanın ana iskeletini ve 6 farklı sayfanın (Dashboard, Günlük Rapor, Simülatör, Yapay Zeka Koçu, Haftalık Analiz vb.) tek sayfa mimarisinde (SPA) yerleşimini barındırır.
*   **style.css**: HSL tabanlı dinamik renk paletine sahip, modern, koyu tema ve buzlu cam (glassmorphism) efektleri içeren görsel stil kütüphanesidir.
*   **components.js**: Tekrarlayan UI bileşenlerini (grafikler, aktivite listeleri vb.) kapsülleyen modüler tasarım yardımcılarını içerir.
*   **app.js**: Tüm uygulama mantığını, ActivityWatch eşitlemesini, veri filtreleme algoritmalarını, Gemini API entegrasyonunu ve durum yönetimini (state management) yöneten **ana motor**dur.
*   **server.py**: Uygulamanın yerel tarayıcı güvenlik politikalarını (CORS vb.) ihlal etmeden çalışması için Python tabanlı basit bir HTTP sunucusu işlevi görür.

---

## 3. Veri Modeli ve Durum Yönetimi (State)
Uygulama tek bir global `state` nesnesi üzerinden yönetilir. Bu nesne her değişiklikte otomatik olarak tarayıcının `localStorage` alanına (`liminal_state` anahtarıyla) kaydedilir:

```javascript
let state = {
    selectedDate: "YYYY-MM-DD", // Şu anda görüntülenen/düzenlenen tarih
    history: {
        "YYYY-MM-DD": {
            wakeTime: "08:00",      // Uyanma saati
            sleepHours: 7.5,        // Uyku süresi (saat)
            energyLevel: 7,         // Enerji seviyesi (1-10)
            mood: "Odaklanmış",     // Günün baskın ruh hali
            activities: [           // Gün içindeki aktivite blokları
                {
                    id: "_uniqueId",
                    type: "focus" | "drift" | "break", // Aktivite tipi
                    title: "Aktivite Başlığı",
                    start: "HH:MM",
                    end: "HH:MM",
                    duration: 3600, // Saniye cinsinden süre
                    reason: "Sosyal Medya" | "Bir bakayım hissi" | null // Sapma nedeni
                }
            ],
            recoveryCount: 0,       // Sapmadan odağa geri dönüş sayısı
            focusTime: 0,           // Toplam odak süresi (saniye)
            driftTime: 0,           // Toplam sapma süresi (saniye)
            controlScore: 85,       // Günlük disiplin puanı (0-100)
            aiCoach: {              // Gemini AI günlük koç raporu
                title: "Rapor Başlığı",
                commentary: "Detaylı yorumlar..."
            },
            aiPlan: {               // AI tarafından önerilen rutin ve taktikler
                routine: [ { time: "09:00 - 10:00", type: "work", title: "...", desc: "..." } ],
                actions: [ "Aksiyon 1", "Aksiyon 2" ],
                tactic: "Günün kritik taktiği"
            }
        }
    },
    activeSession: null // Canlı takip aktifse: { type, startTime, reason, title }
};
```
*   **Gemini API Anahtarı**: Güvenlik nedeniyle ana `state` nesnesinden ayrı olarak `localStorage` içinde `liminal_gemini_key` anahtarında saklanır.

---

## 4. Temel Algoritmalar ve İş Mantığı

### A. Kontrol Skoru (Control Score) Formülü
Kullanıcının gün içerisindeki odaklanma başarısını 100 üzerinden puanlayan formül `app.js`'deki `calculateDayMetrics()` fonksiyonunda tanımlıdır:
1.  **Odak Oranı (Maksimum 80 Puan)**: Toplam aktif sürenin (Odak + Sapma) odaklanmaya ayrılan kısmına göre hesaplanır:
    $$\text{Puan} = \frac{\text{Odak Süresi}}{\text{Odak} + \text{Sapma}} \times 80$$
2.  **Recovery Bonusu (Maksimum 15 Puan)**: Kullanıcı sapma (Drift) durumundan çıkıp tekrar Odak moduna her döndüğünde (Recovery) **+5 puan** kazanır.
3.  **Enerji Seviyesi Bonusu (Maksimum 5 Puan)**: Günlük enerji seviyesinin yarısı kadar bonus eklenir:
    $$\text{Bonus} = \text{Enerji Seviyesi} \times 0.5$$
*   Tüm puanlar toplanarak 0 ile 100 arasında sınırlandırılır (`Math.min(100, Math.max(0, score))`).

### B. ActivityWatch Eşitleme ve Sınıflandırma
Kullanıcının bilgisayarındaki pencereleri analiz eden `processAWEvents()` fonksiyonu şu mantıkla çalışır:
*   **Öncelikli Sapma (Drift) Kontrolü**: Pencere başlığında veya uygulama adında eğlence anahtar kelimeleri (`steam`, `youtube`, `game`, `dizi`, `film`, `netflix`, `izle` vb.) geçiyorsa, bu aktivite doğrudan **Drift (Sapma)** ve **Eğlence** kategorisine alınır.
*   **Odaklanma (Focus) Kontrolü**: Drift olmayan durumlarda pencere başlığı veya uygulama adı geliştirici/tarayıcı anahtar kelimeleri (`code`, `cursor`, `github`, `terminal`, `msedge`, `chrome`, `firefox` vb.) içeriyorsa **Odak (Focus)** sayılır.
*   **Mola (Break)**: Yukarıdaki iki kategoriye de girmeyen tüm diğer pencereler mola olarak kabul edilir.

#### Gürültü Filtreleme ve Yumuşatma (Smoothing) Algoritması:
Çok hızlı pencere geçişlerinden kaynaklanan bölük pörçüklüğü engellemek için iki aşamalı filtreleme uygulanır:
1.  **Mikro Kopma Filtresi**: İki çalışma seansı arasında kalan **2 dakikadan kısa** süreli geçici sapmalar/molalar otomatik olarak silinir ve ana odaklanma seansına dahil edilir.
2.  **Mikro Odak Filtresi**: Molalar arasında kalan **1 dakikadan kısa** anlık odaklanmalar elenerek mola seansı korunur.
3.  **Zaman Bazlı Birleştirme**: Aynı kategorideki aktiviteler eğer aralarında 5 dakikadan az boşluk varsa tek bir büyük blok halinde birleştirilir.

### C. Masaüstü Bildirim Mekanizması
*   **Sapma Uyarısı**: Canlı sayaç çalışırken kullanıcı **15 dakikadır** Sapma (Drift) modundaysa, `driftNotified` flag'i kontrol edilerek masaüstüne bir kez uyanış bildirimi gönderilir.
*   **Recovery Tebriği**: Kullanıcı manuel olarak veya sayaç üzerinden sapma seansını sonlandırıp odak seansı başlattığında anında recovery tebrik bildirimi gönderilir ve durum flag'leri sıfırlanır.

---

## 5. Yapay Zeka Entegrasyon Mimarisi
Gemini API ile iletişim kuran `runAICoachAnalysis` (günlük) ve `runWeeklyAIAnalysis` (haftalık) fonksiyonları doğrudan Google v1beta API endpoint'ini kullanır:
*   **Fallback Mekanizması**: İsteklerin hatasız iletilmesi için sırasıyla `gemini-2.5-flash-lite`, `gemini-3.1-flash-lite` ve `gemini-flash-latest` modelleri denenir.
*   **Prompt Yapısı**: Kullanıcının geçmiş günlerdeki odaklanma süreleri, en çok sapılan saat aralıkları, sapma nedenleri ve kontrol skoru gibi özet veriler koç tonunda analiz edilmek üzere Gemini'ye gönderilir. Sonuçlar doğrudan markdown formatında DOM'a basılır.

---

## 6. Projede Değişiklik Yaparken Dikkat Edilmesi Gerekenler
1.  **Veri Güncelleme**: State üzerinde bir değişiklik yaptıktan sonra mutlaka `saveState()` fonksiyonunu çağırarak verilerin `localStorage`'a yazılmasını sağlayın. Ardından UI'ın güncellenmesi için `renderAll()` fonksiyonunu tetikleyin.
2.  **Süre Birimleri**: Veritabanındaki/State'deki odak ve sapma süreleri **saniye (seconds)** olarak tutulurken, arayüzdeki gösterimlerin ve AI promptlarının verileri **dakika (minutes)** cinsinden ele aldığını unutmayın. Dönüşümleri `formatSecondsToMinutes()` gibi fonksiyonlarla yapın.
3.  **CSS Stilleri**: Yeni bir UI bileşeni eklerken renk tanımlamalarını doğrudan yazmak yerine `style.css` içerisindeki global CSS değişkenlerini (`var(--bg-card)`, `var(--color-focus)`, vb.) kullanın. Temanın koyu ve cam efekti (glassmorphic) estetiğini koruyun.
