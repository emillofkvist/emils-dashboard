// ============================================
// MORGON DASHBOARD
// ============================================

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
        // snow1g/v1 ersatte pmp3g/v2 den 31 mars 2026
        const url = `https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/${lon}/lat/${lat}/data.json`;

        const response = await fetch(url);
        const data = await response.json();

        // Första timserien är aktuellt väder
        const current = data.timeSeries[0];
        const d = current.data;

        // Nya parameternamn i snow1g/v1 API
        const temp = Math.round(d.air_temperature);
        const wind = Math.round(d.wind_speed);
        const humidity = Math.round(d.relative_humidity);
        const symbol = d.symbol_code;

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
async function fetchElectricity() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        const url = `https://www.elprisetjustnu.se/api/v1/prices/${year}/${month}-${day}_SE4.json`;
        const response = await fetch(url);
        const data = await response.json();

        // Hitta aktuellt kvartstimspris (sedan okt 2025: 96 poster/dag, 15-min intervall)
        const currentHour = now.getHours();
        const currentQuarter = Math.floor(now.getMinutes() / 15) * 15;
        const currentPrice = data.find(p => {
            const priceTime = new Date(p.time_start);
            return priceTime.getHours() === currentHour && priceTime.getMinutes() === currentQuarter;
        }) || data.find(p => new Date(p.time_start).getHours() === currentHour);

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
            const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?interval=1d&range=2d`;
            const url = `${CONFIG.corsProxy}${encodeURIComponent(targetUrl)}`;
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
            // Stöd både RSS (<item>) och Atom 1.0 (<entry>), t.ex. The Verge använder Atom
            let items = xml.querySelectorAll('item');
            if (items.length === 0) items = xml.querySelectorAll('entry');

            items.forEach((item, index) => {
                if (index < 2) { // Max 2 per källa
                    const title = item.querySelector('title')?.textContent || '';
                    // Atom: <link href="..."/>, RSS: <link>url</link>
                    const linkEl = item.querySelector('link');
                    const link = linkEl?.textContent?.trim() || linkEl?.getAttribute('href') || '';
                    // Atom: <published>/<updated>, RSS: <pubDate>
                    const pubDate = item.querySelector('pubDate')?.textContent ||
                                    item.querySelector('published')?.textContent ||
                                    item.querySelector('updated')?.textContent || '';

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

// Hämta Koenigsegg-nyheter (Google News RSS)
async function fetchKoenigsegg() {
    try {
        const url = `${CONFIG.corsProxy}${encodeURIComponent(CONFIG.koenigseggFeed)}`;
        const response = await fetch(url);
        const text = await response.text();

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');

        const news = [];
        items.forEach((item, index) => {
            if (index < CONFIG.maxKoenigseggNews) {
                // Google News-titlar slutar med " - Källa"; källan finns även i <source>
                let title = item.querySelector('title')?.textContent || '';
                const source = item.querySelector('source')?.textContent || '';
                if (source && title.endsWith(` - ${source}`)) {
                    title = title.slice(0, -(source.length + 3));
                }
                const link = item.querySelector('link')?.textContent || '';
                const pubDate = item.querySelector('pubDate')?.textContent || '';

                news.push({
                    title: title,
                    source: source,
                    link: link,
                    date: new Date(pubDate)
                });
            }
        });

        if (news.length === 0) {
            document.getElementById('koenigsegg').innerHTML = '<div class="loading">Inga nyheter hittades</div>';
            return;
        }

        const html = news.map(item => {
            const timeAgo = getTimeAgo(item.date);
            return `
                <div class="news-item">
                    ${item.source ? `<div class="news-source">${item.source}</div>` : ''}
                    <div class="news-title"><a href="${item.link}" target="_blank">${item.title}</a></div>
                    <div class="news-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        document.getElementById('koenigsegg').innerHTML = html;

    } catch (error) {
        console.error('Koenigsegg-fel:', error);
        document.getElementById('koenigsegg').innerHTML = '<div class="loading">Kunde inte hämta Koenigsegg-nyheter</div>';
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

// ISO-veckonummer (skolmaten.se:s API kräver korrekt ISO 8601-vecka)
function getISOWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return { year: date.getUTCFullYear(), week: week };
}

