var highlightMode = false;
var popupOpened = false;
var popupFixed = false;
var othersMode = true;
var color = 'yellow';
var toggleOpened = false;
var updatedPage = false;
var baseUrlRegex = /^https?:\/\/[^\/]+/i;
var currentTabId;

chrome.runtime.onInstalled.addListener(function() {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});


//Ao atualizar a página
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    updatedPage = true;
    if (changeInfo.status == 'complete') {
            //chrome.storage.local.set({'mine_highlights': []}, function () {});
            currentTabId = tabId;
            if(tab.url.match(baseUrlRegex))
                _dataControl.getRating(tabId, tab.url, tab.url.match(baseUrlRegex)[0]);
        toggleOpened = false;
        if(popupOpened) {
            popupOpened = !popupOpened;
            if(toggleOpened)
                toggleOpened = !toggleOpened;
            togglePopup();
        }

        chrome.storage.local.set({'highlightMode': false}, function() {});
        //Carregar os highlights já feitos na página e o log
        _dataControl.getAllHighlightsClosePopup(tab.url);
        //--------------------------------------
    }
});

//Ao trocar de tab
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        currentTabId = activeInfo.tabId;
        if(tab.url.match(baseUrlRegex))
            _dataControl.getRating(activeInfo.tabId, tab.url, tab.url.match(baseUrlRegex)[0]);
        _dataControl.getAllHighlights(tab.url);
    });
});

//Ao clicar no ícone
chrome.browserAction.onClicked.addListener(function (tab){
    updatedPage = false;
    togglePopup();
    //Resetar highlights
    //chrome.storage.local.set({'allHighlights': {}}, function() {});
});

chrome.contextMenus.create({
    id: "highlight-text",
    title: "Destacar Texto",
    contexts: ["all"]
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    _dataControl.sendToFront('save_highlight', {});
});


function togglePopup() {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach((tab) => {
            toggleIcon(tab);
            chrome.tabs.sendMessage(tab.id, {msg: 'toggle_popup', data: {highlightMode: highlightMode, popupOpened: popupOpened, popupFixed: popupFixed, color: color, toggleOpened: toggleOpened, updatedPage: updatedPage, othersMode: othersMode}});
        });
    });
}

function togglePopupOption(_popupOpened) {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach((tab) => {
            toggleIcon(tab);
            chrome.tabs.sendMessage(tab.id, {msg: 'toggle_popup', data: {highlightMode: highlightMode, popupOpened: _popupOpened, popupFixed: popupFixed, color: color, toggleOpened: toggleOpened, updatedPage: updatedPage, othersMode: othersMode}});
        });
    });
}

function togglePopupFixed(_popupFixed) {
    popupFixed = !_popupFixed;
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {msg: 'toggle_popup_fixed', data: {popupFixed: _popupFixed}});
        });
    });
}

function toggleHighlightMode(activated) {
    highlightMode = activated;
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach((tab) => {
            toggleIcon(tab);
            chrome.tabs.sendMessage(tab.id, {msg: 'toggle_highlight_mode', data: {highlightMode: activated}});
        });
    });
}

function toggleIcon(tab) {
    if(highlightMode) {
        chrome.browserAction.setIcon({
            path: '../icons/128x128-ativo.png',
            tabId: tab.tabId
        });
    }
    else {
        chrome.browserAction.setIcon({
            path: '../icons/128x128-desat.png',
            tabId: tab.tabId
        });
    }
}

function setColor(newColor) {
    color = newColor;
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {msg: 'set_color', data: {color: newColor}});
        });
    });
}

function toggleToggle(opened) {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {msg: 'toggle_toggle', data: {toggleOpened: opened}});
        });
    });
}

function toggleOthersMode(mode) {
    othersMode = mode;
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {msg: 'toggle_others_mode', data: {othersMode: othersMode}});
        });
    });
}

//Atualizar log
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse){  
        switch(message.msg) {
            case 'update_log':
                _dataControl.getHighlights('updateLog');
                break;
            case 'update_all':
                _dataControl.getHighlights('updateAll');
                break;
            case 'toggle_popup':
                popupOpened = message.data.popupOpened;
                break;
            case 'close_popup':
                togglePopupOption(true)
                break;
            case 'turn_on_highlight_mode':
                toggleHighlightMode(true);
                break;
            case 'turn_off_highlight_mode':
                toggleHighlightMode(false);
                break;
            case 'toggle_popup_fixed':
                togglePopupFixed(message.data.popupFixed);
                break;
            case 'set_color':
                setColor(message.data.color);
                break;
            case 'toggle_toggle':
                toggleOpened = message.data.toggleOpened;
                break;
            case 'close_toggle':
                toggleToggle(true);
                break;
            case 'toggle_others_mode':
                toggleOthersMode(message.data.othersMode);
                break;
        }
    }
);