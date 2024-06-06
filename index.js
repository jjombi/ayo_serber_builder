const express = require('express')
const cors = require('cors');
const mysql = require('mysql');
const mariadb = require('mariadb');
const multer  = require('multer');
const body_parser = require("body-parser");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const saltRounds = 10;
const fs = require('fs');
const { title } = require('process');
const fileUpload = require('express-fileupload');
const { v4: uuidv4 } = require('uuid');
const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer'); // 모듈 import
const { resolve } = require('path');
require('dotenv').config()
const {generateToken, refreshToken, getRefrshToken, get_login} = require('./Jwt/Jwt');

const port = 45509;
const url = process.env.FRONT_REDIRECT_URL_SERVICE;
// const url = 'http://localhost:8080';
const app = express();
app.use(body_parser.json());
app.use(
  body_parser.urlencoded({
    extended: true,
  })
);
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());
app.use(cors({
  // origin : "https://ay0.netlify.app",
  origin : ["https://ay0.site","http://localhost:8080"],
  // origin: "https://jjombi.github.io",
  // origin : "http://localhost:8080", // 접근 권한을 부여하는 도메인 "http://localhost:3000"
  credentials : true, // 응답 헤더에 Access-Control-Allow-Credentials 추가
  // optionsSuccessStatus: 200, // 응답 상태 200으로 설정
  methods : '*',
}))
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-2'
});
const client = new S3Client(
  {
    region: 'ap-northeast-2',
    credentials : {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });





// /*-------------------------mysql 연결--------------------------*/// rds 
const {connection} = require('./Mysql/Mysql');
/////////////////////////////////////////////////////////////////////////

app.get('/',(req,res)=>{
  return res.send('connexted with server');
  
})

app.get('/signup/email_ckeck',(req,res)=>{
  
  const getter = req.query.email;
  const code = Math.random().toString(36).substr(2,5);

  const transporter = nodemailer.createTransport({
    service: 'gmail', // gmail을 사용함
    auth: {
      user: process.env.MY_MAIL, // 나의 (작성자) 이메일 주소
      pass: process.env.MY_MAIL_PASSWORD // 이메일의 비밀번호
    },
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
  });
  
  const mailOptions = {
    from: process.env.MY_MAIL, // 작성자
    to: getter, // 수신자
    subject: `예능 게임 이메일 확인 문자`, // 메일 제목
    text: `
      코드는 ${code} 입니다
    ` // 메일 내용
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
      return res.send(code)
    }
  });
})

app.post('/signup',(req,res)=>{
  const password = req.body.password;
  const email = req.body.email;
  const id = req.body.id;
  connection.query(`select * from user where email = '${email}'`,(err,result)=>{
    if(err) return res.send('select * from user where email 아이디 중복 채크 err : ');
    if(result.length !== 0){// 사용중인 이메일
      return res.send('사용중인 아이디입니다');
    }else{
      bcrypt.genSalt(saltRounds, function(err, salt) {
        if(err) console.log('genSalt err : ',err);
        bcrypt.hash(password, salt, function(err, hash) {
          console.log('hash password',id,email,hash);
            connection.query(`insert into user (id, email, password) value('${id}','${email}','${hash}');`,((err,result)=>{
              if(err) return res.send('insert into user (id, email, password) 회원가입 err : ');
              else{
                const email_ = email.replace('@','')  .split('.').join('');
                connection.query(`create table ${email_} (likes_queze varchar(36));`,(err,result)=>{
                  if(err) throw err;
                  else return res.send('회원가입 성공');
                })
              };
            }));
        });
      })
    }
  })
})

app.post('/login',(req,res)=>{
  const password = req.body.password;
  const email = req.body.email;

  connection.query(`select * from user where email = '${email}'`,(err,result)=>{
    if(err) return res.send('select user err');
    else if(result.length === 0){
      return res.send('email not exist');
    }else{
      bcrypt.compare(password, result[0].password, function(err, password_result) {
        if(!password_result) return(res.send('password not same'));
        else {
          const payload = {email};
          const tokens = get_login(payload);
          const res_data = {
            ...tokens,
            userId : result[0].id,
            userEmail : result[0].email
          }
          return(res.send(res_data));
        };
      });
    }
  })
})
// app.post('/password_checker',(req,res)=>{
//   console.log('password checker 시행됨');
//   connection.query(`select password from queze where uuid = '${req.body.uuid}'`,(err,passHash)=>{
//     bcrypt.compare(req.body.password, passHash[0].password, function(err, result) {
//       console.log('pass, 원본, 결과',req.body.password, passHash, passHash[0].password, result);
//       if(result) return(res.send(true))
//       else return(res.send(false))
//     });
//   })
// })
// app.post('/modify_password_checker',(req,res)=>{
//   console.log('modify_password_checker 시행됨');
//   connection.query(`select modifyPassword from queze where roomName = '${req.body.roomName}' && modifyPassword = '${req.body.password}'`,(err,result)=>{
//     if(result.length !== 0){
//       return res.send('success');
//     }
//     else return res.send('failed');
//   })
// })
app.post('/modify_quezeshowqueze_password_checker',(req,res)=>{
  console.log('modify_quezeshowqueze_password_checker 시행됨');
  connection.query(`select password from quezeshowqueze where uuid = '${req.body.uuid}' && password = '${req.body.password}'`,(err,result)=>{
    console.log(result);
    if(result.length !== 0){
      return res.send('success');
    }
    else return res.send('failed');
  })
})
app.get('/modify_get_img_i',(req,res)=>{// db img에 i 값 구하기
  const uuid = req.query.uuid;
  connection.query(`select * from quezeshowcontent where uuid = '${uuid}';`,(err,result)=>{
    // res.send(result.length);
    res.status(200).send((result.length).toString());
  })
})
app.get('/modify_get_content',(req,res)=>{// db 수정 content 가져오기
  const uuid = req.query.uuid;
  connection.query(`select * from quezeshowcontent where uuid = '${uuid}';`,(err,result)=>{
    // res.send(result.length);
    res.status(200).send((result));
  })
})
app.get('/modify_get_title_text',(req,res)=>{// db 수정 content 가져오기
  const uuid = req.query.uuid;
  connection.query(`select * from quezeshowqueze where uuid = '${uuid}';`,(err,result)=>{
    // res.send(result.length);
    res.status(200).send((result));
  })
})

// app.post('/modify_change_text',(req,res)=>{
//   const changed_text = req.body.changed_text;
//   const roomName = req.body.roomName;
//   console.log('modify_change_text req :',req);
//   changed_text.map((e,i)=>{
//     connection.query(`update result set text = '${changed_text.changed_text}' where uuid = '${changed_text.uuid}'`);
//   })
//   if(req.body.changed_title.type === true){
//     connection.query(`update queze set title = '${req.body.changed_title.data}' where roomName = '${roomName}'`)
//   }
//   if(req.body.changed_explain_text.type === true){
//     connection.query(`update queze set explainText = '${req.body.changed_explain_text.data}' where roomName = '${roomName}'`)
//   }
//   res.send('success');
// })
app.post('/modify_change_quezeshowqueze',(req,res)=>{
  const quezeshow_type = req.body.quezeshow_type;
  console.log(req.body);
  if(quezeshow_type === 'vote'){
    req.body.changed_data.map((e,i)=>{
      connection.query(`update quezeshowcontent set title = '${e.title}' where uuid2 = '${e.uuid}';`);
      connection.query(`update quezeshowcontent set text = '${e.text}' where uuid2 = '${e.uuid}';`);
    })
  }else if(quezeshow_type === 'Continue_speak' || quezeshow_type === 'New_word_queze'){
    req.body.changed_data.map((e,i)=>{
      connection.query(`update quezeshowcontent_text set title = '${e.title}' where uuid2 = '${e.uuid}';`);
      connection.query(`update quezeshowcontent_text set answer = '${e.answer}' where uuid2 = '${e.uuid}';`);
    })
  }else if(quezeshow_type === 'queze'){
    req.body.changed_data.map((e,i)=>{
      connection.query(`update quezeshowcontent_queze set title = '${e.title}', value1 = '${e.value1}', value2 = '${e.value2}', value3 = '${e.value3}', value4='${value4}, answer = '${answer}' where uuid2 = '${e.uuid}';`);
      //uuid, title, existence, img, text, uuid2, value1, value2, value3, value4, answer, roomnum
    })
  }

  return res.send('success');
})
// const upload_query = async (req, roomName_arr) =>{
//   console.log('upload query 시작 req : ',req.body,roomName_arr); //upload query 시작 req :  { title: '제목', publicAccess: '수정가능', img[...] text[...] } [ 'C' ] or { title: '제목', img[...] text[...] } -> publicAccess is undefind
//   const explain_text = req.body.queze_explain_text;
//   connection.query(`select * from queze where roomName = '${roomName_arr}';`,(err,result) => {
//     if(result.length === 0){
//       if(password === '' || password === undefined || password === null){
//         connection.query(`insert into queze (roomName, existence, title, title_img_name, uuid, likes, password, modifyPassword, explainText) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg', '${uuidv4()}',0, '', '${req.body.modify_password}', '${explain_text}');`);
//       }
//       else{
//         bcrypt.genSalt(saltRounds, function(err, salt) {
//           bcrypt.hash(password, salt, function(err, hash) {
//             console.log('hash password',hash);
//               connection.query(`insert into queze (roomName, existence, title, title_img_name, uuid, likes, password, modifyPassword, explainText) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg', '${uuidv4()}',0,'${hash}', '${req.body.modify_password}', '${explain_text}');`);
//           });
//         })
//       }
//       if(typeof(req.body.img_name) === 'string'){ // 이미지가 하나 일때
//         connection.query(`insert into result (text, value, originalname, roomName, uuid, existence) value('${req.body.text}', 0, 'img0.jpg','${roomName_arr}', 1, '${uuidv4()}')`);
//       }
//       else{                                       //이미지가 여러개 일때
//         for(i=0 ; i < req.body.img_name.length ;i++){// text에 값이 없을 때
//           if(req.body.text[i] === undefined || req.body.text[i] === '') connection.query(`insert into result (text, value, uuid, originalname, roomName, existence) value('', 0, '${uuidv4()}', 'img${i}.jpg','${roomName_arr}', 1)`);
//           else connection.query(`insert into result (text, value, uuid, originalname, roomName, existence) value('${req.body.text[i]}', 0, '${uuidv4()}', 'img${i}.jpg','${roomName_arr}', 1)`);
//         }
//       }
//     }
//   })    
// }


