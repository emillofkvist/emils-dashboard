// ============================================
// EMILS DASHBOARD
// ============================================

// Polyfill för Promise.any (saknas i webbläsare äldre än 2020)
if (typeof Promise.any !== 'function') {
    Promise.any = promises =>
        new Promise((resolve, reject) => {
            let errors = [];
            let pending = promises.length;
            if (!pending) reject(new AggregateError([], 'All promises were rejected'));
            promises.forEach(p =>
                Promise.resolve(p).then(resolve).catch(err => {
                    errors.push(err);
                    if (--pending === 0) reject(new AggregateError(errors, 'All promises were rejected'));
                })
            );
        });
}

// Uppdatera tid och datum
function updateDateTime() {
    const now = new Date();

    // Tid
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('time').textContent = `${hours}:${minutes}`;

    // Datum
    const weekdays = ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'];
    const months = ['januari', 'februari', 'mars', 'april', 'maj', 'juni',
                    'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

    const weekday = weekdays[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    document.getElementById('date').textContent = `${weekday} ${day} ${month} ${year}`;

    // Veckonummer
    const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - firstDayOfYear) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    document.getElementById('week').textContent = `Vecka ${weekNumber}`;
}

// Hämta dagens namnsdag
async function fetchNameday() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        const url = `https://sholiday.faboul.se/dagar/v2.1/${year}/${month}/${day}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.dagar && data.dagar[0] && data.dagar[0].namnsdag) {
            const names = data.dagar[0].namnsdag.join(', ');
            document.getElementById('nameday').textContent = `🎂 ${names}`;
        }
    } catch (error) {
        console.error('Namnsdagsfel:', error);
    }
}

// Hämta väder från SMHI
async function fetchWeather() {
    try {
        const { lat, lon } = CONFIG.weather;
        // Ny SMHI API (snow1g/v1) ersatte pmp3g/v2 den 31 mars 2026
        const url = `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/${lon}/lat/${lat}/data.json`;

        const response = await fetch(url);
        const data = await response.json();

        // Första timserien är aktuellt väder
        const current = data.timeSeries[0];
        const d = current.data;

        // Nya parameternamn i snow1g API
        const temp = Math.round(d.air_temperature);
        const wind = Math.round(d.wind_speed);
        const humidity = Math.round(d.relative_humidity);
        const symbol = d.symbol_code;

        // Min/max för dagens timmar (lokal tid)
        const todayDate = new Date().toLocaleDateString('sv-SE');
        const todayTemps = data.timeSeries
            .filter(ts => new Date(ts.validTime).toLocaleDateString('sv-SE') === todayDate)
            .map(ts => ts.data.air_temperature)
            .filter(t => t !== undefined);
        const tempMin = todayTemps.length ? Math.round(Math.min(...todayTemps)) : null;
        const tempMax = todayTemps.length ? Math.round(Math.max(...todayTemps)) : null;

        const weatherIcons = {
            1: '☀️', 2: '🌤️', 3: '⛅', 4: '🌥️', 5: '☁️', 6: '☁️',
            7: '🌫️', 8: '🌧️', 9: '🌧️', 10: '🌧️', 11: '⛈️',
            12: '🌨️', 13: '🌨️', 14: '🌨️', 15: '❄️', 16: '❄️',
            17: '❄️', 18: '🌧️', 19: '🌧️', 20: '🌧️', 21: '⛈️',
            22: '🌨️', 23: '🌨️', 24: '🌨️', 25: '❄️', 26: '❄️', 27: '❄️'
        };

        const weatherDescriptions = {
            1: 'Klart', 2: 'Lätt molnighet', 3: 'Halvklart', 4: 'Molnigt',
            5: 'Mulet', 6: 'Mulet', 7: 'Dimma', 8: 'Lätt regn',
            9: 'Regn', 10: 'Kraftigt regn', 11: 'Åskväder',
            12: 'Lätt snöblandat regn', 13: 'Snöblandat regn', 14: 'Kraftigt snöblandat regn',
            15: 'Lätt snöfall', 16: 'Snöfall', 17: 'Kraftigt snöfall',
            18: 'Lätt regnskur', 19: 'Regnskur', 20: 'Kraftig regnskur',
            21: 'Åskskur', 22: 'Lätt snöbyar', 23: 'Snöbyar', 24: 'Kraftiga snöbyar',
            25: 'Lätt snöfall', 26: 'Snöfall', 27: 'Kraftigt snöfall'
        };

        const icon = weatherIcons[symbol] || '🌡️';
        const description = weatherDescriptions[symbol] || '';

        document.getElementById('weather').innerHTML = `
            <div class="weather-main">
                <div class="weather-icon">${icon}</div>
                <div>
                    <div class="weather-temp">${temp}°C</div>
                    <div class="weather-desc">${description}</div>
                </div>
            </div>
            <div class="weather-details">
                <div class="weather-detail">Vind: <span>${wind} m/s</span></div>
                <div class="weather-detail">Luftfuktighet: <span>${humidity}%</span></div>
                ${tempMin !== null ? `<div class="weather-detail">Idag: <span>↓${tempMin}° ↑${tempMax}°</span></div>` : ''}
            </div>
            <div class="sun-info" id="sun-info">
                <div class="loading">Hämtar soltider...</div>
            </div>
        `;

        // Hämta soluppgång/solnedgång
        fetchSunTimes();
    } catch (error) {
        console.error('Väderfel:', error);
        document.getElementById('weather').innerHTML = '<div class="loading">Kunde inte hämta väder</div>';
    }
}

// Hämta soluppgång och solnedgång
async function fetchSunTimes() {
    try {
        const { lat, lon } = CONFIG.weather;
        const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
            const sunrise = new Date(data.results.sunrise);
            const sunset = new Date(data.results.sunset);

            const sunriseTime = sunrise.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
            const sunsetTime = sunset.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

            // Beräkna dagsljus
            const dayLengthMs = sunset - sunrise;
            const dayLengthHours = Math.floor(dayLengthMs / 3600000);
            const dayLengthMinutes = Math.floor((dayLengthMs % 3600000) / 60000);

            document.getElementById('sun-info').innerHTML = `
                <div class="sun-item">
                    <div class="sun-icon">🌅</div>
                    <div class="sun-time">${sunriseTime}</div>
                    <div class="sun-label">Soluppgång</div>
                </div>
                <div class="sun-item">
                    <div class="sun-icon">🌇</div>
                    <div class="sun-time">${sunsetTime}</div>
                    <div class="sun-label">Solnedgång</div>
                </div>
                <div class="sun-item">
                    <div class="sun-icon">☀️</div>
                    <div class="sun-time">${dayLengthHours}h ${dayLengthMinutes}m</div>
                    <div class="sun-label">Dagsljus</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Soltidsfel:', error);
        document.getElementById('sun-info').innerHTML = '';
    }
}

// Hämta elpris för SE4
let electricityChart = null;

