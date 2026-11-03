require('dotenv').config();
const express=require('express'),mongoose=require('mongoose'),cors=require('cors'),helmet=require('helmet'),rateLimit=require('express-rate-limit');
const routes=require('./routes'),{notFound,errors}=require('./middleware/errors');
if(!process.env.MONGODB_URI||!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){console.error('MONGODB_URI and a JWT_SECRET of at least 32 characters are required');process.exit(1);}
const app=express();
app.use(helmet());app.use(cors({origin:(process.env.CLIENT_ORIGINS||'http://localhost:5173,http://localhost:5174').split(',').map(x=>x.trim()),credentials:false}));
app.use(express.json({limit:'1mb'}));app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:true,legacyHeaders:false}));
app.use('/api',routes);app.use(notFound);app.use(errors);
const port=process.env.PORT||4000;
mongoose.connect(process.env.MONGODB_URI).then(()=>app.listen(port,()=>console.log(`Shop.CO API listening on ${port}`))).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1)});
