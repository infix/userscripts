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
  const { filter, scan, mergeMap } = rxjs.operators;
  const { map, tap, delay, retryWhen, take, switchMap } = rxjs.operators;

  const parseHtml = (html) =>
    new DOMParser().parseFromString(html, "text/html");

  const dateDiffInMinutes = (d1, d2) => Math.floor((d1 - d2) / 1000 / 60);

  const batotoBtn = document.querySelector("#content > ul > li:nth-child(4)");
  const lastUpdated = document.createElement("li");
  lastUpdated.style.alignSelf = "center";
  batotoBtn.after(lastUpdated);

  const isUpdatingBS = new rxjs.BehaviorSubject(false);
  const imagesSub = new Subject();
  // noinspection ES6MissingAwait
  imagesSub
    .pipe(
      scan((prevLastUpdate, lastUpdate) => {
        const diff = dateDiffInMinutes(new Date(), prevLastUpdate);
        lastUpdated.innerText = `Last updated: ${diff} mins ago`;
        return lastUpdate;
      }, new Date()),
    )
    .subscribe(() => {
      const getMangaId = (e) =>
        e.firstElementChild
          .querySelector("a")
          .href.replace("https://mangadex.org/title/", "")
          .split("/")[0];

      const queryStr = ".chapter-container > .row.no-gutters:not(:first-child)";
      const chapters = [...document.querySelectorAll(queryStr)];

      chapters
        .filter((e) => e.firstElementChild.innerText !== "")
        .map((e) => ({ element: e, mangaId: getMangaId(e) }))
        .forEach((chapter) => {
          const img = document.createElement("img");
          img.src = `https://mangadex.org/images/manga/${chapter.mangaId}.thumb.jpg`;
          chapter.element.firstElementChild.firstElementChild.before(img);
          chapter.element.children[2].firstElementChild.style.height = "100%";
          img.height = "80";
          img.style.paddingRight = "1rem";
        });
    });
  imagesSub.next(new Date());
  // noinspection ES6MissingAwait
  merge(
    interval(5 * 60 * 1000),
    fromEvent(document, "keydown").pipe(
      filter((ev) => ev.key === "r" && !ev.ctrlKey),
      tap((ev) => ev.preventDefault()),
    ),
  )
    .pipe(
      filter(() => !isUpdatingBS.getValue()),
      tap(() => {
        console.log("Updating");
        isUpdatingBS.next(true);
        lastUpdated.innerText = "Updating...";
      }),
      mergeMap(() =>
        rxjs.fetch.fromFetch("https://mangadex.org/follows").pipe(
          switchMap((response) => rxjs.from(response.text())),
          map((text) => parseHtml(text)),
          map((dom) => dom.querySelector("#chapters")),
          retryWhen((errors) => errors.pipe(delay(1000), take(2))),
        ),
      ),
      tap((newChapters) =>
        document.querySelector("#chapters").replaceWith(newChapters),
      ),
    )
    .subscribe(() => imagesSub.next(new Date()));
})();