async function fetchElectricity() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${day}_SE4.json`;
        const response = await fetch(url);
        const data = await response.json();

        // Hitta aktuellt pris – fungerar med kvartstaxor (96/dag) sedan okt 2025
        const currentPrice = data.find(p => {
            const start = new Date(p.time_start);
            const end   = new Date(p.time_end);
            return now >= start && now < end;
        });

        // Beräkna min, max och snitt för dagen
        const prices = data.map(p => p.SEK_per_kWh);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        // Nuvarande pris i öre/kWh
        const priceOre = currentPrice ? (currentPrice.SEK_per_kWh * 100).toFixed(1) : '--';
        const minOre = (minPrice * 100).toFixed(1);
        const maxOre = (maxPrice * 100).toFixed(1);
        const avgOre = (avgPrice * 100).toFixed(1);

        // Färgklass baserat på pris
        let priceClass = 'price-low';
        if (currentPrice && currentPrice.SEK_per_kWh > 1) {
            priceClass = 'price-high';
        } else if (currentPrice && currentPrice.SEK_per_kWh > 0.5) {
            priceClass = 'price-medium';
        }

        document.getElementById('electricity').innerHTML = `
            <div class="electricity-main">
                <div class="electricity-icon">⚡</div>
                <div>
                    <div class="electricity-price ${priceClass}">${priceOre}</div>
                    <div class="electricity-unit">öre/kWh just nu</div>
                </div>
            </div>
            <div class="electricity-details">
                <div class="electricity-detail">Lägst: <span>${minOre}</span></div>
                <div class="electricity-detail">Snitt: <span>${avgOre}</span></div>
                <div class="electricity-detail">Högst: <span>${maxOre}</span></div>
            </div>
        `;

        // Skapa graf
        const ctx = document.getElementById('electricityChart').getContext('2d');

        // Förbered data för grafen (stöd för kvartstaxor: HH:MM-format)
        const labels = data.map(p => {
            const d = new Date(p.time_start);
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes().toString().padStart(2, '0');
            return `${h}:${m}`;
        });
        const pricesOre = data.map(p => (p.SEK_per_kWh * 100).toFixed(1));

        // Färger för varje stapel baserat på pris
        const barColors = data.map(p => {
            if (p.SEK_per_kWh > 1) return '#ef4444';
            if (p.SEK_per_kWh > 0.5) return '#f59e0b';
            return '#10b981';
        });

        // Markera aktuellt kvartsintervall
        const borderColors = data.map(p => {
            const start = new Date(p.time_start);
            const end   = new Date(p.time_end);
            return (now >= start && now < end) ? '#1a1a2e' : 'transparent';
        });
        const borderWidths = data.map(p => {
            const start = new Date(p.time_start);
            const end   = new Date(p.time_end);
            return (now >= start && now < end) ? 2 : 0;
        });

        // Ta bort gammal graf om den finns
        if (electricityChart) {
            electricityChart.destroy();
        }

        electricityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: pricesOre,
                    backgroundColor: barColors,
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.raw} öre/kWh`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 0,
                            callback: function(val, index) {
                                // Visa bara hela timmar var 3:e timme (kvartstaxor: 4 poster/timme)
                                const label = this.getLabelForValue(val);
                                const [h, m] = label.split(':');
                                if (m !== '00') return '';
                                return parseInt(h) % 3 === 0 ? h : '';
                            }
                        }
                    },
                    y: {
                        grid: { color: '#e5e7eb' },
                        ticks: {
                            font: { size: 10 },
                            callback: (val) => val + ' öre'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

    } catch (error) {
        console.error('Elprisfel:', error);
        document.getElementById('electricity').innerHTML = '<div class="loading">Kunde inte hämta elpris</div>';
    }
}

// Hämta och visa AI-dagsbriefing baserad på SVT + DN-rubriker
async function fetchBriefing() {
    const card = document.getElementById('briefing');
    const content = document.getElementById('briefing-content');

    // Hämta nyckel från localStorage (säkrare än att ha den i koden)
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) { card.style.display = 'none'; return; }

    // Kolla om dagens briefing redan är cachad
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `briefing_${today}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        card.style.display = '';
        content.innerHTML = `<div class="briefing-body"><ul>${cached}</ul></div>`;
        return;
    }

    card.style.display = '';

    try {
        // Hämta SVT + DN-rubriker
        const allItems = [];
        for (const feed of CONFIG.newsFeeds) {
            try {
                const items = await fetchRSS(feed.url);
                items.slice(0, 5).forEach(item => allItems.push(item.title));
            } catch {}
        }

        if (allItems.length === 0) { card.style.display = 'none'; return; }

        const prompt = `Här är dagens nyhetsrubriker från SVT och DN:\n${allItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nSammanfatta de 3 viktigaste händelserna i korta punkter på svenska. Varje punkt ska vara en kort mening. Svara ENDAST med punkterna, inga inledningar eller avslutningar.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } }
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) { card.style.display = 'none'; return; }

        // Konvertera text till <li>-element (stöder både bullet-punkter och numrering)
        const items = text.split('\n')
            .map(l => l.replace(/^[\-\*\d\.\•▸]+\s*/, '').trim())
            .filter(l => l.length > 0);

        const liHtml = items.map(i => `<li>${i}</li>`).join('');
        content.innerHTML = `<div class="briefing-body"><ul>${liHtml}</ul></div>`;
        localStorage.setItem(cacheKey, liHtml);

    } catch (error) {
        console.error('Briefingfel:', error);
        card.style.display = 'none';
    }
}

