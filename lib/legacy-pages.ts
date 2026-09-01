import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://www.pasadenashadesandshutters.com';
const MIRROR_ROOT = path.join(process.cwd(), 'content', 'mirror');

const KNOWN_ROUTES = [
  '',
  'about-us.php',
  'ca-shutters',
  'ca-shutters/altadena-shutters.php',
  'ca-shutters/arcadia-shutters.php',
  'ca-shutters/burbank-shutters.php',
  'ca-shutters/echo-park-shutters.php',
  'ca-shutters/glendale-shutters.php',
  'ca-shutters/la-canada-shutters.php',
  'ca-shutters/la-crescenta-shutters.php',
  'ca-shutters/los-angeles-shutters.php',
  'ca-shutters/monrovia-shutters.php',
  'ca-shutters/montrose-shutters.php',
  'ca-shutters/pasadena-shutters.php',
  'ca-shutters/san-marino-shutters.php',
  'ca-shutters/silverlake-shutters.php',
  'ca-shutters/south-pasadena-shutters.php',
  'ca-shutters/sun-valley-shutters.php',
  'ca-shutters/sunland-shutters.php',
  'ca-shutters/toluca-lake-shutters.php',
  'contact-us.php',
  'faqs.php',
  'faux-wood-blinds-pasadena.php',
  'feedback.php',
  'newsletter.php',
  'our-services.php',
  'pasadena-shades.php',
  'pasadena-shutters',
  'pasadena-shutters.php',
  'pasadena-shutters/category/window-treatments',
  'pasadena-shutters/window-treatments/3-amazing-benefits-of-faux-wood-blinds',
  'pasadena-shutters/window-treatments/5-great-tips-for-buying-window-covering',
  'pasadena-shutters/window-treatments/6-tips-purchasing-great-shades-shutters-blinds',
  'pasadena-shutters/window-treatments/blinds-shutters-shades-know-difference',
  'pasadena-shutters/window-treatments/youll-love-your-woven-wood-shades-for-these-3-reasons',
  'pasadena-window-treatments.php',
  'pasadena-wood-blinds.php',
  'polycore-shutters-pasadena.php',
  'privacy.php',
  'shutter-projects',
  'shutter-projects/motorized-roller-shades-on-las-flores-dr-in-glendale-ca.php',
  'shutter-projects/motorized-roller-shades-on-madeline-dr-in-pasadena-ca.php',
  'shutter-projects/norman-woodlore-plantation-shutters-on-oak-knoll-gardens-dr-in-pasadena-ca.php',
  'shutter-projects/pinch-pleated-drapes-track-traverse-rods-under-cornice-hillard-ave-la-canada-flintridge-ca.php',
  'shutter-projects/woven-wood-shades-on-toluca-estates-dr-in-toluca-lake-ca.php',
  'sitemap.php',
  'specials.php',
  'terms.php',
  'testimonials.php',
  'videos.php',
  'woven-wood-shades-pasadena.php',
];

type LegacyMeta = {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogImage?: string;
};

export type LegacyPage = {
  routePath: string;
  sourcePath: string;
  html: string;
  meta: LegacyMeta;
};

