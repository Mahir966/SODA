import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import {
  ASSETS,
  FAQ_ITEMS,
  FLAVORS,
  INITIAL_REVIEWS,
  type CartItem,
  type FlavorId,
  type PackSizeId,
  type ReviewItem,
} from './data/sodaData';
import type { ModelViewerElement, ModelViewerTexture } from './types/model-viewer';
import { CartDrawer } from './components/CartDrawer';
import { ContactModal } from './components/ContactModal';

// Expose gsap globally as well for compatibility with any console/external inspection
if (typeof window !== 'undefined') {
  (window as unknown as { gsap: typeof gsap }).gsap = gsap;
}

const BERRY_CONFIGS = [
  { cls: 'b1', orbit: '45deg 120deg 105%', exposure: '1.2', layer: 'fg' },
  { cls: 'b2', orbit: '-120deg 45deg 105%', exposure: '1.2', layer: 'fg' },
  { cls: 'b3', orbit: '200deg 90deg 105%', exposure: '1.2', layer: 'fg' },
  { cls: 'b4', orbit: '10deg 20deg 105%', exposure: '1.2', layer: 'fg' },
  { cls: 'b5', orbit: '-45deg 160deg 105%', exposure: '1.2', layer: 'fg' },
  { cls: 'b6', orbit: '80deg 75deg 105%', exposure: '1.2', layer: 'fg' },
  { cls: 'b7', orbit: '-20deg 110deg 105%', exposure: '1.0', layer: 'bg' },
  { cls: 'b8', orbit: '160deg 45deg 105%', exposure: '1.0', layer: 'bg' },
  { cls: 'b9', orbit: '45deg 20deg 105%', exposure: '1.0', layer: 'bg' },
] as const;

const LEAF_CONFIGS = [
  { cls: 'l1', orbit: '45deg 75deg 105%' },
  { cls: 'l2', orbit: '-30deg 60deg 105%' },
  { cls: 'l3', orbit: '120deg 85deg 105%' },
  { cls: 'l4', orbit: '10deg 45deg 105%' },
] as const;

