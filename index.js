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

const port = 45509;
const url = 'https://ay0.netlify.app';
const app = express()
app.use(body_parser.json());
app.use(
  body_parser.urlencoded({
    extended: true,
  })
);
app.use(fileUpload());
app.use(cors({
  // origin : "https://ay0.netlify.app",
  // origin: "https://jjombi.github.io",
  origin : "http://localhost:8080", // 접근 권한을 부여하는 도메인 "http://localhost:3000"
  credentials : true, // 응답 헤더에 Access-Control-Allow-Credentials 추가
  // optionsSuccessStatus: 200, // 응답 상태 200으로 설정
  methods : '*',
}))






// /*-------------------------mysql 연결--------------------------*/
const connection = mysql.createConnection({
  host     : 'localhost',//svc.sel5.cloudtype.app:32325
  user     : 'root',
  password : 'sis01066745950@',
  database : 'ayodb'
});
// const pool = mariadb.createPool({host: 'svc.sel5.cloudtype.app:32325', user: 'root', connectionLimit: 5});
const pool = mariadb.createPool({ 
  host   : 'svc.sel5.cloudtype.app',
  user: 'root', 
  password: 'sis01066745950@', 
  port: 32325,
  database: 'ayodb',
});
const pool_main = mariadb.createPool({  // main2 db
  host   : 'svc.sel5.cloudtype.app',
  user   : 'root', 
  password: 'sis01066745950@', 
  port: 32325,
  database: 'ayo_main',
});
// const pool_main = mariadb.createPool({  // main2 db local
//   host   : 'localhost',
//   user   : 'root', 
//   password: 'sis01066745950@', 
//   port: 3306,
//   database: 'ayo_main_local',
// });

// /*--------------------------------------------------------------*/


app.get('/',(req,res)=>{
  res.send('성공');
  // asyncFunction();
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`show tables;`).then((result)=>{
      console.log('reslut',result);
      conn.query('show tables').then((result)=>{
        console.log('reslut2',result);
      })
    })
    conn.end();
  })

})



/*----------------------------회원가입 --------------------------- */
/*--------------------------------- --------------------------- */
/*---------------------------------- --------------------------- */

/*------------퀴즈----------------------------------*/
app.post('/queze',(req,res)=>{ // queze 페이지 에서 같은 학교친구들 문제 가져엄

  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select roomName from queze where school='${req.body.school}';`).then((result)=>{
      console.log('reslut',result);
      return (
        res.send(result)
      )
    })
    conn.end();
  })

  console.log('this code is done');
})
app.post('/queze2',(req,res)=>{
  const school_boolen = req.body.school;
  const class_boolen = req.body.class;
  const number_boolen = req.body.number;

  const token = jwt.verify(req.body.token,'secretKey');
  let where = '';
  let school = '';
  let class_ = '';
  let number = '';

  if(school_boolen === false && class_boolen === false && number_boolen === false){
    
  }
  else{
    where = 'where';
    if(school_boolen === true){
      school = `school = '${token.school}'`;
    }
    if(class_boolen === true && school_boolen === true){
      class_ = `and class = ${token.class}`;
    }else if(class_boolen === true){
      class_ = `class = ${token.class}`;
    }
    if(number_boolen === true && class_boolen === true){
      number = `and number = ${token.number}`;
    }else if(number_boolen === true && school === true) {
      number = `and number = ${token.number}`;
    }else if(number_boolen === true){
      number = ` number = ${token.number}`;
    }
  }
  
  console.log('chol isd ',school,class_,number);

  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select * from queze ${where} ${school} ${class_} ${number}`).then((result)=>{
      console.log('11231423424',result);
      return(res.send(result));
    })
    conn.end();
  })  

})
app.post('/queze_type',(req,res)=>{
  console.log('queze_type 시작 됨');


  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select * from queze where school = "${req.body.school}";`).then((result)=>{
      console.log('11231423424',result);
      return(res.send(result));
    })
    conn.end();
  })

})

/*----------------------------로그인 --------------------------- */
/*--------------------------------- --------------------------- */
/*---------------------------------- --------------------------- */

/*---------------------------같은 학교 친구들 이름 가져오기 ------------------------- */
app.post('/api/take_name',(req,res)=>{
  console.log('req.boy.school is : ');

  
  })


app.post('/queze_option',(req,res)=>{//************************************************************************************************************ */
  console.log('queze reslut start ');
  const sequence = req.body.sequence;// ex : date desc, likes desc, date asc.. 
  const school_name = req.body.school_name;
  console.log('sequence',sequence,'school name ',school_name);
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select roomName from queze where school='${school_name}' order by ${sequence} limit 20;`).then((result)=>{
      console.log('ressss',result);
      if(result.length === 0){
        console.log('result is 0');
        return (res.send('없음'));
      }
      else{
        console.log('result is not null');
        return (res.send(result));
      }
    })
    conn.end();
  })
})
app.post('/Q_queze_value',(req,res)=>{//************************************************************************************************************ */
  console.log('queze reslut start ');
  const roomName = req.body.roomName;
  console.log(roomName);
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select * from queze where roomName='${roomName}'`).then((result)=>{
      console.log(result);
      if(result.length === 0){
        console.log('result is 0');
        return (res.send('없음'));
      }
      else{
        console.log('result is not null');
        return (res.send(result));
      }
    })
    conn.end();
  })
})
app.post('/queze_result',(req,res)=>{//************************************************************************************************************ */
  console.log('queze reslut start ');

  const roomName = req.body.roomName;
  console.log(roomName);
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select id,value,class,number from ${roomName} order by value desc limit 3;`).then((result)=>{
      console.log(result);
      if(result.length === 0){
        console.log('result is 0');
        return (res.send('없음'));
      }
      else{
        console.log('result is not null');
        return (res.send(result));
      }
    })
    conn.end();
  })

})

