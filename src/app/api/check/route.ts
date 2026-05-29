import { NextRequest, NextResponse } from "next/server";
// Use require() for native Node.js modules — Turbopack handles CJS better than ESM for built-ins
// eslint-disable-next-line @typescript-eslint/no-require-imports
const http2 = require("http2") as typeof import("http2");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zlib = require("zlib") as typeof import("zlib");

export interface CheckResult {
  username: string;
  status: "active" | "not_found" | "blocked" | "error";
  message: string;
  details?: string;
  // Profile stats — present when API call succeeded
  fullName?: string;
  isVerified?: boolean;
  isPrivate?: boolean;
  hasProfilePic?: boolean;
  profilePicUrl?: string;
  followers?: number;
  following?: number;
  posts?: number;
  bio?: string;
}

interface IGUser {
  username?: string;
  full_name?: string;
  biography?: string;
  is_private?: boolean;
  is_verified?: boolean;
  profile_pic_url?: string;
  profile_pic_url_hd?: string;
  has_anonymous_profile_picture?: boolean;
  edge_followed_by?: { count: number };
  edge_follow?: { count: number };
  edge_owner_to_timeline_media?: { count: number };
}

const IG_HEADERS = {
  "x-ig-app-id": "936619743392459",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  accept: "*/*",
  "accept-language": "en-US,en;q=0.9",
  // No accept-encoding — we want plain text JSON, not compressed binary
  origin: "https://www.instagram.com",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
};

/**
 * Make an HTTP/2 GET request. Instagram requires HTTP/2 — Node.js fetch
 * (undici) negotiates HTTP/1.1 and gets 429. This helper uses Node's
 * native http2 module which properly negotiates h2 via ALPN.
 */
function http2Get(
  host: string,
  path: string,
  headers: Record<string, string>,
  timeoutMs = 9000
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error("Request timed out"));
    }, timeoutMs);

    client.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    const req = client.request({
      ":method": "GET",
      ":path": path,
      ":authority": host,
      ":scheme": "https",
      ...headers,
    });

    let status = 0;
    let contentEncoding = "";
    req.on("response", (respHeaders) => {
      // :status comes as a number in http2 response pseudo-headers
      const s = respHeaders[":status"];
      status = typeof s === "number" ? s : parseInt(String(s), 10) || 0;
      contentEncoding = String(respHeaders["content-encoding"] || "").toLowerCase();
    });

    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      clearTimeout(timer);
      client.close();
      const raw = Buffer.concat(chunks);
      // http2 doesn't auto-decompress — we must do it ourselves
      const decompress = (buf: Buffer, encoding: string): Promise<string> =>
        new Promise((res, rej) => {
          if (encoding === "gzip") {
            zlib.gunzip(buf, (e, d) => (e ? rej(e) : res(d.toString("utf8"))));
          } else if (encoding === "deflate") {
            zlib.inflate(buf, (e, d) => (e ? rej(e) : res(d.toString("utf8"))));
          } else if (encoding === "br") {
            zlib.brotliDecompress(buf, (e, d) =>
              e ? rej(e) : res(d.toString("utf8"))
            );
          } else {
            res(buf.toString("utf8"));
          }
        });
      decompress(raw, contentEncoding).then(
        (text) => resolve({ status, body: text }),
        () => resolve({ status, body: raw.toString("utf8") }) // fallback: raw
      );
    });
    req.on("error", (err) => {
      clearTimeout(timer);
      client.destroy();
      reject(err);
    });

    req.end();
  });
}

/**
 * Strategy 1 — Instagram's internal REST API via HTTP/2.
 * Returns full profile JSON when it works.
 * Returns null on 401/403/429 so we fall through to strategy 2.
 */
