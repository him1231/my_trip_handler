const HKIA_BASE = "https://www.hongkongairport.com/flightinfo-rest/rest/flights";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetPath = url.pathname.replace(/^\/+/, "");

    if (!targetPath.startsWith("past")) {
      return new Response(JSON.stringify({ error: "Unsupported path" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const targetUrl = `${HKIA_BASE}/${targetPath}?${url.searchParams.toString()}`;
    const response = await fetch(targetUrl, { method: "GET" });

    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
