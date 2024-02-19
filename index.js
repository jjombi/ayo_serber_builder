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
const { resolve } = require('path');
require('dotenv').config()

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
  origin : "https://ay0.site",
  // origin: "https://jjombi.github.io",
  // origin : "http://localhost:8080", // 접근 권한을 부여하는 도메인 "http://localhost:3000"
  credentials : true, // 응답 헤더에 Access-Control-Allow-Credentials 추가
  // optionsSuccessStatus: 200, // 응답 상태 200으로 설정
  methods : '*',
}))

const client = new S3Client(
  {
    region: 'ap-northeast-2',
    credentials : {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });





// /*-------------------------mysql 연결--------------------------*/// rds 
const connection = mysql.createConnection({
  host     : 'database-1.cz0opmzpwiht.ap-northeast-2.rds.amazonaws.com',//svc.sel5.cloudtype.app:32325
  user     : 'admin',
  password : process.env.AWS_MYSQL_PASSWORD,
  database : 'ayo_db'
});
console.log('connection');
connection.connect((err)=>{
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
  console.log('connected as id ' + connection.threadId);

})
///////////////////////////////////////////////////////////////////////  local
// const connection = mysql.createConnection({
//   host     : 'localhost',//svc.sel5.cloudtype.app:32325
//   user     : 'root',
//   password : 'sis01066745950@',
//   database : 'ayo_mysql_local'
// });
// console.log('connection');
// connection.connect((err)=>{
//   if (err) {
//     console.error('error connecting: ' + err.stack);
//     return;
//   }
//   console.log('connected as id ' + connection.threadId);

// })

// function handleDisconnect() {
//   connection.connect(function(err) {            
//     if(err) {                            
//       console.log('error when connecting to db:', err);
//       setTimeout(handleDisconnect, 2000); 
//     }                                   
//   });                                 
                                         
//   connection.on('error', function(err) {
//     console.log('db error', err);
//     if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
//       return handleDisconnect();                      
//     } else {                                    
//       throw err;                              
//     }
//   });
// }

// handleDisconnect();

// const pool = mariadb.createPool({host: 'svc.sel5.cloudtype.app:32325', user: 'root', connectionLimit: 5});
// const pool = mariadb.createPool({ 
//   host   : 'svc.sel5.cloudtype.app',
//   user: 'root', 
//   password: 'sis01066745950@', 
//   port: 32325,
//   database: 'ayodb',
// });
// const pool_main = mariadb.createPool({  // main2 db
//   host   : 'database-1.cz0opmzpwiht.ap-northeast-2.rds.amazonaws.com',
//   user   : 'admin', 
//   password: 'Dlworjs@', 
//   port: 3306,
//   database: 'ayo_db',
// });
// const pool_main = mariadb.createPool({  // main2 db local>
//   host   : 'localhost',
//   user   : 'root', 
//   password: 'sis01066745950@', 
//   port: 3306,
//   database: 'ayo_main_local',
// });

// /*--------------------------------------------------------------*/


app.get('/',(req,res)=>{
   
  connection.query('show tables', function (error, results, fields) {
    if (error) throw error;
    console.log('show tables ', results);
    return res.send('success');
  })
  
})

app.post('/make_queze_modify',(req,res)=>{
  connection.query(`select originalname from result where roomName = '${req.body.roomName}'`,(err,result)=>{
    return res.send(result);
  })
})
app.post('/search_queze',(req,res)=>{
  console.log(req.body);
  let base64_img_arr = [];
  connection.query(`select * from queze where title like "%${req.body.value}%";`,async (err,result)=>{
    console.log(result);
    if(result.length !== 0){
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
  })
})
app.post('/password_checker',(req,res)=>{
  console.log('password checker 시행됨');
  connection.query(`select password from queze where uuid = '${req.body.uuid}'`,(err,passHash)=>{
    bcrypt.compare(req.body.password, passHash[0].password, function(err, result) {
      console.log('pass, 원본, 결과',req.body.password, passHash, passHash[0].password, result);
      if(result) return(res.send(true))
      else return(res.send(false))
    });
  })
})
app.post('/modify_password_checker',(req,res)=>{
  console.log('modify_password_checker 시행됨');
  connection.query(`select modifyPassword from queze where roomName = '${req.body.roomName}' && modifyPassword = '${req.body.password}'`,(err,result)=>{
    if(result.length !== 0){
      return res.send('success');
    }

    else return res.send('failed');
  })
})
app.post('/modify_queze',(req,res)=>{ // queze 수정 전 데이터 받기
  const roomName = req.body.roomName;
  let send_ = [];

  connection.query(`select * from result where roomName = '${roomName}';`,(err,result)=>{
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
          img   : img_src,
          text  : e.text,
          value : e.value,
          uuid  : e.uuid
        }
        console.log('send message 만들어 자는 중 ');
      })).then(()=>{
        console.log('res send',send_);
        return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
      })
    }
  })
  
})
const upload_query = async (req, roomName_arr) =>{
  console.log('upload query 시작 req : ',req.body,roomName_arr); //upload query 시작 req :  { title: '제목', publicAccess: '수정가능', img[...] text[...] } [ 'C' ] or { title: '제목', img[...] text[...] } -> publicAccess is undefind
  let publicAccess;
  const password = req.body.password;
  if(req.body.publicAccess === undefined) publicAccess = 0;
  else publicAccess = 1;
  connection.query(`select * from queze where roomName = '${roomName_arr}';`,(err,result) => {
    if(result.length === 0){
      if(password === '' || password === undefined || password === null){
        connection.query(`insert into queze (roomName, existence, title, title_img_name, uuid, likes, publicAccess, password, modifyPassword) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg', '${uuidv4()}',0,${publicAccess}, '', '${req.body.modify_password}');`);
      }
      else{
        bcrypt.genSalt(saltRounds, function(err, salt) {
          bcrypt.hash(password, salt, function(err, hash) {
            console.log('hash password',hash);
              connection.query(`insert into queze (roomName, existence, title, title_img_name, uuid, likes, publicAccess, password, modifyPassword) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg', '${uuidv4()}',0,${publicAccess},'${hash}', '${req.body.modify_password}');`);
          });
        })
      }
      if(typeof(req.body.img_name) === 'string'){ // 이미지가 하나 일때
        connection.query(`insert into result (text, value, originalname, roomName, uuid) value('${req.body.text}', 0, 'img0.jpg','${roomName_arr}', '${uuidv4()}')`);
      }
      else{                                       //이미지가 여러개 일때
        for(i=0 ; i < req.body.img_name.length ;i++){// text에 값이 없을 때
          if(req.body.text[i] === undefined || req.body.text[i] === '') connection.query(`insert into result (text, value, uuid, originalname, roomName) value('', 0, '${uuidv4()}', 'img${i}.jpg','${roomName_arr}')`);
          else connection.query(`insert into result (text, value, uuid, originalname, roomName) value('${req.body.text[i]}', 0, '${uuidv4()}', 'img${i}.jpg','${roomName_arr}')`);
        }
      }
    }
  })    
}


