// What the view controls draw into their shadow root: the icons and the markup, made once as a string. Moved out of element.ts as it was.

const icon = (path: string, cls = ""): string => `<svg viewBox="0 0 24 24" aria-hidden="true" class="${cls}"><path d="${path}"/></svg>`;
const ICON = {
  play: icon("M8 5v14l11-7z", "i-play"),
  pause: icon("M7 5h4v14H7zM13 5h4v14h-4z", "i-pause"),
  minus: icon("M5 11h14v2H5z"),
  plus: icon("M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"),
  left: icon("M15 5l-9 7 9 7z"),
  right: icon("M9 5l9 7-9 7z"),
  up: icon("M5 15l7-9 7 9z"),
  down: icon("M5 9l7 9 7-9z"),
  centre: icon("M11 2h2v5h-2zM11 17h2v5h-2zM2 11h5v2H2zM17 11h5v2h-5zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z"),
  more: icon("M3 7h18v2H3zM3 15h18v2H3zM8 4a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM16 12a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"),
};

export const HTML = `
<div class="bar" part="bar" role="group">
  <div class="field angle" part="field angle"><label data-w="angle" for="yaw"></label><input id="yaw" type="range" min="-180" max="180" step="1" value="0" part="slider" /><output for="yaw" data-o="yaw">0°</output></div>
  <div class="field tilt" part="field tilt"><label data-w="tilt" for="tilt"></label><input id="tilt" type="range" min="-30" max="30" step="1" value="0" part="slider" /><output for="tilt" data-o="tilt">0°</output></div>
  <div class="field roll" part="field roll"><label data-w="roll" for="roll"></label><input id="roll" type="range" min="-180" max="180" step="1" value="0" part="slider" /><output for="roll" data-o="roll">0°</output></div>
  <div class="group axes" role="group" data-g="axes">
    <button type="button" data-b="axis-angle" aria-pressed="true" part="button"><span data-w="angle"></span></button>
    <button type="button" data-b="axis-tilt" aria-pressed="false" part="button"><span data-w="tilt"></span></button>
    <button type="button" data-b="axis-roll" aria-pressed="false" part="button"><span data-w="roll"></span></button>
    <button type="button" data-b="axis-all" aria-pressed="false" part="button"><span data-w="tumble"></span></button>
  </div>
  <button type="button" class="pace-now" data-b="pace-now" part="button" hidden><span class="lbl" data-w="speed"></span><span data-o="pace"></span></button>
  <button type="button" class="play" data-b="play" aria-pressed="false" part="button">${ICON.play}${ICON.pause}<span class="text" data-w="autoTurn"></span></button>
  <div class="pacing adv" data-g="pacing">
    <kazoku-speed-buttons class="pace" data-g="pace"></kazoku-speed-buttons>
    <div class="group dir" role="group" data-g="direction">
      <button type="button" data-b="turn-left" aria-pressed="false" part="button">${ICON.left}<span data-w="turnLeft"></span></button>
      <button type="button" data-b="turn-right" aria-pressed="true" part="button">${ICON.right}<span data-w="turnRight"></span></button>
    </div>
  </div>
  <button type="button" class="front adv" data-b="front" part="button"><span data-w="front"></span></button>
  <button type="button" class="centre" data-b="centre" part="button" hidden>${ICON.centre}<span class="text" data-w="centre"></span></button>
  <div class="group zoom" role="group" data-g="zoom">
    <div class="field zslide" part="field zoom-slider"><label data-w="zoom" for="zoom"></label><div class="zbox"><div class="ztrack" aria-hidden="true"><div class="zfill"></div></div><div class="zmarks" aria-hidden="true"></div><input id="zoom" type="range" min="0" max="1000" step="1" value="0" part="slider zoom-slider" /></div></div>
    <button type="button" data-b="out" part="button">${ICON.minus}</button>
    <button type="button" class="level" data-b="level" part="button"><span data-o="zoom">1×</span></button>
    <button type="button" data-b="in" part="button">${ICON.plus}</button>
    <button type="button" data-b="fit" part="button"><span data-w="fit"></span></button>
  </div>
  <div class="group pan adv" role="group" data-g="pan" hidden>
    <button type="button" data-b="left" part="button">${ICON.left}</button>
    <button type="button" data-b="up" part="button">${ICON.up}</button>
    <button type="button" data-b="down" part="button">${ICON.down}</button>
    <button type="button" data-b="right" part="button">${ICON.right}</button>
  </div>
  <button type="button" class="more" data-b="more" aria-expanded="false" part="button">${ICON.more}<span class="text" data-w="more"></span></button>
  <span class="vh" data-w="gestures"></span>
  <span class="vh" role="status" aria-live="polite" data-live></span>
</div>`;
