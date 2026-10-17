// Sends the feedback form to a Google Sheet (see weddings/README.md).
// Paste the Apps Script web-app URL here once it is deployed.
var ENDPOINT = "";

(function () {
  var form = document.getElementById("feedback");
  var card = document.getElementById("card");
  var error = document.getElementById("error");
  var button = form.querySelector("button[type=submit]");

  // Grow the detail boxes as people type
  form.querySelectorAll("textarea").forEach(function (t) {
    t.addEventListener("input", function () {
      t.style.height = "auto";
      t.style.height = t.scrollHeight + 2 + "px";
    });
  });

  form.addEventListener("change", function (e) {
    var q = e.target.closest(".q");
    if (q) q.classList.remove("invalid");
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    error.classList.remove("show");

    // Required radio groups: highlight the first one left empty
    var missing = null;
    form.querySelectorAll("fieldset.q").forEach(function (fs) {
      var radios = fs.querySelectorAll("input[type=radio][required]");
      if (!radios.length) return;
      var ok = Array.prototype.some.call(radios, function (r) { return r.checked; });
      fs.classList.toggle("invalid", !ok);
      if (!ok && !missing) missing = fs;
    });
    if (missing) {
      error.textContent = "נשמח לתשובה בשאלות המסומנות לפני השליחה.";
      error.classList.add("show");
      missing.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (form.website.value) return; // spam trap

    var data = new URLSearchParams(new FormData(form));
    data.delete("website");
    data.append("submitted_at", new Date().toISOString());
    data.append("page", location.pathname);

    button.disabled = true;
    button.textContent = "שולחים...";

    var send = ENDPOINT
      ? fetch(ENDPOINT, { method: "POST", mode: "no-cors", body: data })
      : Promise.resolve(console.info("Feedback (no ENDPOINT set yet):", Object.fromEntries(data)));

    send.then(function () {
      card.classList.add("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }).catch(function () {
      button.disabled = false;
      button.textContent = "שליחת המשוב";
      error.textContent = "משהו השתבש בשליחה. אפשר לנסות שוב בעוד רגע.";
      error.classList.add("show");
    });
  });
})();