// Hämta pollenprognos från pollenrapporten.se (Naturhistoriska riksmuseet) – Malmö
async function fetchPollen() {
    const MALMO_REGION_ID = '2a2a2a2a-2a2a-4a2a-aa2a-2a2a2a303a30';

    const POLLEN_NAMES = {
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323233': 'Hassel',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323236': 'Al',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323239': 'Tall',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323330': 'Sälg/Viden',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323331': 'Alm',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323332': 'Björk',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323335': 'Bok',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323337': 'Ek',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323338': 'Gran',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323433': 'Gräs',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323530': 'Gråbo',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323533': 'Malörtsambr.',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323833': 'Alternaria',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323834': 'Cladosporium',
        '2a2a2a2a-2a2a-4a2a-aa2a-2a313a323839': 'Epicoccum',
    };

    const LEVEL_NAMES = ['', 'Låga', 'Låga–måttliga', 'Måttliga', 'Måttliga–höga', 'Höga', 'Höga–mycket höga', 'Mycket höga'];

    function levelColor(l) {
        if (l <= 0) return '#d1d5db';
        if (l === 1) return '#10b981';
        if (l === 2) return '#84cc16';
        if (l === 3) return '#f59e0b';
        if (l === 4) return '#f97316';
        if (l === 5) return '#ef4444';
        if (l === 6) return '#dc2626';
        return '#a855f7'; // 7 = mycket höga
    }

    const card = document.getElementById('pollen');

    try {
        const url = `https://api.pollenrapporten.se/v1/forecasts?current=true&region_id=${MALMO_REGION_ID}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const forecast = data.items?.[0];
        if (!forecast) throw new Error('Ingen prognos tillgänglig');

        const today = new Date().toISOString().slice(0, 10);

        // Summera max-nivå per pollentyp för idag
        const todayLevels = {};
        (forecast.levelSeries || []).forEach(entry => {
            if ((entry.time || '').slice(0, 10) === today && entry.level > 0) {
                if (!todayLevels[entry.pollenId] || entry.level > todayLevels[entry.pollenId]) {
                    todayLevels[entry.pollenId] = entry.level;
                }
            }
        });

        const all = Object.entries(todayLevels)
            .map(([pollenId, level]) => ({
                name: POLLEN_NAMES[pollenId] || pollenId,
                level,
                desc: LEVEL_NAMES[level] || `Nivå ${level}`,
                color: levelColor(level),
            }))
            .sort((a, b) => b.level - a.level);

        if (all.length === 0) {
            card.style.display = 'none';
            return;
        }

        card.style.display = '';
        document.getElementById('pollen-content').innerHTML = `
            <div class="pollen-grid">
                ${all.map(t => `
                    <div class="pollen-item">
                        <div class="pollen-dot" style="background:${t.color}"></div>
                        <span class="pollen-name">${t.name}</span>
                        <span class="pollen-level">${t.desc}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        console.warn('Pollenrapporten API misslyckades:', e.message);
        card.style.display = 'none';
    }
}

// Kolla om en börs är öppen just nu
function isMarketOpen(market) {
    const now = new Date();

    if (market === 'SE') {
        // Nasdaq Stockholm: mån-fre 09:00–17:30 CET/CEST
        const t = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
        const day = t.getDay();
        if (day === 0 || day === 6) return false;
        const mins = t.getHours() * 60 + t.getMinutes();
        return mins >= 9 * 60 && mins < 17 * 60 + 30;
    } else if (market === 'US') {
        // NYSE/Nasdaq: mån-fre 09:30–16:00 ET
        const t = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const day = t.getDay();
        if (day === 0 || day === 6) return false;
        const mins = t.getHours() * 60 + t.getMinutes();
        return mins >= 9 * 60 + 30 && mins < 16 * 60;
    }
    return false;
}

// Hämta börsdata
async function fetchStocks() {
    const stocks = [
        { symbol: '^OMX',  name: 'OMXS30',   id: 0, market: 'SE' },
        { symbol: '^IXIC', name: 'NASDAQ',    id: 2, market: 'US' },
        { symbol: '^GSPC', name: 'S&P 500',  id: 1, market: 'US' },
        { symbol: '^DJI',  name: 'Dow Jones', id: 3, market: 'US' }
    ];

    const fetchStockData = async (symbol) => {
        const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
        const enc = encodeURIComponent(yahooUrl);

        const extractMeta = (data) => {
            const meta = data.chart?.result?.[0]?.meta;
            if (!meta?.regularMarketPrice) throw new Error('no price');
            return meta;
        };

        const yahooUrl1 = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
        const enc1 = encodeURIComponent(yahooUrl1);

        const stockProxies = [
            // cors.lol primär (corsproxy.io kräver betalplan sedan apr 2026)
            () => fetch(`https://api.cors.lol/?url=${enc}`, {
                headers: { 'x-cors-headers': JSON.stringify({ 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' }) }
            }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
            // allorigins raw returnerar rådata direkt (undviker JSON-wrapping)
            () => fetch(`https://api.allorigins.win/raw?url=${enc}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
            () => fetch(`https://api.allorigins.win/get?url=${enc}`).then(r => r.json()).then(j => { if (!j.contents) throw new Error('tom'); return JSON.parse(j.contents); }),
            () => fetch(`https://api.allorigins.win/get?url=${enc1}`).then(r => r.json()).then(j => { if (!j.contents) throw new Error('tom'); return JSON.parse(j.contents); }),
        ];

        for (const proxy of stockProxies) {
            try {
                const data = await proxy();
                return extractMeta(data);
            } catch (e) {
                console.warn(`Börs-proxy misslyckades för ${symbol}:`, e.message);
            }
        }
        throw new Error('Alla proxies misslyckades');
    };

    // Sekventiellt med 1200ms fördröjning för att undvika Yahoo rate limit
    for (let i = 0; i < stocks.length; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 1200));
        const stock = stocks[i];
        const stockItems = document.querySelectorAll('.stock-item');
        try {
            const meta = await fetchStockData(stock.symbol);
            const current = meta.regularMarketPrice;
            const previous = meta.chartPreviousClose;
            const change = ((current - previous) / previous * 100).toFixed(2);
            const isPositive = change >= 0;
            const open = isMarketOpen(stock.market);

            stockItems[stock.id].innerHTML = `
                <div class="stock-name">${stock.name}</div>
                <div class="stock-change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '▲' : '▼'} ${Math.abs(change)}%
                </div>
                <div class="market-status ${open ? 'open' : ''}">
                    <div class="market-dot ${open ? 'open' : 'closed'}"></div>
                    ${open ? 'Öppen' : 'Stängd'}
                </div>
            `;
        } catch (error) {
            console.error(`Börsfel för ${stock.name}:`, error);
            stockItems[stock.id].innerHTML = `
                <div class="stock-name">${stock.name}</div>
                <div class="loading">Ej tillgänglig</div>
            `;
        }
    }
}

// Parsa iCal-datum (YYYYMMDD eller YYYYMMDDTHHmmssZ)
function parseICalDate(dateStr) {
    if (!dateStr) return null;

    // Ta bort eventuell TZID parameter
    dateStr = dateStr.replace(/^.*:/, '');

    if (dateStr.includes('T')) {
        // Datetime format: 20240215T140000Z eller 20240215T140000
        const year = parseInt(dateStr.substr(0, 4));
        const month = parseInt(dateStr.substr(4, 2)) - 1;
        const day = parseInt(dateStr.substr(6, 2));
        const hour = parseInt(dateStr.substr(9, 2));
        const minute = parseInt(dateStr.substr(11, 2));

        if (dateStr.endsWith('Z')) {
            return new Date(Date.UTC(year, month, day, hour, minute));
        }
        return new Date(year, month, day, hour, minute);
    } else {
        // Date only format: 20240215
        const year = parseInt(dateStr.substr(0, 4));
        const month = parseInt(dateStr.substr(4, 2)) - 1;
        const day = parseInt(dateStr.substr(6, 2));
        return new Date(year, month, day);
    }
}

// Hämta kalender via iCal
async function fetchCalendar() {
    if (!CONFIG.calendar.enabled || !CONFIG.calendar.icalUrl) {
        return;
    }

    try {
        const proxy = CONFIG.calendarProxy || CONFIG.corsProxy;
        const url = `${proxy}${CONFIG.calendar.icalUrl}`;
        let icalText = '';
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
                const response = await fetch(url);
                if (!response.ok) throw new Error(response.status);
                icalText = await response.text();
                if (icalText.includes('BEGIN:VCALENDAR')) break;
            } catch (e) {
                if (attempt === 2) throw e;
            }
        }

        // Parsa iCal-data
        const events = [];
        const eventBlocks = icalText.split('BEGIN:VEVENT');

        for (let i = 1; i < eventBlocks.length; i++) {
            const block = eventBlocks[i].split('END:VEVENT')[0];

            // Hantera flerradiga värden (börjar med mellanslag/tab)
            const unfoldedBlock = block.replace(/\r?\n[ \t]/g, '');
            const lines = unfoldedBlock.split(/\r?\n/);

            let summary = '';
            let dtstart = '';
            let isAllDay = false;

            for (const line of lines) {
                if (line.startsWith('SUMMARY:')) {
                    summary = line.substring(8).trim();
                } else if (line.startsWith('DTSTART')) {
                    dtstart = line.split(':').pop().trim();
                    isAllDay = line.includes('VALUE=DATE') && !line.includes('VALUE=DATE-TIME');
                }
            }

            if (summary && dtstart) {
                const startDate = parseICalDate(dtstart);
                if (startDate) {
                    events.push({
                        summary,
                        start: startDate,
                        isAllDay: isAllDay || !dtstart.includes('T')
                    });
                }
            }
        }

        // Filtrera: endast framtida händelser inom 7 dagar
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const upcomingEvents = events
            .filter(e => e.start >= todayStart && e.start <= weekFromNow)
            .sort((a, b) => a.start - b.start)
            .slice(0, 10);

        if (upcomingEvents.length === 0) {
            document.getElementById('calendar').innerHTML = '<div class="loading">Inga kommande händelser</div>';
            return;
        }

        const html = upcomingEvents.map(event => {
            let timeStr = '';
            let dateStr = '';

            if (event.isAllDay) {
                timeStr = 'Heldag';
            } else {
                timeStr = event.start.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
            }

            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (event.start.toDateString() === today.toDateString()) {
                dateStr = 'Idag';
            } else if (event.start.toDateString() === tomorrow.toDateString()) {
                dateStr = 'Imorgon';
            } else {
                dateStr = event.start.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });
            }

            return `
                <div class="calendar-event">
                    <div>
                        <div class="event-time">${timeStr}</div>
                        <div class="event-date">${dateStr}</div>
                    </div>
                    <div class="event-title">${event.summary}</div>
                </div>
            `;
        }).join('');

        document.getElementById('calendar').innerHTML = html;

    } catch (error) {
        console.error('Kalenderfel:', error);
        document.getElementById('calendar').innerHTML = `
            <div class="setup-notice">
                Kunde inte hämta kalender: ${error.message}
            </div>
        `;
    }
}

