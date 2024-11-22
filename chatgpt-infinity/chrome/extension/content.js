// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
// © 2023–2024 KudoAI & contributors under the MIT license

(async () => {

    document.documentElement.setAttribute('cif-extension-installed', true) // for userscript auto-disable

    // Import LIBS
    await import(chrome.runtime.getURL('lib/chatgpt.js'))
    await import(chrome.runtime.getURL('lib/dom.js'))
    const { config, settings } = await import(chrome.runtime.getURL('lib/settings.js'))

    // Import APP data
    const { app } = await chrome.storage.sync.get('app')

    // Add CHROME MSG listener
    chrome.runtime.onMessage.addListener(req => {

        if (req.action == 'notify') notify(req.msg, req.pos)
        else if (req.action == 'alert') siteAlert(req.title, req.msg, req.btns)
        else if (req.action.startsWith('infinity')) {
            infinity.muted = true // prevent top-right notif blocked by popup
            infinity[/\.(\w+)/.exec(req.action)[1]](req.options)
        } else if (req.action == 'syncStorageToUI') {
            if (req.sender == 'service-worker.js') // disable Infinity mode 1st to not transfer between tabs
                settings.save('infinityMode', false)
            syncStorageToUI()
        }
    })

    // Init ENV info
    const env = { browser: { isMobile: chatgpt.browser.isMobile() }}

    // Init CONFIG
    settings.save('userLanguage', (await chrome.i18n.getAcceptLanguages())[0])
    await settings.load('extensionDisabled', ...Object.keys(settings.controls))
    if (!config.replyLanguage) settings.save('replyLanguage', config.userLanguage) // init reply language if unset
    if (!config.replyTopic) settings.save('replyTopic', 'ALL') // init reply topic if unset
    if (!config.replyInterval) settings.save('replyInterval', 7) // init refresh interval to 7 secs if unset

    // Define FEEDBACK functions

    function notify(msg, pos = '', notifDuration = '', shadow = '') {

        // Strip state word to append colored one later
        const foundState = [ chrome.i18n.getMessage('state_on').toUpperCase(),
                             chrome.i18n.getMessage('state_off').toUpperCase()
              ].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, pos, notifDuration, shadow || chatgpt.isDarkMode() ? '' : 'shadow')
        const notif = document.querySelector('.chatgpt-notif:last-child')

        // Append styled state word
        if (foundState) {
            const styledStateSpan = document.createElement('span')
            styledStateSpan.style.cssText = `color: ${
                foundState == 'OFF' ? '#ef4848 ; text-shadow: rgba(255, 169, 225, 0.44) 2px 1px 5px'
                                    : '#5cef48 ; text-shadow: rgba(255, 250, 169, 0.38) 2px 1px 5px' }`
            styledStateSpan.append(foundState) ; notif.append(styledStateSpan)
        }
    }

    function siteAlert(title = '', msg = '', btns = '', checkbox = '', width = '') {
        return chatgpt.alert(title, msg, btns, checkbox, width )}

    // Define UI functions

    async function syncStorageToUI() { // on toolbar popup toggles + ChatGPT tab activations
        await settings.load('extensionDisabled', 'infinityMode', ...Object.keys(settings.controls))
        sidebarToggle.update() // based on config.toggleHidden + config.infinityMode
    }

    const sidebarToggle = {

        create() {
            sidebarToggle.div = document.createElement('div')
            sidebarToggle.update() // create children

            // Stylize/classify
            sidebarToggle.div.style.cssText = 'height: 37px ; margin: 2px 0 ; user-select: none ; cursor: pointer'
            if (ui.firstLink) { // borrow/assign classes from sidebar elems
                const firstIcon = ui.firstLink.querySelector('div:first-child'),
                      firstLabel = ui.firstLink.querySelector('div:nth-child(2)')
                sidebarToggle.div.classList.add(...ui.firstLink.classList, ...(firstLabel?.classList || []))
                sidebarToggle.div.querySelector('img')?.classList.add(...(firstIcon?.classList || []))
            }
            // Add click listener
            sidebarToggle.div.onclick = () => {
                const toggleInput = sidebarToggle.div.querySelector('input')
                toggleInput.checked = !toggleInput.checked ; settings.save('infinityMode', toggleInput.checked)
                infinity.toggle()
            }
        },

        insert() {
            if (sidebarToggle.status?.startsWith('insert') || document.getElementById('infinity-toggle-navicon')) return
            sidebarToggle.status = 'inserting' ; if (!sidebarToggle.div) sidebarToggle.create()

            // Insert toggle
            const sidebar = document.querySelectorAll('nav')[env.browser.isMobile ? 1 : 0]
            if (!sidebar) return
            sidebar.insertBefore(sidebarToggle.div, sidebar.children[1])

            // Tweak styles
            const knobSpan = document.getElementById('infinity-toggle-knob-span'),
                  navicon = document.getElementById('infinity-toggle-navicon')
            sidebarToggle.div.style.flexGrow = 'unset' // overcome OpenAI .grow
            sidebarToggle.div.style.paddingLeft = '8px'
            if (knobSpan) knobSpan.style.boxShadow = (
                'rgba(0, 0, 0, .3) 0 1px 2px 0' + ( chatgpt.isDarkMode() ? ', rgba(0, 0, 0, .15) 0 3px 6px 2px' : '' ))
            if (navicon) navicon.src = `${ // update navicon color in case scheme changed
                app.urls.mediaHost}/images/icons/infinity-symbol/`
              + `${ chatgpt.isDarkMode() ? 'white' : 'black' }/icon32.png?${app.latestAssetCommitHash}`

            sidebarToggle.status = 'inserted'
        },

        update() {
        sidebarToggle.div.style.display = config.toggleHidden ? 'none' : 'flex'

            // Create/size/position navicon
            const navicon = document.getElementById('infinity-toggle-navicon')
                            || dom.create.elem('img', { id: 'infinity-toggle-navicon' })
            navicon.style.cssText = 'width: 1.25rem ; height: 1.25rem ; margin-left: 2px ; margin-right: 4px'

            // Create/ID/disable/hide/update checkbox
            const toggleInput = document.getElementById('infinity-toggle-input')
                                || dom.create.elem('input', { id: 'infinity-toggle-input', type: 'checkbox', disabled: true })
            toggleInput.style.display = 'none' ; toggleInput.checked = config.infinityMode

            // Create/ID/stylize switch
            const switchSpan = document.getElementById('infinity-switch-span')
                            || dom.create.elem('span', { id: 'infinity-switch-span' })
            Object.assign(switchSpan.style, {
                position: 'relative', left: `${ env.browser.isMobile ? 169 : !ui.firstLink ? 160 : 154 }px`,
                backgroundColor: toggleInput.checked ? '#ccc' : '#AD68FF', // init opposite  final color
                bottom: `${ !ui.firstLink ? -0.15 : 0 }em`,
                width: '30px', height: '15px', '-webkit-transition': '.4s', transition: '0.4s',  borderRadius: '28px'
            })

            // Create/stylize knob, append to switch
            const knobSpan = document.getElementById('infinity-toggle-knob-span')
                            || dom.create.elem('span', { id: 'infinity-toggle-knob-span' })
            Object.assign(knobSpan.style, {
                position: 'absolute', left: '3px', bottom: '1.25px',
                width: '12px', height: '12px', content: '""', borderRadius: '28px',
                transform: toggleInput.checked ? // init opposite final pos
                    'translateX(0)' : 'translateX(13px) translateY(0)',
                backgroundColor: 'white',  '-webkit-transition': '0.4s', transition: '0.4s'
            }) ; switchSpan.append(knobSpan)

            // Create/stylize/fill label
            const toggleLabel = document.getElementById('infinity-toggle-label')
                                || dom.create.elem('label', { id: 'infinity-toggle-label' })
            if (!ui.firstLink) // add font size/weight since no ui.firstLink to borrow from
                toggleLabel.style.cssText = 'font-size: 0.875rem, font-weight: 600'
            Object.assign(toggleLabel.style, {
                marginLeft: `-${ !ui.firstLink ? 23 : 41 }px`, // left-shift to navicon
                cursor: 'pointer', // add finger cursor on hover
                width: `${ env.browser.isMobile ? 201 : 148 }px`, // to truncate overflown text
                overflow: 'hidden', textOverflow: 'ellipsis' // to truncate overflown text
            })
            toggleLabel.innerText = chrome.i18n.getMessage('menuLabel_infinityMode') + ' '
                                    + chrome.i18n.getMessage('state_' + ( toggleInput.checked ? 'enabled' : 'disabled' ))
            // Append elements
            for (const elem of [navicon, toggleInput, switchSpan, toggleLabel]) sidebarToggle.div.append(elem)

            // Update visual state
            setTimeout(() => {
                switchSpan.style.backgroundColor = toggleInput.checked ? '#ad68ff' : '#ccc'
                switchSpan.style.boxShadow = toggleInput.checked ? '2px 1px 9px #d8a9ff' : 'none'
                knobSpan.style.transform = toggleInput.checked ? 'translateX(13px) translateY(0)' : 'translateX(0)'
            }, 1) // min delay to trigger transition fx
        }
    }

    chatgpt.isIdle = function() { // replace waiting for chat to start in case of interrupts
        return new Promise(resolve => { // when stop btn missing
            new MutationObserver((_, obs) => {
                if (!chatgpt.getStopBtn()) { obs.disconnect(); resolve() }
            }).observe(document.body, { childList: true, subtree: true })
        })
    }

    // Define INFINITY MODE functions

    const infinity = {

        async activate() {
            settings.save('infinityMode', true) ; syncStorageToUI()
            const activatePrompt = 'Generate a single random question'
                + ( config.replyLanguage ? ( ' in ' + config.replyLanguage ) : '' )
                + ( ' on ' + ( config.replyTopic == 'ALL' ? 'ALL topics' : 'the topic of ' + config.replyTopic ))
                + ' then answer it. Don\'t type anything else.'
            if (!infinity.muted) notify(`${chrome.i18n.getMessage('menuLabel_infinityMode')}: ${
                                           chrome.i18n.getMessage('state_on').toUpperCase()}`)
            else infinity.muted = false
            if (env.browser.isMobile && chatgpt.sidebar.isOn()) chatgpt.sidebar.hide()
            if (!new URL(location).pathname.startsWith('/g/')) // not on GPT page
                try { chatgpt.startNewChat() } catch (err) { return } // start new chat
            await new Promise(resolve => setTimeout(resolve, 500)) // sleep 500ms
            chatgpt.send(activatePrompt)
            await new Promise(resolve => setTimeout(resolve, 3000)) // sleep 3s
            if (!document.querySelector('[data-message-author-role]') // new chat reset due to OpenAI bug
                && config.infinityMode) // ...and toggle still active
                    chatgpt.send(activatePrompt) // ...so prompt again
            await chatgpt.isIdle()
            if (config.infinityMode && !infinity.isActive) // double-check in case de-activated before scheduled
                infinity.isActive = setTimeout(infinity.continue, parseInt(config.replyInterval, 10) * 1000)
        },

        async continue() {
            if (!config.autoScrollDisabled) try { chatgpt.scrollToBottom() } catch(err) {}
            chatgpt.send('Do it again.')
            await chatgpt.isIdle() // before starting delay till next iteration
            if (infinity.isActive) // replace timer
                infinity.isActive = setTimeout(infinity.continue, parseInt(config.replyInterval, 10) * 1000)
        },

        deactivate() {
            settings.save('infinityMode', false) ; syncStorageToUI()
            if (!infinity.muted) notify(`${chrome.i18n.getMessage('menuLabel_infinityMode')}: ${
                                           chrome.i18n.getMessage('state_off').toUpperCase()}`)
            else infinity.muted = false
            chatgpt.stop() ; clearTimeout(infinity.isActive) ; infinity.isActive = null
        },

        async restart(options = { target: 'new' }) {
            if (options.target == 'new') {
                chatgpt.stop() ; infinity.deactivate()
                setTimeout(() => infinity.activate(), 750)
            } else {
                clearTimeout(infinity.isActive) ; infinity.isActive = null ; await chatgpt.isIdle()
                if (config.infinityMode && !infinity.isActive) { // double-check in case de-activated before scheduled
                    await settings.load('replyInterval')
                    infinity.isActive = setTimeout(infinity.continue, parseInt(config.replyInterval, 10) * 1000)
                }
            }

        },

        toggle() { infinity[config.infinityMode ? 'activate' : 'deactivate']() }
    }

    // Run MAIN routine

    // Init BROWSER/UI props
    await Promise.race([chatgpt.isLoaded(), new Promise(resolve => setTimeout(resolve, 5000))]) // initial UI loaded
    await chatgpt.sidebar.isLoaded()
    const ui = { firstLink: chatgpt.getNewChatLink() }

    // Add LISTENER to auto-disable Infinity Mode
    if (document.hidden != undefined) // ...if Page Visibility API supported
        document.onvisibilitychange = () => { if (config.infinityMode) infinity.deactivate() }

    // Add/update TWEAKS style
    const tweaksStyleUpdated = 20241002 // datestamp of last edit for this file's `tweaksStyle`
    let tweaksStyle = document.getElementById('tweaks-style') // try to select existing style
    if (!tweaksStyle || parseInt(tweaksStyle.getAttribute('last-updated'), 10) < tweaksStyleUpdated) { // if missing or outdated
        if (!tweaksStyle) { // outright missing, create/id/attr/append it first
            tweaksStyle = dom.create.elem('style', { id: 'tweaks-style', 'last-updated': tweaksStyleUpdated.toString() })
            document.head.append(tweaksStyle)
        }
        tweaksStyle.innerText = (
            ( chatgpt.isDarkMode() ? '.chatgpt-modal > div { border: 1px solid white }' : '' )
          + '.chatgpt-modal button {'
              + 'font-size: 0.77rem ; text-transform: uppercase ;' // shrink/uppercase labels
              + `border: 2px dashed ${ chatgpt.isDarkMode() ? 'white' : 'black' } !important ; border-radius: 0 !important ;` // thiccen/square/dash borders
              + 'transition: transform 0.1s ease-in-out, box-shadow 0.1s ease-in-out ;' // smoothen hover fx
              + 'cursor: pointer !important ;' // add finger cursor
              + 'padding: 5px !important ; min-width: 102px }' // resize
          + '.chatgpt-modal button:hover {' // add zoom, re-scheme
              + 'transform: scale(1.055) ;'
              + ( chatgpt.isDarkMode() ? 'background-color: #2cff00 !important ; box-shadow: 2px 1px 54px #38ff00 !important ; color: black !important'
                                       : 'background-color: #c7ff006b !important ; box-shadow: 2px 1px 30px #97ff006b !important' ) + '}'
          + '.modal-buttons { margin-left: -13px !important }'
          + '* { scrollbar-width: thin }' // make FF scrollbar skinny to not crop toggle
        )
    }

    sidebarToggle.insert()

    // Auto-start if enabled
    if (config.autoStart) infinity.activate()

    // Monitor <html> to maintain NAV TOGGLE VISIBILITY on node changes
    new MutationObserver(() => {
        if (!config.toggleHidden && !document.getElementById('infinity-toggle-navicon') && sidebarToggle.status != 'inserting') {
            sidebarToggle.status = 'missing' ; sidebarToggle.insert() }
    }).observe(document.body, { attributes: true, subtree: true })

    // Disable distracting SIDEBAR CLICK-ZOOM effect
    if (!document.documentElement.hasAttribute('sidebar-click-zoom-observed')) {
        new MutationObserver(mutations => mutations.forEach(({ target }) => {
            if (target.closest('[class*="sidebar"]') // include sidebar divs
                && !target.id.endsWith('-knob-span') // exclude our sidebarToggle
                && target.style.transform != 'none' // click-zoom occurred
            ) target.style.transform = 'none'
        })).observe(document.body, { attributes: true, subtree: true, attributeFilter: [ 'style' ]})
        document.documentElement.setAttribute('sidebar-click-zoom-observed', true)
    }

})()
