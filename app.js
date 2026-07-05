// Liminal.ai - Core Application Logic

// Global state
let state = {
    selectedDate: getTodayString(),
    history: {},
    activeSession: null // { type: 'focus'|'drift', startTime: timestamp, reason: string|null }
};

// Heuristic configurations
const MOOD_EMOJIS = {
    "Yorgun": "🥱",
    "Odaklanmış": "🎯",
    "Kaygılı": "😟",
    "Enerjik": "⚡",
    "Sakin": "🧘"
};

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    loadState();
    setupNavigation();
    setupDateSelector();
    setupDayForm();
    setupManualActivityForm();
    setupTracker();
    setupActivityWatchSync();
    setupGeminiAI();
    setupSimulator();
    setupWeeklyAnalysis();
    setupNotifications();
    
    // Initial Render
    renderAll();
});

// --- Date Helpers ---
function getTodayString() {
    const d = new Date();
    return formatDateString(d);
}

function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getDisplayDateString(dateStr) {
    const today = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateString(yesterday);
    
    if (dateStr === today) return "Bugün";
    if (dateStr === yesterdayStr) return "Dün";
    
    const parts = dateStr.split('-');
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// --- State Management ---
function loadState() {
    const saved = localStorage.getItem("liminal_state");
    if (saved) {
        try {
            state = JSON.parse(saved);
            // Ensure selectedDate is reset to today on load if needed, or keep last viewed
            if (!state.selectedDate) {
                state.selectedDate = getTodayString();
            }
        } catch (e) {
            console.error("State loading error, resetting...", e);
        }
    }
    
    // Ensure current day exists in history
    initDay(state.selectedDate);
}

function saveState() {
    localStorage.setItem("liminal_state", JSON.stringify(state));
}

function initDay(dateStr) {
    if (!state.history[dateStr]) {
        state.history[dateStr] = {
            wakeTime: "08:00",
            sleepHours: 7.5,
            energyLevel: 7,
            mood: "Odaklanmış",
            activities: [],
            recoveryCount: 0,
            focusTime: 0,
            driftTime: 0,
            controlScore: null
        };
    }
}

// Get current day data object
function getCurrentDayData() {
    initDay(state.selectedDate);
    return state.history[state.selectedDate];
}

// --- SPA Navigation ---
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const pages = document.querySelectorAll(".page-view");
    const headerTitle = document.getElementById("header-title");
    const headerSubtitle = document.getElementById("header-subtitle");
    
    const pageSubtitles = {
        "page-input": "Bugünün davranış kalıplarını kaydetmeye başla.",
        "page-map": "Gününüzün bloklar halinde görselleştirilmiş haritası.",
        "page-analysis": "Focus/Drift oranları, Recovery analizi ve koçluk yorumları.",
        "page-plan": "Bugünün çıktısı üzerinden yarına rayına oturma önerileri.",
        "page-simulator": "Bugünün verilerine göre gelecekteki kariyer ve odak durumunu modelleyin."
    };
    
    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetPage = item.getAttribute("data-page");
            
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            
            pages.forEach(p => {
                p.classList.remove("active");
                if (p.id === targetPage) {
                    p.classList.add("active");
                }
            });
            
            // Update Header
            const titleText = item.innerText.trim();
            headerTitle.innerText = titleText;
            headerSubtitle.innerText = pageSubtitles[targetPage] || "";
            
            // Render specific page features if needed on switch
            if (targetPage === "page-map") {
                renderTimeline();
            } else if (targetPage === "page-analysis") {
                renderAnalysis();
            } else if (targetPage === "page-plan") {
                renderPlan();
            } else if (targetPage === "page-trends") {
                renderWeeklyAnalysis();
            }
        });
    });
}

// --- Date Selector ---
function setupDateSelector() {
    const prevBtn = document.getElementById("prev-day-btn");
    const nextBtn = document.getElementById("next-day-btn");
    const display = document.getElementById("current-date");
    
    function changeDate(days) {
        const parts = state.selectedDate.split('-');
        const current = new Date(parts[0], parts[1] - 1, parts[2]);
        current.setDate(current.getDate() + days);
        state.selectedDate = formatDateString(current);
        
        initDay(state.selectedDate);
        saveState();
        renderAll();
    }
    
    prevBtn.addEventListener("click", () => changeDate(-1));
    nextBtn.addEventListener("click", () => changeDate(1));
}

// --- Day Setup Form ---
function setupDayForm() {
    const form = document.getElementById("day-setup-form");
    const energySlider = document.getElementById("energy-level");
    const energyDisplay = document.getElementById("energy-val-display");
    const moodOptions = document.querySelectorAll(".mood-option");
    let selectedMood = "Odaklanmış";
    
    energySlider.addEventListener("input", (e) => {
        energyDisplay.innerText = `${e.target.value}/10`;
    });
    
    moodOptions.forEach(opt => {
        opt.addEventListener("click", () => {
            moodOptions.forEach(o => o.classList.remove("selected"));
            opt.classList.add("selected");
            selectedMood = opt.getAttribute("data-mood");
        });
    });
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const data = getCurrentDayData();
        data.wakeTime = document.getElementById("wake-time").value;
        data.sleepHours = parseFloat(document.getElementById("sleep-hours").value) || 0;
        data.energyLevel = parseInt(energySlider.value) || 5;
        data.mood = selectedMood;
        
        saveState();
        calculateDayMetrics();
        alert("Günün başlangıç verileri başarıyla kaydedildi!");
        renderAll();
    });
}

// --- Manual Activity Entry ---
function setupManualActivityForm() {
    const form = document.getElementById("manual-activity-form");
    const typeSelect = document.getElementById("manual-type");
    const reasonGroup = document.getElementById("manual-drift-reason-group");
    
    typeSelect.addEventListener("change", (e) => {
        if (e.target.value === "drift") {
            reasonGroup.style.display = "block";
        } else {
            reasonGroup.style.display = "none";
        }
    });
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const type = typeSelect.value;
        const title = document.getElementById("manual-title").value;
        const start = document.getElementById("manual-start").value;
        const end = document.getElementById("manual-end").value;
        const reason = type === "drift" ? document.getElementById("manual-drift-reason").value : null;
        
        // Validation: start time < end time
        if (start >= end) {
            alert("Hata: Başlangıç saati bitiş saatinden büyük veya eşit olamaz!");
            return;
        }
        
        const durationSec = calculateDurationInSeconds(start, end);
        const activity = {
            id: generateId(),
            type,
            title,
            start,
            end,
            duration: durationSec,
            reason
        };
        
        const data = getCurrentDayData();
        data.activities.push(activity);
        
        // Check if manual activity represents a recovery
        // Rule: If a Focus activity immediately follows a Drift activity, increment RecoveryCount
        checkAndIncrementRecovery();
        
        saveState();
        calculateDayMetrics();
        
        form.reset();
        reasonGroup.style.display = "none";
        renderAll();
    });
}

function calculateDurationInSeconds(startStr, endStr) {
    const [sH, sM] = startStr.split(':').map(Number);
    const [eH, eM] = endStr.split(':').map(Number);
    
    const startMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;
    
    return (endMin - startMin) * 60;
}

// Check recovery for manual logs
function checkAndIncrementRecovery() {
    const data = getCurrentDayData();
    const sorted = [...data.activities].sort((a, b) => a.start.localeCompare(b.start));
    
    let recoveryCount = 0;
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i-1].type === 'drift' && sorted[i].type === 'focus') {
            recoveryCount++;
        }
    }
    data.recoveryCount = recoveryCount;
}

// --- Live Tracker ---
let timerInterval = null;
let driftNotified = false;
function setupTracker() {
    const btnFocus = document.getElementById("btn-focus");
    const btnDrift = document.getElementById("btn-drift");
    const picker = document.getElementById("drift-reason-picker");
    const chips = document.querySelectorAll(".reason-chip");
    
    let selectedDriftReason = null;
    
    chips.forEach(chip => {
        chip.addEventListener("click", () => {
            chips.forEach(c => c.classList.remove("selected"));
            chip.classList.add("selected");
            selectedDriftReason = chip.getAttribute("data-reason");
            
            // Once reason selected, proceed with starting Drift mode
            startDriftSession(selectedDriftReason);
            picker.classList.remove("active");
        });
    });
    
    btnFocus.addEventListener("click", () => {
        if (state.activeSession && state.activeSession.type === 'focus') {
            // Stop Focus
            stopActiveSession();
        } else if (state.activeSession && state.activeSession.type === 'drift') {
            // Trigger Recovery: drift to focus
            const data = getCurrentDayData();
            data.recoveryCount++;
            stopActiveSession();
            startFocusSession();
            sendRecoveryNotification();
        } else {
            // Start Focus from Idle
            startFocusSession();
        }
        renderAll();
    });
    
    btnDrift.addEventListener("click", () => {
        if (state.activeSession && state.activeSession.type === 'drift') {
            // Stop Drift
            stopActiveSession();
        } else {
            // Show picker first
            chips.forEach(c => c.classList.remove("selected"));
            selectedDriftReason = null;
            picker.classList.toggle("active");
        }
        renderAll();
    });
    
    // Auto-resume timer if active on load
    if (state.activeSession) {
        startTimerInterval();
        updateTrackerUI();
    }
}

function startFocusSession() {
    state.activeSession = {
        type: 'focus',
        startTime: Date.now(),
        reason: null,
        title: 'Derin Çalışma'
    };
    saveState();
    startTimerInterval();
}

function startDriftSession(reason) {
    driftNotified = false;
    state.activeSession = {
        type: 'drift',
        startTime: Date.now(),
        reason: reason || 'Bilinmiyor',
        title: `Dikkat Dağılması (${reason || 'Bilinmiyor'})`
    };
    saveState();
    startTimerInterval();
}

