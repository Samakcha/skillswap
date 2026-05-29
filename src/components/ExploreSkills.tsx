'use client'

import { useState } from 'react'
import { 
  Terminal, 
  Music, 
  Languages, 
  Home as HomeIcon, 
  Heart, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react'

// Categorized versatile skills data
const CATEGORIES = [
  { id: 'all', label: 'All Skills', icon: Sparkles },
  { id: 'tech', label: 'Tech & Design', icon: Terminal, color: '#FF6B00' },
  { id: 'creative', label: 'Creative & Arts', icon: Music, color: '#E7C44D' },
  { id: 'wellness', label: 'Wellness & Health', icon: Heart, color: '#FF6B00' },
  { id: 'home', label: 'Culinary & DIY', icon: HomeIcon, color: '#E7C44D' },
  { id: 'language', label: 'Culture & Talk', icon: Languages, color: '#FF6B00' }
]

const SKILLS = [
  // Tech & Design
  { 
    id: 'web-dev', 
    title: 'Web Development', 
    category: 'tech', 
    emoji: '💻', 
    description: 'Learn modern HTML/CSS, React, or JavaScript from local developers.',
    activeCount: 18,
    difficulty: 'Intermediate',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'ai-art', 
    title: 'AI Art & Prompts', 
    category: 'tech', 
    emoji: '🤖', 
    description: 'Master prompt engineering for Midjourney, ChatGPT, or stable diffusion.',
    activeCount: 12,
    difficulty: 'Beginner',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'ui-ux', 
    title: 'UI/UX Interface Design', 
    category: 'tech', 
    emoji: '🎨', 
    description: 'Learn Figma fundamentals, wireframing, and creating sleek mockups.',
    activeCount: 9,
    difficulty: 'All Levels',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'video-edit', 
    title: 'Creative Video Editing', 
    category: 'tech', 
    emoji: '🎬', 
    description: 'Edit dynamic YouTube videos or cinematic reels in Premiere or Resolve.',
    activeCount: 14,
    difficulty: 'All Levels',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },

  // Creative & Arts
  { 
    id: 'guitar', 
    title: 'Acoustic Guitar', 
    category: 'creative', 
    emoji: '🎸', 
    description: 'Master fingerpicking, chord shapes, and songwriting from songwriters.',
    activeCount: 22,
    difficulty: 'Beginner',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },
  { 
    id: 'photo', 
    title: 'Street Photography', 
    category: 'creative', 
    emoji: '📸', 
    description: 'Understand manual ISO/Aperture settings, visual composition, and lighting.',
    activeCount: 16,
    difficulty: 'All Levels',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },
  { 
    id: 'creative-writing', 
    title: 'Storytelling & Writing', 
    category: 'creative', 
    emoji: '✍️', 
    description: 'Work on novel outlining, character development, and narrative voice.',
    activeCount: 8,
    difficulty: 'All Levels',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },
  { 
    id: 'vocals', 
    title: 'Vocal Training', 
    category: 'creative', 
    emoji: '🎤', 
    description: 'Improve pitch, breath control, warm-up habits, and vocal resonance.',
    activeCount: 11,
    difficulty: 'Beginner',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },

  // Wellness & Health
  { 
    id: 'yoga', 
    title: 'Vinyasa Yoga Flow', 
    category: 'wellness', 
    emoji: '🧘', 
    description: 'Learn alignment, flexibility, and breathing exercises for standard poses.',
    activeCount: 26,
    difficulty: 'All Levels',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'dog-train', 
    title: 'Dog Obedience', 
    category: 'wellness', 
    emoji: '🐕', 
    description: 'Practice reward-based leash walking, basic commands, and behavior management.',
    activeCount: 15,
    difficulty: 'All Levels',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'personal-finance', 
    title: 'Personal Finance 101', 
    category: 'wellness', 
    emoji: '📈', 
    description: 'Gain strategies on budget flows, index funds, and financial independence.',
    activeCount: 10,
    difficulty: 'Beginner',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'hiit-training', 
    title: 'High Intensity Fitness', 
    category: 'wellness', 
    emoji: '💪', 
    description: 'Achieve athletic goals through customized functional weight plans.',
    activeCount: 19,
    difficulty: 'Advanced',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },

  // Culinary & DIY
  { 
    id: 'sourdough', 
    title: 'Sourdough Baking', 
    category: 'home', 
    emoji: '🍞', 
    description: 'Culture wild yeast, calculate hydration levels, score, and bake crisp loaves.',
    activeCount: 21,
    difficulty: 'Intermediate',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },
  { 
    id: 'gardening', 
    title: 'Urban Permaculture', 
    category: 'home', 
    emoji: '🌱', 
    description: 'Optimize small apartment balconies or backyards for high organic yields.',
    activeCount: 17,
    difficulty: 'Beginner',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },
  { 
    id: 'woodworking', 
    title: 'Wood Joinery & DIY', 
    category: 'home', 
    emoji: '🪚', 
    description: 'Construct tables or shelves safely using modern joint carving tools.',
    activeCount: 7,
    difficulty: 'Intermediate',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },
  { 
    id: 'cooking-pasta', 
    title: 'Fresh Pasta Making', 
    category: 'home', 
    emoji: '🍝', 
    description: 'Roll out semolina flour, shape ravioli, and craft authentic reduction sauces.',
    activeCount: 13,
    difficulty: 'Beginner',
    colorClass: 'border-[#E7C44D]/15 hover:border-[#E7C44D]/40'
  },

  // Culture & Languages
  { 
    id: 'spanish', 
    title: 'Conversational Spanish', 
    category: 'language', 
    emoji: '🇪🇸', 
    description: 'Master everyday pronouns, situational dialogs, and native accents.',
    activeCount: 24,
    difficulty: 'Beginner',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'japanese-callig', 
    title: 'Japanese & Kanji', 
    category: 'language', 
    emoji: '🇯🇵', 
    description: 'Learn basic hiragana alphabets and traditional brush stroking aesthetics.',
    activeCount: 6,
    difficulty: 'Beginner',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'french-pastry', 
    title: 'French Patisserie', 
    category: 'language', 
    emoji: '🥐', 
    description: 'Learn laminating butter techniques for golden croissants and macarons.',
    activeCount: 14,
    difficulty: 'Advanced',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  },
  { 
    id: 'public-speaking', 
    title: 'Rhetoric & Debate', 
    category: 'language', 
    emoji: '🗣️', 
    description: 'Manage stage anxiety, structure keynote speech slides, and hook audiences.',
    activeCount: 9,
    difficulty: 'Intermediate',
    colorClass: 'border-[#FF6B00]/10 hover:border-[#FF6B00]/30'
  }
]

export default function ExploreSkills() {
  const [activeCategory, setActiveCategory] = useState('all')

  const filteredSkills = activeCategory === 'all' 
    ? SKILLS 
    : SKILLS.filter(skill => skill.category === activeCategory)

  return (
    <section id="explore" className="py-24 md:py-32 px-6 max-w-7xl mx-auto w-full relative z-10 scroll-mt-20">
      
      {/* Category Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
        <div className="space-y-4 max-w-2xl">
          <span className="text-xs font-extrabold text-[#FF6B00] uppercase tracking-widest bg-[#FF6B00]/8 px-3.5 py-1.5 rounded-full">
            Browse Directory
          </span>
          <h2 className="font-display font-medium text-3xl sm:text-4xl md:text-5xl text-[#23162B] tracking-tight leading-none">
            A skill swap for <span className="text-gradient-orange font-semibold italic">everyone.</span>
          </h2>
          <p className="text-[#544A56] font-normal text-sm sm:text-base leading-relaxed">
            Whether you want to learn web design, a classical instrument, sourdough baking,Balcony gardening, or dog obedience, there are active neighbors ready to swap knowledge.
          </p>
        </div>

        {/* Dynamic Badge */}
        <div className="inline-flex items-center gap-2 bg-[#FFFCF9] border border-[#23162B]/5 px-4.5 py-2.5 rounded-2xl self-start md:self-auto shadow-sm">
          <TrendingUp className="w-4 h-4 text-[#FF6B00]" />
          <span className="text-xs font-bold text-[#544A56]">
            {SKILLS.length} Versatile Skill Pathways Live
          </span>
        </div>
      </div>

      {/* Categories Tab Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none -mx-6 px-6 md:mx-0 md:px-0">
        {CATEGORIES.map(category => {
          const Icon = category.icon
          const isActive = activeCategory === category.id
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 whitespace-nowrap cursor-pointer hover:scale-[1.01] active:scale-[0.99] border ${
                isActive
                  ? 'bg-[#FFFCF9] text-[#23162B] border-[#FF6B00] shadow-md shadow-[#23162B]/5'
                  : 'bg-[#FFFCF9] text-[#544A56] border-[#23162B]/5 hover:text-[#23162B] hover:bg-[#FFEBD6]/40'
              }`}
            >
              <Icon className="w-4.5 h-4.5" style={{ color: isActive ? '#FF6B00' : '#544A56' }} />
              <span>{category.label}</span>
            </button>
          )
        })}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
        {filteredSkills.map(skill => (
          <div
            key={skill.id}
            className={`group warm-card p-6 flex flex-col justify-between min-h-[220px] transition-all duration-300 border hover:-translate-y-1 hover:bg-[#FFFCF9]/95 hover:shadow-[0_12px_35px_rgba(35,22,43,0.06)] ${skill.colorClass}`}
          >
            <div>
              {/* Card Title & Emoji */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FFEBD6] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  {skill.emoji}
                </div>
                {/* Level Badge */}
                <span className="text-[10px] font-bold text-[#544A56]/60 bg-[#FFEBD6] px-2 py-0.75 rounded-md border border-[#23162B]/5 tracking-wider uppercase">
                  {skill.difficulty}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="font-display font-bold text-lg text-[#23162B] mb-2 leading-snug group-hover:text-[#FF6B00] transition-colors duration-300">
                {skill.title}
              </h3>
              
              <p className="text-xs text-[#544A56] leading-relaxed font-normal line-clamp-3">
                {skill.description}
              </p>
            </div>

            {/* Bottom active count & mini cta */}
            <div className="mt-6 pt-4 border-t border-[#23162B]/5 flex items-center justify-between">
              <span className="text-[10px] text-[#544A56]/60 font-semibold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#544A56]/40" />
                <span><span className="text-[#23162B] font-extrabold">{skill.activeCount} neighbors</span> swap this</span>
              </span>
              
              <a 
                href="/auth/signup"
                className="w-7 h-7 rounded-lg bg-[#FF6B00]/8 text-[#FF6B00] group-hover:bg-[#FF6B00] group-hover:text-white flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm"
                title={`Swap ${skill.title}`}
              >
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
              </a>
            </div>

          </div>
        ))}
      </div>

    </section>
  )
}