export default function App() {
  // Active flavor state ('classic' = Diet Classic teal, 'blue' = Zero Lime blue)
  const [activeFlavor, setActiveFlavor] = useState<FlavorId>('classic');
  const [activeSection, setActiveSection] = useState<string>('home');
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [modelError, setModelError] = useState(false);

  // Cart & Modals state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('soda_cart_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [{ key: 'classic-pack12', flavorId: 'classic', packId: 'pack12', quantity: 1 }];
  });

  // Nutrition serving multiplier state in #ingredients
  const [nutritionCans, setNutritionCans] = useState<number>(1);

  // Eco impact calculator state in #eco
  const [weeklyCans, setWeeklyCans] = useState<number>(7);

  // Reviews state in #reviews
  const [reviews, setReviews] = useState<ReviewItem[]>(() => {
    try {
      const saved = localStorage.getItem('soda_reviews_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_REVIEWS;
  });
  const [reviewFilter, setReviewFilter] = useState<'all' | FlavorId>('all');
  const [helpfulVotedIds, setHelpfulVotedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('soda_helpful_votes_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRevAuthor, setNewRevAuthor] = useState('');
  const [newRevFlavor, setNewRevFlavor] = useState<FlavorId>('classic');
  const [newRevRating, setNewRevRating] = useState<number>(5);
  const [newRevText, setNewRevText] = useState('');
  const [reviewFormError, setReviewFormError] = useState<string | null>(null);
  const [reviewFormSuccess, setReviewFormSuccess] = useState<string | null>(null);

  // FAQ accordion & inline contact form state in #contact
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [inlineName, setInlineName] = useState('');
  const [inlineEmail, setInlineEmail] = useState('');
  const [inlineTopic, setInlineTopic] = useState('Customer Support');
  const [inlineMessage, setInlineMessage] = useState('');
  const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
  const [inlineSubmitted, setInlineSubmitted] = useState<{
    name: string;
    email: string;
    topic: string;
    message: string;
  } | null>(null);

  // Close drawer/modal on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCartOpen) setIsCartOpen(false);
        if (isContactOpen) setIsContactOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCartOpen, isContactOpen]);

  // Refs for 3D Hero and Animation Engine
  const bubblesContainerRef = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);
  const heroCenterRef = useRef<HTMLDivElement | null>(null);
  const productModelRef = useRef<ModelViewerElement | null>(null);
  const berriesFGRef = useRef<HTMLDivElement | null>(null);
  const berriesBGRef = useRef<HTMLDivElement | null>(null);
  const leavesBGRef = useRef<HTMLDivElement | null>(null);

  const isSwitchingRef = useRef<boolean>(false);
  const switchSpinRef = useRef<number>(0);
  const blueTextureRef = useRef<ModelViewerTexture | null>(null);
  const greenTextureRef = useRef<ModelViewerTexture | null>(null);
  const activeFlavorRef = useRef<FlavorId>('classic');

  // Persist cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('soda_cart_v1', JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  // Persist reviews to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('soda_reviews_v1', JSON.stringify(reviews));
    } catch {
      // ignore
    }
  }, [reviews]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2800);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Cart manipulation handlers
  const handleAddToCart = useCallback(
    (flavorId: FlavorId, packId: PackSizeId, quantity = 1) => {
      const key = `${flavorId}-${packId}`;
      setCart((prev) => {
        const existing = prev.find((item) => item.key === key);
        if (existing) {
          return prev.map((item) =>
            item.key === key ? { ...item, quantity: item.quantity + quantity } : item
          );
        }
        return [...prev, { key, flavorId, packId, quantity }];
      });
    },
    []
  );

  const handleUpdateQuantity = useCallback((key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleRemoveItem = useCallback((key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const handleClearCart = useCallback(() => {
    setCart([]);
  }, []);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Helper to ensure textures are loaded on the <model-viewer>
  const ensureTexturesLoaded = useCallback(async (mv: ModelViewerElement) => {
    if (!mv || typeof mv.createTexture !== 'function') return;
    try {
      if (!blueTextureRef.current) {
        blueTextureRef.current = await mv.createTexture(ASSETS.BLUE_BASE_COLOR_JPG);
      }
      if (!greenTextureRef.current) {
        greenTextureRef.current = await mv.createTexture(ASSETS.GREEN_BASE_COLOR_JPG);
      }
    } catch (e) {
      console.warn('Texture creation warning:', e);
    }
  }, []);

  // Preload textures & Warm up shaders on <model-viewer> load
  useEffect(() => {
    const mv = productModelRef.current;
    if (!mv) return;

    const handleLoad = async () => {
      try {
        await ensureTexturesLoaded(mv);
        if (mv.model && mv.model.materials && mv.model.materials[0]) {
          const material = mv.model.materials[0];
          if (
            material.pbrMetallicRoughness &&
            material.pbrMetallicRoughness.baseColorTexture &&
            blueTextureRef.current &&
            greenTextureRef.current
          ) {
            // Warm up blue shader then apply current active flavor texture
            material.pbrMetallicRoughness.baseColorTexture.setTexture(blueTextureRef.current);
            await new Promise((r) => requestAnimationFrame(r));
            const targetTex =
              activeFlavorRef.current === 'blue'
                ? blueTextureRef.current
                : greenTextureRef.current;
            material.pbrMetallicRoughness.baseColorTexture.setTexture(targetTex);
          }
        }
      } catch (e) {
        console.warn('Texture preload skipped:', e);
      }
    };

    const handleError = () => {
      setModelError(true);
    };

    mv.addEventListener('load', handleLoad);
    mv.addEventListener('error', handleError);

    if (mv.loaded) {
      handleLoad();
    }

    return () => {
      mv.removeEventListener('load', handleLoad);
      mv.removeEventListener('error', handleError);
    };
  }, [ensureTexturesLoaded]);

  // Choreographed Flavor Switching Function
  const switchFlavor = useCallback(
    async (flavor: FlavorId) => {
      if (isSwitchingRef.current || flavor === activeFlavorRef.current) return;
      isSwitchingRef.current = true;
      activeFlavorRef.current = flavor;
      setActiveFlavor(flavor);

      // Safety fallback unlock in case browser tab is backgrounded during GSAP timeline
      const safetyTimer = setTimeout(() => {
        isSwitchingRef.current = false;
      }, 1900);

      const body = document.body;
      const mv = productModelRef.current;
      const heroCenter = heroCenterRef.current;
      const heroContent = heroContentRef.current;
      const berries = document.querySelectorAll<ModelViewerElement>('.berry');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const targetColors = FLAVORS[flavor].themeColors;

      // 1. Background Animation
      gsap.to(body, {
        '--bg-inner': targetColors.inner,
        '--bg-mid': targetColors.mid,
        '--bg-outer': targetColors.outer,
        duration: reducedMotion ? 0.2 : 1.5,
        ease: 'power2.inOut',
      });

      if (flavor === 'blue') {
        body.classList.add('blue-theme');
      } else {
        body.classList.remove('blue-theme');
      }

      // 2. Can Spin Animation (360 spin + blur -> texture swap -> 720 back.out settle)
      const spinObj = { val: 0, blur: 0 };
      gsap.to(spinObj, {
        val: reducedMotion ? 0 : 360,
        blur: reducedMotion ? 0 : 15,
        duration: reducedMotion ? 0.15 : 0.6,
        ease: 'power2.in',
        onUpdate: () => {
          switchSpinRef.current = spinObj.val;
          if (mv) {
            mv.style.filter = spinObj.blur > 0.5 ? `blur(${spinObj.blur}px)` : 'none';
          }
        },
        onComplete: async () => {
          // Swap 3D can texture at peak
          if (mv) {
            await ensureTexturesLoaded(mv);
            const targetTex =
              flavor === 'blue' ? blueTextureRef.current : greenTextureRef.current;
            if (mv.model && mv.model.materials && targetTex) {
              mv.model.materials.forEach((material) => {
                if (
                  material.pbrMetallicRoughness &&
                  material.pbrMetallicRoughness.baseColorTexture
                ) {
                  material.pbrMetallicRoughness.baseColorTexture.setTexture(targetTex);
                }
              });
            }
          }

          gsap.to(spinObj, {
            val: reducedMotion ? 0 : 720,
            blur: 0,
            duration: reducedMotion ? 0.15 : 1.5,
            ease: 'back.out(0.7)',
            onUpdate: () => {
              switchSpinRef.current = spinObj.val;
              if (mv) {
                mv.style.filter = spinObj.blur > 0.5 ? `blur(${spinObj.blur}px)` : 'none';
              }
            },
            onComplete: () => {
              switchSpinRef.current = 0;
              if (mv) {
                mv.style.filter = 'none';
              }
            },
          });
        },
      });

      // 3. Berries "Implode -> Swap Model -> Explode" with Dynamic Positioning
      if (berries.length === 0) {
        isSwitchingRef.current = false;
        return;
      }

      const containerWidth = heroContent ? heroContent.clientWidth : window.innerWidth;
      const containerHeight = heroContent ? heroContent.clientHeight : window.innerHeight;

      let completedBerries = 0;
      berries.forEach((berry) => {
        const bW = (berry.offsetWidth || 120) / 2;
        const bH = (berry.offsetHeight || 120) / 2;
        const centerX = containerWidth / 2 - berry.offsetLeft - bW;
        const centerY = containerHeight / 2 - berry.offsetTop - bH;

        const startAngle = parseFloat(berry.dataset.angle || '0') || 0;
        const currentBaseX = parseFloat(berry.dataset.baseX || '0') || 0;
        const currentBaseY = parseFloat(berry.dataset.baseY || '0') || 0;
        const currentRx = parseFloat(berry.dataset.rx || '0') || 0;
        const currentRy = parseFloat(berry.dataset.ry || '0') || 0;

        const nextBaseX = (Math.random() - 0.5) * 200;
        const nextBaseY = (Math.random() - 0.5) * 200;

        const proxy = {
          x: currentBaseX + currentRx,
          y: currentBaseY + currentRy,
          rot: startAngle,
          scale: 1,
          opacity: 1,
        };

        const renderBerryProxy = () => {
          berry.style.transform = `translate(${proxy.x}px, ${proxy.y}px) rotate(${proxy.rot}deg) scale(${proxy.scale})`;
          berry.style.opacity = String(proxy.opacity);
        };

        renderBerryProxy();

        const berryTl = gsap.timeline();
        berryTl
          .to(proxy, {
            x: centerX,
            y: centerY,
            rot: startAngle + 45,
            scale: 0.1,
            opacity: 0,
            duration: reducedMotion ? 0.15 : 0.5,
            ease: 'power2.in',
            onUpdate: renderBerryProxy,
            onComplete: () => {
              berry.src = flavor === 'blue' ? ASSETS.BLUEBERRY_GLB : ASSETS.CHERRY_GLB;
              if (heroCenter) heroCenter.style.zIndex = '50';
            },
          })
          .to(proxy, {
            duration: reducedMotion ? 0.05 : 0.3,
          })
          .to(proxy, {
            onStart: () => {
              if (heroCenter) heroCenter.style.zIndex = '10';
            },
            x: nextBaseX,
            y: nextBaseY,
            rot: startAngle + 90,
            scale: 1,
            opacity: 1,
            duration: reducedMotion ? 0.2 : 0.9,
            ease: 'back.out(1.5)',
            onUpdate: renderBerryProxy,
            onComplete: () => {
              berry.dataset.angle = String(startAngle + 90);
              berry.dataset.baseX = String(nextBaseX);
              berry.dataset.baseY = String(nextBaseY);
              berry.dataset.rx = '0';
              berry.dataset.ry = '0';
              berry.style.opacity = '';

              completedBerries++;
              if (completedBerries === berries.length) {
                clearTimeout(safetyTimer);
                isSwitchingRef.current = false;
              }
            },
          });
      });
    },
    [ensureTexturesLoaded]
  );

  // Cycle between flavors for carousel arrows
  const handleToggleFlavor = useCallback(() => {
    const next: FlavorId = activeFlavorRef.current === 'classic' ? 'blue' : 'classic';
    switchFlavor(next);
  }, [switchFlavor]);

  // Pointer Parallax, Can Tilt, Berry Repulsion & Floating Animation Loop
  useEffect(() => {
    const allBerries = document.querySelectorAll<ModelViewerElement>('.berry');
    const allLeaves = document.querySelectorAll<ModelViewerElement>('.leaf');

    allBerries.forEach((b) => {
      b.dataset.rx = '0';
      b.dataset.ry = '0';
      b.dataset.angle = String(Math.random() * 360);
      b.dataset.baseX = '0';
      b.dataset.baseY = '0';
    });

    const mouse = { x: 0, y: 0, px: -9999, py: -9999 };
    const currentMouse = { x: 0, y: 0 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
      mouse.px = e.clientX;
      mouse.py = e.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      mouse.x = t.clientX / window.innerWidth - 0.5;
      mouse.y = t.clientY / window.innerHeight - 0.5;
      mouse.px = t.clientX;
      mouse.py = t.clientY;
    };

    const onTouchEnd = () => {
      mouse.x = 0;
      mouse.y = 0;
      mouse.px = -9999;
      mouse.py = -9999;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    let rafId = 0;
    const durations = [5, 7, 6, 8, 5.5, 6.5, 9, 11, 10];

    const animate = () => {
      const time = Date.now() * 0.001;
      currentMouse.x += (mouse.x - currentMouse.x) * 0.05;
      currentMouse.y += (mouse.y - currentMouse.y) * 0.05;

      const mv = productModelRef.current;
      if (mv) {
        mv.cameraOrbit = `${currentMouse.x * 40 + switchSpinRef.current}deg ${
          90 + currentMouse.y * 20
        }deg 380%`;
      }

      if (berriesFGRef.current) {
        berriesFGRef.current.style.transform = `translate(${currentMouse.x * 60}px, ${
          currentMouse.y * 60
        }px)`;
      }
      if (berriesBGRef.current) {
        berriesBGRef.current.style.transform = `translate(${currentMouse.x * -30}px, ${
          currentMouse.y * -30
        }px)`;
      }
      if (leavesBGRef.current) {
        leavesBGRef.current.style.transform = `translate(${currentMouse.x * -15}px, ${
          currentMouse.y * -15
        }px)`;
      }

      if (!isSwitchingRef.current) {
        allBerries.forEach((berry, i) => {
          const berryRect = berry.getBoundingClientRect();
          if (berryRect.width === 0 && berryRect.height === 0) return;

          const berryX = berryRect.left + berryRect.width / 2;
          const berryY = berryRect.top + berryRect.height / 2;

          const diffX = mouse.px - berryX;
          const diffY = mouse.py - berryY;
          const distance = Math.sqrt(diffX * diffX + diffY * diffY);

          let targetRx = 0;
          let targetRy = 0;
          let speedMult = 1;

          if (distance < 400 && distance > 0.001) {
            const force = (400 - distance) / 400;
            targetRx = (diffX / distance) * force * -80;
            targetRy = (diffY / distance) * force * -80;
            speedMult = 1 + force * 5;
          }

          let rx = parseFloat(berry.dataset.rx || '0') || 0;
          let ry = parseFloat(berry.dataset.ry || '0') || 0;
          let angle = parseFloat(berry.dataset.angle || '0') || 0;
          const baseX = parseFloat(berry.dataset.baseX || '0') || 0;
          const baseY = parseFloat(berry.dataset.baseY || '0') || 0;

          rx += (targetRx - rx) * 0.1;
          ry += (targetRy - ry) * 0.1;
          angle += 0.2 * speedMult;

          berry.dataset.rx = String(rx);
          berry.dataset.ry = String(ry);
          berry.dataset.angle = String(angle);

          const dur = durations[i % 9];
          const phase = (time + i * 0.7) * ((Math.PI * 2) / dur);
          const floatY = Math.sin(phase) * 15;
          const floatAngle = Math.cos(phase) * 6;

          berry.style.transform = `translate(${rx + baseX}px, ${
            ry + baseY + floatY
          }px) rotate(${angle + floatAngle}deg)`;
        });
      }

      allLeaves.forEach((leaf, i) => {
        const dur = 10 + i * 2;
        const phase = (time + i * 1.2) * ((Math.PI * 2) / dur);
        const floatY = Math.sin(phase) * 20;
        const floatX = Math.cos(phase * 0.5) * 15;
        const floatAngle = Math.sin(phase * 0.3) * 15;
        leaf.style.transform = `translate(${floatX}px, ${floatY}px) rotate(${floatAngle}deg)`;
      });

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Rising Bubbles Generator
  useEffect(() => {
    const container = bubblesContainerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const isMobile = window.innerWidth <= 768;
    const intervalMs = isMobile ? 900 : 400;

    const createBubble = () => {
      if (document.hidden || !bubblesContainerRef.current) return;
      const bubble = document.createElement('img');
      bubble.src = ASSETS.BUBBLE_PNG;
      bubble.alt = '';
      bubble.setAttribute('aria-hidden', 'true');
      bubble.className = 'bubble-img';
      const size = Math.random() * 20 + 10 + 'px';
      bubble.style.width = size;
      bubble.style.height = 'auto';
      bubble.style.left = Math.random() * 100 + '%';
      bubble.style.bottom = '-50px';
      bubble.style.opacity = String(Math.random() * 0.4 + 0.2);

      const duration = Math.random() * 6 + 4;
      bubble.style.animation = `floatUpImg ${duration}s linear forwards`;

      bubblesContainerRef.current.appendChild(bubble);
      setTimeout(() => {
        bubble.remove();
      }, duration * 1000);
    };

    const timer = setInterval(createBubble, intervalMs);
    return () => clearInterval(timer);
  }, []);

  // Scroll spy for header & active section nav
  useEffect(() => {
    const onScroll = () => {
      setIsHeaderScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const sectionIds = ['home', 'ingredients', 'taste', 'eco', 'reviews', 'contact'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setActiveSection(id === 'contact' ? 'reviews' : id);
          }
        });
      },
      { rootMargin: '-40% 0px -45% 0px' }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Reviews calculations & handlers
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '4.8';

  const filteredReviews =
    reviewFilter === 'all' ? reviews : reviews.filter((r) => r.flavorId === reviewFilter);

  const handleToggleHelpful = (reviewId: string) => {
    const alreadyVoted = helpfulVotedIds.includes(reviewId);
    const nextVoted = alreadyVoted
      ? helpfulVotedIds.filter((id) => id !== reviewId)
      : [...helpfulVotedIds, reviewId];

    setHelpfulVotedIds(nextVoted);
    try {
      localStorage.setItem('soda_helpful_votes_v1', JSON.stringify(nextVoted));
    } catch {
      // ignore
    }

    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, helpfulCount: Math.max(0, r.helpfulCount + (alreadyVoted ? -1 : 1)) }
          : r
      )
    );
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReviewFormError(null);
    setReviewFormSuccess(null);

    if (newRevAuthor.trim().length < 2) {
      setReviewFormError('Please enter your name (at least 2 characters).');
      return;
    }
    if (newRevText.trim().length < 12) {
      setReviewFormError('Please share at least 12 characters in your review.');
      return;
    }

    const created: ReviewItem = {
      id: `rev-${Date.now()}`,
      author: newRevAuthor.trim(),
      avatar: newRevAuthor.trim().charAt(0).toUpperCase(),
      flavorId: newRevFlavor,
      rating: newRevRating,
      text: newRevText.trim(),
      date: 'Just now',
      helpfulCount: 1,
    };

    setReviews((prev) => [created, ...prev]);
    setNewRevAuthor('');
    setNewRevText('');
    setNewRevRating(5);
    setReviewFormSuccess('Your review has been added and saved to your browser!');
    showToast('Review posted!');
  };

  // Eco calculator derived stats
  const annualCans = weeklyCans * 52;
  const plasticBottlesSaved = annualCans;
  const co2SavedKg = +(annualCans * 0.085).toFixed(1);

  return (
    <>
      {/* 1. Rising Bubbles Background Container */}
      <div id="bubbles-container" ref={bubblesContainerRef} aria-hidden="true" />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-[450] -translate-x-1/2 rounded-full border border-[#fbcfe8]/50 bg-[#021915]/95 px-5 py-2.5 text-xs font-bold text-[#fbcfe8] shadow-2xl backdrop-blur-xl"
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* 2. Fixed Glassmorphic Header */}
      <header className={`header ${isHeaderScrolled ? 'scrolled' : ''}`}>
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('home');
          }}
          className="logo"
          aria-label="Soda Home"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 8V16M8 12H16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Soda</span>
        </a>

        <nav className="nav glass" aria-label="Primary Navigation">
          {(
            [
              { id: 'home', label: 'Home' },
              { id: 'ingredients', label: 'Ingredients' },
              { id: 'taste', label: 'Taste' },
              { id: 'eco', label: 'Eco' },
              { id: 'reviews', label: 'Reviews' },
            ] as const
          ).map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.id);
              }}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="cart-trigger-btn"
            aria-label={`Open shopping cart (${totalCartItems} items)`}
          >
            <span>Cart</span>
            <span className="cart-badge" data-testid="header-cart-count">
              {totalCartItems}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            className="contact-btn"
          >
            Contact Us
          </button>
        </div>
      </header>

      {/* 3. Full-Screen 3D Hero Section */}
      <main className="hero" id="home">
        <div className="hero-content" ref={heroContentRef}>
          {/* 3a. Floating 3D Leaves (Far Background) */}
          <div className="leaves-container" ref={leavesBGRef} aria-hidden="true">
            {LEAF_CONFIGS.map((lf) => (
              <model-viewer
                key={lf.cls}
                className={`leaf ${lf.cls}`}
                src={ASSETS.LEAVES_GLB}
                environment-image="neutral"
                exposure="1.0"
                interaction-prompt="none"
                camera-orbit={lf.orbit}
              />
            ))}
          </div>

          {/* 3b. Left Column */}
          <div className="hero-left">
            <h1 className="main-title large-animation-1">
              <span className="outline">Pure</span>
              <br />
              Zero
            </h1>
            <p className="description">
              Unleash the crisp taste of zero sugar. <br />
              Refreshment redefined in every bubble — <br />
              all in one sleek design.
            </p>
            <div className="cta-group">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="primary-btn"
                data-testid="hero-shop-now"
              >
                Shop Now
                <span className="plus-icon" aria-hidden="true">
                  +
                </span>
              </button>
            </div>
            <div className="award-badge">
              <div className="award-icon" aria-hidden="true">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 15L15 18L19 14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 10L12 15L17 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="award-text">
                <span className="award-title">DESIGN AWARDS</span>
                <span className="award-subtitle">PREMIUM BEVERAGE 2025</span>
              </div>
            </div>
          </div>

          {/* 3c. Background Berries (Behind the Can) */}
          <div className="berries-container-bg" ref={berriesBGRef} aria-hidden="true">
            {BERRY_CONFIGS.filter((b) => b.layer === 'bg').map((b) => (
              <model-viewer
                key={b.cls}
                className={`berry ${b.cls}`}
                src={ASSETS.CHERRY_GLB}
                environment-image="neutral"
                exposure={b.exposure}
                interaction-prompt="none"
                camera-orbit={b.orbit}
              />
            ))}
          </div>

          {/* 3d. Center Product (The 3D Soda Can + Graceful Fallback) */}
          <div className="hero-center" ref={heroCenterRef}>
            {!modelError ? (
              <model-viewer
                id="product-model"
                ref={productModelRef}
                src={ASSETS.DEIT_SODA2_GLB}
                alt="Diet Soda 3D Model"
                camera-controls
                disable-zoom
                shadow-intensity="0"
                environment-image="neutral"
                exposure="1.5"
                interaction-prompt="none"
                camera-orbit="0deg 90deg 380%"
                field-of-view="30deg"
                className="main-product-3d"
              />
            ) : (
              <img
                src={FLAVORS[activeFlavor].image}
                alt={FLAVORS[activeFlavor].name}
                className="fallback-product-img"
              />
            )}
          </div>

          {/* 3e. Foreground Berries (Above Text and Can) */}
          <div className="berries-container" ref={berriesFGRef} aria-hidden="true">
            {BERRY_CONFIGS.filter((b) => b.layer === 'fg').map((b) => (
              <model-viewer
                key={b.cls}
                className={`berry ${b.cls}`}
                src={ASSETS.CHERRY_GLB}
                environment-image="neutral"
                exposure={b.exposure}
                interaction-prompt="none"
                camera-orbit={b.orbit}
              />
            ))}
          </div>

          {/* 3f. Right Column (Flavor Carousel + Side Title) */}
          <div className="hero-right">
            <div className="product-carousel">
              <div className="carousel-cards" role="radiogroup" aria-label="Select Soda Flavor">
                <div
                  role="radio"
                  aria-checked={activeFlavor === 'classic'}
                  tabIndex={0}
                  data-flavor="classic"
                  onClick={() => switchFlavor('classic')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      switchFlavor('classic');
                    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      handleToggleFlavor();
                    }
                  }}
                  className={`card ${activeFlavor === 'classic' ? 'active' : ''}`}
                >
                  <img src={ASSETS.GREEN_SODA_PNG} alt="Diet Classic" />
                  <div className="card-info">
                    <span>Diet Classic</span>
                    <span>$2.99</span>
                  </div>
                </div>

                <div
                  role="radio"
                  aria-checked={activeFlavor === 'blue'}
                  tabIndex={0}
                  data-flavor="blue"
                  onClick={() => switchFlavor('blue')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      switchFlavor('blue');
                    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                      e.preventDefault();
                      handleToggleFlavor();
                    }
                  }}
                  className={`card ${activeFlavor === 'blue' ? 'active' : ''}`}
                >
                  <img src={ASSETS.BLUE_SODA_PNG} alt="Zero Lime" />
                  <div className="card-info">
                    <span>Zero Lime</span>
                    <span>$2.99</span>
                  </div>
                </div>
              </div>

              <div className="carousel-nav">
                <button
                  type="button"
                  onClick={handleToggleFlavor}
                  className="nav-arrow"
                  aria-label="Previous flavor"
                  data-testid="carousel-prev"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={handleToggleFlavor}
                  className="nav-arrow"
                  aria-label="Next flavor"
                  data-testid="carousel-next"
                >
                  →
                </button>
              </div>
            </div>

            <h2 className="side-title large-animation-1">
              <span className="outline">Refreshingly</span>
              <br />
              Clean
            </h2>
          </div>
        </div>
      </main>

      {/* ===================== 4. INGREDIENTS SECTION ===================== */}
      <section className="section" id="ingredients" aria-labelledby="ingredients-title">
        <div className="section-inner">
          <div className="section-head">
            <span className="eyebrow">Ingredients</span>
            <h2 className="section-title" id="ingredients-title">
              Nothing to hide
            </h2>
            <p className="section-lead">
              Six things go into every can. No sugar, no syrups, no long words you have to look up.
            </p>
          </div>

          <div className="ingredients-layout">
            <div className="showcase">
              <div className="showcase-glow" aria-hidden="true" />
              <img
                className="flavor-img flavor-classic"
                src={ASSETS.GREEN_SODA_PNG}
                alt="A can of Diet Classic"
              />
              <img
                className="flavor-img flavor-blue"
                src={ASSETS.BLUE_SODA_PNG}
                alt="A can of Zero Lime"
              />
            </div>

            <div className="ingredient-grid">
              <article className="glass-card ingredient-card">
                <span className="icon-box" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3C12 3 6 10 6 14a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />
                  </svg>
                </span>
                <h3>Sparkling Water</h3>
                <p>
                  Filtered three times and carbonated cold for a sharper, longer-lasting fizz.
                </p>
              </article>

              <article className="glass-card ingredient-card">
                <span className="icon-box" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="8" cy="15" r="4" />
                    <circle cx="16.5" cy="16" r="3.5" />
                    <path d="M8 11c1-4 4-7 8-8M16.5 12.5C16 9 16 6 16 3" />
                  </svg>
                </span>
                <h3>Real Fruit Essence</h3>
                <p>
                  Cold-pressed cherry for Classic, Persian lime for Zero Lime. Nothing artificial.
                </p>
              </article>

              <article className="glass-card ingredient-card">
                <span className="icon-box" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15Z" />
                    <path d="M5 19 13 11" />
                  </svg>
                </span>
                <h3>Stevia Leaf</h3>
                <p>Plant-based sweetness with zero calories and no bitter aftertaste.</p>
              </article>

              <article className="glass-card ingredient-card">
                <span className="icon-box" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" />
                  </svg>
                </span>
                <h3>Citric Acid</h3>
                <p>A bright citrus edge that keeps every sip crisp from first to last.</p>
              </article>

              <article className="glass-card ingredient-card">
                <span className="icon-box" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
                  </svg>
                </span>
                <h3>Electrolytes</h3>
                <p>A touch of magnesium and potassium, so refreshment actually refreshes.</p>
              </article>

              <article className="glass-card ingredient-card">
                <span className="icon-box" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <h3>Natural Flavors</h3>
                <p>Botanical extracts that round off the finish. Caffeine-free, always.</p>
              </article>
            </div>
          </div>

          {/* Interactive Nutrition Panel */}
          <div className="glass-card nutrition-bar">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-white/75">
                Nutrition Facts Calculator ({FLAVORS[activeFlavor].name})
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Serving multiplier">
                {[
                  { cans: 1, label: '1 Can (330ml)' },
                  { cans: 6, label: '6-Pack' },
                  { cans: 12, label: '12-Pack' },
                  { cans: 24, label: '24-Pack' },
                ].map((opt) => (
                  <button
                    key={opt.cans}
                    type="button"
                    onClick={() => setNutritionCans(opt.cans)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      nutritionCans === opt.cans
                        ? 'bg-[#fbcfe8] text-[#011d17]'
                        : 'bg-white/10 text-white/75 hover:bg-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <dl className="nutrition-grid" aria-label="Nutrition values">
              <div>
                <dt>Calories</dt>
                <dd>0</dd>
              </div>
              <div>
                <dt>Sugar</dt>
                <dd>0g</dd>
              </div>
              <div>
                <dt>Carbs</dt>
                <dd>0g</dd>
              </div>
              <div>
                <dt>Sodium</dt>
                <dd>{35 * nutritionCans}mg</dd>
              </div>
              <div>
                <dt>Total Volume</dt>
                <dd>
                  {nutritionCans === 1
                    ? '330ml'
                    : `${((330 * nutritionCans) / 1000).toFixed(2)}L`}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ===================== 5. TASTE SECTION ===================== */}
      <section className="section" id="taste" aria-labelledby="taste-title">
        <div className="section-inner">
          <div className="section-head">
            <span className="eyebrow">Taste</span>
            <h2 className="section-title" id="taste-title">
              Two moods, zero sugar
            </h2>
            <p className="section-lead">
              Pick the one that matches your afternoon. Switching here updates the entire page and
              3D can.
            </p>
          </div>

          <div className="taste-grid">
            {(['classic', 'blue'] as FlavorId[]).map((fId) => {
              const fl = FLAVORS[fId];
              const isCurrent = activeFlavor === fId;
              return (
                <article
                  key={fId}
                  className={`glass-card taste-card ${isCurrent ? 'active-taste-card' : ''}`}
                  data-flavor={fId}
                >
                  <img className="taste-can" src={fl.image} alt={fl.name} />
                  <span className="taste-tag">{fl.tagline}</span>
                  <h3 className="taste-name">{fl.name}</h3>
                  <p className="taste-copy">{fl.copy}</p>

                  <ul className="chips">
                    {fl.chips.map((chip) => (
                      <li key={chip}>{chip}</li>
                    ))}
                  </ul>

                  <div className="meters">
                    {fl.meters.map((m) => (
                      <div className="meter" key={m.label}>
                        <span>{m.label}</span>
                        <div className="meter-track">
                          <div className="meter-fill" style={{ width: `${m.value}%` }} />
                        </div>
                        <span>{m.value}</span>
                      </div>
                    ))}
                  </div>

                  <p className="pairing">
                    <strong>Pairs with</strong> {fl.pairings}
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        switchFlavor(fId);
                        scrollToSection('home');
                      }}
                      className="primary-btn"
                    >
                      <span>{isCurrent ? `Viewing ${fl.name} in 3D` : `Try ${fl.name}`}</span>
                      <span className="plus-icon" aria-hidden="true">
                        ↻
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleAddToCart(fId, 'single', 1);
                        showToast(`Added 1 × ${fl.name} ($2.99) to cart`);
                      }}
                      className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold text-white transition hover:border-[#fbcfe8] hover:bg-[#fbcfe8] hover:text-[#011d17]"
                    >
                      + Quick Add Can ($2.99)
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== 6. ECO SECTION ===================== */}
      <section className="section" id="eco" aria-labelledby="eco-title">
        <model-viewer
          className="eco-leaf"
          src={ASSETS.LEAVES_GLB}
          environment-image="neutral"
          exposure="1.0"
          interaction-prompt="none"
          auto-rotate
          rotation-per-second="12deg"
          camera-orbit="45deg 75deg 105%"
          aria-hidden="true"
        />
        <div className="section-inner">
          <div className="section-head">
            <span className="eyebrow">Eco</span>
            <h2 className="section-title" id="eco-title">
              Good to the last can
            </h2>
            <p className="section-lead">
              Aluminium is the only packaging that can be recycled forever. So that&apos;s all we
              use.
            </p>
          </div>

          <div className="eco-stats">
            <div className="glass-card eco-stat">
              <span className="stat-num">100%</span>
              <span className="stat-label">Recyclable can, lid and tab</span>
            </div>
            <div className="glass-card eco-stat">
              <span className="stat-num">73%</span>
              <span className="stat-label">Recycled aluminium in every can</span>
            </div>
            <div className="glass-card eco-stat">
              <span className="stat-num">60</span>
              <span className="stat-label">Days from recycling bin back to shelf</span>
            </div>
            <div className="glass-card eco-stat">
              <span className="stat-num">0</span>
              <span className="stat-label">Plastic rings, wraps or straws</span>
            </div>
          </div>

          <ol className="eco-steps">
            <li className="glass-card">
              <span className="step-num">01</span>
              <h3>Drink</h3>
              <p>Enjoy it cold. Rinse it if you&apos;re feeling thorough.</p>
            </li>
            <li className="glass-card">
              <span className="step-num">02</span>
              <h3>Recycle</h3>
              <p>Into any metals bin. Crushed or whole, both work.</p>
            </li>
            <li className="glass-card">
              <span className="step-num">03</span>
              <h3>Reborn</h3>
              <p>Melted, rolled and refilled. Same can, new fizz.</p>
            </li>
          </ol>

          {/* Interactive Circular Impact Calculator */}
          <div className="glass-card mt-6">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-md">
                <span className="text-xs font-bold tracking-wider uppercase text-[#fbcfe8]">
                  Personal Impact Calculator
                </span>
                <h3 className="mt-1 font-['Outfit'] text-xl font-bold">
                  How many cans do you enjoy per week?
                </h3>
                <p className="mt-1 text-xs text-white/70">
                  Slide to see your annual closed-loop aluminum savings compared to single-use PET
                  plastic bottles.
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <input
                    type="range"
                    min={1}
                    max={28}
                    value={weeklyCans}
                    onChange={(e) => setWeeklyCans(Number(e.target.value))}
                    aria-label="Cans enjoyed per week"
                    className="h-2 flex-1 cursor-pointer accent-[#fbcfe8]"
                  />
                  <span className="min-w-[5.5rem] rounded-full bg-[#fbcfe8] px-3 py-1 text-center font-['Outfit'] text-sm font-extrabold text-[#011d17]">
                    {weeklyCans} / week
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 text-center">
                  <div className="font-['Outfit'] text-2xl font-black text-[#fbcfe8]">
                    {plasticBottlesSaved}
                  </div>
                  <div className="mt-1 text-[11px] text-white/70">
                    Plastic bottles avoided / yr
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3.5 text-center">
                  <div className="font-['Outfit'] text-2xl font-black text-[#fbcfe8]">
                    {co2SavedKg} kg
                  </div>
                  <div className="mt-1 text-[11px] text-white/70">
                    Estimated CO₂ saved / yr
                  </div>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/10 bg-black/25 p-3.5 text-center sm:col-span-1">
                  <div className="font-['Outfit'] text-2xl font-black text-emerald-300">
                    100%
                  </div>
                  <div className="mt-1 text-[11px] text-white/70">Closed-loop aluminum</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 7. REVIEWS SECTION ===================== */}
      <section className="section" id="reviews" aria-labelledby="reviews-title">
        <div className="section-inner">
          <div className="section-head">
            <span className="eyebrow">Reviews</span>
            <h2 className="section-title" id="reviews-title">
              Loved by the fizz-curious
            </h2>
          </div>

          <div className="rating-summary">
            <div className="flex items-center gap-5">
              <span className="rating-big">{averageRating}</span>
              <div>
                <div className="stars" aria-label={`${averageRating} out of 5 stars`}>
                  ★★★★★
                </div>
                <p className="text-sm text-white/70">
                  Based on {2400 + (reviews.length - INITIAL_REVIEWS.length)}+ community reviews
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'classic', 'blue'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setReviewFilter(filterKey)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    reviewFilter === filterKey
                      ? 'bg-[#fbcfe8] text-[#011d17]'
                      : 'border border-white/15 bg-white/5 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {filterKey === 'all'
                    ? 'All Flavors'
                    : filterKey === 'classic'
                    ? 'Diet Classic'
                    : 'Zero Lime'}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setShowReviewForm((prev) => !prev)}
                className="rounded-full border border-[#fbcfe8] bg-black/40 px-4 py-2 text-xs font-extrabold text-[#fbcfe8] transition hover:bg-[#fbcfe8] hover:text-[#011d17]"
              >
                {showReviewForm ? '✕ Close Review Form' : '+ Write a Review'}
              </button>
            </div>
          </div>

          {/* Write a Review Expandable Form */}
          {showReviewForm && (
            <form
              onSubmit={handleReviewSubmit}
              noValidate
              className="glass-card mb-6 space-y-4 border-[#fbcfe8]/40"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-['Outfit'] text-lg font-bold">Share Your Taste Experience</h3>
                <span className="text-xs text-white/60">Saved locally in your browser</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="review-author"
                    className="mb-1 block text-xs font-semibold text-white/80"
                  >
                    Your Name *
                  </label>
                  <input
                    id="review-author"
                    type="text"
                    value={newRevAuthor}
                    onChange={(e) => setNewRevAuthor(e.target.value)}
                    placeholder="Alex M."
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-white/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="review-flavor"
                    className="mb-1 block text-xs font-semibold text-white/80"
                  >
                    Flavor
                  </label>
                  <select
                    id="review-flavor"
                    value={newRevFlavor}
                    onChange={(e) => setNewRevFlavor(e.target.value as FlavorId)}
                    className="w-full rounded-xl border border-white/15 bg-[#031612] px-3.5 py-2 text-sm text-white"
                  >
                    <option value="classic">Diet Classic</option>
                    <option value="blue">Zero Lime</option>
                  </select>
                </div>

                <div>
                  <span className="mb-1 block text-xs font-semibold text-white/80">
                    Star Rating
                  </span>
                  <div className="flex items-center gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRevRating(star)}
                        aria-label={`Rate ${star} out of 5 stars`}
                        className={`text-xl transition ${
                          star <= newRevRating ? 'text-[#fbcfe8]' : 'text-white/25'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="review-text"
                  className="mb-1 block text-xs font-semibold text-white/80"
                >
                  Your Review *
                </label>
                <textarea
                  id="review-text"
                  rows={3}
                  value={newRevText}
                  onChange={(e) => setNewRevText(e.target.value)}
                  placeholder="How was the fizz, fruit notes, and zero-sugar finish?"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-white/40"
                />
              </div>

              {reviewFormError && (
                <p role="alert" className="text-xs text-rose-300">
                  {reviewFormError}
                </p>
              )}
              {reviewFormSuccess && (
                <p role="status" className="text-xs text-emerald-300">
                  ✓ {reviewFormSuccess}
                </p>
              )}

              <button
                type="submit"
                className="rounded-full bg-[#fbcfe8] px-6 py-2.5 text-xs font-extrabold text-[#011d17] transition hover:brightness-105"
              >
                Post Review
              </button>
            </form>
          )}

          <div className="reviews-grid">
            {filteredReviews.map((rev) => {
              const voted = helpfulVotedIds.includes(rev.id);
              return (
                <figure key={rev.id} className="glass-card review-card">
                  <div className="flex items-center justify-between">
                    <div className="stars" aria-label={`${rev.rating} out of 5 stars`}>
                      {'★'.repeat(rev.rating)}
                      {rev.rating < 5 && (
                        <span className="star-off">{'★'.repeat(5 - rev.rating)}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-white/50">{rev.date}</span>
                  </div>
                  <blockquote>&ldquo;{rev.text}&rdquo;</blockquote>
                  <figcaption>
                    <div className="flex items-center gap-3">
                      <span className="avatar" aria-hidden="true">
                        {rev.avatar}
                      </span>
                      <div className="flex flex-col">
                        <strong className="text-sm">{rev.author}</strong>
                        <small className="text-xs text-white/65">
                          {FLAVORS[rev.flavorId].name}
                        </small>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleHelpful(rev.id)}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        voted
                          ? 'border-[#fbcfe8] bg-[#fbcfe8]/20 text-[#fbcfe8]'
                          : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/15'
                      }`}
                    >
                      👍 Helpful ({rev.helpfulCount})
                    </button>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== 8. CONTACT, FAQ & FOOTER SECTION ===================== */}
      <section className="section section-end" id="contact" aria-labelledby="cta-title">
        <div className="section-inner">
          {/* CTA Band */}
          <div className="glass-card cta-band">
            <div>
              <h2 className="section-title" id="cta-title">
                Ready for zero?
              </h2>
              <p className="section-lead">
                Free delivery on every 12-pack and 24-pack. Questions?{' '}
                <a href="mailto:hello@soda.example">hello@soda.example</a>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="primary-btn"
              >
                Shop Now
                <span className="plus-icon" aria-hidden="true">
                  +
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsContactOpen(true)}
                className="contact-btn"
              >
                Open Contact Form
              </button>
            </div>
          </div>

          {/* FAQ Accordion + Direct Contact Form */}
          <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <span className="eyebrow">FAQ</span>
                <h3 className="font-['Galada'] text-4xl font-normal text-white">
                  Frequently Asked Questions
                </h3>
                <p className="mt-1 max-w-md text-sm text-white/70">
                  Everything you need to know about our cold-filtered carbonation, botanical
                  sweeteners, and closed-loop cans.
                </p>
              </div>

              <div className="space-y-3">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={item.q} className="glass-card !p-4">
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 text-left font-['Outfit'] text-base font-bold text-white"
                      >
                        <span>{item.q}</span>
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm text-[#fbcfe8]">
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>
                      {isOpen && (
                        <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-white/75">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Inline Contact Form */}
            <div className="glass-card">
              <span className="eyebrow">Direct Inquiry</span>
              <h3 className="font-['Galada'] text-3xl font-normal text-white">
                Send Us a Message
              </h3>
              <p className="mt-1 text-xs text-white/70">
                Reach out for wholesale partnerships, press kits, or customer questions.
              </p>

              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  const errs: Record<string, string> = {};
                  if (inlineName.trim().length < 2) {
                    errs.name = 'Please enter your name (at least 2 characters).';
                  }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inlineEmail.trim())) {
                    errs.email = 'Please enter a valid email address.';
                  }
                  if (inlineMessage.trim().length < 10) {
                    errs.message = 'Please enter a message of at least 10 characters.';
                  }
                  setInlineErrors(errs);
                  if (Object.keys(errs).length > 0) return;

                  const payload = {
                    name: inlineName.trim(),
                    email: inlineEmail.trim(),
                    topic: inlineTopic,
                    message: inlineMessage.trim(),
                  };
                  try {
                    const saved = JSON.parse(
                      localStorage.getItem('soda_contact_inquiries') || '[]'
                    );
                    saved.unshift({ ...payload, createdAt: new Date().toISOString() });
                    localStorage.setItem(
                      'soda_contact_inquiries',
                      JSON.stringify(saved.slice(0, 20))
                    );
                  } catch {
                    // ignore
                  }
                  setInlineSubmitted(payload);
                  showToast('Inquiry validated & saved!');
                }}
                className="mt-4 space-y-3.5"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="inline-contact-name"
                      className="mb-1 block text-xs font-semibold text-white/80"
                    >
                      Your Name *
                    </label>
                    <input
                      id="inline-contact-name"
                      type="text"
                      value={inlineName}
                      onChange={(e) => {
                        setInlineName(e.target.value);
                        if (inlineErrors.name) setInlineErrors({ ...inlineErrors, name: '' });
                      }}
                      placeholder="Elena Rostova"
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-white/40"
                    />
                    {inlineErrors.name && (
                      <p className="mt-1 text-xs text-rose-300">{inlineErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="inline-contact-email"
                      className="mb-1 block text-xs font-semibold text-white/80"
                    >
                      Email Address *
                    </label>
                    <input
                      id="inline-contact-email"
                      type="email"
                      value={inlineEmail}
                      onChange={(e) => {
                        setInlineEmail(e.target.value);
                        if (inlineErrors.email) setInlineErrors({ ...inlineErrors, email: '' });
                      }}
                      placeholder="elena@example.com"
                      className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-white/40"
                    />
                    {inlineErrors.email && (
                      <p className="mt-1 text-xs text-rose-300">{inlineErrors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="inline-contact-topic"
                    className="mb-1 block text-xs font-semibold text-white/80"
                  >
                    Department
                  </label>
                  <select
                    id="inline-contact-topic"
                    value={inlineTopic}
                    onChange={(e) => setInlineTopic(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#031612] px-3.5 py-2 text-sm text-white"
                  >
                    <option value="Customer Support">Customer Support</option>
                    <option value="Wholesale & Retail">Wholesale & Retail</option>
                    <option value="Product & Nutrition">Product & Nutrition</option>
                    <option value="Press & Partnerships">Press & Partnerships</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="inline-contact-message"
                    className="mb-1 block text-xs font-semibold text-white/80"
                  >
                    Message *
                  </label>
                  <textarea
                    id="inline-contact-message"
                    rows={3}
                    value={inlineMessage}
                    onChange={(e) => {
                      setInlineMessage(e.target.value);
                      if (inlineErrors.message)
                        setInlineErrors({ ...inlineErrors, message: '' });
                    }}
                    placeholder="How can our team help you?"
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2 text-sm text-white placeholder-white/40"
                  />
                  {inlineErrors.message && (
                    <p className="mt-1 text-xs text-rose-300">{inlineErrors.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="rounded-full bg-[#fbcfe8] px-6 py-2.5 text-xs font-extrabold text-[#011d17] transition hover:brightness-105"
                >
                  Validate & Prepare Inquiry
                </button>
              </form>

              {inlineSubmitted && (
                <div
                  role="status"
                  className="mt-4 space-y-2 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-3.5 text-xs"
                >
                  <div className="font-bold text-emerald-200">
                    ✓ Inquiry Validated & Saved Locally
                  </div>
                  <p className="text-white/80">
                    No server-side email API is configured in this client environment. Click below
                    to send via your email client:
                  </p>
                  <a
                    href={`mailto:hello@soda.example?subject=${encodeURIComponent(
                      `[${inlineSubmitted.topic}] Inquiry from ${inlineSubmitted.name}`
                    )}&body=${encodeURIComponent(
                      `Name: ${inlineSubmitted.name}\nEmail: ${inlineSubmitted.email}\nDepartment: ${inlineSubmitted.topic}\n\n${inlineSubmitted.message}`
                    )}`}
                    className="inline-block rounded-full bg-[#fbcfe8] px-4 py-1.5 font-extrabold text-[#011d17] hover:brightness-105"
                  >
                    Open in Email Client (mailto:)
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Site Footer */}
          <footer className="site-footer">
            <a
              href="#home"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('home');
              }}
              className="logo"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 8V16M8 12H16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>Soda</span>
            </a>

            <nav className="footer-nav" aria-label="Footer Navigation">
              <a
                href="#home"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('home');
                }}
              >
                Home
              </a>
              <a
                href="#ingredients"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('ingredients');
                }}
              >
                Ingredients
              </a>
              <a
                href="#taste"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('taste');
                }}
              >
                Taste
              </a>
              <a
                href="#eco"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('eco');
                }}
              >
                Eco
              </a>
              <a
                href="#reviews"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('reviews');
                }}
              >
                Reviews
              </a>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  setIsContactOpen(true);
                }}
              >
                Contact Us
              </a>
            </nav>

            <p className="copyright">© 2025 Soda. Zero sugar, zero compromise.</p>
          </footer>
        </div>
      </section>

      {/* Hidden Frosted Glass SVG Filter + Model Preload Block (from Design Spec) */}
      <svg
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <filter id="frosted">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.0125"
            numOctaves={3}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={80}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <div style={{ display: 'none' }} aria-hidden="true">
        <model-viewer src={ASSETS.BLUEBERRY_GLB} />
        <model-viewer src={ASSETS.CHERRY_GLB} />
      </div>

      {/* Shopping Cart & Product Selection Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        activeFlavor={activeFlavor}
        onSelectFlavor={(flavor) => switchFlavor(flavor)}
        cart={cart}
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
      />

      {/* Contact Us Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}
