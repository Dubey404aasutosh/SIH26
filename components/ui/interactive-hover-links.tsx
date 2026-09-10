import { useMotionValue, motion, useSpring, useTransform } from "motion/react";
import React, { useRef } from "react";
import { ArrowRight } from "lucide-react";

interface InteractiveHoverLinksProps {
  links?: typeof INTERACTIVE_LINKS;
}

export function InteractiveHoverLinks({ links = INTERACTIVE_LINKS }: InteractiveHoverLinksProps) {
  return (
    <section className="bg-background p-4 md:px-8 md:py-16 w-full">
      <div className="mx-auto max-w-5xl">
        {links.map((link, _index) => (
          <Link key={link.heading} {...link} />
        ))}
      </div>
    </section>
  );
}

interface LinkProps {
  heading: string;
  imgSrc?: string;
  subheading: string;
  href: string;
  tag?: string;
  index?: string;
}

function Link({ heading, imgSrc, subheading, href, tag, index }: LinkProps) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const top = useTransform(mouseYSpring, [0.5, -0.5], ["40%", "60%"]);
  const left = useTransform(mouseXSpring, [0.5, -0.5], ["60%", "40%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (!imgSrc) return;
    const rect = ref.current!.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  return (
    <motion.a
      href={href}
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      initial="initial"
      whileHover="whileHover"
      className="group relative flex items-center justify-between border-b-2 border-muted py-4 transition-colors duration-500 hover:border-foreground md:py-8"
    >
      <div>
        {(index || tag) && (
          <div className="flex items-center gap-2 mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {index && <span className="text-amber-600 dark:text-amber-400">{index}</span>}
            {tag && <span>{tag}</span>}
          </div>
        )}
        <motion.span
          variants={{
            initial: { x: 0 },
            whileHover: { x: -16 },
          }}
          transition={{
            type: "spring",
            staggerChildren: 0.075,
            delayChildren: 0.25,
          }}
          className="relative z-10 block text-3xl font-bold text-muted-foreground transition-colors duration-500 group-hover:text-foreground md:text-5xl"
        >
          {heading.split("").map((l, i) => (
            <motion.span
              variants={{
                initial: { x: 0 },
                whileHover: { x: 16 },
              }}
              transition={{ type: "spring" }}
              className="inline-block"
              key={i}
            >
              {l === " " ? "\u00A0" : l}
            </motion.span>
          ))}
        </motion.span>
        <span className="relative z-10 mt-2 block text-sm text-muted-foreground transition-colors duration-500 group-hover:text-foreground md:text-base">
          {subheading}
        </span>
      </div>

      {imgSrc && (
        <motion.img
          style={{
            top,
            left,
            translateX: "-10%",
            translateY: "-50%",
          }}
          variants={{
            initial: { scale: 0, rotate: "-12.5deg" },
            whileHover: { scale: 1, rotate: "12.5deg" },
          }}
          transition={{ type: "spring" }}
          src={imgSrc}
          className="absolute z-0 h-24 w-32 rounded-lg object-cover shadow-lg md:h-48 md:w-64"
          alt={`Image representing ${heading}`}
        />
      )}

      <div className="overflow-hidden">
        <motion.div
          variants={{
            initial: {
              x: "100%",
              opacity: 0,
            },
            whileHover: {
              x: "0%",
              opacity: 1,
            },
          }}
          transition={{ type: "spring" }}
          className="relative z-10 p-4"
        >
          <ArrowRight className="size-6 text-foreground md:size-10" />
        </motion.div>
      </div>
    </motion.a>
  );
}

export const INTERACTIVE_LINKS = [
  {
    heading: "JSON Schema Validation",
    subheading: "ajv validation against ssg-v1.json with additionalProperties: false",
    href: "#egress-guard",
    index: "01",
    tag: "INVARIANT 01 · SCHEMA",
  },
  {
    heading: "Serialized Regex Re-Sweep",
    subheading: "Re-scans serialized bytes with Indian Verhoeff & Luhn identifier pack",
    href: "#egress-guard",
    index: "02",
    tag: "INVARIANT 02 · REGEX",
  },
  {
    heading: "Canary String Audit",
    subheading: "Asserts none of 60 active planted canary test strings are present",
    href: "#egress-guard",
    index: "03",
    tag: "INVARIANT 03 · CANARY",
  },
  {
    heading: "High-Entropy Scan",
    subheading: "Detects hidden base64/hex tokens >32 chars with Shannon entropy >4.0",
    href: "#egress-guard",
    index: "04",
    tag: "INVARIANT 04 · ENTROPY",
  },
  {
    heading: "Image Opacity Verification",
    subheading: "Decodes JPEG and samples 24 pixels per mask to verify zero pixel bleed",
    href: "#egress-guard",
    index: "05",
    tag: "INVARIANT 05 · OPACITY",
  },
  {
    heading: "Manifest Integrity Match",
    subheading: "Verifies declared redaction counts match exact applied tokens in DOM manifest",
    href: "#egress-guard",
    index: "06",
    tag: "INVARIANT 06 · INTEGRITY",
  },
  {
    heading: "Origin & TLS Allowlist",
    subheading: "Pins transmission to the single designated PRAHARI_SERVER_ORIGIN over HTTPS",
    href: "#egress-guard",
    index: "07",
    tag: "INVARIANT 07 · TLS",
  },
  {
    heading: "LEKHA Ledger Signing",
    subheading: "Writes SHA-256 hash and metadata to local cryptographic ledger prior to fetch()",
    href: "#egress-guard",
    index: "08",
    tag: "INVARIANT 08 · LEDGER",
  },
];