// Cache för förhämtade artiklar: url → article-objekt (eller null om misslyckades)
const articleCache = new Map();

// Hämta HTML via en av proxarna
async function fetchHtmlViaProxy(articleUrl) {
    const parseHtml = (html) => {
        if (!html || html.length < 500) throw new Error('too short');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const base = doc.createElement('base');
        base.href = articleUrl;
        doc.head.prepend(base);

        // Feber: extrahera direkt från custom web components — kringgå Readability
        if (articleUrl.includes('feber.se')) {
            const headline = doc.querySelector('f-article-headline b, f-article-headline, h1');

            // Försök 1: f-para eller p-element i f-article-body
            let paras = [...doc.querySelectorAll('f-article-body f-para, f-article-body p')]
                .map(el => el.textContent.trim())
                .filter(t => t.length > 20)
                .map(t => `<p>${t}</p>`)
                .join('');

            // Försök 2: all text i f-article-body om inga stycken hittades
            if (!paras) {
                const bodyEl = doc.querySelector('f-article-body');
                if (bodyEl) {
                    const text = bodyEl.textContent.trim();
                    if (text.length > 50) paras = `<p>${text}</p>`;
                }
            }

            if (paras) return { title: headline ? headline.textContent.trim() : doc.title, content: paras };
            throw new Error('no feber content');
        }

        // Ta bort annonser, kommentarer och annat brus
        ['.maxetise', '.comment-container', '.comments', '#comments',
         'aside', 'footer', 'nav', '.related', '.advertisement',
         '.ad', '.ads', '.sidebar', '.social-share'].forEach(sel => {
            doc.querySelectorAll(sel).forEach(el => el.remove());
        });

        // Ta bort element med stor procentuell padding-bottom (bildskeletons)
        doc.querySelectorAll('[style*="padding-bottom"]').forEach(el => {
            if (parseFloat(el.style.paddingBottom) > 30) el.remove();
        });

        const article = new Readability(doc).parse();
        if (article && article.content && article.content.length > 200) return article;
        throw new Error('readability failed');
    };

    // cors.lol primärt, allorigins.win/raw som fallback
    const enc = encodeURIComponent(articleUrl);
    try {
        const r = await fetch(`https://api.cors.lol/?url=${enc}`);
        if (!r.ok) throw new Error(r.status);
        return await r.text().then(parseHtml);
    } catch {
        try {
            return await fetch(`https://api.allorigins.win/raw?url=${enc}`).then(r => r.text()).then(parseHtml);
        } catch {
            return null;
        }
    }
}

// Hämta och extrahera artikel — returnerar article-objekt eller null
async function fetchAndExtract(url) {
    if (articleCache.has(url)) return articleCache.get(url);
    const article = await fetchHtmlViaProxy(url);
    articleCache.set(url, article);
    return article;
}

// Förhämta artikel i bakgrunden — uppdaterar alltid cachen med fulltext om möjligt
function prefetchArticle(url) {
    fetchHtmlViaProxy(url).then(article => {
        if (article) articleCache.set(url, article);
    }).catch(() => {});
}

// Hämta RSS via rss2json.com — returnerar array [{title, link, date, description, content}]
async function fetchRSS(feedUrl) {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`rss2json ${response.status}`);
    const data = await response.json();
    if (data.status !== 'ok') throw new Error(`rss2json: ${data.message || data.status}`);
    return data.items.map(item => ({
        title: item.title || '',
        link: item.link || '',
        date: new Date(item.pubDate ? item.pubDate.replace(' ', 'T') : ''),
        description: item.description || '',
        content: item.content || ''
    }));
}

// Hämta nyheter via RSS
async function fetchNews() {
    const allNews = [];

    for (const feed of CONFIG.newsFeeds) {
        try {
            const items = await fetchRSS(feed.url);
            items.slice(0, 3).forEach(item => {
                allNews.push({ source: feed.name, title: item.title, link: item.link, date: item.date });
            });
        } catch (error) {
            console.error(`Nyhetsfel för ${feed.name}:`, error);
        }
    }

    // Sortera efter datum (nyast först)
    allNews.sort((a, b) => b.date - a.date);

    if (allNews.length === 0) {
        document.getElementById('news').innerHTML = '<div class="loading">Kunde inte hämta nyheter</div>';
        return;
    }

    const html = allNews.slice(0, CONFIG.maxNews).map(news => {
        const timeAgo = getTimeAgo(news.date);
        return `
            <div class="news-item">
                <div class="news-source">${news.source}</div>
                <div class="news-title"><a href="${news.link}" class="reader-link" data-url="${news.link}">${news.title}</a></div>
                <div class="news-time">${timeAgo}</div>
            </div>
        `;
    }).join('');

    document.getElementById('news').innerHTML = html;
    document.getElementById('news').querySelectorAll('.reader-link').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); openReader(link.dataset.url); });
    });

    // Förhämta artiklar i bakgrunden
    setTimeout(() => allNews.slice(0, CONFIG.maxNews).forEach(n => prefetchArticle(n.link)), 1000);
}

// Hämta AI-nyheter (TechCrunch AI + The Verge AI)
async function fetchAiNews() {
    const allNews = [];

    for (const feed of CONFIG.aiNewsFeeds) {
        try {
            const items = await fetchRSS(feed.url);
            items.slice(0, 4).forEach(item => {
                allNews.push({ title: item.title, link: item.link, source: feed.name, date: item.date });
            });
        } catch (error) {
            console.error(`AI-nyhetsfel för ${feed.name}:`, error);
        }
    }

    allNews.sort((a, b) => b.date - a.date);

    if (allNews.length === 0) {
        document.getElementById('ai-news').innerHTML = '<div class="loading">Inga AI-nyheter hittades</div>';
        return;
    }

    const html = allNews.slice(0, CONFIG.maxAiNews).map(item => {
        const timeAgo = getTimeAgo(item.date);
        let sourceClass = 'openai';
        if (item.title.toLowerCase().includes('anthropic') || item.source.toLowerCase().includes('anthropic')) {
            sourceClass = 'anthropic';
        }
        return `
            <div class="news-item">
                <div class="ai-source ${sourceClass}">${item.source}</div>
                <div class="news-title"><a href="${item.link}" class="reader-link" data-url="${item.link}">${item.title}</a></div>
                <div class="news-time">${timeAgo}</div>
            </div>
        `;
    }).join('');

    document.getElementById('ai-news').innerHTML = html;
    document.getElementById('ai-news').querySelectorAll('.reader-link').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); openReader(link.dataset.url); });
    });

    // Förhämta artiklar i bakgrunden + översätt rubriker
    setTimeout(() => allNews.slice(0, CONFIG.maxAiNews).forEach(item => prefetchArticle(item.link)), 1000);
    translateHeadlines('ai-news');
}