function stopActiveSession() {
    if (!state.activeSession) return;
    
    clearInterval(timerInterval);
    timerInterval = null;
    
    const now = Date.now();
    const durationMs = now - state.activeSession.startTime;
    const durationSec = Math.round(durationMs / 1000);
    
    if (durationSec >= 5) { // Only record if >= 5 seconds to prevent spam
        const startStr = formatTimeFromTimestamp(state.activeSession.startTime);
        const endStr = formatTimeFromTimestamp(now);
        
        const activity = {
            id: generateId(),
            type: state.activeSession.type,
            title: state.activeSession.title,
            start: startStr,
            end: endStr,
            duration: durationSec,
            reason: state.activeSession.reason
        };
        
        const data = getCurrentDayData();
        data.activities.push(activity);
    }
    
    state.activeSession = null;
    saveState();
    calculateDayMetrics();
    
    // Reset timer label
    document.getElementById("tracker-timer").innerText = "00:00:00";
}

function startTimerInterval() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (!state.activeSession) return;
        const elapsedMs = Date.now() - state.activeSession.startTime;
        document.getElementById("tracker-timer").innerText = formatDurationHHMMSS(elapsedMs);
        
        if (state.activeSession.type === 'drift') {
            checkLiveAlerts(elapsedMs);
        }
    }, 1000);
}

function formatDurationHHMMSS(ms) {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
}

