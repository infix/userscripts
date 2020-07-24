// ==UserScript==
// @name         localhost video player
// @version      0.2
// @description  try to take over the world!
// @author       You
// @match        https://localhost:8234/*
// @match        http://localhost:8234/*
// @match        https://127.0.0.1:8234/*
// @match        http://127.0.0.1:8234/*
// @grant        none
// ==/UserScript==

const injectScript = (src) =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve);
    script.addEventListener("error", (e) => reject(e.error));
    document.head.appendChild(script);
  });

(async () => {
  await injectScript("https://unpkg.com/rxjs@6.6.0/bundles/rxjs.umd.min.js");

  const container = document.createElement("div");
  const overlay = document.createElement("div");
  const videoBox = document.createElement("div");
  const video = document.querySelector("video");
  videoBox.appendChild(video);
  container.append(overlay, videoBox);

  document.body = document.createElement("body");
  document.body.appendChild(container);
  document.body.style.margin = 0;

  container.style.cssText = `
    height: 100%;
    width: 100%;
  `;

  overlay.style.cssText = `
    position: absolute;
    top: 0;
    z-index: 1;
    width: 100%;
    height: 2rem;
    background: #333;
    display: none;
    place-items: center;
    color: white;
  `;

  videoBox.style.cssText = `
    position: absolute;
    height: 100vh;
    width: 100%;
    top: 0;
  `;

  video.style.cssText = `
    margin: 0;
    width: 100vw;
    height: 100vh;
  `;

  const sub = document.createElement("track");
  sub.srclang = "en";
  sub.src = video.firstElementChild.src.replace(".mp4", ".vtt");
  sub.label = "English";
  sub.default = true;
  video.appendChild(sub);

  const { filter, tap, scan, map, mapTo, debounceTime } = rxjs.operators;

  const fullScreenSub = new rxjs.BehaviorSubject(false);
  const pausedSub = new rxjs.BehaviorSubject(false);

  fullScreenSub.pipe(scan((state) => !state)).subscribe((fullscreen) => {
    if (fullscreen) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  });

  pausedSub.pipe(scan((state) => !state)).subscribe((paused) => {
    if (paused) video.play();
    else video.pause();
  });

  // video.ondblclick = null;
  // container.ondblclick = fullScreenSub.next();

  const overlaySub = new rxjs.Subject();
  overlaySub
    .pipe(
      tap((string) => {
        overlay.style.display = "grid";
        overlay.textContent = string;
      }),
      debounceTime(1500),
      tap(() => (overlay.style.display = "none")),
    )
    .subscribe();

  rxjs.fromEvent(document, "keydown").subscribe(({ code }) => {
    const video = document.querySelector("video");
    if (code === "ArrowRight") {
      video.currentTime += 5;
    } else if (code === "ArrowLeft") {
      video.currentTime -= 5;
    } else if (code === "KeyF") {
      fullScreenSub.next();
    } else if (code === "Space") {
      pausedSub.next();
    } else if (code === "Backspace") {
      overlaySub.next(1);
    } else if (code === "KeyS") {
    }
  });

  const clamp = (num, min, max) => Math.min(max, Math.max(min, num));
  const sumClamp = (min, max, initial) =>
    scan((acc, cur) => clamp(acc + cur, min, max), initial);

  const wheelObs = rxjs
    .fromEvent(video, "wheel")
    .pipe(tap((e) => e.preventDefault()));

  const [wheel$, ctrlWheel$] = rxjs.partition(wheelObs, (ev) => !ev.ctrlKey);

  // noinspection ES6MissingAwait
  wheel$
    .pipe(
      tap((ev) => ev.preventDefault()),
      map((e) => (e.deltaY > 0 ? -5 : 5)),
      sumClamp(0, 100, 100),
    )
    .subscribe((val) => {
      video.volume = val / 100;
      overlaySub.next(`${val}%`);
    });

  // noinspection ES6MissingAwait
  rxjs
    .merge(
      ctrlWheel$.pipe(
        map((e) => (e.deltaY > 0 ? -0.1 : 0.1)),
        sumClamp(0.1, 4, 1),
      ),
      rxjs.fromEvent(video, "click").pipe(
        filter((ev) => ev.ctrlKey),
        tap((ev) => ev.preventDefault()),
        mapTo(1),
      ),
    )
    .subscribe((val) => {
      video.playbackRate = val;
      const str = val.toFixed(1);
      const rateStr = str.endsWith(".0") ? str.replace(".0", "") : str;
      overlaySub.next(`${rateStr}x`);
    });
})();
