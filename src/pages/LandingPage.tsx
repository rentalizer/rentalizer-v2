// Extend Window interface for Calendly
declare global {
  interface Window {
    Calendly?: unknown;
  }
}

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, ArrowRight, LogIn, MapPin, Building, DollarSign, Users, TrendingUp, Calculator, Search, Home, Brain, Target, MessageSquare, Calendar as CalendarIcon, Star, X, Video, FileText, Bot, LogOut, Shield } from 'lucide-react';
import { LoginDialog } from '@/components/LoginDialog';
import { Footer } from '@/components/Footer';
import { MarketIntelligenceDemo } from '@/components/MarketIntelligenceDemo';
import { AcquisitionsCRMDemo } from '@/components/AcquisitionsCRMDemo';
import { PMSDemo } from '@/components/PMSDemo';
import { GroupDiscussions } from '@/components/community/GroupDiscussions';
import { VideoLibrary } from '@/components/community/VideoLibrary';
import { CommunityCalendar } from '@/components/community/CommunityCalendar';
import { MessageThreads } from '@/components/community/MessageThreads';
import { DocumentsLibrary } from '@/components/community/DocumentsLibrary';
import { AskRichieChat } from '@/components/AskRichieChat';
import { TrainingHubDemo } from '@/components/TrainingHubDemo';

