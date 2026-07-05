// Liminal.ai - UI and SVG Visual Components

const components = {
    // 1. 24-Hour Timeline SVG Renderer
    renderTimeline: function(activities, wakeTimeStr) {
        const container = document.getElementById("timeline-canvas-container");
        if (!container) return;

        // Configuration
        const width = 1440; // 1 minute = 1 pixel
        const height = 140;
        const trackY = 30;
        const trackHeight = 40;
        
        // Calculate Wake Time position in minutes
        let wakeMinutes = null;
        if (wakeTimeStr) {
            const [wH, wM] = wakeTimeStr.split(':').map(Number);
            wakeMinutes = wH * 60 + wM;
        }

        // SVG Skeleton
        let svgHTML = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:var(--bg-card); overflow:visible">`;
        
        // Define filters and gradients for glowing aesthetics
        svgHTML += `
            <defs>
                <filter id="glow-focus" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="hsl(162, 84%, 43%)" flood-opacity="0.4"/>
                </filter>
                <filter id="glow-drift" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="hsl(14, 95%, 53%)" flood-opacity="0.4"/>
                </filter>
                <filter id="glow-recovery" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
        `;

        // Draw background grid tracks (24 hours slots)
        svgHTML += `<rect x="0" y="${trackY}" width="${width}" height="${trackHeight}" fill="rgba(255,255,255,0.02)" rx="8" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`;
        
        // Draw Hourly vertical grid lines & text labels
        for (let h = 0; h <= 24; h++) {
            const x = h * 60;
            const isLabel = h % 2 === 0; // Show label every 2 hours
            
            // Draw grid lines
            svgHTML += `<line x1="${x}" y1="${trackY}" x2="${x}" y2="${trackY + trackHeight}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`;
            
            if (isLabel && h < 24) {
                const labelText = `${String(h).padStart(2, '0')}:00`;
                svgHTML += `<text x="${x}" y="${trackY + trackHeight + 22}" fill="var(--text-muted)" font-size="11" font-weight="500" text-anchor="middle">${labelText}</text>`;
            }
        }

        // Draw Wake Time indicator line
        if (wakeMinutes !== null) {
            svgHTML += `
                <line x1="${wakeMinutes}" y1="10" x2="${wakeMinutes}" y2="${trackY + trackHeight + 30}" stroke="var(--color-accent)" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.7"/>
                <text x="${wakeMinutes + 5}" y="20" fill="var(--color-accent)" font-size="10" font-weight="700">Uyanış (${wakeTimeStr})</text>
            `;
        }

        // Draw Activities blocks
        const recoveryPoints = []; // to store recovery markers
        let lastActivityType = null;
        
        // Sort activities by start time
        const sorted = [...activities].sort((a, b) => a.start.localeCompare(b.start));

        sorted.forEach((act) => {
            const [sH, sM] = act.start.split(':').map(Number);
            const [eH, eM] = act.end.split(':').map(Number);
            
            const startX = sH * 60 + sM;
            const endX = eH * 60 + eM;
            let blockWidth = endX - startX;
            
            // Handle edge case of overlapping or midnight wrapping
            if (blockWidth <= 0) blockWidth = 5; // minimum thickness for visibility
            
            let fill = 'rgba(255,255,255,0.1)';
            let filter = '';
            let label = act.title;
            
            if (act.type === 'focus') {
                fill = 'var(--color-focus)';
                filter = 'filter="url(#glow-focus)"';
                // Check if this Focus act immediately follows a Drift act
                if (lastActivityType === 'drift') {
                    recoveryPoints.push({ x: startX, time: act.start });
                }
            } else if (act.type === 'drift') {
                fill = 'var(--color-drift)';
                filter = 'filter="url(#glow-drift)"';
                label = `Drift: ${act.reason || act.title}`;
            } else if (act.type === 'break') {
                fill = 'var(--color-accent)';
            }
            
            // Render activity rect block
            svgHTML += `
                <g class="timeline-block">
                    <rect x="${startX}" y="${trackY + 2}" width="${blockWidth}" height="${trackHeight - 4}" fill="${fill}" rx="4" ${filter} opacity="0.85"/>
                    <!-- Hover tooltip -->
                    <title>${act.title} (${act.start} - ${act.end} | ${formatDuration(act.duration)})</title>
                </g>
            `;
            
            // Render text inside block if width is large enough
            if (blockWidth > 60) {
                const textX = startX + blockWidth / 2;
                const truncatedLabel = label.length > Math.floor(blockWidth / 8) ? label.substring(0, Math.floor(blockWidth / 8)) + '..' : label;
                svgHTML += `<text x="${textX}" y="${trackY + trackHeight/2 + 4}" fill="white" font-size="10" font-weight="600" text-anchor="middle" pointer-events="none">${truncatedLabel}</text>`;
            }
            
            lastActivityType = act.type;
        });

        // Draw Recovery Markers (Indigo/purple pulsing star/circle)
        recoveryPoints.forEach(pt => {
            svgHTML += `
                <g class="recovery-marker">
                    <circle cx="${pt.x}" cy="${trackY + trackHeight/2}" r="8" fill="var(--color-recovery)" stroke="white" stroke-width="1.5" filter="url(#glow-recovery)"/>
                    <circle cx="${pt.x}" cy="${trackY + trackHeight/2}" r="14" fill="transparent" stroke="var(--color-recovery)" stroke-width="1" opacity="0.6">
                        <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <title>Geri Kazanım (Recovery) - Saat: ${pt.time}</title>
                </g>
            `;
        });

        // Current time line indicator if viewing today
        const todayStr = new Date().toISOString().split('T')[0];
        const dateSelectorVal = document.getElementById("current-date").innerText;
        
        if (dateSelectorVal === "Bugün") {
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            svgHTML += `
                <line x1="${nowMinutes}" y1="${trackY - 5}" x2="${nowMinutes}" y2="${trackY + trackHeight + 5}" stroke="var(--color-danger)" stroke-width="2"/>
                <circle cx="${nowMinutes}" cy="${trackY - 5}" r="3" fill="var(--color-danger)"/>
            `;
        }

        svgHTML += `</svg>`;
        container.innerHTML = svgHTML;
    },

    // 2. Custom SVG Donut Chart Renderer
    renderDonutChart: function(focusSec, driftSec, breakSec) {
        const container = document.getElementById("donut-chart-container");
        if (!container) return;

        const total = focusSec + driftSec + breakSec;
        
        if (total === 0) {
            container.innerHTML = `
                <div style="text-align:center; color:var(--text-muted)">
                    <i class="fa-solid fa-chart-pie" style="font-size:2rem; margin-bottom:0.5rem"></i>
                    <p style="font-size:0.85rem">Dağılım grafiği için aktivite verisi girilmelidir.</p>
                </div>
            `;
            return;
        }

        const focusPercent = (focusSec / total) * 100;
        const driftPercent = (driftSec / total) * 100;
        const breakPercent = (breakSec / total) * 100;

        // Circle perimeter calculations
        const r = 50;
        const cx = 75;
        const cy = 75;
        const strokeWidth = 14;
        const perimeter = 2 * Math.PI * r; // ~314.16

        // Compute offsets
        const focusOffset = perimeter;
        const driftOffset = perimeter - (focusPercent / 100) * perimeter;
        const breakOffset = driftOffset - (driftPercent / 100) * perimeter;

        // Render clean inline SVG
        container.innerHTML = `
            <div style="display:flex; align-items:center; gap: 2.5rem">
                <!-- SVG Donut -->
                <svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
                    <!-- Base background circle -->
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" stroke="var(--border-color)" stroke-width="${strokeWidth}" />
                    
                    <!-- Mola/Break segment -->
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" 
                            stroke="var(--color-accent)" stroke-width="${strokeWidth}" 
                            stroke-dasharray="${perimeter}" stroke-dashoffset="${breakOffset}"
                            transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
                            
                    <!-- Drift segment -->
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" 
                            stroke="var(--color-drift)" stroke-width="${strokeWidth}" 
                            stroke-dasharray="${perimeter}" stroke-dashoffset="${driftOffset}"
                            transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
                            
                    <!-- Focus segment -->
                    <circle cx="${cx}" cy="${cy}" r="${r}" fill="transparent" 
                            stroke="var(--color-focus)" stroke-width="${strokeWidth}" 
                            stroke-dasharray="${perimeter}" stroke-dashoffset="0"
                            transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round" />
                </svg>
                
                <!-- Custom Legend with Percentage values -->
                <div style="display:flex; flex-direction:column; gap:0.6rem">
                    <div style="display:flex; align-items:center; gap:0.5rem">
                        <span class="activity-badge badge-focus"></span>
                        <div>
                            <span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary)">Focus:</span>
                            <strong style="font-size:0.9rem; color:var(--color-focus); font-family:'Outfit'">${Math.round(focusPercent)}%</strong>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem">
                        <span class="activity-badge badge-drift"></span>
                        <div>
                            <span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary)">Drift:</span>
                            <strong style="font-size:0.9rem; color:var(--color-drift); font-family:'Outfit'">${Math.round(driftPercent)}%</strong>
                        </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:0.5rem">
                        <span class="activity-badge badge-break"></span>
                        <div>
                            <span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary)">Mola:</span>
                            <strong style="font-size:0.9rem; color:var(--color-accent); font-family:'Outfit'">${Math.round(breakPercent)}%</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Internal helper to format seconds nicely
function formatDuration(secs) {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.round((secs % 3600) / 60);
    if (hrs > 0) return `${hrs} sa ${mins} dk`;
    return `${mins} dk`;
}
