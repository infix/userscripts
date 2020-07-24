// ==UserScript==
// @name        Wuzzuf application statistics
// @namespace   Violentmonkey Scripts
// @match       https://wuzzuf.net/applications
// @grant       none
// @version     1.0
// ==/UserScript==

/** @returns {Object.<string, {company: string, position: string, state: string}>} */
const getData = () => {
  const newData = [
    ...document.querySelectorAll(
      "div.submitted-apps-container.clearfix > div > div",
    ),
  ].map(application => {
    const id = application.getAttribute("data-app-id");
    const position = application.getAttribute("data-app-title");
    const company = application.getAttribute("data-app-company");
    const viewed = application
      .querySelector("ul li.state:nth-child(2)")
      .classList.contains("active");
    const state = application.querySelector(
      "ul li.state:nth-child(3) span.status-name",
    ).innerText;
    return [id, { position, company, state: viewed ? state : "Not seen" }];
  });

  const prevStats = JSON.parse(
    localStorage.getItem("application-stats") || "{}",
  );
  const mergedStats = { ...prevStats, ...Object.fromEntries(newData) };
  localStorage.setItem("application-stats", JSON.stringify(mergedStats));
  return mergedStats;
};

/**
 * @param {Object.<string, {company: string, position: string, state: string}>} data
 * @param {string} state
 */
const countByState = (data, state) =>
  Object.values(data).filter(datum => datum.state === state).length;

const header = document.querySelector(".section-header.card");
header.style.display = "flex";

const applicationData = getData();

/**
 * @description react-esque create element function
 * @param {string} tagName
 * @param {Object.<string, *>} props
 * @param {string|Node[]} children
 */
function h(tagName, props, children = []) {
  const e = document.createElement(tagName);

  const applyStyle = (e, styles) =>
    Object.entries(styles).forEach(([name, value]) => (e.style[name] = value));

  for (const [k, v] of Object.entries(props)) {
    if (k === "style") {
      applyStyle(e, v);
    } else {
      e[k] = v;
    }
  }

  if (Array.isArray(children)) {
    e.append(...children.filter(c => !!c));
  } else {
    e.append(children);
  }
  return e;
}

const totalCount = Object.keys(applicationData).length;
const seenCount = totalCount - countByState(applicationData, "Not seen");
const rejectedCount = countByState(applicationData, "Rejected");
const shortlistCount = countByState(applicationData, "Shortlisted");
const contactsAccessedCount = countByState(
  applicationData,
  "Contacts Accessed",
);

const styles = {
  container: { display: "flex", justifyContent: "space-evenly", flex: "1" },
};

const createStatsSpan = (name, count, total, color) =>
  h(
    "span",
    { style: { color } },
    `${name}: ${count}/${total} (${((100 * count) / total).toFixed(2)}%)`,
  );

const statsContainer = h("div", { style: styles.container }, [
  createStatsSpan("Seen", seenCount, totalCount, "#3794ce"),
  createStatsSpan(
    "Shortlisted",
    shortlistCount + contactsAccessedCount,
    seenCount,
    "#5cb85c",
  ),
  createStatsSpan("Rejected", rejectedCount, seenCount, "#d9534f"),
]);

const numberSubmitted = +document.querySelector("span.number-of-submitted-apps")
  .innerText;

const btn = h(
  "button",
  { className: "btn btn-primary btn-primary-inverse", onclick: getData },
  "Recompute",
);
const container = h(
  "div",
  { style: { ...styles.container, flexDirection: "column" } },
  [statsContainer, totalCount < numberSubmitted && btn],
);

if (totalCount < numberSubmitted) statsContainer.style.paddingBottom = "1rem";

header.appendChild(container);
