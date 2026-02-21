// ============================================
// DASHBOARD KONFIGURATION
// ============================================

const CONFIG = {
    // Philips Hue
    hue: {
        bridgeIp: "192.168.1.3",
        username: "", // Fylls i efter setup
        kitchenLightId: "" // Fylls i efter att vi hittat rätt lampa
    },

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
    corsProxy: "https://api.allorigins.win/raw?url=",

    // Alternativ proxy för kalender (vissa proxies fungerar bättre för olika tjänster)
    calendarProxy: "https://corsproxy.io/?",

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

    // AI-nyheter
    aiFeeds: [
        {
            name: "OpenAI",
            url: "https://openai.com/news/rss.xml",
            className: "openai"
        },
        {
            name: "The Verge AI",
            url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
            className: "theverge"
        }
    ],
    maxAiNews: 4,

    // Porsche nyheter via Google News RSS
    porscheFeed: "https://news.google.com/rss/search?q=Porsche&hl=en",
    maxPorscheNews: 3,

    // Hur många nyheter att visa
    maxNews: 5,
    maxMacworldNews: 2
};
