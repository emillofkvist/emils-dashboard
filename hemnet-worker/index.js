/**
 * Cloudflare Worker – Hemnet-proxy
 *
 * Kör inuti Cloudflares nätverk vilket kringgår Hemnet's Cloudflare-skydd.
 * Returnerar JSON med listings från Hemnet-söksidan.
 *
 * Deploy:
 *   npm install -g wrangler
 *   wrangler login
 *   cd hemnet-worker
 *   wrangler deploy
 *
 * Sätt sedan CONFIG.hemnet.workerUrl i config.js till din Worker-URL.
 * T.ex: "https://hemnet-proxy.ditt-namn.workers.dev"
 */

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
};

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const searchParams = url.searchParams.toString();

        const cache = caches.default;
        const cacheKey = new Request(`https://hemnet-buildid-cache.internal/v1`, request);

        // Hämta (eller cacha) buildId – ändras bara vid Hemnet-deployments
        let buildId;
        const cached = await cache.match(cacheKey);
        if (cached) {
            buildId = await cached.text();
        } else {
            const homeResp = await fetch(
                `https://www.hemnet.se/bostader?${searchParams}`,
                { headers: { 'User-Agent': MOBILE_UA, 'Accept-Language': 'sv-SE,sv;q=0.9' } }
            );
            if (!homeResp.ok) {
                return errResp(`Hemnet HTML: ${homeResp.status}`);
            }
            const html = await homeResp.text();
            const m = html.match(/"buildId":"([^"]+)"/);
            if (!m) return errResp('buildId ej hittad i HTML');
            buildId = m[1];
            ctx.waitUntil(cache.put(cacheKey, new Response(buildId, {
                headers: { 'Cache-Control': 'max-age=1800' }
            })));
        }

        // Hämta JSON-data via _next/data-endpointen
        const dataUrl = `https://www.hemnet.se/_next/data/${buildId}/bostader.json?${searchParams}`;
        const dataResp = await fetch(dataUrl, {
            headers: {
                'User-Agent': MOBILE_UA,
                'Accept': 'application/json',
                'Accept-Language': 'sv-SE,sv;q=0.9',
            }
        });

        if (!dataResp.ok) {
            // buildId kan ha ändrats — rensa cache och be klienten försöka igen
            ctx.waitUntil(cache.delete(cacheKey));
            return errResp(`_next/data: ${dataResp.status} (buildId cachad, försök igen)`);
        }

        const raw = await dataResp.json();
        const apollo = raw.pageProps?.__APOLLO_STATE__ || {};

        const listings = Object.entries(apollo)
            .filter(([k]) => k.startsWith('ListingCard:'))
            .map(([, v]) => ({
                id: v.id,
                streetAddress: v.streetAddress,
                locationDescription: v.locationDescription,
                askingPrice: v.askingPrice,
                rooms: v.rooms,
                area: v.livingAndSupplementalAreas,
                housingForm: v.housingForm?.name ?? '',
                brokerName: v.brokerName,
                brokerAgencyName: v.brokerAgencyName,
                publishedAt: v.publishedAt,
                slug: v.slug,
                thumbnail: v['thumbnails({"format":"ITEMGALLERY_CUT"})']?.[0] ?? null,
            }));

        return new Response(JSON.stringify({ buildId, total: listings.length, listings }), {
            headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' }
        });
    }
};

function errResp(msg) {
    return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: CORS_HEADERS
    });
}
