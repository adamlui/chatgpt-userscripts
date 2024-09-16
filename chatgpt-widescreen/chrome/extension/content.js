// NOTE: This script relies on the powerful chatgpt.js library @ https://chatgpt.js.org
// © 2023–2024 KudoAI & contributors under the MIT license
// Source: https://github.com/KudoAI/chatgpt.js
// Latest minified release: https://cdn.jsdelivr.net/npm/@kudoai/chatgpt.js/chatgpt.min.js

(async () => {

    const site = /:\/\/(.*?\.)?(.*)\.[^/]+/.exec(location.href)[2]
    if (!/chatgpt|openai|poe/.test(site)) return

    // Import LIBS
    const { app, config, settings } = await import(chrome.runtime.getURL('lib/settings-utils.js')),
          { chatgpt } = await import(chrome.runtime.getURL('lib/chatgpt.js'))

    // Add CHROME MSG listener
    chrome.runtime.onMessage.addListener(request => {
        if (request.action == 'notify') notify(request.msg, request.position)
        else if (request.action == 'alert') siteAlert(request.title, request.msg, request.btns)
        else if (typeof window[request.action] == 'function') {
            const args = Array.isArray(request.args) ? request.args // preserve array if supplied
                       : request.args != undefined ? [request.args] : [] // convert to array if single or no arg
            window[request.action](...args) // call expression functions
        }
        return true
    })

    // Init SITE props
    const sites = Object.create(null) // prevent protoype pollution
    Object.assign(sites, {
        chatgpt: {
            availFeatures: ['fullerWindows', 'fullWindow', 'hiddenFooter', 'hiddenHeader',
                'notifDisabled', 'ncbDisabled', 'tcbDisabled', 'wideScreen'],
            selectors: { input: '#prompt-textarea', sidebar: '[class*="sidebar"]', header: 'main .sticky' }},
        poe: {
            availFeatures: ['fullerWindows', 'fullWindow', 'hiddenHeader',
                'notifDisabled', 'ncbDisabled', 'tcbDisabled', 'widerChatbox', 'wideScreen'],
            hasSidebar: true,
            selectors: {
                input: '[class*="InputContainer_textArea"] textarea, [class*="InputContainer_textArea"]::after',
                sidebar: 'menu[class*="sidebar"], aside[class*="sidebar"]', header: 'header' }}
    }) ; sites.openai = { ...sites.chatgpt } // shallow copy to cover old domain

    // Define FACTORY functions

    const create = {

        style(content) {
            const style = document.createElement('style')
            if (content) style.innerText = content
            return style
        },

        svgElem(type, attrs) {
            const elem = document.createElementNS('http://www.w3.org/2000/svg', type)
            for (const attr in attrs) elem.setAttributeNS(null, attr, attrs[attr])
            return elem
        }
    }

    // Define FEEDBACK functions

    function notify(msg, position = '', notifDuration = '', shadow = '') {

        // Strip state word to append colored one later
        const foundState = ['ON', 'OFF'].find(word => msg.includes(word))
        if (foundState) msg = msg.replace(foundState, '')

        // Show notification
        chatgpt.notify(`${app.symbol} ${msg}`, position, notifDuration, shadow || chatgpt.isDarkMode() ? '' : 'shadow')
        const notif = document.querySelector('.chatgpt-notif:last-child')

        // Append styled state word
        if (foundState) {
            const styledState = document.createElement('span')
            styledState.style.cssText = `color: ${
                foundState == 'OFF' ? '#ef4848 ; text-shadow: rgba(255, 169, 225, 0.44) 2px 1px 5px'
                                    : '#5cef48 ; text-shadow: rgba(255, 250, 169, 0.38) 2px 1px 5px' }`
            styledState.append(foundState) ; notif.append(styledState)
        }
    }

    function siteAlert(title = '', msg = '', btns = '', checkbox = '', width = '') {
        return chatgpt.alert(title, msg, btns, checkbox, width )}

    // Define BUTTON props/functions

    const btns = {

        svgElems: {
            fullScreen: {
                off: [
                    create.svgElem('path', { stroke: 'none', d: 'm10,16 2,0 0,-4 4,0 0,-2 L 10,10 l 0,6 0,0 z' }),
                    create.svgElem('path', { stroke: 'none', d: 'm20,10 0,2 4,0 0,4 2,0 L 26,10 l -6,0 0,0 z' }),
                    create.svgElem('path', { stroke: 'none', d: 'm24,24 -4,0 0,2 L 26,26 l 0,-6 -2,0 0,4 0,0 z' }),
                    create.svgElem('path', { stroke: 'none', d: 'M 12,20 10,20 10,26 l 6,0 0,-2 -4,0 0,-4 0,0 z' }) ],
                on: [
                    create.svgElem('path', { stroke: 'none', d: 'm14,14-4,0 0,2 6,0 0,-6 -2,0 0,4 0,0 z' }),
                    create.svgElem('path', { stroke: 'none', d: 'm22,14 0,-4 -2,0 0,6 6,0 0,-2 -4,0 0,0 z' }),
                    create.svgElem('path', { stroke: 'none', d: 'm20,26 2,0 0,-4 4,0 0,-2 -6,0 0,6 0,0 z' }),
                    create.svgElem('path', { stroke: 'none', d: 'm10,22 4,0 0,4 2,0 0,-6 -6,0 0,2 0,0 z' }) ]
            },

            fullWindow: [
                create.svgElem('rect', { fill: 'none', x: '3', y: '3', width: '17', height: '17', rx: '2', ry: '2' }),
                create.svgElem('line', { x1: '9', y1: '3', x2: '9', y2: '21' })
            ],

            newChat: [ create.svgElem('path', { stroke: 'none', d: 'M22,13h-4v4h-2v-4h-4v-2h4V7h2v4h4V13z' }) ],

            wideScreen: {
                off: [
                    create.svgElem('path', { stroke: 'none', 'fill-rule': 'evenodd',
                        d: 'm28,11 0,14 -20,0 0,-14 z m-18,2 16,0 0,10 -16,0 0,-10 z' }) ],
                on: [
                    create.svgElem('path', { stroke: 'none', 'fill-rule': 'evenodd',
                        d: 'm26,13 0,10 -16,0 0,-10 z m-14,2 12,0 0,6 -12,0 0,-6 z' }) ]
            }
        },

        insert() {

            // Create buttons if not created yet
            if (!btns.wideScreen) {
                const validBtnTypes = ['fullScreen', 'fullWindow', 'wideScreen', 'newChat']
                    .filter(type => !(type == 'fullWindow' && !sites[site].hasSidebar))
                const bOffset = site == 'poe' ? -1.5 : -13, rOffset = site == 'poe' ? -6 : -4
                btns.color = btns.setColor()
                validBtnTypes.forEach(async (btnType, idx) => {
                    btns[btnType] = document.createElement('div') // create button
                    btns[btnType].id = btnType + '-btn' // for toggle.tooltip()
                    btns.updateSVG(btnType) // insert icon
                    btns[btnType].style.cssText = 'position: relative ; top: 0 ;'
                                                + `right: ${ rOffset + idx * bOffset }px` // position left of prev button
                    btns[btnType].style.cursor = 'pointer' // add finger cursor
                    if (site == 'poe') btns[btnType].style.position = 'relative' // override static pos
                    if (/chatgpt|openai/.test(site)) { // assign classes + tweak styles
                        const sendBtn = await new Promise(resolve => {
                            const sendBtn = chatgpt.getSendBtn() ; if (sendBtn) resolve(sendBtn)
                            else new MutationObserver((_, obs) => {
                                const sendBtn = chatgpt.getSendBtn() ; if (sendBtn) { obs.disconnect() ; resolve(sendBtn) }
                            }).observe(document.body, { childList: true, subtree: true })
                        })
                        btns[btnType].setAttribute('class', sendBtn.classList.toString() || '')
                        btns[btnType].style.backgroundColor = 'transparent' // remove dark mode overlay
                        btns[btnType].style.borderColor = 'transparent' // remove dark mode overlay
                    } else if (site == 'poe') // lift buttons slightly
                        btns[btnType].style.marginBottom = ( btnType == 'newChat' ? '0.45' : '0.2' ) + 'rem'

                    // Add hover/click listeners
                    btns[btnType].onmouseover = btns[btnType].onmouseout = toggle.tooltip
                    btns[btnType].onclick = () => {
                        if (btnType == 'newChat') {
                            if (/chatgpt|openai/.test(site)) chatgpt.startNewChat()
                            else if (site == 'poe') document.querySelector('header a[class*="button"]')?.click()
                        } else toggle.mode(btnType)
                    }
                })
            }

            // Init chatbar
            let chatbar = document.querySelector(sites[site].selectors.input)
            const parentLvls = /chatgpt|openai/.test(site) ? 3 : 2
            for (let i = 0 ; i < parentLvls ; i++) chatbar = chatbar?.parentNode
            if (!chatbar || chatbar.contains(btns.wideScreen)) return // if chatbar missing or buttons aren't, exit
    
            // Tweak chatbar
            if (/chatgpt|openai/.test(site)) {
                const inputArea = chatbar.querySelector(sites[site].selectors.input)
                if (inputArea) {
                    inputArea.style.width = '100%' // rid h-scrollbar
                    inputArea.parentNode.style.width = `${ !sites[site].hasSidebar ? 106 : 110 }%` // expand to close gap w/ buttons
                }
            } else if (site == 'poe') {
                const attachFileBtn = chatbar.querySelector('button[class*="File"]'),
                      clearBtn = document.querySelector('[class*="ChatBreakButton"]')
                if (attachFileBtn) { // left-align attach file button
                    attachFileBtn.style.cssText = 'position: absolute ; left: 1rem ; bottom: 0.35rem'
                    document.querySelector(sites[site].selectors.input).style.padding = '0 13px 0 40px' // accommodate new btn pos
                }
                btns.newChat.style.top = clearBtn ? '-1px' : 0
                btns.newChat.style.marginRight = clearBtn ? '2px' : '1px'
            }
    
            // Insert buttons
            const btnsToInsert = [ btns.newChat, btns.wideScreen, btns.fullWindow, btns.fullScreen, tooltipDiv]
                .filter(btn => btn) // filter out undefined btns.fullWindow if not initted as guest on chatgpt.com
            const elemToInsertBefore = (
                /chatgpt|openai/.test(site) ? chatbar.querySelector('button[class*="right"]') // ChatGPT pre-5/2024
                                           || chatbar.lastChild // ChatGPT post-5/2024 + Poe
                                            : chatbar.children[1] ) // Poe
            btnsToInsert.forEach(btn => chatbar.insertBefore(btn, elemToInsertBefore))
        },
    
        remove() {
            let chatbar = document.querySelector(sites[site].selectors.input)
            const parentLvls = /chatgpt|openai/.test(site) ? 3 : 2
            for (let i = 0 ; i < parentLvls ; i++) chatbar = chatbar?.parentNode
            if (chatbar?.contains(btns.wideScreen)) { // remove all buttons
                const btnsToRemove = [btns.newChat, btns.wideScreen, btns.fullScreen, tooltipDiv]
                if (typeof btns.fullWindow != 'undefined') btnsToRemove.push(btns.fullWindow)
                for (const node of btnsToRemove) chatbar.removeChild(node)
            }
        },

        setColor() {
            return ( /chatgpt|openai/.test(site) ? (
                  document.querySelector('.dark.bg-black, [class*="dark:bg-gray"]') // temp chat post-GPT4-o, pre-GPT-4o
               || chatgpt.isDarkMode() ? 'white' : '#202123' )
            : site == 'poe' ? 'currentColor' : ''
        )},

        updateSVG(mode, state = '') {
    
            // Pick appropriate button/elements
            const [btn, ONelems, OFFelems] = (
                mode == 'fullScreen' ? [btns.fullScreen, btns.svgElems.fullScreen.on, btns.svgElems.fullScreen.off]
              : mode == 'fullWindow' ? [btns.fullWindow, btns.svgElems.fullWindow, btns.svgElems.fullWindow]
              : mode == 'wideScreen' ? [btns.wideScreen, btns.svgElems.wideScreen.on, btns.svgElems.wideScreen.off]
                                     : [btns.newChat, btns.svgElems.newChat, btns.svgElems.newChat])
            // Set SVG attributes
            const btnSVG = btn.querySelector('svg') || document.createElementNS('http://www.w3.org/2000/svg', 'svg')
            btnSVG.setAttribute('height', 18) // prevent shrinking
            if (mode == 'fullWindow') { // stylize full-window button
                btnSVG.setAttribute('stroke', btns.color)
                btnSVG.setAttribute('fill', 'none')
                btnSVG.setAttribute('stroke-width', '2')
                btnSVG.setAttribute('height', site == 'poe' ? '2em' : 17)
                btnSVG.setAttribute('width', site == 'poe' ? '2em' : 17)
            }
            btnSVG.setAttribute('viewBox', (
                mode == 'newChat' ? '11 6 ' : mode == 'fullWindow' ? '-2 -0.5 ' : '8 8 ' ) // move to XY coords to crop whitespace
            + ( mode == 'newChat' ? '13 13' : mode == 'fullWindow' ? '24 24' : '20 20' ) // shrink to fit size) // set pre-tweaked viewbox
            )
            btnSVG.style.pointerEvents = 'none' // prevent triggering tooltips twice
            if (/chatgpt|openai/.test(site)) // override button resizing
                btnSVG.style.height = btnSVG.style.width = '1.3rem'
    
            // Update SVG elements
            while (btnSVG.firstChild) { btnSVG.removeChild(btnSVG.firstChild) }
            const svgElems = config[mode] || state.toLowerCase() == 'on' ? ONelems : OFFelems
            svgElems.forEach(elem => btnSVG.append(elem))
    
            // Update SVG
            if (!btn.contains(btnSVG)) btn.append(btnSVG)
        }
    }

    // Define UPDATE functions

    const update = {

        style: {
            btn() { btnStyle.innerText = `div[id$="-btn"] svg { fill: ${btns.setColor()} ; stroke: ${btns.setColor()} }` },

            tweaks() {
                tweaksStyle.innerText = (
                    /chatgpt|openai/.test(site) ? (
                        ( '[id$="-btn"]:hover { opacity: 80% !important }' ) // dim chatbar btns on hover
                        + 'div:has(+ main) { display: none !important }' // hide ugly double temp chat header
                    ) : site == 'poe' ? 'button[class*="Voice"] { margin: 0 -3px 0 -8px }' : '' ) // h-pad mic btn for even spread
                + ( !config.tcbDisabled && sites[site].availFeatures.includes('tcbDisabled') ? tcbStyle : '' ) // expand text input vertically
                + ( config.hiddenHeader && sites[site].availFeatures.includes('hiddenHeader') ? hhStyle : '' ) // hide header
                + ( config.hiddenFooter && sites[site].availFeatures.includes('hiddenFooter') ? hfStyle : '' ) // hide footer
                + `#newChat-btn { display: ${ config.ncbDisabled && sites[site].availFeatures.includes('ncbDisabled') ? 'none' : 'flex' }}`
            },

            wideScreen() {
                wideScreenStyle.innerText = (
                    /chatgpt|openai/.test(site) ? (
                        '.text-base { max-width: 100% !important }' // widen outer container
                      + '.text-base:nth-of-type(2) { max-width: 97% !important }' // widen inner container
                      + '#__next > div > div.flex { width: 100px }' ) // prevent sidebar shrinking when zoomed
                  : site == 'poe' ? (
                        '[class*="ChatMessagesView"] { width: 100% !important }' // widen outer container
                      + '[class^="Message"] { max-width: 100% !important }' ) // widen speech bubbles
                  : '' )
              if (config.widerChatbox) wideScreenStyle.innerText += wcbStyle    
            }
        },

        tooltip(btnType) { // text & position
            const visibleBtnTypes = ['fullScreen', 'fullWindow', 'wideScreen', 'newChat']
                .filter(type => !(type == 'fullWindow' && !sites[site].hasSidebar))
            const ctrAddend = 25 + ( site == 'poe' ? 45 : 12 ),
                  spreadFactor = site == 'poe' ? 34 : 30.5,
                  iniRoffset = spreadFactor * ( visibleBtnTypes.indexOf(btnType) +1 ) + ctrAddend
            tooltipDiv.innerText = chrome.i18n.getMessage('tooltip_' + btnType + (
                !/full|wide/i.test(btnType) ? '' : (config[btnType] ? 'OFF' : 'ON')))
            tooltipDiv.style.right = `${ // horizontal position
                iniRoffset - tooltipDiv.getBoundingClientRect().width /2 }px`
        }
    }

    syncExtension = () => { // sync settings
        settings.load('extensionDisabled', ...sites[site].availFeatures)
            .then(() => {
                if (config.extensionDisabled) { // try to disable modes
                    try { document.head.removeChild(wideScreenStyle) } catch (err) {}
                    try { document.head.removeChild(fullWindowStyle) ; chatgpt.sidebar.show() } catch (err) {}
                    tweaksStyle.innerText = tweaksStyle.innerText.replace(tcbStyle, '')
                    tweaksStyle.innerText = tweaksStyle.innerText.replace(hhStyle, '')
                    tweaksStyle.innerText = tweaksStyle.innerText.replace(hfStyle, '')
                    btns.remove()
                } else { // restore modes
                    if (config.wideScreen && !document.head.contains(wideScreenStyle)) toggle.mode('wideScreen', 'ON')
                    if (config.fullWindow && sites[site].hasSidebar && !isFullWindow()) toggle.mode('fullWindow', 'ON')
                    update.style.tweaks() // sync taller chatbox + hidden header/footer
                    update.style.wideScreen() // sync wider chatbox
                    btns.insert()
    }})}

    // Define TOGGLE functions

    const toggle = {
        mode(mode, state = '') {
            switch (state.toUpperCase()) {
                case 'ON' : activateMode(mode) ; break
                case 'OFF' : deactivateMode(mode) ; break
                default : config[mode] ? deactivateMode(mode) : activateMode(mode)
            }

            function activateMode(mode) {
                if (mode == 'wideScreen') { document.head.append(wideScreenStyle) ; syncMode('wideScreen') }
                else if (mode == 'fullWindow') {
                    document.head.append(fullWindowStyle)
                    if (site == 'poe') syncMode('fullWindow') ; else chatgpt.sidebar.hide()
                } else if (mode == 'fullScreen') document.documentElement.requestFullscreen()
            }
        
            function deactivateMode(mode) {
                if (mode == 'wideScreen')
                    try { document.head.removeChild(wideScreenStyle) ; syncMode('wideScreen') } catch (err) {}
                else if (mode == 'fullWindow') {
                    try { document.head.removeChild(fullWindowStyle) } catch (err) {}
                    if (/chatgpt|openai/.test(site)) chatgpt.sidebar.show()
                    else if (site == 'poe') syncMode('fullWindow') // since not sidebarObserve()'d
                } else if (mode == 'fullScreen') {
                    if (config.f11)
                        siteAlert(chrome.i18n.getMessage('alert_pressF11'), chrome.i18n.getMessage('alert_f11reason') + '.')
                    document.exitFullscreen().catch(err => console.error(app.symbol + ' » Failed to exit fullscreen', err))
                }
            }
        },

        tooltip(event) {
            update.tooltip(event.currentTarget.id.replace(/-btn$/, ''))
            tooltipDiv.style.opacity = event.type == 'mouseover' ? '1' : '0'    
        }
    }

    // Define SYNC functions

    function isFullWindow() {
        return site == 'poe' ? !!document.getElementById('fullWindow-mode')
                             : !sites[site].hasSidebar || chatgpt.sidebar.isOff()
    }

    function syncMode(mode) { // setting + icon + tooltip
        const state = ( mode == 'wideScreen' ? !!document.getElementById('wideScreen-mode')
                      : mode == 'fullWindow' ? isFullWindow()
                                             : chatgpt.isFullScreen() )
        settings.save(mode, state) ; btns.updateSVG(mode) ; update.tooltip(mode)
        if (mode == 'fullWindow') syncFullerWindows(state)
        settings.load('notifDisabled').then(() => {
            if (!config.notifDisabled) // notify synced state
                notify(`${ chrome.i18n.getMessage('mode_' + mode) } ${ state ? 'ON' : 'OFF' }`)
        })
        config.modeSynced = true ; setTimeout(() => config.modeSynced = false, 100) // prevent repetition
    }

    function syncFullerWindows(fullWindowState) {
        if (fullWindowState && config.fullerWindows && !config.wideScreen) { // activate fuller windows
            document.head.append(wideScreenStyle) ; btns.updateSVG('wideScreen', 'on')
        } else if (!fullWindowState) { // de-activate fuller windows
            try { document.head.removeChild(fullWindowStyle) } catch (err) {} // to remove style too so sidebar shows
            if (!config.wideScreen) { // disable widescreen if result of fuller window
                try { document.head.removeChild(wideScreenStyle) } catch (err) {}                
                btns.updateSVG('wideScreen', 'off')
    }}}
    
    // Run MAIN routine

    document.documentElement.setAttribute('cwm-extension-installed', true) // for userscript auto-disable

    // Init UI props
    if (/openai|chatgpt/.test(site)) {
        const obsConfig = { childList: true, subtree: true }
        sites[site].hasSidebar = await Promise.race([
            new Promise(resolve => { // true if sidebar toggle loads
                if (document.querySelector('[d^="M8.85719"]')) resolve(true)
                else new MutationObserver((_, obs) => {
                    if (document.querySelector('[d^="M8.85719"]')) { obs.disconnect() ; resolve(true) }
                }).observe(document.body, obsConfig)
            }),
            new Promise(resolve => { // false if login button loads
                if (document.querySelector('[data-testid*="login"]')) resolve(false)
                else new MutationObserver((_, obs) => {
                    if (document.querySelector('[data-testid*="login"]')) { obs.disconnect() ; resolve(false) }
                }).observe(document.body, obsConfig)
            }),
            new Promise(resolve =>  // null if 3s passed
                setTimeout(() => resolve(null), 3000))
        ])
        sites[site].selectors.footer = chatgpt.getFooterDiv()?.classList.toString()
            .replace(/([:[\]\\])/g, '\\$1') // escape special chars :[]\
            .replace(/^| /g, '.') // prefix w/ dot, convert spaces to dots
    }

    // Save FULL-WINDOW + FULL SCREEN states
    config.fullWindow = /chatgpt|openai/.test(site) ? isFullWindow() : settings.load('fullWindow')
    config.fullScreen = chatgpt.isFullScreen()

    // Create/apply BUTTON style
    const btnStyle = create.style() ; update.style.btn() ; document.head.append(btnStyle)

    // Create/stylize TOOLTIP div
    const tooltipDiv = document.createElement('div')
    tooltipDiv.classList.add('cwm-tooltip')
    document.head.append(create.style('.cwm-tooltip {'
        + 'background-color: rgba(0, 0, 0, 0.71) ; padding: 5px ; border-radius: 6px ; border: 1px solid #d9d9e3 ;' // bubble style
        + 'font-size: 0.85rem ; color: white ;' // font style
        + 'position: absolute ; bottom: 50px ;' // v-position
        + 'box-shadow: 4px 6px 16px 0 rgb(0 0 0 / 38%) ;' // drop shadow
        + 'opacity: 0 ; transition: opacity 0.1s ; z-index: 9999 ;' // visibility
        + '-webkit-user-select: none ; -moz-user-select: none ; -ms-user-select: none ; user-select: none }' // disable select
    ))

    // Create/apply general style TWEAKS
    const tweaksStyle = create.style(),
          tcbStyle = ( // heighten chatbox
              site == 'poe' ? sites[site].selectors.input : `div[class*="prose"]:has(${sites[site].selectors.input})`)
                            + '{ max-height: 68vh }',
          hhStyle = sites[site].selectors.header + '{ display: none !important }' // hide header
                  + ( /chatgpt|openai/.test(site) ? 'main { padding-top: 12px }' : '' ), // increase top-padding
          hfStyle = sites[site].selectors.footer + '{ visibility: hidden ;' // hide footer text
                                                 + '  height: 3px }' // reduce height

    update.style.tweaks() ; document.head.append(tweaksStyle)

    // Create WIDESCREEN style
    const wideScreenStyle = create.style()
    wideScreenStyle.id = 'wideScreen-mode' // for syncMode()
    const wcbStyle = ( // Wider Chatbox for update.style.wideScreen()
        /chatgpt|openai/.test(site) ? 'main form { max-width: 96% !important }'
      : site == 'poe' ? '[class*=footerInner] { width: 100% }' : '' )
    update.style.wideScreen()

    // Create FULL-WINDOW style
    const fullWindowStyle = create.style()
    fullWindowStyle.id = 'fullWindow-mode' // for syncMode()
    fullWindowStyle.innerText = sites[site].selectors.sidebar + '{ display: none }'

    // Insert BUTTONS
    settings.load('extensionDisabled').then(() => { if (!config.extensionDisabled) btns.insert() })

    // Monitor NODE CHANGES to auto-toggle once + maintain button visibility + update colors
    let isTempChat = false, prevSessionChecked = false
    const nodeObserver = new MutationObserver(([mutation]) => {

        // Load keys, check to restore prev session's state
        settings.load(['extensionDisabled', ...sites[site].availFeatures])
            .then(() => { if (!config.extensionDisabled) {
                if (!prevSessionChecked) { // restore prev session's state
                    if (config.wideScreen) toggle.mode('wideScreen', 'ON')
                    if (config.fullWindow && sites[site].hasSidebar) { toggle.mode('fullWindow', 'ON')
                        if (/chatgpt|openai/.test(site)) { // sidebar observer doesn't trigger
                            syncFullerWindows(true) // so sync Fuller Windows...
                            if (!config.notifDisabled) // ... + notify
                                notify(chrome.i18n.getMessage('mode_fullWindow') + ' ON')
                    }}
                    if (!config.tcbDisabled || config.ncbDisabled || config.hiddenHeader || config.hiddenFooter)
                        update.style.tweaks()
                    if (config.widerChatbox) update.style.wideScreen()
                    prevSessionChecked = true
                }
                btns.insert() // again or they constantly disappear
            } prevSessionChecked = true // even if extensionDisabled, to avoid double-toggle
        })

        // Update button colors on ChatGPT scheme or temp chat toggle
        if (/chatgpt|openai/.test(site)) {
            let chatbarBGdiv = document.querySelector(sites[site].selectors.input)
            for (let i = 0 ; i < 1 ; i++) { chatbarBGdiv = chatbarBGdiv?.parentNode }
            if (chatbarBGdiv) {
                const chatbarBGisBlack = chatbarBGdiv.classList.contains('bg-black');
                if ((mutation.type === 'attributes' && mutation.attributeName === 'class') // potential scheme toggled
                     || (chatbarBGisBlack && !isTempChat) || (!chatbarBGisBlack && isTempChat)) { // temp chat toggled
                        update.style.btn() ; isTempChat = !isTempChat
        }}}
    })
    nodeObserver.observe( // <html> for page scheme toggles
        document.documentElement, { attributes: true })
    nodeObserver.observe( // for chatbar changes
        document.querySelector(/openai|chatgpt/.test(site) ? 'main' : 'head'),
        { attributes: true, subtree: true }
    )

    // Monitor SIDEBAR to update full-window setting
    if (/chatgpt|openai/.test(site) && !!sites[site].hasSidebar) {
        const sidebarObserver = new MutationObserver(() => {
            settings.load(['extensionDisabled']).then(() => {
                if (!config.extensionDisabled) {
                    const fullWindowState = isFullWindow()
                    if ((config.fullWindow && !fullWindowState) || (!config.fullWindow && fullWindowState))
                        if (!config.modeSynced) syncMode('fullWindow')
        }})})
        setTimeout(() => // delay half-sec before observing to avoid repeated toggles from nodeObserver
            sidebarObserver.observe(document.querySelector(sites[site].selectors.sidebar), { attributes: true }), 500)
    }

    // Add RESIZE LISTENER to update full screen setting/button + disable F11 flag
    window.onresize = () => {
        const fullScreenState = chatgpt.isFullScreen()
        if (config.fullScreen && !fullScreenState) { syncMode('fullScreen') ; config.f11 = false } // exiting full screen
        else if (!config.fullScreen && fullScreenState) syncMode('fullScreen') // entering full screen
    }

    // Add KEY LISTENER to enable flag on F11 + stop generating text on ESC
    window.onkeydown = event => {
        if ((event.key == 'F11' || event.keyCode == 122) && !config.fullScreen) config.f11 = true
        else if ((event.key == 'Escape' || event.keyCode == 27) && !chatgpt.isIdle()) chatgpt.stop()
    }

})()