app.post('/queze_popularity',(req,res)=>{
  const roomName = req.body.roomName;
  console.log(roomName);
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select likes,date,maker from queze where roomName = '${roomName}'`).then((result)=>{
      console.log(result);
      if(result.length === 0){
        console.log('result is 0');
        return (res.send('없음'));
      }
      else{
        console.log('result is not null');
        return (res.send(result));
      }
    })
    conn.end();
  })
})


app.post('/up_queze_popularity',(req,res)=>{
  const roomName = req.body.roomName;
  console.log(roomName);
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select likes from queze where roomName = '${roomName}'`).then((result)=>{
      if(result.length === 0){
        conn.query(`update queze set likes = 1 where roomName='${roomName}'`).then((result)=>{
          return(res.send('likes 값을 1로 바꿈'));
        })
      }else{
        const likes_value = result[0].likes + 1;
        conn.query(`update queze set likes = ${likes_value} where roomName='${roomName}'`).then((result)=>{
          return(res.send('likes 값을 1증가'));
        })
      }
    })
    
    conn.end();
  })
})
//----------------------투표 시스템------------------------------- ******************************************************************
app.post('/create_queze',(req,res)=> {
  console.log('create queze',req.body);
  const school = req.body.school;
  const queze = req.body.queze;
  const date = req.body.date;
  const maker = req.body.maker;
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`).then((result)=>{
      let roomName_arr;
      if(result.length != 0){ // 값있음
        roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
  
        console.log('roomname arr : ',roomName_arr);
        if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
        { 
          roomName_arr.push(String.fromCharCode(65));
          console.log('바뀐 배열 z -> za',roomName_arr);
        }
        else
        { 
          console.log(roomName_arr[roomName_arr.length - 1].charCodeAt());
          roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
          console.log('바뀐 배열 a->b : ',roomName_arr);
        }
        const roomName = roomName_arr.join('');
        console.log('roomName : ',roomName);
        conn.query(`insert into queze (value,school,roomName,date,likes,maker) value('${queze}','${school}','${roomName}',${date},1,'${maker}');`)
        conn.query(`create table ${roomName} (id varchar(40), value int, class int, number int);`)
        return(
          res.send(roomName)
        )
      }
      else {
        conn.query(`insert into queze (value,school,roomName,date,maker) value('${queze}','${school}','A',${date},'${maker}');`);
        conn.query(`create table A (id varchar(40), value int, class int, number int);`);
        return(
          res.send('A')
        )
      }
    
      
    })
    conn.end();
  })

  
  


})
///////////////////////////////////////////////\/
///////////////////////////////////////////////
/////////////////////////////////////////////////
///////////////////////////////////////////////
app.post('/vote',cors({
  // origin : 'https://jjombi.github.io',
  origin : "http://localhost:8080",
  // origin : "https://ay0.netlify.app"
}),(req,res)=>{
  
  const roomName = req.body.roomName;
  const name = req.body.voteName;
  const class_ = req.body.class;
  const number = req.body.number;
  let con = false;
  //방번호와 뽑은 사람 이름을 받고 방번호인 table에 이름이 없으면 컬럼을 만들고 있으면 이름에 값올리기
  console.log('req 방이름 :',roomName);
  console.log('req 뽑은 이',name,class_,number);
  
  pool.getConnection()
  .then((conn)=>{
    console.log('connetcinn is done');
    conn.query(`select id,value,class,number from ${roomName} where id = '${name}' && class = ${class_} && number=${number};`).then((result)=>{
      console.log('resulet asd : ',result);
      if(result.length === 0){ //XXXXXX
  
        conn.query(`insert into ${roomName} (id,value,class,number) value('${name}',1,${class_},${number});`);    
        return res.send(`${name}으로 컬럼 생성 완료`);
  
      }
      else{//                   OOOOOOOOOO
        
        console.log('slect result : ',result[0].id,result[0].value);
        let change_val = Number(result[0].value) + 1;
        conn.query(` update ${roomName} set value = ${change_val} where id = '${name}' && class = ${class_} && number=${number};`)        
        return res.send(`${name}으로 값 올림`);  
          
      }
    })
    conn.end();
  })


})
const search_roomName = () => {
  pool_main.getConnection()
    .then((conn)=>{
      conn.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`).then((result)=>{
        if(result.length != 0){
          let roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
            if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
          { 
            roomName_arr.push(String.fromCharCode(65));
            return(roomName_arr);
          }
          else
          { 
            roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
            return(roomName_arr);
          }
        }
        else {
          return('A');
        }     
      })
    })
  
}
let callbackExecuted = false;