const LandingPage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // If already authenticated and visiting the landing page, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Note: Removed automatic redirect to community - let users stay on landing page

  // Auto-progression through demo steps
  useEffect(() => {
    if (activeDemo) {
      const stepRanges = {
        'market': { start: 1, end: 3, duration: 3000 },
        'acquisition': { start: 4, end: 11, duration: 2500 },
        'pms': { start: 12, end: 16, duration: 2000 },
        'community': { start: 17, end: 17, duration: 5000 }
      };

      const config = stepRanges[activeDemo];
      if (config) {
        const timer = setInterval(() => {
          setCurrentStep(prevStep => {
            if (prevStep >= config.end) {
              return config.start; // Loop back to start
            }
            return prevStep + 1;
          });
        }, config.duration);

        return () => clearInterval(timer);
      }
    }
  }, [activeDemo]);

  // Static text content from the actual landing page
  const texts = {
    mainTitle: 'Rentalizer',
    byLine: '',
    tagline: 'All-In-One Platform To Launch, Automate, & Scale Rental Income—Powered By AI',
    description: 'Rentalizer combines AI powered market analysis, deal sourcing, property management software, and automation tools with a built-in CRM and thriving community—everything you need to launch, automate, and scale rental arbitrage income',
    buttonText: 'Book Demo',
    feature1Title: 'Market Intelligence',
    feature1Description: 'The First-Of-Its-Kind AI Tool To Find The Best Rental Arbitrage Markets',
    feature2Title: 'Acquisition CRM & Calculator',
    feature2Description: 'Property Outreach, Close Deals, Profit Calculator, Manage Relationships',
    feature3Title: 'PMS',
    feature3Description: 'Streamline Property Management And Automate Operations',
    feature4Title: 'Community',
    feature4Description: 'Join Our Network Of Rental Arbitrage Entrepreneurs'
  };

  const handleFeatureClick = (feature: string) => {
    setActiveDemo(feature);
    // Reset to appropriate starting step for each demo
    if (feature === 'market') {
      setCurrentStep(1);
    } else if (feature === 'acquisition') {
      setCurrentStep(4);
    } else if (feature === 'pms') {
      setCurrentStep(12);
    } else if (feature === 'community') {
      setCurrentStep(17);
    }
  };

  const handleCloseDemo = () => {
    setActiveDemo(null);
    setCurrentStep(1);
  };

  const handleBookDemo = () => {
    console.log('Book Demo button clicked - opening Calendly popup');
    if (window.Calendly) {
      // @ts-expect-error Calendly is injected by external script and not typed
      window.Calendly.initPopupWidget({
        url: 'https://calendly.com/richies-schedule/scale'
      });
    }
  };

  useEffect(() => {
    // Load Calendly script
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.head.appendChild(script);

    // Load Calendly CSS
    const link = document.createElement('link');
    link.href = 'https://assets.calendly.com/assets/external/widget.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      // Cleanup
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Header */}
      <header className="relative z-20 w-full border-b border-gray-500/50 bg-slate-700/90 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-cyan-400 neon-text" />
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-cyan-300 text-sm">
                    {user.email}
                  </span>
                  <Button
                    onClick={signOut}
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300 hover:text-cyan-200"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : null}
            </nav>
          </div>
        </div>
      </header>

      {/* Subtle background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-purple-500/5 blur-3xl"></div>
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 py-16">
          {/* Main Content */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <BarChart3 className="h-16 w-16 text-cyan-400 neon-text" />
              <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                {texts.mainTitle}
              </div>
            </div>
            
            <div className="text-lg text-white font-medium mb-8">
              {texts.byLine}
            </div>
            
            <div className="mb-8 px-4">
              <div className="text-lg md:text-xl lg:text-2xl text-white max-w-5xl mx-auto leading-relaxed font-semibold">
                Find Rental Markets. Source Deals. Automate Cash Flow—All in One Place
              </div>
            </div>

            {/* New Description */}
            <div className="mb-12 px-4">
              <div className="text-lg text-gray-300 max-w-4xl mx-auto leading-relaxed">
                Rentalizer is a complete training platform built to help you launch and grow a rental arbitrage business—an AI-powered system to support every step. From market research and deal sourcing to property management, automation, and community—everything you need, all in one place.
              </div>
            </div>


          </div>

          {/* Entry Button */}
          <div className="mb-16">
            <div className="flex items-center justify-center">
              <Button
                onClick={() => {
                  if (user) {
                    navigate('/dashboard');
                  } else {
                    navigate('/dashboard?redirect=/dashboard');
                  }
                }}
                aria-label="Get Started"
                size="lg"
                className="
                  group relative px-10 py-6 rounded-xl
                  bg-gradient-to-r from-cyan-600 to-blue-600
                  text-white font-semibold tracking-wide
                  shadow-lg shadow-cyan-800/30
                  ring-1 ring-cyan-400/30
                  hover:from-cyan-500 hover:to-blue-500
                  hover:shadow-cyan-700/40 hover:ring-cyan-300/50
                  transition-all duration-200 ease-out
                  active:scale-[0.98]
                "
              >
                <LogIn className="h-5 w-5 mr-2 opacity-90 group-hover:opacity-100" />
                Get Started
              </Button>
            </div>
          </div>

          {/* Animated Features Section */}
          <div className="max-w-7xl mx-auto mb-20">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1: Training Hub */}
              <div className="group relative" onClick={() => handleFeatureClick('community')}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <Card className="relative bg-slate-800/80 backdrop-blur-lg border border-purple-500/30 hover:border-purple-400/60 transition-all duration-500 h-full group-hover:scale-105 cursor-pointer">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center transition-all duration-300">
                        <Users className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    <div className="text-xl font-bold text-purple-300">
                      Training Hub
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-gray-300 text-sm leading-relaxed">
                      Live Training, Video & Document Library, Tools, Resources, Community
                    </div>
                    <div className="mt-4 flex justify-center">
                      <div className="flex -space-x-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`w-6 h-6 bg-gradient-to-br from-purple-400 to-cyan-400 rounded-full border-2 border-slate-800 animate-pulse`} style={{animationDelay: `${i * 150}ms`}}></div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feature 2: Market Intelligence */}
              <div className="group relative" onClick={() => handleFeatureClick('market')}>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <Card className="relative bg-slate-800/80 backdrop-blur-lg border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-500 h-full group-hover:scale-105 cursor-pointer">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center transition-all duration-300">
                        <Brain className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    <div className="text-xl font-bold text-cyan-300">
                      Market Intelligence
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-gray-300 text-sm leading-relaxed">
                      The First-Of-Its-Kind AI Tool To Find The Best Rental Arbitrage Markets
                    </div>
                    <div className="mt-4 flex justify-center space-x-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-cyan-300 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feature 3: Acquisition Agent */}
              <div className="group relative" onClick={() => handleFeatureClick('acquisition')}>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <Card className="relative bg-slate-800/80 backdrop-blur-lg border border-purple-500/30 hover:border-purple-400/60 transition-all duration-500 h-full group-hover:scale-105 cursor-pointer">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center transition-all duration-300">
                        <Calculator className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/30 to-cyan-500/30 rounded-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    <div className="text-xl font-bold text-purple-300">
                      Acquisition Agent
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-gray-300 text-sm leading-relaxed">
                      Automate Property Outreach, Close Deals, Calculate Profit, Robust CRM
                    </div>
                    <div className="mt-4 flex justify-center space-x-1">
                      <div className="w-8 h-1 bg-purple-400 rounded animate-pulse"></div>
                      <div className="w-6 h-1 bg-cyan-400 rounded animate-pulse delay-200"></div>
                      <div className="w-10 h-1 bg-purple-300 rounded animate-pulse delay-400"></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feature 4: Property Management */}
              <div className="group relative" onClick={() => handleFeatureClick('pms')}>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <Card className="relative bg-slate-800/80 backdrop-blur-lg border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-500 h-full group-hover:scale-105 cursor-pointer">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center transition-all duration-300">
                        <Target className="h-10 w-10 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-2xl animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                    <div className="text-xl font-bold text-cyan-300">
                      Property Management
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-gray-300 text-sm leading-relaxed">
                      Automate Property Management, Operations & Cash Flow
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-1">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className={`h-2 bg-cyan-400/50 rounded animate-pulse`} style={{animationDelay: `${i * 100}ms`}}></div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="max-w-7xl mx-auto mb-20">
            <div className="text-center mb-12">
              <div className="text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                Recent Users Who've Unlocked Rental Income With Rentalizer
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { name: "Christopher Lee", text: "The market intelligence feature is a game-changer. It showed me exactly which neighborhoods to target and which to avoid. I closed 2 deals in my first month using their data." },
                { name: "Rachel Martinez", text: "Rentalizer's automation tools handle all my guest communications seamlessly. I can manage 8 properties without feeling overwhelmed. The time savings are incredible." },
                { name: "Kevin Park", text: "The profit calculator helped me negotiate better deals with landlords. I can show them exact projections and close deals faster. My conversion rate has tripled." },
                { name: "Nicole Turner", text: "I love how everything is integrated in one platform. From finding properties to managing guests, Rentalizer handles it all. No more juggling multiple tools." },
                { name: "Brandon Walsh", text: "The AI email templates are amazing. They helped me reach out to hundreds of landlords with personalized messages. I'm now managing 12 properties across 3 cities." },
                { name: "Samantha Brooks", text: "Rentalizer's training program is comprehensive and easy to follow. Even as a complete beginner, I was able to close my first deal within 6 weeks." },
                { name: "Anthony Rivera", text: "The community forum is incredibly valuable. I've connected with other investors and learned strategies I never would have discovered on my own." },
                { name: "Lisa Thompson", text: "The platform's analytics help me track performance across all my properties. I can see which markets are most profitable and adjust my strategy accordingly." },
                { name: "Ryan Murphy", text: "Rentalizer's support team is outstanding. They respond quickly and always provide helpful solutions. It's like having a personal consultant available 24/7." },
                { name: "Jennifer Adams", text: "The deal sourcing feature is incredible. It finds properties I would never have discovered on my own. I've expanded to 3 new markets using their recommendations." },
                { name: "Daniel Kim", text: "The automated messaging system has transformed my guest experience. Happy guests leave better reviews, which leads to more bookings. My occupancy rate is now 85%." },
                { name: "Michelle Garcia", text: "Rentalizer helped me transition from traditional real estate to rental arbitrage. The learning curve was smooth, and I'm now earning more than I ever did with buy-and-hold properties." },
                { name: "Bishoi Mikhail", text: "Rentalizer has everything that you need in one program to get you set up and to be able to have a successful Airbnb business. Rentalizer helped me acquire 3 properties within 1 month of starting the program, each with only $200 deposits and 8 weeks free rent." },
                { name: "Bobby Han", text: "If you are thinking about getting into the short term rental business, Rentalizer's blueprint and all the templates available is definitely something that gives more confidence moving forward. If you have any question whether to join Rentalizer's program, I think you'll find it very beneficial." },
                { name: "Shante Davis", text: "Rentalizer's program is amazing. Rentalizer helped us close the largest apartment company in our area. We now have 6 properties. I recommend the mentorship. You won't be disappointed." },
                { name: "Maria Sallie Forte-Charette", text: "Thank you so much Rentalizer for sharing your knowledge and always promptly answering any questions, which helped me to close three new properties! I learned so much from our training and coaching." },
                { name: "Elena Ashley", text: "Rentalizer's program has meant the difference in my business from just being a hobby to moving it into an actual business." },
                { name: "Liz Garcia", text: "I just closed my first deal, thanks to Rentalizer's program!" },
                { name: "Marcus Thompson", text: "The AI market analysis tool is incredible. It helped me identify profitable markets I never would have considered before. I'm now managing 4 successful properties." },
                { name: "Sarah Chen", text: "Rentalizer's CRM made all the difference in my outreach. I went from getting ignored to closing deals within weeks. The templates and automation saved me hours every day." },
                { name: "David Rodriguez", text: "The community support is unmatched. Whenever I had questions, there was always someone ready to help. I've learned as much from other members as I have from the training materials." },
                { name: "Jessica Williams", text: "I was skeptical at first, but Rentalizer delivered on every promise. The profit calculator alone has saved me from making costly mistakes. Now I have 5 profitable properties." },
                { name: "Michael Johnson", text: "The mentorship and coaching calls were game-changers. Having access to experts who've been there before made the learning curve so much smoother. Highly recommend." },
                { name: "Amanda Foster", text: "Rentalizer turned my side hustle into a full-time income. The systematic approach and tools provided everything I needed to scale confidently. Best investment I've made." }
              ].map((testimonial, index) => (
                <div key={index} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  <Card className="relative bg-slate-800/80 backdrop-blur-lg border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-500 h-full group-hover:scale-105">
                    <CardContent className="p-6">
                      {/* Testimonial Text */}
                      <p className="text-gray-300 text-sm leading-relaxed mb-6 text-center italic">
                        "{testimonial.text}"
                      </p>

                      {/* Stars */}
                      <div className="flex justify-center gap-1 mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>

                      {/* Author */}
                      <div className="text-center">
                        <h4 className="text-white font-semibold text-lg">{testimonial.name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      <Dialog open={!!activeDemo} onOpenChange={() => handleCloseDemo()}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {activeDemo === 'market' && 'Market Intelligence Demo'}
              {activeDemo === 'acquisition' && 'Acquisition CRM Demo'}
              {activeDemo === 'pms' && 'Property Management Demo'}
              {activeDemo === 'community' && 'Community Demo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Demo Content */}
            {activeDemo === 'market' && (
              <MarketIntelligenceDemo 
                currentStep={currentStep} 
                isRunning={true}
                onStepChange={setCurrentStep}
              />
            )}
            
            {activeDemo === 'acquisition' && (
              <AcquisitionsCRMDemo 
                currentStep={currentStep}
                isRunning={true}
              />
            )}
            
            {activeDemo === 'pms' && (
              <PMSDemo 
                currentStep={currentStep}
                isRunning={true}
              />
            )}
            
            {activeDemo === 'community' && (
              <TrainingHubDemo 
                currentStep={currentStep}
                isRunning={true}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ask Richie Chat */}
      <AskRichieChat />

      {/* Footer */}
      <Footer showLinks={false} />
    </div>
  );
};

export default LandingPage;