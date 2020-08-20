// ==UserScript==
// @name        MangaDex Enhancer
// @match       https://mangadex.org/*
// @grant       none
// @version     1.2
// @author      -
// ==/UserScript==

document.getElementById("content").style["max-width"] = "95%";

const injectScript = src =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.addEventListener("load", resolve);
    script.addEventListener("error", e => reject(e.error));
    document.head.appendChild(script);
  });

const fullScaleImg = document.createElement("img");
fullScaleImg.style.position = "absolute";
fullScaleImg.style.zIndex = 100000;
fullScaleImg.style.maxHeight = "65vh";
fullScaleImg.style.maxWidth = "45vw";

document.body.append(fullScaleImg);

function getImageCache() {
  const correctImageCache = new Map();

  const str = localStorage.getItem("correctImageCache") || "[]";
  JSON.parse(str).forEach(([k, v]) => {
    correctImageCache.set(k, v);
  });

  return correctImageCache;
}

const correctImageCache = getImageCache();

/**
 * @param key {string}
 * @param value {string}
 */
function saveToCache(key, value) {
  if (correctImageCache.has(key)) return;

  correctImageCache.set(key, value);
  localStorage.setItem(
    "correctImageCache",
    JSON.stringify([...correctImageCache.entries()]),
  );
}

const positionImage = (e, yOff = 15, xOff = 50) => {
  let top = e.pageY - yOff;
  const heightDiff = top + fullScaleImg.height - (scrollY + window.innerHeight);

  if (heightDiff > 0) {
    top -= heightDiff + yOff;
  }
  if (top < scrollY) {
    top = scrollY + yOff;
  }

  fullScaleImg.style.top = top + "px";
  fullScaleImg.style.left = e.pageX + xOff + "px";
};

const addZoomOnHover = elem => {
  const urls = [elem.src.replace(/thumb.*/, "")].flatMap(v => [
    v + "jpg",
    v + "png",
    v + "jpeg",
  ]);

  elem.onmouseenter = async e => {
    fullScaleImg.style.display = "block";
    positionImage(e);
    let i = 0;
    fullScaleImg.onerror = () => {
      const url = urls[++i];
      console.log("Trying url img: ", url);
      fullScaleImg.src = url;
    };

    fullScaleImg.onload = () => saveToCache(elem.src, fullScaleImg.src);

    fullScaleImg.src = correctImageCache.has(elem.src)
      ? correctImageCache.get(elem.src)
      : urls[0];
  };

  elem.onmouseleave = () => {
    fullScaleImg.style.display = "none";
  };

  elem.onmousemove = e => positionImage(e);
};

const currentUrl = window.location.href;
if (currentUrl.startsWith("https://mangadex.org/follows")) {
  followsPage();
}

if (
  currentUrl === "https://mangadex.org" ||
  currentUrl === "https://mangadex.org/"
) {
  homePage();
}

async function homePage() {
  const thumbnails = [
    ...document.querySelectorAll("#latest_update a > img.rounded.max-width"),
    ...document.querySelectorAll("#follows_update a > img.rounded.max-width"),
    ...document.querySelectorAll("#six_hours  a > img.rounded.max-width"),
    ...document.querySelectorAll("#day  a > img.rounded.max-width"),
    ...document.querySelectorAll("#week  a > img.rounded.max-width"),
  ];

  thumbnails.forEach(addZoomOnHover);
}

async function followsPage() {
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
        try {
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

          addZoomOnHover(img);
        } catch (err) {
          console.log("Failed to load", e, err);
        }
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
}
