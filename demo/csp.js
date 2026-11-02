// The strict-CSP pages: this file is the only script they run, and there is no inline style or script on them.
// ?fallback hides the constructable-stylesheet API first, so the element has to take its <style> route.
let blocked = 0;
const show = () => {
  document.body.dataset.violations = String(blocked);
  document.getElementById("status").textContent = `styles blocked by the policy: ${blocked}`;
};
document.addEventListener("securitypolicyviolation", (event) => {
  if (event.violatedDirective.startsWith("style-src")) blocked += 1;
  show();
});
show();
if (new URLSearchParams(location.search).has("fallback")) delete window.CSSStyleSheet.prototype.replaceSync;
await import("./dist/view-controls/define.js");