async function checkViaRestApi(username: string): Promise<CheckResult | null> {
  const path = `/api/v1/users/web_profile_info/?username=${username}`;

  let status: number;
  let body: string;
  try {
    ({ status, body } = await http2Get("i.instagram.com", path, {
      ...IG_HEADERS,
      referer: `https://www.instagram.com/${username}/`,
    }));
    console.log(`[DEBUG] ${username}: http2 status=${status}, bodyLen=${body.length}, snippet=${body.slice(0,80)}`);
  } catch (e) {
    console.log(`[DEBUG] ${username}: http2Get threw:`, String(e));
    return null;
  }

  if (status === 404) {
    return {
      username,
      status: "not_found",
      message: "Account not found",
      details: "This username does not exist on Instagram",
    };
  }

  // status=0 means the :response header event raced with :end — treat as 200
  // if the body looks like valid Instagram JSON
  if (status === 200 || status === 0) {
    let data: { data?: { user?: IGUser } };
    try {
      data = JSON.parse(body);
    } catch {
      return null;
    }

    const user = data?.data?.user;

    if (!user) {
      return {
        username,
        status: "not_found",
        message: "Account not found",
        details: "This account may have been deleted or deactivated",
      };
    }

    // Extract all stats
    const followers = user.edge_followed_by?.count;
    const following = user.edge_follow?.count;
    const posts     = user.edge_owner_to_timeline_media?.count;
    const isPrivate  = user.is_private ?? false;
    const isVerified = user.is_verified ?? false;
    const fullName   = user.full_name || "";
    const bio        = user.biography || "";

    // Detect real vs default avatar
    const picUrl = user.profile_pic_url_hd || user.profile_pic_url || "";
    const isDefaultPic =
      user.has_anonymous_profile_picture === true ||
      picUrl.includes("44884218_345707102189036") ||
      picUrl.includes("default_profile") ||
      picUrl.includes("anonymous_profile_pic") ||
      picUrl.includes("YW5vbnltb3VzX3Byb2ZpbGVfcGlj");
    const hasProfilePic = picUrl.length > 0 && !isDefaultPic;

    let message = "Account is active";
    if (isVerified && !isPrivate) message = "Account is active ✓ Verified";
    else if (isPrivate) message = "Account is active (private)";

    return {
      username,
      status: "active",
      message,
      fullName: fullName || undefined,
      isVerified,
      isPrivate,
      hasProfilePic,
      profilePicUrl: hasProfilePic ? picUrl : undefined,
      followers,
      following,
      posts,
      bio: bio || undefined,
    };
  }

  // 401 / 403 / 429 — blocked/rate-limited, try HTML fallback
  return null;
}

function parseSocialCount(valStr: string): number {
  const cleaned = valStr.trim().replace(/,/g, "").toLowerCase();
  if (cleaned.endsWith("m")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000_000;
  }
  if (cleaned.endsWith("k")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000;
  }
  if (cleaned.endsWith("b")) {
    return parseFloat(cleaned.slice(0, -1)) * 1_000_000_000;
  }
  return parseInt(cleaned, 10) || 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBalancedJsonObject(str: string, startIndex: number): any {
  let openBraces = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
        if (openBraces === 0) {
          const potentialJson = str.slice(startIndex, i + 1);
          try {
            return JSON.parse(potentialJson);
          } catch {
            // ignore and continue
          }
        }
      }
    }
  }
  return null;
}

/**
 * Strategy 2 — HTML page scraping (fallback).
 * Scrapes stats, full name, profile picture, bio, etc. from HTML and script tags.
 */
