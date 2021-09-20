var on = document.getElementById('lightOn');
var off = document.getElementById('lightOff');
//var red = document.getElementById('lightRed');
//var blue = document.getElementById('lightBlue');
//var green = document.getElementById('lightGreen');
var iR = document.getElementById('inputRed');
var iG = document.getElementById('inputGreen');
var iB = document.getElementById('inputBlue');

var colorBtn = document.getElementById('lightColor');
var plus = document.getElementById('lightPlus');
var minus = document.getElementById('lightMinus');
var socket = io();

var bright = 50;


function post_to_url(path, params, method) {
    method = "GET"; // Set method to post by default, if not specified.
    // The rest of this code assumes you are not using a library.
    // It can be made less wordy if you use one.
    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);
    for(var key in params) {
        var hiddenField = document.createElement("input");
        hiddenField.setAttribute("type", "hidden");
        hiddenField.setAttribute("name", key);
        hiddenField.setAttribute("value", params[key]);
        form.appendChild(hiddenField);
    }

    document.body.appendChild(form);
    form.submit();
}

function Request_Get_Yeelight(key, value)
{
    socket.emit(key,value);
    //post_to_url("http://localhost:4000/",{'id':key,'value':value});
}

on.onclick = ()=>{
    Request_Get_Yeelight('power','on');
} 

off.onclick = ()=>{
    Request_Get_Yeelight('power','off');
} 
colorBtn.onclick = ()=>{
    var color = iR.value+'.'+iG.value+'.'+iB.value;
    //console.log(color);
    Request_Get_Yeelight('color',color);
} 
// red.onclick = ()=>{
//     Request_Get_Yeelight('color',"255.0.0");
// } 

// blue.onclick = ()=>{
//     Request_Get_Yeelight('color',"0.0.255");
// } 

// green.onclick = ()=>{
//     Request_Get_Yeelight('color',"0.255.0");
// } 

plus.onclick = ()=>{
    if(bright+10 <= 100)
    {
        bright += 10;
    }
    Request_Get_Yeelight('bright',bright);
} 

minus.onclick = ()=>{
    if(bright-10 >= 0)
    {
        bright -= 10;
    }
    Request_Get_Yeelight('bright',bright);
} 


