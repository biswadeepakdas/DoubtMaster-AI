"""
Load test — Locust.
Run: locust -f locustfile.py --host=https://api.doubtmaster.ai
Requires loadtest user seeded by `make seed-test-db`.
Targets: 200 concurrent users, p95 latency targets per tier.
"""

from locust import HttpUser, task, between


class StudentUser(HttpUser):
    wait_time = between(1, 3)
    token: str = ""

    def on_start(self):
        r = self.client.post("/api/v1/auth/login",
            json={"email": "loadtest@doubtmaster.ai", "password": "LoadTest1234!"})
        self.token = r.json().get("access_token", "")

    def headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    @task(10)
    def solve_simple_question(self):
        """Tier 1 — target p95 < 800ms."""
        self.client.post("/api/v1/homework/solve",
            json={"question": "What is photosynthesis?", "subject": "biology", "syllabus": "CBSE"},
            headers=self.headers())

    @task(5)
    def solve_maths_question(self):
        """Tier 2 — target p95 < 3000ms."""
        self.client.post("/api/v1/homework/solve",
            json={"question": "Solve 2x^2 + 5x - 3 = 0", "subject": "maths", "syllabus": "CBSE"},
            headers=self.headers())

    @task(2)
    def start_classroom(self):
        """Tier 3 — async 202, target response < 500ms."""
        self.client.post("/api/v1/classroom/generate",
            json={"mode": "explain", "subject": "physics",
                  "topic": "Newton's Laws", "syllabus": "CBSE"},
            headers=self.headers())

    @task(1)
    def health_check(self):
        self.client.get("/health")
