const mysql = require('mysql');

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

module.exports = {
    connection,   
}



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