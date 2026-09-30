import { Service } from "../types/site";
export const services: Service[] = [
  {
    slug: "shutters",
    name: "Plantation Shutters",
    tagline: "A timeless frame for your windows",
    blurb:
      "Explore wood and composite shutters, with styles and finishes selected for your home.",
    image: "/1f20aa02-1e5b-463a-a743-208ee636b78e.jpg",
    highlights: [
      "Wood and composite options",
      "Light control and privacy",
      "Custom measurements",
      "A choice of finishes",
    ],
    startingAt: "Request a quote",
    leadTime: "Confirm with Robin",
    bestFor: "Windows where you want adjustable light and privacy.",
  },
  {
    slug: "shades",
    name: "Shades",
    tagline: "Light control with a softer touch",
    blurb:
      "Explore shades for privacy, filtered light, or a darker room. Compare materials and finishes during your consultation.",
    image: "/5f741989-dd30-44ad-9fe1-210155bffd3d.jpg",
    highlights: [
      "Woven wood shades",
      "Roller shades",
      "Light-filtering options",
      "Room-specific guidance",
    ],
    startingAt: "Request a quote",
    leadTime: "Confirm with Robin",
    bestFor: "Bedrooms, living spaces, and rooms with changing light.",
  },
  {
    slug: "blinds",
    name: "Blinds",
    tagline: "Flexible light, everyday comfort",
    blurb:
      "Wood and faux wood blinds bring adjustable light control to your rooms. Find a finish that works with your home.",
    image: "/166d8733-28b5-4f91-a0bf-4ebcf07e74fb.jpg",
    highlights: [
      "Wood blinds",
      "Faux wood blinds",
      "Adjustable slats",
      "Custom measurements",
    ],
    startingAt: "Request a quote",
    leadTime: "Confirm with Robin",
    bestFor: "Everyday privacy and flexible light control.",
  },
  {
    slug: "drapery",
    name: "Custom Drapery",
    tagline: "Fabric that brings the room together",
    blurb:
      "Add softness, color, and texture with custom drapery. Discuss fabrics, style, and hardware for your windows.",
    image: "/79db3d84-98a9-4104-98e6-293920fbd0c1.jpg",
    highlights: [
      "Custom fabric selection",
      "Pinch pleated drapery",
      "Layer with shades",
      "Design consultation",
    ],
    startingAt: "Request a quote",
    leadTime: "Confirm with Robin",
    bestFor: "Living and dining spaces, and layered window treatments.",
  },
  {
    slug: "motorized",
    name: "Motorized Treatments",
    tagline: "Convenient control for your windows",
    blurb:
      "Explore motorized shades for convenient light control. Discuss available systems and compatibility for your project.",
    image: "/35baa6ad-6256-4334-939a-023627ab24cd.jpg",
    highlights: [
      "Motorized roller shades",
      "Options for hard-to-reach windows",
      "Product-specific controls",
      "Installation planning",
    ],
    startingAt: "Request a quote",
    leadTime: "Confirm with Robin",
    bestFor: "Hard-to-reach windows and convenient everyday adjustment.",
  },
];
export const getServiceBySlug = (slug: string) =>
  services.find((s) => s.slug === slug);