type PageDraft = {
  heading: string;
  title: string;
  description: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

const PAGE_TITLES: Record<string, string> = {
  'about-us.php': 'Learn About Your Pasadena Shutter Company',
  'specials.php': 'Pasadena Shutter Company Specials | Pasadena Shades & Shutters Specials',
  'pasadena-shutters.php': 'Pasadena Shutters | Window Treatments Pasadena, CA',
  'polycore-shutters-pasadena.php': 'Pasadena Polycore Shutters | Polycore Shutter Installation Pasadena',
  'pasadena-wood-blinds.php': 'Pasadena Wood Blinds | Wood Blinds Pasadena, CA',
  'faux-wood-blinds-pasadena.php': 'Faux Wood Blinds Pasadena, CA | Window Coverings in Pasadena',
  'pasadena-shades.php': 'Shades Pasadena, CA | Pasadena Window Coverings',
  'woven-wood-shades-pasadena.php': 'Pasadena Woven Wood Shades | Shades in Pasadena, CA',
  'pasadena-window-treatments.php': 'Window Treatments in Pasadena | Pasadena Window Coverings',
  'pasadena-shutters': 'Pasadena Shades & Shutters | Shutter Articles',
  'pasadena-shutters/category/window-treatments': 'Window Treatments Archives - Pasadena Shades & Shutters',
  'pasadena-shutters/window-treatments/3-amazing-benefits-of-faux-wood-blinds': '3 Amazing Benefits Of Faux Wood Blinds - Pasadena Shades & Shutters',
  'pasadena-shutters/window-treatments/5-great-tips-for-buying-window-covering': '5 Great Tips for Buying Window Covering | Pasadena Shades & Shutters',
  'pasadena-shutters/window-treatments/6-tips-purchasing-great-shades-shutters-blinds': 'Purchasing Great Shades, Shutters or Blinds | Pasadena Shades & Shutters',
  'pasadena-shutters/window-treatments/blinds-shutters-shades-know-difference': 'Blinds, Shutters, Shades: Know The Difference | Pasadena Shades & Shutters',
  'pasadena-shutters/window-treatments/youll-love-your-woven-wood-shades-for-these-3-reasons': 'Reasons to Love Woven Wood Shades | Pasadena Window Coverings',
};

const PRODUCT_DRAFTS: Record<string, PageDraft> = {
  'pasadena-shutters.php': {
    heading: 'Quality Pasadena Shutters At Great Prices',
    title: PAGE_TITLES['pasadena-shutters.php'],
    description: 'Pasadena Shades & Shutters offers custom shutters, plantation shutters, and shutter installation for Pasadena homes and businesses.',
    intro: 'When you want quality shutters for your home or business, look no further than Pasadena Shades & Shutters. We offer long-lasting shutters at affordable value, with custom designer options that enhance your room with style and elegance.',
    sections: [
      { heading: 'Innovative Engineering', body: 'Pasadena Shades & Shutters works with dependable shutter products made for daily use in homes and offices. The old page emphasized sturdy construction, reinforced support, durable materials, and shutters built to last.' },
      { heading: 'Enjoy our Huge Selection of Shutters', body: 'Every home is different, so the page focused on custom sizing, style, color, make, and finish. The intent was to help homeowners match shutters to the room, the architecture, and the amount of light and privacy they need.' },
      { heading: 'Benefits of Shutters', body: 'The original indexed copy highlighted affordable value, instant comfort, room or office enhancement, long-lasting durability, privacy, and protection. Custom shutters help cover windows cleanly while giving the room a finished appearance.' },
    ],
  },
  'polycore-shutters-pasadena.php': {
    heading: 'Pasadena Polycore Shutters',
    title: PAGE_TITLES['polycore-shutters-pasadena.php'],
    description: 'Pasadena Shades & Shutters installs Polycore shutters for Pasadena homeowners looking for durable, attractive window coverings.',
    intro: 'Polycore shutters offer function, room appeal, and practical durability for Pasadena homes. This replacement page preserves the legacy product intent from the sitemap title and product navigation.',
    sections: [
      { heading: 'Durable Shutter Construction', body: 'Polycore shutters are positioned as a strong, low-maintenance shutter option for rooms that need dependable light control and lasting performance.' },
      { heading: 'Custom Fit and Finish', body: 'Pasadena Shades & Shutters helps select shutter size, finish, louver style, and design details so the final installation fits the room instead of feeling store bought.' },
      { heading: 'Professional Installation', body: 'The product page belongs in the same legacy service flow as the rest of the site: consultation, product selection, measurement, and installation for local homes.' },
    ],
  },
  'pasadena-wood-blinds.php': {
    heading: 'Pasadena Wood Blinds',
    title: PAGE_TITLES['pasadena-wood-blinds.php'],
    description: 'Pasadena Shades & Shutters provides wood blinds and window blind installation for Pasadena, CA homes.',
    intro: 'Wood blinds bring a natural, elegant finish to Pasadena homes. The original site positioned wood blinds as an attractive, eye-catching way to add warmth while maintaining light control.',
    sections: [
      { heading: 'Natural Elegance', body: 'Wood blinds suit homeowners who want a classic window covering with a warmer look than metal or vinyl alternatives. They can complement traditional and modern interiors.' },
      { heading: 'Custom Color and Style', body: 'The legacy product flow emphasized selecting the product, color, style, and features. Wood blinds can be matched to trim, flooring, furniture, or the overall room design.' },
      { heading: 'Measured and Installed', body: 'A professional fit matters with wood blinds. Pasadena Shades & Shutters can help with measurements, product choices, and installation details.' },
    ],
  },
  'faux-wood-blinds-pasadena.php': {
    heading: 'Faux Wood Blinds Pasadena, CA',
    title: PAGE_TITLES['faux-wood-blinds-pasadena.php'],
    description: 'Faux wood blinds from Pasadena Shades & Shutters provide a durable window covering option for Pasadena homes.',
    intro: 'Faux wood blinds provide the look of wood with practical durability. This inferred page follows the original title and site structure for homeowners comparing blinds, shutters, shades, and other window coverings.',
    sections: [
      { heading: 'A Practical Wood-Look Option', body: 'Faux wood blinds are useful where homeowners want a clean, classic appearance with materials that can stand up to regular use.' },
      { heading: 'Light Control and Privacy', body: 'Like the rest of the product pages, this route should help visitors understand how the product controls sunlight, privacy, and room comfort.' },
      { heading: 'Window Coverings in Pasadena', body: 'Pasadena Shades & Shutters serves Pasadena and nearby communities with product guidance and installation for custom window treatments.' },
    ],
  },
  'pasadena-shades.php': {
    heading: 'Shades Pasadena, CA',
    title: PAGE_TITLES['pasadena-shades.php'],
    description: 'Pasadena Shades & Shutters offers window shades for Pasadena homes, including style, color, privacy, and light-control options.',
    intro: 'Window shades can enhance privacy, soften incoming sunlight, and give a room a finished look. The original homepage described shades as available in several options including function, style, color, and ease of maintenance.',
    sections: [
      { heading: 'Style and Sun Control', body: 'Shades help control glare and sunlight while supporting the design of the room. Pasadena Shades & Shutters helps homeowners compare fabrics, colors, and operating styles.' },
      { heading: 'Comfort for Home or Office', body: 'The legacy copy positioned shades for both home and office windows, with practical benefits for sunlight, privacy, and everyday comfort.' },
      { heading: 'Custom Options', body: 'Customers can choose shade type, color, style, and features including remote or wall-controlled options where appropriate.' },
    ],
  },
  'woven-wood-shades-pasadena.php': {
    heading: 'Pasadena Woven Wood Shades',
    title: PAGE_TITLES['woven-wood-shades-pasadena.php'],
    description: 'Pasadena Shades & Shutters installs woven wood shades and natural shade products for homes in Pasadena, CA.',
    intro: 'Woven wood shades bring a natural texture to a room while still supporting privacy and light control. This inferred page preserves the route and product focus from the legacy sitemap and homepage article links.',
    sections: [
      { heading: 'Natural Materials', body: 'The old site referenced woven wood and bamboo as popular natural materials that create an authentic look and can be an eco-friendly design choice.' },
      { heading: 'Roman Shade Style', body: 'Project copy on the old site described woven wood natural Roman shades with valances and cordless lift operation, which fits the product intent for this page.' },
      { heading: 'Designed for Your Room', body: 'Pasadena Shades & Shutters helps match woven woods to the room style, privacy needs, and desired amount of filtered light.' },
    ],
  },
  'pasadena-window-treatments.php': {
    heading: 'Great Selection Of Modern Window Treatments in Pasadena',
    title: PAGE_TITLES['pasadena-window-treatments.php'],
    description: 'Pasadena Shades & Shutters provides modern window treatments in Pasadena, including window film, curtains, drapes, motorized features, and custom coverings.',
    intro: 'One of the great benefits of partnering with Pasadena Shades & Shutters is that you get a wide array of options available to you. In addition to shades, shutters, and blinds, the old page described contemporary and traditional window treatments as creative alternatives.',
    sections: [
      { heading: 'Modern Window Film', body: 'Window film can preserve a view while filtering the amount of sunlight and heat entering the room. It can supplement a current window covering and create a clean contemporary feel.' },
      { heading: 'Luxurious Curtains and Drapes', body: 'The indexed legacy copy described drapes and curtains as a timeless classic, with traditional elegant patterns and bolder modern curtain options available in different shapes and sizes.' },
      { heading: 'New Window Treatment Features', body: 'The old page highlighted organic materials, motorized operation, remote controls, and wall controls as modern features that can give window treatments an added touch.' },
    ],
  },
};

const ARTICLE_DRAFTS: Record<string, PageDraft> = {
  'pasadena-shutters/window-treatments/3-amazing-benefits-of-faux-wood-blinds': articleDraft(
    '3 Amazing Benefits Of Faux Wood Blinds',
    PAGE_TITLES['pasadena-shutters/window-treatments/3-amazing-benefits-of-faux-wood-blinds'],
    'Faux wood blinds are a practical choice for homeowners comparing window blind options because they combine a wood-style appearance with durability and easier maintenance.',
    ['Durable Materials', 'Wood-Look Style', 'A Practical Value']
  ),
  'pasadena-shutters/window-treatments/5-great-tips-for-buying-window-covering': articleDraft(
    '5 Great Tips for Buying Window Covering',
    PAGE_TITLES['pasadena-shutters/window-treatments/5-great-tips-for-buying-window-covering'],
    'Buying window coverings is easier when homeowners compare product type, color, style, features, and installation needs before ordering.',
    ['Pick the Product First', 'Match Color and Style', 'Plan for Installation']
  ),
  'pasadena-shutters/window-treatments/6-tips-purchasing-great-shades-shutters-blinds': articleDraft(
    'Purchasing Great Shades, Shutters or Blinds',
    PAGE_TITLES['pasadena-shutters/window-treatments/6-tips-purchasing-great-shades-shutters-blinds'],
    'The old article route is preserved for visitors researching how to choose between shades, shutters, and blinds for a Pasadena home.',
    ['Compare Light Control', 'Think About Daily Use', 'Ask for Product Guidance']
  ),
  'pasadena-shutters/window-treatments/blinds-shutters-shades-know-difference': articleDraft(
    'Blinds, Shutters, Shades: Know The Difference',
    PAGE_TITLES['pasadena-shutters/window-treatments/blinds-shutters-shades-know-difference'],
    'Blinds, shutters, and shades each solve light, privacy, and design needs differently. The replacement page preserves the educational intent of the legacy article.',
    ['Blinds', 'Shutters', 'Shades']
  ),
  'pasadena-shutters/window-treatments/youll-love-your-woven-wood-shades-for-these-3-reasons': articleDraft(
    'Reasons to Love Woven Wood Shades',
    PAGE_TITLES['pasadena-shutters/window-treatments/youll-love-your-woven-wood-shades-for-these-3-reasons'],
    'Woven wood shades can provide natural texture, filtered light, and a warmer custom look for Pasadena homes and businesses.',
    ['Natural Texture', 'Filtered Light', 'Custom Room Appeal']
  ),
};

export function listLegacyPages(): LegacyPage[] {
  const byRoute = new Map<string, LegacyPage>();

  walk(MIRROR_ROOT, (filePath) => {
    if (!filePath.endsWith('index.html')) return;
    if (fs.statSync(filePath).size === 0) return;
    const routePath = routePathFromFile(filePath);
    const html = fs.readFileSync(filePath, 'utf8');
    byRoute.set(routePath, {
      routePath,
      sourcePath: filePath,
      html: transformHtml(html, routePath),
      meta: extractMeta(html),
    });
  });

  for (const routePath of KNOWN_ROUTES) {
    if (!byRoute.has(routePath)) byRoute.set(routePath, buildFallbackPage(routePath));
  }

  return [...byRoute.values()].sort((a, b) => a.routePath.localeCompare(b.routePath));
}

export function getLegacyPage(slug?: string[]): LegacyPage | null {
  const routePath = normalizeRoutePath(slug?.join('/') ?? '');
  const filePath = filePathFromRoute(routePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    const html = fs.readFileSync(filePath, 'utf8');
    return { routePath, sourcePath: filePath, html: transformHtml(html, routePath), meta: extractMeta(html) };
  }

  if (KNOWN_ROUTES.includes(routePath)) return buildFallbackPage(routePath);
  return null;
}

export function routeToUrl(routePath: string): string {
  if (!routePath) return SITE_URL + '/';
  const suffix = routePath.endsWith('.php') ? '' : '/';
  return SITE_URL + '/' + routePath + suffix;
}

function buildFallbackPage(routePath: string): LegacyPage {
  const draft = draftForRoute(routePath);
  return {
    routePath,
    sourcePath: 'generated:known-route-fallback',
    html: buildLegacyShell(draft, routePath),
    meta: {
      title: draft.title,
      description: draft.description,
      keywords: keywordsForRoute(routePath),
      ogTitle: 'Pasadena Shades & Shutters | Montrose, CA',
      ogImage: 'https://www.pasadenashadesandshutters.com/images/logo.png',
    },
  };
}

function draftForRoute(routePath: string): PageDraft {
  if (PRODUCT_DRAFTS[routePath]) return PRODUCT_DRAFTS[routePath];
  if (ARTICLE_DRAFTS[routePath]) return ARTICLE_DRAFTS[routePath];

  if (routePath === 'about-us.php') {
    return {
      heading: 'Experienced Shades, Shutters & Blinds Professionals in Pasadena',
      title: PAGE_TITLES['about-us.php'],
      description: 'Learn about Pasadena Shades & Shutters, a Pasadena shutter company specializing in custom shades, shutters, blinds, and window treatments.',
      intro: 'At Pasadena Shades & Shutters our vision is clear. We specialize in helping homeowners find the perfect shutters, shades, or blinds that reflect their personal taste and add the right finishing touch to a room.',
      sections: [
        { heading: 'Custom Window Treatment At Your Fingertips', body: 'The indexed legacy page described the company as an alternative to generic department-store products, focused on opening up a world of options and helping customers choose window treatments designed around their homes.' },
        { heading: 'Our Line Of Products', body: 'Pasadena Shades & Shutters carries shutters, shades, blinds, woven woods, draperies, and other window coverings from reputable manufacturers, with product choices guided by quality, construction, and design.' },
        { heading: 'Personalized Consultation', body: 'The original page emphasized spending time with each client, learning their taste and desired style, reviewing available products, and narrowing choices to the right custom treatment.' },
      ],
    };
  }

  if (routePath === 'specials.php') {
    return {
      heading: 'Pasadena Shutter Company Specials',
      title: PAGE_TITLES['specials.php'],
      description: 'View Pasadena Shades & Shutters specials for shutters, blinds, shades, and custom window treatments in Pasadena and nearby communities.',
      intro: 'This legacy specials route is preserved for visitors looking for current offers from Pasadena Shades & Shutters.',
      sections: [
        { heading: 'Window Treatment Offers', body: 'The original route was listed as the specials page for the Pasadena shutter company. The live source currently errors, so this replacement keeps the page available and routes visitors toward consultation.' },
        { heading: 'Products Included', body: 'Visitors can ask about offers on shutters, Polycore shutters, wood blinds, faux wood blinds, shades, woven wood shades, draperies, and other window treatments.' },
      ],
    };
  }

  if (routePath.startsWith('ca-shutters/') && routePath.endsWith('.php')) {
    const city = titleCase(routePath.split('/').pop()!.replace('-shutters.php', '').replace(/-/g, ' '));
    return serviceAreaDraft(routePath, city);
  }

  if (routePath === 'pasadena-shutters') {
    return {
      heading: 'Pasadena Shades & Shutters Articles',
      title: PAGE_TITLES[routePath],
      description: 'Read articles from Pasadena Shades & Shutters about shutters, blinds, shades, and window treatment tips for local homeowners.',
      intro: 'This archive preserves the legacy article section linked from the old site footer and sitemap.',
      sections: [
        { heading: 'Window Treatment Articles', body: 'The archive includes guidance about faux wood blinds, buying window coverings, choosing great shades, shutters, or blinds, understanding product differences, and woven wood shades.' },
        { heading: 'Pasadena Window Covering Guidance', body: 'Each article route remains available so old internal links and search results continue to resolve in the Next.js mirror.' },
      ],
    };
  }

  if (routePath === 'pasadena-shutters/category/window-treatments') {
    return {
      heading: 'Window Treatments Archives',
      title: PAGE_TITLES[routePath],
      description: 'Window treatment article archive for Pasadena Shades & Shutters.',
      intro: 'This category archive preserves the legacy WordPress-style window treatments category URL.',
      sections: [
        { heading: 'Articles in This Category', body: 'Topics include faux wood blinds, buying window coverings, shades, shutters, blinds, and woven wood shades for Pasadena homes.' },
        { heading: 'Legacy URL Preserved', body: 'The source route currently returns a server error, so this page is inferred from the captured sitemap title and linked article routes.' },
      ],
    };
  }

  return genericDraft('Pasadena Shades & Shutters', PAGE_TITLES[routePath] || 'Pasadena Shades & Shutters | Montrose, CA', 'Pasadena Shades & Shutters provides shutters, blinds, shades, and custom window treatments in Pasadena and nearby service areas.', 'This route was known to the old site crawl and is preserved in the Next.js migration baseline.');
}

function serviceAreaDraft(routePath: string, city: string): PageDraft {
  const title = PAGE_TITLES[routePath] || `${city} Shutters - Window Blinds ${city}, CA`;
  return {
    heading: `${city} Shutters - Window Blinds ${city}, CA`,
    title,
    description: `Pasadena Shades & Shutters provides shutters, blinds, shades, and custom window treatments for homeowners in ${city}, CA.`,
    intro: `If you are looking for shutters, blinds, shades, or custom window treatments in ${city}, Pasadena Shades & Shutters can help you choose products that fit your home, light-control needs, privacy goals, and style.`,
    sections: [
      { heading: `Custom Window Treatments in ${city}`, body: `The legacy service-area route was listed in the captured sitemap as "${title}". This inferred page keeps that local search intent and mirrors the old site's service-area pattern.` },
      { heading: 'Shutters, Blinds, and Shades', body: 'Homeowners can explore plantation shutters, Polycore shutters, wood blinds, faux wood blinds, shades, woven wood shades, and other window treatment options.' },
      { heading: 'Local Consultation', body: `Pasadena Shades & Shutters serves ${city} and nearby communities with product guidance, measurement, and professional installation.` },
    ],
  };
}

function articleDraft(heading: string, title: string, intro: string, sectionHeadings: string[]): PageDraft {
  return {
    heading,
    title,
    description: `${heading} from Pasadena Shades & Shutters, covering window treatments, shutters, blinds, and shades for Pasadena homes.`,
    intro,
    sections: sectionHeadings.map((sectionHeading) => ({
      heading: sectionHeading,
      body: `This section is inferred from the legacy article title and the surrounding Pasadena Shades & Shutters product guidance. It preserves the topic, route, and internal-link value while the source WordPress page is unavailable.`,
    })),
  };
}

function genericDraft(heading: string, title: string, description: string, intro: string): PageDraft {
  return {
    heading,
    title,
    description,
    intro,
    sections: [
      { heading: 'Local Window Treatment Service', body: 'Pasadena Shades & Shutters serves Pasadena, Montrose, Glendale, La Canada, South Pasadena, San Marino, Arcadia, and surrounding communities.' },
      { heading: 'Schedule a Consultation', body: 'Call 818-618-5288 or use the contact page to request help with shutters, blinds, shades, draperies, and other custom window treatments.' },
    ],
  };
}

function productName(routePath: string): string | null {
  const products: Record<string, string> = {
    'pasadena-shutters.php': 'Shutters',
    'polycore-shutters-pasadena.php': 'Polycore Shutters',
    'pasadena-wood-blinds.php': 'Wood Blinds',
    'faux-wood-blinds-pasadena.php': 'Faux Wood Blinds',
    'pasadena-shades.php': 'Shades',
    'woven-wood-shades-pasadena.php': 'Woven Wood Shades',
    'pasadena-window-treatments.php': 'Other Window Treatments',
  };
  return products[routePath] ?? null;
}

function keywordsForRoute(routePath: string): string {
  const base = ['Pasadena Shades & Shutters', 'Pasadena Shutter Company', 'window treatments Pasadena', 'shutters', 'blinds', 'shades'];
  const product = productName(routePath);
  if (product) base.push(product, `${product} Pasadena`);
  if (routePath.startsWith('ca-shutters/')) base.push(titleCase(routePath.split('/').pop()!.replace('-shutters.php', '').replace(/-/g, ' ')), 'service area');
  return base.join(', ');
}

function buildLegacyShell(draft: PageDraft, routePath: string): string {
  const sections = draft.sections.map((section) => `<h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p>`).join('');
  return `<div id="shadow-wrap" class="section">${legacyHeader()}<div id="body-wrap" class="wrap clearboth"><div id="body-top" class="section"></div><div id="body" class="section"><div id="content" class="twelve"><div id="breadcrumb" class="hide-from-mobile"><ul itemscope itemtype="http://schema.org/BreadcrumbList"><li itemprop="itemListElement" itemscope itemtype="http://schema.org/ListItem"><a itemprop="item" href="/"><span itemprop="name">Home</span></a><meta itemprop="position" content="1" /></li><li itemprop="itemListElement" itemscope itemtype="http://schema.org/ListItem"><a itemprop="item" href="/${routePath}"><span itemprop="name">${escapeHtml(draft.heading)}</span></a><meta itemprop="position" content="2" /></li></ul></div><h1>${escapeHtml(draft.heading)}</h1><p>${escapeHtml(draft.intro)}</p>${sections}<div class="highlight-box"><h2>Services We Provide in Pasadena</h2><ul><li><a href="/pasadena-shutters.php">Shutters</a></li><li><a href="/polycore-shutters-pasadena.php">Polycore Shutters</a></li><li><a href="/pasadena-wood-blinds.php">Wood Blinds</a></li><li><a href="/faux-wood-blinds-pasadena.php">Faux Wood Blinds</a></li><li><a href="/pasadena-shades.php">Shades</a></li><li><a href="/woven-wood-shades-pasadena.php">Woven Wood Shades</a></li></ul></div><h3>If you are looking for a Pasadena Shutter Company then please call <a href="tel:+1-818-618-5288">818-618-5288</a> or complete our <a href="/contact-us.php">online request form</a>.</h3></div>${legacySidebar()}</div><div id="body-bottom" class="section"></div></div></div>${legacyFooter()}`;
}

function legacyHeader(): string {
  return `<div id="header-background" class="section"><div id="header-wrap" class="wrap clearboth"><div id="header" class="section"><img src="/images/header.png" width="1200" height="200" border="0" alt="Pasadena Shades &amp; Shutters" /><a href="/" class="header-logo"></a><a href="/" class="header-facebook"></a><a href="/" class="header-google-plus"></a><a href="/" class="header-youtube"></a><a href="tel:+1-818-618-5288" class="header-number">818-618-5288</a><a href="/contact-us.php" class="header-button"></a></div><p class="mobile-dropdown">View Menu</p><div class="menu-top section"><ul><li><a href="/">Home</a></li><li><a href="/about-us.php" class="dropdown">About Us</a><ul><li><a href="/ca-shutters">Service Areas</a></li><li><a href="/feedback.php">Submit Feedback</a></li><li><a href="/newsletter.php">Newsletter</a></li><li><a href="/specials.php">Specials</a></li><li><a href="/contact-us.php">Contact Us</a></li></ul></li><li><a href="/our-services.php" class="dropdown">Our Products</a><ul><li><a href="/pasadena-shutters.php">Shutters</a></li><li><a href="/polycore-shutters-pasadena.php">Polycore Shutters</a></li><li><a href="/pasadena-wood-blinds.php">Wood Blinds</a></li><li><a href="/faux-wood-blinds-pasadena.php">Faux Wood Blinds</a></li><li><a href="/pasadena-shades.php">Shades</a></li><li><a href="/woven-wood-shades-pasadena.php">Woven Wood Shades</a></li><li><a href="/pasadena-window-treatments.php">Other Window Treatments</a></li></ul></li><li><a href="/faqs.php">FAQs</a></li><li><a href="/testimonials.php">Testimonials</a></li><li><a href="/shutter-projects" class="dropdown">Latest Projects</a><ul><li><a href="/videos.php">Video</a></li></ul></li><li><a href="/contact-us.php">Contact Us</a></li></ul><br class="clearfix" /></div><div id="menu-bottom" class="hide-from-mobile"></div></div></div>`;
}

function legacySidebar(): string {
  return `<div id="sidebar" class="twelve"><div class="four"><div id="reviews" class="clearfix"><img src="/images/testimonial-top.png" width="320" height="50" alt="Pasadena Shades &amp; Shutters"><div class="scrollText"><p><span class="reviewContent">The blinds were measured well, and went in with no hassle. They look terrific and roll up and down easily.</span><br /><span class="customer">- Joyce M - Pasadena, CA</span><br /><a href="/testimonials.php" class="make-button">Read More</a></p><p><span class="reviewContent">Excellent service with on time delivery. The shades and blinds are well made and look great in my home.</span><br /><span class="customer">- Jane H - Los Angeles, CA</span><br /><a href="/testimonials.php" class="make-button">Read More</a></p></div><img src="/images/testimonial-bottom.png" width="320" height="50" alt="Pasadena Shades &amp; Shutters"><br class="clearfix" /></div></div><div class="four"><p class="sidebar-button"><a href="/shutter-projects"><img src="/images/elements/btn-latest-projects.png" width="320" height="246" alt="latest projects"></a></p></div><div class="four"><p id="sidebar-contact-button" class="sidebar-button"><a href="/contact-us.php"><img src="/images/elements/btn-contact-us.png" width="320" height="50" alt="contact us"></a></p><p class="sidebar-button"><a href="/newsletter.php"><img src="/images/elements/btn-newsletter.png" width="320" height="50" alt="newsletter"></a></p><p class="sidebar-button"><a href="/feedback.php"><img src="/images/elements/btn-feedback.png" width="320" height="50" alt="feedback"></a></p></div></div>`;
}

function legacyFooter(): string {
  return `<div id="footer-wrap" class="section"><div id="footer" class="wrap"><div class="company three"><p class="footer-title">Company</p><p class="font10">&copy; <span itemprop="legalName">Pasadena Shades &amp; Shutters</span>, All Rights Reserved</p><p><strong class="footer-font18"><span class="center" itemprop="name"><a itemprop="url" href="/">Pasadena Shades &amp; Shutters</a></span></strong></p><div itemprop="address" itemscope itemtype="http://schema.org/PostalAddress"><p itemprop="streetAddress" style="display:none">3906 Orangedale Ave.</p><p><span itemprop="addressLocality">Montrose</span>, <span itemprop="addressRegion">CA</span> <span itemprop="postalCode">91020</span></p><p>Phone: <a href="tel:+1-818-618-5288"><span itemprop="telephone">818-618-5288</span></a></p></div></div><div class="footer-menu two"><p class="footer-title">Quick Links</p><ul><li><a href="/pasadena-shutters">Articles</a></li><li><a href="/privacy.php">Privacy Policy</a></li><li><a href="/terms.php">Terms of Use</a></li><li class="no-underline"><a href="/sitemap.php">Sitemap</a></li></ul></div><div class="five footer-service-area"><p class="footer-title">Service Areas</p><p><a href="/ca-shutters/la-canada-shutters.php">La Canada, CA</a><a href="/ca-shutters/pasadena-shutters.php">Pasadena, CA</a><a href="/ca-shutters/glendale-shutters.php">Glendale, CA</a><a href="/ca-shutters/south-pasadena-shutters.php">South Pasadena, CA</a></p><p><a href="/ca-shutters" class="make-button">And more</a></p></div><br class="clearboth" /></div><div id="footer-bottom" class="wrap hide-from-tablet"></div></div>`;
}

function walk(dir: string, visit: (filePath: string) => void) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, visit);
    else visit(fullPath);
  }
}

