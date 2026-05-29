'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Layers, Menu, X, ArrowRight } from 'lucide-react'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 w-full glass-nav transition-all duration-300 border-b border-text-heading/5 ${scrolled ? 'py-3 bg-bg-primary/95 shadow-md shadow-text-heading/5' : 'py-4.5 bg-bg-primary/80'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          onClick={(e) => {
            if (typeof window !== 'undefined' && window.location.pathname === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-orange/10 text-accent-orange flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300">
            <Layers className="w-5.5 h-5.5" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-text-heading">
            Skill<span className="text-accent-orange">Swap</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-semibold text-text-body hover:text-text-heading transition-colors duration-200">
            Features
          </a>
          <a href="#explore" className="text-sm font-semibold text-text-body hover:text-text-heading transition-colors duration-200">
            Explore Skills
          </a>
          <a href="#how-it-works" className="text-sm font-semibold text-text-body hover:text-text-heading transition-colors duration-200">
            How It Works
          </a>
          <a href="#impact" className="text-sm font-semibold text-text-body hover:text-text-heading transition-colors duration-200">
            Community Impact
          </a>
        </nav>

        {/* Auth CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link 
            href="/auth/login" 
            className="text-sm font-semibold text-text-body hover:text-text-heading px-4 py-2 rounded-xl hover:bg-bg-secondary transition-all duration-200"
          >
            Log In
          </Link>
          <Link 
            href="/auth/signup" 
            className="group relative inline-flex items-center gap-1.5 bg-accent-orange text-white text-sm font-bold px-6 py-3 rounded-full shadow-md shadow-accent-orange/10 hover:shadow-accent-orange/20 hover:bg-accent-orange/90 transition-all duration-300 overflow-hidden"
          >
            Join Swap
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-text-body hover:text-text-heading focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-card-surface border-t border-text-heading/5 px-6 py-8 flex flex-col gap-6 animate-fadeIn shadow-lg shadow-text-heading/5">
          <nav className="flex flex-col gap-4">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-text-body hover:text-text-heading transition-colors py-2"
            >
              Features
            </a>
            <a 
              href="#explore" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-text-body hover:text-text-heading transition-colors py-2"
            >
              Explore Skills
            </a>
            <a 
              href="#how-it-works" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-text-body hover:text-text-heading transition-colors py-2"
            >
              How It Works
            </a>
            <a 
              href="#impact" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-text-body hover:text-text-heading transition-colors py-2"
            >
              Community Impact
            </a>
          </nav>
          
          <div className="h-px bg-text-heading/5 w-full" />
          
          <div className="flex flex-col gap-3">
            <Link 
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-center font-bold text-text-body hover:text-text-heading py-3.5 rounded-xl hover:bg-bg-secondary transition-all"
            >
              Log In
            </Link>
            <Link 
              href="/auth/signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-1.5 bg-accent-orange text-white font-bold py-4 rounded-full shadow-lg shadow-accent-orange/10"
            >
              Join Swap
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
