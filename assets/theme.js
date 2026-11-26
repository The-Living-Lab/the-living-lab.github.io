(function () {
  var key = "living-lab-theme";
  delete document.documentElement.dataset.theme;
  try {
    localStorage.removeItem(key);
  } catch (error) {}
})();