// Hämta Porsche nyheter från flera källor
async function fetchPorsche() {
    const sourceNames = {
        'carscoops.com':    'Carscoops',
        'roadandtrack.com': 'Road & Track',
        'motor1.com':       'Motor1'
    };

    const fetchFeed = async (feed) => {
        try {
            const items = await fetchRSS(feed.url);
            const sourceName = Object.entries(sourceNames).find(([k]) => feed.url.includes(k))?.[1] || 'Porsche News';
            return items
                .map(item => ({ title: item.title, link: item.link, date: item.date, source: sourceName }))
                .filter(item => !feed.filter || item.title.toLowerCase().includes('porsche'));
        } catch {
            return [];
        }
    };

    const results = await Promise.all(CONFIG.porscheFeeds.map(fetchFeed));
    const news = results.flat().sort((a, b) => b.date - a.date);

    // Deduplicera på titel (olika sajter kan rapportera samma nyhet)
    const seen = new Set();
    const unique = news.filter(item => {
        const key = item.title.toLowerCase().slice(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const latest = unique.slice(0, CONFIG.maxPorscheNews);

    if (latest.length === 0) {
        document.getElementById('porsche').innerHTML = '<div class="loading">Inga nyheter hittades</div>';
        return;
    }

    const html = latest.map(item => {
        const timeAgo = getTimeAgo(item.date);
        return `
            <div class="news-item">
                <div class="news-source">${item.source}</div>
                <div class="news-title"><a href="${item.link}" class="reader-link" data-url="${item.link}">${item.title}</a></div>
                <div class="news-time">${timeAgo}</div>
            </div>
        `;
    }).join('');

    document.getElementById('porsche').innerHTML = html;
    document.getElementById('porsche').querySelectorAll('.reader-link').forEach(link => {
        link.addEventListener('click', e => { e.preventDefault(); openReader(link.dataset.url); });
    });
    setTimeout(() => latest.forEach(item => prefetchArticle(item.link)), 1000);
    translateHeadlines('porsche');
}

// Hämta Macworld nyheter (senaste 24h, både .se och .com)
async function fetchMacworld() {
    const fetchFeed = async (url, sourceName) => {
        try {
            const items = await fetchRSS(url);
            return items.map(item => ({ title: item.title, link: item.link, date: item.date, source: sourceName, description: item.description, content: item.content }));
        } catch {
            return [];
        }
    };

    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const [seItems, comItems] = await Promise.all([
            fetchFeed(CONFIG.macworldFeed,    'Macworld SE'),
            fetchFeed(CONFIG.macworldComFeed, 'Macworld')
        ]);

        // Förfyll artikelcachen med RSS-innehåll som fallback om Readability misslyckas
        [...seItems, ...comItems].forEach(item => {
            if (!articleCache.has(item.link)) {
                const body = item.content || item.description;
                if (body && body.length > 100) {
                    articleCache.set(item.link, { title: item.title, content: body });
                }
            }
        });

        const news = [...seItems, ...comItems]
            .filter(item => item.date >= cutoff)
            .sort((a, b) => b.date - a.date);

        if (news.length === 0) {
            document.getElementById('macworld').innerHTML = '<div class="loading">Inga nyheter från de senaste 24 timmarna</div>';
            return;
        }

        const html = news.map(item => {
            const timeAgo = getTimeAgo(item.date);
            return `
                <div class="news-item">
                    <div class="news-source">${item.source}</div>
                    <div class="news-title">
                        <a href="${item.link}" class="reader-link" data-url="${item.link}">${item.title}</a>
                    </div>
                    <div class="news-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        document.getElementById('macworld').innerHTML = html;
        document.getElementById('macworld').querySelectorAll('.reader-link').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); openReader(link.dataset.url); });
        });

        // Förhämta artiklar i bakgrunden
        setTimeout(() => news.forEach(item => prefetchArticle(item.link)), 1000);

        // Översätt engelska rubriker (macworld.com) till svenska
        const englishLinks = [...document.querySelectorAll('#macworld .news-title a')]
            .filter(a => a.dataset.url.includes('macworld.com'));
        const translated = await Promise.all(englishLinks.map(a => translateText(a.textContent.trim())));
        englishLinks.forEach((a, i) => { if (translated[i]) a.textContent = translated[i]; });

    } catch (error) {
        console.error('Macworld-fel:', error);
        document.getElementById('macworld').innerHTML = '<div class="loading">Kunde inte hämta från Macworld</div>';
    }
}

// Hämta senaste Apple iOS/iPadOS Release Note – visas alltid, datum från Apple Releases-sidan
async function fetchAppleRelease() {
    const card = document.getElementById('apple-release-card');
    const content = document.getElementById('apple-release');
    const LS_KEY = 'apple-release-latest';

    try {
        const apiUrl = 'https://developer.apple.com/tutorials/data/documentation/ios-ipados-release-notes.json';
        const res = await fetch(`${CONFIG.corsProxy}${apiUrl}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const latestId = data.topicSections?.[0]?.identifiers?.[0];
        if (!latestId) throw new Error('Ingen release hittades');

        const ref = data.references?.[latestId];
        if (!ref) throw new Error('Ingen referens hittades');

        const rawTitle = ref.title;
        const title = rawTitle.replace('Release Notes', 'Versionsinformation');
        const url = `https://developer.apple.com${ref.url}`;

        // Spara firstSeen per release-id för att visa publiceringsdatum
        let stored = null;
        try { stored = JSON.parse(localStorage.getItem(LS_KEY)); } catch {}
        if (!stored || stored.id !== latestId) {
            stored = { id: latestId, firstSeen: Date.now() };
            localStorage.setItem(LS_KEY, JSON.stringify(stored));
        }

        // Försök hämta faktiskt releasedatum från Apple Releases-sidan
        let releaseDate = null;
        try {
            const releasesHtml = await fetch(`${CONFIG.corsProxy}https://developer.apple.com/news/releases/`)
                .then(r => r.text());
            const doc = new DOMParser().parseFromString(releasesHtml, 'text/html');
            // Extrahera versionsnummer ur titeln, t.ex. "26.4" från "iOS & iPadOS 26.4 Release Notes"
            const versionMatch = title.match(/(\d+\.\d+(?:\.\d+)?)/);
            if (versionMatch) {
                const version = versionMatch[1];
                // Hitta iOS-raden på releases-sidan som matchar versionen
                const items = [...doc.querySelectorAll('li, .release-entry, p')];
                for (const el of items) {
                    if (el.textContent.includes('iOS') && el.textContent.includes(version)) {
                        const dateEl = el.querySelector('time') || el;
                        const dateText = dateEl.getAttribute('datetime') || dateEl.textContent.match(/\w+ \d+, \d{4}/)?.[0];
                        if (dateText) { releaseDate = new Date(dateText); break; }
                    }
                }
            }
        } catch {}

        // Fallback: firstSeen från localStorage
        const displayDate = releaseDate && !isNaN(releaseDate)
            ? releaseDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })
            : new Date(stored.firstSeen).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });

        card.style.display = '';
        content.innerHTML = `
            <div class="news-item">
                <div class="news-source">Apple Developer</div>
                <div class="news-title">
                    <a href="${url}" class="reader-link" data-url="${url}">${title}</a>
                </div>
                <div class="news-time">${displayDate}</div>
            </div>
        `;
        content.querySelectorAll('.reader-link').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); openAppleDocReader(link.dataset.url); });
        });

    } catch (e) {
        console.warn('Apple Release-fel:', e.message);
        card.style.display = 'none';
    }
}

