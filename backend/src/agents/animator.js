/**
 * Animator Agent — Generates educational animations for concept explanation
 * Supports: Manim (math/physics), HTML5 Canvas (science), Lottie (young), Slides (fallback)
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SYSTEM_PROMPT = readFileSync(join(__dirname, '../prompts/animator.txt'), 'utf-8');

// Concept → approach mapping
const APPROACH_MAP = {
  math: 'manim',
  physics: 'manim',
  chemistry: 'html5',
  biology: 'html5',
  history: 'slides',
  geography: 'html5',
  economics: 'slides',
};

export class AnimatorAgent {
  constructor(llmService, config = {}) {
    this.llm = llmService;
    this.manimPath = config.manimPath || '/usr/local/bin/manim';
    this.outputDir = config.outputDir || '/tmp/animations';
  }

  /**
   * Generate an animation for a question or concept
   */
  async generateAnimation({ questionId, concept, subject, grade, language }) {
    const animationId = `anim_${uuidv4().slice(0, 8)}`;
    const approach = this.selectApproach(subject, grade);

    logger.info(`Generating ${approach} animation for concept: "${concept}" (grade ${grade})`);

    let result;
    switch (approach) {
      case 'manim':
        result = await this.generateManimAnimation(animationId, concept, subject, grade, language);
        break;
      case 'html5':
        result = await this.generateHTML5Animation(animationId, concept, subject, grade, language);
        break;
      case 'lottie':
        result = await this.generateLottieAnimation(animationId, concept, grade);
        break;
      default:
        result = await this.generateSlideAnimation(animationId, concept, subject, grade, language);
    }

    return {
      animation_id: animationId,
      question_id: questionId,
      concept,
      approach_used: approach,
      ...result,
      grade_level: grade,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Select best animation approach based on subject and grade
   */
  selectApproach(subject, grade) {
    if (grade && grade <= 3) return 'lottie';
    return APPROACH_MAP[subject] || 'slides';
  }

  /**
   * Generate Manim animation (3Blue1Brown style) for math/physics
   */
  async generateManimAnimation(animationId, concept, subject, grade, language) {
    // In production: use LLM to generate Manim script, then execute
    // const scriptResponse = await this.llm.call({
    //   systemPrompt: SYSTEM_PROMPT,
    //   userPrompt: `Generate a Manim Python script for: "${concept}" (Grade ${grade} ${subject})`
    // });
    // const script = scriptResponse.manim_script;
    // Execute: manim render -ql script.py SceneName

    const manimScript = this.getManimTemplate(concept, subject);

    return {
      manim_script: manimScript,
      animation_type: 'manim',
      video_url: `/api/animations/${animationId}/video`,
      thumbnail_url: `/api/animations/${animationId}/thumbnail`,
      duration_seconds: 52,
      narration_text: this.generateNarration(concept, language),
      subtitles: this.generateSubtitles(concept, language),
      status: 'complete',
    };
  }

  /**
   * Generate HTML5 Canvas animation for science concepts
   */
  async generateHTML5Animation(animationId, concept, subject, grade, language) {
    // In production: LLM generates HTML+CSS+JS, rendered via Puppeteer

    return {
      animation_type: 'html5',
      html_code: this.getHTML5Template(concept, subject),
      video_url: `/api/animations/${animationId}/video`,
      thumbnail_url: `/api/animations/${animationId}/thumbnail`,
      duration_seconds: 45,
      narration_text: this.generateNarration(concept, language),
      subtitles: this.generateSubtitles(concept, language),
      status: 'complete',
    };
  }

  /**
   * Generate Lottie animation for young grades (Class 1-3)
   */
  async generateLottieAnimation(animationId, concept, grade) {
    return {
      animation_type: 'lottie',
      lottie_url: `/api/animations/${animationId}/lottie`,
      video_url: `/api/animations/${animationId}/video`,
      thumbnail_url: `/api/animations/${animationId}/thumbnail`,
      duration_seconds: 30,
      status: 'complete',
    };
  }

  /**
   * Generate slide-based animation with voiceover (fallback)
   */
  async generateSlideAnimation(animationId, concept, subject, grade, language) {
    return {
      animation_type: 'slides',
      slides: [
        { frame: 1, title: concept, content: `Let's understand ${concept}`, duration: 5 },
        { frame: 2, title: 'Key Concept', content: 'Main explanation here', duration: 10 },
        { frame: 3, title: 'Example', content: 'Worked example', duration: 15 },
        { frame: 4, title: 'Summary', content: 'Key takeaways', duration: 5 },
      ],
      video_url: `/api/animations/${animationId}/video`,
      thumbnail_url: `/api/animations/${animationId}/thumbnail`,
      duration_seconds: 35,
      narration_text: this.generateNarration(concept, language),
      status: 'complete',
    };
  }

  /**
   * Get Manim template for common math concepts
   */
  getManimTemplate(concept, subject) {
    const lowerConcept = concept.toLowerCase();

    if (/quadratic/.test(lowerConcept)) {
      return `from manim import *

class QuadraticSolver(Scene):
    def construct(self):
        title = Text("Solving Quadratic Equations", font_size=36)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(1)

        eq = MathTex("2x^2 + 5x - 3 = 0", font_size=42)
        self.play(Write(eq))
        self.wait(1)

        a_label = MathTex("a=2", color=RED).next_to(eq, DOWN, buff=0.8)
        b_label = MathTex("b=5", color=BLUE).next_to(a_label, RIGHT, buff=0.5)
        c_label = MathTex("c=-3", color=GREEN).next_to(b_label, RIGHT, buff=0.5)
        self.play(FadeIn(a_label), FadeIn(b_label), FadeIn(c_label))
        self.wait(1)

        formula = MathTex(
            "x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}",
            font_size=38
        ).shift(DOWN * 0.5)
        self.play(eq.animate.shift(UP * 1.5), FadeOut(a_label, b_label, c_label))
        self.play(Write(formula))
        self.wait(2)

        substituted = MathTex(
            "x = \\\\frac{-5 \\\\pm \\\\sqrt{25 + 24}}{4}",
            font_size=38
        ).shift(DOWN * 0.5)
        self.play(Transform(formula, substituted))
        self.wait(1)

        simplified = MathTex(
            "x = \\\\frac{-5 \\\\pm 7}{4}",
            font_size=38
        ).shift(DOWN * 0.5)
        self.play(Transform(formula, simplified))
        self.wait(1)

        root1 = MathTex("x_1 = \\\\frac{1}{2}", color=YELLOW, font_size=36)
        root2 = MathTex("x_2 = -3", color=YELLOW, font_size=36)
        roots = VGroup(root1, root2).arrange(RIGHT, buff=1.5).shift(DOWN * 2)
        self.play(FadeIn(roots))
        self.wait(1)

        axes = Axes(x_range=[-5, 3], y_range=[-10, 10], axis_config={"include_numbers": True})
        axes.scale(0.5).to_edge(RIGHT)
        graph = axes.plot(lambda x: 2*x**2 + 5*x - 3, color=BLUE)
        dots = VGroup(
            Dot(axes.c2p(0.5, 0), color=YELLOW),
            Dot(axes.c2p(-3, 0), color=YELLOW)
        )
        self.play(FadeOut(eq, formula, roots, title))
        self.play(Create(axes), Create(graph))
        self.play(FadeIn(dots))
        self.wait(2)`;
    }

    if (/pythagoras|pythagorean/.test(lowerConcept)) {
      return `from manim import *

class PythagorasTheorem(Scene):
    def construct(self):
        title = Text("Pythagoras Theorem", font_size=36)
        title.to_edge(UP)
        self.play(Write(title))

        # Draw right triangle
        A = np.array([-2, -1, 0])
        B = np.array([2, -1, 0])
        C = np.array([2, 1.5, 0])
        triangle = Polygon(A, B, C, color=WHITE)
        self.play(Create(triangle))

        # Label sides
        a_label = MathTex("a", color=RED).next_to(Line(B, C), RIGHT)
        b_label = MathTex("b", color=BLUE).next_to(Line(A, B), DOWN)
        c_label = MathTex("c", color=GREEN).next_to(Line(A, C), LEFT)
        self.play(FadeIn(a_label, b_label, c_label))
        self.wait(1)

        # Show theorem
        theorem = MathTex("a^2 + b^2 = c^2", font_size=42, color=YELLOW)
        theorem.to_edge(DOWN)
        self.play(Write(theorem))
        self.wait(2)`;
    }

    // Generic template
    return `from manim import *

class ConceptExplainer(Scene):
    def construct(self):
        title = Text("${concept}", font_size=36)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(1)

        explanation = Text("Visual explanation of the concept", font_size=24)
        self.play(Write(explanation))
        self.wait(2)`;
  }

  /**
   * Get HTML5 Canvas template
   */
  getHTML5Template(concept, subject) {
    return `<!DOCTYPE html>
<html><head><style>
  body { margin:0; background:#0f172a; display:flex; align-items:center; justify-content:center; height:100vh; }
  canvas { border-radius:12px; }
  .title { color:#fff; font-family:Inter,sans-serif; font-size:24px; text-align:center; margin-bottom:20px; }
</style></head>
<body>
<div>
  <div class="title">${concept}</div>
  <canvas id="c" width="800" height="450"></canvas>
</div>
<script>
const ctx = document.getElementById('c').getContext('2d');
// Animation logic generated by AI for: ${concept}
let frame = 0;
function animate() {
  ctx.clearRect(0, 0, 800, 450);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 800, 450);
  ctx.fillStyle = '#6366f1';
  ctx.font = '20px Inter';
  ctx.fillText('${concept}', 20, 40);
  frame++;
  requestAnimationFrame(animate);
}
animate();
</script></body></html>`;
  }

  generateNarration(concept, language) {
    if (language === 'hi') return `Dekhte hain ${concept} kaise kaam karta hai...`;
    if (language === 'ta') return `${concept} eppadi velai seikirathu enbathai paarpom...`;
    return `Let's see how ${concept} works step by step...`;
  }

  generateSubtitles(concept, language) {
    return [
      { time: 0, text: concept },
      { time: 5, text: 'Let\'s break this down' },
      { time: 15, text: 'Here\'s the key concept' },
      { time: 30, text: 'Now let\'s apply it' },
      { time: 45, text: 'And that\'s the solution!' },
    ];
  }
}
