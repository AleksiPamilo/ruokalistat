import type { DayMenu, MenuApiResponse, RestaurantMenu } from "../types";

interface Env {}

interface CompassMeal {
  name: string;
  diets?: string[];
}
interface CompassMenuPackage {
  name: string;
  meals: CompassMeal[];
}
interface CompassDay {
  dayOfWeek: string;
  date: string;
  menuPackages: CompassMenuPackage[];
}
interface CompassWeekResponse {
  weekNumber: number;
  menus: CompassDay[];
}

interface JamixMenuItem {
  name: string;
  orderNumber: number;
  diets?: string;
}
interface JamixMealOption {
  name: string;
  orderNumber: number;
  menuItems: JamixMenuItem[];
}
interface JamixDay {
  date: number;
  weekday: number;
  mealoptions: JamixMealOption[];
}
interface JamixMenu {
  days: JamixDay[];
}
interface JamixMenuType {
  menus: JamixMenu[];
}
interface JamixKitchen {
  menuTypes: JamixMenuType[];
}

function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toYYYYMMDD(d: Date): number {
  return parseInt(toISODate(d).replace(/-/g, ""), 10);
}

function weekdayLabel(d: Date): string {
  return d.toLocaleDateString("fi-FI", { weekday: "long", timeZone: "UTC" });
}

async function handleMenu(): Promise<Response> {
  const now = new Date();
  const helsinkiDateStr = now.toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" });
  const today = parseISODate(helsinkiDateStr);

  const isoDow = (today.getUTCDay() + 6) % 7;
  const weekStart = addDays(today, -isoDow);
  const weekEnd = addDays(weekStart, 6);
  const weekStartInt = toYYYYMMDD(weekStart);
  const weekEndInt = toYYYYMMDD(weekEnd);

  const JAMIX_URL = "https://fi.jamix.cloud/apps/menuservice/rest/haku/menu/93077/79?lang=fi";
  const COMPASS_URL = `https://www.compass-group.fi/menuapi/week-menus?costCenter=0083&date=${helsinkiDateStr}&language=fi`;

  const [jamixRes, compassRes] = await Promise.allSettled([
    fetch(JAMIX_URL),
    fetch(COMPASS_URL)
  ]);

  let jamixMenu: RestaurantMenu = {
    id: "jamix-kamu",
    name: "Ravintola Kamu",
    sourceUrl: "https://fi.jamix.cloud/apps/menu/?anro=93077&k=79&mt=56",
    isOpen: false,
    days: []
  };

  if (jamixRes.status === "fulfilled" && jamixRes.value.ok) {
    try {
      const data = (await jamixRes.value.json()) as JamixKitchen[];
      const days = data[0]?.menuTypes[0]?.menus[0]?.days || [];
      const weekDays = days.filter(d => d.date >= weekStartInt && d.date <= weekEndInt);

      const mappedDays: DayMenu[] = weekDays
        .map(d => {
          const dateStr = String(d.date);
          const date = new Date(Date.UTC(
            parseInt(dateStr.slice(0, 4), 10),
            parseInt(dateStr.slice(4, 6), 10) - 1,
            parseInt(dateStr.slice(6, 8), 10)
          ));
          const categories = (d.mealoptions || [])
            .filter(opt => opt.name.trim().toLowerCase() !== "info!")
            .map(opt => ({
              title: opt.name,
              items: (opt.menuItems || []).map(item => ({
                name: item.name,
                diets: item.diets ? item.diets.split(",").map(s => s.trim()) : []
              }))
            }))
            .filter(c => c.items.length > 0);
          return { date: toISODate(date), weekday: weekdayLabel(date), categories };
        })
        .filter(d => d.categories.length > 0);

      if (mappedDays.length > 0) {
        jamixMenu.isOpen = true;
        jamixMenu.days = mappedDays;
      } else {
        jamixMenu.message = "No menu available for this week.";
      }
    } catch {
      jamixMenu.message = "Error parsing Jamix feed.";
    }
  } else {
    jamixMenu.message = "Failed to load Jamix data.";
  }

  let compassMenu: RestaurantMenu = {
    id: "compass-opetustalo",
    name: "Opetustalo",
    sourceUrl: "https://www.compass-group.fi/ravintolat-ja-ruokalistat/foodco/kaupungit/helsinki/opetustalo/",
    isOpen: false,
    days: []
  };

  if (compassRes.status === "fulfilled" && compassRes.value.ok) {
    try {
      const data = (await compassRes.value.json()) as CompassWeekResponse;

      const mappedDays: DayMenu[] = (data.menus || [])
        .map(d => {
          const date = parseISODate(d.date.slice(0, 10));
          const categories = (d.menuPackages || [])
            .map(pkg => ({
              title: pkg.name,
              items: (pkg.meals || []).map(meal => ({
                name: meal.name.trim(),
                diets: meal.diets || []
              }))
            }))
            .filter(c => c.items.length > 0);
          return { date: toISODate(date), weekday: weekdayLabel(date), categories };
        })
        .filter(d => d.categories.length > 0);

      if (mappedDays.length > 0) {
        compassMenu.isOpen = true;
        compassMenu.days = mappedDays;
      } else {
        compassMenu.message = "No menu available for this week.";
      }
    } catch {
      compassMenu.message = "Error parsing Compass feed.";
    }
  } else {
    compassMenu.message = "Failed to load Compass data.";
  }

  const payload: MenuApiResponse = {
    date: helsinkiDateStr,
    updatedAt: new Date().toISOString(),
    restaurants: [jamixMenu, compassMenu]
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=1800, s-maxage=1800"
    }
  });
}

function isSameOriginRequest(request: Request, workerOrigin: string): boolean {
  const secFetchSite = request.headers.get("Sec-Fetch-Site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "none";
  }
  const origin = request.headers.get("Origin");
  if (origin) {
    return origin === workerOrigin;
  }
  return true;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/menu") {
      if (!isSameOriginRequest(request, url.origin)) {
        return new Response("Forbidden", { status: 403 });
      }
      return handleMenu();
    }
    return new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
