import { expect, test } from "@playwright/test";

// The clock's local time is the page's own date. CI runs in UTC, and a runner's Date can disagree with the
// browser's by an hour, so the expected text is worked out in the page and the runner only compares the two strings.
const ZONES = ["America/Vancouver", "Asia/Tokyo"];

for (const zone of ZONES) {
  test.describe(zone, () => {
    test.use({ timezoneId: zone });
    test("the clock matches the page's own date", async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/interface.html");
      await page.waitForFunction(() => customElements.get("kazoku-control-bar") !== undefined && document.querySelector("#bar").clock !== undefined);
      const result = await page.evaluate(() => {
        const ms = Date.UTC(2026, 10, 10, 21, 14);
        const bar = document.querySelector("#bar");
        const read = () => {
          bar.clock.pause();
          bar.clock.set(ms);
          const shown = bar.shadowRoot.querySelector("button.clock .t").textContent;
          bar.shadowRoot.querySelector("button.clock").click();
          const input = bar.shadowRoot.querySelector('input[type="datetime-local"]').value;
          bar.shadowRoot.querySelector("button.clock").click();
          return { shown, input };
        };
        const date = new Date(ms);
        const two = (n) => String(n).padStart(2, "0");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const name = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "";
        const local = {
          label: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} · ${two(date.getHours())}:${two(date.getMinutes())} ${name}`,
          field: `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`,
        };
        const utc = {
          label: `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} · ${two(date.getUTCHours())}:${two(date.getUTCMinutes())} UTC`,
          field: `${date.getUTCFullYear()}-${two(date.getUTCMonth() + 1)}-${two(date.getUTCDate())}T${two(date.getUTCHours())}:${two(date.getUTCMinutes())}`,
        };
        const here = read();
        bar.setAttribute("timezone", "utc");
        const there = read();
        bar.removeAttribute("timezone");
        return { here, there, local, utc };
      });
      expect(result.here.shown).toBe(result.local.label);
      expect(result.here.input).toBe(result.local.field);
      expect(result.there.shown).toBe(result.utc.label);
      expect(result.there.input).toBe(result.utc.field);
      expect(errors).toEqual([]);
    });
  });
}
