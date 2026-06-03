import { OrbitingCircles } from "./ui/orbiting-circles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";

const avatars = [
  { imageUrl: "https://avatars.githubusercontent.com/u/161715841?v=4", profileUrl: "https://github.com/athaxv" },
  { imageUrl: "https://avatars.githubusercontent.com/u/20110627?v=4", profileUrl: "https://github.com/tomonarifeehan" },
  { imageUrl: "https://avatars.githubusercontent.com/u/106103625?v=4", profileUrl: "https://github.com/BankkRoll" },
  { imageUrl: "https://avatars.githubusercontent.com/u/59228569?v=4", profileUrl: "https://github.com/safethecode" },
  { imageUrl: "https://avatars.githubusercontent.com/u/59442788?v=4", profileUrl: "https://github.com/sanjay-mali" },
  { imageUrl: "https://avatars.githubusercontent.com/u/89768406?v=4", profileUrl: "https://github.com/itsarghyadas" },
];

export default function TestimonialSection() {
  const reviews = useMemo(() => [
    { quote: "Seems an interesting solution to the context problem in large codebases🤩", author: "Stunning-Worth-5022", role: "Reddit User" },
    { quote: "As a person with aphantasia you just made me realize how badly I really needed to be able to visualize my code base this way. Thanks boss!", author: "jphree", role: "Reddit User" },
    { quote: "Very cool and smart idea.A lot of codebases are messy.", author: "qa_anaaq", role: "Reddit User" },
    { quote: "Love this idea - and perfect timing. Keen to track and follow the outcomes based on real user experience.", author: "future-coder84", role: "Reddit User" },
    { quote: "Sounds amazing. I’ll spin it up.", author: "stormthulu", role: "Reddit User" },
    { quote: "Awesome work!", author: "martijnvann", role: "Reddit User" },
  ], []);

  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const next = () => setIndex((i) => (i + 1) % reviews.length);
  const prev = () => setIndex((i) => (i - 1 + reviews.length) % reviews.length);

  return (
    <section className="py-24 px-4 bg-black">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 text-white uppercase tracking-tight py-2">
            What Teams Are Saying
          </h2>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest max-w-3xl mx-auto">
            Real feedback from engineers and leaders using CodeGraphContext.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div 
            className="relative mx-auto w-full flex items-center justify-center overflow-hidden transition-all duration-300"
            style={{ height: isMobile ? "290px" : "480px" }}
          >
            <OrbitingCircles iconSize={isMobile ? 36 : 56} radius={isMobile ? 100 : 185} speed={1.4}>
              {avatars.map((avatar, i) => (
                <a key={i} href={avatar.profileUrl} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={avatar.imageUrl} 
                    alt={`avatar-${i}`} 
                    className={`${isMobile ? 'w-9 h-9' : 'w-14 h-14'} rounded-full border border-white/20 filter grayscale hover:grayscale-0 transition-all`} 
                  />
                </a>
              ))}
            </OrbitingCircles>
            <OrbitingCircles iconSize={isMobile ? 28 : 44} radius={isMobile ? 60 : 105} reverse speed={2}>
              {avatars.slice(1, 5).map((avatar, i) => (
                 <a key={i} href={avatar.profileUrl} target="_blank" rel="noopener noreferrer">
                    <img 
                      src={avatar.imageUrl} 
                      alt={`avatar-inner-${i}`} 
                      className={`${isMobile ? 'w-7 h-7' : 'w-11 h-11'} rounded-full border border-white/20 filter grayscale hover:grayscale-0 transition-all`} 
                    />
                 </a>
              ))}
            </OrbitingCircles>
          </div>

          <div className="relative">
            {/* Decorative Quote Mark */}
            <div className="absolute -top-12 -left-8 text-9xl font-black text-white/5 pointer-events-none select-none" style={{ fontFamily: "serif" }}>
              "
            </div>
            
            <GlassCard hoverable={false} glowColor="none" className="min-h-[300px] flex flex-col justify-between p-2">
              <div className="p-6">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest py-2 mb-4">
                  Teams Love It
                </h3>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-sm md:text-base text-gray-400 pt-4 leading-relaxed font-mono">
                      “{reviews[index].quote}”
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="p-6 pt-0 mt-auto">
                <div className="flex items-center justify-between gap-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">{reviews[index].author}</p>
                      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{reviews[index].role}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex gap-2">
                    <Button onClick={prev} size="icon" variant="outline" className="rounded-full bg-transparent border-white/20 hover:bg-white hover:text-black text-white transition-colors"><ChevronLeft className="h-4 w-4" /></Button>
                    <Button onClick={next} size="icon" className="rounded-full bg-white text-black hover:bg-gray-200 transition-colors"><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  )
}