// Matsedel källa 1+2: skolmaten.se API v4 (direkt eller via CORS-proxy)
// Svar: { WeekState: { Days: [ { date, Meals: [ { name } ] } ] } }
async function bonnieLunchFromApi(useProxy) {
    const { apiBase, school, clientToken } = CONFIG.bonnieLunch;
    const now = new Date();
    // Helg → hämta nästa vecka istället
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const ref = isWeekend ? new Date(now.getTime() + 7 * 86400000) : now;
    const { year, week } = getISOWeek(ref);
    const target = `${apiBase}${school}?year=${year}&week=${week}`;

    const response = useProxy
        ? await fetch(`${CONFIG.corsProxy}${encodeURIComponent(target)}`)
        : await fetch(target, { headers: { 'Accept': 'application/json', 'client-token': clientToken } });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text.trim().startsWith('{')) throw new Error('Ej JSON-svar');
    const data = JSON.parse(text);
    if (!data.WeekState || !Array.isArray(data.WeekState.Days)) throw new Error('Oväntat API-format');

    return data.WeekState.Days.map(day => ({
        date: new Date(day.date),
        meals: (day.Meals || []).map(m => m && m.name).filter(Boolean)
    })).filter(d => !isNaN(d.date) && d.meals.length > 0);
}

// Matsedel källa 3+4: skolmaten.se RSS via rss2json (om RSS:en återuppstår)
async function bonnieLunchFromRss(feedUrl) {
    const { rss2jsonBase } = CONFIG.bonnieLunch;
    const response = await fetch(`${rss2jsonBase}${encodeURIComponent(feedUrl)}`);
    const data = await response.json();
    if (!data || data.status !== 'ok' || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error('rss2json gav inget giltigt svar');
    }
    return data.items.map(item => ({
        date: new Date(item.pubDate),
        meals: (item.description || '')
            .split(/<br\s*\/?>|\n/i)
            .map(s => s.replace(/<[^>]*>/g, '').trim())
            .filter(Boolean)
    })).filter(d => !isNaN(d.date) && d.meals.length > 0);
}

// Hämta matsedel för Bonnie (Hyllinge skola)
async function fetchBonnieLunch() {
    const el = document.getElementById('bonnie-lunch');
    if (!el) return;

    const sources = [
        () => bonnieLunchFromApi(false),                        // API direkt (kräver CORS hos skolmaten)
        () => bonnieLunchFromApi(true),                         // API via allorigins
        () => bonnieLunchFromRss(CONFIG.bonnieLunch.feedUrl),   // RSS /rss/weeks/ via rss2json
        () => bonnieLunchFromRss(CONFIG.bonnieLunch.feedUrlAlt) // RSS /rss/ via rss2json
    ];

    let days = null;
    for (const source of sources) {
        try {
            days = await source();
            if (days) break;
        } catch (error) {
            console.warn('Matsedelkälla misslyckades, provar nästa:', error.message);
        }
    }

    if (!days) {
        el.innerHTML = '<div class="loading">Kunde inte hämta matsedel</div>';
        return;
    }

    // Visa idag (eller nästa skoldag med matsedel) + dagen efter
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const upcoming = days
        .filter(d => d.date >= todayStart)
        .sort((a, b) => a.date - b.date)
        .slice(0, 2);

    if (upcoming.length === 0) {
        el.innerHTML = '<div class="loading">Ingen matsedel publicerad</div>';
        return;
    }

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 86400000);

    const html = upcoming.map(day => {
        let label;
        if (day.date.toDateString() === today.toDateString()) {
            label = 'Idag';
        } else if (day.date.toDateString() === tomorrow.toDateString()) {
            label = 'Imorgon';
        } else {
            label = day.date.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' });
            label = label.charAt(0).toUpperCase() + label.slice(1);
        }
        const meals = day.meals.map(m => `<div class="lunch-meal">${m}</div>`).join('');
        return `<div class="lunch-week">${label}</div>${meals}`;
    }).join('<div style="height:10px"></div>');

    el.innerHTML = html;
}

// Starta dashboard
async function init() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Hämta all data parallellt
    await Promise.all([
        fetchWeather(),
        fetchElectricity(),
        fetchStocks(),
        fetchCalendar(),
        fetchNews(),
        fetchAiNews(),
        fetchMacworld(),
        fetchBonnieLunch(),
        fetchKoenigsegg()
    ]);
}

// Kör när sidan laddas
document.addEventListener('DOMContentLoaded', init);
