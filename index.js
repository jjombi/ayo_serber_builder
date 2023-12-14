const express = require('express')
const cors = require('cors');
const mysql = require('mysql');
const mariadb = require('mariadb');
const multer  = require('multer');
const body_parser = require("body-parser");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const saltRounds = 5;
const fs = require('fs');
const { title } = require('process');
const fileUpload = require('express-fileupload');
const { v4: uuidv4 } = require('uuid');
const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");
require('dotenv').config()

const port = 45509;
const url = process.env.FRONT_REDIRECT_URL_SERVICE;
const app = express()
app.use(body_parser.json());
app.use(
  body_parser.urlencoded({
    extended: true,
  })
);
app.use(fileUpload());
app.use(cors({
  origin : "https://ay0.netlify.app",
  // origin: "https://jjombi.github.io",
  origin : "http://localhost:8080", // 접근 권한을 부여하는 도메인 "http://localhost:3000"
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





// /*-------------------------mysql 연결--------------------------*/
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





const upload_query = async (req, roomName_arr) =>{
  console.log('upload query 시작 req : ',req.body,roomName_arr);
  connection.query(`select * from queze where roomName = '${roomName_arr}';`,(err,result) => {
    if(result.length === 0){
      connection.query(`insert into queze (roomName, existence, title, title_img_name) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg');`);
      if(typeof(req.body.img_name) === 'string'){
        connection.query(`insert into result (text, value, originalname, roomName) value('${req.body.text}', 0, 'img0.jpg','${roomName_arr}')`);
      }
      else{
        for(i=0 ; i < req.body.img_name.length ;i++){
          connection.query(`insert into result (text, value, originalname, roomName) value('${req.body.text[i]}', 0, 'img${i}.jpg','${roomName_arr}')`);
        }
      }
    }
  })    
  // pool_main.getConnection().then((conn)=>{
  //   conn.query(`select * from queze where roomName = '${roomName_arr}';`).then(result=>{ // 수정 필요
  //     // console.log('444 result',result,req);
  //     if(result.length === 0){
  //       conn.query(`insert into queze (roomName, existence, title, title_img_name) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg');`);
  //       if(typeof(req.body.img_name) === 'string'){
  //         conn.query(`insert into result (text, value, originalname, roomName) value('${req.body.text}', 0, 'img0.jpg','${roomName_arr}')`);
  //       }
  //       else{
  //         for(i=0 ; i < req.body.img_name.length ;i++){
  //           conn.query(`insert into result (text, value, originalname, roomName) value('${req.body.text[i]}', 0, 'img${i}.jpg','${roomName_arr}')`);
  //         }
  //       }
  //       // conn.query(`create table ${roomName_arr}_comments (value varchar(40), parent_room_num int, likes int, type tinyint);`)
  //     }
  //   })  
  // })  
  
}


// let callbackExecuted = false;
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
  // pool_main.getConnection()
  // .then((conn)=>{
  //   conn.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`).then((result)=>{
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
  // })
  
  return res.redirect(url+'/ayoworldrank');
  // return res.send('success');
  
    
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
    return res.redirect(url+'ayoworldrank');   
    // return res.send(roomName);  
  })  

  // pool_main.getConnection().then((conn)=>{
  //   let roomName;
  //   conn.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`).then((result)=>{
  //     if(result.length != 0){
  //       let roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
  //       if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
  //       { 
  //         roomName_arr.push(String.fromCharCode(65));
  //         roomName = roomName_arr.join('');
  //       }
  //       else
  //       { 
  //         roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
  //         roomName = roomName_arr.join('');
  //       }
  //     }else roomName = 'A';
  //     console.log('roomName',roomName);   
  //     return res.send(roomName);  
  //   })  
  // })
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
            i++;
          })
        ).then(()=>{
          console.log('res send');
          return res.set({ "Content-Type": 'mulipart/form-data'}).send({result : result, base64_img_arr : base64_img_arr });

        })
      }else {
        console.log('err');
        return res.send(false);} 

    });
  


  // pool_main.getConnection().then((conn)=>{
  //   conn.query(`select * from queze where existence = 1`).then( async (result)=>{
  //     console.log(result);
  //     if(result.length !== 0){
  //       console.log('????');
  //       await Promise.all(
  //         result.map(async(e,i)=>{
  //           console.log(e.roomName+"/"+e.title_img_name,i);
  //           const  command = new GetObjectCommand({
  //             Bucket: "dlworjs",
  //             Key: e.roomName+"/"+e.title_img_name,
  //           });
  //           const response = await client.send(command);
  //           const response_body = await response.Body.transformToByteArray();
  //           const img_src = (Buffer.from(response_body).toString('base64'));
  //           base64_img_arr[i] = [img_src];
  //           i++;
  //         })
  //       ).then(()=>{
  //         console.log('res send');
  //         return res.set({ "Content-Type": 'mulipart/form-data'}).send({result : result, base64_img_arr : base64_img_arr });

  //       })
  //     }else console.log('err');

  //   })
  // })
})



