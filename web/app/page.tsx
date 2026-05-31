"use client";

import { LazyMotion, domAnimation, m } from "framer-motion";
import Hero from "@/components/landing/Hero";
import Problem from "@/components/landing/Problem";
import HowItWorks from "@/components/landing/HowItWorks";
import WhyNow from "@/components/landing/WhyNow";
import Proof from "@/components/landing/Proof";
import SkillSection from "@/components/landing/SkillSection";
import Footer from "@/components/landing/Footer";

function SectionReveal({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </m.div>
  );
}

export default function Home() {
  return (
    <LazyMotion features={domAnimation}>
      <main className="min-h-screen bg-bg">
        <Hero />
        <SectionReveal>
          <Problem />
        </SectionReveal>
        <SectionReveal>
          <HowItWorks />
        </SectionReveal>
        <SectionReveal>
          <WhyNow />
        </SectionReveal>
        <SectionReveal>
          <Proof />
        </SectionReveal>
        <SectionReveal>
          <SkillSection />
        </SectionReveal>
        <Footer />
      </main>
    </LazyMotion>
  );
}
