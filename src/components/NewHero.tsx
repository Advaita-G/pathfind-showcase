import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowDown, ArrowRight, Search } from "lucide-react";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { OPPORTUNITIES } from "../data/opportunities";

const HeroScene3D = lazy(() => import("./HeroScene3D"));

interface NewHeroProps {
  onExplore: () => void;
  onBuildPath: () => void;
  onHeroPresenceChange?: (present: boolean) => void;
}

export default function NewHero({
  onExplore,
  onBuildPath,
  onHeroPresenceChange,
}: NewHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [lifted, setLifted] = useState(false);

  // Two stages, not four. The section is 200svh: one viewport of held
  // composition, one viewport of ascent. Past that the page is already the
  // catalog — the hero is never something to scroll *through*.
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end end"],
  });
  // A light spring smooths fast flicks without adding perceptible lag or
  // letting the scene overshoot when the user scrolls back up.
  const heroProgress = useSpring(scrollYProgress, {
    damping: 34,
    stiffness: 210,
    mass: 0.32,
  });

  // One boolean, flipped at the hand-off point, is all the state the copy needs.
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setLifted((current) => (current === latest > 0.34 ? current : latest > 0.34));
  });

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || !onHeroPresenceChange) return;

    const updatePresence = () => {
      onHeroPresenceChange(hero.getBoundingClientRect().bottom > 72);
    };
    updatePresence();
    window.addEventListener("scroll", updatePresence, { passive: true });
    window.addEventListener("resize", updatePresence);
    return () => {
      window.removeEventListener("scroll", updatePresence);
      window.removeEventListener("resize", updatePresence);
    };
  }, [onHeroPresenceChange]);

  // The copy holds its position through stage one, then releases upward as the
  // vehicle climbs — one coordinated move rather than several independent fades.
  const copyY = useTransform(heroProgress, [0, 0.34, 1], ["0%", "0%", "-14%"]);
  const copyOpacity = useTransform(heroProgress, [0, 0.42, 0.9], [1, 1, 0]);
  const cueOpacity = useTransform(heroProgress, [0, 0.16], [1, 0]);
  // The space-to-paper dissolve. It starts only after the ascent is underway so
  // stage one is never washed out, and completes just before the section ends.
  const handoffOpacity = useTransform(heroProgress, [0.58, 0.97], [0, 1]);

  const leaveHero = () => {
    const hero = heroRef.current;
    if (!hero) return;
    // Jump to the end of the section: one gesture takes you to the catalog.
    window.scrollTo({
      top: hero.offsetTop + hero.offsetHeight - window.innerHeight * 0.05,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  // Entrance: one timeline, nav → headline → copy → actions, then it is done.
  useEffect(() => {
    if (reduceMotion || !contentRef.current) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".new-hero-eyebrow", { y: 14, opacity: 0, duration: 0.5, delay: 0.1 })
        .from(
          ".new-hero-heading",
          { y: 28, opacity: 0, duration: 0.8, ease: "power4.out" },
          "-=0.30",
        )
        .from(".new-hero-description", { y: 16, opacity: 0, duration: 0.6 }, "-=0.48")
        .from(
          ".hero-choice",
          { y: 12, opacity: 0, duration: 0.5, stagger: 0.07 },
          "-=0.40",
        )
        .from(".new-hero-scroll-cue", { opacity: 0, duration: 0.4 }, "-=0.22");
    }, contentRef);

    return () => ctx.revert();
  }, [reduceMotion]);

  return (
    <section ref={heroRef} className="new-hero" aria-labelledby="hero-heading">
      <div className="new-hero-stage">
        <Suspense fallback={null}>
          <HeroScene3D cameraProgress={heroProgress} />
        </Suspense>

        <motion.div
          className="new-hero-handoff"
          aria-hidden="true"
          style={{ opacity: reduceMotion ? 1 : handoffOpacity }}
        />

        <div ref={contentRef} className="new-hero-inner-wrap">
          <motion.div
            className="new-hero-inner"
            style={reduceMotion ? undefined : { y: copyY, opacity: copyOpacity }}
          >
            <div className="new-hero-content">
              <p className="new-hero-eyebrow">Opportunities for high-school students</p>
              <h1 id="hero-heading" className="new-hero-heading">
                <span>Find what you'll</span>
                <span>do next.</span>
              </h1>
              <div className="new-hero-supporting">
                <p className="new-hero-description">
                  Internships, research programs, competitions, and summer
                  programs for grades 9–12. Every one links to its official page.
                </p>
                <div className="hero-choices">
                  <button
                    type="button"
                    className="hero-choice is-primary"
                    onClick={onExplore}
                    aria-label="Explore Opportunities"
                    aria-describedby="hero-choice-explore"
                  >
                    <span className="hero-choice-title">
                      <Search size={18} aria-hidden="true" />
                      Explore Opportunities
                      <ArrowRight size={17} aria-hidden="true" />
                    </span>
                    <span id="hero-choice-explore" className="hero-choice-note">
                      Browse all {OPPORTUNITIES.length} verified programs. Filter by grade and interest.
                    </span>
                  </button>
                  <button
                    type="button"
                    className="hero-choice"
                    onClick={onBuildPath}
                    aria-label="Build My Path"
                    aria-describedby="hero-choice-path"
                  >
                    <span className="hero-choice-title">
                      Build My Path
                      <ArrowRight size={17} aria-hidden="true" />
                    </span>
                    <span id="hero-choice-path" className="hero-choice-note">
                      Answer a few questions. Get matches and project ideas that fit your time.
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.button
            type="button"
            className="new-hero-scroll-cue"
            onClick={leaveHero}
            style={reduceMotion ? undefined : { opacity: cueOpacity }}
            // Hidden from the tab order once it has scrolled away, so keyboard
            // users never focus a control they cannot see.
            tabIndex={lifted ? -1 : 0}
            aria-hidden={lifted}
          >
            <span>Scroll to the catalog</span>
            <ArrowDown size={16} aria-hidden="true" />
          </motion.button>
        </div>
      </div>
    </section>
  );
}
