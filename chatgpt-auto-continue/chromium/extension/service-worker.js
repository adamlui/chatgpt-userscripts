(async () => {

    // Init APP data
    const app = { latestAssetCommitHash: '9ae83fb', urls: {} }
    app.urls.assetHost = `https://cdn.jsdelivr.net/gh/adamlui/chatgpt-auto-continue@${app.latestAssetCommitHash}`
    const appData = await (await fetch(`${app.urls.assetHost}/app.json`)).json()
    Object.assign(app, { ...appData, urls: { ...app.urls, ...appData.urls }})

    // Init SETTINGS props
    Object.assign(app, { settings: {
        notifDisabled: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_modeNotifs') }
    }})

    chrome.storage.sync.set({ app }) // browser storage

    // Launch ChatGPT on install
    chrome.runtime.onInstalled.addListener(details => {
        if (details.reason == 'install')
            chrome.tabs.create({ url: 'https://chatgpt.com/' })
    })

    // Sync settings to activated tabs
    chrome.tabs.onActivated.addListener(activeInfo =>
        chrome.tabs.sendMessage(activeInfo.tabId, { action: 'syncStorageToUI' }))
    
})()