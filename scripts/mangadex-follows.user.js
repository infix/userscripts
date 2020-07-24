// ==UserScript==
// @name        Follow auto update - mangadex.org
// @namespace   Violentmonkey Scripts
// @match       https://mangadex.org/follows
// @grant       none
// @version     1.0
// @author      -
// ==/UserScript==

/** @param {string} html */
const parseHtml = (html) => new DOMParser().parseFromString(html, "text/html");

/**
 * @param {Date} d1
 * @param {Date} d2
 * @returns {number}
 */
const dateDiffInMinutes = (d1, d2) => Math.floor((d1 - d2) / 1000 / 60);

let lastUpdate = new Date();

const batotoBtn = document.querySelector("#content > ul > li:nth-child(4)");
const lastUpdated = document.createElement("li");
lastUpdated.style.alignSelf = "center";

const setLastUpdated = () => {
  lastUpdated.innerText = `Last updated: ${dateDiffInMinutes(
    new Date(),
    lastUpdate,
  )} mins ago`;
};

setLastUpdated();

batotoBtn.after(lastUpdated);
let isUpdating = false;

const imageCache = new Map();

const initialize = () => {
  const cache = JSON.parse(localStorage.getItem("image-cache") || "{}");
  Object.entries(cache).forEach(([k, v]) => imageCache.set(k, v));
};

initialize();

const writeToLocalStorage = () => {
  const imageCacheObject = Object.fromEntries([...imageCache.entries()]);
  localStorage.setItem("image-cache", JSON.stringify(imageCacheObject));
};

/**
 * @param {string} id
 * @return {{cached: boolean, image: string}}
 */
const getImage = async (id) => {
  if (imageCache.has(id)) return { cached: true, image: imageCache.get(id) };

  const IMAGE_BASE_URL = `https://mangadex.org/images/manga/`;
  const urls = [
    { url: `${IMAGE_BASE_URL}${id}.jpg`, type: "image/jpeg" },
    { url: `${IMAGE_BASE_URL}${id}.png`, type: "image/png" },
    { url: `${IMAGE_BASE_URL}${id}.jpeg`, type: "image/jpeg" },
  ];

  for (const { url, type } of urls)
    try {
      const base64 = await downscaleImage(url, 60, type);
      imageCache.set(id, base64);
      return { cached: false, image: base64 };
    } catch (e) {
      console.log(`Failed to fetch ${url}.`);
    }
};

/** @param {{mangaId: string, element: HTMLElement}} chapter */
async function setImage(chapter) {
  const img = document.createElement("img");
  const { cached, image } = await getImage(chapter.mangaId);
  img.src = image;
  chapter.element.firstElementChild.firstElementChild.before(img);
  chapter.element.children[2].firstElementChild.style.height = "100%";
  img.height = "80";
  img.style.paddingRight = "1rem";
  return cached;
}

async function downscaleImage(dataUrl, newWidth, imageType = "image/jpeg") {
  /** @param {HTMLImageElement} img */
  const imageLoad = (img) =>
    new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
    });

  // Create a temporary image so that we can compute the height of the downscaled image.
  const image = new Image();
  image.src = dataUrl;

  await imageLoad(image);

  const oldWidth = image.width;
  const oldHeight = image.height;
  const newHeight = Math.floor((oldHeight / oldWidth) * newWidth);

  // Create a temporary canvas to draw the downscaled image on.
  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;

  // Draw the downscaled image on the canvas and return the new data URL.
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, newWidth, newHeight);
  return canvas.toDataURL(imageType);
}

/** @param {number} ms */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const setAllImages = async () => {
  const MANGADEX_TITLE_URL = "https://mangadex.org/title/";

  const getMangaId = (e) =>
    e.firstElementChild
      .querySelector("a")
      .href.replace(MANGADEX_TITLE_URL, "")
      .split("/")[0];

  /** @type {{mangaId: string, element: HTMLElement}[]} */
  const chapterElements = [
    ...document.querySelectorAll(
      ".chapter-container > .row.no-gutters:not(:first-child)",
    ),
  ]
    .filter((e) => e.firstElementChild.innerText !== "")
    .map((e) => ({ element: e, mangaId: getMangaId(e) }));

  for (const chapter of chapterElements) {
    try {
      const isCached = await setImage(chapter);
      if (!isCached) {
        writeToLocalStorage();
        await sleep(1000);
      }
    } catch (e) {
      console.log(e);
    }
  }
};

setAllImages();

const updateFollows = async () => {
  if (isUpdating) return;

  isUpdating = true;
  lastUpdated.innerText = "Updating...";

  try {
    console.log("Updating");
    const resp = await fetch("https://mangadex.org/follows");
    const html = await resp.text();

    const dom = parseHtml(html);

    const newChapters = dom.querySelector("#chapters");

    if (newChapters)
      document.querySelector("#chapters").replaceWith(newChapters);
  } finally {
    lastUpdate = new Date();
    isUpdating = false;
    setLastUpdated();
    await setAllImages();
  }
};

setInterval(() => {
  if (dateDiffInMinutes(new Date(), lastUpdate) > 4) {
    // update every 5 minutes
    updateFollows();
  }

  setLastUpdated();
}, 1000 * 30); // check every 30 seconds

document.addEventListener("keydown", ({ key }) => {
  if (key === "r" && !isUpdating) {
    updateFollows();
  }
});
