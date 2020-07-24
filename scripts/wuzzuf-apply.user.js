// ==UserScript==
// @name        Wuzzuf Apply - wuzzuf.net
// @namespace   Violentmonkey Scripts
// @match       https://wuzzuf.net/job-questions/*
// @grant       none
// @version     1.0
// @author      -
// @description 4/22/2020, 10:00:39 PM
// ==/UserScript==

async function fetchDocument(jobPostingUrl) {
  const response = await fetch(jobPostingUrl);
  const html = await response.text();
  return new DOMParser().parseFromString(html, "text/html");
}

(async () => {
  document.querySelector(".application-hint > div").remove();

  const jobPostingUrl = location.href.replace("/job-questions/", "/jobs/p/");
  const doc = await fetchDocument(jobPostingUrl);

  const aboutJob = doc.querySelector(".about-job.content-card");
  const jobRequirements = doc.querySelector(".job-requirements");

  const jobNumbers = doc.querySelector(".job-numbers");
  const styles = document.createElement("style");
  // language=css
  styles.innerHTML = `
    .job-numbers {
      width: fit-content;
      margin: auto auto 1em;
    }

    .applicants-all {
      display: inline-block;
    }

    .applicants-num {
      display: inline-block;
      font-size: 2.8em;
      letter-spacing: -2px;
      line-height: 1;
    }

    .applicants-desc {
      display: inline-block;
      font-size: .96em;
      font-weight: lighter;
      line-height: 1.2;
      margin-left: 3px;
      text-align: left;
    }

    .applicants-stats-wrapper {
      display: inline-block;
      border-left: 1px solid #eee;
      margin: 0 0 0 6px;
      padding: 0 0 0 7px;
    }

    .applicants-stat {
      display: inline-block;
      margin: 0 3px;
      text-align: center;
    }

    .applicants-stat-shortlisted {
      color: #449d44;
    }

    .applicants-stat-rejected {
      color: #c9302c;
    }
  `;

  document.head.appendChild(styles);

  document.querySelector("body > div.container").style.width = "100%";
  document.querySelector("body > div.container").style.padding = "0";
  document.querySelector(".content-card.jobseeker-view").style.flex = 1;

  const wrapper = document.querySelector(".job-ques-wrp");
  wrapper.style.display = "flex";
  wrapper.style.width = "100%";

  const jobseekerView = document.querySelector(".content-card.jobseeker-view");
  const { height } = jobseekerView.getBoundingClientRect();
  aboutJob.classList.remove("content-card");
  jobRequirements.classList.remove("content-card");

  const hr = document.createElement("hr");

  const container = document.createElement("div");

  // TODO maybe switch to tabs
  container.append(jobNumbers, hr, aboutJob, hr, jobRequirements);

  wrapper.insertBefore(container, wrapper.firstElementChild);
  container.style.overflowY = "scroll";
  container.style.maxHeight = height + 15 + "px";
  container.style.borderTop = "4px solid #efa109";
  container.style.flex = "1";
  container.style.margin = "16px";
  container.style.marginTop = "28px";
  container.classList.add("content-card");

  // TODO Add google search for questions
  // TODO search previous applications
  // const formWrap = document.querySelector(".form-wrap")
  debugger;
})();
