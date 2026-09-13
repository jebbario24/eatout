export type ThemeSectionType =
  | "image-banner"
  | "image-with-text"
  | "multicolumn"
  | "rich-text"
  | "newsletter"
  | "testimonials"
  | "faq";

export type ThemeColorScheme = "default" | "primary" | "secondary" | "accent";

export interface ThemeBlock {
  id: string;
  type: string;
  settings: Record<string, any>;
}

export interface ThemeSection {
  id: string;
  type: ThemeSectionType;
  settings: Record<string, any>;
  blocks: ThemeBlock[];
  enabled: boolean;
}

export const SECTION_LABELS: Record<ThemeSectionType, string> = {
  "image-banner": "Image banner",
  "image-with-text": "Image with text",
  multicolumn: "Multicolumn",
  "rich-text": "Rich text",
  newsletter: "Newsletter",
  testimonials: "Testimonials",
  faq: "FAQ",
};

export const SECTION_TYPES: ThemeSectionType[] = [
  "image-banner",
  "image-with-text",
  "multicolumn",
  "rich-text",
  "newsletter",
  "testimonials",
  "faq",
];

const genId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

export function createDefaultBlock(sectionType: ThemeSectionType): ThemeBlock {
  if (sectionType === "multicolumn") {
    return {
      id: genId(),
      type: "column",
      settings: { icon: "✨", imageUrl: "", title: "New feature", text: "Describe it here.", linkLabel: "", linkUrl: "" },
    };
  }
  if (sectionType === "testimonials") {
    return {
      id: genId(),
      type: "testimonial",
      settings: { customerName: "Happy customer", quote: "This shop is fantastic!", rating: 5 },
    };
  }
  if (sectionType === "image-banner") {
    return {
      id: genId(),
      type: "slide",
      settings: { imageUrl: "", heading: "", text: "", buttonLabel: "", buttonUrl: "" },
    };
  }
  if (sectionType === "faq") {
    return {
      id: genId(),
      type: "question",
      settings: { question: "What is your return policy?", answer: "Answer this question here." },
    };
  }
  return { id: genId(), type: "block", settings: {} };
}

export function createDefaultSection(type: ThemeSectionType): ThemeSection {
  const id = genId();
  const base = { id, type, enabled: true };
  switch (type) {
    case "image-banner":
      return {
        ...base,
        settings: {
          imageUrl: "",
          heading: "Announce something",
          text: "Share information about your promotion or store.",
          buttonLabel: "Shop now",
          buttonUrl: "",
          contentPosition: "middle-center",
          height: "medium",
          colorScheme: "default",
        },
        blocks: [],
      };
    case "image-with-text":
      return {
        ...base,
        settings: {
          imageUrl: "",
          layout: "image-left",
          contentPosition: "middle",
          heading: "Pair text with an image",
          text: "Combine text with an image to focus on the product or service you'd like to feature.",
          buttonLabel: "",
          buttonUrl: "",
          colorScheme: "default",
        },
        blocks: [],
      };
    case "multicolumn":
      return {
        ...base,
        settings: { heading: "Why shop with us", columns: 3, colorScheme: "default" },
        blocks: [createDefaultBlock(type), createDefaultBlock(type), createDefaultBlock(type)],
      };
    case "rich-text":
      return {
        ...base,
        settings: {
          heading: "Talk about your business",
          text: "Share information about your business with your customers.",
          buttonLabel: "",
          buttonUrl: "",
          colorScheme: "default",
        },
        blocks: [],
      };
    case "newsletter":
      return {
        ...base,
        settings: {
          heading: "Subscribe to our emails",
          text: "Be the first to know about new collections and exclusive offers.",
          colorScheme: "default",
        },
        blocks: [],
      };
    case "testimonials":
      return {
        ...base,
        settings: { heading: "What customers are saying", colorScheme: "default" },
        blocks: [createDefaultBlock(type), createDefaultBlock(type)],
      };
    case "faq":
      return {
        ...base,
        settings: { heading: "Frequently asked questions", colorScheme: "default" },
        blocks: [createDefaultBlock(type), createDefaultBlock(type)],
      };
  }
}