async function checkViaHtmlPage(username: string): Promise<CheckResult | null> {
  let status: number;
  let body: string;
  try {
    ({ status, body } = await http2Get(
      "www.instagram.com",
      `/${username}/`,
      {
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "accept-encoding": "gzip, deflate, br",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
      },
      12000
    ));
  } catch {
    return null;
  }

  if (status === 404) {
    return {
      username,
      status: "not_found",
      message: "Account not found",
      details: "This username does not exist on Instagram",
    };
  }

  if (status !== 200) return null;

  const html = body;

  const notFoundSignals = [
    "Sorry, this page isn't available",
    "The link you followed may be broken",
    '"logging_page_id":"profilePage_0"',
    '"page_name":"PageNotFound"',
  ];
  for (const signal of notFoundSignals) {
    if (html.includes(signal)) {
      return {
        username,
        status: "not_found",
        message: "Account not found",
        details: "This account does not exist or has been removed",
      };
    }
  }

  // Iterate over all occurrences of "xig_user_by_igid_v2" to locate user metadata JSON
  let pos = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userData: any = null;
  while (true) {
    const foundIdx = html.indexOf('"xig_user_by_igid_v2"', pos);
    if (foundIdx === -1) break;
    
    const startIdx = foundIdx + '"xig_user_by_igid_v2"'.length;
    const firstBraceIdx = html.indexOf('{', startIdx);
    if (firstBraceIdx !== -1) {
      const parsed = extractBalancedJsonObject(html, firstBraceIdx);
      if (parsed && (parsed.follower_count !== undefined || parsed.full_name !== undefined)) {
        userData = parsed;
        break;
      }
    }
    pos = foundIdx + 20;
  }

  // Fallback to individual regex extraction if full JSON parsing failed
  if (!userData) {
    const followerCountMatch = html.match(/"follower_count":\s*(\d+)/);
    const followingCountMatch = html.match(/"following_count":\s*(\d+)/);
    const isVerifiedMatch = html.match(/"is_verified":\s*(true|false)/);
    const isPrivateMatch = html.match(/"is_private":\s*(true|false)/);
    const fullNameMatch = html.match(/"full_name":\s*"([^"]*)"/);
    const bioMatch = html.match(/"biography":\s*"([^"]*)"/);
    const profilePicMatch = html.match(/"profile_pic_url":\s*"([^"]*)"/);

    userData = {
      follower_count: followerCountMatch ? parseInt(followerCountMatch[1], 10) : undefined,
      following_count: followingCountMatch ? parseInt(followingCountMatch[1], 10) : undefined,
      is_verified: isVerifiedMatch ? isVerifiedMatch[1] === "true" : undefined,
      is_private: isPrivateMatch ? isPrivateMatch[1] === "true" : undefined,
      full_name: fullNameMatch ? fullNameMatch[1] : undefined,
      biography: bioMatch ? bioMatch[1] : undefined,
      profile_pic_url: profilePicMatch ? profilePicMatch[1] : undefined,
    };
  }

  if (userData && userData.profile_pic_url) {
    // Unescape unicode characters and backslashes in URL
    userData.profile_pic_url = userData.profile_pic_url.replace(/\\u0025/g, '%').replace(/\\/g, '');
  }

  let followersCount = userData?.follower_count;
  let followingCount = userData?.following_count;
  let postsCount: number | undefined = undefined;

  // Extract from og:description meta tag
  const descRegex = /<meta\s+[^>]*property=["']og:description["']\s+content=["']([^"']+)["']/i || 
                    /<meta\s+content=["']([^"']+)["']\s+[^>]*property=["']og:description["']/i ||
                    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i ||
                    /<meta\s+content=["']([^"']+)["']\s+[^>]*name=["']description["']/i;
  const descMatch = html.match(descRegex);
  if (descMatch) {
    const descContent = descMatch[1];

    if (followersCount === undefined) {
      const followersMatch = descContent.match(/([\d.,KMBm]+)\s*Followers/i);
      if (followersMatch) {
        followersCount = parseSocialCount(followersMatch[1]);
      }
    }

    if (followingCount === undefined) {
      const followingMatch = descContent.match(/([\d.,KMBm]+)\s*Following/i);
      if (followingMatch) {
        followingCount = parseSocialCount(followingMatch[1]);
      }
    }

    const postsMatch = descContent.match(/([\d.,KMBm]+)\s*Posts/i);
    if (postsMatch) {
      postsCount = parseSocialCount(postsMatch[1]);
    }
  }

  const isPrivate = userData?.is_private ?? false;
  const isVerified = userData?.is_verified ?? false;
  const fullName = userData?.full_name || "";
  const bio = userData?.biography || "";
  const picUrl = userData?.profile_pic_url || "";

  const isDefaultPic =
    picUrl.includes("44884218_345707102189036") ||
    picUrl.includes("default_profile") ||
    picUrl.includes("anonymous_profile_pic") ||
    picUrl.includes("YW5vbnltb3VzX3Byb2ZpbGVfcGlj");
  const hasProfilePic = picUrl.length > 0 && !isDefaultPic;

  let message = "Account is active";
  if (isVerified && !isPrivate) message = "Account is active ✓ Verified";
  else if (isPrivate) message = "Account is active (private)";

  // If we couldn't get any stats or user data, fall back to checking basic existence
  if (followersCount === undefined && followingCount === undefined && postsCount === undefined && !fullName) {
    const profilePageMatch = html.match(/"profilePage_(\d+)"/);
    if (profilePageMatch && profilePageMatch[1] !== "0") {
      const isPriv = html.includes('"is_private":true');
      return {
        username,
        status: "active",
        message: isPriv ? "Account is active (private)" : "Account is active",
        details: "Stats unavailable (API rate-limited — try again in a moment)",
      };
    }

    if (
      html.includes(`"username":"${username}"`) ||
      html.includes(`"owner":{"username":"${username}"`)
    ) {
      return {
        username,
        status: "active",
        message: "Account is active",
        details: "Stats unavailable (API rate-limited — try again in a moment)",
      };
    }
    return null;
  }

  return {
    username,
    status: "active",
    message,
    fullName: fullName || undefined,
    isVerified,
    isPrivate,
    hasProfilePic,
    profilePicUrl: hasProfilePic ? picUrl : undefined,
    followers: followersCount,
    following: followingCount,
    posts: postsCount,
    bio: bio || undefined,
  };
}

export async function checkInstagramAccount(username: string): Promise<CheckResult> {
  const apiResult = await checkViaRestApi(username);
  if (apiResult !== null) return apiResult;

  await new Promise((r) => setTimeout(r, 600));

  const htmlResult = await checkViaHtmlPage(username);
  if (htmlResult !== null) return htmlResult;

  return {
    username,
    status: "blocked",
    message: "Unable to check",
    details:
      "Instagram blocked both check attempts. Try again in a minute, or verify at instagram.com/" +
      username,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernames } = body as { usernames?: unknown };

    if (!Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of usernames" },
        { status: 400 }
      );
    }

    const limited = (usernames as string[])
      .slice(0, 50)
      .map((u) => u.trim().toLowerCase())
      .filter((u) => u.length > 0);

    const results: CheckResult[] = [];
    const batchSize = 2;

    for (let i = 0; i < limited.length; i += batchSize) {
      const batch = limited.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((u) => checkInstagramAccount(u))
      );
      results.push(...batchResults);

      if (i + batchSize < limited.length) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
