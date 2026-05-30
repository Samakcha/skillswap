'use client'

import { useEffect, useState, useRef } from "react"
import { motion, useScroll, useTransform, useSpring } from "framer-motion"
import { createClient } from "@/lib/supabase"
import { ArrowDown, ArrowUpRight, Database, CheckCircle2, AlertCircle, Sparkles, Layers } from "lucide-react"
import InteractiveSimulator from "@/components/InteractiveSimulator"
import CardSwap from "@/components/CardSwap"
import SplitText from "@/components/SplitText"
import TextType from "@/components/TextType"


const SERVICES = [
  { index: "01", title: "CULINARY ARTS", tags: ["SOURDOUGH BAKING", "FERMENTATION", "KNIFE SKILLS", "PASTRY"] },
  { index: "02", title: "MUSIC & SOUND", tags: ["ACOUSTIC GUITAR", "PIANO THEORY", "SYNTH DESIGN", "VOCAL TRAINING"] },
  { index: "03", title: "TECHNOLOGY", tags: ["REACT & NEXT.JS", "PYTHON LOGIC", "DATABASE DESIGN", "UI DESIGN"] },
  { index: "04", title: "PRACTICAL DIY", tags: ["CAR MECHANICS", "WOODWORKING", "ORGANIC GARDENING", "SEWING"] },
  { index: "05", title: "WELLNESS & BODY", tags: ["VINYASA YOGA", "MINDFULNESS MEDITATION", "NUTRITION", "PILATES"] }
]

const BACKGROUND_VIDEO_SRC = 'https://labs.google/fx/api/og-video/shared/966a806e-8af1-4aed-944e-79606693e083'

