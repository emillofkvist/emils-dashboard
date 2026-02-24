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
        { symbol: '^OMX', name: 'OMXS30', id: 0, market: 'SE' },
        { symbol: '^GSPC', name: 'S&P 500', id: 1, market: 'US' },
        { symbol: '^IXIC', name: 'NASDAQ', id: 2, market: 'US' },
        { symbol: '^DJI', name: 'Dow Jones', id: 3, market: 'US' }
    ];

    const fetchStock = async (stock) => {
        const stockItems = document.querySelectorAll('.stock-item');
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
    };

    await Promise.all(stocks.map(fetchStock));
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
            const headline = doc.querySelector('f-article-headline b, f-article-headline');
            const paras = [...doc.querySelectorAll('f-article-body f-para')]
                .map(el => el.textContent.trim())
                .filter(t => t.length > 0)
                .map(t => `<p>${t}</p>`)
                .join('');
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

    const enc = encodeURIComponent(articleUrl);
    const proxies = [
        fetch(`https://api.allorigins.win/raw?url=${enc}`).then(r => r.text()).then(parseHtml),
        fetch(`https://api.allorigins.win/get?url=${enc}`).then(r => r.json()).then(j => parseHtml(j.contents || '')),
        fetch(`https://corsproxy.io/?${enc}`).then(r => r.text()).then(parseHtml)
    ];

    try {
        return await Promise.any(proxies);
    } catch {
        return null;
    }
}

// Hämta och extrahera artikel — returnerar article-objekt eller null
async function fetchAndExtract(url) {
    if (articleCache.has(url)) return articleCache.get(url);
    const article = await fetchHtmlViaProxy(url);
    articleCache.set(url, article);
    return article;
}

// Förhämta artikel i bakgrunden (tyst, inga felmeddelanden)
function prefetchArticle(url) {
    if (!articleCache.has(url)) {
        fetchAndExtract(url).catch(() => {});
    }
}

// Hämta RSS med automatisk proxy-fallback och XML-validering
async function fetchRSS(feedUrl) {
    const isXml = t => t.includes('<rss') || t.includes('<feed') || t.includes('<?xml');

    // Försök 1: allorigins /raw
    try {
        const r = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`);
        const text = await r.text();
        if (isXml(text)) return text;
    } catch (e) {}

    // Försök 2: allorigins /get (returnerar JSON-omslag med statuskod)
    try {
        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`);
        const json = await r.json();
        if (json.contents && isXml(json.contents)) return json.contents;
    } catch (e) {}

    // Försök 3: corsproxy.io
    try {
        const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(feedUrl)}`);
        const text = await r.text();
        if (isXml(text)) return text;
    } catch (e) {}

    throw new Error(`Kunde inte hämta feed: ${feedUrl}`);
}

// Hämta nyheter via RSS
async function fetchNews() {
    const allNews = [];

    for (const feed of CONFIG.newsFeeds) {
        try {
            const text = await fetchRSS(feed.url);

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
            const text = await fetchRSS(feed.url);
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const items = xml.querySelectorAll('item');

            items.forEach((item, index) => {
                if (index < 4) {
                    const title = item.querySelector('title')?.textContent || '';
                    const link = item.querySelector('link')?.textContent || '';
                    const pubDate = item.querySelector('pubDate')?.textContent || '';

                    allNews.push({ title, link, source: feed.name, date: new Date(pubDate) });
                }
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

    // Förhämta artiklar i bakgrunden
    setTimeout(() => allNews.slice(0, CONFIG.maxAiNews).forEach(item => prefetchArticle(item.link)), 1000);
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
            const text = await fetchRSS(feed.url);
            const xml = new DOMParser().parseFromString(text, 'text/xml');
            const items = [...xml.querySelectorAll('item')];
            const sourceName = Object.entries(sourceNames).find(([k]) => feed.url.includes(k))?.[1] || 'Porsche News';
            return items
                .map(item => ({
                    title:  item.querySelector('title')?.textContent || '',
                    link:   item.querySelector('link')?.textContent || '',
                    date:   new Date(item.querySelector('pubDate')?.textContent || ''),
                    source: sourceName
                }))
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
}

// Hämta Macworld nyheter (senaste 24h)
async function fetchMacworld() {
    try {
        const text = await fetchRSS(CONFIG.macworldFeed);

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const news = [];

        items.forEach(item => {
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const date = new Date(pubDate);

            if (date >= cutoff) {
                news.push({ title, link, date });
            }
        });

        if (news.length === 0) {
            document.getElementById('macworld').innerHTML = '<div class="loading">Inga nyheter från de senaste 24 timmarna</div>';
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

        document.getElementById('macworld').innerHTML = html;

        document.getElementById('macworld').querySelectorAll('.reader-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                openReader(link.dataset.url);
            });
        });

        // Förhämta artiklar i bakgrunden för snabbare reader
        setTimeout(() => news.forEach(item => prefetchArticle(item.link)), 1000);

    } catch (error) {
        console.error('Macworld-fel:', error);
        document.getElementById('macworld').innerHTML = '<div class="loading">Kunde inte hämta från Macworld</div>';
    }
}

// Hämta Feber nyheter (5 senaste)
async function fetchFeber() {
    try {
        const text = await fetchRSS(CONFIG.feberFeed);

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        const news = [];
        items.forEach((item, index) => {
            if (index < 5) {
                const title = item.querySelector('title')?.textContent || '';
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';
                news.push({ title, link, date: new Date(pubDate) });
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
        btn.textContent = 'Översätt till svenska';
        btn.classList.remove('active');
        readerIsTranslated = false;
        return;
    }

    readerOriginalHTML = body.innerHTML;
    btn.textContent = 'Översätter...';
    btn.disabled = true;

    // Hämta alla textelement och översätt parallellt
    const elements = [...body.querySelectorAll('p, h2, h3, h4, li, figcaption')];
    const texts = elements.map(el => el.textContent.trim());
    const translated = await Promise.all(texts.map(t => translateText(t)));
    elements.forEach((el, i) => {
        if (translated[i]) el.textContent = translated[i];
    });

    btn.textContent = 'Visa originalspråk';
    btn.classList.add('active');
    btn.disabled = false;
    readerIsTranslated = true;
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
        const swedishSource = /svt\.se|dn\.se|macworld\.se|feber\.se/i.test(url);
        content.innerHTML = `
            <h1 class="reader-title">${article.title || ''}</h1>
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
async function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Hämta all data parallellt
    await Promise.all([
        fetchNameday(),
        fetchWeather(),
        fetchElectricity(),
        fetchStocks(),
        fetchCalendar(),
        fetchNews(),
        fetchAiNews(),
        fetchPorsche(),
        fetchMacworld(),
        fetchFeber()
    ]);
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