function formatTimeFromTimestamp(ts) {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// --- Calculations & Heuristics ---
function calculateDayMetrics() {
    const data = getCurrentDayData();
    let focus = 0;
    let drift = 0;
    
    data.activities.forEach(act => {
        if (act.type === 'focus') {
            focus += act.duration;
        } else if (act.type === 'drift') {
            drift += act.duration;
        }
    });
    
    data.focusTime = focus;
    data.driftTime = drift;
    
    // Compute Control Score
    if (focus === 0 && drift === 0) {
        data.controlScore = null;
    } else {
        const total = focus + drift;
        const focusRatio = focus / total;
        
        // Base score up to 80 points from Focus Ratio
        let score = focusRatio * 80;
        
        // Recovery bonus: +5 points per recovery (max +15)
        const recoveryBonus = Math.min(15, data.recoveryCount * 5);
        score += recoveryBonus;
        
        // Energy level bonus: +1 point per energy level (max +5)
        const energyBonus = (data.energyLevel || 5) * 0.5;
        score += energyBonus;
        
        data.controlScore = Math.min(100, Math.max(0, Math.round(score)));
    }
    
    saveState();
}

// --- Renders ---
function renderAll() {
    // Current date display
    document.getElementById("current-date").innerText = getDisplayDateString(state.selectedDate);
    
    // Load setup inputs
    const data = getCurrentDayData();
    document.getElementById("wake-time").value = data.wakeTime;
    document.getElementById("sleep-hours").value = data.sleepHours;
    document.getElementById("energy-level").value = data.energyLevel;
    document.getElementById("energy-val-display").innerText = `${data.energyLevel}/10`;
    
    document.querySelectorAll(".mood-option").forEach(o => {
        o.classList.remove("selected");
        if (o.getAttribute("data-mood") === data.mood) {
            o.classList.add("selected");
        }
    });
    
    // Live Tracker updates
    updateTrackerUI();
    
    // Activity List
    renderActivityList();
    
    // Conditionally render other pages if active
    const activePage = document.querySelector(".page-view.active");
    if (activePage) {
        if (activePage.id === "page-map") renderTimeline();
        if (activePage.id === "page-analysis") renderAnalysis();
        if (activePage.id === "page-plan") renderPlan();
    }
}

function updateTrackerUI() {
    const card = document.getElementById("tracker-card");
    const statusText = document.getElementById("tracker-status-text");
    const btnFocus = document.getElementById("btn-focus");
    const btnDrift = document.getElementById("btn-drift");
    const data = getCurrentDayData();
    
    // Live totals formatting
    document.getElementById("tracker-summary-focus").innerText = formatSecondsToMinutes(data.focusTime);
    document.getElementById("tracker-summary-drift").innerText = formatSecondsToMinutes(data.driftTime);
    document.getElementById("tracker-summary-recovery").innerText = data.recoveryCount;
    
    card.className = "glass-card tracker-card";
    btnFocus.classList.remove("active");
    btnDrift.classList.remove("active");
    
    if (state.activeSession) {
        if (state.activeSession.type === 'focus') {
            card.classList.add("state-active-focus");
            statusText.innerText = "Focus Modu";
            btnFocus.classList.add("active");
        } else if (state.activeSession.type === 'drift') {
            card.classList.add("state-active-drift");
            statusText.innerText = `Drift: ${state.activeSession.reason}`;
            btnDrift.classList.add("active");
        }
    } else {
        statusText.innerText = "Boşta";
    }
}

function renderActivityList() {
    const container = document.getElementById("activity-list-container");
    const data = getCurrentDayData();
    
    // Clear btn functionality
    document.getElementById("clear-day-btn").onclick = () => {
        if (confirm("Bu günün tüm aktivitelerini sıfırlamak istediğinize emin misiniz?")) {
            data.activities = [];
            data.recoveryCount = 0;
            data.focusTime = 0;
            data.driftTime = 0;
            data.controlScore = null;
            saveState();
            renderAll();
        }
    };
    
    if (data.activities.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">Henüz bir aktivite girilmemiş.</p>`;
        return;
    }
    
    const sorted = [...data.activities].sort((a, b) => b.start.localeCompare(a.start));
    
    container.innerHTML = sorted.map(act => {
        const badgeType = act.type === 'focus' ? 'badge-focus' : (act.type === 'drift' ? 'badge-drift' : 'badge-break');
        const badgeLabel = act.type === 'focus' ? 'FOCUS' : (act.type === 'drift' ? `DRIFT (${act.reason})` : 'MOLA');
        const durationFormatted = formatSecondsToMinutes(act.duration);
        
        return `
            <div class="activity-item">
                <div class="activity-item-info">
                    <span class="activity-badge ${badgeType}"></span>
                    <div>
                        <div class="activity-title">${act.title}</div>
                        <div class="activity-meta">${act.start} - ${act.end} | ${badgeLabel}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap: 1rem">
                    <span class="activity-duration">${durationFormatted}</span>
                    <button class="activity-delete" onclick="deleteActivity('${act.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.deleteActivity = function(id) {
    const data = getCurrentDayData();
    data.activities = data.activities.filter(a => a.id !== id);
    checkAndIncrementRecovery();
    saveState();
    calculateDayMetrics();
    renderAll();
};

// --- Timeline Render (Page 2) ---
function renderTimeline() {
    if (typeof components !== 'undefined' && components.renderTimeline) {
        const data = getCurrentDayData();
        components.renderTimeline(data.activities, data.wakeTime);
    }
}

// --- Analysis Render (Page 3) ---
function renderAnalysis() {
    const data = getCurrentDayData();
    
    // Numeric stats
    document.getElementById("analysis-focus-time").innerText = formatSecondsToMinutes(data.focusTime);
    document.getElementById("analysis-drift-time").innerText = formatSecondsToMinutes(data.driftTime);
    document.getElementById("analysis-recovery-count").innerText = data.recoveryCount;
    document.getElementById("analysis-energy").innerText = data.energyLevel ? `${data.energyLevel}/10` : "--";
    
    // Radial Control Score Progress
    const circle = document.getElementById("score-circle");
    const numDisplay = document.getElementById("score-num");
    
    if (data.controlScore === null) {
        numDisplay.innerText = "--";
        circle.style.strokeDashoffset = 440;
    } else {
        numDisplay.innerText = data.controlScore;
        // SVG circle perimeter is 2 * PI * r = 2 * 3.14159 * 70 = 439.8
        const offset = 440 - (data.controlScore / 100) * 440;
        circle.style.strokeDashoffset = offset;
    }
    
    // Pie/Donut ratio chart
    if (typeof components !== 'undefined' && components.renderDonutChart) {
        let restSec = 0;
        data.activities.forEach(a => {
            if (a.type === 'break') restSec += a.duration;
        });
        components.renderDonutChart(data.focusTime, data.driftTime, restSec);
    }
    
    // Coach Commentary
    renderCoachingSpeech(data);
}

function renderCoachingSpeech(data) {
    const title = document.getElementById("coach-title");
    const commentary = document.getElementById("coach-commentary");
    
    if (data.aiCoach) {
        title.innerText = data.aiCoach.title;
        commentary.innerText = data.aiCoach.commentary;
        return;
    }
    
    if (data.activities.length === 0) {
        title.innerText = "Liminal Analiz Bekliyor...";
        commentary.innerText = "Gününüzü koçunuzla analiz edebilmek için veri girişi yapmalı ve aktivitelerinizi tamamlamalısınız. Liminal.ai davranışlarınızı inceliyor.";
        return;
    }
    
    const focusMin = data.focusTime / 60;
    const driftMin = data.driftTime / 60;
    
    // Analyze dominant drift reason
    let reasons = {};
    data.activities.forEach(a => {
        if (a.type === 'drift' && a.reason) {
            reasons[a.reason] = (reasons[a.reason] || 0) + a.duration;
        }
    });
    
    let dominantReason = null;
    let maxDriftDuration = 0;
    for (let r in reasons) {
        if (reasons[r] > maxDriftDuration) {
            maxDriftDuration = reasons[r];
            dominantReason = r;
        }
    }
    
    // AI Heuristics
    if (data.driftTime === 0 && data.focusTime > 0) {
        title.innerText = "Tam Hükümranlık!";
        commentary.innerText = "Mükemmel kontrol. Dikkat dağıtıcılara en ufak geçit vermedin. Bugün liminal sınırda tam odaklanma sağlandı. Disiplinini koru, yarın aynı standartları hedefle.";
    } else if (data.driftTime > data.focusTime) {
        title.innerText = "Dikkat: Kontrol Kaybı";
        let reasonStr = dominantReason ? `en büyük kaçış sebebin: "${dominantReason}"` : "kendini anlık kaçışlara teslim etmişsin";
        commentary.innerText = `Günün kontrolü elinden tamamen kaymış. Drift süren, odak süreni aşmış durumda. Analizlerime göre ${reasonStr}. Yarın hedeflerini küçültüp, odağını geri kazanmak için en basit adımlardan başlamalısın.`;
    } else if (data.recoveryCount >= 4) {
        title.innerText = "Çok Sayıda Kopuş, Başarılı Recovery";
        commentary.innerText = `Bugün günün içinde tam ${data.recoveryCount} kez odaklanmaya geri dönmeyi (Recovery) başardın. Bu zihinsel esneklik ve ayağa kalkma iradesi harika! Ancak, odağının bu kadar sık bölünmesini engellememiz gerek. Yarın dikkat dağıtıcıları en baştan fiziksel olarak uzaklaştır.`;
    } else if (data.recoveryCount <= 1 && data.driftTime > 1800) { // drift > 30 mins, low recovery
        title.innerText = "Recovery Eşiği Çok Yüksek";
        commentary.innerText = `Kopuşlar sonrasında geri dönüş gerçekleştirmekte çok zorlanmışsın. Bir kez drift durumuna girdiğinde (örneğin sosyal medya/oyun), zihnin orada sıkışıp kalmış. Yarın için kendine 'oyundan çıkma' veya 'sekme kapatma' eşiklerini hatırlatıcı uyarılar koymalısın.`;
    } else if (dominantReason === "Belirsizlik") {
        title.innerText = "Belirsizlik Tuzağı";
        commentary.innerText = "Bugün seni en çok saptıran şey yapılacakların net olmaması (Belirsizlik) olmuş. Zihin ne yapacağını tam kavrayamadığında doğrudan kaçış yolları arar. Yarın güne başlamadan önce hedeflerini mikroskobik düzeyde detaylandır.";
    } else if (dominantReason === "Sıkılma") {
        title.innerText = "Sıkılma ve Dopamin İhtiyacı";
        commentary.innerText = "Sıkılma hissi seni kaçışa sürüklemiş. Bu çok doğal bir biyolojik tepkidir fakat yönetilebilir. 90 dakikalık devasa bloklar yerine 45 dakika odak, 15 dakika kontrollü mola (Reels/Oyun olmadan) sistemine geçmelisin.";
    } else if (dominantReason === "Zor Görev") {
        title.innerText = "Zor Görevler Karşısında Geri Çekilme";
        commentary.innerText = "Zor görevlerle karşılaştığında zihnin 'savaş ya da kaç' moduna girip 'kaçış'ı seçmiş. Bunu yenmek için yarın ilk iş olarak en zor görevi alıp 15 dakikalık ufak bir prototip üretmeye odaklan. Gerisi gelecektir.";
    } else {
        title.innerText = "Dengeli Bir Gün";
        commentary.innerText = "Fena bir gün sayılmaz. Ancak Liminal limitlerini zorlayabilirsin. Focus süresini artırırken, drift sürelerini her gün %5 azaltmaya odaklanalım.";
    }
}

// --- Tomorrow Plan Render (Page 4) ---
function renderPlan() {
    const list = document.getElementById("plan-routine-list");
    const actions = document.getElementById("plan-action-items");
    const tactic = document.getElementById("plan-tactic-text");
    const data = getCurrentDayData();
    
    if (data.aiPlan) {
        let routineHTML = data.aiPlan.routine.map(item => {
            let badgeClass = item.type === 'work' ? 'routine-type-work' : (item.type === 'break' ? 'routine-type-break' : 'routine-type-leisure');
            return `
                <div class="routine-item ${badgeClass}">
                    <div class="routine-time">${item.time}</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">${item.title}</div>
                        <div class="routine-desc">${item.desc}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        let actionsHTML = data.aiPlan.actions.map(action => `
            <label class="custom-checkbox">
                <input type="checkbox">
                <span class="checkmark"></span>
                <span class="checkbox-text">${action}</span>
            </label>
        `).join('');
        
        list.innerHTML = routineHTML;
        actions.innerHTML = actionsHTML;
        tactic.innerText = data.aiPlan.tactic;
        return;
    }
    
    // Analyze dominant drift reason
    let reasons = {};
    data.activities.forEach(a => {
        if (a.type === 'drift' && a.reason) {
            reasons[a.reason] = (reasons[a.reason] || 0) + a.duration;
        }
    });
    
    let dominantReason = null;
    let maxDriftDuration = 0;
    for (let r in reasons) {
        if (reasons[r] > maxDriftDuration) {
            maxDriftDuration = reasons[r];
            dominantReason = r;
        }
    }
    
    // Tailored routine suggestions
    let routineHTML = '';
    let actionsHTML = '';
    
    if (data.activities.length === 0) {
        // Default standard plan
        routineHTML = `
            <div class="routine-item routine-type-work">
                <div class="routine-time">09:00 - 09:45</div>
                <div class="routine-dot"></div>
                <div class="routine-body">
                    <div class="routine-title">Focus Block I (Planlama & Giriş)</div>
                    <div class="routine-desc">Günün en önemli ve net 1 görevine başla.</div>
                </div>
            </div>
            <div class="routine-item routine-type-break">
                <div class="routine-time">09:45 - 10:00</div>
                <div class="routine-dot"></div>
                <div class="routine-body">
                    <div class="routine-title">Recovery Break (Aktif Dinlenme)</div>
                    <div class="routine-desc">Ekrana bakmadan 15 dakika mola (yürüme, çay).</div>
                </div>
            </div>
            <div class="routine-item routine-type-work">
                <div class="routine-time">10:00 - 11:30</div>
                <div class="routine-dot"></div>
                <div class="routine-body">
                    <div class="routine-title">Focus Block II (Derin Odak)</div>
                    <div class="routine-desc">En zorlu görevi yap. Telefon sessizde ve uzak bir konumda.</div>
                </div>
            </div>
        `;
        actionsHTML = `
            <label class="custom-checkbox">
                <input type="checkbox">
                <span class="checkmark"></span>
                <span class="checkbox-text">Güne hedefler belirlenmiş ve net olarak başla.</span>
            </label>
            <label class="custom-checkbox">
                <input type="checkbox">
                <span class="checkmark"></span>
                <span class="checkbox-text">İlk çalışma bloğunda cep telefonunu başka bir odaya bırak.</span>
            </label>
            <label class="custom-checkbox">
                <input type="checkbox">
                <span class="checkmark"></span>
                <span class="checkbox-text">Zorlu görevleri 25 dakikalık parçalara (Pomodoro) böl.</span>
            </label>
        `;
        tactic.innerText = "Kendine aşırı yüklenme. Bugünden sadece %1 daha iyi bir gün hedefle.";
    } else {
        // Dynamic Plan Generation
        if (data.driftTime > data.focusTime) {
            // High drift day: Suggest Pomodoro (low threat)
            routineHTML = `
                <div class="routine-item routine-type-work">
                    <div class="routine-time">09:30 - 09:55</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Pomodoro Blok 1 (Giriş)</div>
                        <div class="routine-desc">Sadece 25 dakika odaklan ve dur.</div>
                    </div>
                </div>
                <div class="routine-item routine-type-break">
                    <div class="routine-time">09:55 - 10:00</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Hızlı Mola</div>
                        <div class="routine-desc">Dopamin kaçışına girmeden derin nefes al.</div>
                    </div>
                </div>
                <div class="routine-item routine-type-work">
                    <div class="routine-time">10:00 - 10:25</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Pomodoro Blok 2</div>
                        <div class="routine-desc">İkinci 25 dakika. Adım adım rayına otur.</div>
                    </div>
                </div>
            `;
            actionsHTML = `
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Büyük blok hedefler yerine 25 dakikalık Pomodoro kullan.</span>
                </label>
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Sosyal medya uygulamalarına 15 dakika sınır koy.</span>
                </label>
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Geri dönüş eşiğini kısaltmak için masa başına dönünce 5 dk göz kapat.</span>
                </label>
            `;
            tactic.innerText = "Bugün odaklanma kayboldu. Yarın en büyük önceliğimiz yüksek hacim değil, istikrarlı geri dönüşler (recovery) elde etmek.";
        } else if (dominantReason === "Belirsizlik") {
            routineHTML = `
                <div class="routine-item routine-type-work">
                    <div class="routine-time">09:00 - 09:20</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Hazırlık & Mikroskobik Planlama</div>
                        <div class="routine-desc">Yapılacak görevleri en küçük atomlarına kadar yazılı listele.</div>
                    </div>
                </div>
                <div class="routine-item routine-type-work">
                    <div class="routine-time">09:20 - 10:30</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Focus Block (Listelenen İlk Madde)</div>
                        <div class="routine-desc">Belirsizliği ortadan kalkan ilk görevi bitir.</div>
                    </div>
                </div>
            `;
            actionsHTML = `
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Çalışmaya oturmadan önce yapacağın şeyi 1 satıra sığdır.</span>
                </label>
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Her görevden önce 'Başarı Kriteri Nedir?' sorusuna cevap ver.</span>
                </label>
            `;
            tactic.innerText = "Belirsizlik zihnin en büyük kaçış tetiğidir. Planı netleştir, eyleme geçiş direncin yok olsun.";
        } else if (dominantReason === "Zor Görev") {
            routineHTML = `
                <div class="routine-item routine-type-work">
                    <div class="routine-time">09:00 - 09:30</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Zor Görevi Bölme Bloğu</div>
                        <div class="routine-desc">Gözünde büyüyen görevin sadece prototipini / en basit sürümünü tasarla.</div>
                    </div>
                </div>
                <div class="routine-item routine-type-work">
                    <div class="routine-time">09:40 - 11:00</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Focus Block (Zorlu Görev Uygulama)</div>
                        <div class="routine-desc">Parçalanan adımları tek tek uygula.</div>
                    </div>
                </div>
            `;
            actionsHTML = `
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Zorlu görevi 'çöp bir sürüm üretme' hedefine indirge.</span>
                </label>
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Sıkışma durumlarında 5 dakika yerinden kalkıp sadece yürü.</span>
                </label>
            `;
            tactic.innerText = "Mükemmeliyetçilik kaçış doğurur. Yarın 'çirkin ama bitmiş' işler üretmeye odaklan.";
        } else {
            // General high-focus day (success plan)
            routineHTML = `
                <div class="routine-item routine-type-work">
                    <div class="routine-time">09:00 - 10:30</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Derin Odaklanma Bloğu I (90 Dk)</div>
                        <div class="routine-desc">Zihnin en açık olduğu bu zaman diliminde en kritik projeye odaklan.</div>
                    </div>
                </div>
                <div class="routine-item routine-type-break">
                    <div class="routine-time">10:30 - 10:50</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Aktif Dinlenme Mola</div>
                        <div class="routine-desc">Çay, kahve ve esneme. Ekran yok.</div>
                    </div>
                </div>
                <div class="routine-item routine-type-work">
                    <div class="routine-time">10:50 - 12:20</div>
                    <div class="routine-dot"></div>
                    <div class="routine-body">
                        <div class="routine-title">Derin Odaklanma Bloğu II (90 Dk)</div>
                        <div class="routine-desc">İkinci kritik iş bloğu. Telefon sessiz/uzak modda kalmaya devam etsin.</div>
                    </div>
                </div>
            `;
            actionsHTML = `
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Bugünkü yüksek odak ivmesini korumak için sabah rutinini aynen tekrar et.</span>
                </label>
                <label class="custom-checkbox">
                    <input type="checkbox">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">Akşam uyku saatini geciktirmeyerek enerjini koru.</span>
                </label>
            `;
            tactic.innerText = "İvme kazanıldı. Liminal sınırını koru ve yarın bugünün üzerine küçük bir başarı daha ekle.";
        }
    }
    
    list.innerHTML = routineHTML;
    actions.innerHTML = actionsHTML;
}

// --- Utils ---
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function formatSecondsToMinutes(secs) {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.round((secs % 3600) / 60);
    
    if (hrs > 0) {
        return `${hrs} sa ${mins} dk`;
    }
    return `${mins} dk`;
}

function setupActivityWatchSync() {
    const syncBtn = document.getElementById("sync-aw-btn");
    const statusDiv = document.getElementById("aw-sync-status");
    if (!syncBtn) return;
    
    const API_BASE = 'http://localhost:5600';
    
    syncBtn.addEventListener("click", async () => {
        statusDiv.style.color = "var(--text-secondary)";
        statusDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ActivityWatch bağlanılıyor...';
        
        try {
            // 1. Fetch buckets to check if server is running (adding trailing slash prevents redirect CORS fail)
            const bucketsRes = await fetch(`${API_BASE}/api/0/buckets/`);
            if (!bucketsRes.ok) throw new Error("ActivityWatch sunucusundan hatalı yanıt alındı.");
            const buckets = await bucketsRes.json();
            
            // Find window bucket
            let windowBucketId = null;
            for (let id in buckets) {
                if (id.startsWith("aw-watcher-window_")) {
                    windowBucketId = id;
                    break;
                }
            }
            
            if (!windowBucketId) {
                statusDiv.style.color = "var(--color-danger)";
                statusDiv.innerText = "Hata: Pencere izleme (aw-watcher-window) bucket'ı bulunamadı.";
                return;
            }
            
            statusDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Veriler analiz ediliyor...';
            
            // 2. Query data for the selected date
            const localStart = new Date(state.selectedDate + "T00:00:00");
            const localEnd = new Date(state.selectedDate + "T23:59:59");
            
            const timeperiod = `${localStart.toISOString()}/${localEnd.toISOString()}`;
            
            const queryPayload = {
                timeperiods: [timeperiod],
                query: [
                    "afk_events = query_bucket(find_bucket('aw-watcher-afk_'));",
                    "window_events = query_bucket(find_bucket('aw-watcher-window_'));",
                    "active_events = filter_period_intersect(window_events, filter_keyvals(afk_events, 'status', ['not-afk']));",
                    "RETURN = active_events;"
                ]
            };
            
            const queryRes = await fetch(`${API_BASE}/api/0/query/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(queryPayload)
            });
            
            if (!queryRes.ok) throw new Error("Sorgu gönderilemedi.");
            const queryResults = await queryRes.json();
            
            const events = queryResults[0] || [];
            if (events.length === 0) {
                statusDiv.style.color = "var(--color-warning)";
                statusDiv.innerText = "Seçili gün için aktif bilgisayar kaydı bulunamadı.";
                return;
            }
            
            // 3. Process raw events
            const processedActivities = processAWEvents(events);
            
            if (processedActivities.length === 0) {
                statusDiv.style.color = "var(--color-warning)";
                statusDiv.innerText = "Filtreleme kriterlerine uyan anlamlı bir çalışma/sapma süresi bulunamadı.";
                return;
            }
            
            // 4. Overwrite today's activities with the synced ones
            if (confirm(`ActivityWatch'tan ${processedActivities.length} adet anlamlı aktivite bloğu tespit edildi. Mevcut bugünkü aktivitelerin üzerine yazılsın mı?`)) {
                const data = getCurrentDayData();
                data.activities = processedActivities;
                checkAndIncrementRecovery();
                saveState();
                calculateDayMetrics();
                renderAll();
                
                statusDiv.style.color = "var(--color-success)";
                statusDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> Eşitleme başarılı: ${processedActivities.length} blok eklendi.`;
            } else {
                statusDiv.style.color = "var(--text-secondary)";
                statusDiv.innerText = "Eşitleme iptal edildi.";
            }
            
        } catch (err) {
            console.error(err);
            statusDiv.style.color = "var(--color-danger)";
            statusDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Bağlantı hatası: ActivityWatch çalışıyor mu?';
        }
    });
}

function processAWEvents(events) {
    const sortedEvents = events
        .map(e => ({
            start: new Date(e.timestamp),
            end: new Date(new Date(e.timestamp).getTime() + e.duration * 1000),
            duration: e.duration,
            app: (e.data.app || "").toLowerCase(),
            title: (e.data.title || "").toLowerCase()
        }))
        .sort((a, b) => a.start - b.start);
        
    const focusKeywords = [
        "code", "vs code", "visual studio", "cursor", "intellij", "pycharm", "eclipse", "sublime", "notepad", "xcode", 
        "android studio", "figma", "photoshop", "illustrator", "blender", "github", "gitlab", "stackoverflow", 
        "medium.com", "notion", "terminal", "cmd", "powershell", "bash", "iterm", "doc", "developer", "documentation",
        "chatgpt", "claude", "gemini", "copilot", "antigravity", "msedge", "chrome", "firefox", "browser", "arc", "safari", "opera"
    ];
    
    const driftKeywords = [
        "steam", "epic games", "league of legends", "spotify", "netflix", "disney+", "vlc", "youtube", "tiktok", 
        "instagram", "facebook", "twitter", "x.com", "reddit", "twitch", "whatsapp", "telegram", "game", "oyun",
        "dizi", "film", "movie", "series", "season", "episode", "bölüm", "izle", "anime", "prime video", "blutv", "puhutv", "exxen", "watch"
    ];
    
    const classifiedEvents = sortedEvents.map(e => {
        let type = 'break'; 
        let reason = null;
        let title = e.app;
        
        const matchesFocus = focusKeywords.some(kw => e.app.includes(kw) || e.title.includes(kw));
        const matchesDrift = driftKeywords.some(kw => e.app.includes(kw) || e.title.includes(kw));
        
        if (matchesDrift) {
            type = 'drift';
            if (e.app.includes("youtube") || e.title.includes("youtube")) {
                reason = "Bir bakayım hissi";
                title = "YouTube";
            } else if (e.app.includes("instagram") || e.title.includes("instagram")) {
                reason = "Reels";
                title = "Instagram";
            } else if (e.app.includes("tiktok") || e.title.includes("tiktok")) {
                reason = "Reels";
                title = "TikTok";
            } else if (e.app.includes("whatsapp") || e.app.includes("telegram")) {
                reason = "Diğer";
                title = "Mesajlaşma";
            } else if (e.app.includes("game") || e.title.includes("game") || e.app.includes("steam")) {
                reason = "Sıkılma";
                title = "Oyun";
            } else if (
                e.title.includes("dizi") || e.title.includes("film") || 
                e.title.includes("movie") || e.title.includes("series") || 
                e.title.includes("season") || e.title.includes("episode") || 
                e.title.includes("bölüm") || e.title.includes("izle") || 
                e.title.includes("anime") || e.title.includes("netflix") || 
                e.title.includes("prime video") || e.title.includes("blutv") || 
                e.title.includes("puhutv") || e.title.includes("exxen")
            ) {
                reason = "Eğlence";
                title = "Dizi / Film İzleme";
            } else {
                reason = "Bir bakayım hissi";
                title = `Sosyal Medya / Eğlence (${e.app})`;
            }
        } else if (matchesFocus) {
            type = 'focus';
            title = e.app === "chrome" || e.app === "firefox" || e.app === "msedge" ? "Araştırma (Web)" : `Çalışma (${e.app})`;
        } else {
            type = 'break';
            title = `Mola (${e.app})`;
        }
        
        return {
            type,
            title,
            start: e.start,
            end: e.end,
            duration: e.duration,
            reason
        };
    });
    
    let filtered = classifiedEvents.filter(e => e.duration >= 15);
    if (filtered.length === 0) return [];
    
    // Yumuşatma (Smoothing / Jitter Reduction) Algoritması:
    // Çalışma seansları arasındaki çok kısa molaları veya mola seansları arasındaki çok kısa çalışma seanslarını eler.
    for (let i = 1; i < filtered.length - 1; i++) {
        const prev = filtered[i - 1];
        const curr = filtered[i];
        const next = filtered[i + 1];
        
        // 1. Durum: Focus -> Break/Drift (<= 2 dk) -> Focus
        if (curr.type !== 'focus' && prev.type === 'focus' && next.type === 'focus') {
            if (curr.duration <= 120) { // 2 dakikadan kısa süren geçici kopmalar
                const gapPrev = (curr.start - prev.end) / (1000 * 60);
                const gapNext = (next.start - curr.end) / (1000 * 60);
                if (gapPrev <= 3 && gapNext <= 3) {
                    curr.type = 'focus';
                    curr.title = prev.title;
                }
            }
        }
        // 2. Durum: Break -> Focus (<= 1 dk) -> Break
        else if (curr.type === 'focus' && prev.type === 'break' && next.type === 'break') {
            if (curr.duration <= 60) { // 1 dakikadan kısa süren geçici odaklanmalar
                const gapPrev = (curr.start - prev.end) / (1000 * 60);
                const gapNext = (next.start - curr.end) / (1000 * 60);
                if (gapPrev <= 3 && gapNext <= 3) {
                    curr.type = 'break';
                    curr.title = prev.title;
                }
            }
        }
    }
    
    const merged = [];
    let currentBlock = Object.assign({}, filtered[0]);
    
    for (let i = 1; i < filtered.length; i++) {
        const next = filtered[i];
        const gapMs = next.start - currentBlock.end;
        const gapMin = gapMs / (1000 * 60);
        
        if (next.type === currentBlock.type && gapMin <= 5) {
            currentBlock.end = next.end;
            currentBlock.duration = (currentBlock.end - currentBlock.start) / 1000;
            if (!currentBlock.title.includes(next.title)) {
                if (currentBlock.type === 'focus') currentBlock.title = "Derin Çalışma";
                else if (currentBlock.type === 'drift') currentBlock.title = "Sosyal Medya / Eğlence";
                else if (currentBlock.type === 'break') currentBlock.title = "Mola / Dinlenme";
            }
        } else {
            if (currentBlock.duration >= 30) {
                merged.push(currentBlock);
            }
            currentBlock = Object.assign({}, next);
        }
    }
    if (currentBlock.duration >= 30) {
        merged.push(currentBlock);
    }
    
    return merged.map(block => {
        const startStr = `${String(block.start.getHours()).padStart(2, '0')}:${String(block.start.getMinutes()).padStart(2, '0')}`;
        const endStr = `${String(block.end.getHours()).padStart(2, '0')}:${String(block.end.getMinutes()).padStart(2, '0')}`;
        return {
            id: '_' + Math.random().toString(36).substr(2, 9),
            type: block.type,
            title: block.title,
            start: startStr,
            end: endStr,
            duration: Math.round(block.duration),
            reason: block.reason
        };
    });
}

function setupGeminiAI() {
    const apiInput = document.getElementById("gemini-api-key");
    const btnSave = document.getElementById("btn-save-api-key");
    const btnClear = document.getElementById("btn-clear-api-key");
    const btnToggle = document.getElementById("btn-toggle-settings");
    const btnTrigger = document.getElementById("btn-trigger-ai");
    const settingsPanel = document.getElementById("ai-settings-panel");
    
    if (!btnTrigger) return;
    
    // Load existing key
    const savedKey = localStorage.getItem("liminal_gemini_key");
    if (savedKey) {
        apiInput.value = savedKey;
    }
    
    // Settings panel toggler
    btnToggle.addEventListener("click", () => {
        const isHidden = settingsPanel.style.display === "none" || settingsPanel.style.display === "";
        settingsPanel.style.display = isHidden ? "block" : "none";
    });
    
    // Save key
    btnSave.addEventListener("click", () => {
        const val = apiInput.value.trim();
        if (!val) {
            alert("Lütfen geçerli bir API Anahtarı girin.");
            return;
        }
        localStorage.setItem("liminal_gemini_key", val);
        alert("Gemini API Anahtarı başarıyla kaydedildi.");
        settingsPanel.style.display = "none";
    });
    
    // Clear key
    btnClear.addEventListener("click", () => {
        localStorage.removeItem("liminal_gemini_key");
        apiInput.value = "";
        alert("API Anahtarı silindi.");
        settingsPanel.style.display = "none";
    });
    
    // AI Trigger Action
    btnTrigger.addEventListener("click", async () => {
        const key = localStorage.getItem("liminal_gemini_key");
        if (!key) {
            alert("Lütfen önce Yapay Zeka Ayarları panelinden Gemini API anahtarınızı girin.");
            settingsPanel.style.display = "block";
            apiInput.focus();
            return;
        }
        
        await runAICoachAnalysis(key);
    });
    
    // Backup & Restore
    const btnExport = document.getElementById("btn-export-data");
    const btnImportTrigger = document.getElementById("btn-import-trigger");
    const fileInput = document.getElementById("import-file-input");
    
    if (btnExport) {
        btnExport.addEventListener("click", exportData);
    }
    if (btnImportTrigger) {
        btnImportTrigger.addEventListener("click", () => fileInput.click());
    }
    if (fileInput) {
        fileInput.addEventListener("change", importData);
    }
}

async function runAICoachAnalysis(apiKey) {
    const title = document.getElementById("coach-title");
    const commentary = document.getElementById("coach-commentary");
    const data = getCurrentDayData();
    
    if (data.activities.length === 0) {
        alert("AI Analizi yapmak için bugüne ait en az bir aktivite bulunmalıdır.");
        return;
    }
    
    // UI Loading state
    title.innerText = "Liminal AI Analiz Ediyor...";
    commentary.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lütfen bekleyin, verileriniz Google Gemini AI ile analiz ediliyor ve yarın planınız oluşturuluyor...';
    
    try {
        // Collect past 2 days summaries to give context if they exist
        let contextDays = [];
        const dateKeys = Object.keys(state.history).sort().filter(k => k < state.selectedDate);
        const lastTwoKeys = dateKeys.slice(-2);
        
        lastTwoKeys.forEach(k => {
            const dayData = state.history[k];
            contextDays.push({
                date: k,
                focusTime: formatSecondsToMinutes(dayData.focusTime),
                driftTime: formatSecondsToMinutes(dayData.driftTime),
                recoveryCount: dayData.recoveryCount,
                controlScore: dayData.controlScore,
                dominantReason: getDominantDriftReason(dayData.activities)
            });
        });

        const prompt = `
Sen "Liminal.ai" uygulaması için çalışan, dürüst, gerçekçi ve yapıcı bir "Davranış Analiz Koçu"sun. Yalan söylemezsin, kişiyi suçlu hissettirmezsin ama kaçış davranışlarını net bir dille yüzüne vurursun.

GÜN VERİLERİ:
Tarih: ${state.selectedDate}
Uyanış Saati: ${data.wakeTime}
Uyku Süresi: ${data.sleepHours} saat
Enerji Seviyesi: ${data.energyLevel}/10
Duygu Durumu: ${data.mood}

METRİKLER:
Toplam Focus (Odak) Süresi: ${formatSecondsToMinutes(data.focusTime)}
Toplam Drift (Sapma) Süresi: ${formatSecondsToMinutes(data.driftTime)}
Geri Dönüş (Recovery) Sayısı: ${data.recoveryCount}
Günün Kontrol Skoru: ${data.controlScore || 0}/100

AKTİVİTE AKIŞI:
${JSON.stringify(data.activities)}

GEÇMİŞ GÜNLER BİLGİSİ:
${JSON.stringify(contextDays)}

Senden iki şey bekliyorum:
1. Bu günün analiz yorumunu yaz (Sert ama yapıcı, kaçış sebeplerini inceleyen ve recovery çabasını takdir eden veya eleştiren tonda).
2. Yarın için kişiye özel önerilen bir zaman çizelgesi (Plan) ve kritik yapılacaklar listesi (Aksiyonlar) oluştur.

Yanıtını kesinlikle aşağıdaki JSON formatında döndürmelisin (yanıtında JSON haricinde hiçbir metin, markdown kod bloğu işaretçisi veya açıklama olmamalıdır):
{
  "coachTitle": "Günün Analiz Başlığı",
  "coachCommentary": "Analiz yorumun...",
  "tomorrowRoutine": [
    { "time": "09:00 - 09:45", "type": "work", "title": "Aktivite Başlığı", "desc": "Aktivite Açıklaması" }
  ],
  "tomorrowActions": [
    "Kritik aksiyon maddesi 1",
    "Kritik aksiyon maddesi 2",
    "Kritik aksiyon maddesi 3"
  ],
  "tomorrowTactic": "Rayına oturma taktiği özeti..."
}
`;

        const models = [
            'gemini-2.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-flash-latest'
        ];
        
        let response = null;
        let lastError = null;
        let activeModel = '';

        for (const model of models) {
            try {
                console.log(`Trying Gemini model: ${model}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                };
                
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    response = res;
                    activeModel = model;
                    break;
                } else {
                    const errorText = await res.text().catch(() => '');
                    console.warn(`Model ${model} failed with status ${res.status}: ${errorText}`);
                    lastError = new Error(`Model ${model} returned status ${res.status}`);
                }
            } catch (err) {
                console.warn(`Error connecting to model ${model}:`, err);
                lastError = err;
            }
        }
        
        if (!response) {
            throw lastError || new Error("Hiçbir Gemini modeli yanıt vermedi.");
        }
        
        console.log(`Successfully completed analysis using model: ${activeModel}`);
        const result = await response.json();
        
        const rawText = result.candidates[0].content.parts[0].text;
        
        // Parse JSON
        let cleanText = rawText.trim();
        if (cleanText.startsWith("```json")) {
            cleanText = cleanText.substring(7);
        } else if (cleanText.startsWith("```")) {
            cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith("```")) {
            cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();
        
        const parsed = JSON.parse(cleanText);
        
        // Save to state
        data.aiCoach = {
            title: parsed.coachTitle,
            commentary: parsed.coachCommentary
        };
        
        data.aiPlan = {
            routine: parsed.tomorrowRoutine,
            actions: parsed.tomorrowActions,
            tactic: parsed.tomorrowTactic
        };
        
        saveState();
        renderAll();
        
    } catch (err) {
        console.error(err);
        title.innerText = "Bağlantı Hatası";
        commentary.innerText = "Yapay zeka analiz isteği başarısız oldu. Lütfen API anahtarınızı kontrol edin ve internet bağlantınızdan emin olun.";
    }
}

function getDominantDriftReason(activities) {
    let reasons = {};
    activities.forEach(a => {
        if (a.type === 'drift' && a.reason) {
            reasons[a.reason] = (reasons[a.reason] || 0) + a.duration;
        }
    });
    
    let dominantReason = null;
    let maxDuration = 0;
    for (let r in reasons) {
        if (reasons[r] > maxDuration) {
            maxDuration = reasons[r];
            dominantReason = r;
        }
    }
    return dominantReason;
}

// --- AI Future Simulator ---
function setupSimulator() {
    const scenarioCards = document.querySelectorAll(".scenario-card");
    const runSimBtn = document.getElementById("run-sim-btn");
    
    if (!runSimBtn) return;
    
    scenarioCards.forEach(card => {
        card.addEventListener("click", () => {
            scenarioCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
        });
    });
    
    runSimBtn.addEventListener("click", runFutureSimulation);
}

async function runFutureSimulation() {
    const runSimBtn = document.getElementById("run-sim-btn");
    const idleState = document.getElementById("sim-idle-state");
    const loadingState = document.getElementById("sim-loading-state");
    const resultsState = document.getElementById("sim-results-state");
    const loadingTextEl = document.getElementById("sim-loading-text");
    
    const timelineSelect = document.getElementById("sim-timeline");
    const activeScenarioCard = document.querySelector(".scenario-card.active");
    const customGoalsInput = document.getElementById("sim-custom-goals");
    
    if (!runSimBtn || !idleState || !loadingState || !resultsState) return;
    
    // Check API key
    const apiKey = localStorage.getItem("liminal_gemini_key");
    if (!apiKey) {
        alert("Lütfen önce Gün Sonu Analizi sayfasındaki Ayarlar (⚙️) menüsünden geçerli bir Gemini API anahtarı kaydedin.");
        const analysisTab = document.querySelector('.nav-item[data-page="page-analysis"]');
        if (analysisTab) analysisTab.click();
        return;
    }
    
    const timeline = timelineSelect ? timelineSelect.value : "30_days";
    const scenario = activeScenarioCard ? activeScenarioCard.getAttribute("data-scenario") : "maintain";
    const customGoals = customGoalsInput ? customGoalsInput.value.trim() : "";
    
    // Gather today's data
    const data = getCurrentDayData();
    const focusTime = Math.round((data.focusTime || 0) / 60);
    const driftTime = Math.round((data.driftTime || 0) / 60);
    const recoveryCount = data.recoveryCount || 0;
    const controlScore = data.controlScore || 0;
    
    // Show loading state
    idleState.style.display = "none";
    resultsState.style.display = "none";
    loadingState.style.display = "flex";
    
    // Animate loading text
    const loadingTexts = [
        "Bugünkü davranış eğrileriniz yapay zeka ile simüle ediliyor...",
        "Erteleme (Drift) kalıplarınızın zaman boyutundaki etkileri hesaplanıyor...",
        "Haftalık ve aylık disiplin dengesi çıkarılıyor...",
        "Geleceğe ait yaşam simülasyonu hikayesi yazılıyor..."
    ];
    let textIdx = 0;
    if (loadingTextEl) loadingTextEl.innerText = loadingTexts[0];
    const textInterval = setInterval(() => {
        textIdx++;
        if (loadingTextEl) {
            loadingTextEl.innerText = loadingTexts[textIdx % loadingTexts.length];
        }
    }, 2000);
    
    try {
        const timelineText = {
            '7_days': '7 Gün (Haftalık / Çok Kısa Vade)',
            '30_days': '30 Gün (Kısa Vade)',
            '90_days': '90 Gün (Orta Vade)',
            '1_year': '1 Yıl (Uzun Vade)'
        }[timeline];
        
        const scenarioText = {
            'maintain': 'Mevcut Durumun Devamı: Bugünkü odaklanma ve sapma davranışı aynen sürdürülürse.',
            'adhere': 'Yarın Planına %100 Uyum: AI Koçunun önerdiği disiplinli plan ve rutinler her gün eksiksiz uygulanırsa.',
            'worsen': 'Sapma Kısır Döngüsü: Dikkat dağınıklığı, erteleme ve kaçış davranışları artarak devam ederse ve disiplin tamamen kaybolursa.'
        }[scenario];
        
        const prompt = `
Aşağıdaki verilere göre bir insanın gelecekteki davranışsal, zihinsel ve profesyonel durumunu simüle et.
Tonun: Liminal.ai koçu gibi "Sert, yapıcı, gerçekçi, fütüristik ama bilimsel".

Kullanıcının Bugünkü Verileri:
- Odaklanılan Süre (Focus Time): ${focusTime} dakika
- Sapma/Kaçış Süresi (Drift Time): ${driftTime} dakika
- Geri Dönüş Sayısı (Recovery Count): ${recoveryCount}
- Özdisiplin Skoru (Control Score): ${controlScore}/100
- Enerji Seviyesi: ${data.energyLevel || 5}/10
- Ruh Hali: ${data.mood || 'Belirtilmedi'}

Simülasyon Ayarları:
- Projeksiyon Süresi: ${timelineText}
- Davranış Modeli/Senaryo: ${scenarioText}
- Kullanıcının Hedefi/Özel Notu: ${customGoals || 'Belirtilmedi'}

Yanıtını YALNIZCA aşağıdaki yapıda geçerli bir JSON objesi olarak döndür. Markdown kod bloğu ("\`\`\`json" ve "\`\`\`") içine alarak döndür:
{
  "futureStory": "Seçilen süre sonunda kullanıcının hayatından çarpıcı, detaylı, gerçekçi bir günün anlatımı. Fütüristik veya günlük dille yazılabilir. Türkçe olmalıdır.",
  "careerProgress": 0 ile 100 arasında tahmini kariyer ve hedef ilerleme yüzdesi (sayı),
  "burnoutRisk": 0 ile 100 arasında tahmini tükenmişlik riski yüzdesi (sayı),
  "focusLevel": 0 ile 100 arasında tahmini odaklanma ve özdisiplin seviyesi (sayı),
  "projectionData": [
    // Simülasyon boyunca odak ve sapma eğrileri için 5 veri noktası (zaman serisi).
    // Gün değerleri seçilen timeline'a uygun olmalı (Örn: 7 gün için 1, 2, 4, 6, 7; 30 gün için 5, 10, 15, 20, 30; 90 gün için 15, 30, 45, 60, 90; 1 yıl için 30, 90, 180, 270, 360).
    {"day": 5, "focus": 60, "drift": 40},
    ...
  ]
}
`;

        const models = [
            'gemini-2.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-flash-latest'
        ];
        
        let response = null;
        let lastError = null;
        let activeModel = '';

        for (const model of models) {
            try {
                console.log(`Trying Gemini model for simulation: ${model}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                };
                
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    response = res;
                    activeModel = model;
                    break;
                } else {
                    const errorText = await res.text().catch(() => '');
                    console.warn(`Simulation model ${model} failed: ${res.status} ${errorText}`);
                    lastError = new Error(`Model ${model} returned status ${res.status}`);
                }
            } catch (err) {
                console.warn(`Simulation error on model ${model}:`, err);
                lastError = err;
            }
        }
        
        if (!response) {
            throw lastError || new Error("Hiçbir Gemini modeli yanıt vermedi.");
        }
        
        const result = await response.json();
        const rawText = result.candidates[0].content.parts[0].text;
        
        let cleanText = rawText.trim();
        if (cleanText.startsWith("```json")) {
            cleanText = cleanText.substring(7);
        } else if (cleanText.startsWith("```")) {
            cleanText = cleanText.substring(3);
        }
        if (cleanText.endsWith("```")) {
            cleanText = cleanText.substring(0, cleanText.length - 3);
        }
        cleanText = cleanText.trim();
        
        const parsed = JSON.parse(cleanText);
        
        // Render results
        document.getElementById("gauge-career").innerText = `${parsed.careerProgress}%`;
        document.getElementById("gauge-burnout").innerText = `${parsed.burnoutRisk}%`;
        document.getElementById("gauge-focus").innerText = `${parsed.focusLevel}%`;
        document.getElementById("sim-story-text").innerText = parsed.futureStory;
        
        // Draw chart
        renderProjectionChart(parsed.projectionData || []);
        
        // Switch view states
        loadingState.style.display = "none";
        resultsState.style.display = "flex";
        
    } catch (err) {
        console.error(err);
        alert("Simülasyon gerçekleştirilirken bir hata oluştu: " + err.message);
        loadingState.style.display = "none";
        idleState.style.display = "flex";
    } finally {
        clearInterval(textInterval);
    }
}

function renderProjectionChart(data) {
    const container = document.getElementById("sim-chart-container");
    if (!container) return;
    
    const width = 400;
    const height = 120;
    
    if (data.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding-top:2rem; font-size:0.8rem; color:var(--text-muted);">Grafik verisi yüklenemedi.</div>`;
        return;
    }
    
    const maxDay = data[data.length - 1].day;
    const minDay = data[0].day;
    
    const padX = 35;
    const padY = 15;
    
    const getX = (day) => {
        if (maxDay === minDay) return padX;
        return padX + ((day - minDay) / (maxDay - minDay)) * (width - 2 * padX);
    };
    
    const getY = (val) => {
        return height - padY - (val / 100) * (height - 2 * padY);
    };
    
    let focusPoints = data.map(d => `${getX(d.day)},${getY(d.focus)}`).join(" ");
    let driftPoints = data.map(d => `${getX(d.day)},${getY(d.drift)}`).join(" ");
    
    let svgContent = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
            <!-- Grid lines -->
            <line x1="${padX}" y1="${getY(50)}" x2="${width - padX}" y2="${getY(50)}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
            <line x1="${padX}" y1="${getY(100)}" x2="${width - padX}" y2="${getY(100)}" stroke="rgba(255,255,255,0.04)" />
            <line x1="${padX}" y1="${getY(0)}" x2="${width - padX}" y2="${getY(0)}" stroke="rgba(255,255,255,0.08)" />
            
            <!-- Focus Line (Green) -->
            <polyline points="${focusPoints}" fill="none" stroke="var(--color-focus)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            
            <!-- Drift Line (Orange) -->
            <polyline points="${driftPoints}" fill="none" stroke="var(--color-drift)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    `;
    
    data.forEach((d) => {
        const x = getX(d.day);
        const yF = getY(d.focus);
        const yD = getY(d.drift);
        
        svgContent += `
            <circle cx="${x}" cy="${yF}" r="3.5" fill="var(--color-focus)" stroke="#121824" stroke-width="1" />
            <circle cx="${x}" cy="${yD}" r="3.5" fill="var(--color-drift)" stroke="#121824" stroke-width="1" />
            <text x="${x}" y="${height - 2}" font-size="8" fill="var(--text-secondary)" text-anchor="middle">g.${d.day}</text>
        `;
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

// --- AI Weekly Analysis Page Logic ---
function setupWeeklyAnalysis() {
    const runWeeklyAIBtn = document.getElementById("run-weekly-ai-btn");
    if (runWeeklyAIBtn) {
        runWeeklyAIBtn.addEventListener("click", runWeeklyAIAnalysis);
    }
}

function renderWeeklyAnalysis() {
    const weeklyDays = getWeeklyData();
    const stats = calculateWeeklyStats(weeklyDays);
    
    // Update summary cards
    document.getElementById("week-avg-focus").innerText = `${stats.avgFocus} dk`;
    document.getElementById("week-avg-drift").innerText = `${stats.avgDrift} dk`;
    document.getElementById("week-total-recovery").innerText = stats.totalRecovery;
    document.getElementById("week-avg-control").innerText = `${stats.avgControl}%`;
    
    // Draw weekly bar chart
    renderWeeklyTrendChart(weeklyDays);
    
    // Render mood correlations
    renderMoodCorrelation(weeklyDays);
    
    // Calculate risky hour
    const riskyHour = getRiskyHour(weeklyDays);
    const riskyHourTitle = document.getElementById("risky-hour-title");
    const riskyHourDesc = document.getElementById("risky-hour-desc");
    const patternTextEl = document.getElementById("week-pattern-text");
    
    let patternText = "";
    
    if (riskyHour !== null) {
        const hourEnd = (riskyHour + 1) % 24;
        riskyHourTitle.innerText = `${String(riskyHour).padStart(2, '0')}:00 - ${String(hourEnd).padStart(2, '0')}:00`;
        riskyHourDesc.innerText = "Hafta boyunca ertelemenin (Drift) en çok yoğunlaştığı saat dilimi.";
        patternText += `Sapma davranışlarınız en çok **${String(riskyHour).padStart(2, '0')}:00 - ${String(hourEnd).padStart(2, '0')}:00** saatleri arasında yoğunlaşıyor. Bu saat diliminde sosyal medya veya eğlence uygulamalarından uzak durmak için özel tedbirler alabilirsiniz. `;
    } else {
        riskyHourTitle.innerText = "Tespit Edilmedi";
        riskyHourDesc.innerText = "Son 7 günde kaydedilmiş sapma (Drift) verisi bulunmuyor.";
    }
    
    // Add custom insights based on mood correlation
    const correlations = getMoodCorrelationsArray(weeklyDays);
    if (correlations.length >= 1) {
        const bestMood = correlations[0];
        const worstMood = correlations[correlations.length - 1];
        patternText += `En yüksek çalışma odağını **${bestMood.mood}** (${bestMood.avgFocus} dk) ruh halindeyken yakalıyorsunuz. `;
        if (correlations.length >= 2 && worstMood.avgFocus < bestMood.avgFocus - 20) {
            patternText += `Buna karşın, **${worstMood.mood}** (${worstMood.avgFocus} dk) ruh halindeyken odaklanmakta zorlanıyorsunuz. `;
        }
    }
    
    // Add custom insights based on control score trend
    const scores = weeklyDays.map(d => d.data.controlScore).filter(s => s !== null && s !== undefined);
    if (scores.length >= 2) {
        const mid = Math.floor(scores.length / 2);
        const firstHalf = scores.slice(0, mid);
        const secondHalf = scores.slice(mid);
        const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (avg2 > avg1 + 5) {
            patternText += "Özdisiplin eğriniz bu hafta pozitif bir ivme gösteriyor. Geri kazanım (Recovery) başarınız arttıkça kontrol skorunuz yükselmektedir. Tebrikler!";
        } else if (avg2 < avg1 - 5) {
            patternText += "Haftanın ikinci yarısında odak kontrolünüzde bir zayıflama görülüyor. Sapma anlarında duruma daha hızlı müdahale etmeye (Recovery) çalışın.";
        } else {
            patternText += "Haftalık odak dengeniz stabil bir seviyede seyrediyor. Blok çalışma sürelerinizi korumaya devam edin.";
        }
    }
    
    if (patternText === "") {
        patternText = "Yeterli odak ve ruh hali verisi girildiğinde, davranış kalıplarınız ve özel koç analizleriniz burada listelenecektir.";
    }
    
    if (patternTextEl) {
        patternTextEl.innerHTML = patternText;
    }
}

function getWeeklyData() {
    const dates = getPast7Dates(state.selectedDate);
    const weeklyDays = [];
    dates.forEach(date => {
        const dayData = state.history[date] || {
            activities: [],
            focusTime: 0,
            driftTime: 0,
            recoveryCount: 0,
            controlScore: null,
            mood: ""
        };
        weeklyDays.push({
            date: date,
            data: dayData
        });
    });
    return weeklyDays;
}

function getPast7Dates(startDateStr) {
    const dates = [];
    const current = new Date(startDateStr + "T00:00:00");
    for (let i = 0; i < 7; i++) {
        const d = new Date(current);
        d.setDate(current.getDate() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
    }
    return dates.reverse();
}

function calculateWeeklyStats(weeklyDays) {
    let totalFocus = 0;
    let totalDrift = 0;
    let totalRecovery = 0;
    let controlScores = [];
    
    weeklyDays.forEach(item => {
        totalFocus += item.data.focusTime || 0;
        totalDrift += item.data.driftTime || 0;
        totalRecovery += item.data.recoveryCount || 0;
        if (item.data.controlScore !== null && item.data.controlScore !== undefined) {
            controlScores.push(item.data.controlScore);
        }
    });
    
    const avgFocus = Math.round(totalFocus / 7 / 60);
    const avgDrift = Math.round(totalDrift / 7 / 60);
    const avgControl = controlScores.length > 0 ? Math.round(controlScores.reduce((a, b) => a + b, 0) / controlScores.length) : 0;
    
    return {
        avgFocus,
        avgDrift,
        totalRecovery,
        avgControl
    };
}

function getRiskyHour(weeklyDays) {
    const hourlyDrift = Array(24).fill(0);
    let hasDrift = false;
    
    weeklyDays.forEach(item => {
        if (item.data.activities) {
            item.data.activities.forEach(act => {
                if (act.type === 'drift') {
                    hasDrift = true;
                    const hour = parseInt(act.start.split(":")[0], 10);
                    hourlyDrift[hour] += act.duration || 0;
                }
            });
        }
    });
    
    if (!hasDrift) return null;
    
    let maxHour = 0;
    let maxDur = 0;
    for (let h = 0; h < 24; h++) {
        if (hourlyDrift[h] > maxDur) {
            maxDur = hourlyDrift[h];
            maxHour = h;
        }
    }
    return maxHour;
}

function getMoodCorrelationsArray(weeklyDays) {
    const moodGroups = {};
    weeklyDays.forEach(item => {
        const mood = item.data.mood;
        if (!mood) return;
        if (!moodGroups[mood]) {
            moodGroups[mood] = { totalFocus: 0, count: 0 };
        }
        moodGroups[mood].totalFocus += Math.round((item.data.focusTime || 0) / 60);
        moodGroups[mood].count += 1;
    });
    
    const correlations = [];
    for (let mood in moodGroups) {
        correlations.push({
            mood: mood,
            avgFocus: Math.round(moodGroups[mood].totalFocus / moodGroups[mood].count)
        });
    }
    correlations.sort((a, b) => b.avgFocus - a.avgFocus);
    return correlations;
}

function renderMoodCorrelation(weeklyDays) {
    const listContainer = document.getElementById("mood-correlation-list");
    if (!listContainer) return;
    
    const correlations = getMoodCorrelationsArray(weeklyDays);
    
    if (correlations.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; font-size:0.8rem; color:var(--text-muted); padding:1rem;">Korelasyon için yeterli ruh hali verisi yok. Günlük girişlerinizde ruh halinizi seçmeyi unutmayın.</div>`;
        return;
    }
    
    const maxAvgFocus = Math.max(...correlations.map(c => c.avgFocus), 60);
    
    let html = "";
    correlations.forEach(c => {
        const percent = Math.min(100, Math.round((c.avgFocus / maxAvgFocus) * 100));
        const emoji = MOOD_EMOJIS[c.mood] || "▪️";
        
        html += `
            <div class="mood-correlation-item">
                <div class="mood-correlation-label">
                    <span>${emoji}</span>
                    <span>${c.mood}</span>
                </div>
                <div class="mood-correlation-bar-wrapper">
                    <div class="correlation-bar-container">
                        <div class="correlation-bar" style="width: ${percent}%;"></div>
                    </div>
                </div>
                <div class="mood-correlation-value">${c.avgFocus} dk</div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
}

function renderWeeklyTrendChart(weeklyDays) {
    const container = document.getElementById("week-chart-container");
    if (!container) return;
    
    const width = 400;
    const height = 180;
    
    let maxVal = 60;
    weeklyDays.forEach(item => {
        const f = Math.round((item.data.focusTime || 0) / 60);
        const d = Math.round((item.data.driftTime || 0) / 60);
        if (f > maxVal) maxVal = f;
        if (d > maxVal) maxVal = d;
    });
    
    const padX = 40;
    const padY = 25;
    const chartWidth = width - 2 * padX;
    const chartHeight = height - 2 * padY;
    const groupWidth = chartWidth / 7;
    
    const weekdays = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
    
    let svgContent = `
        <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow:visible;">
            <!-- Grid lines -->
            <line x1="${padX}" y1="${height - padY - chartHeight}" x2="${width - padX}" y2="${height - padY - chartHeight}" stroke="rgba(255,255,255,0.06)" />
            <line x1="${padX}" y1="${height - padY - chartHeight/2}" x2="${width - padX}" y2="${height - padY - chartHeight/2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
            <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="rgba(255,255,255,0.08)" />
            
            <!-- Grid Labels (Left Side) -->
            <text x="${padX - 8}" y="${height - padY + 3}" font-size="8" fill="var(--text-muted)" text-anchor="end">0</text>
            <text x="${padX - 8}" y="${height - padY - chartHeight/2 + 3}" font-size="8" fill="var(--text-muted)" text-anchor="end">${Math.round(maxVal/2)}d</text>
            <text x="${padX - 8}" y="${height - padY - chartHeight + 3}" font-size="8" fill="var(--text-muted)" text-anchor="end">${Math.round(maxVal)}d</text>
    `;
    
    weeklyDays.forEach((item, i) => {
        const focus = Math.round((item.data.focusTime || 0) / 60);
        const drift = Math.round((item.data.driftTime || 0) / 60);
        
        const focusHeight = (focus / maxVal) * chartHeight;
        const driftHeight = (drift / maxVal) * chartHeight;
        
        const xGroupStart = padX + i * groupWidth;
        const barWidth = 10;
        const xFocus = xGroupStart + (groupWidth - 2 * barWidth - 4) / 2;
        const xDrift = xFocus + barWidth + 4;
        
        const yFocus = height - padY - focusHeight;
        const yDrift = height - padY - driftHeight;
        
        const dateObj = new Date(item.date + "T00:00:00");
        const dayLabel = weekdays[dateObj.getDay()];
        
        svgContent += `
            <!-- Focus Bar (Green) -->
            <rect x="${xFocus}" y="${yFocus}" width="${barWidth}" height="${focusHeight}" rx="2" fill="var(--color-focus)" class="weekly-bar">
                <title>Focus: ${focus} dk</title>
            </rect>
            
            <!-- Drift Bar (Orange) -->
            <rect x="${xDrift}" y="${yDrift}" width="${barWidth}" height="${driftHeight}" rx="2" fill="var(--color-drift)" class="weekly-bar">
                <title>Drift: ${drift} dk</title>
            </rect>
            
            <!-- Day Label -->
            <text x="${xGroupStart + groupWidth/2}" y="${height - 8}" font-size="9" fill="var(--text-secondary)" text-anchor="middle">${dayLabel}</text>
        `;
    });
    
    svgContent += `</svg>`;
    container.innerHTML = svgContent;
}

async function runWeeklyAIAnalysis() {
    const idleEl = document.getElementById("weekly-ai-idle");
    const loadingEl = document.getElementById("weekly-ai-loading");
    const resultEl = document.getElementById("weekly-ai-result");
    const resultTextEl = document.getElementById("weekly-ai-text");
    
    if (!idleEl || !loadingEl || !resultEl || !resultTextEl) return;
    
    const apiKey = localStorage.getItem("liminal_gemini_key");
    if (!apiKey) {
        alert("Lütfen önce Gün Sonu Analizi sayfasındaki Ayarlar (⚙️) menüsünden geçerli bir Gemini API anahtarı kaydedin.");
        const analysisTab = document.querySelector('.nav-item[data-page="page-analysis"]');
        if (analysisTab) analysisTab.click();
        return;
    }
    
    idleEl.style.display = "none";
    resultEl.style.display = "none";
    loadingEl.style.display = "flex";
    
    try {
        const weeklyDays = getWeeklyData();
        const riskyHour = getRiskyHour(weeklyDays);
        let riskyHourText = "Sapma Tespit Edilmedi";
        if (riskyHour !== null) {
            riskyHourText = `${String(riskyHour).padStart(2, '0')}:00 - ${String((riskyHour + 1) % 24).padStart(2, '0')}:00`;
        }
        
        const historySummary = weeklyDays.map(item => {
            const fMin = Math.round((item.data.focusTime || 0) / 60);
            const dMin = Math.round((item.data.driftTime || 0) / 60);
            return `Tarih: ${item.date}, Odak: ${fMin} dk, Sapma: ${dMin} dk, Geri Kazanım: ${item.data.recoveryCount || 0}, Kontrol Skoru: ${item.data.controlScore || 'N/A'}/100, Ruh Hali: ${item.data.mood || 'N/A'}`;
        }).join("\n");
        
        const prompt = `
Aşağıdaki son 7 günlük kişisel gelişim ve zaman kullanım verilerini analiz et.
Tonun: Sert, yapıcı, gerçekçi, motivasyonel Liminal Koçu.

Son 7 Günlük Veriler:
${historySummary}

En Riskli Saat Dilimi: ${riskyHourText}

Kullanıcı için haftalık bir değerlendirme raporu hazırla. Raporda şunları içermelidir:
1. Haftanın Değerlendirmesi: Genel odaklanma ve disiplin performansı. Kaçış sıklığı ve geri kazanım başarısı.
2. Ruh Hali Analizi: Ruh halinin odaklanma üzerindeki etkisi.
3. Gelecek Hafta İçin 3 Aksiyon Planı: Rayına oturmak veya odağı artırmak için sonraki hafta uygulanacak somut, ölçülebilir aksiyonlar.

Lütfen yanıtını temiz, başlıkları belirgin, Türkçe bir markdown formatında döndür. HTML veya başka kod blokları kullanma.
`;

        const models = [
            'gemini-2.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-flash-latest'
        ];
        
        let response = null;
        let lastError = null;
        let activeModel = '';

        for (const model of models) {
            try {
                console.log(`Trying Gemini model for weekly review: ${model}`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const payload = {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                };
                
                const res = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    response = res;
                    activeModel = model;
                    break;
                } else {
                    const errorText = await res.text().catch(() => '');
                    console.warn(`Weekly review model ${model} failed: ${res.status} ${errorText}`);
                    lastError = new Error(`Model ${model} returned status ${res.status}`);
                }
            } catch (err) {
                console.warn(`Weekly review error on model ${model}:`, err);
                lastError = err;
            }
        }
        
        if (!response) {
            throw lastError || new Error("Hiçbir Gemini modeli yanıt vermedi.");
        }
        
        const result = await response.json();
        const rawText = result.candidates[0].content.parts[0].text;
        
        resultTextEl.innerText = rawText.trim();
        
        loadingEl.style.display = "none";
        resultEl.style.display = "block";
        
    } catch (err) {
        console.error(err);
        alert("Haftalık analiz gerçekleştirilirken bir hata oluştu: " + err.message);
        loadingEl.style.display = "none";
        idleEl.style.display = "flex";
    }
}

// --- Backup & Restore Logic ---
function exportData() {
    try {
        const backupData = {
            state: state,
            geminiKey: localStorage.getItem("liminal_gemini_key") || ""
        };
        
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const dateStr = getTodayString();
        a.href = url;
        a.download = `liminal-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Yedekleme hatası:", err);
        alert("Veriler dışa aktarılırken bir hata oluştu: " + err.message);
    }
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (!data.state) {
                throw new Error("Geçersiz yedek dosyası yapısı: 'state' alanı bulunamadı.");
            }
            
            const confirmImport = confirm("Bu işlem mevcut tüm verilerinizi ve API anahtarınızı yedek dosyasındaki verilerle değiştirecektir. Devam etmek istiyor musunuz?");
            if (confirmImport) {
                // Update local storage and in-memory state
                localStorage.setItem("liminal_state", JSON.stringify(data.state));
                if (data.geminiKey) {
                    localStorage.setItem("liminal_gemini_key", data.geminiKey);
                } else {
                    localStorage.removeItem("liminal_gemini_key");
                }
                
                alert("Verileriniz başarıyla geri yüklendi! Sayfa yenileniyor.");
                window.location.reload();
            }
        } catch (err) {
            console.error("Geri yükleme hatası:", err);
            alert("Veriler içe aktarılırken bir hata oluştu: " + err.message);
        }
    };
    reader.readAsText(file);
    // Reset file input value to allow selecting same file again
    e.target.value = '';
}

// --- Live Notifications Logic ---
function setupNotifications() {
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
}

function sendNotification(title, options) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, options);
        } catch (e) {
            console.error("Bildirim gönderimi başarısız:", e);
        }
    }
}

function checkLiveAlerts(elapsedMs) {
    // 15 minutes = 15 * 60 * 1000 ms
    const driftThresholdMs = 15 * 60 * 1000;
    
    if (elapsedMs >= driftThresholdMs && !driftNotified) {
        sendNotification("Sapma Tespit Edildi! ⚠️", {
            body: "15 dakikadır sapma modundasınız. Kendinize gelip odağa dönmek ister misiniz?",
            icon: "assets/logo.png"
        });
        driftNotified = true;
    }
}

function sendRecoveryNotification() {
    sendNotification("Harika Geri Kazanım! 🎯", {
        body: "Başarıyla odak moduna geri döndünüz. Sapmayı yendiniz ve recovery gerçekleştirdiniz!",
        icon: "assets/logo.png"
    });
    driftNotified = false;
}
