// ============================================
// MORGON DASHBOARD
// ============================================

// ============================================
// PHILIPS HUE INTEGRATION
// ============================================

// Hämta sparad Hue-data från localStorage
function getHueConfig() {
    const saved = localStorage.getItem('hueConfig');
    if (saved) {
        return JSON.parse(saved);
    }
    return { username: '', kitchenLightId: '' };
}

// Spara Hue-data till localStorage
function saveHueConfig(username, kitchenLightId) {
    localStorage.setItem('hueConfig', JSON.stringify({ username, kitchenLightId }));
}

// Setup Hue - registrera med bridge
async function setupHue() {
    const btn = document.querySelector('.hue-btn.setup');
    btn.textContent = 'Ansluter...';

    try {
        const response = await fetch(`http://${CONFIG.hue.bridgeIp}/api`, {
            method: 'POST',
            body: JSON.stringify({ devicetype: 'emils_dashboard#browser' })
        });
        const data = await response.json();

        if (data[0].error) {
            alert('Tryck på knappen på Hue Bridge först, sen försök igen!');
            btn.textContent = 'Anslut Hue';
            return;
        }

        const username = data[0].success.username;

        // Hitta lampor
        const lightsResponse = await fetch(`http://${CONFIG.hue.bridgeIp}/api/${username}/lights`);
        const lights = await lightsResponse.json();

        // Visa lampor för användaren att välja
        const lightList = Object.entries(lights).map(([id, light]) => `${id}: ${light.name}`).join('\n');
        const chosenId = prompt(`Vilken lampa är köksbelysningen?\n\n${lightList}\n\nSkriv numret:`);

        if (chosenId && lights[chosenId]) {
            saveHueConfig(username, chosenId);
            document.getElementById('hue-setup').style.display = 'none';
            document.getElementById('hue-controls').style.display = 'flex';
            alert(`Klar! "${lights[chosenId].name}" är nu kopplad.`);
        } else {
            alert('Ogiltigt val. Försök igen.');
            btn.textContent = 'Anslut Hue';
        }

    } catch (error) {
        console.error('Hue setup error:', error);
        alert('Kunde inte ansluta till Hue Bridge. Är du på samma WiFi?');
        btn.textContent = 'Anslut Hue';
    }
}

// Tänd/släck köksbelysning
async function toggleKitchenLight(on) {
    const hueConfig = getHueConfig();
    if (!hueConfig.username || !hueConfig.kitchenLightId) {
        alert('Hue är inte konfigurerat. Klicka på "Anslut Hue" först.');
        return;
    }

    try {
        await fetch(`http://${CONFIG.hue.bridgeIp}/api/${hueConfig.username}/lights/${hueConfig.kitchenLightId}/state`, {
            method: 'PUT',
            body: JSON.stringify({ on: on })
        });
    } catch (error) {
        console.error('Hue error:', error);
        alert('Kunde inte styra lampan. Är du på samma WiFi som Hue Bridge?');
    }
}