const storage = multer.diskStorage({
  
  destination: function (req, file, cb) {
    console.log('stroag : 사진 저장 함수',req.body,file);
    console.log('1',req.body);
    pool_main.getConnection()
    .then((conn)=>{
      console.log('2',req.body);
      conn.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`).then((result)=>{
        if(result.length != 0){
          console.log('3',req.body);
          let roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
            if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
          { 
            roomName_arr.push(String.fromCharCode(65));
            cb_(roomName_arr,cb);
            if(!callbackExecuted) upload_query(req,roomName_arr); callbackExecuted = false;
          }
          else
          { 
            console.log('4',req.body);
            roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
            cb_(roomName_arr,cb);
            if(!callbackExecuted){ 
              console.log('5',req.body);
              conn.query(`select * from queze where roomName = '${roomName_arr}';`).then(result=>{ // 수정 필요
                console.log('6',req.body);
                console.log('444 result',result,req.body);
                if(result.length === 0){
                  console.log('7',req.body);
                  conn.query(`insert into queze (roomName, existence, title, title_img_name) value('${roomName_arr}', 1, '${req.body.title}', '${req.body.img_name[0]}');`);
                  for(let i=0;i<req.body.text.length;i++){
                    conn.query(`insert into result (text, value, originalname, roomName) value('${req.body.text[i]}', 0, '${req.body.title}','${roomName_arr}')`);
                  }
                }
              })  
              callbackExecuted = false;
            }
            
          }
        }
        else {
          cb_(roomName_arr,cb);
          if(!callbackExecuted) upload_query(req,roomName_arr); callbackExecuted = false;
        }     
      })
    })
        
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname+'.jpg');
  }
});
const cb_ = (roomName_arr,cb) => {
  const dir = __dirname + `/uploads/${roomName_arr}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  cb(null, __dirname+`uploads/${roomName_arr}`);
}
const upload_query = async (req, roomName_arr) =>{
  console.log('upload query 시작 req : ',req.body,roomName_arr);
 
  pool_main.getConnection().then((conn)=>{
    conn.query(`select * from queze where roomName = '${roomName_arr}';`).then(result=>{ // 수정 필요
      console.log('444 result',result,req);
      if(result.length === 0){
        conn.query(`insert into queze (roomName, existence, title, title_img_name) value('${roomName_arr}', 1, '${req.body.title}', 'img0.jpg');`);
        if(typeof(req.body.img_name) === 'string'){
          conn.query(`insert into result (text, value, originalname, roomName) value('${req.body.text}', 0, 'img0.jpg','${roomName_arr}')`);
        }
        else{
          for(i=0 ; i < req.body.img_name.length ;i++){
            conn.query(`insert into result (text, value, originalname, roomName) value('${req.body.text[i]}', 0, 'img${i}.jpg','${roomName_arr}')`);
          }
        }
        // conn.query(`create table ${roomName_arr}_comments (value varchar(40), parent_room_num int, likes int, type tinyint);`)
      }
    })  
  })  
  
}

const upload = multer({ storage : storage }).array('img'); 

// let callbackExecuted = false;
app.use(body_parser.urlencoded({ extended: true }));

app.post('/upload_img',(req,res)=>{
  console.log('upload img 시작',req.body,req.files,req.file); //req.files.img[0].name or data(type BUffer)


  // if(!callbackExecuted) {
    if(req.files !== null){
      pool_main.getConnection()
      .then((conn)=>{
        conn.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`).then((result)=>{
          if(result.length != 0){
            let roomName_arr = Array.from(result[0].roomName);// ['A','B','C']; 
              if(roomName_arr[roomName_arr.length - 1].charCodeAt() >= 90)
            { 
              roomName_arr.push(String.fromCharCode(65));
              const dir = __dirname + `/uploads/${roomName_arr}`;
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              if(req.files.img.length === undefined) { // img is one
                req.files.img.mv(dir+`/img0`+'.jpg');
                upload_query(req,roomName_arr)
  
              }
              else {
                let i = 0;
                req.files.img.map(e=>{ // img가 하나 일때 예외 수정
                  e.mv(dir+`/img`+i+'.jpg');
                  i++; // 'img'+i
                })
                upload_query(req,roomName_arr)
              }
            }
            else
            { 
              roomName_arr[roomName_arr.length - 1] =  String.fromCharCode(roomName_arr[roomName_arr.length - 1].charCodeAt() + 1);
              const dir = __dirname + `/uploads/${roomName_arr}`;
              console.log(typeof(req.files.img),req.files.img.length);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              if(req.files.img.length === undefined) { // img is one
                req.files.img.mv(dir+`/img0`+'.jpg');              
                upload_query(req,roomName_arr)
  
              }
              else {
                let i = 0;
                req.files.img.map(e=>{ // img가 하나 일때 예외 수정
                  e.mv(dir+`/img`+i+'.jpg'); 
                  i++; // 'img'+i
                })
                upload_query(req,roomName_arr)
              }
            }
          }
          else {
            const dir = __dirname + `/uploads/A`;
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            if(req.files.img.length === undefined) { // img is one
              req.files.img.mv(dir+`/img0`+'.jpg');
              upload_query(req,'A');
            }
            else {
              let i = 0;
              req.files.img.map(e=>{ // img가 하나 일때 예외 수정
                e.mv(dir+`/img`+i+'.jpg');
                i++; // 'img'+i
              })
              upload_query(req,'A');
            }      
          }     
        })
      })
      callbackExecuted = true;
    // }
  
    // res.send('seccess');
    res.redirect(url+'/ayoworldrank');
    
    }
    
})
// existence 존재 
//-------------------------------------------------------------------
app.get('/main_select_queze',(req,res)=>{ //main 페이지 대표 사진과 제목 보냄 queze desc 변경 후 수정 /할 일
  console.log('sssssssssssdirrnam',__dirname,);
  pool_main.getConnection().then((conn)=>{
    conn.query(`select * from queze where existence = 1`).then((result)=>{
      console.log(result);
      let base64_img_arr = [];
      result.map(e=>{
        base64_img_arr = [...base64_img_arr,(fs.readFileSync(__dirname +`uploads/${e.roomName}/${e.title_img_name}`).toString('base64'))];
      });
      console.log('a-typr',base64_img_arr);
      return res.set({ "Content-Type": 'mulipart/form-data'}).send({result : result, base64_img_arr : base64_img_arr });
    })
  })
})
app.post('/main_a_queze',(req,res)=>{
  const roomName = req.body.roomName;
  let   text_arr = [];
  let   img_arr  = [];
  pool_main.getConnection().then((conn)=>{
    conn.query(`select * from result where roomName='${roomName}'`).then(result=>{
      console.log('select from result whee roomName=',roomName,result);
      result.map(e=>{
        text_arr = [...text_arr,e.text];
        img_arr = [...img_arr,(fs.readFileSync(__dirname+`uploads/${roomName}/`+e.originalname).toString('base64'))];
      })
    }).then(()=>{
      console.log('text_arr',text_arr,img_arr); // text arr [queze_length,text1,text2,text3]
      return res.send({text : text_arr, img : img_arr});
    })  
  })  


})
// comments desc : create table $roomName_comments (value varchar(40), parent_room_num int, likes int, type tinyint); parent_room_num 1,2,3 type : 0=자식, 1=부모
app.post('/main_a_queze_comments',(req,res)=>{ // url 파라미터로 roomName 가져오게 바꾸기
  pool_main.getConnection().then((conn)=>{
    conn.query(`select * from comments where type = 1`).then((result)=>{
      console.log('result',result);
      return res.send(result);
    })
    
  })
})
app.post('/main_a_queze_children_comments',(req,res)=>{
  pool_main.getConnection().then((conn)=>{
    conn.query(`select * from ${req.body.roomName}_comments where parent_room_num = ${req.body.parent_room_num} && type = 0 order by likes desc`).then(result=>{
      return res.send(result);
    })  
  })
})
app.post('/main_a_queze_plus_comments',(req,res)=>{

  pool_main.getConnection().then((conn)=>{
    // 부모일때
    console.log('댓 추가 req.body',req.body);
    const roomName = req.body.roomName;
    const type = req.body.type;
    const value = req.body.value;
    if(type === 1){
      conn.query(`insert into comments (value,parentsKey,likes,type) value('${value}','${uuidv4()}',0,1)`);
      // conn.query(`select parent_room_num from ${roomName}_comments where type = 1 order by parent_room_num desc;`).then(result=>{
      //   console.log('댓글 type 1dml room_num 가져온 걀과 result : ',result);
      //   if(result.length === 0){
      //     conn.query(`insert into ${roomName}_comments (value, parent_room_num, likes, type) value('${value}',0,0,1)`).then((result)=>{
      //       return res.send('success');
      //     })
      //   }
      //   else {
      //     const new_parent_room_num = result[0].parent_room_num + 1;
      //     console.log('new_parent_room_num',new_parent_room_num);
      //     conn.query(`insert into ${roomName}_comments (value, parent_room_num, likes, type) value('${value}',${new_parent_room_num},0,1)`).then((result)=>{
      //       return res.send('success');
      //     })
      //   }
      // })

    }
    else{
      conn.query(`insert into ${roomName}_comments (value, parent_room_num, likes, type) value('${value}',${type},0,0)`).then((result)=>{
        return res.send('success');
      })
    }
    res.redirect(url+`/result?roomName=${roomName}`);
  })
})
app.post('/result_plus',(req,res)=>{
  console.log('값 올리기 post req : ',req.body);
  const roomName = req.body.roomName;
  const column_name_arr = req.body.column; // [[txt1,3],[txt3,2],[txt2,1]]
  let insert_content = '';
  let insert_value = '';
  // column_name_arr.map(e=>{
  //   e[0]
  //   insert_content += 
  //   insert_value +=
  // })
  pool_main.getConnection().then((conn)=>{
    conn.query(`select * from result where roomName = '${roomName}'`).then((result)=>{
      console.log('selct * from result where roomName',result); //[ { text: 'ㅌㅇㅌ1', value: 0, originalname: 'img0.jpg', roomName: 'F' }, { text: 'ㅌㅇㅌ2', value: 0 }, { text: 'ㅌㅇㅌ3', value: 0 }]
      result.map(result_e=>{
        column_name_arr.map(res_e=>{
          if(result_e.text === res_e[0]){
            conn.query(`update result set value = ${Number(result_e.value) + res_e[1]} where text = '${result_e.text}'`);
          }
        })
      })
    }).then(()=>{
      return( res.send('success'));
    })

  })

})
app.post('/main_result',(req,res)=>{
  const roomName = req.body.roomName;
  
  pool_main.getConnection().then((conn)=>{
    conn.query(`select * from result where roomName = '${roomName}' order by value desc;`).then(result=>{
      console.log(result);
      const send_ = result.map(e=>{
        return {
          img : fs.readFileSync(__dirname+`uploads/${roomName}/${e.originalname}`).toString('base64'),
          text : e.text,
          value : e.value
        }
      })
      return res.send(send_);
    })
  })
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