app.use(body_parser.urlencoded({ extended: true }));

// app.post('/upload_img',(req,res)=>{
//   console.log('upload img 시작',req.body,req.file); //req.files.img[0].name or data(type BUffer)
//   connection.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`,(err,result)=>{
//     if(result.length != 0){
//       let roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
//       if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
//       { 
//         roomName_arr.push(String.fromCharCode(65));
//         upload_query(req,roomName_arr);
//       }
//       else
//       { 
//         roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
//         upload_query(req,roomName_arr);     

//       }
//     }
//     else {
//       upload_query(req,'A');     
//     }     

//   })
//   return res.send('success');
  
// })
app.post('/modify_change_quezeshow',(req,res)=>{
  const img_tinyint = req.body.img_tinyint;
  const content_title = req.body.content_title;
  const explain_text = req.body.explain_text;
  const last_num = req.body.last_num;
  const uuid = req.body.uuid;
  const quezeshow_type = req.body.quezeshow_type;
  const room_num = req.body.room_num;
  console.log(img_tinyint,content_title,explain_text,last_num,uuid,room_num,'quezeshow_type :',quezeshow_type);
  if(quezeshow_type === 'vote'){
    if(typeof(content_title) === 'string'){// 수정 콘텐츠 하나
      if(img_tinyint){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title}', 1, '${Number(last_num)+1}.jpg', '${explain_text}', '${uuidv4()}',0, ${Number(room_num)})`);
      }
      else{
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title}', 1, '', '${explain_text}', '${uuidv4()}',0, ${Number(room_num)})`);
      }
    }else{
      content_title.map((e,i)=>{
        if(img_tinyint){
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title[i]}', 1, '${Number(last_num)+i+1}.jpg', '${explain_text[i]}', '${uuidv4()}',0, ${Number(room_num)})`);
        }
        else{
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title[i]}', 1, '', '${explain_text[i]}', '${uuidv4()}',0, ${Number(room_num)})`);
        }
      })
    }
  }else if(quezeshow_type === 'queze'){
    const value1 = req.body.value1;
    const value2 = req.body.value2;
    const value3 = req.body.value3;
    const value4 = req.body.value4;
    const answer = req.body.answer;
    if(typeof(content_title) === 'string'){// 수정 콘텐츠 하나
      if(img_tinyint){
        connection.query(`insert into quezeshowcontent_queze (uuid, title, existence, img, text, uuid2, value1, value2, value3, value4, answer, roomnum) value('${uuid}', '${content_title}', 1, '${Number(last_num)+1}.jpg', '${explain_text}', '${uuidv4()}', '${value1}', '${value2}', '${value3}', '${value4}', '${answer}', ${room_num})`);
      }
      else{
        connection.query(`insert into quezeshowcontent_queze (uuid, title, existence, img, text, uuid2, value1, value2, value3, value4, answer, roomnum) value('${uuid}', '${content_title}', 1, '', '${explain_text}', '${uuidv4()}', '${value1}', '${value2}', '${value3}', '${value4}', '${answer}', ${room_num})`);      }
    }else{
      img_tinyint.map((e,i)=>{
        if(img_tinyint){
          connection.query(`insert into quezeshowcontent_queze (uuid, title, existence, img, text, uuid2, value1, value2, value3, value4, answer, roomnum) value('${uuid}', '${content_title[i]}', 1, '${Number(last_num)+1+i}.jpg', '${explain_text[i]}', '${uuidv4()}', '${value1[i]}', '${value2[i]}', '${value3[i]}', '${value4[i]}', '${answer[i]}', ${room_num})`);        }
        else{
          connection.query(`insert into quezeshowcontent_queze (uuid, title, existence, img, text, uuid2, value1, value2, value3, value4, answer, roomnum) value('${uuid}', '${content_title[i]}', 1, '', '${explain_text[i]}', '${uuidv4()}', '${value1[i]}', '${value2[i]}', '${value3[i]}', '${value4[i]}', '${answer[i]}', ${room_num})`);        }
      })
    }
  }else if(quezeshow_type === 'Continue_speak' || quezeshow_type === 'New_word_queze'){
    const answer = req.body.answer;
    if(typeof(content_title) === 'string'){// 수정 콘텐츠 하나
      if(img_tinyint){
        connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title}', 1, '${uuidv4()}', ${room_num}, '${answer}', '${Number(last_num)+1}.jpg')`);
        }
      else{
        connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title}', 1, '${uuidv4()}', ${room_num}, '${answer}', '')`);
      }
    }else{
      img_tinyint.map((e,i)=>{
        if(img_tinyint){
          connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title[i]}', 1, '${uuidv4()}', ${room_num}, '${answer[i]}', '${Number(last_num)+1+i}.jpg')`);
        }
        else{
          connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title[i]}', 1, '${uuidv4()}', ${room_num}, '${answer[i]}', '')`);
        }
      })
    }
  }else{
    console.log('quezeshow_type err');
  }
  return res.send('success');
})

