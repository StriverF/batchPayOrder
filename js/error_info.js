

function GetRequest() {   
    var url = location.search; //获取url中"?"符后的字串   
    var theRequest = new Object();   
    if (url.indexOf("?") != -1) {  
        var str = url.substr(1);   
        strs = str.split("&");   
        for(var i = 0; i < strs.length; i ++) {  
            theRequest[strs[i].split("=")[0]]=unescape(strs[i].split("=")[1]);   
        }   
    }   
    return theRequest;   
}   
var req = GetRequest();



var purchase_order_id = null;
if (req.hasOwnProperty("purchase_order_id")) {
    purchase_order_id = req["purchase_order_id"];
}

var order_id = null;
if (req.hasOwnProperty("order_id")) {
    order_id = req["order_id"];
    var message = req["message"];
    var state = req["state"];
    var scm_message = req["scm_message"];
}


if (purchase_order_id) {
    var pop_title = "采购单("+ purchase_order_id +")的订单id没有跟进";
    $(".pop-title").text(pop_title);
} else if(order_id) {
    var pop_title = "订单自动支付异常，post订单状态到SCM系统失败!";
    $(".pop-title").text(pop_title);
    // $(".error_content").html("sdfsdfsdfsf");
    var state_text = "订单支付成功";
    if (state == 2) {
        state_text = "阿里平台找不到该订单的存在";
    }else if(state == 3){
        state_text = "订单金额不匹配，导致没有支付";
    }else if (state == 4) {
        state_text = "订单支付失败";
    }else if (state == 5) {
        state_text = "订单之前已经支付过了";
    }
    $(".error_content p").html("<br>订单号："+order_id+"<br>订单支付状态："+state+"<br>订单支付返回的信息："+message+"<br>SCM API返回错误信息："+scm_message);
}









