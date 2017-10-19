// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

  var order_data = [
    // {"order_id":"13175801777733729","order_type":1,"purchase_order_id":21653,"buyer":"dandeng","amount":0.95,"freight":"6.00","cargo_value":"99.00"},
    // {"order_id":"13162263715733","order_type":1,"purchase_order_id":21653,"buyer":"dandeng","amount":0.25,"freight":"6.00","cargo_value":"99.00"},
    // {"order_id":"taobao9583901733729","order_type":2,"purchase_order_id":21652,"buyer":"dandeng","amount":0.06,"freight":"6.00","cargo_value":"40.00"},
    // {"order_id":"14081680747733729","order_type":2,"purchase_order_id":21649,"buyer":"dandeng","amount":0.06,"freight":"30.00","cargo_value":"1116.00"},
    // {"order_id":"13178742186733729","order_type":1,"purchase_order_id":21653,"buyer":"dandeng","amount":0.25,"freight":"6.00","cargo_value":"99.00"},
    // {"order_id":"13654783154733729","order_type":2,"purchase_order_id":21649,"buyer":"dandeng","amount":1146.44,"freight":"30.00","cargo_value":"1116.00"},
    // {"order_id":"136742622087337","order_type":2,"purchase_order_id":21649,"buyer":"dandeng","amount":1146.44,"freight":"30.00","cargo_value":"1116.00"},
    // {"order_id":"13674262208733729","order_type":2,"purchase_order_id":21649,"buyer":"dandeng","amount":0.5,"freight":"30.00","cargo_value":"1116.00"},
    // {"order_id":"13679583901733729","order_type":2,"purchase_order_id":21649,"buyer":"dandeng","amount":1.0,"freight":"30.00","cargo_value":"1116.00"},
    // {"order_id":"131633234007337","order_type":1,"purchase_order_id":21652,"buyer":"dandeng","amount":46,"freight":"6.00","cargo_value":"40.00"}
  ];

  var make_page_index = 0;

  var order_detail_url = "https://trade.1688.com/order/new_step_order_detail.htm?orderId=";
  var taobao_order_pay_rul = "https://buyertrade.taobao.com/trade/pay.htm?bizOrderId=";
  var alipay_password = "";

  const state_pay_succeed = 1;      //付款成功
  const state_not_order_id = 2;     //订单不存在
  const state_amount_illegal = 3;   //订单金额不合法
  const state_error = 4;            //订单支付失败,或其他原因
  const state_have_paid = 5;        //订单在这之前已经付过款了
  const state_stockout = 6;         //订单付款是出现库存不足

//通用get API请求
function httpGetRequest(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = uploadComplete;
    xhr.onerror = uploadFailed;
    xhr.send();

    function uploadComplete(evt) {
      var response = JSON.parse(evt.target.responseText);
      console.log(response);
      if(response.status == true){
        callback(response.status, response.content);
      } else {
        callback(response.status, response.message);
      }
    }
    function uploadFailed(evt) {
      console.log("服务器内部错误", evt);
      callback(false, "服务器内部错误");
    }
}

//通用post API请求
function httpPostRequest(url, data, callback) {
    var xhr = new XMLHttpRequest();
    var fd = new FormData();
    for(var key in data){
      fd.append(key, data[key]);
    }
    xhr.open("POST", url, true);
    // xhr.setRequestHeader('X-PINGOTHER', 'pingpong');
    // xhr.setRequestHeader('Content-Type', 'multipart/form-data');
    xhr.setRequestHeader("sign", "322B5E54E3744775DDF8B5F3F81C3C15");
    xhr.onload = uploadComplete;
    xhr.onerror =  uploadFailed;
    xhr.send(fd);

    function uploadComplete(evt) {
      var response = JSON.parse(evt.target.responseText);
      if(response.status == true){
        callback(response.status, response.content);
      } else {
        callback(response.status, response.message);
      }
    }
    function uploadFailed(evt) {
      console.log("服务器内部错误", evt);
      callback(false, "服务器内部错误");
    }
}