export default function Home() {
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "table_missing" | "error">("checking")
  const [dbMessage, setDbMessage] = useState("")
  
  const [highlightServices, setHighlightServices] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Seamless autoPlay recovery effect to ensure background video starts playing
  // even under strict mobile/desktop battery-saver or autoplay block policies.
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const startVideo = () => {
        video.play().then(() => setIsVideoPlaying(true)).catch(() => {});
      };
      
      video.play().then(() => setIsVideoPlaying(true)).catch(() => {
        // Fallback for strict browser policies: listen to first user interaction to start playing
        window.addEventListener('click', startVideo, { once: true });
        window.addEventListener('touchstart', startVideo, { once: true });
      });

      return () => {
        window.removeEventListener('click', startVideo);
        window.removeEventListener('touchstart', startVideo);
      };
    }
  }, []);

  // Smooth scroll springs to avoid raw scroll reading jitters
  const { scrollY, scrollYProgress } = useScroll();

  const smoothScrollYProgress = useSpring(scrollYProgress, {
    stiffness: 85,
    damping: 22,
    restDelta: 0.001
  });

  const smoothScrollY = useSpring(scrollY, {
    stiffness: 85,
    damping: 22,
    restDelta: 0.001
  });

  // Hero Section Parallax and Zoom Scales
  const heroY = useTransform(smoothScrollY, [0, 800], [0, 160]);
  const heroScale = useTransform(smoothScrollY, [0, 600], [1, 0.95]);
  const heroOpacity = useTransform(smoothScrollY, [0, 600], [1, 0]);
  const videoY = useTransform(smoothScrollY, [0, 800], [0, 80]);

  // Card stack sideways parallax motion tied to page scroll progress
  const cardParallaxX = useTransform(smoothScrollYProgress, [0.15, 0.45], [60, -40]);

  const manifestoRef = useRef<HTMLDivElement>(null);

  // Parallax scroll calculations for the Manifesto section
  const { scrollYProgress: manifestoProgress } = useScroll({
    target: manifestoRef,
    offset: ["start end", "end start"]
  });

  const smoothManifestoProgress = useSpring(manifestoProgress, {
    stiffness: 85,
    damping: 22,
    restDelta: 0.001
  });

  // Background giant outline typography translates horizontally sideways
  const manifestoBgX1 = useTransform(smoothManifestoProgress, [0, 1], ["30%", "-50%"]);
  const manifestoBgX2 = useTransform(smoothManifestoProgress, [0, 1], ["-50%", "20%"]);

  // Staggered vertical translations for philosophy panels (5 panels) - overlapping ranges
  const manifestoY1 = useTransform(smoothManifestoProgress, [0.0, 0.4], [60, -40]);
  const manifestoY2 = useTransform(smoothManifestoProgress, [0.15, 0.55], [70, -45]);
  const manifestoY3 = useTransform(smoothManifestoProgress, [0.3, 0.7], [80, -50]);
  const manifestoY4 = useTransform(smoothManifestoProgress, [0.45, 0.85], [90, -55]);
  const manifestoY5 = useTransform(smoothManifestoProgress, [0.6, 0.95], [100, -60]);

  // Smooth opacity reveals for philosophy panels (5 panels) - overlapping ranges
  const manifestoOpacity1 = useTransform(smoothManifestoProgress, [0.0, 0.08, 0.32, 0.4], [0, 1, 1, 0]);
  const manifestoOpacity2 = useTransform(smoothManifestoProgress, [0.15, 0.23, 0.47, 0.55], [0, 1, 1, 0]);
  const manifestoOpacity3 = useTransform(smoothManifestoProgress, [0.3, 0.38, 0.62, 0.7], [0, 1, 1, 0]);
  const manifestoOpacity4 = useTransform(smoothManifestoProgress, [0.45, 0.53, 0.77, 0.85], [0, 1, 1, 0]);
  const manifestoOpacity5 = useTransform(smoothManifestoProgress, [0.6, 0.68, 0.88, 0.95], [0, 1, 1, 0]);

  const handleScrollToServices = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('services');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Trigger cascading kinetic highlight
      setHighlightServices(true);
      setTimeout(() => {
        setHighlightServices(false);
      }, 2000);
    }
  };
  
  useEffect(() => {
    async function checkDatabase() {
      try {
        const supabase = createClient()
        const { error } = await supabase.from('test').select('*').limit(1)
        if (error) {
          setDbStatus("table_missing")
          setDbMessage(error.message)
        } else {
          setDbStatus("connected")
        }
      } catch (err: any) {
        setDbStatus("error")
        setDbMessage(err?.message || "Unknown connection error")
      }
    }
    checkDatabase()
  }, [])

  return (
    <div className="landing-page-root min-h-screen bg-[#FF4D00] text-black flex flex-col font-sans selection:bg-black selection:text-[#FF4D00] relative overflow-x-hidden">
      
      {/* 1. FLOATING NAVIGATION BAR */}
      <header className="fixed top-6 left-0 w-full z-50 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo - Archivo Black */}
          <a href="#" className="flex items-center gap-2 group cursor-pointer">
            <span className="font-display font-bold text-2xl tracking-tight uppercase text-white">
              SKILLSWAP
            </span>
          </a>

          {/* Center Floating black 'pill' container */}
          <nav className="hidden md:flex items-center gap-1.5 bg-black rounded-full p-1.5 shadow-xl border border-white/10">
            <a href="#features" className="font-mono text-[11px] font-bold text-white hover:bg-white hover:text-black transition-all duration-200 px-4 py-2 rounded-full uppercase tracking-tight">
              FEATURES
            </a>
            <a 
              href="#services" 
              onClick={handleScrollToServices}
              className="font-mono text-[11px] font-bold text-white hover:bg-white hover:text-black transition-all duration-200 px-4 py-2 rounded-full uppercase tracking-tight"
            >
              SKILLS
            </a>
            <a href="#demo" className="font-mono text-[11px] font-bold text-white hover:bg-white hover:text-black transition-all duration-200 px-4 py-2 rounded-full uppercase tracking-tight">
              SIMULATOR
            </a>
            <a href="#manifesto-anchor" className="font-mono text-[11px] font-bold text-white hover:bg-white hover:text-black transition-all duration-200 px-4 py-2 rounded-full uppercase tracking-tight">
              MANIFESTO
            </a>
          </nav>

          {/* Social / Action button */}
          <div className="flex items-center gap-4">
            <a 
              href="/auth/signup"
              className="bg-black hover:bg-white text-white hover:text-black font-mono font-bold text-[11px] px-6 py-3 rounded-full border-2 border-black transition-all duration-200 tracking-wider uppercase hover:scale-105"
            >
              JOIN SWAP
            </a>
          </div>

        </div>
      </header>

      {/* 2. TYPOGRAPHIC HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center pt-32 px-6 w-full z-10 overflow-hidden bg-[#FF4D00]">
        
        {/* Full-width Background Video element with Parallax Scroll */}
        <motion.div 
          className="absolute inset-0 overflow-hidden z-0 pointer-events-none"
          style={{ y: videoY }}
        >
          <video
            ref={videoRef}
            src={BACKGROUND_VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onPlaying={() => setIsVideoPlaying(true)}
            onCanPlay={() => setIsVideoPlaying(true)}
            className={`absolute inset-0 w-full h-full object-cover grayscale contrast-125 transition-opacity duration-1000 ${
              isVideoPlaying ? 'opacity-25' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-[#FF4D00] mix-blend-color pointer-events-none" />
        </motion.div>

        {/* Massive Headline with Dynamic Typing Animation, Easing Spring & Parallax */}
        <motion.div 
          className="max-w-7xl mx-auto w-full relative z-10 text-center select-none py-10"
          style={{ y: heroY, scale: heroScale, opacity: heroOpacity }}
        >
          <TextType 
            text={"SKILL\nSWAP"}
            as="h1"
            typingSpeed={90}
            deletingSpeed={45}
            pauseDuration={3000}
            showCursor={true}
            cursorCharacter="|"
            cursorClassName="text-[10vw] text-black font-display align-middle"
            className="font-display font-black text-[12vw] leading-[0.9] tracking-[-0.02em] uppercase text-black block"
          />
        </motion.div>

      </section>

      {/* 2.5 CARD SWAP LIVE PREVIEW SECTION */}
      <section className="py-24 px-6 bg-[#FF4D00] text-black w-full border-t-2 border-black z-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left Text Column with Viewport Reveal */}
          <motion.div 
            initial={{ opacity: 0, x: -45 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            <h2 className="font-display font-black text-5xl sm:text-6xl md:text-7xl uppercase tracking-tight leading-[0.88] text-black">
              SKILLS<br />NEAR YOU
            </h2>
            <p className="font-sans text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 font-semibold text-black/80">
              Discover what people in your neighborhood can teach — from cooking and coding to photography, music and more.
            </p>
            
            <div className="pt-4 flex justify-center lg:justify-start">
              <a 
                href="/dashboard"
                className="bg-black hover:bg-white text-white hover:text-black font-mono font-bold text-[11px] px-8 py-3.5 rounded-full border-2 border-black transition-all duration-200 tracking-wider uppercase hover:scale-105 active:scale-95 shadow-[4px_4px_0px_#FFFFFF] hover:shadow-none"
              >
                Browse your neighborhood
              </a>
            </div>
          </motion.div>

          {/* Right Stack CardSwap Column with Viewport Zoom & Sideways Parallax */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
            style={{ x: cardParallaxX }}
            className="lg:col-span-6 w-full flex items-center justify-center pt-8 lg:pt-0"
          >
            <CardSwap 
              delay={4500}
              cardDistance={28}
              verticalDistance={26}
              skewAmount={2}
              pauseOnHover={true}
              easing="elastic"
            />
          </motion.div>

        </div>
      </section>      {/* 3. SKEWED MARQUEE SECTION AUTO-SCROLLING INFINITELY */}
      <section className="relative z-20 w-full overflow-hidden bg-black py-8 -mt-2 skew-section border-y-2 border-black">
        <div className="skew-content space-y-4">
          
          {/* Row 1: Orange text, auto-scrolls infinitely all the time */}
          <div className="flex whitespace-nowrap overflow-hidden">
            <div className="flex gap-8 font-display font-black text-[9vw] leading-none uppercase text-[#FF4D00] animate-marquee-left">
              <span>HYPERLOCAL EXCHANGE • NO CASH • 100% MUTUAL VALUE • TRUSTED NEIGHBORS •&nbsp;</span>
              <span>HYPERLOCAL EXCHANGE • NO CASH • 100% MUTUAL VALUE • TRUSTED NEIGHBORS •&nbsp;</span>
              <span>HYPERLOCAL EXCHANGE • NO CASH • 100% MUTUAL VALUE • TRUSTED NEIGHBORS •&nbsp;</span>
            </div>
          </div>
 
          {/* Row 2: White text, auto-scrolls infinitely all the time in reverse */}
          <div className="flex whitespace-nowrap overflow-hidden border-t border-white/10 pt-4">
            <div className="flex gap-8 font-display font-black text-[9vw] leading-none uppercase text-white/80 animate-marquee-right">
              <span>GUITAR FOR SOURDOUGH • WEB DEV FOR YOGA • GARDENING FOR WOODWORK •&nbsp;</span>
              <span>GUITAR FOR SOURDOUGH • WEB DEV FOR YOGA • GARDENING FOR WOODWORK •&nbsp;</span>
              <span>GUITAR FOR SOURDOUGH • WEB DEV FOR YOGA • GARDENING FOR WOODWORK •&nbsp;</span>
            </div>
          </div>
 
        </div>
      </section>

      {/* 4. VALUE PROPS / FEATURES SECTION */}
      <section id="features" className="py-32 px-6 max-w-7xl mx-auto w-full z-10 relative">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 60, damping: 14 }}
          className="text-center max-w-3xl mx-auto mb-24 space-y-4"
        >
          <span className="font-mono text-xs font-bold text-black border-2 border-black px-4 py-2 rounded-full uppercase tracking-wider bg-white">
            PLATFORM PARAMETERS
          </span>
          <h2 className="font-display font-black text-5xl sm:text-6xl md:text-7xl text-black uppercase tracking-tight leading-[0.9] pt-4">
            ZERO TRANSACTION COSTS. ONLY PURE VALUE.
          </h2>
        </motion.div>

        {/* Feature Cards Grid with Staggered Viewport Reveals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.05 }}
            className="bg-black text-white p-8 border-2 border-black hover:scale-105 hover:-translate-y-2 transition-all duration-200 flex flex-col justify-between min-h-[300px] shadow-[6px_6px_0px_#000000]"
          >
            <div>
              <div className="w-12 h-12 bg-[#FF4D00] text-black flex items-center justify-center font-display text-xl mb-8">
                01
              </div>
              <h3 className="font-display font-bold text-xl uppercase tracking-tight mb-4">NEIGHBORHOOD ONLY</h3>
              <p className="font-sans text-xs text-gray-400 leading-relaxed font-semibold">
                Exchange skills within a tightly enforced three-mile radius. Connect with local permaculturists, guitar players, and builders right down your block.
              </p>
            </div>
            <p className="font-mono text-[10px] text-[#FF4D00] mt-6 tracking-widest">PROXIMITY VERIFIED</p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.15 }}
            className="bg-black text-white p-8 border-2 border-black hover:scale-105 hover:-translate-y-2 transition-all duration-200 flex flex-col justify-between min-h-[300px] shadow-[6px_6px_0px_#000000]"
          >
            <div>
              <div className="w-12 h-12 bg-[#FF4D00] text-black flex items-center justify-center font-display text-xl mb-8">
                02
              </div>
              <h3 className="font-display font-bold text-xl uppercase tracking-tight mb-4">ABSOLUTE ZERO CASH</h3>
              <p className="font-sans text-xs text-gray-400 leading-relaxed font-semibold">
                We banish subscription fees, credit tokens, and advertising. Trade hourly sessions directly on equal terms—your time holds identical worth.
              </p>
            </div>
            <p className="font-mono text-[10px] text-[#FF4D00] mt-6 tracking-widest">DIRECT MUTUALISM</p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.25 }}
            className="bg-black text-white p-8 border-2 border-black hover:scale-105 hover:-translate-y-2 transition-all duration-200 flex flex-col justify-between min-h-[300px] shadow-[6px_6px_0px_#000000]"
          >
            <div>
              <div className="w-12 h-12 bg-[#FF4D00] text-black flex items-center justify-center font-display text-xl mb-8">
                03
              </div>
              <h3 className="font-display font-bold text-xl uppercase tracking-tight mb-4">VERIFIED TRUST</h3>
              <p className="font-sans text-xs text-gray-400 leading-relaxed font-semibold">
                Read complete neighborhood reviews, review stars awarded for previous exchanges, and coordinate logistics safely via in-house secure chat.
              </p>
            </div>
            <p className="font-mono text-[10px] text-[#FF4D00] mt-6 tracking-widest">REPUTATION PROTOCOL</p>
          </motion.div>

        </div>
      </section>

      {/* 5. VERTICAL SERVICE LIST SECTION (SKILLS) */}
      <section id="services" className="bg-black text-white py-32 px-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
            className="mb-24 space-y-4 text-center md:text-left"
          >
            <span className="font-mono text-xs font-bold text-white border-2 border-white px-4 py-2 rounded-full uppercase tracking-wider bg-transparent">
              EXCHANGE CATEGORIES
            </span>
            <h2 className="font-display font-black text-5xl sm:text-6xl md:text-7xl uppercase tracking-tight leading-[0.9] pt-4">
              ACTIVE NEIGHBORHOOD SKILLS
            </h2>
          </motion.div>

          {/* Interactive Brutalist Service List with Viewport Fade & Cascades */}
          <div className="border-b border-white/20">
            {SERVICES.map((service, idx) => (
              <motion.div 
                key={service.index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, margin: "-60px" }}
                transition={{ type: "spring", stiffness: 70, damping: 16, delay: idx * 0.08 }}
                className={`group border-t border-white/20 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 cursor-pointer hover:bg-white/5 transition-all duration-500 px-4 select-none relative overflow-hidden ${
                  highlightServices ? 'bg-[#FF4D00]/10 border-t-[#FF4D00]' : ''
                }`}
                style={{
                  transitionDelay: highlightServices ? `${idx * 100}ms` : '0ms',
                  transform: highlightServices ? 'translateX(24px)' : 'none',
                }}
              >
                <div className="flex items-start md:items-center gap-6 md:gap-12 flex-1 group-hover:translate-x-4 transition-transform duration-300">
                  {/* Leading number */}
                  <span className="font-mono text-lg font-bold text-[#FF4D00] mt-1 md:mt-0">
                    {service.index}
                  </span>
                  
                  {/* Title and pill tags */}
                  <div className="space-y-4">
                    <h3 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight leading-none text-white">
                      {service.title}
                    </h3>
                    
                    {/* Tags row */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {service.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className="font-mono text-[9px] font-bold border border-white/40 group-hover:border-white px-3 py-1 rounded-full text-white/60 group-hover:text-white transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hidden arrow revealing on hover at 45 degrees */}
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 group-hover:rotate-45 shrink-0 bg-[#FF4D00] text-black w-14 h-14 rounded-full flex items-center justify-center">
                  <ArrowUpRight className="w-7 h-7 stroke-[3px]" />
                </div>

              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. INTERACTIVE DEMO SIMULATOR SECTION WITH VIEWPANEL ANIMATIONS */}
      <section id="demo" className="py-32 px-6 bg-black text-white border-t border-b-2 border-black relative overflow-hidden">
        {/* Glow backing */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] max-w-[80vw] max-h-[80vw] rounded-full bg-[#FF4D00]/10 blur-[130px] pointer-events-none animate-pulse" />
        
        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left information column with Viewport Slidings */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 50, damping: 14 }}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#FF4D00] text-xs font-mono font-bold text-[#FF4D00] uppercase tracking-wider bg-transparent">
              <Sparkles className="w-3.5 h-3.5 animate-spin-12s" />
              <span>TEST THE ENGINE LIVE</span>
            </span>
            <h2 className="font-display font-black text-4xl sm:text-5xl md:text-6xl uppercase tracking-tight leading-[0.9] text-white">
              RUN A PROXIMITY<br />
              MATCH ENGINE SIMULATION.
            </h2>
            <p className="font-sans text-sm text-gray-400 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
              Choose the skill you are searching for and specify the knowledge you will contribute in return. See the exact neighborhood matches calculated instantly in real-time.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-6 justify-center lg:justify-start font-mono text-xs text-gray-500 uppercase">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>ACTIVE CALCULATION ENGINE</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>NO TRANSACTION BOUNDARIES</span>
              </div>
            </div>
          </motion.div>
          
          {/* Simulator Right Column with Premium Zoom Springs */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false, margin: "-120px" }}
            transition={{ type: "spring", stiffness: 50, damping: 14 }}
            className="lg:col-span-6 w-full flex items-center justify-center"
          >
            <InteractiveSimulator />
          </motion.div>

        </div>
      </section>

      {/* 7. IMMERSIVE NARRATIVE EDITORIAL MANIFESTO PARALLAX SECTION */}
      <section 
        id="manifesto-anchor" 
        ref={manifestoRef}
        className="relative bg-black text-white py-36 px-6 border-t border-b border-black z-10 overflow-hidden w-full flex flex-col justify-center min-h-[220vh]"
      >
        {/* Parallax Watermark Background Layer - Enhanced Legibility 3-Row Outline */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex flex-col justify-between py-8 opacity-45 select-none">
          {/* Row 1: WE ARE */}
          <motion.div 
            style={{ 
              x: manifestoBgX1, 
              WebkitTextStroke: '2.5px rgba(255, 255, 255, 0.85)',
              color: 'transparent'
            }}
            className="font-display font-black text-[17vw] leading-none uppercase text-transparent stroke-white stroke-2 whitespace-nowrap"
          >
            WE ARE • WE ARE • WE ARE • WE ARE • WE ARE • WE ARE
          </motion.div>
 
          {/* Row 2: TRUSTED */}
          <motion.div 
            style={{ 
              x: manifestoBgX2, 
              WebkitTextStroke: '2.5px rgba(255, 255, 255, 0.85)',
              color: 'transparent'
            }}
            className="font-display font-black text-[17vw] leading-none uppercase text-transparent stroke-white stroke-2 whitespace-nowrap"
          >
            TRUSTED • TRUSTED • TRUSTED • TRUSTED • TRUSTED • TRUSTED
          </motion.div>
 
          {/* Row 3: WE ARE TRUSTED */}
          <motion.div 
            style={{ 
              x: manifestoBgX1, 
              WebkitTextStroke: '2.5px rgba(255, 255, 255, 0.85)',
              color: 'transparent'
            }}
            className="font-display font-black text-[17vw] leading-none uppercase text-transparent stroke-white stroke-2 whitespace-nowrap"
          >
            WE ARE TRUSTED • WE ARE TRUSTED • WE ARE TRUSTED • WE ARE TRUSTED
          </motion.div>
        </div>

        {/* Foreground Philosophical Editorial Stories */}
        <div className="max-w-5xl mx-auto relative z-10 space-y-14 my-16 w-full">
          
          {/* Section Header */}
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-28">
            <span className="font-mono text-xs font-black text-[#FF4D00] border-2 border-[#FF4D00] px-4 py-2 rounded-full uppercase tracking-wider bg-transparent">
              THE SKILLSWAP MANIFESTO
            </span>
            <h2 className="font-display font-black text-5xl sm:text-6xl uppercase tracking-tight leading-none text-white pt-4">
              A RADICAL RETURN<br />TO HUMAN COHESION.
            </h2>
          </div>

          {/* Panel 1 */}
          <motion.div 
            style={{ y: manifestoY1, opacity: manifestoOpacity1 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/5 border border-white/10 p-8 sm:p-10 backdrop-blur-md shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-[#FF4D00]" />
            <div className="md:col-span-3">
              <span className="font-display font-black text-6xl text-[#FF4D00]">01</span>
            </div>
            <div className="md:col-span-9 space-y-4">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                Your Block is Full of Masters
              </h3>
              <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed font-semibold">
                In a standard transaction-driven economy, local wisdom stays locked behind cash walls. SkillSwap unlocks it. Priya down the street is a master of acoustic chords; David down the block can roll pasta dough from organic semolina. By sharing skills, we reveal the hidden abundance of our immediate neighbors.
              </p>
            </div>
          </motion.div>

          {/* Panel 2 */}
          <motion.div 
            style={{ y: manifestoY2, opacity: manifestoOpacity2 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/5 border border-white/10 p-8 sm:p-10 backdrop-blur-md shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-[#FF4D00]" />
            <div className="md:col-span-3">
              <span className="font-display font-black text-6xl text-[#FF4D00]">02</span>
            </div>
            <div className="md:col-span-9 space-y-4">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                An Hour is Always an Hour
              </h3>
              <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed font-semibold">
                We believe your time holds identical worth, regardless of commercial classification. One hour of teaching React programming holds identical trade value to one hour of vinyasa yoga flow or permaculture gardening. We reject token credits, cash margins, and corporate systems. Equal exchange on human terms.
              </p>
            </div>
          </motion.div>

          {/* Panel 3 */}
          <motion.div 
            style={{ y: manifestoY3, opacity: manifestoOpacity3 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/5 border border-white/10 p-8 sm:p-10 backdrop-blur-md shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-[#FF4D00]" />
            <div className="md:col-span-3">
              <span className="font-display font-black text-6xl text-[#FF4D00]">03</span>
            </div>
            <div className="md:col-span-9 space-y-4">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                The Verified Three-Mile Loop
              </h3>
              <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed font-semibold">
                By enforcing a tight geographical circle, SkillSwap moves beyond online transactions to foster real-life community circles. Swap skills in local backyards, collaborate on projects, and build trusted neighborhood friendships that survive long after the session is done.
              </p>
            </div>
          </motion.div>

          {/* Panel 4 */}
          <motion.div 
            style={{ y: manifestoY4, opacity: manifestoOpacity4 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/5 border border-white/10 p-8 sm:p-10 backdrop-blur-md shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-[#FF4D00]" />
            <div className="md:col-span-3">
              <span className="font-display font-black text-6xl text-[#FF4D00]">04</span>
            </div>
            <div className="md:col-span-9 space-y-4">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                Silence the Digital Noise
              </h3>
              <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed font-semibold">
                We reject endless algorithmic feeds, tracking pixels, ads, and engagement-bait. SkillSwap is designed to lead you offline. We focus strictly on face-to-face human connection over cozy dining tables, sunny balcony gardens, and neighborhood workshops. Real skills, zero filters.
              </p>
            </div>
          </motion.div>

          {/* Panel 5 */}
          <motion.div 
            style={{ y: manifestoY5, opacity: manifestoOpacity5 }}
            className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white/5 border border-white/10 p-8 sm:p-10 backdrop-blur-md shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-[#FF4D00]" />
            <div className="md:col-span-3">
              <span className="font-display font-black text-6xl text-[#FF4D00]">05</span>
            </div>
            <div className="md:col-span-9 space-y-4">
              <h3 className="font-display font-bold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                Trust Over Transactions
              </h3>
              <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed font-semibold">
                Our platform runs entirely on mutual trust and local self-reliance. By trading woodcraft, culinary arts, mechanics, and wellness directly, we decrease reliance on centralized global supply chains while building reciprocal community bonds that pay dividends in real neighborly goodwill.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 8. GIANT CTA SECTION WITH VIEWPANEL ZOOM-UPS */}
      <section id="manifesto" className="bg-[#FF4D00] text-black py-32 px-6 border-t-2 border-black flex flex-col items-center justify-center text-center relative z-10">
        <div className="max-w-4xl w-full mx-auto space-y-12">
          
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 60, damping: 14 }}
            className="font-display font-black text-[8vw] sm:text-[6vw] leading-[0.9] tracking-[-0.02em] uppercase text-black block text-center"
          >
            <span className="block">START</span>
            <span className="block -translate-x-4 sm:-translate-x-12">SWAPPING</span>
          </motion.h2>
          
          <SplitText
            text="BUILD LIFELONG COMMUNITY FRIENDSHIPS AND LEARN MASTER TRADES WITHOUT SPENDING A SINGLE CENT. JOIN YOUR LOCAL NEIGHBORS TODAY."
            className="font-mono text-xs sm:text-sm font-bold tracking-tight uppercase max-w-xl mx-auto leading-relaxed text-black/80 block"
            delay={25}
            duration={0.8}
            ease="power3.out"
            splitType="words"
            from={{ opacity: 0, y: 30 }}
            to={{ opacity: 0.8, y: 0 }}
            threshold={0.1}
            rootMargin="-100px"
            textAlign="center"
            tag="p"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: false }}
            transition={{ type: "spring", stiffness: 70, damping: 12, delay: 0.25 }}
            className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a 
              href="/auth/signup"
              className="inline-flex items-center gap-3 bg-black hover:bg-white text-white hover:text-black font-mono font-bold text-sm tracking-wider px-6 sm:px-10 py-4 sm:py-5 rounded-full border-2 border-black shadow-[6px_6px_0px_#FFFFFF] hover:shadow-none hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer uppercase w-full sm:w-64 justify-center"
            >
              <span>CREATE FREE ACCOUNT</span>
              <ArrowUpRight className="w-5 h-5 stroke-[2.5px]" />
            </a>

            <a 
              href="/demo"
              className="inline-flex items-center gap-3 bg-white hover:bg-black text-black hover:text-white font-mono font-bold text-sm tracking-wider px-6 sm:px-10 py-4 sm:py-5 rounded-full border-2 border-black shadow-[6px_6px_0px_#000000] hover:shadow-none hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer uppercase w-full sm:w-64 justify-center"
            >
              <span>VIEW DEMO</span>
              <ArrowUpRight className="w-5 h-5 stroke-[2.5px]" />
            </a>
          </motion.div>

        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="bg-[#FF4D00] text-black border-t-2 border-black py-16 px-6 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          
          {/* Logo & copyright */}
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <span className="font-display font-bold text-xl tracking-tighter uppercase text-black">
              SKILLSWAP
            </span>
            <span className="hidden md:inline text-black/20 font-bold">|</span>
            <p className="font-mono text-[10px] font-bold uppercase tracking-tight text-black/80">
              &copy; {new Date().getFullYear()} SKILLSWAP INC. PROUDLY HYPERLOCAL & MUTUAL.
            </p>
          </div>

          {/* Social Links Space Mono 12px */}
          <div className="flex items-center gap-8 font-mono text-[12px] font-bold tracking-tight uppercase">
            <a href="#" className="hover:underline transition-all">TWITTER</a>
            <a href="#" className="hover:underline transition-all">GITHUB</a>
            <a href="#" className="hover:underline transition-all">TELEGRAM</a>
          </div>

        </div>
      </footer>

    </div>
  )
}
