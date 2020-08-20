// ==UserScript==
// @name        mangadex home-page fixes
// @match       https://mangadex.cc/
// @match       https://mangadex.org/
// @grant       none
// @version     1.0
// @author      -
// @description 1/5/2020, 5:56:12 PM
// ==/UserScript==

const thumbnails = [
  ...document.querySelectorAll("#latest_update a > img.rounded.max-width"),
  ...document.querySelectorAll("#follows_update a > img.rounded.max-width"),
];

const fullScaleImg = document.createElement("img");
fullScaleImg.style.position = "absolute";
fullScaleImg.style.zIndex = 100000;
fullScaleImg.style.maxHeight = "65vh";
fullScaleImg.style.maxWidth = "45vw";

document.body.append(fullScaleImg);

const correctImageCache = new Map();

const str = localStorage.getItem("correctImageCache") || "[]";
JSON.parse(str).forEach(([k, v]) => {
  correctImageCache.set(k, v);
});

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

const positionImage = e => {
  const yOff = 15;
  const xOff = 50;

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

thumbnails.forEach(elem => {
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

    fullScaleImg.onload = () => {
      saveToCache(elem.src, fullScaleImg.src);
    };

    fullScaleImg.src = correctImageCache.has(elem.src)
      ? correctImageCache.get(elem.src)
      : urls[0];
  };

  elem.onmouseleave = () => {
    fullScaleImg.style.display = "none";
  };

  elem.onmousemove = e => positionImage(e);
});
