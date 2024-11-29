window.config = {}
window.settings = {

    controls: {
        notifDisabled: { type: 'toggle',
            label: chrome.i18n.getMessage('menuLabel_modeNotifs'),
            helptip: chrome.i18n.getMessage('helptip_modeNotifs') }
    },

    load() {
        const keys = ( // original array if array, else new array from multiple args
            Array.isArray(arguments[0]) ? arguments[0] : Array.from(arguments))
        return Promise.all(keys.map(key => // resolve promise when all keys load
            new Promise(resolve => // resolve promise when single key value loads
                chrome.storage.sync.get(key, result => { // load from browser extension storage
                    window.config[key] = result[key] || false ; resolve()
    }))))},

    save(key, val) {
        chrome.storage.sync.set({ [key]: val }) // save to browser extension storage
        window.config[key] = val // save to memory
    }
};