//新建标签页打开订单详情页面 或淘宝支付页面
function chrome_tabs_create_order_pay (urlx) {
  // body...
  chrome.tabs.create({url:urlx}, function(tab){
    chrome.storage.local.get("tabids",function(items){
      var xtabs = [];
      if (items == null || Object.keys(items).length == 0){
        // xtabs = [];
        xtabs = items["tabids"] = [];
        // console.log("tab_id:", tab.id);
        xtabs.push({"tabid":tab.id, "status":"open","tab_url":urlx});
        chrome.storage.local.set({"tabids":xtabs},function(){
          // console.log("shit");
        });
      } else {
        xtabs = items["tabids"];
        // console.log("tab_id:", tab.id);
        xtabs.push({"tabid":tab.id, "status":"open","tab_url":urlx});
        chrome.storage.local.set({"tabids":xtabs},function(){
          // console.log("shit");
        });
      }
    });
  });
}

//开始下一个订单支付
function next_order_pay(){
  make_page_index++;
  if (make_page_index < order_data.length) {
    var order = order_data[make_page_index];
    if (order.order_id && order.order_id.length > 0) {
      var urlx = taobao_order_pay_rul;
      if (order.order_type == 1) { //1688的打开订单详情页面
        urlx = order_detail_url;
      }
      urlx = urlx + order.order_id;
      chrome_tabs_create_order_pay(urlx);
    } else {
      // console.log("采购单:"+ order.purchase_order_id +"订单id还跟进！");
      chrome_tabs_create_order_pay("error_info.html?purchase_order_id="+order.purchase_order_id);
      next_order_pay();
    }
  } else {
    alert("待付款订单处理完毕");
  }
}

//关闭已支付的订单，并开始下一个订单支付
function remove_pay_complete_and_next_order_pay(tabId){
  console.log("关闭tab:"+tabId);
  chrome.tabs.remove(tabId, function(){
    next_order_pay();
  });
}

//post订单付款状态到SCM系统
function post_order_state_to_scm(order, order_state, tabId, message) {
  var data = {
    "purchase_order_id":order.purchase_order_id,
    "state":order_state,
    "message":message
  };
  httpPostRequest('http://scm.interfocus.org/external/batch_payment', data, function(state, scm_message){
    if (state) {
      console.log(state, "请求SCM订单付款状态POST成功！",data);
      if (order_state == state_pay_succeed || order_state == state_have_paid || order_state == state_not_order_id) {
        remove_pay_complete_and_next_order_pay(tabId); //订单支付成功或订单不存在，post state 给SCM系统。并关闭支付成功的订单页，开始进行下一个订单支付
      } else {
        next_order_pay();//订单金额不合法导致没有支付，post state 给SCM系统。并开始进行下一个订单支付（不自动关闭问题订单付款页）
      }
    }else{
      console.log(state, "请求SCM订单付款状态POST失败！！！",data);
      chrome_tabs_create_order_pay("error_info.html?order_id="+order.order_id+"&message="+escape(message)+"&state="+order_state+"&scm_message="+escape(scm_message));
      next_order_pay();
    }
  });
}

//监听插件输入密码页面发送过来的事件消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == "click_ali_pay_password") {
      alipay_password = request.ali_pay_password;
      if (alipay_password) {
        // 从SCM获取待付款的订单
        httpGetRequest('http://scm.interfocus.org/external/unpaid_payment', function (status, wait_pay_orders) {
          if (status) {
            //测试固定数据注释下面一行，修改顶部order_data
            order_data = wait_pay_orders;
            // console.log(wait_pay_orders);
            if (order_data.length <= 0) {
              alert("目前没有待付款的订单!");
              return;
            } else {
              make_page_index = 0;
              var order = order_data[make_page_index];
              if (order.order_id && order.order_id.length > 0) {
                var urlx = taobao_order_pay_rul;
                if (order.order_type == 1) { //1688的打开订单详情页面
                  urlx = order_detail_url;
                }
                urlx = urlx + order.order_id;
                chrome_tabs_create_order_pay(urlx);
              } else {
                // console.log("采购单:"+ order.purchase_order_id +"订单id还跟进！");
                chrome_tabs_create_order_pay("error_info.html?purchase_order_id="+order.purchase_order_id);
                next_order_pay();
              }
            };
          } else {
            alert("获取待付款订单失败！");
          }
        });
      } else {
          alert("请输入批量支付密码！");
      }
    } else if (response.type == "order_amount_illegal") {
      console.log("订单金额不合法");
    };
});

