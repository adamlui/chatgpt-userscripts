// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
//  © 2023–2025 KudoAI & contributors under the MIT license

(async () => {

    document.documentElement.setAttribute( // for userscript auto-disable
        'chatgpt-auto-continue-extension-installed', true)

    // Import JS resources
    for (const resource of ['components/modals.js', 'lib/chatgpt.js', 'lib/dom.js', 'lib/settings.js'])
        await import(chrome.runtime.getURL(resource))

    // Init ENV context
    const env = { browser: { isMobile: chatgpt.browser.isMobile() }, ui: { scheme: getScheme() }}
    env.browser.isPortrait = env.browser.isMobile && (window.innerWidth < window.innerHeight)

    // Import APP data
    const { app } = await chrome.storage.sync.get('app')

    // Export DEPENDENCIES to imported resources
    dom.imports.import({ env }) // for env.ui.scheme
    modals.imports.import({ app, env }) // for app data + env.ui.scheme

    // Add CHROME MSG listener
    chrome.runtime.onMessage.addListener(req => {
        if (req.action == 'notify')
            notify(...['msg', 'pos', 'notifDuration', 'shadow'].map(arg => req.options[arg]))
        else if (req.action == 'alert')
            modals.alert(...['title', 'msg', 'btns', 'checkbox', 'width'].map(arg => req.options[arg]))
        else if (req.action == 'showAbout') chatgpt.isLoaded().then(() => { modals.open('about') })
        else if (req.action == 'syncConfigToUI') syncConfigToUI(req.options)
    })

    // Init SETTINGS
    await settings.load('extensionDisabled', ...Object.keys(settings.controls))

    // Define FUNCTIONS

    function notify(msg, pos = '', notifDuration = '', shadow = '') {
        if (config.notifDisabled && !msg.includes(chrome.i18n.getMessage('menuLabel_modeNotifs'))) return

        // Strip state word to append colored one later
        const foundState = [ chrome.i18n.getMessage('state_on').toUpperCase(),
                             chrome.i18n.getMessage('state_off').toUpperCase()
              ].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, pos, notifDuration, shadow || env.ui.scheme == 'dark' ? '' : 'shadow')
        const notif = document.querySelector('.chatgpt-notif:last-child')

        // Append styled state word
        if (foundState) {
            const styledStateSpan = dom.create.elem('span')
            styledStateSpan.style.cssText = `color: ${
                foundState == 'OFF' ? '#ef4848 ; text-shadow: rgba(255,169,225,0.44) 2px 1px 5px'
                                    : '#5cef48 ; text-shadow: rgba(255,250,169,0.38) 2px 1px 5px' }`
            styledStateSpan.append(foundState) ; notif.append(styledStateSpan)
        }
    }

    function checkContinueBtn() {
        checkContinueBtn.status = 'active'
        if (config.extensionDisabled) { checkContinueBtn.status = 'inactive' ; return }
        const continueBtn = chatgpt.getContinueBtn()
        if (continueBtn) {
            continueBtn.click()
            notify(chrome.i18n.getMessage('notif_chatAutoContinued'), 'bottom-right')
            try { chatgpt.scrollToBottom() } catch(err) {}
            setTimeout(checkContinueBtn, 5000)
        } else setTimeout(checkContinueBtn, 500)
    }

    async function syncConfigToUI() { // on toolbar popup toggles + ChatGPT tab activations
        await settings.load('extensionDisabled', ...Object.keys(settings.controls))
        if (!config.extensionDisabled && checkContinueBtn.status != 'active') checkContinueBtn()
    }

    function getScheme() {
        return document.documentElement.className
            || (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light')
    }

    // Run MAIN routine

    // Add STARS styles
    ['black', 'white'].forEach(color => document.head.append(
        dom.create.elem('link', { rel: 'stylesheet',
            href: `https://assets.aiwebextensions.com/styles/rising-stars/dist/${
                color}.min.css?v=0cde30f9ae3ce99ae998141f6e7a36de9b0cc2e7`
    })))

    // Observe DOM for need to continue generating response
    if (!config.extensionDisabled) {
        checkContinueBtn()

    // NOTIFY of status on load
        notify(`${chrome.i18n.getMessage('mode_autoContinue')}: ${ chrome.i18n.getMessage('state_on').toUpperCase()}`)
    }

    // Monitor SCHEME PREF changes to update sidebar toggle + modal colors
    new MutationObserver(handleSchemePrefChange).observe( // for site scheme pref changes
        document.documentElement, { attributes: true, attributeFilter: ['class'] })
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener( // for browser/system scheme pref changes
        'change', () => requestAnimationFrame(handleSchemePrefChange))
    function handleSchemePrefChange() {
        const displayedScheme = getScheme()
        if (env.ui.scheme != displayedScheme) { env.ui.scheme = displayedScheme ;  modals.stylize() }
    }

})()