app.post('/upload_img_plus',(req,res)=>{
  const roomName = req.body.roomName;
  const last_num = req.body.last_num;
  console.log('upload img plus 시작',req.body,typeof(req.body.text));
  if(typeof(req.body.text) !== "string"){ // 배열일 경우 이미지가 여러개 일 때
    console.log('typeof(req.body.text) !== "string"');
    for(i=0 ; i < req.body.img_name.length ;i++){
      console.log(i);
      if(req.body.text[i] === undefined || req.body.text[i] === '') connection.query(`insert into result (text, value, uuid, originalname, roomName) value('', 0, '${uuidv4()}', 'img${last_num+i+1}.jpg','${roomName}')`);
      else connection.query(`insert into result (text, value, uuid, originalname, roomName) value('${req.body.text[i]}', 0, '${uuidv4()}', 'img${Number(last_num)+i+1}.jpg','${roomName}')`);
    }
  }else{
    console.log('type str');
    if(req.body.text === undefined || req.body.text === '') connection.query(`insert into result (text, value, uuid, originalname, roomName) value('', 0, '${uuidv4()}', 'img${last_num+1}.jpg','${roomName}')`);
    else connection.query(`insert into result (text, value, uuid, originalname, roomName) value('${req.body.text}', 0, '${uuidv4()}', 'img${(Number(last_num)+1)}.jpg','${roomName}')`);
  }
  return res.send('success');
})
// existence 존재 
app.get('/selectroomname',(req,res)=>{
  let roomName;
  connection.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`,(err,result)=>{
    if(result.length != 0){
      let roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
      if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
      { 
        roomName_arr.push(String.fromCharCode(65));
        roomName = roomName_arr.join('');
      }
      else
      { 
        roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
        roomName = roomName_arr.join('');
      }
    }else roomName = 'A';
    console.log('roomName',roomName);
    // return res.redirect(url+'/ayoworldrank');   
    return res.send(roomName);  
  })  

})
//-------------------------------------------------------------------
app.get('/main_select_queze',async (req,res)=>{ //이상형 월드컵 
  console.log('main_select_queze 실행 됨');
  let base64_img_arr = [];

    connection.query(`select * from queze where existence = 1`,async (err,result)=>{
      console.log(result);
      if(result.length !== 0){
        console.log('????');
        await Promise.all(
          result.map(async(e,i)=>{
            console.log(e.roomName+"/"+e.title_img_name,i);
            const  command = new GetObjectCommand({
              Bucket: "dlworjs",
              Key: e.roomName+"/"+e.title_img_name,
            });
            const response = await client.send(command);
            const response_body = await response.Body.transformToByteArray();
            const img_src = (Buffer.from(response_body).toString('base64'));
            base64_img_arr[i] = [img_src];
          })
        ).then(()=>{
          console.log('res send');
          return res.set({ "Content-Type": 'mulipart/form-data'}).send({result : result, base64_img_arr : base64_img_arr });

        })
      }else {
        console.log('err');
        return res.send(false);
      } 

    });
  
})



app.post('/main_a_queze',(req,res)=>{
  const roomName = req.body.roomName;
  let   text_arr = [];
  let   img_arr  = [];
  let   uuid_arr = [];
  // let   sendresult = [];
    connection.query(`select * from result where roomName='${roomName}' && existence = 1`,(err,result)=>{
      console.log('select from result whee roomName=',roomName,result);
      Promise.all(result.map(async(e,i)=>{
        console.log('result 이미지 경로',roomName+e.originalname);
        const  command = new GetObjectCommand({
          Bucket: "dlworjs",
          Key: roomName+'/'+e.originalname,
        });
        const response = await client.send(command);
        const response_body = await response.Body.transformToByteArray();
        const img_src = (Buffer.from(response_body).toString('base64'));

        // sendresult = {text : e.text}];
        text_arr[i] = e.text;
        uuid_arr[i] = e.uuid;
        img_arr[i] = img_src;
      })).then(()=>{
        console.log('text_arr',text_arr,img_arr); // text arr [queze_length,text1,text2,text3]
        return res.send({text : text_arr, img : img_arr, uuid : uuid_arr});
      })  
    })
  


})
app.post('/oneandoneresult',(req,res)=>{
  const rank = req.body.result;
  const roomName = req.body.roomName;
  connection.query(`select * from result where roomName = '${roomName}' && existence = 1`,(err,result)=>{
    console.log('selct uuid from result where roomName',result); //[ {uuid : 'asdadjshblaebgaubg' }, {uuid : 'asdadjshblaebgaubg' }, {uuid : 'asdadjshblaebgaubg' }]
    result.map(result_e=>{
      rank.map((res_e,i)=>{
        console.log('result 와 res_e 값 비교',result_e.uuid,res_e);
        if(result_e.uuid === res_e.uuid){
          connection.query(`update result set value = ${Number(result_e.value) + Number(res_e.point)} where uuid = '${[res_e.uuid]}'`);
        }
      })
    })
    return res.send('succcess');
  })
})
app.post('/oneandonequeze',(req,res)=>{
  const roomName = req.body.roomName;
  const type = req.body.type;
  // const num = [2,4,8,16,32,64,128,256];
  // let comparisontype = 512;
  // let type;
  // if(req.body.type !== 2 || req.body.type !== 4 || req.body.type !== 8 || req.body.type !== 16 || req.body.type !== 32 || req.body.type !== 64 || req.body.type !== 128 || req.body.type !== 2256){
  //   num.map((e,i)=>{
  //     if(Math.abs(req.body.type - e) < comparisontype && Math.sign(e - req.body.type) === -1){//1,1,5,13,60,125,153 ,,, 298,296,
  //       comparisontype = Math.abs(req.body.type - e);// com 5 3 
  //       type = e;
  //     }
  //   })
  // }
  // else{
  //   type = req.body.type;
  // }
  // const type = req.body.type; // req.body.type이 2,4,8,16,32,64,128,256,512 등이 아니면 가장 가까운 작은수 로 type 바꾸기 ex req.bo.typ = 12 , type = 8
  let   text_arr = [];
  let   img_arr  = [];
  let   uuid_arr = [];  console.log('one and one; roomName, type',roomName,type);
  connection.query(`select * from result where roomName='${roomName}' && existence = 1 order by value desc limit ${type}`,(err,result)=>{
    console.log('one and one queze roomName, result',roomName,result);
    Promise.all(result.map(async(e,i)=>{
      console.log('result 이미지 경로',roomName+e.originalname);
      const  command = new GetObjectCommand({
        Bucket: "dlworjs",
        Key: roomName+'/'+e.originalname,
      });
      const response = await client.send(command);
      const response_body = await response.Body.transformToByteArray();
      const img_src = (Buffer.from(response_body).toString('base64'));

      // sendresult = {text : e.text}];
      console.log('e.text, e.uuid, img_src',e.text, e.uuid, img_src);
      text_arr[i] = e.text;
      uuid_arr[i] = e.uuid;
      img_arr[i] = img_src;
      })).then(()=>{
      console.log('one and one 다끝난 후   data : ',{text : text_arr, img : img_arr, uuid : uuid_arr}); // text arr [queze_length,text1,text2,text3]
      return res.send({text : text_arr, img : img_arr, uuid : uuid_arr});
    })  
  })
})
app.post('/main_a_queze_comments',(req,res)=>{ // url 파라미터로 roomName 가져오게 바꾸기

    connection.query(`select * from comments where type = 1 && roomName = '${req.body.roomName}'`,(err,result)=>{
      console.log('queze 안에 comments all',result);
      // if()
      return res.send(result);
    })
    
})
app.post('/main_a_queze_children_comments',(req,res)=>{
  connection.query(`select * from ${req.body.roomName}_comments where parent_room_num = ${req.body.parent_room_num} && type = 0 order by likes desc`,(err,result)=>{
    return res.send(result);
  })  
  
})
app.post('/main_a_queze_plus_comments',(req,res)=>{
    // 부모일때
    console.log('댓 추가 req.body',req.body);
    const roomName = req.body.roomName;
    const type = req.body.type;
    const value = req.body.value;
    if(type === 1){
      connection.query(`insert into comments (value,parentsKey,likes,type,roomName) value('${value}','${uuidv4()}',0,1,'${roomName}')`,()=>{
        return res.send('success'); //url+`/result?roomName=${roomName}`
      })
    }
    else{
      return res.send('err');
    }
  
})
app.post('/likes_plus',(req,res)=>{
  console.log('comment likes plus');
  const type = req.body.type;
  const uuid = req.body.uuid;
  const user_email = req.body.user_email;
  console.log('likes_plus',uuid,type)
  if(type === 'comments')   connection.query(`update comments set likes = likes + 1 where parentsKey = '${uuid}' `);
  else if(type === 'Main_queze') connection.query(`update queze set likes = likes + 1 where uuid = '${uuid}' `);
  else if(type === 'quezeshow') {
    connection.query(`update quezeshowqueze set likes = likes + 1 where uuid = '${uuid}' `);
    if(user_email !== null || user_email !== ''){
      connection.query(`insert into ${user_email} (likes_queze) value ('${uuid}')`);
    }
  }
  return res.send('success');
})
app.post('/likes_minus',(req,res)=>{
  console.log('comment likes minus');
  const uuid = req.body.uuid;
  const type = req.body.type;
  const user_email = req.body.user_email;

  console.log('likes_minus',uuid,type)
  if(type === 'comments')   connection.query(`update comments set likes = likes - 1 where parentsKey = '${uuid}' `);
  else if(type === 'Main_queze')  connection.query(`update queze set likes = likes - 1 where uuid = '${uuid}' `);
  else if(type === 'quezeshow') {
    if(user_email !== null || user_email !== ''){
      connection.query(`delete from ${user_email} where likes_queze = '${uuid}'`);
    }
    connection.query(`update quezeshowqueze set likes = likes - 1 where uuid = '${uuid}' `);
  }
  return res.send('success');
})
app.post('/result_plus',(req,res)=>{
  console.log('값 올리기 post req : ',req.body);
  const roomName = req.body.roomName;
  const rank = req.body.rank; 
  // [uuid,uuid,uuid]
  // [ 1등, 2등, 3등]
  connection.query(`select * from result where roomName = '${roomName}' && existence = 1`,(err,result)=>{
    console.log('selct uuid from result where roomName',result); //[ {uuid : 'asdadjshblaebgaubg' }, {uuid : 'asdadjshblaebgaubg' }, {uuid : 'asdadjshblaebgaubg' }]
    result.map(result_e=>{
      rank.map((res_e,i)=>{
        console.log('result 와 res_e 값 비교',result_e.uuid,res_e);
        if(result_e.uuid === res_e){
          connection.query(`update result set value = ${Number(result_e.value) + rank.length-i} where uuid = '${[res_e]}'`);
        }
      })
    })
  })
  return( res.send('success'));
  

})
app.post('/main_result',(req,res)=>{
  const roomName = req.body.roomName;
  let send_ = [];

  connection.query(`select * from result where roomName = '${roomName}' && existence = 1 order by value desc;`,(err,result)=>{
    console.log(result);
    if(result.length !== 0){
      Promise.all(result.map(async(e,i)=>{
        const  command = new GetObjectCommand({
          Bucket: "dlworjs",
          Key: roomName+'/'+e.originalname,
        });
        const response = await client.send(command);
        const response_body = await response.Body.transformToByteArray();
        const img_src = (Buffer.from(response_body).toString('base64'));
        send_[i] ={
          img : img_src,
          text : e.text,
          value : e.value
        }
        console.log('send message 만들어 자는 중 ');
      })).then(()=>{
        console.log('res send',send_);
        return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
      })
    }
  })
  
})
{/*
  choice uuid1(quezeshowcontent_???.uuid) uuid2,text varchar(60)
    `insert into choice (uuid1, uuid2, answer, text) value('${uuid}','${uuidv4()}',${Number(answer)},'${choice}')`
*/}
const make_quezeshow_query_type_multiple = (uuid,content_object,result_roomnum,choice,correct_choice) => {
  console.log('make_quezeshow_query_type_multiple',uuid,content_object,result_roomnum,choice,correct_choice);
  content_object.map((e,i)=>{
    const uuid2 = uuidv4();
    connection.query(`insert into correct_choice (uuid, correct_choice) value('${uuid2}', '${correct_choice[i]}')`)
    choice[i].map((e,i)=>{
      connection.query(`insert into choice (uuid, choice) value('${uuid2}','${e}')`);
    })
    if(e.data_type === 'image'){
      if(e.img === 'false'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
      }else if(e.img = 'true'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${i}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
      }
    }else if(e.data_type === 'video'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
        connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
      })
    }else if(e.data_type === 'audio'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
        connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
      })
    }else if(e.data_type === 'text'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
      })
    }
  })
  
}
const make_quezeshow_query_type_vote = (uuid,content_object,result_roomnum) => {
    console.log('make_quezeshow_query_type_vote',uuid,content_object,result_roomnum);
    content_object.map((e,i)=>{
      const uuid2 = uuidv4();
      if(e.data_type === 'image'){
        if(e.img === 'false'){
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
        }else if(e.img = 'true'){
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${i}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
        }
      }else if(e.data_type === 'video'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
          connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
        })
      }else if(e.data_type === 'audio'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
          connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
        })
      }else if(e.data_type === 'text'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
        })
      }
    })
}
const make_quezeshow_query_type_descriptive = (uuid,content_object,result_roomnum,correct_choice) => {
  console.log('make_quezeshow_query_type_descriptive',uuid,content_object,result_roomnum,correct_choice);
  content_object.map((e,i)=>{
    const uuid2 = uuidv4();
    correct_choice[i].map((ev,i)=>{
      connection.query(`insert into correct_choice (uuid, correct_choice) value('${uuid2}', '${ev}')`)
    })
    if(e.data_type === 'image'){
      if(e.img === 'false'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
      }else if(e.img = 'true'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${i}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
      }
    }else if(e.data_type === 'video'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
        connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
      })
    }else if(e.data_type === 'audio'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
        connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
      })
    }else if(e.data_type === 'text'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
      })
    }
  })
}
// const make_quezeshow_query_type_continue_speaking = (uuid,content_title,result_roomnum,answer,img_tinyint) => {
//   if(typeof(content_title) === 'string'){ // content 하나 일때
//     console.log('make quezeshow type continue speaking 선택지 하나만 들어옴');
//     if(img_tinyint === 'true'){
//       connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title}', 1, '${uuidv4()}', ${result_roomnum + 1}, '${answer}', '0.jpg')`,(err,result)=>{
//         if(err){
//           throw err
//         }
//       })  
//     }else{
//       connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title}', 1, '${uuidv4()}', ${result_roomnum + 1}, '${answer}', '')`,(err,result)=>{
//         if(err){
//           throw err
//         }
//       })  
//     }
//   }
//   else{
//     console.log('make quezeshow continue speaking 선택지 여러개');
//     content_title.map((e,i)=>{
//       if(img_tinyint === 'true'){
//         connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title[i]}', 1, '${uuidv4()}', ${result_roomnum + 1}, '${answer[i]}', '${i}'.jpg)`,(err,result)=>{
//           if(err){
//             throw err
//           }
//         })
//       }else {
//         connection.query(`insert into quezeshowcontent_text (uuid, title, existence, uuid2, roomnum, answer, img) value('${uuid}', '${content_title[i]}', 1, '${uuidv4()}', ${result_roomnum + 1}, '${answer[i]}', '')`,(err,result)=>{
//           if(err){
//             throw err
//           }
//         })
//       }
      
      
//     })
//   }
// }
app.post('/make_quezeshow',(req,res)=>{ //퀴즈 문제 만들기
  // quezeshow_type       : quezeshow_type_clicked_btn,
  // password             : password,
  // uuid                 : password,
  // queze_title          : queze_title_ref.current.value,
  // queze_explain_text   : queze_explain_text_ref.current.value,
  // content_object       : content_object_, //콘텐츠 제못, 설명, 이미지 판별
  // choice               : choice,
  // correct_choice       : correct_choice,
  // time                 : time_ref.current.value,
  // main_img_tinyint     : main_img_tinyint,
  // user_id              : user_id_ref.current.value,
  // date                 : Date.now(),
  // tag                  : tag_arr
  // return {data_type : e.data_type, src : e.src, title : e.title, text : e.text, answer : e.answer,start : e.start, end : e.end}
  // return {data_type: e.data_type, title : e.title, text : e.text, img : true}

  const quezeshow_type = req.body.quezeshow_type;
  const password = req.body.password;
  const uuid = req.body.uuid;
  const queze_title = req.body.queze_title;
  const queze_explain_text = req.body.queze_explain_text;
  const content_object = req.body.content_object;
  const choice = req.body.choice;
  const correct_choice = req.body.correct_choice;
  const time = req.body.time;
  const main_img_tinyint = req.body.main_img_tinyint;
  const user_id = req.body.user_id;
  const date = req.body.date;
  const tag = req.body.tag.join(',');
  let result_roomnum;
  console.log('quezeshow_type',quezeshow_type,'queze_title',queze_title,'queze_explain_text',queze_explain_text,'uuid',uuid,'date',date,'modify_password',password,'content_object',content_object,'choice',choice,'correct_choice',correct_choice,'time',time,'main_img_tinyint',main_img_tinyint,typeof(main_img_tinyint),'user_id',user_id,'date',date,'tag',tag);
  connection.query(`select roomnum from quezeshowqueze order by roomnum desc limit 1`,(err,result)=>{
    console.log(result);
    if(result.length === 0){
      result_roomnum = 0;
    }
    else{
      result_roomnum = result[0].roomnum;
    }

    if(main_img_tinyint){
      console.log('섬네일 있음')
      connection.query(`insert into quezeshowqueze (title, existence, uuid, date, likes, img, roomnum, explainText, quezeshow_type, password, user_id, time, tag) value('${queze_title}', 1, '${uuid}', ${date}, 0, 'main_img.jpg', ${result_roomnum + 1}, '${queze_explain_text}', '${quezeshow_type}', '${password}', '${user_id}', ${time}, '${tag}')`,(err,result)=>{
        console.log('insert quezeshowqueze',err,result);
      })
    }else{
      console.log('섬네일 없음')
      connection.query(`insert into quezeshowqueze (title, existence, uuid, date, likes, img, roomnum, explainText, quezeshow_type, password, user_id, time, tag) value('${queze_title}', 1, '${uuid}', ${date}, 0, '', ${result_roomnum + 1}, '${queze_explain_text}', '${quezeshow_type}', '${password}', '${user_id}', ${time}, '${tag}')`,(err,result)=>{
        console.log('insert quezeshowqueze',err,result);
      })
    }

    content_object.map((e,i)=>{
      const uuid2 = uuidv4();
      if(quezeshow_type === 'multiple'){// queze type 문제 생성 
        connection.query(`insert into correct_choice (uuid, correct_choice) value('${uuid2}', '${correct_choice[i]}')`)
        choice[i].map((e,i)=>{
          connection.query(`insert into choice (uuid, choice) value('${uuid2}','${e}')`);
        })      }
      else if(quezeshow_type === 'descriptive'){
        correct_choice[i].map((ev,i)=>{
          connection.query(`insert into correct_choice (uuid, correct_choice) value('${uuid2}', '${ev}')`)
        })
      }
      
      if(e.data_type === 'image'){
        if(e.img === 'false'){
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type, hint) value('${uuid}', '${e.title}', 1, '', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}', '${e.hint}')`,(err,result)=>{console.log(err,result)})
        }else if(e.img = 'true'){
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type, hint) value('${uuid}', '${e.title}', 1, '${i}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}', '${e.hint}')`,(err,result)=>{console.log(err,result)})
        }
      }else if(e.data_type === 'video'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type, hint) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}', '${e.hint}')`,(err,result)=>{console.log(err,result)
          connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
        })
      }else if(e.data_type === 'audio'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type, hint) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}', '${e.hint}')`,(err,result)=>{console.log(err,result)
          connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
        })
      }else if(e.data_type === 'text'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type, hint) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${result_roomnum + 1}, '${e.data_type}', '${e.hint}')`,(err,result)=>{console.log(err,result)
        }) 
      }
    })    

  });
  return res.send('success');
  
})
app.post('/add_quezeshowcontent',(req,res)=>{
//   uuid                 : uuid,
//   content_object       : content_object_, //콘텐츠 제못, 설명, 이미지 판별
//   choice               : choice,
//   correct_choice       : correct_choice,
//   date                 : Date.now(),
//   modify_last_img_i    : modify_last_img_i,
//   quezeshow_type       : quezeshow_type,
//   room_num             : room_num 
  const uuid = req.body.uuid;
  const content_object = req.body.content_object;
  const choice = req.body.choice;
  const correct_choice = req.body.correct_choice;
  const date = req.body.date;
  const modify_last_img_i = req.body.modify_last_img_i;
  const quezeshow_type = req.body.quezeshow_type;
  const room_num = req.body.room_num;
  content_object.map((e,i)=>{
    const uuid2 = uuidv4();
    if(quezeshow_type === 'multiple'){// queze type 문제 생성 
      connection.query(`insert into correct_choice (uuid, correct_choice) value('${uuid2}', '${correct_choice[i]}')`)
      choice[i].map((e,i)=>{
        connection.query(`insert into choice (uuid, choice) value('${uuid2}','${e}')`);
      })      }
    else if(quezeshow_type === 'descriptive'){
      correct_choice[i].map((ev,i)=>{
        connection.query(`insert into correct_choice (uuid, correct_choice) value('${uuid2}', '${ev}')`)
      })
    }
    
    if(e.data_type === 'image'){
      if(e.img === 'false'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '', '${e.text}', '${uuid2}',0, ${room_num}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
      }else if(e.img = 'true'){
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${modify_last_img_i+i+1}', '${e.text}', '${uuid2}',0, ${room_num}, '${e.data_type}')`,(err,result)=>{console.log(err,result)})
      }
    }else if(e.data_type === 'video'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${room_num}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
        connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
      })
    }else if(e.data_type === 'audio'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${room_num}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
        connection.query(`insert into youtube (uuid, start, end) value('${uuid2}', ${e.start}, ${e.end})`)
      })
    }else if(e.data_type === 'text'){
      connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum, data_type) value('${uuid}', '${e.title}', 1, '${e.src}', '${e.text}', '${uuid2}',0, ${room_num}, '${e.data_type}')`,(err,result)=>{console.log(err,result)
      })
    }
  })   
  return res.send('success');
})
const search_query_func = (query,res) => {
  console.log('query',query);
  connection.query(query,(err,result)=>{
    console.log('result',result);
    Promise.all(result.map(async(e,i)=>{
      if(e.img !== ''){
        const  command = new GetObjectCommand({
          Bucket: "dlworjs",
          Key: e.uuid+'/main_img.jpg',
        });
        const response = await client.send(command);
        const response_body = await response.Body.transformToByteArray();
        const img_src = (Buffer.from(response_body).toString('base64'));
        send_[i] ={
          img : img_src,
          date : e.date,
          likes : e.likes,
          title : e.title,
          uuid : e.uuid,
          roomnum : e.roomnum,
          quezeshow_type : e.quezeshow_type,
          explain_text : e.explainText,
          likes_queze : e.likes_queze !== null && e.likes_queze !== undefined ? true : false
        }
        console.log('send message 만들어 자는 중 ');
      }
      else{
        send_[i] ={
          img : '',
          date : e.date,
          likes : e.likes,
          title : e.title,
          uuid : e.uuid,
          roomnum : e.roomnum,
          quezeshow_type : e.quezeshow_type,
          explain_text : e.explainText,
          likes_queze : e.likes_queze !== null && e.likes_queze !== undefined ? true : false
        }
      }
    })).then(()=>{
      console.log('res send',send_);
      return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
    })
  })
}
app.get('/search_quezeshow',async (req,res)=>{
  // console.log(req);
  // let base64_img_arr = [];
  let send_ = [];
  const type = req.query.type; // 0 = 최신, 1 = 인기, 2 = 테그, 3 = 이메일
  const search_value = req.query.value;
  const email = req.query.email;
  const tag = req.query.tag;
  const user_email = req.query.user_email;
  if(typeof(user_email) === 'string'){
    console.log('로그인 유저',type);
    if(type == 4){
      search_query_func(`select * from quezeshowqueze left join ${user_email} on quezeshowqueze.existence = 1 && quezeshowqueze.title like "%${search_value}%" limit 20`,res);
    }
    else if(type == 0){
      search_query_func(`select * from quezeshowqueze left join ${user_email} on quezeshowqueze.existence = 1 order by quezeshowqueze.date desc limit 20`,res);
    }else if(type == 1){
      search_query_func(`select * from quezeshowqueze left join ${user_email} on quezeshowqueze.existence = 1 order by quezeshowqueze.likes desc limit 20`,res);
    }else if(type == 2){
      search_query_func(`select * from quezeshowqueze left join ${user_email} on quezeshowqueze.existence = 1 && quezeshowqueze.tag like "%${tag}%" limit 20`,res);
    }else if(type == 3){
      search_query_func(`select * from quezeshowqueze left join ${user_email} on quezeshowqueze.existence = 1 && quezeshowqueze.user_id = "${email}" limit 20`,res);
    }else{
      console.log('search err');
    }
  }else{
    console.log('비로그인 유저',type);
    if(type == 4){
      search_query_func(`select * from quezeshowqueze where existence = 1 && title like "%${search_value}%" limit 20`,res);
    }
    else if(type == 0){
      search_query_func(`select * from quezeshowqueze where existence = 1 order by date desc limit 20`,res);
    }else if(type == 1){
      search_query_func(`select * from quezeshowqueze where existence = 1 order by likes desc limit 20`,res);
    }else if(type == 2){
      search_query_func(`select * from quezeshowqueze where existence = 1 && tag like "%${tag}%" limit 20`,res);
    }else if(type == 3){
      search_query_func(`select * from quezeshowqueze where existence = 1 && user_id = "${email}" limit 20`,res);
    }else{
      console.log('search err');
    }
  }
})
app.get('/declaration',(req,res)=>{
  const roomnum = req.query.roomnum;
  const type    = req.query.type;
  const resaion = req.query.resaion;
  const transporter = nodemailer.createTransport({
    service: 'gmail', // gmail을 사용함
    auth: {
      user: process.env.MY_MAIL, // 나의 (작성자) 이메일 주소
      pass: process.env.MY_MAIL_PASSWORD // 이메일의 비밀번호
    },
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
  });
  
  const mailOptions = {
    from: process.env.MY_MAIL, // 작성자
    to: process.env.MY_MAIL, // 수신자
    subject: `declaration(roomnum:${roomnum})`, // 메일 제목
    text: `
      roomnum : ${roomnum}
      type    : ${type}
      reasion : ${resaion}
    ` // 메일 내용
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
  return res.send('success');
})
app.get('/quezeshow_main',(req,res)=>{
  const type = req.query.type;
  // const space_uuid = req.query.space_uuid; //undefind or uuid
  // const quezeshow_type = req.query.quezeshow_type;
  console.log(type,req.query,);
  let send_ = [];


    if(type === 'likes'){
      connection.query(`select * from quezeshowqueze where existence = 1 order by likes desc limit 20`,(err,result)=>{
        Promise.all(result.map(async(e,i)=>{
          if(e.img !== ''){
            const  command = new GetObjectCommand({
              Bucket: "dlworjs",
              Key: e.uuid+'/main_img.jpg',
            });
            const response = await client.send(command);
            const response_body = await response.Body.transformToByteArray();
            const img_src = (Buffer.from(response_body).toString('base64'));
            send_[i] ={
              img : img_src,
              date : e.date,
              likes : e.likes,
              title : e.title,
              uuid : e.uuid,
              roomnum : e.roomnum,
              quezeshow_type : e.quezeshow_type,
              explain_text : e.explainText

            }
            console.log('send message 만들어 자는 중 ');
          }
          else{
            send_[i] ={
              img : '',
              date : e.date,
              likes : e.likes,
              title : e.title,
              uuid : e.uuid,
              roomnum : e.roomnum,
              quezeshow_type : e.quezeshow_type,
              explain_text : e.explainText
            }
          }
        })).then(()=>{
          console.log('res send',send_);
          return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
        })
      })
    }
    // else if(type === 'date'){
    //   connection.query(`select * from quezeshowqueze where existence = 1 order by likes asc limit 20`,(err,result)=>{
    //     Promise.all(result.map(async(e,i)=>{
    //       const  command = new GetObjectCommand({
    //         Bucket: "dlworjs",
    //         Key: e.uuid+'/'+e.img,
    //       });
    //       const response = await client.send(command);
    //       const response_body = await response.Body.transformToByteArray();
    //       const img_src = (Buffer.from(response_body).toString('base64'));
    //       send_[i] ={
    //         img : img_src,
    //         date : e.date,
    //         likes : e.likes,
    //         title : e.title,
    //         uuid : e.uuid,
    //         roomnum : e.roomnum
    //       }
    //       console.log('send message 만들어 자는 중 ');
    //     })).then(()=>{
    //       console.log('res send',send_);
    //       return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
    //     })
    //   })
    // }
  // }
})
app.get('/quezeshowtitle',(req,res)=>{
  const roomnum = req.query.roomnum;
  let send_ = [];
  console.log(roomnum,)
  connection.query(`select * from quezeshowqueze where roomnum = ${roomnum}`,(err,result)=>{
    
    Promise.all(result.map(async(e,i)=>{
      if(e.img !== ''){
        // const  command = new GetObjectCommand({
        //   Bucket: "dlworjs",
        //   Key: e.uuid+'/'+e.img,
        // });
        // const response = await client.send(command);
        // const response_body = await response.Body.transformToByteArray();
        // const img_src = (Buffer.from(response_body).toString('base64'));

      const s3 = new AWS.S3();
      const params = {
          Bucket: 'dlworjs',
          Key: e.uuid+'/main_img.jpg', // Replace with the key of your image in S3
      };  
    
      const imageUrl = await s3.getSignedUrlPromise('getObject', params);
      console.log(imageUrl);
        send_[i] ={
          img : imageUrl,
          date : e.date,
          likes : e.likes,
          title : e.title,
          uuid : e.uuid,
          roomnum : e.roomnum,
          quezeshow_type : e.quezeshow_type,
          explain_text : e.explainText

        }
        console.log('send message 만들어 자는 중 ');
      }
      else{
        send_[i] ={
          img : '',
          date : e.date,
          likes : e.likes,
          title : e.title,
          uuid : e.uuid,
          roomnum : e.roomnum,
          quezeshow_type : e.quezeshow_type,
          explain_text : e.explainText
        }
      }
    })).then(()=>{
      console.log('res send',send_);
      return res.set({ "Content-Type": 'image/jpeg'}).send(send_);  
    })
  })
})
app.get('/quezeshow_checking_existence',(req,res)=>{
  const roomnum = req.query.roomnum;
  const uuid = req.query.uuid;
  connection.query(`select * from quezeshowqueze where roomnum = ${roomnum} && uuid = '${uuid}'`,(err,result)=>{
    return res.send(result);
  })
})
// app.get('/spacequezeshowtitle',(req,res)=>{
//   const roomnum = req.query.roomnum;
//   const uuid = req.query.uuid;
//   connection.query(`select * from spacequezeshowqueze where roomnum = ${roomnum} && uuid = '${uuid}'`,(err,result)=>{
//     return res.send(result);
//   })
// })
// app.get('/quezeshowqueze_type_text',(req,res)=>{
//   const roomnum = req.query.roomnum;
//   let send_ = [];
//   console.log(roomnum);
//   connection.query(`select * from quezeshowcontent_text where roomnum = '${roomnum}' && existence = 1`,(err,result)=>{
//     Promise.all(result.map(async(e,i)=>{
//       send_[i] ={
//         uuid     : e.uuid,
//         uuid2    : e.uuid2,
//         roomnum  : e.roomnum,
//         title    : e.title,
//         answer   : e.answer,
//       }
//       console.log('send message 만들어 자는 중 ');
//     })).then(()=>{
//       console.log('res send',send_);
//       return res.send(send_);
//     })
//   })
// })
// app.get('/quezeshowqueze_type_queze',(req,res)=>{
//   const roomnum = req.query.roomnum;
//   let send_ = [];
//   console.log(roomnum);
//   connection.query(`select * from quezeshowcontent_queze where roomnum = '${roomnum}' && existence = 1`,(err,result)=>{
//     Promise.all(result.map(async(e,i)=>{
//       if(e.img === ''){
//         send_[i] ={
//           uuid : e.uuid,
//           uuid2 : e.uuid2,
//           roomnum : e.roomnum,
//           title : e.title,
//           text : e.text,
//           value1 : e.value1,
//           value2 : e.value2,
//           value3 : e.value3,
//           value4 : e.value4,
//           answer : e.answer,
//           img : ''
//         }
//       }
//       else{
//         const  command = new GetObjectCommand({
//           Bucket: "dlworjs",
//           Key: e.uuid+'/'+e.img,
//         });
//         const response = await client.send(command);
//         const response_body = await response.Body.transformToByteArray();
//         const img_src = (Buffer.from(response_body).toString('base64'));
//         send_[i] ={
//           uuid : e.uuid,
//           uuid2 : e.uuid2,
//           roomnum : e.roomnum,
//           title : e.title,
//           text : e.text,
//           value1 : e.value1,
//           value2 : e.value2,
//           value3 : e.value3,
//           value4 : e.value4,
//           answer : e.answer,
//           img : img_src
//         }
//       }
//       console.log('send message 만들어 자는 중 ');
//     })).then(()=>{
//       console.log('res send',send_);
//       return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
//     })
//   })
// })
app.get('/quezeshowqueze',(req,res)=>{
  const roomnum = req.query.roomnum;
  let send_ = [];
  console.log(roomnum);
  connection.query(`select * from quezeshowcontent where roomnum = '${roomnum}'`,(err,result)=>{
    console.log(result);
    Promise.all(result.map(async(e,i)=>{
      console.log(e,e.data_type,e.data_type.length);
      // if(e.data_type == 'video'){
      //     connection.query(`select * from youtube where uuid='${e.uuid2}'`, ( (err, result) => {
      //       if (err) throw err;
      //       console.log('data type video send_만들어지는 중');
      //       send_[i] = {
      //         img: e.img,
      //         title: e.title,
      //         uuid: e.uuid,
      //         text: e.text,
      //         uuid2: e.uuid2,
      //         roomnum: e.roomnum,
      //         data_type: e.data_type,
      //         value: e.value,
      //         start: result[0].start,
      //         end: result[0].end
      //       };
      //     }))
      // }else if(e.data_type == 'audio'){
      //   connection.query(`select * from youtube where uuid='${e.uuid2}'`,((err,result)=>{
      //     if(err) throw err
      //     send_[i] ={
      //       img : e.img,
      //       title : e.title,
      //       uuid : e.uuid,
      //       text : e.text,
      //       uuid2 : e.uuid2,
      //       roomnum : e.roomnum,
      //       data_type : e.data_type,
      //       value : e.value,
      //       start : result[0].start,
      //       end : result[0].end
      //     }
      //   }))
      if (e.data_type === 'video' || e.data_type === 'audio') {
        const youtubeResult = await new Promise((resolve, reject) => {
          connection.query(`select * from youtube where uuid='${e.uuid2}'`, (err, result) => {
            if (err) reject(err);
            resolve(result);
          });
        });
        console.log('data type video send_만들어지는 중');
        send_[i] = {
          img: e.img,
          title: e.title,
          uuid: e.uuid,
          text: e.text,
          uuid2: e.uuid2,
          roomnum: e.roomnum,
          data_type: e.data_type,
          value: e.value,
          start: youtubeResult[0].start,
          end: youtubeResult[0].end,
          hint: e.hint
        };
      
      }else if(e.data_type == 'image'){
        const  command = new GetObjectCommand({
          Bucket: "dlworjs",
          Key: e.uuid+'/'+e.img + '.jpg',
        });
        const response = await client.send(command);
        const response_body = await response.Body.transformToByteArray();
        const img_src = (Buffer.from(response_body).toString('base64'));
        send_[i] ={
          img : img_src,
          title : e.title,
          uuid : e.uuid,
          text : e.text,
          uuid2 : e.uuid2,
          roomnum : e.roomnum,
          data_type : e.data_type,
          value : e.value, 
          hint: e.hint
        }
      }else if(e.data_type === 'text'){
        send_[i] ={
          img : '',
          title : e.title,
          uuid : e.uuid,
          text : e.text,
          uuid2 : e.uuid2,
          roomnum : e.roomnum,
          data_type : e.data_type,
          value : e.value,
          hint: e.hint
        }
      }else {
        throw 'quezeshowcontent data_type err';
      }
      console.log('send message 만들어 자는 중 ');
    })).then(()=>{
      console.log('res send',send_);
      return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
    })
  })
})
app.get('/select_choice_correct',(req,res)=>{
  const uuid = req.query.uuid;
  console.log(uuid);
  connection.query(`select * from choice where uuid ='${uuid}'`,(err,choice_result)=>{
    connection.query(`select * from correct_choice where uuid ='${uuid}'`,(err,correct_result)=>{
      let send_ = [];
      // Promise.all(choice_result.map((e,i)=>{
      //   console.log(choice_result,correct_result);
      //   send_[i] = {choice : choice_result[i], correct_choice : correct_result[i].correct_choice}
      // })).then((e)=>{
      //   return res.send(send_);
      // })
      return res.send({choice : choice_result, correct_choice : correct_result});
    })
  })

})
// app.get('/spacequezeshowqueze',(req,res)=>{
//   const roomnum = req.query.roomnum;
//   const uuid = req.query.uuid;
//   let send_ = [];
//   console.log(roomnum);
//   connection.query(`select * from space_content where roomnum = ${roomnum} && uuid = '${uuid}'`,(err,result)=>{
//     Promise.all(result.map(async(e,i)=>{
//       if(e.img === ''){
//         send_[i] ={
//           img : '',
//           title : e.title,
//           uuid : e.uuid,
//           uuid2 : e.uuid2,
//           uuid3 : e.uuid3,
//           text : e.text,
//           roomnum : e.roomnum,
//           value : e.value
//         }
//       }
//       else{
//         const  command = new GetObjectCommand({
//           Bucket: "dlworjs",
//           Key: `space/${e.uuid}/${e.uuid2}/${e.img}`,
//         });
//         const response = await client.send(command);
//         const response_body = await response.Body.transformToByteArray();
//         const img_src = (Buffer.from(response_body).toString('base64'));
//         send_[i] ={
//           img : img_src,
//           title : e.title,
//           uuid : e.uuid,
//           uuid2 : e.uuid2,
//           uuid3 : e.uuid3,
//           text : e.text,
//           roomnum : e.roomnum,
//           value : e.value
//         }
//       }
//       console.log('send message 만들어 자는 중 ');
//     })).then(()=>{
//       console.log('res send',send_);
//       return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
//     })
//   })
// })
app.post('/quezeshowqueze_plus_value',(req,res)=>{
  const uuid2 = req.body.uuid2;
  connection.query(`select value from quezeshowcontent where uuid2 = '${uuid2}'`,(err,result)=>{
    console.log('select value from quezeshowcontent where uuid2 = ${uuid2}',result);
    connection.query(`update quezeshowcontent set value = ${result[0].value + 1} where uuid2 = '${uuid2}'`);  
    return res.send('success');
  })
})
// app.post('/spacequezeshowqueze_plus_value',(req,res)=>{
//   const uuid = req.body.uuid;
//   connection.query(`select value from space_content where uuid3 = '${uuid}'`,(err,result)=>{
//     console.log('select value from space_content where uuid2 = ${uuid2 & uuid = space_uuid',result);
//     if(result.length === 0) {
//       console.log(err);
//       return res.send('spacequezeshowqueze_plus_value err, 값을 올릴 수 없습니다. result.length === 0');
//     }else{
//       connection.query(`update space_content set value = ${result[0].value + 1} where uuid3 = '${uuid}'`);  
//       return res.send('success');
//     }
//   })
// })
app.get('/quezeshowcomment',(req,res)=>{
  const roomnum = req.query.roomnum;
  connection.query(`select * from quezeshowcomment where roomnum='${roomnum}' order by likes desc limit 20`,(err,result)=>{
    return res.send(result);
  });
})
app.get('/spacequezeshowcomment',(req,res)=>{
  const roomnum = req.query.roomnum;
  const uuid = req.query.uuid;
  const uuid2 = req.query.uuid2;
  console.log(roomnum,uuid,uuid2);
  connection.query(`select * from spacequezeshowcomment where roomnum=${roomnum} && uuid = '${uuid}' && uuid2 = '${uuid2}' order by likes desc`,(err,result)=>{
    return res.send(result);
  });
})
app.post('/quezeshowcommentchange',(req,res)=>{

  const type = req.body.type;
  const uuid2 = req.body.uuid2;
  if(type === 'plus'){
    connection.query(`select likes from quezeshowcomment where uuid2 = "${uuid2}"`,(err,result)=>{
      console.log(result);
      connection.query(`update quezeshowcomment set likes = ${result[0].likes + 1} where uuid2 = "${uuid2}"`);
    });
  }
  else if(type === 'minus'){  
    connection.query(`select likes from quezeshowcomment where uuid2 = "${uuid2}"`,(err,result)=>{
      console.log(result);
      connection.query(`update quezeshowcomment set likes = ${result[0].likes - 1} where uuid2 = "${uuid2}"`);
    });
  }
  return res.send('success');
})
// app.post('/spacequezeshowcommentchange',(req,res)=>{

//   const type = req.body.type;
//   const uuid3 = req.body.uuid3;
//   if(type === 'plus'){
//     connection.query(`select likes from spacequezeshowcomment where uuid3 = "${uuid3}"`,(err,result)=>{
//       console.log(result);
//       connection.query(`update spacequezeshowcomment set likes = ${result[0].likes + 1} where uuid3 = "${uuid3}"`);
//     });
//   }
//   else if(type === 'minus'){  
//     connection.query(`select likes from spacequezeshowcomment where uuid3 = "${uuid3}"`,(err,result)=>{
//       console.log(result);
//       connection.query(`update spacequezeshowcomment set likes = ${result[0].likes - 1} where uuid3 = "${uuid3}"`);
//     });
//   }
//   return res.send('success');
// })
app.post('/quezeshowcomment_upload',(req,res)=>{
  const uuid = req.body.uuid;
  const title = req.body.title;
  const text = req.body.text;
  const roomnum = req.body.roomnum;
  const date = req.body.date;
  const usertype = req.body.usertype;
  connection.query(`insert into quezeshowcomment (title, text, likes, uuid, uuid2, roomnum, date, usertype) value('${title}', '${text}', 0, '${uuid}', '${uuidv4()}', ${roomnum}, '${date}', ${usertype})`,(err,result)=>{
    return res.send(result);
  });
})
// app.post('/spacequezeshowcomment_upload',(req,res)=>{
//   const uuid = req.body.uuid;
//   const uuid2 = req.body.uuid2;
//   const title = req.body.title;
//   const text = req.body.text;
//   const roomnum = req.body.roomnum;
//   console.log(uuid,uuid2,title,text,roomnum);
//   connection.query(`insert into spacequezeshowcomment (title, text, likes, uuid, uuid2, uuid3, roomnum) value('${title}', '${text}', 0, '${uuid}', '${uuid2}','${uuidv4()}', ${roomnum})`,(err,result)=>{
//     return res.send(result);
//   });
// })
app.post('/community_plus',(req,res)=>{
  console.log(req.body);
  const text = req.body.text;
  const date = req.body.date;
  const usertype = req.body.usertype;
  connection.query(`insert into community (text,date,uuid,likes,usertype) value('${text}', ${date}, '${uuidv4()}', 0, ${usertype})`,(err,result)=>{
    if(err) throw err
    else return res.send('success');
  });
})
app.get('/community',(req,res)=>{
  const type = req.query.type; // "date" or "likes"
  connection.query(`select * from community order by ${type} limit 20;`,(err,result)=>{
    if(err) throw err
    else return res.send(result);
  })
})
app.post('/community_likes_change',(req,res)=>{
  const type = req.body.type;
  const uuid = req.body.uuid;
  if(type === 'plus'){
    connection.query(`select likes from community where uuid = "${uuid}";`,(err,result)=>{
      console.log('result nommunity likes',result);
      connection.query(`update community set likes = ${result[0].likes + 1} where uuid = "${uuid}";`);
    });
  }
  else if(type === 'minus'){  
    connection.query(`select likes from community where uuid = "${uuid}";`,(err,result)=>{
      console.log('result nommunity likes',result);
      connection.query(`update community set likes = ${result[0].likes - 1} where uuid = "${uuid}";`);
    });
  }
  return res.send('success');
})
app.get('/prerendering',(req,res)=>{
  
})
// app.post('/make_space',(req,res)=>{
//   const uuid = req.body.uuid;
//   const title = req.body.title;
//   const img = req.body.img;
//   const intro_text = req.body.intro_text;
//   if(img === ''){
//     connection.query(`insert into space (uuid, img, title, intro_text) value('${uuid}', '', '${title}','${intro_text}')`,(err,result)=>{
//       if(err) throw err;
//       else return res.send('success');
//     })
//   }
//   else{
//     connection.query(`insert into space (uuid, img, title, intro_text) value('${uuid}', '${img}', '${title}', '${intro_text}')`,(err,result)=>{
//       if(err) throw err;
//       else return res.send('success');
//     })
//   }

// })
// app.get('/space',(req,res)=>{
//   const type = req.query.type; // "date" or "likes"
//   let send_ = [];
//   connection.query(`select * from space order by ${type} limit 20;`,(err,result)=>{
//     Promise.all(result.map(async(e,i)=>{
//       if(e.img === ''){
//         send_[i] ={
//           img : '',
//           title : e.title,
//           uuid : e.uuid,
//           intro_text : e.intro_text
//         }
//       }
//       else{
//         const  command = new GetObjectCommand({
//           Bucket: "dlworjs",
//           Key: e.img,
//         });
//         const response = await client.send(command);
//         const response_body = await response.Body.transformToByteArray();
//         const img_src = (Buffer.from(response_body).toString('base64'));
//         send_[i] ={
//           img : img_src,
//           title : e.title,
//           uuid : e.uuid,
//           intro_text : e.intro_text
//         }
//       }
//       console.log('send message 만들어 자는 중 ');
//     })).then(()=>{
//       console.log('res send',send_);
//       return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
//     })
//   })
// })
// app.get('/in_space',(req,res)=>{
//   const type = req.query.type; // "date" or "likes"
//   let send_ = [];
//   connection.query(`select * from space_content order by ${type} limit 20;`,(err,result)=>{
//     Promise.all(result.map(async(e,i)=>{
//       if(e.img === ''){
//         send_[i] ={
//           img : '',
//           title : e.title,
//           uuid : e.uuid,
//         }
//       }
//       else{
//         const  command = new GetObjectCommand({
//           Bucket: "dlworjs",
//           Key: e.img,
//         });
//         const response = await client.send(command);
//         const response_body = await response.Body.transformToByteArray();
//         const img_src = (Buffer.from(response_body).toString('base64'));
//         send_[i] ={
//           img : img_src,
//           title : e.title,
//           uuid : e.uuid,
//         }
//       }
//       console.log('send message 만들어 자는 중 ');
//     })).then(()=>{
//       console.log('res send',send_);
//       return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
//     })
//   })
// })
// app.get('/search_space',(req,res)=>{
//   let send_ = [];
//   connection.query(`select * from space where title like "%${req.query.value}%";`,(err,result)=>{
//     console.log(result);
//     if(result.length !== 0){
//       Promise.all(
//         result.map(async(e,i)=>{
//           if(e.img === ''){
//             send_[i] ={
//               img : '',
//               title : e.title,
//               uuid : e.uuid,
//               text : e.text,
//               uuid2 : e.uuid2,
//               roomnum : e.roomnum,
//               value : e.value
//             }
//           }
//           else{
//             const  command = new GetObjectCommand({
//               Bucket: "dlworjs",
//               Key: `${e.img}`
//             })
//             const response = await client.send(command);
//             const response_body = await response.Body.transformToByteArray();
//             const img_src = (Buffer.from(response_body).toString('base64'));
//             send_[i] ={
//               img : img_src,
//               title : e.title,
//               uuid : e.uuid,
//               text : e.text,
//               uuid2 : e.uuid2,
//               roomnum : e.roomnum,
//               value : e.value
//             }
//           }
//         })
//       ).then(()=>{
//         console.log('res send');
//         return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);

//       })
//     }else {
//       console.log('err');
//       return res.send(false);
//     } 
//   })
// })
// app.post('/make_spacequezeshow',(req,res)=>{
//   const queze_title = req.body.queze_title;
//   const content_title = req.body.content_title;
//   const explain_text = req.body.explain_text;
//   const img_tinyint = req.body.img_tinyint;
//   const uuid = req.body.uuid; // space uuid
//   const uuid2 = req.body.uuid2; // queze uuid
//   const date = req.body.date;
//   const representativeimg = req.body.representativeimg;
//   let result_roomnum;
//   console.log('queze_title',queze_title,'content_title',content_title,'explain_text',explain_text,'img_tinyint',img_tinyint,'uuid',uuid,'uuid2',uuid2,'date',date,'representativeimg',representativeimg);
//   connection.query(`select roomnum from spacequezeshowqueze where uuid = '${uuid}' order by roomnum desc limit 1`,(err,result)=>{
//     console.log('make space quezeshow result : ',result);
//     if(result.length === 0){
//       result_roomnum = 0;
//     }
//     else{
//       result_roomnum = result[0].roomnum;
//     }
//     if(representativeimg === 0){ // 섬내일 없을 때, null에 Number씌우면 0이 됨!! wow
//       connection.query(`insert into spacequezeshowqueze (uuid, uuid2, title, existence, date, likes, img, roomnum) value('${uuid}', '${uuid2}','${queze_title}', 1, ${date}, 0, '', ${result_roomnum + 1})`,(err,result)=>{
//         if(err){
//           throw err
//         }
//       })
//     }else{
//       connection.query(`insert into spacequezeshowqueze (uuid, uuid2, title, existence, date, likes, img, roomnum) value('${uuid}', '${uuid2}', '${queze_title}', 1, ${date}, 0, '${representativeimg}.jpg', ${result_roomnum + 1})`,(err,result)=>{
//         if(err){
//           throw err
//         }
//       })
//     }
//     if(typeof(content_title) === 'string'){ // content 하나 일때
//       console.log('make quezeshow 선택지 하나만 들어옴');
//       if(img_tinyint === 'true'){
//         console.log('이미지 있음');
//         connection.query(`insert into space_content (uuid, title, existence, img, text, uuid2, value, roomnum, uuid3) value('${uuid}', '${content_title}', 1, '${0}.jpg', '${explain_text}', '${uuid2}',0, ${result_roomnum + 1}), '${uuidv4()}'`,(err,result)=>{
//           if(err){
//             throw err
//           }
//         })
//       }
//       else{
//         console.log('이미지 없음');
//         connection.query(`insert into space_content (uuid, title, existence, img, text, uuid2, value, roomnum, uuid3) value('${uuid}', '${content_title}', 1, '', '${explain_text}', '${uuid2}',0, ${result_roomnum + 1}), '${uuidv4()}'`,(err,result)=>{
//           if(err){
//             throw err
//           }
//         })
//       }
//     }
//     else{
//       console.log('make quezeshow 선택지 여러개');
//       content_title.map((e,i)=>{
//         if(img_tinyint[i] === 'true'){
//           console.log('이미지 있음');
//           connection.query(`insert into space_content (uuid, title, existence, img, text, uuid2, value, roomnum, uuid3) value('${uuid}', '${content_title[i]}', 1, '${i}.jpg', '${explain_text[i]}', '${uuid2}',0, ${result_roomnum + 1}, '${uuidv4()}')`,(err,result)=>{
//             if(err){
//               throw err
//             }
//           })
//         }
//         else{
//           console.log('이미지 없음');
//           connection.query(`insert into space_content (uuid, title, existence, img, text, uuid2, value, roomnum, uuid3) value('${uuid}', '${content_title[i]}', 1, '', '${explain_text[i]}', '${uuid2}',0, ${result_roomnum + 1}, '${uuidv4()}')`,(err,result)=>{
//             if(err){
//               throw err
//             }
//           })
//         }
//       })
//     }

//   });
//   res.send('success');
// })
// app.get('/shar_quezeshow',(req,res)=>{
//   connection.query(`select * from space where title like "%${req.query.value}%" limit 7`,(err,result)=>{
//     console.log('shar_quezeshow',result);
//     if(result.length === 0) return res.send(false);
//     else return res.send(result);
//   })
// })
// app.post('/modify_space',(req,res)=>{
//   const explain_text = req.body.explain_text;
//   const img = req.body.img;
//   connection.query(`update space set explain_text = '${explain_text}' where uuid = ${uuid};`,(err,result)=>{

//   })
// })
app.listen(port, (err) => {
  console.log(`Example app listening on port ${port}`)
  console.log(err);
  console.log("working");

})