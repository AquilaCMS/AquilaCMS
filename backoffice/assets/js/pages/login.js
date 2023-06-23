$(document).ready(function () {

    function hideError(){
        $("#error_msg_bad_login").hide();
        $("#error_msg_disable_account").hide();
        $("#api-error").hide();
        $("#resetPass").hide();
        $("#resetedPass").hide();
        $("#samePass").hide();
        $("#email-error").hide();
    }

    var url = window.location.href;
    var urlObject = new URL(url);
    async function testToken(){
        if(urlObject.searchParams.get("token")){
            document.getElementById('form1').style.display = "none";
            document.getElementById('form2').style.display = "none";
            document.getElementById('form3').style.display = "block";
            document.getElementById('passwordForgot').style.display = "none";
            try {
                const response = await $.post(window.location.origin + "/api/v2/user/resetpassword", {
                    token: urlObject.searchParams.get("token")
                });
                if(response.message === 'Token invalide'){
                    window.location.href = window.location.origin + window.location.pathname;
                }
            } catch (err) {
                $("#api-error").show();
            }
        }
    }
    testToken();


    $("#form1").submit(async function (e) {
        e.preventDefault();
        hideError();
        try {
            const response = await $.ajax({
                url: window.location.origin + "/api/v2/auth/login/admin",
                data: {
                    username: $("#field-email", this).val(),
                    password: $("#field-password", this).val()
                },
                type: 'post',
                beforeSend: function (jqXHR, settings) { jqXHR.setRequestHeader("lang", 'en') ;}
            });
            window.localStorage.setItem("jwtAdmin", response.data);
            window.localStorage.removeItem("pageAdmin");
            location.href = "/" + window.location.pathname.split("/")[1];
        } catch (err) {
            if (err.responseJSON.code === "DeactivateAccount"){
                $("#error_msg_disable_account").show();
            } else if (err.responseJSON.code === "Unauthorized") {
                $("#error_msg_bad_login").show();
            } else if (err.responseJSON.code === 'BadLogin') {
                $("#error_msg_bad_login").text(function() {return err.responseJSON.message});
                $("#error_msg_bad_login").show();
            } else {
                $("#api-error").show();
            }
        }
    });

    $("#form2").submit(async function (e) {
        e.preventDefault();
        hideError();
        try {
            const response = await $.post(window.location.origin + "/api/v2/user/resetpassword", {
                email: $("#field-email2", this).val()
            });
            document.getElementById('resetPass').innerHTML = "<strong>Email sent to " + $("#field-email2", this).val() + "</strong>";
            document.getElementById('resetPass').style.display = "block";
        } catch (err) {
            if(err.responseJSON){
                if(err.responseJSON.code && err.responseJSON.code == "NotFound"){
                    $("#email-error").show();
                }else{
                    $("#api-error").show();
                }
            }else{
                $("#api-error").show();
            }
        }
    });

    document.getElementById('passwordForgot').onclick = function(){
        let form1 = document.getElementById('form1');
        let form2 = document.getElementById('form2');
        if(form1.style.display == "none"){
            form2.style.display = "none";
            form1.style.display = "block";
            this.innerHTML = "Forgot your password? Reset your password";
        }else{
            form2.style.display = "block";
            form1.style.display = "none";
            this.innerHTML = "Remember your password? Connect now !";
        }
    }

    $("#form3").submit(async function (e) {
        e.preventDefault();
        hideError();
        const passwordValidator = new RegExp("^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{6,}$");
        if($("#new-password1", this).val() == $("#new-password2", this).val()){
            if(passwordValidator.test($("#new-password1", this).val())){
                try {
                    const response = await $.post(window.location.origin + "/api/v2/user/resetpassword", {
                        password: $("#new-password1", this).val() ,
                        token: urlObject.searchParams.get("token")
                    });
                    window.location.href = window.location.origin + window.location.pathname;
                } catch (err) {
                    $("#api-error").show();
                }
            }else{
                $("#resetedPass").show();
            }
        }else{
            $("#samePass").show();
        }
    });

});

