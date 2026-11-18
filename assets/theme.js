(function () {
  var key = "living-lab-theme";
  var theme = "navy";
  try {
    if (localStorage.getItem(key) === "teal") theme = "teal";
  } catch (error) {}

  function paint(next) {
    theme = next === "teal" ? "teal" : "navy";
    if (theme === "teal") document.documentElement.dataset.theme = "teal";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(key, theme);
    } catch (error) {}
    document.querySelectorAll(".theme-switch button").forEach(function (button) {
      button.setAttribute("aria-pressed", button.dataset.themeChoice === theme ? "true" : "false");
    });
  }

  paint(theme);

  document.addEventListener("DOMContentLoaded", function () {
    var group = document.createElement("div");
    group.className = "theme-switch";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Color scheme");
    [
      ["navy", "Navy"],
      ["teal", "Teal"]
    ].forEach(function (choice) {
      var button = document.createElement("button");
      button.type = "button";
      button.dataset.themeChoice = choice[0];
      button.textContent = choice[1];
      button.setAttribute("aria-pressed", choice[0] === theme ? "true" : "false");
      button.addEventListener("click", function () {
        paint(choice[0]);
      });
      group.append(button);
    });
    document.body.append(group);
  });
})();
