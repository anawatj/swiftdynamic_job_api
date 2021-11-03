const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const { json } = require('express');
dotenv.config();
app.use(bodyParser());
const role ={
    'superuser':"superuser",
    "admin":"Admin",
    "operator":"operator",
    "user":'user'
}

const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: process.env.EMAIL_HOST,
       auth: {
            user: process.env.EMAIL_SERVER,
            pass: process.env.EMAIL_PASSWORD,
         },
    secure: true,
    });

const users = [
    {
        'username':'admin',
        'password':'P@ssw0rd',
        'role': role.admin
    },
    {
        'username':'superuser',
        'password':'P@ssw0rd',
        'role':role.superuser
    },
    {
        'username':'operator',
        'password':"P@ssw0rd",
        'role':role.operator
    },
    {
        'username':'user',
        'password':'P@ssw0rd',
        'role':role.user
    }
];
const status = {
    'pending':"pending",
    'approve1':"approve1",
    "approve2":"approve2",
    "finish":"finish"
};
const jobs = [
    {
        'id':1,
        'name':'test',
        'status':status.pending,
        'createdBy':'',
        'approver1':'',
        'approver2':'',
        'approver3':''
    }
];
const emailAlert = process.env.EMAIL_TO;


function sendEmail(job){
    const mailData = {
        from: process.env.EMAIL_FROM,  // sender address
          to: emailAlert,   // list of receivers
          subject: process.env.EMAIL_SUBJECT,
          text: job.name + " is finished",
          
        };
    transporter.sendMail(mailData, function (err, info) {
        if(err)
            console.log(err)
        else
            console.log(info);
    });
}


app.post('/api/v1/login',(req,res)=>{
    const data = req.body;
    const errors = [];
    if((!data.username) || data.username===""){
        errors.push("username is required");
    }
    if((!data.password) || data.password==="" ){
        errors.push("password is required");
    }
    if(errors.length>0){
        res.status(400).send(errors);
    }
    const user = users.find(user=>user.username===data.username && user.password===data.password);
    if(user){
        const token = jwt.sign({"username":user.username,"role":user.role}, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
        return res.status(200).send({"token":token});

    }else{
        res.status(401).send("Login Failure");
    }

});
app.post('/api/v1/jobs',(req,res)=>{
    const token = req.headers.authorization;
    console.log(token);
    //const token = authHeader && authHeader.split(' ')[1]
  
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, process.env.TOKEN_SECRET , (err, user) => {
      console.log(err)
      console.log(user.role);
      if (err) return res.sendStatus(403)
      if (user.role!==role.user) return res.sendStatus(401)
  
      req.user = user
  
      //next()
    });
    const job = req.body;
    const errors = [];
    if((!job.name) || job.name == ""){
        errors.push("name is required");
    }
    if(errors.length>0){
        return res.status(400).send(errors);
    }
    job.id = jobs.length+1;
    job.status= status.pending;
    job.createdBy = req.user.username;
    job.approver1 = '';
    job.approver2='';
    job.approver3='';
    jobs.push(job);
    console.log(jobs);
    return res.status(201).send(job);
});
app.put('/api/v1/jobs/:jobId/approve',(req,res)=>{
    const token = req.headers.authorization;
    console.log(token);
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, process.env.TOKEN_SECRET , (err, user) => {
      console.log(err)
  
      if (err) return res.sendStatus(403)
      if (user.role!==role.operator) return res.sendStatus(401)
  
      req.user = user;
  
      //next()
    });
    console.log(req.params.jobId);
    const job = jobs.find(job=>job.id==req.params.jobId);
    if(job.status!==status.pending){
        return res.status(400).send("status is approved");
    }
    console.log("job",job);
    job.approver1=req.user.username;
    job.status=status.approve1;
    job.approver2='';
    job.approver3='';
    res.send(job);

});

app.put('/api/v1/jobs/:jobId/approve2',(req,res)=>{
    const token = req.headers.authorization;
    console.log(token);
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, process.env.TOKEN_SECRET , (err, user) => {
      console.log(err)
      console.log(user.role);
  
      if (err) return res.sendStatus(403)
      if (user.role!==role.superuser) return res.sendStatus(401)
  
      req.user = user
  
     // next()
    });
    const job = jobs.find(job=>job.id==req.params.jobId);
    if(job.status!==status.approve1){
        return res.status(400).send("status is approved");
    }
    job.approver2=req.user.username;
    job.status=status.approve2;
    job.approver3='';
    res.send(job);

});
app.put('/api/v1/jobs/:jobId/finish',(req,res)=>{
    const token = req.headers.authorization;
    console.log(token);
    if (token == null) return res.sendStatus(401)
  
    jwt.verify(token, process.env.TOKEN_SECRET , (err, user) => {
      console.log(err)
  
      if (err) return res.sendStatus(403)
      if (user.role!==role.admin) return res.sendStatus(401)
  
      req.user = user
  
      //next()
    });
    const job = jobs.find(job=>job.id==req.params.jobId);
    if(job.status!==status.approve2){
        return res.status(400).send("status is finnished");
    }
    job.approver3=req.user.username;
    job.status=status.finish;
    sendEmail(job);
    res.send(job);
});
app.listen(4000,()=>{
    console.log("Listen 4000")
});

