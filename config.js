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
    // OBS: allorigins.win är nere (522-fel) – använd corsproxy.io
    corsProxy: "https://corsproxy.io/?",

    // Proxy för kalender
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

    // AI-nyheter (openai.com/news/rss.xml existerar ej längre – byt till TechCrunch AI)
    aiFeeds: [
        {
            name: "TechCrunch AI",
            url: "https://techcrunch.com/category/artificial-intelligence/feed/",
            className: "openai"
        },
        {
            name: "The Verge AI",
            url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
            className: "theverge"
        }
    ],
    maxAiNews: 4,

    // Hur många nyheter att visa
    maxNews: 5,
    maxMacworldNews: 2
};