app.post('/main_a_queze',(req,res)=>{
  const roomName = req.body.roomName;
  let   text_arr = [];
  let   img_arr  = [];

    connection.query(`select * from result where roomName='${roomName}'`,(err,result)=>{
      console.log('select from result whee roomName=',roomName,result);
      Promise.all(result.map(async(e,i)=>{
        console.log('result 이미지 경로',roomName+"/img"+i+'.jpg');
        const  command = new GetObjectCommand({
          Bucket: "dlworjs",
          Key: roomName+"/img"+i+'.jpg',
        });
        const response = await client.send(command);
        const response_body = await response.Body.transformToByteArray();
        const img_src = (Buffer.from(response_body).toString('base64'));

        text_arr = [...text_arr,e.text];
        img_arr = [...img_arr,img_src];
        i++;
      })).then(()=>{
        console.log('text_arr',text_arr,img_arr); // text arr [queze_length,text1,text2,text3]
        return res.send({text : text_arr, img : img_arr});
      })  
    })
  

  // pool_main.getConnection().then(async(conn)=>{
  //   conn.query(`select * from result where roomName='${roomName}'`).then(result=>{
  //     console.log('select from result whee roomName=',roomName,result);
  //     Promise.all(result.map(async(e,i)=>{
  //       console.log('result 이미지 경로',roomName+"/img"+i+'.jpg');
  //       const  command = new GetObjectCommand({
  //         Bucket: "dlworjs",
  //         Key: roomName+"/img"+i+'.jpg',
  //       });
  //       const response = await client.send(command);
  //       const response_body = await response.Body.transformToByteArray();
  //       const img_src = (Buffer.from(response_body).toString('base64'));

  //       text_arr = [...text_arr,e.text];
  //       img_arr = [...img_arr,img_src];
  //       i++;
  //     })).then(()=>{
  //       console.log('text_arr',text_arr,img_arr); // text arr [queze_length,text1,text2,text3]
  //       return res.send({text : text_arr, img : img_arr});
  //     })  
  //   })
  // })  


})
// comments desc : create table $roomName_comments (value varchar(40), parent_room_num int, likes int, type tinyint); parent_room_num 1,2,3 type : 0=자식, 1=부모
app.post('/main_a_queze_comments',(req,res)=>{ // url 파라미터로 roomName 가져오게 바꾸기
  
    connection.query(`select * from comments where type = 1 && roomName = '${req.body.roomName}'`,(err,result)=>{
      console.log('queze 안에 comments all',result);
      return res.send(result);
    })
    
  
  
  // pool_main.getConnection().then((conn)=>{
  //   conn.query(`select * from comments where type = 1 && roomName = '${req.body.roomName}'`).then((result)=>{
  //     console.log('queze 안에 comments all',result);
  //     return res.send(result);
  //   })
    
  // })
})
app.post('/main_a_queze_children_comments',(req,res)=>{
    connection.query(`select * from ${req.body.roomName}_comments where parent_room_num = ${req.body.parent_room_num} && type = 0 order by likes desc`,(err,result)=>{
      return res.send(result);
    })  
  
  // pool_main.getConnection().then((conn)=>{
  //   conn.query(`select * from ${req.body.roomName}_comments where parent_room_num = ${req.body.parent_room_num} && type = 0 order by likes desc`).then(result=>{
  //     return res.send(result);
  //   })  
  // })
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
  
  // pool_main.getConnection().then((conn)=>{
  //   // 부모일때
  //   console.log('댓 추가 req.body',req.body);
  //   const roomName = req.body.roomName;
  //   const type = req.body.type;
  //   const value = req.body.value;
  //   if(type === 1){
  //     conn.query(`insert into comments (value,parentsKey,likes,type,roomName) value('${value}','${uuidv4()}',0,1,'${roomName}')`).then(()=>{
  //       return res.send('success'); //url+`/result?roomName=${roomName}`
        
  //     })
  //   }
  //   else{
  //     return res.send('err');
  //   }
  // })
})
app.post('/result_plus',(req,res)=>{
  console.log('값 올리기 post req : ',req.body);
  const roomName = req.body.roomName;
  const column_name_arr = req.body.column; // [[txt1,3],[txt3,2],[txt2,1]]
  let insert_content = '';
  let insert_value = '';

    connection.query(`select * from result where roomName = '${roomName}'`,(err,result)=>{
      console.log('selct * from result where roomName',result); //[ { text: 'ㅌㅇㅌ1', value: 0, originalname: 'img0.jpg', roomName: 'F' }, { text: 'ㅌㅇㅌ2', value: 0 }, { text: 'ㅌㅇㅌ3', value: 0 }]
      result.map(result_e=>{
        column_name_arr.map(res_e=>{
          if(result_e.text === res_e[0]){
            connection.query(`update result set value = ${Number(result_e.value) + res_e[1]} where text = '${result_e.text}'`);
          }
        })
      })
    }).then(()=>{
      return( res.send('success'));
    })

  

  // pool_main.getConnection().then((conn)=>{
  //   conn.query(`select * from result where roomName = '${roomName}'`).then((result)=>{
  //     console.log('selct * from result where roomName',result); //[ { text: 'ㅌㅇㅌ1', value: 0, originalname: 'img0.jpg', roomName: 'F' }, { text: 'ㅌㅇㅌ2', value: 0 }, { text: 'ㅌㅇㅌ3', value: 0 }]
  //     result.map(result_e=>{
  //       column_name_arr.map(res_e=>{
  //         if(result_e.text === res_e[0]){
  //           conn.query(`update result set value = ${Number(result_e.value) + res_e[1]} where text = '${result_e.text}'`);
  //         }
  //       })
  //     })
  //   }).then(()=>{
  //     return( res.send('success'));
  //   })

  // })

})
app.post('/main_result',(req,res)=>{
  const roomName = req.body.roomName;
  let send_ = [];

  connection.query(`select * from result where roomName = '${roomName}' order by value asc;`,(err,result)=>{
    console.log(result);
    if(result.length !== 0){
      Promise.all(result.map(async(e)=>{
        const  command = new GetObjectCommand({
          Bucket: "dlworjs",
          Key: roomName+'/'+e.originalname,
        });
        const response = await client.send(command);
        const response_body = await response.Body.transformToByteArray();
        const img_src = (Buffer.from(response_body).toString('base64'));
        send_ = [...send_,
          {
          img : img_src,
          text : e.text,
          value : e.value
          }]
      })).then(()=>{
        return res.send(send_);
      })
    }
  })
  

  // pool_main.getConnection().then((conn)=>{
  //   conn.query(`select * from result where roomName = '${roomName}' order by value asc;`).then(result=>{
  //     console.log(result);
  //     if(result.length !== 0){
  //       Promise.all(result.map(async(e)=>{
  //         const  command = new GetObjectCommand({
  //           Bucket: "dlworjs",
  //           Key: roomName+'/'+e.originalname,
  //         });
  //         const response = await client.send(command);
  //         const response_body = await response.Body.transformToByteArray();
  //         const img_src = (Buffer.from(response_body).toString('base64'));
  //         send_ = [...send_,
  //           {
  //           img : img_src,
  //           text : e.text,
  //           value : e.value
  //           }]
  //       })).then(()=>{
  //         return res.send(send_);
  //       })
  //     }
  //   })
  // })
})
// app.post('/select_title_text',(req,res)=>{
//   const roomName_arr = req.body.roomName; // [A,B,C]
//   pool_main.getConnection(`select * from ${roomNameo}`)
// })
app.listen(port, (err) => {
  console.log(`Example app listening on port ${port}`)
  console.log(err);
  console.log("working");

})