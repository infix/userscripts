// ==UserScript==
// @name        Follow auto update - mangadex.org
// @namespace   Violentmonkey Scripts
// @match       https://mangadex.org/follows
// @grant       none
// @version     1.1
// @author      -
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

  const { merge, interval, fromEvent, Subject } = rxjs;
  const { BehaviorSubject, of } = rxjs;
  const { fromFetch } = rxjs.fetch;
  const { filter, mergeMap } = rxjs.operators;
  const { map, tap, delay, retryWhen, take, switchMap } = rxjs.operators;

  const parseHtml = (html) =>
    new DOMParser().parseFromString(html, "text/html");

  const batotoBtn = document.querySelector("#content > ul > li:nth-child(4)");
  const lastUpdated = document.createElement("li");
  lastUpdated.style.alignSelf = "center";
  batotoBtn.after(lastUpdated);

  const lastUpdateBS = new BehaviorSubject(new Date());
  merge(interval(30 * 1000), lastUpdateBS).subscribe(() => {
    const dateDiffInMinutes = (d1, d2) => Math.floor((d1 - d2) / 1000 / 60);
    const diff = dateDiffInMinutes(new Date(), lastUpdateBS.getValue());
    lastUpdated.innerText = `Last updated: ${diff} mins ago`;
  });

  const isUpdatingBS = new BehaviorSubject(false);
  isUpdatingBS.subscribe((value) => {
    if (value) {
      lastUpdated.innerText = "Updating...";
    } else {
      lastUpdateBS.next(new Date());
    }
  });

  const imagesSub = new Subject();
  // noinspection ES6MissingAwait
  merge(of(1), imagesSub).subscribe(() => {
    const queryStr = ".chapter-container > .row.no-gutters:not(:first-child)";
    [...document.querySelectorAll(queryStr)]
      .filter((e) => e.firstElementChild.innerText !== "")
      .forEach((e) => {
        const mangaId = e.firstElementChild
          .querySelector("a")
          .href.replace("https://mangadex.org/title/", "")
          .split("/")[0];

        const img = document.createElement("img");
        img.src = `https://mangadex.org/images/manga/${mangaId}.thumb.jpg`;
        e.firstElementChild.firstElementChild.before(img);
        e.children[2].firstElementChild.style.height = "100%";
        img.height = "80";
        img.style.paddingRight = "1rem";
      });
  });

  const refreshKeyDown = fromEvent(document, "keydown").pipe(
    filter((ev) => ev.key === "r" && !ev.ctrlKey),
    tap((ev) => ev.preventDefault()),
  );
  // noinspection ES6MissingAwait
  merge(interval(5 * 60 * 1000), refreshKeyDown)
    .pipe(
      filter(() => !isUpdatingBS.getValue()),
      tap(() => isUpdatingBS.next(true)),
      mergeMap(() =>
        fromFetch("https://mangadex.org/follows").pipe(
          switchMap((response) => rxjs.from(response.text())),
          map((text) => parseHtml(text).querySelector("#chapters")),
          retryWhen((errors) => errors.pipe(delay(1000), take(2))),
        ),
      ),
    )
    .subscribe((newChapters) => {
      document.querySelector("#chapters").replaceWith(newChapters);
      isUpdatingBS.next(false);
      imagesSub.next();
    });
})();
