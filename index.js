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

const upload_query = async (req, roomName_arr) =>{
  console.log('upload query 시작 req : ',req.body,roomName_arr); //upload query 시작 req :  { title: '제목', publicAccess: '수정가능', img[...] text[...] } [ 'C' ] or { title: '제목', img[...] text[...] } -> publicAccess is undefind
  let publicAccess;
  const password = req.body.password;
  if(req.body.publicAccess === undefined) publicAccess = 0;
  else publicAccess = 1;
  connection.query(`select * from queze where roomName = '${roomName_arr}';`,(err,result) => {
    if(result.length === 0){
      if(password === ''){
        connection.query(`insert into queze (roomName, existence, title, title_img_name, uuid, likes, publicAccess, password) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg', '${uuidv4()}',0,${publicAccess}, '');`);
      }
      else{
        bcrypt.genSalt(saltRounds, function(err, salt) {
          bcrypt.hash(password, salt, function(err, hash) {
            console.log('hash password',hash);
              connection.query(`insert into queze (roomName, existence, title, title_img_name, uuid, likes, publicAccess, password) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg', '${uuidv4()}',0,${publicAccess},'${hash}');`);
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
  if(typeof(req.body.text) !== "string"){
    console.log('typeof(req.body.text) !== "string"');
    for(i=0 ; i < req.body.img_name.length ;i++){
      console.log(i);
      if(req.body.text[i] === undefined || req.body.text[i] === '') connection.query(`insert into result (text, value, uuid, originalname, roomName) value('', 0, '${uuidv4()}', 'img${last_num+i+1}.jpg','${roomName}')`);
      else connection.query(`insert into result (text, value, uuid, originalname, roomName) value('${req.body.text[i]}', 0, '${uuidv4()}', 'img${i}.jpg','${roomName}')`);
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
app.get('/main_select_queze',async (req,res)=>{ //main 페이지 대표 사진과 제목 보냄 queze desc 변경 후 수정 /할 일
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
app.post('oneandoneresult',(req,res)=>{
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

app.listen(port, (err) => {
  console.log(`Example app listening on port ${port}`)
  console.log(err);
  console.log("working");

})