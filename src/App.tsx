/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { Instagram, Send, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import React from "react";

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null, // Public entries, no auth used
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Custom components
const StarDecor = ({ className = "" }: { className?: string }) => (
  <div 
    className={`absolute w-[32rem] h-[32rem] bg-paper pointer-events-none select-none z-0 ${className}`}
    style={{
      maskImage: "url('https://res.cloudinary.com/dkhf63xbe/image/upload/v1778057561/stars_dlvhj3.svg')",
      maskRepeat: "no-repeat",
      maskPosition: "center",
      maskSize: "contain",
      WebkitMaskImage: "url('https://res.cloudinary.com/dkhf63xbe/image/upload/v1778057561/stars_dlvhj3.svg')",
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      WebkitMaskSize: "contain",
    }}
  />
);

const StarField = () => {
  const { scrollY } = useScroll();
  
  // Back layer: moves slowly
  const yBack = useTransform(scrollY, [0, 1000], [0, 200]);
  // Front layer: moves faster
  const yFront = useTransform(scrollY, [0, 1000], [0, 400]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Back Layer (Small Stars) */}
      <motion.div 
        style={{ y: yBack }}
        className="absolute inset-x-0 -top-20 -bottom-20 opacity-20"
      >
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, white, rgba(0,0,0,0)), 
                           radial-gradient(1px 1px at 40px 70px, white, rgba(0,0,0,0)), 
                           radial-gradient(1px 1px at 50px 160px, white, rgba(0,0,0,0)), 
                           radial-gradient(1px 1px at 80px 120px, white, rgba(0,0,0,0)), 
                           radial-gradient(1px 1px at 110px 10px, white, rgba(0,0,0,0)), 
                           radial-gradient(1px 1px at 150px 150px, white, rgba(0,0,0,0))`,
          backgroundSize: '250px 250px'
        }} />
      </motion.div>

      {/* Front Layer (Larger Stars) */}
      <motion.div 
        style={{ y: yFront }}
        className="absolute inset-x-0 -top-40 -bottom-40 opacity-40"
      >
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(1.5px 1.5px at 100px 100px, white, rgba(0,0,0,0)), 
                           radial-gradient(2px 2px at 300px 400px, white, rgba(0,0,0,0)), 
                           radial-gradient(1.5px 1.5px at 500px 200px, white, rgba(0,0,0,0)), 
                           radial-gradient(1.5px 1.5px at 700px 500px, white, rgba(0,0,0,0)), 
                           radial-gradient(2px 2px at 900px 300px, white, rgba(0,0,0,0))`,
          backgroundSize: '800px 600px'
        }} />
      </motion.div>
      
      {/* Subtle Bottom Fade */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#d67011]/20" />
    </div>
  );
};

const Section = ({ 
  children, 
  className = "", 
  id = "" 
}: { 
  children: React.ReactNode; 
  className?: string; 
  id?: string;
}) => (
  <section id={id} className={`py-12 md:py-16 px-6 md:px-12 lg:px-24 ${className}`}>
    <div className="max-w-4xl mx-auto w-full">
      {children}
    </div>
  </section>
);

const Button = ({ 
  children, 
  variant = 'primary', 
  className = "",
  onClick
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'outline' | 'hero' | 'heroOutline';
  className?: string;
  onClick?: () => void;
}) => {
  const baseStyles = "px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 whitespace-nowrap";
  const variants = {
    primary: "bg-terracotta text-paper hover:bg-terracotta/90 shadow-sm",
    secondary: "bg-sand text-ink hover:bg-ink hover:text-paper shadow-sm",
    outline: "border border-ink/20 text-ink hover:border-ink hover:bg-ink/5 focus:bg-white/10",
    hero: "bg-paper text-[#d67011] hover:bg-sand transition-colors shadow-sm",
    heroOutline: "border border-paper/40 text-paper hover:bg-paper/10 transition-colors"
  };
  
  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
};

