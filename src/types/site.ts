export type Service = {
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  image: string;
  highlights: string[];
  startingAt: string;
  leadTime: string;
  bestFor: string;
};

export type GalleryProject = {
  id: string;
  title: string;
  city: string;
  treatment: string;
  windows: number;
  beforeImage: string;
  afterImage: string;
  note: string;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  city: string;
  project: string;
  rating: number;
};

export type ServiceArea = {
  city: string;
  detail: string;
  projects: number;
};

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
  duration: string;
};

export type ConsultationRequest = {
  projectTypes: string[];
  windowCount: string;
  timeline: string;
  city: string;
  budget: string;
  photos: string[];
  notes: string;
  name: string;
  phone: string;
  email: string;
};