// Initiera Hue-kort
function initHue() {
    const hueConfig = getHueConfig();
    if (hueConfig.username && hueConfig.kitchenLightId) {
        document.getElementById('hue-setup').style.display = 'none';
        document.getElementById('hue-controls').style.display = 'flex';
    }
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

// Hämta väder från SMHI
async function fetchWeather() {
    try {
        const { lat, lon } = CONFIG.weather;
        const url = `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${lon}/lat/${lat}/data.json`;

        const response = await fetch(url);
        const data = await response.json();

        // Första timserien är aktuellt väder
        const current = data.timeSeries[0];
        const params = {};
        current.parameters.forEach(p => {
            params[p.name] = p.values[0];
        });

        // t = temperatur, ws = vindhastighet, r = luftfuktighet
        // Wsymb2 = vädersymbol
        const temp = Math.round(params.t);
        const wind = Math.round(params.ws);
        const humidity = Math.round(params.r);
        const symbol = params.Wsymb2;

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
            </div>
        `;
    } catch (error) {
        console.error('Väderfel:', error);
        document.getElementById('weather').innerHTML = '<div class="loading">Kunde inte hämta väder</div>';
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

        // Hitta aktuellt timpris
        const currentHour = now.getHours();
        const currentPrice = data.find(p => {
            const priceHour = new Date(p.time_start).getHours();
            return priceHour === currentHour;
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

        // Förbered data för grafen
        const labels = data.map(p => {
            const hour = new Date(p.time_start).getHours();
            return `${hour}:00`;
        });
        const pricesOre = data.map(p => (p.SEK_per_kWh * 100).toFixed(1));

        // Färger för varje stapel baserat på pris
        const barColors = data.map(p => {
            if (p.SEK_per_kWh > 1) return '#ef4444';
            if (p.SEK_per_kWh > 0.5) return '#f59e0b';
            return '#10b981';
        });

        // Markera aktuell timme
        const borderColors = data.map((p, i) => {
            const hour = new Date(p.time_start).getHours();
            return hour === currentHour ? '#1a1a2e' : 'transparent';
        });
        const borderWidths = data.map((p, i) => {
            const hour = new Date(p.time_start).getHours();
            return hour === currentHour ? 2 : 0;
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
                                // Visa bara var 3:e timme
                                return index % 3 === 0 ? this.getLabelForValue(val) : '';
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

// Hämta börsdata
async function fetchStocks() {
    const stocks = [
        { symbol: '^OMX', name: 'OMXS30', id: 0 },
        { symbol: '^GSPC', name: 'S&P 500', id: 1 },
        { symbol: '^IXIC', name: 'NASDAQ', id: 2 },
        { symbol: '^DJI', name: 'Dow Jones', id: 3 }
    ];

    // Använder Yahoo Finance via en CORS-proxy
    for (const stock of stocks) {
        try {
            const url = `${CONFIG.corsProxy}${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?interval=1d&range=2d`)}`;
            const response = await fetch(url);
            const data = await response.json();

            const result = data.chart.result[0];
            const quote = result.indicators.quote[0];
            const closes = quote.close.filter(c => c !== null);

            const current = closes[closes.length - 1];
            const previous = closes[closes.length - 2];
            const change = ((current - previous) / previous * 100).toFixed(2);
            const isPositive = change >= 0;

            const stockItems = document.querySelectorAll('.stock-item');
            stockItems[stock.id].innerHTML = `
                <div class="stock-name">${stock.name}</div>
                <div class="stock-change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '▲' : '▼'} ${Math.abs(change)}%
                </div>
            `;
        } catch (error) {
            console.error(`Börsfel för ${stock.name}:`, error);
            const stockItems = document.querySelectorAll('.stock-item');
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
        const url = `${proxy}${encodeURIComponent(CONFIG.calendar.icalUrl)}`;
        const response = await fetch(url);
        const icalText = await response.text();

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

// Hämta nyheter via RSS
async function fetchNews() {
    const allNews = [];

    for (const feed of CONFIG.newsFeeds) {
        try {
            const url = `${CONFIG.corsProxy}${encodeURIComponent(feed.url)}`;
            const response = await fetch(url);
            const text = await response.text();

            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const items = xml.querySelectorAll('item');

            items.forEach((item, index) => {
                if (index < 3) { // Max 3 per källa
                    const title = item.querySelector('title')?.textContent || '';
                    const link = item.querySelector('link')?.textContent || '';
                    const pubDate = item.querySelector('pubDate')?.textContent || '';

                    allNews.push({
                        source: feed.name,
                        title: title,
                        link: link,
                        date: new Date(pubDate)
                    });
                }
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
                <div class="news-title"><a href="${news.link}" target="_blank">${news.title}</a></div>
                <div class="news-time">${timeAgo}</div>
            </div>
        `;
    }).join('');

    document.getElementById('news').innerHTML = html;
}

// Hämta AI-nyheter (OpenAI & Anthropic)
async function fetchAiNews() {
    const allNews = [];

    for (const feed of CONFIG.aiFeeds) {
        try {
            const url = `${CONFIG.corsProxy}${encodeURIComponent(feed.url)}`;
            const response = await fetch(url);
            const text = await response.text();

            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const items = xml.querySelectorAll('item');

            items.forEach((item, index) => {
                if (index < 2) { // Max 2 per källa
                    const title = item.querySelector('title')?.textContent || '';
                    const link = item.querySelector('link')?.textContent || '';
                    const pubDate = item.querySelector('pubDate')?.textContent || '';

                    allNews.push({
                        source: feed.name,
                        className: feed.className,
                        title: title,
                        link: link,
                        date: new Date(pubDate)
                    });
                }
            });
        } catch (error) {
            console.error(`AI-nyhetsfel för ${feed.name}:`, error);
        }
    }

    // Sortera efter datum (nyast först)
    allNews.sort((a, b) => b.date - a.date);

    if (allNews.length === 0) {
        document.getElementById('ai-news').innerHTML = '<div class="loading">Kunde inte hämta AI-nyheter</div>';
        return;
    }

    const html = allNews.slice(0, CONFIG.maxAiNews).map(news => {
        const timeAgo = getTimeAgo(news.date);
        return `
            <div class="news-item">
                <div class="ai-source ${news.className}">${news.source}</div>
                <div class="news-title"><a href="${news.link}" target="_blank">${news.title}</a></div>
                <div class="news-time">${timeAgo}</div>
            </div>
        `;
    }).join('');

    document.getElementById('ai-news').innerHTML = html;
}

// Hämta Porsche nyheter
async function fetchPorsche() {
    try {
        const url = `${CONFIG.corsProxy}${encodeURIComponent(CONFIG.porscheFeed)}`;
        const response = await fetch(url);
        const text = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        const news = [];
        items.forEach((item, index) => {
            if (index < CONFIG.maxPorscheNews) {
                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';
                const source = item.querySelector('source')?.textContent || 'Porsche News';

                news.push({
                    title: title,
                    link: link,
                    source: source,
                    date: new Date(pubDate)
                });
            }
        });

        if (news.length === 0) {
            document.getElementById('porsche').innerHTML = '<div class="loading">Inga nyheter hittades</div>';
            return;
        }

        const html = news.map(item => {
            const timeAgo = getTimeAgo(item.date);
            return `
                <div class="news-item">
                    <div class="news-source">${item.source}</div>
                    <div class="news-title"><a href="${item.link}" target="_blank">${item.title}</a></div>
                    <div class="news-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        document.getElementById('porsche').innerHTML = html;

    } catch (error) {
        console.error('Porsche-fel:', error);
        document.getElementById('porsche').innerHTML = '<div class="loading">Kunde inte hämta Porsche-nyheter</div>';
    }
}

// Hämta Macworld nyheter
async function fetchMacworld() {
    try {
        const url = `${CONFIG.corsProxy}${encodeURIComponent(CONFIG.macworldFeed)}`;
        const response = await fetch(url);
        const text = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        const news = [];
        items.forEach((item, index) => {
            if (index < CONFIG.maxMacworldNews) {
                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';

                news.push({
                    title: title,
                    link: link,
                    date: new Date(pubDate)
                });
            }
        });

        if (news.length === 0) {
            document.getElementById('macworld').innerHTML = '<div class="loading">Inga nyheter hittades</div>';
            return;
        }

        const html = news.map(item => {
            const timeAgo = getTimeAgo(item.date);
            return `
                <div class="news-item">
                    <div class="news-title"><a href="${item.link}" target="_blank">${item.title}</a></div>
                    <div class="news-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        document.getElementById('macworld').innerHTML = html;

    } catch (error) {
        console.error('Macworld-fel:', error);
        document.getElementById('macworld').innerHTML = '<div class="loading">Kunde inte hämta från Macworld</div>';
    }
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

// Starta dashboard
async function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Initiera Hue
    initHue();

    // Hämta all data parallellt
    await Promise.all([
        fetchWeather(),
        fetchElectricity(),
        fetchStocks(),
        fetchCalendar(),
        fetchNews(),
        fetchAiNews(),
        fetchPorsche(),
        fetchMacworld()
    ]);
}

// Kör när sidan laddas
document.addEventListener('DOMContentLoaded', init);
