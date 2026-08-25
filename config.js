// ============================================
// DASHBOARD KONFIGURATION
// ============================================

const CONFIG = {
    // Plats för väder (Hyllinge koordinater)
    weather: {
        lat: 56.1167,
        lon: 12.8167,
        name: "Hyllinge"
    },

    // Google Kalender via iCal (ingen API-nyckel behövs!)
    calendar: {
        icalUrl: "https://calendar.google.com/calendar/ical/sknmh9g9k0tre2pd5jab56nmho%40group.calendar.google.com/private-318e0453381fda1243001d48234c511e/basic.ics",
        enabled: true
    },

    // RSS-proxy för att undvika CORS-problem
    // OBS: cors.eu.org kräver nu allowlist (returnerar 403 host_not_allowed) – använd api.allorigins.win
    // Format: https://api.allorigins.win/raw?url=ENCODED_URL
    corsProxy: "https://api.allorigins.win/raw?url=",

    // Proxy för kalender
    calendarProxy: "https://api.allorigins.win/raw?url=",

    // Svenska nyheter - använder SVT och DN
    newsFeeds: [
        {
            name: "SVT Nyheter",
            url: "https://www.svt.se/nyheter/rss.xml"
        },
        {
            name: "DN",
            url: "https://www.dn.se/rss/"
        }
    ],

    // Macworld Sverige RSS
    macworldFeed: "https://www.macworld.se/feed",

    // AI-nyheter (openai.com/news/rss.xml existerar ej längre – byt till TechCrunch AI)
    aiFeeds: [
        {
            name: "TechCrunch AI",
            url: "https://techcrunch.com/category/artificial-intelligence/feed/",
            className: "openai"
        },
        {
            name: "The Verge AI",
            url: "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml",
            className: "theverge"
        }
    ],
    maxAiNews: 4,

    // Hur många nyheter att visa
    maxNews: 5,
    maxMacworldNews: 2,

    // Matsedel Bonnie (Hyllinge skola via skolmaten.se)
    // Primär: API v4 (skolmaten.se lade ned RSS – Home Assistant-komponenten
    // Kaptensanders/skolmat bytte till API v4, verifierat aktivt feb 2026).
    // client-token är den publika token som skolmaten.se:s egen webb använder.
    // RSS-URL:erna behålls som fallback ifall RSS återuppstår.
    bonnieLunch: {
        school: "hyllinge-skola",
        apiBase: "https://skolmaten.se/api/4/menu/school/",
        clientToken: "web-eaa12e50-c84c-4b4a-9cfe-4e3fcbcd9165",
        feedUrl: "https://skolmaten.se/hyllinge-skola/rss/weeks/",
        feedUrlAlt: "https://skolmaten.se/hyllinge-skola/rss/",
        rss2jsonBase: "https://api.rss2json.com/v1/api.json?rss_url="
    },

    // Koenigsegg-nyheter via Google News RSS (ingen officiell RSS finns på koenigsegg.com)
    koenigseggFeed: "https://news.google.com/rss/search?q=koenigsegg&hl=sv&gl=SE&ceid=SE:sv",
    maxKoenigseggNews: 3
};
