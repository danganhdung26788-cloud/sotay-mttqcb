function include_(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


function currentWebAppUrl_() {
  const url = String(ScriptApp.getService().getUrl() || '').trim();
  if (!url) throw new Error('WEB_APP_URL_UNAVAILABLE');
  return url;
}

function renderIndex_() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.appName = CONFIG.APP_NAME;
  template.appVersion = CONFIG.VERSION;
  template.webAppUrl = currentWebAppUrl_();
  return template.evaluate()
    .setTitle(CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function renderAdmin_() {
  const template=HtmlService.createTemplateFromFile('Admin');
  template.appName=CONFIG.APP_NAME;
  template.appVersion=CONFIG.VERSION;
  template.webAppUrl=currentWebAppUrl_();
  return template.evaluate()
    .setTitle('Quản trị - '+CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
}
