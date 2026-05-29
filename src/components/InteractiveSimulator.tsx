'use client'

import { useState } from 'react'
import { Sparkles, MapPin, Check, ArrowRight, RefreshCw, Star } from 'lucide-react'

const LEARN_OPTIONS = [
  { id: 'guitar', label: 'PLAY GUITAR', emoji: '🎸', category: 'MUSIC' },
  { id: 'baking', label: 'BAKE SOURDOUGH', emoji: '🍞', category: 'CULINARY' },
  { id: 'code', label: 'WEB DEVELOPMENT', emoji: '💻', category: 'TECH' },
  { id: 'painting', label: 'OIL PAINTING', emoji: '🎨', category: 'ARTS' },
  { id: 'gardening', label: 'ORGANIC GARDENING', emoji: '🌱', category: 'DIY' }
]

const TEACH_OPTIONS = [
  { id: 'spanish', label: 'SPANISH CONVERSATION', emoji: '🇪🇸', category: 'LANGUAGES' },
  { id: 'driving', label: 'MANUAL DRIVING', emoji: '🚗', category: 'PRACTICAL' },
  { id: 'math', label: 'ALGEBRA & CALCULUS', emoji: '📐', category: 'EDUCATION' },
  { id: 'yoga', label: 'VINYASA YOGA FLOW', emoji: '🧘', category: 'WELLNESS' },
  { id: 'photography', label: 'PORTRAIT PHOTOGRAPHY', emoji: '📸', category: 'CREATIVE' }
]

const SIMULATED_MATCHES: Record<string, { name: string; avatar: string; rating: number; distance: string; bio: string }> = {
  'guitar': { name: 'LUCAS CHEN', avatar: '🧑‍🎤', rating: 4.9, distance: '0.8 MILES AWAY', bio: 'Bassist in a local indie band. Dying to learn sourdough baking in exchange!' },
  'baking': { name: 'ELENA ROSTOVA', avatar: '👩‍🍳', rating: 4.8, distance: '1.4 MILES AWAY', bio: 'Artisanal baker with 6 years experience. Love sharing baking techniques!' },
  'code': { name: 'SARAH MILLER', avatar: '👩‍💻', rating: 5.0, distance: '2.1 MILES AWAY', bio: 'Full-stack software engineer. Want to get away from the screen and learn guitar!' },
  'painting': { name: 'MARCUS STERLING', avatar: '👨‍🎨', rating: 4.7, distance: '1.7 MILES AWAY', bio: 'Fine arts graduate. Specializes in impressionistic styles and portraits.' },
  'gardening': { name: 'DIANA GREEN', avatar: '👩‍🌾', rating: 4.9, distance: '0.5 MILES AWAY', bio: 'Permaculture enthusiast. Built 4 community gardens in our neighborhood.' }
}