// Hämta Feber nyheter (5 senaste)
async function fetchFeber() {
    try {
        const items = await fetchRSS(CONFIG.feberFeed);
        const news = items.slice(0, 5).map(item => ({ title: item.title, link: item.link, date: item.date }));

        // Förfyll artikelcachen med RSS-innehåll som fallback (samma mönster som Macworld)
        items.slice(0, 5).forEach(item => {
            if (!articleCache.has(item.link)) {
                const body = item.content || item.description;
                if (body && body.length > 100) {
                    articleCache.set(item.link, { title: item.title, content: body });
                }
            }
        });

        if (news.length === 0) {
            document.getElementById('feber').innerHTML = '<div class="loading">Inga nyheter hittades</div>';
            return;
        }

        const html = news.map(item => {
            const timeAgo = getTimeAgo(item.date);
            return `
                <div class="news-item">
                    <div class="news-title">
                        <a href="${item.link}" class="reader-link" data-url="${item.link}">${item.title}</a>
                    </div>
                    <div class="news-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        document.getElementById('feber').innerHTML = html;
        document.getElementById('feber').querySelectorAll('.reader-link').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); openReader(link.dataset.url); });
        });

        setTimeout(() => news.forEach(item => prefetchArticle(item.link)), 1000);

    } catch (error) {
        console.error('Feber-fel:', error);
        document.getElementById('feber').innerHTML = '<div class="loading">Kunde inte hämta från Feber</div>';
    }
}

async function fetchAftonbladet() {
    try {
        let news = [];

        // Försök 1: rss2json – snabb men kan ge status:"error" för Aftonbladets format (se 2026-03-28)
        try {
            const items = await fetchRSS(CONFIG.aftonbladetFeed);
            news = items.slice(0, CONFIG.maxAftonbladetNews).map(i => ({ title: i.title, link: i.link, date: i.date }));
        } catch {
            // Fallback: cors.eu.org + manuell XML-parsing (samma approach som fungerade med corsproxy.io)
            const resp = await fetch(`${CONFIG.corsProxy}${CONFIG.aftonbladetFeed}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const xml = new DOMParser().parseFromString(await resp.text(), 'text/xml');
            xml.querySelectorAll('item').forEach((item, index) => {
                if (index < CONFIG.maxAftonbladetNews) {
                    const title = item.querySelector('title')?.textContent || '';
                    const link = item.querySelector('link')?.textContent || '';
                    const pubDate = item.querySelector('pubDate')?.textContent || '';
                    news.push({ title, link, date: new Date(pubDate) });
                }
            });
        }

        if (news.length === 0) {
            document.getElementById('aftonbladet').innerHTML = '<div class="loading">Inga nyheter hittades</div>';
            return;
        }

        const html = news.map(item => {
            const timeAgo = getTimeAgo(item.date);
            return `
                <div class="news-item">
                    <div class="news-title">
                        <a href="${item.link}" class="reader-link" data-url="${item.link}">${item.title}</a>
                    </div>
                    <div class="news-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        document.getElementById('aftonbladet').innerHTML = html;
        document.getElementById('aftonbladet').querySelectorAll('.reader-link').forEach(link => {
            link.addEventListener('click', e => { e.preventDefault(); openReader(link.dataset.url); });
        });

        setTimeout(() => news.forEach(item => prefetchArticle(item.link)), 1000);

    } catch (error) {
        console.error('Aftonbladet-fel:', error);
        document.getElementById('aftonbladet').innerHTML = '<div class="loading">Kunde inte hämta från Aftonbladet</div>';
    }
}

// Översätt alla nyhetsrubriker i ett kort till svenska
async function translateHeadlines(containerId) {
    const links = [...document.querySelectorAll(`#${containerId} .news-title a`)];
    if (links.length === 0) return;
    const translated = await Promise.all(links.map(a => translateText(a.textContent.trim())));
    links.forEach((a, i) => { if (translated[i]) a.textContent = translated[i]; });
}

// Hjälpfunktion: Tid sedan
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 60) {
        return `${minutes} min sedan`;
    } else if (hours < 24) {
        return `${hours} tim sedan`;
    } else {
        const days = Math.floor(hours / 24);
        return `${days} dag${days > 1 ? 'ar' : ''} sedan`;
    }
}

// ============================================
// READER-LÄGE
// ============================================


// Hjälpfunktion: översätt en textsträng till svenska
async function translateText(text) {
    if (!text || !text.trim()) return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=sv&dt=t&q=${encodeURIComponent(text)}`;
        const r = await fetch(url);
        const data = await r.json();
        return data[0].map(chunk => chunk[0]).join('');
    } catch {
        return text;
    }
}

let readerOriginalHTML = '';
let readerIsTranslated = false;

async function toggleTranslation() {
    const btn = document.getElementById('translate-btn');
    const body = document.querySelector('.reader-body');
    if (!body) return;

    if (readerIsTranslated) {
        body.innerHTML = readerOriginalHTML;
        if (btn._revertTitle) { btn._revertTitle(); btn._revertTitle = null; }
        btn.textContent = 'Översätt till svenska';
        btn.classList.remove('active');
        readerIsTranslated = false;
        return;
    }

    readerOriginalHTML = body.innerHTML;
    btn.textContent = 'Översätter...';
    btn.disabled = true;

    const titleEl = document.querySelector('.reader-title');
    const originalTitle = titleEl ? titleEl.textContent : null;

    // Hämta alla textelement och översätt parallellt (inkl. h1-titeln)
    const elements = [...body.querySelectorAll('p, h2, h3, h4, li, figcaption')];
    const texts = elements.map(el => el.textContent.trim());
    const [translatedTitle, ...translatedRest] = await Promise.all([
        titleEl ? translateText(titleEl.textContent.trim()) : Promise.resolve(null),
        ...texts.map(t => translateText(t))
    ]);

    if (titleEl && translatedTitle) titleEl.textContent = translatedTitle;
    elements.forEach((el, i) => { if (translatedRest[i]) el.textContent = translatedRest[i]; });

    btn.textContent = 'Visa originalspråk';
    btn.classList.add('active');
    btn.disabled = false;
    readerIsTranslated = true;

    btn._revertTitle = () => { if (titleEl && originalTitle) titleEl.textContent = originalTitle; };
}


// Renderar Apple DocC JSON-innehåll direkt i läsaröverlägget (inga proxyproblem)
async function openAppleDocReader(pageUrl) {
    const overlay = document.getElementById('reader-overlay');
    const content = document.getElementById('reader-content');
    document.getElementById('reader-source-link').href = pageUrl;

    readerOriginalHTML = '';
    readerIsTranslated = false;
    const btn = document.getElementById('translate-btn');
    btn.textContent = 'Översätt till svenska';
    btn.classList.remove('active');
    btn.disabled = false;

    overlay.classList.add('active');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    content.innerHTML = '<div class="loading">Hämtar release notes...</div>';

    try {
        const jsonUrl = pageUrl.replace(
            'https://developer.apple.com/documentation/',
            'https://developer.apple.com/tutorials/data/documentation/'
        ) + '.json';

        const res = await fetch(`${CONFIG.corsProxy}${jsonUrl}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const refs = data.references || {};

        function renderInline(items) {
            return (items || []).map(item => {
                if (item.type === 'text') return item.text;
                if (item.type === 'codeVoice') return `<code>${item.code}</code>`;
                if (item.type === 'strong') return `<strong>${renderInline(item.inlineContent)}</strong>`;
                if (item.type === 'emphasis') return `<em>${renderInline(item.inlineContent)}</em>`;
                if (item.type === 'reference') {
                    const ref = refs[item.identifier];
                    const text = ref?.title || item.identifier;
                    return ref?.url ? `<a href="https://developer.apple.com${ref.url}" target="_blank">${text}</a>` : text;
                }
                return '';
            }).join('');
        }

        function renderBlock(block) {
            if (block.type === 'heading') return `<h${block.level}>${block.text}</h${block.level}>`;
            if (block.type === 'paragraph') return `<p>${renderInline(block.inlineContent)}</p>`;
            if (block.type === 'unorderedList') {
                return `<ul>${(block.items || []).map(i => `<li>${(i.content || []).map(renderBlock).join('')}</li>`).join('')}</ul>`;
            }
            if (block.type === 'orderedList') {
                return `<ol>${(block.items || []).map(i => `<li>${(i.content || []).map(renderBlock).join('')}</li>`).join('')}</ol>`;
            }
            if (block.type === 'codeListing') return `<pre><code>${(block.code || []).join('\n')}</code></pre>`;
            return '';
        }

        const rawTitle = data.metadata?.title || 'Release Notes';
        const title = rawTitle.replace('Release Notes', 'Versionsinformation');
        const bodyHtml = (data.primaryContentSections || [])
            .flatMap(sec => (sec.content || []).map(renderBlock))
            .join('');

        content.innerHTML = `<h1>${title}</h1><div class="reader-body">${bodyHtml}</div>`;
        toggleTranslation();

    } catch (e) {
        console.warn('Apple Doc Reader-fel:', e.message);
        content.innerHTML = `<p>Kunde inte hämta innehållet.</p><p><a href="${pageUrl}" target="_blank">Öppna i webbläsaren istället →</a></p>`;
    }
}

async function openReader(url) {
    const overlay = document.getElementById('reader-overlay');
    const content = document.getElementById('reader-content');
    document.getElementById('reader-source-link').href = url;

    // Nollställ translate-state
    readerOriginalHTML = '';
    readerIsTranslated = false;
    const btn = document.getElementById('translate-btn');
    btn.textContent = 'Översätt till svenska';
    btn.classList.remove('active');
    btn.disabled = false;

    overlay.classList.add('active');
    overlay.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    // Visa laddningsindikator bara om artikeln inte är cachad
    if (!articleCache.has(url)) {
        content.innerHTML = '<div class="loading">Hämtar artikel...</div>';
    }

    const article = await fetchAndExtract(url);

    if (article) {
        const swedishSource = /svt\.se|dn\.se|macworld\.se|feber\.se|aftonbladet\.se/i.test(url);
        const cleanTitle = (article.title || '').replace(/\s*[|–—]\s*[^|–—]+$/, '').trim();
        content.innerHTML = `
            <h1 class="reader-title">${cleanTitle}</h1>
            <div class="reader-body">${article.content}</div>
            <div style="text-align:center; padding: 32px 0 8px;">
                <button onclick="closeReader()" style="
                    background: none;
                    border: 2px solid #d1d5db;
                    border-radius: 50%;
                    width: 44px;
                    height: 44px;
                    font-size: 18px;
                    cursor: pointer;
                    color: #6b7280;
                    line-height: 1;
                ">✕</button>
            </div>
        `;
        // Auto-översätt engelska källor direkt
        if (!swedishSource) await toggleTranslation();
    } else {
        content.innerHTML = readerFallback(url);
    }
}

function readerFallback(url) {
    return `
        <div style="text-align:center; padding: 32px 16px;">
            <div style="font-size: 32px; margin-bottom: 16px;">📰</div>
            <p style="color:#6b7280; margin-bottom: 24px; line-height:1.6;">
                Den här artikeln blockerar läsarläge.<br>Öppna den direkt i webbläsaren istället.
            </p>
            <a href="${url}" target="_blank" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 12px 24px;
                border-radius: 24px;
                text-decoration: none;
                font-weight: 600;
                font-size: 15px;
            ">Öppna artikel ↗</a>
        </div>
    `;
}

function closeReader() {
    document.getElementById('reader-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeReader();
});

// Dark mode
function toggleDarkMode() {
    const dark = document.body.classList.toggle('dark');
    localStorage.setItem('darkMode', dark);
    document.getElementById('darkmode-btn').textContent = dark ? '☀️' : '🌙';
}

// Starta dashboard
// ============================================
// SKOLMÅLTID
// ============================================

function getISOYearWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const isoYear = d.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: isoYear, week: isoWeek };
}