chrome.tabs.onUpdated.addListener(function(tabId , info) {
  console.log("chrome.tabs.onUpdated.addListener");
  if (info.status == "complete"){
    chrome.storage.local.get("tabids",function(items){
      // console.log(items);
      var xtabs = items['tabids'];
      var isTab = false;
      for (var i=0;i<xtabs.length;i++){
        if (xtabs[i]['tabid'] == tabId) {
          isTab = true;
          break;
        }
      }
      if (isTab) {
        chrome.tabs.get(tabId, function(tab){
          var stay_pay_order = order_data[make_page_index];
          if(tab.url.startsWith("https://trade.1688.com/order/new_step_order_detail.htm")){ //未付款订单详情页面

            chrome.tabs.executeScript(tab.id, {file: "js/click_pay.js"}, function(){
              chrome.tabs.sendMessage(tab.id, {
                  "type": "order_details", 
                  "order": stay_pay_order
              }, function(obj){
                  // console.log(obj);
                  if (obj && obj.type == "order_state" && obj.order_state_info) {
                    var pay_succeed_order = obj.order;
                    var message = obj.order_state_info;
                    if ( obj.order_state_info.indexOf("交易关闭") > 0) {
                      post_order_state_to_scm(pay_succeed_order, state_error, tab.id, message);
                    }else{
                      post_order_state_to_scm(pay_succeed_order, state_have_paid, tab.id, message);
                    }
                  }else if (obj && obj.type == "order_not_find" && obj.order_state_info) {
                    var not_find_order = obj.order;
                    var message = obj.order_state_info;
                    post_order_state_to_scm(not_find_order, state_not_order_id, tab.id, message);
                  }else if (obj && obj.type == "not_login_1688" && obj.order_state_info) {
                      alert("1688平台没有登录，请在新窗口登录1688平台，然后刷新当前订单详情页面程序可继续！");
                  };
              });
            });

          }else if (tab.url.startsWith("https://buyertrade.taobao.com/trade/pay.htm")) {

            chrome.tabs.executeScript(tab.id, {file: "js/taobao_trade_pay.js"}, function(){
              chrome.tabs.sendMessage(tab.id, {
                  "type": "taobao_order_pay", 
                  "order": stay_pay_order
              }, function(obj){
                  // console.log(obj);
                  if (obj && obj.type == "taobao_order_pay" && obj.feedback_page_text) {
                    var error_order = obj.order;
                    var message = obj.feedback_page_text;
                    post_order_state_to_scm(error_order, state_not_order_id, tab.id, message);
                  }
              });
            });
          }else if(tab.url.startsWith("https://cashierzui.alipay.com/standard/lightpay/lightPayCashier.htm")){ //个人支付宝支付页面
            //支付宝支付页面 https://cashierzui.alipay.com/standard/lightpay/lightPayCashier.htm
            
            chrome.tabs.executeScript(tab.id, {file: "js/AliPay.js"}, function(){
                chrome.tabs.sendMessage(tab.id, {
                  "type": "order_amount", 
                  "order": stay_pay_order,
                  "alipay_password": alipay_password
                }, function(obj){
                  // console.log(obj);
                  if (obj && obj.type && obj.type == "order_amount_illegal") {
                    var amount_illegal_order = obj.order;
                    var message = "订单金额不合法导致没有支付，SCM订单金额:"+amount_illegal_order.amount+";阿里平台订单金额:"+obj.order_real_amount;
                    post_order_state_to_scm(amount_illegal_order, state_amount_illegal, tab.id, message);
                  };
                });
            });           
          }else if(tab.url.startsWith("https://cashierew9.alipay.com/standard/lightpay/lightPayCashier.htm")){ //企业支付宝支付页面
            chrome.tabs.executeScript(tab.id, {file: "js/AliPay.js"}, function(){
                chrome.tabs.sendMessage(tab.id, {
                  "type": "order_amount", 
                  "order": stay_pay_order,
                  "alipay_password": alipay_password
                }, function(obj){
                  if (obj && obj.type && obj.type == "order_amount_illegal") {
                    var amount_illegal_order = obj.order;
                    var message = "订单金额不合法导致没有支付，SCM订单金额:"+amount_illegal_order.amount+";阿里平台订单金额:"+obj.order_real_amount;
                    post_order_state_to_scm(amount_illegal_order, state_amount_illegal, tab.id, message);
                  };
                });
            }); 
          }else if(tab.url.startsWith("https://trade.1688.com/order/unify_pay_success.htm")) { //1688已支付订单详情页面
            
            var message = "您已成功付款" + stay_pay_order.amount + "元";
            post_order_state_to_scm(stay_pay_order, state_pay_succeed, tab.id, message);
          }else if(tab.url.startsWith("https://trade.1688.com/order/trade_flow.htm")) { //1688报错页面

            post_order_state_to_scm(stay_pay_order, state_error, tab.id, "系统错误");
          }else if (tab.url.startsWith("https://buyertrade.taobao.com/trade/pay_success.htm")) {//淘宝支付成功页面。

            chrome.tabs.executeScript(tab.id, {file: "js/taobao_pay_success.js"}, function(){
                chrome.tabs.sendMessage(tab.id, {
                  "type": "taobao_pay_success", 
                  "order": stay_pay_order
                }, function(obj){
                  // console.log(obj);
                  if (obj && obj.type && obj.type == "taobao_pay_success" && obj.trade_info_status_text) {
                    var taobao_pay_success_order = obj.order;
                    if (obj.trade_info_status_text.indexOf("系统错误") > 0  ) {
                      var message = "订单在这之前已经付过款了,";
                      post_order_state_to_scm(taobao_pay_success_order, state_have_paid, tab.id, message);
                    } else {
                      var message = obj.trade_info_status_text;
                      post_order_state_to_scm(taobao_pay_success_order, state_pay_succeed, tab.id, message);
                    }
                  }
                });
            });   
          }else if (tab.url.startsWith("https://trade.taobao.com/trade/payError.htm")) { //淘宝报错页面

              chrome.tabs.executeScript(tab.id, {file: "js/taobao_trade_pay.js"}, function(){
              chrome.tabs.sendMessage(tab.id, {
                  "type": "taobao_order_pay", 
                  "order": stay_pay_order
              }, function(obj){
                  // console.log(obj);
                  if (obj && obj.type == "taobao_order_pay" && obj.feedback_page_text) {
                    var error_order = obj.order;
                    var message = obj.feedback_page_text;
                    if (message.indexOf("库存不足") > 0) {
                      post_order_state_to_scm(error_order, state_stockout, tab.id, message);
                    }else{
                      post_order_state_to_scm(error_order, state_error, tab.id, message);
                    }
                  }
              });
            });
          }else if (tab.url.startsWith("https://cashiergtj.alipay.com/standard/result/payResult.htm")) {//支付结果页面，出现抽奖广告，自动关闭广告继续任务
            console.log("天猫弹出广告页面，支付无法继续！寻找解决方案中。。。");
            // chrome.tabs.executeScript(tab.id, {file: "js/pay_result.js"}, function(){
                
            // });
          }else if (tab.url.startsWith("https://buy.tmall.com/order/paySuccess.htm")) {
            var message = "您已成功付款" + stay_pay_order.amount + "元-天猫订单";
            post_order_state_to_scm(stay_pay_order, state_pay_succeed, tab.id, message);
          };
        });
      }
    });
  }
});
