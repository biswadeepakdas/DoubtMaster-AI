# TODOS — DoubtMaster AI

## P0 — Before Any Other Work

### LLM Animation Quality Audit
- **What:** Run 20 common physics questions through solver.js and evaluate the p5.js animation output quality. Score each: working/broken/meaningless.
- **Why:** The entire "animation-first wedge" strategy depends on the LLM generating good animations. If 15/20 are broken, the strategy collapses and no other work matters.
- **Effort:** S (human: ~2 hours / CC: ~30 min)
- **Priority:** P0
- **Depends on:** Nothing — this is step 0.

### Fix iframe sandbox blocking animation controls
- **What:** AnimationRenderer.js uses `sandbox="allow-scripts"` without `allow-same-origin`. The play/pause/restart buttons silently fail because the parent can't access iframe contentWindow.
- **Why:** Core animation UX is broken — buttons are decorative. Students can't control the animation.
- **Effort:** S (human: ~1 hour / CC: ~10 min)
- **Priority:** P0
- **Depends on:** LLM animation quality audit (only fix if animations are worth showing).

## P1 — Make App Demoable

### Fix 6 critical auth bugs (BUG-001 through BUG-004, BUG-006, BUG-007)
- **What:** Rewrite frontend-backend auth contract. Frontend sends method+identifier, backend expects phone/email directly. Endpoint names, field names, response shapes all mismatched. Plus auth middleware crashes server on invalid tokens.
- **Why:** The entire signup/login flow is broken. Can't demo to students without working auth.
- **Effort:** M (human: ~3 days / CC: ~2 hours) — this is bigger than "fix 4 bugs," it's an auth integration rewrite.
- **Priority:** P1
- **Depends on:** P0 animation audit (don't fix auth if animations don't work).

### Add graceful degradation for animation failures
- **What:** If animator step fails (LLM timeout, bad JS, broken Canvas), return text solution + "Visual simulation unavailable for this problem." 3 error classes: timeout, bad output, refusal.
- **Why:** A broken animation with no fallback = "this app doesn't work." Text solution with note = "this app is smart."
- **Effort:** S (human: ~4 hours / CC: ~30 min)
- **Priority:** P1
- **Depends on:** Animation quality audit.

### Strip landing page to animation wedge
- **What:** Landing page should have: hero with tagline "See the physics. Don't just read it." + one CTA, single demo animation embed, signup form. Hide (don't delete) pricing tables, feature grids, testimonials, footer links. Hide sidebar nav to mock tests, progress, settings.
- **Why:** Focus the user experience on the one differentiator.
- **Effort:** S (human: ~1 day / CC: ~30 min)
- **Priority:** P1

### Wire animator into solve flow
- **What:** Currently animator.js is standalone, not in the conductor pipeline. The conductor itself is dead code (never instantiated). Decision: wire animation generation into the solver.js flow as a post-solve step, or keep questions.js → solver.js flow and add animator call at the end.
- **Why:** Single request should return solution + animation. One loading state, not two.
- **Effort:** M (human: ~2 days / CC: ~1 hour)
- **Priority:** P1
- **Depends on:** Animation quality audit.

## P2 — Post-Validation

### Build 3 polished interactive Canvas templates
- **What:** Hand-crafted projectile motion, optics (lens/mirror), circuits simulations with real variable sliders. Not LLM-generated — guaranteed quality fallbacks.
- **Why:** Pre-generate for demos. Fallback when AI output is poor.
- **Effort:** M (human: ~1 week / CC: ~2 hours)
- **Priority:** P2
- **Depends on:** P0 audit results (skip if pivoting away from animations).

### Mobile Canvas performance optimization
- **What:** p5.js is 900KB+. Loading it in a sandboxed iframe per animation on mid-range Android (Redmi, Realme) may crash the browser tab. Test on real devices or BrowserStack. May need to switch to raw Canvas API instead of p5.js.
- **Why:** India is mobile-first. If animations don't work on phones, the wedge strategy fails.
- **Effort:** M (human: ~3 days / CC: ~1 day)
- **Priority:** P2

### Real payment integration (Razorpay)
- **What:** Replace stubbed payment service with real Razorpay SDK. Set up webhook handling, subscription lifecycle.
- **Why:** Can't monetize without real payments. Currently returns demo subscription IDs.
- **Effort:** M (human: ~1 week / CC: ~2 hours)
- **Priority:** P2
- **Depends on:** Validation results (only if students/parents willing to pay).

### Clean up dead code
- **What:** conductor.js is dead code (never instantiated). AnimatorAgent is instantiated with null LLM. animations table schema doesn't match actual animation data flow. Duplicate /signup + /register routes in auth.js.
- **Why:** Confusing for any future contributor. Dead code creates false assumptions about what works.
- **Effort:** S (human: ~4 hours / CC: ~30 min)
- **Priority:** P2