function normalizeRoutePath(routePath: string): string {
  return routePath.replace(/^\/+|\/+$/g, '').replace(/\/index\.html$/, '').replace(/\/+/g, '/');
}

function routePathFromFile(filePath: string): string {
  const rel = path.relative(MIRROR_ROOT, filePath).replace(/\\/g, '/');
  return normalizeRoutePath(rel === 'index.html' ? '' : rel.replace(/\/index\.html$/, ''));
}

function filePathFromRoute(routePath: string): string {
  return path.join(MIRROR_ROOT, routePath ? routePath : '.', 'index.html');
}

function extractMeta(html: string): LegacyMeta {
  return {
    title: pick(html, /<title>([\s\S]*?)<\/title>/i) || 'Pasadena Shades & Shutters | Montrose, CA',
    description:
      pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i) ||
      'Pasadena Shades & Shutters is your trusted Pasadena Shutter Company.',
    keywords: pick(html, /<meta[^>]+name=["']keywords["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i),
    ogTitle: pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i),
    ogImage: pick(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i),
  };
}

function pick(html: string, pattern: RegExp): string | undefined {
  return decodeEntities(html.match(pattern)?.[1]?.trim() ?? '');
}

function transformHtml(html: string, routePath: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const withoutScripts = body.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  return withoutScripts.replace(/\b(href|src)=(['"])(.*?)\2/gi, (_match, attr: string, quote: string, value: string) => {
    return `${attr}=${quote}${rewriteUrl(value, routePath, attr)}${quote}`;
  });
}

function rewriteUrl(value: string, routePath: string, attr: string): string {
  if (/^(#|tel:|mailto:|javascript:)/i.test(value)) return value;
  if (/^data:/i.test(value)) return value;

  try {
    const base = `${SITE_URL}/${routePath ? `${routePath.replace(/\/[^/]*$/, '')}/` : ''}`;
    const url = new URL(value, base);
    if (url.hostname !== 'www.pasadenashadesandshutters.com') return value;
    let pathname = url.pathname.replace(/\/index\.html$/, '');
    if (attr === 'href' && pathname === '/index.html') pathname = '/';
    if (attr === 'href' && pathname !== '/' && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    return `${pathname || '/'}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}