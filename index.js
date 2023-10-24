const express = require('express')
const cors = require('cors');
const mysql = require('mysql');
const mariadb = require('mariadb');
const body_parser = require("body-parser");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const saltRounds = 5;

const port = 45509;
const app = express()
app.use(body_parser.json());
app.use(cors({
  origin : "https://ay0.netlify.app",
  origin: "https://jjombi.github.io",
  origin : "http://localhost:8080", // 접근 권한을 부여하는 도메인 "http://localhost:3000"
  credentials : true, // 응답 헤더에 Access-Control-Allow-Credentials 추가
  // optionsSuccessStatus: 200, // 응답 상태 200으로 설정
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
        conn.query(`insert into queze (value,school,roomName,date,maker) value('${queze}','${school}','A',${date},'${maker}')`);
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
  origin : 'https://jjombi.github.io',
  origin : "http://localhost:8080",
  origin : "https://ay0.netlify.app"
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


//-------------------------------------------------------------------

app.listen(port, (err) => {
  console.log(`Example app listening on port ${port}`)
  console.log(err);
  console.log("working");

})