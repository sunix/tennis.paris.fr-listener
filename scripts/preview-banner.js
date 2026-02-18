(function() {
  const prNum = "PR_NUM_PLACEHOLDER";
  if (window.location.hostname.includes("surge.sh")) {
    const banner = document.createElement("div");
    banner.id = "preview-banner";
    banner.style.cssText = "position: fixed; top: 0; left: 0; right: 0; z-index: 10000; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 20px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 14px;";
    const prUrl = "REPO_URL_PLACEHOLDER/pull/" + prNum;
    banner.innerHTML = '<strong>🔍 Preview Site</strong> — This is a preview deployment for <a href="' + prUrl + '" style="color: #ffd700; text-decoration: underline;" target="_blank">PR #' + prNum + '</a>';
    document.body.insertBefore(banner, document.body.firstChild);
    document.body.style.paddingTop = banner.offsetHeight + "px";
  }
})();