export default function InteractiveSimulator() {
  const [selectedLearn, setSelectedLearn] = useState(LEARN_OPTIONS[0])
  const [selectedTeach, setSelectedTeach] = useState(TEACH_OPTIONS[0])
  
  const [matchingState, setMatchingState] = useState<'idle' | 'searching' | 'matched'>('idle')
  const [matchingStatusText, setMatchingStatusText] = useState('')

  const handleFindMatch = () => {
    setMatchingState('searching')
    
    const steps = [
      'SCANNING LOCAL POSTAL CODES...',
      'MATCHING TEACH ⇄ LEARN CRITERIA...',
      'CALCULATING THREE-MILE RADIUS PROXIMITY...',
      'MATCH FOUND!'
    ]
    
    steps.forEach((text, index) => {
      setTimeout(() => {
        setMatchingStatusText(text)
        if (index === steps.length - 1) {
          setTimeout(() => {
            setMatchingState('matched')
          }, 600)
        }
      }, (index + 1) * 600)
    })
  }

  const handleReset = () => {
    setMatchingState('idle')
    setMatchingStatusText('')
  }

  const matchedNeighbor = SIMULATED_MATCHES[selectedLearn.id] || SIMULATED_MATCHES['guitar']

  return (
    <div className="w-full max-w-xl mx-auto relative z-10 selection:bg-[#FF4D00] selection:text-black">
      {/* Brutalist Solid Black Panel Container with 2px sharp black border on black/white setups */}
      <div className={`relative bg-black text-white border-2 border-white p-6 md:p-8 flex flex-col justify-between min-h-[500px] transition-all duration-300`}>
        
        {/* Header Indicator */}
        <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-6 font-mono text-[11px] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#FF4D00] inline-block animate-ping" />
            <span className="text-[#FF4D00] font-bold">KINETIC MATCH ENGINE ONLINE</span>
          </div>
          <span className="text-gray-400">DEMO_v2.0</span>
        </div>

        {/* State 1: IDLE CONFIGURATION */}
        {matchingState === 'idle' && (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-display font-bold text-2xl text-white mb-2 leading-none uppercase tracking-tight">
                SIMULATE MATCH
              </h3>
              <p className="font-sans text-xs text-gray-400 mb-6 font-medium">
                CHOOSE A SKILL TO ACQUIRE AND ONE TO SHARE. EXPERIMENTS RUN LOCALLY.
              </p>

              {/* Selection Lists */}
              <div className="space-y-6">
                {/* Learn list */}
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF4D00] mb-2.5">
                    I WANT TO ACQUIRE:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LEARN_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedLearn(item)}
                        className={`flex items-center justify-between px-4 py-3 rounded-none border text-xs font-mono font-bold transition-all duration-150 cursor-pointer ${
                          selectedLearn.id === item.id
                            ? 'bg-[#FF4D00] border-[#FF4D00] text-black hover:scale-105'
                            : 'bg-transparent border-white/10 text-gray-300 hover:border-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </span>
                        {selectedLearn.id === item.id && <Check className="w-3.5 h-3.5 text-black stroke-[3px]" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Teach list */}
                <div>
                  <label className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF4D00] mb-2.5">
                    IN EXCHANGE, I WILL OFFER:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TEACH_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedTeach(item)}
                        className={`flex items-center justify-between px-4 py-3 rounded-none border text-xs font-mono font-bold transition-all duration-150 cursor-pointer ${
                          selectedTeach.id === item.id
                            ? 'bg-white border-white text-black hover:scale-105'
                            : 'bg-transparent border-white/10 text-gray-300 hover:border-white/40 hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </span>
                        {selectedTeach.id === item.id && <Check className="w-3.5 h-3.5 text-black stroke-[3px]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Brutalist Black-White Button */}
            <button
              onClick={handleFindMatch}
              className="w-full mt-8 bg-[#FF4D00] hover:bg-white text-black hover:text-black font-mono font-bold py-4 px-6 rounded-none border-2 border-black hover:border-white transition-all duration-200 uppercase tracking-wider hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-[4px_4px_0px_#FFFFFF]"
            >
              <span>RUN MATCH ALGORITHM</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
            </button>
          </div>
        )}

        {/* State 2: SEARCHING SCREEN */}
        {matchingState === 'searching' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10">
            <div className="relative mb-8">
              {/* Circular spinning brutalist border */}
              <div className="w-24 h-24 rounded-full border-4 border-white/10 border-t-[#FF4D00] border-r-[#FF4D00] animate-spin-12s" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                ⚡
              </div>
            </div>
            
            <h4 className="font-display font-bold text-xl text-white mb-2 uppercase tracking-tight">
              PROXIMITY SEARCH
            </h4>
            <p className="font-mono text-xs text-[#FF4D00] h-6 text-center animate-pulse tracking-tight">
              {matchingStatusText}
            </p>
          </div>
        )}

        {/* State 3: MATCHED DISCOVERY */}
        {matchingState === 'matched' && (
          <div className="flex-1 flex flex-col justify-between">
            <div className="animate-fadeIn">
              
              {/* Congratulations Header */}
              <div className="bg-[#FF4D00] text-black p-4 mb-6 flex items-center gap-4 border-2 border-black shadow-[4px_4px_0px_#FFFFFF]">
                <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[#FF4D00] fill-[#FF4D00]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs uppercase leading-none tracking-tight">SWAP MATCH FOUND</h4>
                  <p className="font-mono text-[9px] uppercase tracking-wider mt-1 opacity-80">CONNECTED WITHIN NEIGHBORHOOD BOUNDARY</p>
                </div>
              </div>

              {/* Neighbor Profile Card */}
              <div className="bg-white/5 border border-white/20 p-5 mb-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#FF4D00]/10 to-transparent pointer-events-none" />
                
                {/* Profile detail */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-black border-2 border-[#FF4D00] text-black flex items-center justify-center text-3xl shrink-0 shadow-inner">
                    {matchedNeighbor.avatar}
                  </div>
                  <div>
                    <h5 className="font-display font-bold text-lg text-white leading-tight uppercase tracking-tight">{matchedNeighbor.name}</h5>
                    <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px]">
                      <div className="flex items-center gap-0.5 text-[#FF4D00]">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="font-bold">{matchedNeighbor.rating}</span>
                      </div>
                      <span className="text-white/20">|</span>
                      <span className="text-white flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#FF4D00]" />
                        {matchedNeighbor.distance}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="font-sans text-xs text-gray-400 italic mb-5 leading-relaxed bg-black/60 p-3 border border-white/10 rounded-none">
                  "{matchedNeighbor.bio}"
                </p>

                {/* Swaps Diagram */}
                <div className="space-y-2 font-mono text-[10px]">
                  <div className="flex items-center justify-between py-2 px-3 bg-white/5 border border-white/10">
                    <span className="text-gray-400">ACQUIRE:</span>
                    <span className="font-bold text-[#FF4D00] flex items-center gap-1.5">
                      {selectedLearn.emoji} {selectedLearn.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-[#FF4D00]/5 border border-[#FF4D00]/20">
                    <span className="text-gray-400">EXCHANGE:</span>
                    <span className="font-bold text-white flex items-center gap-1.5">
                      {selectedTeach.emoji} {selectedTeach.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={handleReset}
                className="sm:w-1/3 bg-transparent hover:bg-white/10 text-white border border-white/20 text-xs font-mono font-bold py-3.5 px-4 rounded-none cursor-pointer transition-all active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5 inline-block mr-1.5 animate-spin-12s" />
                <span>RESET</span>
              </button>
              
              <a
                href="/auth/signup"
                className="flex-1 bg-white hover:bg-[#FF4D00] text-black font-mono font-bold text-xs py-3.5 px-6 rounded-none flex items-center justify-center gap-1.5 border-2 border-black hover:scale-[1.03] transition-all cursor-pointer text-center"
              >
                <span>INITIATE CHAT SECURELY</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5px]" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