app.use(body_parser.urlencoded({ extended: true }));

app.post('/upload_img',(req,res)=>{
  console.log('upload img 시작',req.body,req.file); //req.files.img[0].name or data(type BUffer)
  connection.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`,(err,result)=>{
    if(result.length != 0){
      let roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
      if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
      { 
        roomName_arr.push(String.fromCharCode(65));
        upload_query(req,roomName_arr);
      }
      else
      { 
        roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
        upload_query(req,roomName_arr);     

      }
    }
    else {
      upload_query(req,'A');     
    }     

  })
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
    connection.query(`select * from result where roomName='${roomName}'`,(err,result)=>{
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
  connection.query(`select * from result where roomName = '${roomName}'`,(err,result)=>{
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
  connection.query(`select * from result where roomName='${roomName}' order by value desc limit ${type}`,(err,result)=>{
    console.log('one and one queze roomName, result',roomName,result);
    Promise.all(result.map(async(e,i)=>{
      console.log('result 이미지 경로',roomName+e.originalname);
      const  command = new GetObjectCommand({
        Bucket: "dlworjs",
        Key: roomName+'/'+e.originalname,
      });
      const response = await client.send(command);
      const response_body = await response.Body.transformToByteArray();
      const img_src = await (Buffer.from(response_body).toString('base64'));

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

  if(type === 'comments')   connection.query(`update comments set likes = likes + 1 where parentsKey = '${uuid}' `);
  else   connection.query(`update queze set likes = likes + 1 where uuid = '${uuid}' `);
  return res.send('success');
})
app.post('/likes_minus',(req,res)=>{
  console.log('comment likes minus');
  const uuid = req.body.uuid;
  const type = req.body.type;

  if(type === 'comments')   connection.query(`update comments set likes = likes - 1 where parentsKey = '${uuid}' `);
  else   connection.query(`update queze set likes = likes - 1 where uuid = '${uuid}' `);
  return res.send('success');
})
app.post('/result_plus',(req,res)=>{
  console.log('값 올리기 post req : ',req.body);
  const roomName = req.body.roomName;
  const rank = req.body.rank; 
  // [uuid,uuid,uuid]
  // [ 1등, 2등, 3등]
  connection.query(`select * from result where roomName = '${roomName}'`,(err,result)=>{
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

  connection.query(`select * from result where roomName = '${roomName}' order by value desc;`,(err,result)=>{
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

app.post('/make_quezeshow',(req,res)=>{ //나락퀴즈 문제 만들기
  const queze_title = req.body.queze_title;
  const content_title = req.body.content_title;
  const explain_text = req.body.explain_text;
  const img_tinyint = req.body.img_tinyint;
  const uuid = req.body.uuid;
  const date = req.body.date;
  const representativeimg = req.body.representativeimg;
  const modify_password = req.body.modify_password;
  let result_roomnum;
  console.log('queze_title',queze_title,'content_title',content_title,'explain_text',explain_text,'img_tinyint',img_tinyint,'uuid',uuid,'date',date,'representativeimg',representativeimg);
  connection.query(`select roomnum from quezeshowqueze order by roomnum desc limit 1`,(err,result)=>{
    console.log(result);
    if(result.length === 0){
      result_roomnum = 0;
    }
    else{
      result_roomnum = result[0].roomnum;
    }
    if(representativeimg === null){ // 섬내일 없을 때
      connection.query(`insert into quezeshowqueze (uuid, title, existence, date, likes, img, roomnum, password) value('${uuid}', '${queze_title}', 1, ${date}, 0, '', ${result_roomnum + 1}, '${modify_password}')`,(err,result)=>{
        if(err){
          throw err
        }
      })
    }else{
      connection.query(`insert into quezeshowqueze (uuid, title, existence, date, likes, img, roomnum, password) value('${uuid}', '${queze_title}', 1, ${date}, 0, '${representativeimg}.jpg', ${result_roomnum + 1}, '${modify_password}')`,(err,result)=>{
        if(err){
          throw err
        }
      })
    }
    if(typeof(content_title) === 'string'){ // content 하나 일때
      console.log('make quezeshow 선택지 하나만 들어옴');
      if(img_tinyint === 'true'){
        console.log('이미지 있음');
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title}', 1, '${0}.jpg', '${explain_text}', '${uuidv4()}',0, ${result_roomnum + 1})`,(err,result)=>{
          if(err){
            throw err
          }
        })
      }
      else{
        console.log('이미지 없음');
        connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title}', 1, '', '${explain_text}', '${uuidv4()}',0, ${result_roomnum + 1})`,(err,result)=>{
          if(err){
            throw err
          }
        })
      }
    }
    else{
      console.log('make quezeshow 선택지 여러개');
      content_title.map((e,i)=>{
        if(img_tinyint[i] === 'true'){
          console.log('이미지 있음');
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title[i]}', 1, '${i}.jpg', '${explain_text[i]}', '${uuidv4()}',0, ${result_roomnum + 1})`,(err,result)=>{
            if(err){
              throw err
            }
          })
        }
        else{
          console.log('이미지 없음');
          connection.query(`insert into quezeshowcontent (uuid, title, existence, img, text, uuid2, value, roomnum) value('${uuid}', '${content_title[i]}', 1, '', '${explain_text[i]}', '${uuidv4()}',0, ${result_roomnum + 1})`,(err,result)=>{
            if(err){
              throw err
            }
          })
        }
      })
    }

  });
  res.send('success');
})
app.get('/quezeshow_main',(req,res)=>{
  const type = req.query.type;
  const space_uuid = req.query.space_uuid; //undefind or uuid

  console.log(type,req.query,space_uuid);
  let send_ = [];
  // if(space_uuid !== undefined){
  //   if(type === 'likes'){
  //     connection.query(`select * from spacequezeshowqueze where uuid = '${space_uuid}' && existence = 1 order by likes asc limit 20`,(err,result)=>{
  //       Promise.all(result.map(async(e,i)=>{
  //         if(e.img !== ''){
  //           const  command = new GetObjectCommand({
  //             Bucket: "dlworjs",
  //             Key: `space/${space_uuid}/${e.uuid2}/${e.img}`,
  //           });
  //           const response = await client.send(command);
  //           const response_body = await response.Body.transformToByteArray();
  //           const img_src = (Buffer.from(response_body).toString('base64'));
  //           send_[i] ={
  //             img : img_src,
  //             date : e.date,
  //             likes : e.likes,
  //             title : e.title,
  //             uuid : e.uuid,
  //             uuid2 : e.uuid2,
  //             roomnum : e.roomnum
  //           }
  //           console.log('send message 만들어 자는 중 ');
  //         }else{
  //           send_[i] ={
  //             img : '',
  //             date : e.date,
  //             likes : e.likes,
  //             title : e.title,
  //             uuid : e.uuid,
  //             uuid2 : e.uuid2,
  //             roomnum : e.roomnum
  //           }
  //           console.log('send message 만들어 자는 중 ');
  //         }
  //       })).then(()=>{
  //         console.log('res send',send_);
  //         return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
  //       })
  //     })
  //   }
    // else if(type === 'date'){
    //   connection.query(`select * from spacequezeshowqueze uuid = '${space_uuid}' && existence = 1 order by likes asc limit 20`,(err,result)=>{
    //     Promise.all(result.map(async(e,i)=>{
    //       const  command = new GetObjectCommand({
    //         Bucket: "dlworjs",
    //         Key: `space/${e.uuid}/e.img`,
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
    //         uuid2 : e.uuid2,
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
  // else {
    if(type === 'likes'){
      connection.query(`select * from quezeshowqueze where existence = 1 order by likes asc limit 20`,(err,result)=>{
        Promise.all(result.map(async(e,i)=>{
          if(e.img !== ''){
            const  command = new GetObjectCommand({
              Bucket: "dlworjs",
              Key: e.uuid+'/'+e.img,
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
              roomnum : e.roomnum
            }
            console.log('send message 만들어 자는 중 ');
          }
        })).then(()=>{
          console.log('res send',send_);
          return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
        })
      })
    }
    else if(type === 'date'){
      connection.query(`select * from quezeshowqueze where existence = 1 order by likes asc limit 20`,(err,result)=>{
        Promise.all(result.map(async(e,i)=>{
          const  command = new GetObjectCommand({
            Bucket: "dlworjs",
            Key: e.uuid+'/'+e.img,
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
            roomnum : e.roomnum
          }
          console.log('send message 만들어 자는 중 ');
        })).then(()=>{
          console.log('res send',send_);
          return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
        })
      })
    }
  // }
})
app.get('/quezeshowtitle',(req,res)=>{
  const roomnum = req.query.roomnum;
  connection.query(`select * from quezeshowqueze where roomnum = ${roomnum}`,(err,result)=>{
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
app.get('/quezeshowqueze',(req,res)=>{
  const roomnum = req.query.roomnum;
  let send_ = [];
  console.log(roomnum);
  connection.query(`select * from quezeshowcontent where roomnum = '${roomnum}'`,(err,result)=>{
    Promise.all(result.map(async(e,i)=>{
      if(e.img === ''){
        send_[i] ={
          img : '',
          title : e.title,
          uuid : e.uuid,
          text : e.text,
          uuid2 : e.uuid2,
          roomnum : e.roomnum,
          value : e.value
        }
      }
      else{
        const  command = new GetObjectCommand({
          Bucket: "dlworjs",
          Key: e.uuid+'/'+e.img,
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
          value : e.value
        }
      }
      console.log('send message 만들어 자는 중 ');
    })).then(()=>{
      console.log('res send',send_);
      return res.set({ "Content-Type": 'mulipart/form-data'}).send(send_);
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
  connection.query(`select * from quezeshowcomment where roomnum='${roomnum}' order by likes desc`,(err,result)=>{
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
  connection.query(`insert into quezeshowcomment (title, text, likes, uuid, uuid2, roomnum) value('${title}', '${text}', 0, '${uuid}', '${uuidv4()}', ${roomnum})`,(err,result)=>{
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
  connection.query(`insert into community (text,date,uuid,likes) value('${text}', ${date}, '${uuidv4()}', 0)`,(err,result)=>{
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