export default function App() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus(null);

    const path = 'wishlist';
    try {
      await addDoc(collection(db, path), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setFormStatus({ type: 'success', message: 'Terima kasih! Kamu telah masuk dalam daftar tunggu.' });
      setFormData({ name: '', email: '', phone: '', instagram: '', tiktok: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      setFormStatus({ type: 'error', message: 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }
  };

  return (
    <div className="bg-grain min-h-screen selection:bg-terracotta/20 scroll-smooth">
      {/* 🧭 NAVIGATION */}
      <nav className="sticky top-0 left-0 right-0 z-[5000] px-6 py-6 md:px-12 bg-paper/80 backdrop-blur-md border-b border-ink/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative"
          >
            <div 
              className="w-40 h-10 md:w-56 md:h-14 bg-ink"
              style={{
                maskImage: "url('https://res.cloudinary.com/dkhf63xbe/image/upload/v1778047461/apw-horizontal_draa4d.svg')",
                maskRepeat: "no-repeat",
                maskPosition: "left center",
                maskSize: "contain",
                WebkitMaskImage: "url('https://res.cloudinary.com/dkhf63xbe/image/upload/v1778047461/apw-horizontal_draa4d.svg')",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "left center",
                WebkitMaskSize: "contain",
              }}
              role="img"
              aria-label="Ayah Paruh Waktu Logo"
            />
          </motion.div>
          
          <div className="flex gap-6 items-center text-ink/80">
             <a href="https://instagram.com/ayahparuhwaktu" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-terracotta transition-colors">
               <Instagram size={20} strokeWidth={1.5} />
             </a>
             <a href="https://www.tiktok.com/@ayahparuhwaktu" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-terracotta transition-colors">
               <svg 
                 width="18" 
                 height="18" 
                 viewBox="0 0 24 24" 
                 fill="none" 
                 stroke="currentColor" 
                 strokeWidth="2" 
                 strokeLinecap="round" 
                 strokeLinejoin="round"
               >
                 <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
               </svg>
             </a>
          </div>
        </div>
      </nav>

      {/* WISHLIST FORM */}
      <Section id="wishlist-form" className="bg-sand/30 border-b border-ink/5 pt-16 md:pt-20">
        <motion.div {...fadeIn} className="max-w-xl mx-auto space-y-8 py-4">
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-4xl italic font-light">Masuk Daftar Tunggu</h2>
            <p className="text-ink/60 font-sans font-light text-sm md:text-base">
              Dapatkan kabar pertama saat buku ini rilis dan penawaran spesial pembaca awal.
            </p>
          </div>

          <form 
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            {formStatus && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-4 rounded-sm text-sm text-center ${
                  formStatus.type === 'success' ? 'bg-olive/10 text-olive' : 'bg-terracotta/10 text-terracotta'
                }`}
              >
                {formStatus.message}
              </motion.div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-[10px] uppercase tracking-widest text-ink/50 ml-1">Nama Lengkap</label>
                <input 
                  id="name"
                  type="text" 
                  required
                  placeholder="Nama Lengkap"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-paper border border-ink/10 rounded-sm px-4 py-2.5 focus:outline-none focus:border-terracotta/50 transition-colors font-sans text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-[10px] uppercase tracking-widest text-ink/50 ml-1">Email</label>
                <input 
                  id="email"
                  type="email" 
                  required
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full bg-paper border border-ink/10 rounded-sm px-4 py-2.5 focus:outline-none focus:border-terracotta/50 transition-colors font-sans text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-[10px] uppercase tracking-widest text-ink/50 ml-1">Nomor Telepon / WhatsApp</label>
              <input 
                id="phone"
                type="tel" 
                required
                placeholder="0812..."
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full bg-paper border border-ink/10 rounded-sm px-4 py-2.5 focus:outline-none focus:border-terracotta/50 transition-colors font-sans text-sm"
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="instagram" className="text-[10px] uppercase tracking-widest text-ink/50 ml-1">Instagram Handle</label>
                <input 
                  id="instagram"
                  type="text" 
                  placeholder="@username"
                  value={formData.instagram}
                  onChange={handleInputChange}
                  className="w-full bg-paper border border-ink/10 rounded-sm px-4 py-2.5 focus:outline-none focus:border-terracotta/50 transition-colors font-sans text-sm"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="tiktok" className="text-[10px] uppercase tracking-widest text-ink/50 ml-1">TikTok Handle</label>
                <input 
                  id="tiktok"
                  type="text" 
                  placeholder="@username"
                  value={formData.tiktok}
                  onChange={handleInputChange}
                  className="w-full bg-paper border border-ink/10 rounded-sm px-4 py-2.5 focus:outline-none focus:border-terracotta/50 transition-colors font-sans text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button 
                variant="primary" 
                className="w-full group py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Mengirim...' : 'Kirim Wishlist'} 
                {!isSubmitting && <Send size={14} className="inline ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </Button>
            </div>
            <p className="text-[10px] text-center italic text-ink/30 uppercase tracking-widest">
              Data kamu akan kami simpan dengan aman.
            </p>
          </form>
        </motion.div>
      </Section>

      {/* TENTANG BUKU */}
      <Section id="tentang-buku" className="bg-paper flex items-center">
        <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
          <motion.div {...fadeIn} className="md:col-span-8 space-y-5">
            <h2 className="text-3xl md:text-5xl leading-tight">Cerita yang Tidak Pernah Jauh</h2>
            <div className="space-y-5 text-ink/70 leading-relaxed font-sans font-light text-base">
              <p>
                Buku ini lahir dari kisah-kisah nyata tentang ayah dan keluarga yang mencintainya — dari percakapan yang canggung, ingatan yang membekas, pengakuan yang akhirnya berani diucapkan.
              </p>
              <p>
                Di dalamnya ada perjuangan yang tidak selalu terlihat, rasa bersalah yang disimpan rapat, dan pertanyaan yang terus menghantui: apakah separuh waktu bisa cukup?
              </p>
              <div className="space-y-4">
                <p className="font-hand text-2xl text-terracotta pt-2">
                  Yang diingat anak bukan jadwalmu. Tapi bagaimana rasanya berada di dekatmu.
                </p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="md:col-span-4 flex flex-col items-center md:items-start"
          >
            {/* Book Image */}
            <div className="relative group w-full max-w-[280px] md:max-w-none">
              <img 
                src="https://res.cloudinary.com/dkhf63xbe/image/upload/v1778053561/apwbook_chr7lq.png" 
                alt="Ayah Paruh Waktu Book Cover"
                className="w-full h-auto rounded-sm shadow-[0_15px_40px_rgba(0,0,0,0.25)] relative z-10 transition-transform duration-700 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-ink/20 blur-2xl translate-y-8 scale-90 -z-10 opacity-30" />
            </div>

            {/* Release Info */}
            <div className="pt-8 space-y-4 flex flex-col items-center md:items-start text-center md:text-left w-full">
              <div className="flex flex-col gap-0.5 items-center md:items-start">
                <span className="text-[10px] uppercase tracking-widest text-ink/40">Tanggal Terbit</span>
                <p className="text-xl md:text-2xl font-serif">Rilis 22 Juni 2026.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* PESAN TAK TERKIRIM */}
      <Section id="pesan" className="bg-ink text-paper text-center relative overflow-hidden">
        {/* Background Decorations */}
        <StarDecor className="-left-80 md:-left-64 top-0 opacity-[0.105] md:opacity-[0.14] rotate-[25deg]" />
        <StarDecor className="-right-80 md:-right-64 bottom-0 opacity-[0.105] md:opacity-[0.14] rotate-[-15deg]" />
        
        <motion.div {...fadeIn} className="max-w-2xl mx-auto space-y-12 relative z-10">
          {/* Section Logo */}
          <div className="flex justify-center">
            <div 
              className="w-[576px] h-[144px] bg-paper opacity-90"
              style={{
                maskImage: "url('https://res.cloudinary.com/dkhf63xbe/image/upload/v1778050290/apwhug_txmpek.svg')",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                maskSize: "contain",
                WebkitMaskImage: "url('https://res.cloudinary.com/dkhf63xbe/image/upload/v1778050290/apwhug_txmpek.svg')",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                WebkitMaskSize: "contain",
              }}
            />
          </div>

          <h2 className="text-3xl md:text-5xl text-balance">Ada hal yang ingin kamu sampaikan — tapi tidak pernah bisa.</h2>
          
          <div className="space-y-4 text-paper/60 font-sans font-light text-base">
            <p>Kepada ayah. Kepada anak. Kepada diri sendiri yang dulu.</p>
            <p>
              Tuliskan di sini. Tidak ada yang akan menerimanya. Tapi mungkin, cukup dengan menuliskannya — sesuatu bisa mulai lepas.
            </p>
          </div>

          <div className="pt-6 space-y-4">
            <Button 
              variant="secondary" 
              className="group"
            >
              Tulis Pesanmu <ArrowRight size={16} className="inline ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-[10px] italic text-paper/30 uppercase tracking-widest leading-loose">
              Pesanmu akan tersimpan di ruang yang tenang.
            </p>
          </div>
        </motion.div>
      </Section>

      {/* FOOTER */}
      <footer className="py-16 px-6 bg-ink text-paper">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="space-y-4 flex flex-col items-center md:items-start text-center md:text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-paper/30">© 2026 Ayah Paruh Waktu. Semua Hak Dilindungi.</p>
          </div>
          
          <div className="flex gap-8 items-center">
            <a href="https://instagram.com/ayahparuhwaktu" target="_blank" rel="noopener noreferrer" className="text-paper/60 hover:text-hero transition-colors">
              <Instagram size={20} strokeWidth={1.5} />
            </a>
            <a href="https://www.tiktok.com/@ayahparuhwaktu" target="_blank" rel="noopener noreferrer" className="text-paper/60 hover:text-hero transition-colors">
              <svg 
                 width="20" 
                 height="20" 
                 viewBox="0 0 24 24" 
                 fill="none" 
                 stroke="currentColor" 
                 strokeWidth="2" 
                 strokeLinecap="round" 
                 strokeLinejoin="round"
               >
                 <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
               </svg>
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
