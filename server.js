const express = require("express");
const app = express();
const client = require("twilio")(
    'AC47b8db64be6b1b7675abb3259aecbfb8',
    '8c0f724fbadbfe876e727466cba9e7ea'
);

app.get("/", (req, res) => {
    res.status(200).send({
        message: "Server is running :D",
    });
});

app.get("/sendcode", (req, res) => {
    client.verify
        .services('VA99ee67ecdb589f8383486c5fbaaacb45') // Change service ID
        .verifications.create({
            to: `+${req.query.phonenumber}`,
            channel: req.query.channel === "call" ? "call" : "sms",
        })
        .then((data) => {
            res.status(200).send({
                message: "Verification is sent!!",
                phonenumber: req.query.phonenumber,
                data,
            });
        });

});
app.get("/verify", (req, res) => {
    client.verify
        .services('VA99ee67ecdb589f8383486c5fbaaacb45') // Change service ID
        .verificationChecks.create({
            to: `+${req.query.phonenumber}`,
            code: req.query.code,
        })
        .then((data) => {
            if (data.status === "approved") {
                res.status(200).send({
                    message: "User is Verified!!",
                    data,
                });
            } else {
                res.status(400).send({
                    message: "User is not Verified!!",
                    data,
                });
            }
        });
});

app.listen(5000, () => {
    console.log(`Server is running at port 5000`);
});


// var sid = 'AC47b8db64be6b1b7675abb3259aecbfb8'
// var auth_token = '8c0f724fbadbfe876e727466cba9e7ea'

// var twilio = require("twilio")(sid, auth_token);

// twilio.messages
//   .create({
//     from: "+13025641406",
//     to: "+918848659852",
//     body: "OTP from CAKESHOP",
//   })
//   .then(function(res) {console.log("message has sent!")})
//   .catch(function(err)  {
//     console.log(err);
//   });