import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../src/auth/useAuth";

// Utility for class matching
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LoginView: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Canvas Animation Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        // Particle System
        const particles: Particle[] = [];
        const particleCount = width < 768 ? 40 : 80; // Fewer particles on mobile

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(99, 102, 241, 0.5)"; // Indigo-500 optimized
                ctx.fill();
            }
        }

        // Init
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // Animation Loop
        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw Lines
            particles.forEach((p, index) => {
                p.update();
                p.draw();

                // Connect nearby
                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - dist / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });
            requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
             width = canvas.width = window.innerWidth;
             height = canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await login(email, password);
            // On success, the AuthProvider updates the session, 
            // and the main App component (listening to useAuth) will redirect to Dashboard.
        } catch (err: any) {
            console.error("Login failed", err);
            // The AuthProvider throws errors with friendly messages, so we just display them.
            setError(err.message || "Erro ao fazer login. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="relative w-full h-screen bg-slate-50 overflow-hidden flex items-center justify-center font-sans text-slate-900">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50 z-0" />
            
            {/* Animated Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-60" />

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-5xl h-[600px] flex rounded-3xl overflow-hidden shadow-2xl bg-white/80 backdrop-blur-sm border border-white/50 m-4">
                
                {/* Left Side - Form */}
                <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
                    <div className="w-full max-w-md mx-auto space-y-8">
                        {/* Header */}
                        <div className="space-y-2">
                             <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-indigo-50 rounded-2xl">
                                    <div className="w-8 h-8 relative">
                                        <img src="/logo_op7_azul.svg" alt="Op7 Logo" className="w-full h-full object-contain" />
                                    </div>
                                </div>
                                <span className="font-bold text-slate-400 tracking-widest text-xs uppercase">Welcome Back</span>
                             </div>
                             
                             <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboards</h1>
                             <p className="text-slate-500">
                                Op7 Conectando informação com inteligência
                             </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100 flex items-center gap-2"
                            >   
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {error}
                            </motion.div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-4">
                                {/* Email */}
                                <div className="group">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                        <input 
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="seu@email.com"
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="group">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                                        <input 
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            placeholder="••••••••"
                                            className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <motion.button 
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                disabled={loading}
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <>
                                        Entrar no Dashboard
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </motion.button>
                        </form>
                        
                        <div className="text-center">
                            <span className="text-xs text-slate-400">Problemas no acesso? Contate o suporte Op7.</span>
                        </div>

                    </div>
                </div>

                {/* Right Side - Visual / Illustration */}
                <div className="hidden lg:flex w-1/2 bg-indigo-600 relative overflow-hidden items-center justify-center p-12">
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
                    
                    <div className="relative z-10 text-white space-y-6 max-w-sm">
                        
                         {/* Floating Cards Animation Mockup */}
                        <div className="grid gap-4 mb-12 opacity-90">
                            <motion.div 
                                animate={{ y: [0, -10, 0] }} 
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10"
                            >
                                <div className="h-2 w-16 bg-white/30 rounded mb-2" />
                                <div className="h-8 w-24 bg-white rounded" />
                            </motion.div>
                            <motion.div 
                                animate={{ y: [0, 10, 0] }} 
                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 0.5 }}
                                className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 ml-12"
                            >
                                <div className="flex gap-2 mb-2">
                                     <div className="h-8 w-8 rounded-full bg-white/30" />
                                     <div className="space-y-1">
                                        <div className="h-2 w-20 bg-white/30 rounded" />
                                        <div className="h-2 w-12 bg-white/20 rounded" />
                                     </div>
                                </div>
                            </motion.div>
                        </div>

                        <h2 className="text-3xl font-bold leading-tight">
                            Controle total da sua performance.
                        </h2>
                        <p className="text-indigo-100/80 leading-relaxed">
                            Acompanhe campanhas, gerencie franqueados e tome decisões baseadas em dados reais com a nossa plataforma.
                        </p>
                    </div>
                </div>

            </div>
            
            {/* Footer */}
            <div className="absolute bottom-6 text-slate-400 text-xs font-medium z-10">
                &copy; 2026 Op7 Performance
            </div>
        </div>
    );
};
