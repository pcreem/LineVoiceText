'use strict';
const result = require('dotenv').config();
if (result.error) throw result.error

const linebot = require('linebot');
const Express = require('express');
const BodyParser = require('body-parser');

var imgur = require('imgur');
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID
var fs = require('fs');
var request = require('request');
var BufferHelper = require('bufferhelper');
var iconv = require('iconv-lite');
var md5 = require('md5');
var delayed = require('delayed');

// Line Channel info
const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LIEN_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const linebotParser = bot.parser();
const app = Express();
// for line webhook usage
app.post('/linewebhook', linebotParser);

app.use(BodyParser.urlencoded({ extended: true }));
app.use(BodyParser.json());

// a http endpoint for trigger broadcast
app.post('/broadcast', (req, res) => {
  bot.broadcast(req.body.message).then(() => {
    res.send('broadcast ok');
  }).catch(function (error) {
    res.send('broadcast fail');
  });
});

app.listen(3000);

//let linedata = ['農產品照片', '農產品名稱', '農產品描述', '農產品價格']
let linedata = []
// echo user message
bot.on('message', function (event) {
    console.log(event)

    event.source.profile().then(function (profile) {

      if (event.message.type == 'text') {
        let userstr = event.message.text.toLowerCase()

        if (isNaN(userstr)) {

          if (userstr.length <= 10) {
            console.log(userstr)
            switch (userstr) {
              case 'hi':
                event.reply(`hi ${profile.displayName}, 請上傳你的農產品照片`)
                break
              case 'hello':
                event.reply(`hello ${profile.displayName}, 請上傳你的農產品照片`)
                break
              case '賣完':
                event.reply(`hi ${profile.displayName}, 謝謝通知,會立刻停賣`)
                break
              case '不賣了':
                event.reply(`hi ${profile.displayName}, 謝謝通知,會立刻停賣`)
                break
              default:
                linedata[1] = userstr
                event.reply(`hi ${profile.displayName}, 收到農品名稱, 請輸入10到50字的農產品簡述`)
            }
          } else if (userstr.length > 10 && userstr.length <= 50) {
            linedata[2] = userstr
            event.reply(`收到產品描述, 請輸入價格`)
          } else {
            event.reply(`請打 0987-654-321 轉接客服人員`)
          }


        } else {
          linedata[3] = userstr
          event.reply(`收到價格,賣完或不賣了麻煩再通知我們(打 賣完 或 不賣了 都可)`)

        }


      } else if (event.message.type == 'image') {
        event.source.profile().then(function (profile) {
          event.message.content().then(function (content) {
            imgur.uploadBase64(content.toString('base64'))
              .then(function (json) {

                linedata[0] = json.data.link
                event.reply(`${profile.displayName} 謝謝,收到農產品照片. 接下來請輸入產品名稱(10個字內)`)
                event.reply({
                    "type": "image",
                    "originalContentUrl": json.data.link,
                    "previewImageUrl": json.data.link
                })
              })
              .catch(function (err) {
                console.error(err.message);
              });
          });
        });
      } else {

        event.message.content().then(function (content) {
          
          fs.writeFileSync('input.m4a', Buffer.from(content.toString('base64'), 'base64'));

          var ffmpeg = require('fluent-ffmpeg');

          function convertFileFormat(file, destination, error, progressing, finish) {

            ffmpeg(file)
              .on('error', (err) => {
                console.log('An error occurred: ' + err.message);
                if (error) {
                  error(err.message);
                }
              })
              .on('progress', (progress) => {
                // console.log(JSON.stringify(progress));
                console.log('Processing: ' + progress.targetSize + ' KB converted');
                if (progressing) {
                  progressing(progress.targetSize);
                }
              })
              .on('end', () => {
                console.log('converting format finished !');
                if (finish) {
                  finish();
                }
              })
              .save(destination);

          }

          convertFileFormat('input.m4a', 'output.wav', function (errorMessage) {

          }, null, function () {
            console.log("success");
          });


function SpeechApiSample() {

}

/**
 * Setup your authorization information to access OLAMI services.
 *
 * @param appKey the AppKey you got from OLAMI developer console.
 * @param appSecret the AppSecret you from OLAMI developer console.
 */
SpeechApiSample.prototype.setAuthorization = function (appKey, appSecret) {
  this.appKey = appKey;
  this.appSecret = appSecret;
}

/**
 * Setup localization to select service area, this is related to different
 * server URLs or languages, etc.
 *
 * @param apiBaseURL URL of the API service.
 */
SpeechApiSample.prototype.setLocalization = function (apiBaseURL) {
  this.apiBaseUrl = apiBaseURL;
}

/**
 * Send an audio file to speech recognition service.
 *
 * @param apiName the API name for 'api=xxx' HTTP parameter.
 * @param seqValue the value of 'seq' for 'seq=xxx' HTTP parameter.
 * @param finished TRUE to finish upload or FALSE to continue upload.
 * @param filePath the path of the audio file you want to upload.
 * @param compressed TRUE if the audio file is a Speex audio.
 */
SpeechApiSample.prototype.sendAudioFile = function (apiName, seqValue,
  finished, filePath, compressed, event) {
    
  var _this = this;

  // Read the input audio file
  fs.readFile(filePath, function (err, audioData) {
    if (err) {
      console.log(err);
      throw err;
    }

    var url = _this.getBaseQueryUrl(apiName, seqValue);
    url += '&compress=';
    url += compressed ? '1' : '0';
    url += '&stop=';
    url += finished ? '1' : '0';

    // Request speech recognition service by HTTP POST
    request.post({
      url: url,
      body: audioData,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Connection': 'Keep-Alive',
        'Content-Length': audioData.length
      }
    }, function (err, res, body) {
      if (err) {
        console.log(err);
        throw err;
      }
    }).on('response', function (response) {
      var body = "";
      response.on('data', function (data) {
        body += data;
      });
      response.on('end', function () {
        _this.cookies = response.headers['set-cookie'];
        console.log("\n----- Test Speech API, seq=nli,seg -----\n");
        console.log("\nSend audio file... \n");
        console.log('Result: ' + body);
        console.log('Cookie: ' + _this.cookies);

        delayed.delay(function () {
          _this.getRecognitionResult('asr', 'nli,seg', event);
        }, 500);
      });
    });
  });
}



/**
 * Get the speech recognition result for the audio you sent.
 *
 * @param apiName the API name for 'api=xxx' HTTP parameter.
 * @param seqValue the value of 'seq' for 'seq=xxx' HTTP parameter.
 */
SpeechApiSample.prototype.getRecognitionResult = function (apiName, seqValue, event) {
  var _this = this;
  var url = this.getBaseQueryUrl(apiName, seqValue);
  url += '&stop=1';
  // Request speech recognition service by HTTP GET
  request.get({
    url: url,
    headers: {
      'Cookie': this.cookies
    }
  }, function (err, res, body) {
    if (err) {
      console.log(err);
    }
  }).on('response', function (response) {
    var bufferhelper = new BufferHelper();
    response.on('data', function (chunk) {
      bufferhelper.concat(chunk);
    });

    response.on('end', function () {
      var body = iconv.decode(bufferhelper.toBuffer(), 'UTF-8');
      var result = JSON.parse(body);
      var return_status = result['data']['asr']['final'];
      // Try to get recognition result if uploaded successfully.
      // We just check the state by a lazy way :P , you should do it by JSON.
      if (return_status !== true) {
        console.log("\n----- Get Recognition Result -----\n");
        // Well, check by lazy way...again :P , do it by JSON please.
        delayed.delay(function () {
          _this.getRecognitionResult('asr', 'nli,seg', event);
        }, 500);
      } else {
        console.log("\n----- Get Recognition Result -----\n");
        console.log("Result:\n\n" + body);
        event.reply(`${result.data.asr.result}`)
      }
    });
  });
}


/**
 * Generate and get a basic HTTP query string
 *
 * @param apiName the API name for 'api=xxx' HTTP parameter.
 * @param seqValue the value of 'seq' for 'seq=xxx' HTTP parameter.
 */
SpeechApiSample.prototype.getBaseQueryUrl = function (apiName, seqValue) {
  var dateTime = Date.now();
  var timestamp = dateTime;

  var sign = '';
  sign += this.appSecret;
  sign += 'api=';
  sign += apiName;
  sign += 'appkey=';
  sign += this.appKey;
  sign += 'timestamp=';
  sign += timestamp;
  sign += this.appSecret;
  // Generate MD5 digest.
  sign = md5(sign);

  // Assemble all the HTTP parameters you want to send
  var url = '';
  url += this.apiBaseUrl + '?_from=nodejs';
  url += '&appkey=' + this.appKey;
  url += '&api=';
  url += apiName;
  url += '&timestamp=' + timestamp;
  url += '&sign=' + sign;
  url += '&seq=' + seqValue;

  return url;
}

var speechApi = new SpeechApiSample();
speechApi.setLocalization('https://tw.olami.ai/cloudservice/api');
speechApi.setAuthorization(process.env.AppKey, process.env.AppSecret);
// Start sending audio file for recognition

delayed.delay(() =>speechApi.sendAudioFile('asr', 'nli,seg', true, './output.wav', false, event), 500)

        }).catch(function (e) {
          console.error(e);
        })



      }

    //   if (linedata.length == 4) {
    //     Line.create({
    //       usersn: profile.userId,
    //       name: profile.displayName,
    //       image: linedata[0],
    //       farmname: linedata[1],
    //       description: linedata[2],
    //       price: linedata[3]
    //     })
    //     linedata = []
    //   }

    }) //profile括號
  });