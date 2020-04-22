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
  const response = await fetch(jobPostingUrl)
  const html = await response.text();
  return new DOMParser().parseFromString(html, "text/html");
}

(async () => {
  document.querySelector(".application-hint > div").remove()

  const jobPostingUrl = location.href.replace("/job-questions/", "/jobs/p/")
  const doc = await fetchDocument(jobPostingUrl);

  const aboutJob = doc.querySelector(".about-job.content-card")
  const jobRequirements = doc.querySelector(".job-requirements")

  // TODO fix jobNumbers style
  // const jobNumbers = doc.querySelector(".job-numbers")

  document.querySelector("body > div.container").style.width = "100%";
  document.querySelector("body > div.container").style.padding = "0";
  document.querySelector(".content-card.jobseeker-view").style.flex = 1

  const wrapper = document.querySelector(".job-ques-wrp")
  wrapper.style.display = "flex";
  wrapper.style.width = "100%";

  aboutJob.classList.remove("content-card")
  jobRequirements.classList.remove("content-card")

  const hr = document.createElement("hr")

  const container = document.createElement("div")

  // TODO maybe switch to tabs
  // TODO also add stats
  container.append(/*jobNumbers, hr,*/ aboutJob, hr, jobRequirements)

  wrapper.insertBefore(container, wrapper.firstElementChild)

  container.style.borderTop = "4px solid #efa109"
  container.style.flex = "1"
  container.style.margin = "16px";
  container.style.marginTop = "28px";
  container.classList.add("content-card")

  // TODO Add google search for questions
  // TODO search previous applications
  // const formWrap = document.querySelector(".form-wrap")
  debugger
})()
