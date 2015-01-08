var express = require('express');
var querystring = require('querystring')
var request = require('request');
var colors = require('colors');
var ngrok = require('ngrok');
var bodyParser = require('body-parser');
var http = require('http');
var url = require('url');

var m = require('mraa'); //require mraa
console.log('MRAA Version: ' + m.getVersion()); //write the mraa version to the console

var myLed = new m.Gpio(6); //LED hooked up to digital pin 13 (or built in pin on Galileo Gen1 & Gen2)
myLed.dir(m.DIR_OUT); //set the gpio direction to output

var beacon = require('./node_modules/uri-beacon/uri-beacon');
var ngrok = require('ngrok');
var fs = require('fs');
var exec = require('child_process').exec;

//Load i2clcd module
var LCD = require('jsupm_i2clcd');
//Initialize Jhd1313m1 at 0x62 (RGB_ADDRESS) and 0x3E (LCD_ADDRESS)
var myLcd = new LCD.Jhd1313m1 (0, 0x3E, 0x62);

// command execute in shell bluetooth activate
var command1 = 'rfkill unblock bluetooth';
var command2 = 'hciconfig hci0 up';

exec(command1, function (error, stdout, stderr) {
  if (error) {
      console.log(error);
    }
    
});

exec(command2, function (error, stdout, stderr) {
  if (error) {
      console.log(error);
    }
    
});

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

var layout = fs.readFileSync('./layout.html', 'utf8');

myLcd.setCursor(0,0);
myLcd.write('                ');
myLcd.setCursor(0,0);
myLcd.write('Physical Web');
myLcd.setCursor(1,0);
myLcd.write('                ');
myLcd.setCursor(1,0);
myLcd.write('Intel Edison');

var app = express();
app.use(bodyParser());

app.get('/', function(req, res){
  res.end('Response will be available on console, nothing to look here!');
});

app.post('/', function(req, res){
    console.log('Received POST /'.bold);
    console.log(req.body);
    console.log('\n\n');

    // STEP 1: read POST data
    req.body = req.body || {};
    res.send(200, 'OK');
    res.end();

    // read the IPN message sent from PayPal and prepend 'cmd=_notify-validate'
    var postreq = 'cmd=_notify-validate';
    for (var key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            var value = querystring.escape(req.body[key]);
            postreq = postreq + "&" + key + "=" + value;
        }
    }

    // Step 2: POST IPN data back to PayPal to validate
    console.log('Posting back to paypal'.bold);
    console.log(postreq);
    console.log('\n\n');
    var options = {
        url: 'https://www.sandbox.paypal.com/cgi-bin/webscr',
        method: 'POST',
        headers: {
            'Connection': 'close'
        },
        body: postreq,
        strictSSL: true,
        rejectUnauthorized: false,
        requestCert: true,
        agent: false
    };

    request(options, function callback(error, response, body) {
      if (!error && response.statusCode === 200) {

        // inspect IPN validation result and act accordingly

        if (body.substring(0, 8) === 'VERIFIED'){
            // The IPN is verified, process it
            console.log('Verified IPN!'.green);
            console.log('\n\n');

            // assign posted variables to local variables
            var item_name = req.body['item_name'];
            var item_number = req.body['item_number'];
            var payment_status = req.body['payment_status'];
            var payment_amount = req.body['mc_gross'];
            var payment_currency = req.body['mc_currency'];
            var txn_id = req.body['txn_id'];
            var receiver_email = req.body['receiver_email'];
            var payer_email = req.body['payer_email'];

            //Lets check a variable
            console.log("Checking variable".bold);
            console.log("payment_status:", payment_status)
            console.log('\n\n');
            // IPN message values depend upon the type of notification sent.
            // To loop through the &_POST array and print the NV pairs to the screen:
            console.log('Printing all key-value pairs...'.bold)
            for (var key in req.body) {
                if (req.body.hasOwnProperty(key)) {
                    var value = req.body[key];
                    console.log(key + "=" + value);
                }

            myLcd.setCursor(0,0);
			myLcd.write('                ');
            myLcd.setCursor(0,0);
			myLcd.write('Tu Pago');
			myLcd.setCursor(1,0);
			myLcd.write('                ');
			myLcd.setCursor(1,0);
			myLcd.write('payment_status');

			if(payment_status == Completed){
				myLed.write(1);
            	sleep(1000);
            	myLed.write(0);
            }
            
            }


        } else if (body.substring(0, 7) === 'INVALID') {
            myLed.write(0);
            // IPN invalid, log for manual investigation
            console.log('Invalid IPN!'.error);
            console.log('\n\n');
            
            myLcd.setCursor(0,0);
			myLcd.write('                ');
            myLcd.setCursor(0,0);
			myLcd.write('Pago No Valido');
			myLcd.setCursor(1,0);
			myLcd.write('                ');
			myLcd.setCursor(1,0);
			myLcd.write('Error')
        }
      }
    });

});

app.listen(200);

http.createServer(function (req, res) {
  var command = url.parse(req.url).pathname.slice(1);
 
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(layout);

 
}).listen(8080);

ngrok.connect({
    authtoken: 'colocar aqui tu token de ngrok',
    subdomain: 'url perzonalizada',
    port: 200
}, function (err, url) {
        console.log(url.green);
        console.log('Ir a IPN Paypal');
        // https://757c1652.ngrok.com -> 127.0.0.1:200
});

ngrok.connect({
    authtoken: 'colocar aqui tu token de ngrok',
    subdomain: 'ur perzonalizada',
    port: 8080
}, function (err, url) {
        beacon.advertise(url);
        console.log(url.green);
        // https://757c1652.ngrok.com -> 127.0.0.1:200
});
