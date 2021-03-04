var currentURL = window.location.href;
var log = {};
var highlightData = {};
var ratingData = {};


//Carregar os highlights já feitos na página
chrome.extension.onMessage.addListener(function(message, messageSender, sendResponse) {
    switch(message.msg) {
        case "load_all_highlights":
            _chromeStorage.getHighlights();
            break;
        case "register_user":
            console.log('registerUser');
            _chromeStorage.registerUser(message.data);
            break;
        case "login_user":
            _chromeStorage.loginUser(message.data);
            break;
        case "save_highlight":
            _chromeStorage.saveHighlight(message.data);
            break;
        case "delete_highlight":
            _chromeStorage.removeHighlight(message.data.highlightId);
            break;
    }
    return true;
});
//--------------------------------------

var _chromeStorage = {
    getHighlights: function (callBack) {
        var that = this;

        chrome.storage.local.get('destaquei_jwt_token', function(data) {
            console.log(data);
            if(data['destaquei_jwt_token']) {
                $.ajax({
                    url : "https://visualiz.com.br/highlights",
                    headers: {"Authorization": "Bearer " + data['destaquei_jwt_token']},
                    contentType: "application/json",
                    dataType: "json",
                    type : 'get',
                    crossDomain : true,
                    success: function(response) {
                        console.log(response)
                        if(!response.error){  
                            var data = response.results;
                            if(callBack == 'updateAll') {
                                that.updateLog(data.highlights);
                                that.updatePageHighlights(data.highlights);
                                console.log('get highlights update all')
                            }
                            else if(callBack == 'updateLog')
                                that.updateLog(data.highlights);
                            else if(callBack == 'updatePageHighlights')
                                that.updatePageHighlights(data.highlights);
                        }
                    },
                    error: function(response) {
                        console.log(response)
                        //Se code for 401, logar de novo
                        if(response.error) {
                            if(response.errors)
                                that.sendToFront({msg: 'error_message', data: {msg: response.errors.msg, type: "get_highlights"}});
                            else
                                that.sendToFront({msg: 'error_message', data: {msg: "Erro no servidor", type: "get_highlights"}});
                        }
                    }
                });
            }
        });
    },

    getRating: function (tabId) {
        console.log('update rating back')
        ratingData = {'page': 2.1, 'global': 3.8};
        chrome.tabs.sendMessage(tabId, {msg: 'update_rating', data: {ratingData: ratingData}});
    },

    saveHighlight: function(highlight) {
        var that = this;
        
        chrome.storage.local.get('user_email', function (data) {
            console.log(data);
            if(data['user_email']) {
                highlight['user_email'] = data['user_email'];

                chrome.storage.local.get('destaquei_jwt_token', function(data) {
                    $.ajax({
                        url : "https://visualiz.com.br/highlights",
                        headers: {"Authorization": "Bearer " + data['destaquei_jwt_token']},
                        contentType: "application/json",
                        dataType: "json",
                        type : 'post',
                        crossDomain : true,
                        data : JSON.stringify(highlight),
                        success: function(response) {
                            console.log(response)
                            if(!response.error){  
                                that.getHighlights('updateLog');
                                that.sendToFront({msg: 'wrap_highlight', data: {highlightId: response.results.id}})
                            }
                        },
                        error: function(response) {
                            console.log(response)
                            if(response.error) {
                                if(response.errors)
                                    _popup.showMessage({msg: response.errors.msg, type: "save_highlight"}, 'error');
                                else
                                    _popup.showMessage({msg: 'Erro no servidor', type: "save_highlight"}, 'error');
                            }
                        }
                   });
                });
            }
        });
    },

    updateLog: function(data) {
        log = data;
        var logsHTML = '';
        console.log(data);
        if(data != undefined) {
            data.forEach(highlight => {
                highlight.color = highlight.color[0];
                highlight['id'] = highlight['_id'];
                const iconImg = '<div class="icon-wrapper ipp"><a target="_blank" class="ipp" href="' + highlight.url +'"><img class="log-web-icon ipp" src="' + highlight.icon_url + '"></a></div>';
                var logHTML = '<a rel="noopener" target="_blank" class="ipp" href="' + highlight.url + '#:~:text=' + encodeURIComponent(highlight.text) + '"><div class="log-wrapper ipp">';
                var text = '<p class="log-text ipp '+ highlight.color +'">' + highlight.text + '</p>';
                logHTML = logHTML + text + '<div class="log-icons ipp" id="'+ highlight.url +'">';
                logHTML = logHTML + iconImg + '<i id="'+ highlight.id +'" class="ipp material-icons-outlined log-delete">delete</i></div></div></a>';
                logsHTML = logsHTML + logHTML;
            });
    
            this.sendToFront({msg: 'update_log', data: {log: log, logsHTML: logsHTML}, highlightMode: highlightMode});
        }
    },

    updatePageHighlights: function(data) {
        console.log('updatepage highlights back')
        this.sendToFront({msg: 'update_page_highlights', data: data, highlightMode: highlightMode});
    },

    registerUser: function(data) {
        var that = this;
        console.log(JSON.stringify(data))
        $.ajax({
            url : "https://visualiz.com.br/auth/register",
            contentType: "application/json",
            dataType: "json",
            type : 'post',
            crossDomain : true,
            data : JSON.stringify(data),
            success: function(response) {
                console.log(response)
                if(!response.error){
                    that.sendToFront({msg: 'success_message', data: {msg: "Registrado com sucesso!", type: "register"}});
                    that.verifyUser(response.results.verification);
                }
            },
            error: function(response) {
                console.log(response)
                if(response.error) {
                    if(response.errors)
                        that.sendToFront({msg: 'error_message', data: {msg: response.errors.msg, type: "register"}});
                    else
                        that.sendToFront({msg: 'error_message', data: {msg: "Erro no servidor", type: "register"}});
                }
            }
       })
    },

    loginUser: function(data) {
        var that = this;
        $.ajax({
            url : "https://visualiz.com.br/auth/login",
            contentType: "application/json",
            dataType: "json",
            type : 'post',
            crossDomain : true,
            data : JSON.stringify(data),
            success: function(response) {
                if(!response.error){  
                    chrome.storage.local.set({'destaquei_jwt_token': response.results.token}, function() {});
                    chrome.storage.local.set({'user_email': response.results.user.email}, function() {});
                    that.sendToFront({msg: 'logged_in', data: {}});
                }
            },
            error: function(response) {
                if(response.error) {
                    if(response.errors)
                        that.sendToFront({msg: 'error_message', data: {msg: response.errors, type: "register"}});
                    else
                        that.sendToFront({msg: 'error_message', data: {msg: "Erro no servidor", type: "register"}});
                }
            }
       })
    },

    verifyUser: function(data) {
        var that = this;
        $.ajax({
            url : "https://visualiz.com.br/auth/verify/" + data.token,
            contentType: "application/json",
            dataType: "json",
            type : 'get',
            crossDomain : true,
            success: function(response) {
                console.log(response);
            }
       })
    },

    removeHighlight: function(highlightId) {
        var that = this;
        chrome.storage.local.get('destaquei_jwt_token', function(data) {
            if(data['destaquei_jwt_token']) {
                $.ajax({
                    url : "https://visualiz.com.br/highlights/" + highlightId,
                    headers: {"Authorization": "Bearer " + data['destaquei_jwt_token']},
                    contentType: "application/json",
                    dataType: "json",
                    type : 'delete',
                    crossDomain : true,
                    success: function(response) {
                        console.log(response)
                        if(!response.error){  
                            that.getHighlights('updateAll');
                        }
                    },
                    error: function(response) {
                        console.log(response)
                        if(response.error) {
                            if(response.errors)
                                _popup.showMessage({msg: response.errors, type: "delete_highlight"}, 'error');
                            else
                                _popup.showMessage({msg: 'Erro no servidor', type: "save_highlight"}, 'error');
                        }
                    }
                });
            }
        });
    },
    
    sendToFront: function(data) {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, data);
            });
        });
    }
};

