// ==UserScript==
// @name        Follow auto update - mangadex.org
// @match       https://mangadex.org/follows
// @match       https://mangadex.org/follows/chapters/*
// @grant       none
// @version     1.1
// @author      -
// ==/UserScript==

const injectScript = src =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve);
    script.addEventListener("error", e => reject(e.error));
    document.head.appendChild(script);
  });

(async () => {
  await injectScript("https://unpkg.com/rxjs@6.6.0/bundles/rxjs.umd.min.js");

  const { merge, interval, fromEvent, Subject, from, of } = rxjs;
  const { fromFetch } = rxjs.fetch;
  const { map, tap, delay, retryWhen, take, switchMap } = rxjs.operators;
  const { filter, mergeMap } = rxjs.operators;

  const parseHtml = html => new DOMParser().parseFromString(html, "text/html");

  const batotoBtn = document.querySelector("#content > ul > li:nth-child(4)");
  const lastUpdated = document.createElement("li");
  lastUpdated.style.alignSelf = "center";
  batotoBtn.after(lastUpdated);

  const lastUpdateBS = new rxjs.BehaviorSubject(new Date());
  merge(interval(30e3), lastUpdateBS).subscribe(() => {
    const dateDiffInMinutes = (d1, d2) => Math.floor((d1 - d2) / 60e3);
    const diff = dateDiffInMinutes(new Date(), lastUpdateBS.getValue());
    lastUpdated.innerText = `Last updated: ${diff} mins ago`;
  });

  const isUpdatingBS = new rxjs.BehaviorSubject(false);
  isUpdatingBS.subscribe(value => {
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
      .filter(e => e.firstElementChild.innerText !== "")
      .forEach(e => {
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
    filter(ev => ev.key === "r" && !ev.ctrlKey),
    tap(ev => ev.preventDefault()),
  );
  // noinspection ES6MissingAwait
  merge(interval(5 * 60e3), refreshKeyDown)
    .pipe(
      filter(() => !isUpdatingBS.getValue()),
      tap(() => isUpdatingBS.next(true)),
      mergeMap(() =>
        fromFetch(location.href).pipe(
          switchMap(response => from(response.text())),
          map(text => parseHtml(text).querySelector("#chapters")),
          retryWhen(errors => errors.pipe(delay(1e3), take(2))),
        ),
      ),
    )
    .subscribe(newChapters => {
      document.querySelector("#chapters").replaceWith(newChapters);
      isUpdatingBS.next(false);
      imagesSub.next();
    });
})();
