import { test, expect, type Page } from "@playwright/test"

const BASE = process.env.BASE_URL ?? "http://localhost:3000"

async function loginAsStudent(page: Page) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel("Email").fill("student@test.com")
  await page.getByLabel("Password").fill("Test1234!")
  await page.getByRole("button", { name: /sign in/i }).click()
  await expect(page).toHaveURL(/dashboard/)
}

test.describe("Classroom generation flow", () => {
  test.beforeEach(async ({ page }) => { await loginAsStudent(page) })

  test("student can open explain modal and see generating state", async ({ page }) => {
    await page.goto(`${BASE}/doubt/physics-newton-laws`)
    const btn = page.getByRole("button", { name: /learn this concept/i })
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByText("Explain concept")).toBeVisible()
    await page.getByText("Explain concept").click()
    await expect(page.getByText(/generating/i)).toBeVisible()
  })

  test("classroom viewer renders when ready", async ({ page }) => {
    await page.route("**/api/v1/classroom/status/**", route =>
      route.fulfill({
        body: JSON.stringify({
          session_id:    "test-123",
          status:        "ready",
          classroom_url: "https://classroom.doubtmaster.ai/demo",
          error_message: null,
        }),
      })
    )
    await page.goto(`${BASE}/doubt/physics-newton-laws`)
    await page.getByRole("button", { name: /learn this concept/i }).click()
    await page.getByText("Explain concept").click()
    // title attribute matches classroom-viewer.tsx implementation
    await expect(
      page.locator("iframe[title='OpenMAIC Interactive Classroom']")
    ).toBeVisible({ timeout: 10_000 })
  })

  test("ESC key closes classroom viewer", async ({ page }) => {
    await page.route("**/api/v1/classroom/status/**", route =>
      route.fulfill({
        body: JSON.stringify({
          session_id: "t", status: "ready",
          classroom_url: "https://example.com", error_message: null,
        }),
      })
    )
    await page.goto(`${BASE}/doubt/physics-newton-laws`)
    await page.getByRole("button", { name: /learn this concept/i }).click()
    await page.getByText("Explain concept").click()
    await page.keyboard.press("Escape")
    await expect(page.locator("iframe")).not.toBeVisible()
  })
})

test.describe("Auth security", () => {
  test("unauthenticated user redirects to login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`)
    await expect(page).toHaveURL(/login/)
  })

  test("login rate limit shows user-friendly message after 5 fails", async ({ page }) => {
    await page.goto(`${BASE}/login`)
    for (let i = 0; i < 6; i++) {
      await page.getByLabel("Email").fill("x@x.com")
      await page.getByLabel("Password").fill("wrong")
      await page.getByRole("button", { name: /sign in/i }).click()
    }
    await expect(page.getByText(/too many attempts/i)).toBeVisible()
  })
})