function bonnieCacheKey(year, week) { return `bonnie_lunch_${year}_v${week}`; }

function bonnieSaveToCache(year, week, meals) {
    try { localStorage.setItem(bonnieCacheKey(year, week), JSON.stringify(meals)); } catch {}
}

function bonnieLoadFromCache(year, week) {
    try { return JSON.parse(localStorage.getItem(bonnieCacheKey(year, week)) || 'null'); } catch { return null; }
}

function bonnieParseTable(table) {
    const meals = {};
    for (const row of table.querySelectorAll('tbody tr')) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
            const day = cells[0].textContent.trim();
            const meal = cells[1].textContent.trim();
            if (day && meal) meals[day] = meal;
        }
    }
    return meals;
}

async function fetchBonnieLunch(now) {
    const { year, week } = getISOYearWeek(now);
    const dayNames = ['', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'];
    const todayName = dayNames[now.getDay()];

    // Hämta HTML via proxy
    const targetUrl = 'https://astorp.se/barn-och-utbildning/grundskola/hyllinge-skola.html';
    const enc = encodeURIComponent(targetUrl);
    let html = '';
    try {
        const resp = await fetch(`https://corsproxy.io/?${enc}`, { signal: AbortSignal.timeout(8000) });
        if (!resp.ok) throw new Error(resp.status);
        html = await resp.text();
    } catch {
        try {
            const resp = await fetch(`https://api.cors.lol/?url=${enc}`, { signal: AbortSignal.timeout(8000) });
            if (!resp.ok) throw new Error(resp.status);
            html = await resp.text();
        } catch { html = ''; }
    }

    if (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Hitta och cacha alla veckor som finns på sidan
        for (const t of doc.querySelectorAll('table')) {
            const caption = t.querySelector('caption');
            if (!caption) continue;
            const m = caption.textContent.match(/vecka\s+(\d+)/i);
            if (!m) continue;
            const w = parseInt(m[1]);
            // Spara i cache (skriver alltid över med färsk data)
            const meals = bonnieParseTable(t);
            if (Object.keys(meals).length) bonnieSaveToCache(year, w, meals);
        }
    }

    // Försök hämta dagens mål från cache (täcker även fallet att veckan tagits bort från sidan)
    const cached = bonnieLoadFromCache(year, week);
    if (cached && cached[todayName]) return cached[todayName];

    // Inget för idag — visa nästa tillgängliga veckas måndag som försmak
    if (html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const future = [];
        for (const t of doc.querySelectorAll('table')) {
            const caption = t.querySelector('caption');
            if (!caption) continue;
            const m = caption.textContent.match(/vecka\s+(\d+)/i);
            if (m && parseInt(m[1]) > week) future.push({ w: parseInt(m[1]), table: t });
        }
        future.sort((a, b) => a.w - b.w);
        if (future.length) {
            const meals = bonnieParseTable(future[0].table);
            if (meals['Måndag']) return `v${future[0].w} mån: ${meals['Måndag']}`;
        }
    }

    throw new Error('ingen meny tillgänglig');
}

async function fetchIsabelleLunch(now) {
    const todayStr = now.toISOString().slice(0, 10);
    const cacheKey = `isabelle_lunch_${todayStr}`;

    // Försök hämta färsk data från RSS
    try {
        const rssUrl = 'https://skolmaten.se/api/4/rss/week/elinebergsskolan?locale=sv';
        const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        const data = await fetch(url).then(r => r.json());
        if (data.status === 'ok' && data.items) {
            // Cacha alla dagar i veckan som finns i RSS-svaret
            for (const item of data.items) {
                if (item.pubDate && item.description) {
                    const dateStr = item.pubDate.slice(0, 10);
                    try { localStorage.setItem(`isabelle_lunch_${dateStr}`, item.description.trim()); } catch {}
                }
            }
            const todayItem = data.items.find(i => i.pubDate?.startsWith(todayStr));
            if (todayItem) {
                const meal = (todayItem.description || '').trim();
                if (!meal) throw new Error('lov eller stängt');
                return meal;
            }
        }
    } catch (e) {
        if (e.message === 'lov eller stängt') throw e;
    }

    // Fallback: localStorage-cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) return cached;

    throw new Error('dag ej hittad');
}

async function fetchLunch() {
    const now = new Date();
    const card = document.getElementById('lunch-card');
    if (now.getDay() === 0 || now.getDay() === 6) {
        card.style.display = 'none';
        return;
    }
    const [bonnieResult, isabelleResult] = await Promise.allSettled([
        fetchBonnieLunch(now),
        fetchIsabelleLunch(now)
    ]);
    const row = (emoji, name, result) => {
        const dish = result.status === 'fulfilled'
            ? `<span class="lunch-dish">${result.value}</span>`
            : `<span class="lunch-dish lunch-error">Kunde inte hämta</span>`;
        return `<div class="lunch-row"><span class="lunch-name">${emoji} ${name}</span>${dish}</div>`;
    };
    document.getElementById('lunch').innerHTML =
        row('🎀', 'Bonnie', bonnieResult) +
        row('⭐', 'Isabelle', isabelleResult);
}

async function fetchHemnet() {
    const card = document.getElementById('hemnet-card');
    const container = document.getElementById('hemnet-listings');

    // 1. Försök hämta färsk data via Cloudflare Worker (konfigureras i config.js)
    const workerUrl = CONFIG.hemnet.workerUrl || '';
    if (workerUrl) {
        try {
            const params = CONFIG.hemnet.searchUrl.split('?')[1] || '';
            const resp = await fetch(`${workerUrl}?${params}`);
            if (resp.ok) {
                const json = await resp.json();
                if (Array.isArray(json.listings) && json.listings.length > 0) {
                    const fresh = {
                        ts: Date.now(),
                        listings: json.listings.map(l => ({
                            id: l.id, a: l.streetAddress, loc: l.locationDescription,
                            p: l.askingPrice, r: l.rooms, m: l.area,
                            t: l.housingForm, b: l.brokerName, ba: l.brokerAgencyName,
                            pub: parseFloat(l.publishedAt), slug: l.slug,
                            img: l.thumbnail || ''
                        }))
                    };
                    localStorage.setItem('hemnet_cache', JSON.stringify(fresh));
                }
            }
        } catch(e) {
            console.warn('Hemnet Worker-fel:', e);
        }
    }

    // 2. Läs från localStorage (satt av Worker ovan eller av extern automation)
    let cache = null;
    try {
        const raw = localStorage.getItem('hemnet_cache');
        if (raw) cache = JSON.parse(raw);
    } catch(e) {}

    // 3. Ingen data — visa länkknapp
    if (!cache?.listings?.length) {
        container.innerHTML = `
            <div style="text-align:center; padding: 4px 0 8px;">
                <div style="font-size:13px; color:#6b7280; margin-bottom:12px;">Villor &amp; gårdar · Hyllinge/Åstorp</div>
                <a href="${CONFIG.hemnet.searchUrl}" target="_blank" rel="noopener" class="hemnet-btn">
                    Visa nya hus på Hemnet ↗
                </a>
                <a href="https://www.booli.se/sok/till-salu?areaIds=117043&objectType=Villa" target="_blank" rel="noopener" class="hemnet-btn" style="margin-top:8px;">
                    Visa nya hus på Booli ↗
                </a>
            </div>
        `;
        card.style.display = '';
        return;
    }

    // 4. Filtrera på 48h
    const cutoff = Date.now() / 1000 - 48 * 3600;
    const recent = cache.listings.filter(l => l.pub >= cutoff);

    if (!recent.length) {
        card.style.display = 'none';
        return;
    }

    const fmtAge = pub => {
        const h = Math.round((Date.now() / 1000 - pub) / 3600);
        if (h < 1) return 'Precis publicerad';
        if (h < 24) return `${h}h sedan`;
        return 'Igår';
    };

    container.innerHTML = recent.map(l => {
        const thumb = l.img
            ? `<img class="hemnet-thumb" src="${l.img}" alt="${l.a}" loading="lazy" onerror="this.style.display='none'">`
            : `<div class="hemnet-thumb-placeholder">🏡</div>`;
        const meta = [l.r, l.m].filter(Boolean).join(' · ');
        const broker = [l.b, l.ba].filter(Boolean).join(', ');
        const url = `https://www.hemnet.se/bostad/${l.slug}`;
        return `<a class="hemnet-listing" href="${url}" target="_blank" rel="noopener">
            ${thumb}
            <div class="hemnet-info">
                <div class="hemnet-address">${l.a}</div>
                <div class="hemnet-type">${l.t}${l.loc ? ' · ' + l.loc : ''}</div>
                <div class="hemnet-price">${l.p || '–'}</div>
                ${meta ? `<div class="hemnet-meta">${meta}</div>` : ''}
                <div class="hemnet-broker">${broker}${broker ? ' · ' : ''}${fmtAge(l.pub)}</div>
            </div>
        </a>`;
    }).join('');

    const ageMin = Math.round((Date.now() - cache.ts) / 60000);
    container.innerHTML += `<div style="font-size:11px;color:#9ca3af;text-align:right;padding-top:8px;margin-top:4px;">Uppdaterad för ${ageMin} min sedan</div>`;

    card.style.display = '';
}

async function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Hämta all data parallellt (kalender separat efter aktier pga cors.lol rate-limit)
    await Promise.all([
        fetchNameday(),
        fetchWeather(),
        fetchBriefing(),
        fetchElectricity(),
        fetchPollen(),
        fetchStocks(),
        fetchNews(),
        fetchAiNews(),
        fetchPorsche(),
        fetchMacworld(),
        fetchAppleRelease(),
        fetchFeber(),
        fetchAftonbladet(),
        fetchLunch(),
        fetchHemnet()
    ]);
    fetchCalendar();
}

// Kör när sidan laddas
document.addEventListener('DOMContentLoaded', () => {
    // Synka dark mode från html-elementet (applicerat i head) till body
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        document.getElementById('darkmode-btn').textContent = '☀️';
    }
    init();
});
