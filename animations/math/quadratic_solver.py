"""
Manim Animation: Solving Quadratic Equations
3Blue1Brown-style visual explainer for DoubtMaster AI

Usage:
  manim render -ql quadratic_solver.py QuadraticSolver
  manim render -qh quadratic_solver.py QuadraticSolver  (high quality)
"""

from manim import *


class QuadraticSolver(Scene):
    def construct(self):
        # Title
        title = Text("Solving Quadratic Equations", font_size=36)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(1)

        # Show the equation
        eq = MathTex("2x^2 + 5x - 3 = 0", font_size=42)
        self.play(Write(eq))
        self.wait(1)

        # Highlight coefficients with colors
        a_label = MathTex("a=2", color=RED).next_to(eq, DOWN, buff=0.8)
        b_label = MathTex("b=5", color=BLUE).next_to(a_label, RIGHT, buff=0.5)
        c_label = MathTex("c=-3", color=GREEN).next_to(b_label, RIGHT, buff=0.5)
        self.play(FadeIn(a_label), FadeIn(b_label), FadeIn(c_label))
        self.wait(1)

        # Show the quadratic formula
        formula = MathTex(
            r"x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}",
            font_size=38,
        ).shift(DOWN * 0.5)
        self.play(
            eq.animate.shift(UP * 1.5),
            FadeOut(a_label, b_label, c_label),
        )
        self.play(Write(formula))
        self.wait(2)

        # Substitute values
        substituted = MathTex(
            r"x = \frac{-5 \pm \sqrt{25 + 24}}{4}",
            font_size=38,
        ).shift(DOWN * 0.5)
        self.play(Transform(formula, substituted))
        self.wait(1)

        # Simplify discriminant
        simplified = MathTex(
            r"x = \frac{-5 \pm 7}{4}",
            font_size=38,
        ).shift(DOWN * 0.5)
        self.play(Transform(formula, simplified))
        self.wait(1)

        # Show both roots
        root1 = MathTex(r"x_1 = \frac{1}{2}", color=YELLOW, font_size=36)
        root2 = MathTex(r"x_2 = -3", color=YELLOW, font_size=36)
        roots = VGroup(root1, root2).arrange(RIGHT, buff=1.5).shift(DOWN * 2)
        self.play(FadeIn(roots))
        self.wait(1)

        # Show parabola with roots marked
        axes = Axes(
            x_range=[-5, 3, 1],
            y_range=[-10, 10, 5],
            axis_config={"include_numbers": True},
        )
        axes.scale(0.5).to_edge(RIGHT)

        graph = axes.plot(lambda x: 2 * x**2 + 5 * x - 3, color=BLUE)
        graph_label = axes.get_graph_label(graph, label="f(x)")

        root_dots = VGroup(
            Dot(axes.c2p(0.5, 0), color=YELLOW, radius=0.08),
            Dot(axes.c2p(-3, 0), color=YELLOW, radius=0.08),
        )
        root_labels = VGroup(
            MathTex(r"\frac{1}{2}", font_size=24, color=YELLOW).next_to(
                axes.c2p(0.5, 0), UP
            ),
            MathTex(r"-3", font_size=24, color=YELLOW).next_to(
                axes.c2p(-3, 0), UP
            ),
        )

        self.play(FadeOut(eq, formula, roots, title))
        self.play(Create(axes), Create(graph))
        self.play(FadeIn(root_dots), FadeIn(root_labels))
        self.wait(2)

        # Final answer box
        answer = MathTex(
            r"x = \frac{1}{2} \text{ or } x = -3",
            color=YELLOW,
            font_size=36,
        )
        answer_box = SurroundingRectangle(answer, color=YELLOW, buff=0.2)
        answer_group = VGroup(answer, answer_box).to_edge(DOWN)

        self.play(FadeIn(answer_group))
        self.wait(2)


class PythagorasTheorem(Scene):
    """Visual proof of the Pythagorean theorem."""

    def construct(self):
        title = Text("Pythagoras Theorem", font_size=36)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        # Draw right triangle
        A = np.array([-2, -1.5, 0])
        B = np.array([2, -1.5, 0])
        C = np.array([2, 1, 0])

        triangle = Polygon(A, B, C, color=WHITE, fill_opacity=0.1)
        self.play(Create(triangle))

        # Right angle marker
        right_angle = Square(side_length=0.3, color=WHITE)
        right_angle.move_to(B + np.array([-0.15, 0.15, 0]))
        self.play(Create(right_angle))

        # Label sides
        a_label = MathTex("a", color=RED, font_size=30).next_to(
            Line(B, C).get_center(), RIGHT, buff=0.3
        )
        b_label = MathTex("b", color=BLUE, font_size=30).next_to(
            Line(A, B).get_center(), DOWN, buff=0.3
        )
        c_label = MathTex("c", color=GREEN, font_size=30).next_to(
            Line(A, C).get_center(), LEFT + UP, buff=0.2
        )
        self.play(FadeIn(a_label, b_label, c_label))
        self.wait(1)

        # Show squares on each side
        sq_a = Square(side_length=2.5, color=RED, fill_opacity=0.2).next_to(
            Line(B, C), RIGHT, buff=0
        )
        sq_b = Square(side_length=4, color=BLUE, fill_opacity=0.2).next_to(
            Line(A, B), DOWN, buff=0
        )

        self.play(Create(sq_a), Create(sq_b))
        self.wait(1)

        # Show the theorem
        theorem = MathTex(
            "a^2", "+", "b^2", "=", "c^2", font_size=42, color=YELLOW
        )
        theorem.to_edge(DOWN, buff=0.5)
        self.play(Write(theorem))
        self.wait(2)

        # Highlight with box
        box = SurroundingRectangle(theorem, color=YELLOW, buff=0.15)
        self.play(Create(box))
        self.wait(2)
