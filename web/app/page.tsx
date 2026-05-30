"use client";

import { useEffect } from "react";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import GNNSection from "@/components/landing/GNNSection";
import WhyNow from "@/components/landing/WhyNow";
import Proof from "@/components/landing/Proof";
import SkillSection from "@/components/landing/SkillSection";
import Footer from "@/components/landing/Footer";

export default function Home() {
  useEffect(() => {
    const els = document.querySelectorAll(".fade-in");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <main>
      <Hero />
      <Problem />
      <HowItWorks />
      <GNNSection />
      <WhyNow />
      <Proof />
      <SkillSection />
      <Footer />
    </main>
  );
}
