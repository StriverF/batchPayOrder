


$("#batch_ali_pay").click(function(){
    var ali_pay_password = $("#ali_pay_password").val();
    $(".win-box").show();
    chrome.runtime.sendMessage({type: "click_ali_pay_password",ali_pay_password:ali_pay_password}, function(response) {
        console.log(response.farewell);
        $(".win-box").hide();
    });
});







