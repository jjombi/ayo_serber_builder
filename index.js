const express = require('express')
const cors = require('cors');
const mysql = require('mysql');
const body_parser = require("body-parser");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 5;

const router = express.Router();
const port = 45509;
const app = express()
app.use(body_parser.json());
app.use(cookieParser());
app.use(cors({
  origin: "https://jjombi.github.io", // 접근 권한을 부여하는 도메인 "http://localhost:3000"
  credentials : true, // 응답 헤더에 Access-Control-Allow-Credentials 추가
  // optionsSuccessStatus: 200, // 응답 상태 200으로 설정
}))






// /*-------------------------mysql 연결--------------------------*/
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'sis01066745950@',
  database : 'ayodb'
});
 
// /*--------------------------------------------------------------*/

app.get('/',(req,res)=>{
  res.send('성공');
})



/*----------------------------회원가입 --------------------------- */
/*--------------------------------- --------------------------- */
/*---------------------------------- --------------------------- */
app.post('/infor',(req,res)=>{ 
  const id = req.body.userid;
  const name = req.body.userName;
  const password = req.body.userPassword;
  const school = req.body.schoolName;
  const age = req.body.age
  const class_ = req.body.class;
  const number = req.body.number;
  
  
  const promise = new Promise((resolve, reject)=> {
    bcrypt.genSalt(saltRounds,async function(err, salt) {
      bcrypt.hash(password, salt, function(err, hash) {
        console.log('hash',hash);
        connection.query(`INSERT INTO infor (id,name,password,school,age,class,number) VALUE('${id}','${name}','${hash}','${school}',${age},${class_},${number});`,(err,result) => {
          console.log('infor에 유저 정보 넣기, reuslt : ',result);
          
          connection.query(`select school,class,number from infor where id='${id}'`,(err,result)=>{
            
            console.log('infor result school',result[0].school);
            const data = [jwt.sign({'school' : result[0].school,'class' : result[0].class ,'number' : result[0].number},'secretKey')];
            resolve(data);
          });

        })       
  
      });

    });

  })
  promise.then((resolve)=>{
    console.log('promise.then','jwt is : ',resolve[0]);
    return(
      res.send(resolve)
    );    
  })
  
console.log('끝');
                                                            
  
})
/*------------퀴즈----------------------------------*/
app.get('/queze',(req,res)=>{
  connection.query(`select value,school,class,number,roomName from queze;`,(err,result)=>{
    console.log('queze result is : ',result);
    return (
      res.send(result)
    )
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
  connection.query(`select * from queze ${where} ${school} ${class_} ${number}`,(err,result)=>{
    console.log('11231423424',result);
    return(res.send(result));
  })
  
})
app.post('/queze_type',(req,res)=>{
  console.log('queze_type 시작 됨');
  const type = req.body.type; //학교,학급,반 
  console.log(type);
  const token = jwt.verify(req.body.token,'secretKey');
  const school = token.school;
  const class_ = token.class;
  const number = token.number;

  if(type == '학교'){
    `select * from queze where school = "병점중학교"`;
    connection.query(`select * from queze where school = "${school}";`,(err,result)=>{
      console.log('11231423424',result);
      return(res.send(result));
    });
  }
  else if(type == '학급'){
    `select * from queze where school = "병점중학교" and class = 1`;
    connection.query(`select * from queze where school = "${school}" and class = ${class_};`,(err,result)=>{
      console.log('11231423424',result);
      return(res.send(result));
    });
  }
  else if(type == '반'){
    `select * from queze where school = "병점중학교" and class = 1 and number = 1`;
    connection.query(`select * from queze where school = "${school}" and class = ${class_} and number = ${number};`,(err,result)=>{
      console.log('11231423424',result);
      return(res.send(result));
    });
  }
})

/*----------------------------로그인 --------------------------- */
/*--------------------------------- --------------------------- */
/*---------------------------------- --------------------------- */
app.post('/login',cors({
  origin : 'https://jjombi.github.io',
  methods : ['POST'],
  allowedHeaders : {"Content-Type" : "application/json"},
  credentials : true,
}),(req,res)=>{


  connection.query(`select id,password,school,class,number from infor where id = '${req.body.id}'`,(err,result_db)=>{
    console.log('result : ',result_db[0]);
    const jwt_data = jwt.sign({'school' : result_db[0].school,'class' : result_db[0].class ,'number' : result_db[0].number},'secretKey')
    if(result_db.length !== 0){
      //id 있음
      console.log('result_db : ',result_db);
      bcrypt.compare(req.body.password, result_db[0].password, function(err, same) {
        // result == true
        console.log('same',same);
        if(same){
          return res.send(jwt_data);
        }
        else {
          return res.send('불일치');
        }
      });
    }
    else {
      //id 없음
      console('없어',result_db);

    }
  })
  

    
  
  
})
/*---------------------------같은 학교 친구들 이름 가져오기 ------------------------- */
app.post('/api/take_name',(req,res)=>{
  console.log('req.boy.school is : ',req.body.type);
  if(req.body.token == null) console.log('null');
  else {
    const token = jwt.verify(req.body.token,'secretKey');
    const school = token.school;
    const class_ = token.class;
    const number = token.number;
    console.log(req.body);
    if(req.body.type === '학교'){
      console.log('take name,school,class,number school is ',school);
      connection.query(`select name,school,class,number from infor where school = '${school}';`,(err,result)=>{
        console.log(' take_name, result',result);
        const name_arr =  result.map((e)=>e.name);
        console.log('take_name name_arr is ',name_arr);
        
        return res.send(name_arr);
      })
    }
    else if(req.body.type === '학급'){
      console.log('take name,school,class,number school is ',school);
      connection.query(`select name,school,class,number from infor where school = '${school}' and class = ${class_};`,(err,result)=>{
      console.log(' take_name, result',result);
      const name_arr =  result.map((e)=>{
        return e.name;
      });
      console.log('take_name name_arr is ',name_arr);
      
      return res.send(name_arr);
    })
    }
    else if(req.body.type === '반'){
      console.log('take name,school,class,number school is ',school);
      connection.query(`select name,school,class,number from infor where school = '${school}' and class = ${class_} and number = ${number};`,(err,result)=>{
        console.log(' take_name, result',result);
        const name_arr =  result.map((e)=>{
          return e.name;
        });
        console.log('take_name name_arr is ',name_arr);
        
        return res.send(name_arr);
      })
    }
  }

  
})
app.post('/queze_result',(req,res)=>{
  console.log('queze reslut start ');
  const roomName = req.body.roomName;
  const type = req.body.type;
  const token = jwt.verify(req.body.token,'secretKey');
  const school = token.school;
  const class_ = token.class;
  const number = token.number;
  

  console.log('type is : ',type,roomName);
  if(type === '학교'){
    connection.query(`select infor.name,${roomName}.id, ${roomName}.value from infor join ${roomName} on infor.id = ${roomName}.id and infor.school = '${school}' order by value desc;`,(err,result)=>{
      result.map(e=>{
        return(
          {
            id : e.id,
            value : e.value
          }
        )
      })
      console.log(result);
      return res.send(result);
    }); 
  }
  if(type === '학급'){
    connection.query(`select infor.name ${roomName}.id, ${roomName}.value from infor join ${roomName} on infor.id = ${roomName}.id and infor.school = '${school}' and infor.class = ${class_} order by value desc;`,(err,result)=>{
      result.map(e=>{
        return(
          {
            id : e.id,
            value : e.value
          }
        )
      })
      console.log(result);
      return res.send(result);
    }); 
  }
  if(type === '반'){
    connection.query(`select infor.name cdserver${roomName}.id, ${roomName}.value from infor join ${roomName} on infor.id = ${roomName}.id and infor.school = '${school}' and infor.class = ${class_} and infor.number = ${number} order by value desc;`,(err,result)=>{
      result.map(e=>{
        return(
          {
            id : e.id,
            value : e.value
          }
        )
      })
      console.log(result);
      return res.send(result);
    }); 
  }
})

// /**---------------------id 값있나 확인------------------------------ */
app.post('/check_id',(req,res)=>{
  console.log(req.body.userid);
  

  connection.query(`select id from infor`,(err,result) => {
    let controler = false;
    for(let i=0;i < result.length;i++)
    {

      console.log('result : ', result[i].id );
      console.log('req.body.userid : ', req.body.userid);

      if(req.body.userid == result[i].id) 
      {
        return(res.send('that userid is aleady used'));
      }
    }
    return(
      res.send('you can use it')
    )
  
  })
  
})
//----------------------투표 시스템-------------------------------
app.post('/create_queze',(req,res)=> {
  console.log(req.body);
  const verify_data = jwt.verify(req.body.token,'secretKey');
  let school = null;
  let class_ = -1;
  let number = -1;
  let roomName_arr;
  console.log('1',verify_data.school,verify_data.class,verify_data.number);

  if(req.body.school === true){
    school = verify_data.school;
  }
  if(req.body.class === true){
    class_ = verify_data.class;
  }
  if(req.body.number === true){
    number = verify_data.number;
  }
  console.log('2',verify_data.school,verify_data.class,verify_data.number);
  console.log('3',school,class_,number)
  console.log('verify_data is : ',verify_data);
  connection.query(`select roomName from queze ORDER BY roomName DESC LIMIT 1;`,(err,result)=>{
    console.log(result);
    if(result.length === 0)
    { // 방이 아무 것도 없을 때
      console.log('school',school,'class',class_,'number',number);
      connection.query(`insert into queze (value,school,class,number,roomName) value('${req.body.queze}','${school}',${class_},${number},'A')`)
      connection.query(`create table A (id varchar(40), value int);`);
    }
    else 
    {
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
    }
            
    const roomName = roomName_arr.join('');
    console.log('roomName : ',roomName);
    connection.query(`insert into queze (value,school,class,number,roomName) value('${req.body.queze}','${school}',${class_},${number},'${roomName}');`)
    connection.query(`create table ${roomName} (id varchar(40), value int);`);
  })
  return(
    res.send('create queze is success')
  );


})
///////////////////////////////////////////////\/
///////////////////////////////////////////////
/////////////////////////////////////////////////
///////////////////////////////////////////////
app.post('/vote',cors({
  origin : 'https://jjombi.github.io',

}),(req,res)=>{
  
  const roomName = req.body.roomName;
  const name = req.body.voteName;
  let con = false;
  //방번호와 뽑은 사람 이름을 받고 방번호인 table에 이름이 없으면 컬럼을 만들고 있으면 이름에 값올리기
  console.log('req 방이름 :',roomName);
  console.log('req 뽑은 이',name);
  if(name == ''){
    return res.send('없음');
  }

  connection.query(`select id,value from ${roomName} where id = '${name}';`,(err,result)=> {
    console.log('resulet asd : ',result);
    if(result.length === 0){

      
      connection.query(`insert into ${roomName} (id,value) value('${name}',1);`);
      
      return res.send(`${name}으로 컬럼 생성 완료`);

    }
    else{
      
      console.log('slect result : ',result[0].id,result[0].value);
      let change_val = Number(result[0].value) + 1;
      connection.query(` update ${roomName} set value = ${change_val} where id = '${name}';`);
      return res.send(`${name}으로 값 올림`);  

    }
  })
})


//-------------------------------------------------------------------

app.listen(port, (err) => {
  console.log(`Example app listening on port ${port}`)
  console.log(err);
  console.log("working");

})